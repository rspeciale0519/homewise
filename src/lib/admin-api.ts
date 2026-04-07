import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { User } from "@supabase/supabase-js";
import type { UserProfile } from "@prisma/client";

type AdminApiSuccess = { user: User; profile: UserProfile };
type StaffApiSuccess = AdminApiSuccess & { isAdmin: boolean; agentId: string | null };
type AdminApiError = { error: NextResponse };
type AdminApiResult = AdminApiSuccess | AdminApiError;
type StaffApiResult = StaffApiSuccess | AdminApiError;

function isError(result: AdminApiResult): result is AdminApiError {
  return "error" in result;
}

export { isError };

async function findAgentIdForUser(userId: string, email?: string): Promise<string | null> {
  const matches = email ? [{ userId }, { email }] : [{ userId }];
  const agent = await prisma.agent.findFirst({
    where: { OR: matches },
    select: { id: true },
  });

  return agent?.id ?? null;
}

export async function requireAuthApi(): Promise<AdminApiResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
  });

  if (!profile) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  return { user, profile };
}

export async function requireStaffApi(): Promise<StaffApiResult> {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth;

  if (auth.profile.role === "admin") {
    return { ...auth, isAdmin: true, agentId: null };
  }

  if (auth.profile.role !== "agent") {
    return {
      error: NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  const agentId = await findAgentIdForUser(auth.user.id, auth.user.email ?? undefined);

  if (!agentId) {
    return {
      error: NextResponse.json(
        { error: "Agent profile not linked" },
        { status: 403 }
      ),
    };
  }

  return { ...auth, isAdmin: false, agentId };
}

export async function requireAdminApi(): Promise<AdminApiResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
  });

  if (!profile || profile.role !== "admin") {
    return {
      error: NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      ),
    };
  }

  return { user, profile };
}
