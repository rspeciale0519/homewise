import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { adminUserWelcomeEmail } from "@/lib/email/templates";
import { adminUserFilterSchema, adminUserCreateSchema } from "@/schemas/admin-user.schema";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = adminUserFilterSchema.safeParse(params);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { search, role, page, perPage } = parsed.data;

  const where: Prisma.UserProfileWhereInput = {};

  if (role !== "all") {
    where.role = role;
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  try {
    const [users, total] = await Promise.all([
      prisma.userProfile.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.userProfile.count({ where }),
    ]);

    return NextResponse.json({
      users,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const body: unknown = await request.json();
  const parsed = adminUserCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, firstName, lastName, phone, role } = parsed.data;

  const existing = await prisma.userProfile.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists." },
      { status: 409 }
    );
  }

  try {
    const supabaseAdmin = createAdminClient();
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName },
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message ?? "Failed to create auth user." },
        { status: 500 }
      );
    }

    const profile = await prisma.userProfile.create({
      data: {
        id: authData.user.id,
        email,
        firstName,
        lastName,
        phone: phone ?? null,
        role,
      },
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
      });

    if (!linkError && linkData.properties.hashed_token) {
      const setupUrl = `${siteUrl}/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=recovery&redirectTo=/reset-password`;
      const template = adminUserWelcomeEmail(firstName, setupUrl);
      await sendEmail({
        to: email,
        subject: template.subject,
        html: template.html,
      });
    }

    return NextResponse.json({ user: profile }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
