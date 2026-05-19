"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { OrganizeTab } from "@/app/admin/documents/types";

const VALID_TABS: ReadonlyArray<OrganizeTab> = [
  "office",
  "listing",
  "sales",
  "uncategorized",
];
const SEARCH_DEBOUNCE_MS = 250;

function isValidTab(value: string | null): value is OrganizeTab {
  return value !== null && (VALID_TABS as readonly string[]).includes(value);
}

export function useOrganizeUrlState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams.get("tab");
  const activeTab: OrganizeTab = isValidTab(tabFromUrl)
    ? tabFromUrl
    : "office";

  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");

  const paramsRef = useRef(searchParams);
  useEffect(() => {
    paramsRef.current = searchParams;
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(paramsRef.current.toString());
      if (search) params.set("q", search);
      else params.delete("q");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, pathname, router]);

  const setActiveTab = useCallback(
    (next: OrganizeTab) => {
      const params = new URLSearchParams(paramsRef.current.toString());
      params.set("tab", next);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router],
  );

  return { activeTab, setActiveTab, search, setSearch };
}
