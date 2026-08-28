import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  agentFindUniqueMock,
  entitlementFindManyMock,
  getUserMock,
  productFindManyMock,
  profileFindUniqueMock,
} = vi.hoisted(() => ({
  agentFindUniqueMock: vi.fn(),
  entitlementFindManyMock: vi.fn(),
  getUserMock: vi.fn(),
  productFindManyMock: vi.fn(),
  profileFindUniqueMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
  })),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: { findUnique: profileFindUniqueMock },
    agent: { findUnique: agentFindUniqueMock },
    productConfig: { findMany: productFindManyMock },
    entitlementConfig: { findMany: entitlementFindManyMock },
  },
}));

vi.mock("@/components/dashboard/access-denied", () => ({
  AccessDenied: () => <p>Access denied</p>,
}));

vi.mock("@/components/billing/billing-dashboard", () => ({
  BillingDashboard: ({
    productConfigs,
    subscription,
  }: {
    productConfigs: { name: string }[];
    subscription: {
      items: {
        productName: string;
        billingInterval: string | null;
        billingAmount: number | null;
      }[];
    } | null;
  }) => (
    <div>
      <p>{productConfigs.map((product) => product.name).join(", ")}</p>
      <p>
        {subscription?.items.map((item) => (
          `${item.productName}:${item.billingInterval}:${item.billingAmount}`
        )).join(", ")}
      </p>
    </div>
  ),
}));

import BillingPage from "./page";

describe("BillingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({
      data: { user: { id: "user-1", email: "agent@riusa.test" } },
    });
    profileFindUniqueMock.mockResolvedValue({ role: "agent" });
    agentFindUniqueMock.mockResolvedValue({
      id: "agent-1",
      platform: "riusa",
      subscription: null,
      stripeCustomer: null,
      paymentRecords: [],
    });
    productFindManyMock.mockResolvedValue([
      {
        id: "membership-1",
        name: "RIUSA Annual Dues",
        slug: "riusa_annual_dues",
        description: "Annual dues.",
        productType: "membership",
        monthlyAmount: 0,
        annualAmount: 19_500,
        monthlyPriceId: null,
        annualPriceId: "price_membership_annual",
        sortOrder: 0,
        isActive: true,
        features: [],
      },
    ]);
    entitlementFindManyMock.mockResolvedValue([]);
  });

  it("loads products and entitlements for the agent platform", async () => {
    render(await BillingPage());

    expect(agentFindUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
    expect(productFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { isActive: true, platforms: { has: "riusa" } },
            { monthlyPriceId: { in: [] } },
            { annualPriceId: { in: [] } },
          ],
        },
      }),
    );
    expect(entitlementFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isActive: true,
          requiredProduct: { not: null },
          platforms: { has: "riusa" },
        },
      }),
    );
    expect(screen.getByText("RIUSA Annual Dues")).toBeInTheDocument();
  });

  it("maps each subscription price to its configured interval and amount", async () => {
    agentFindUniqueMock.mockResolvedValue({
      id: "agent-1",
      platform: "riusa",
      subscription: {
        status: "active",
        currentPeriodStart: new Date("2026-08-01T00:00:00.000Z"),
        currentPeriodEnd: new Date("2027-08-01T00:00:00.000Z"),
        cancelAtPeriodEnd: false,
        trialEnd: null,
        items: [{
          productType: "membership",
          productName: "RIUSA Annual Dues",
          stripePriceId: "price_membership_annual",
          quantity: 1,
        }],
      },
      stripeCustomer: null,
      paymentRecords: [],
    });

    render(await BillingPage());

    expect(
      screen.getByText("RIUSA Annual Dues:annual:19500"),
    ).toBeInTheDocument();
    expect(productFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            { annualPriceId: { in: ["price_membership_annual"] } },
          ]),
        }),
      }),
    );
  });
});
