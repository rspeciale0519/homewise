// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getUserMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    options: {
      cookies: {
        setAll: (
          cookies: Array<{
            name: string;
            value: string;
            options: { httpOnly: boolean; path: string };
          }>,
        ) => void;
      };
    },
  ) => ({
    auth: {
      getUser: async () => {
        options.cookies.setAll([
          {
            name: "sb-session",
            value: "refreshed",
            options: { httpOnly: true, path: "/" },
          },
        ]);
        return getUserMock();
      },
    },
  }),
}));

import { updateSession } from "./middleware";

describe("updateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps refreshed cookies when redirecting an unauthenticated request", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const request = new NextRequest(
      "http://localhost/dashboard/search?page=2",
    );

    const response = await updateSession(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/login?redirectTo=%2Fdashboard%2Fsearch%3Fpage%3D2",
    );
    expect(response.cookies.get("sb-session")?.value).toBe("refreshed");
  });

  it("keeps refreshed cookies when redirecting an authenticated user", async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const request = new NextRequest(
      "http://localhost/login?redirectTo=%2Fdashboard%2Fprofile",
    );

    const response = await updateSession(request);

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/dashboard/profile",
    );
    expect(response.cookies.get("sb-session")?.value).toBe("refreshed");
  });
});
