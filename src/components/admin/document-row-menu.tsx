"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical, Trash2, Eye, Link2, Star } from "lucide-react";
import { useToast } from "@/components/admin/admin-toast";
import type { DocumentItem } from "@/app/admin/documents/types";

interface DocumentRowMenuProps {
  document: DocumentItem;
  onRequestDelete: (doc: DocumentItem) => void;
  onToggleQuickAccess: (doc: DocumentItem) => void;
}

export function DocumentRowMenu({
  document,
  onRequestDelete,
  onToggleQuickAccess,
}: DocumentRowMenuProps) {
  const { toast } = useToast();
  const documentPath = `/api/documents/by-slug/${document.slug}`;

  const handlePreview = () => {
    window.open(documentPath, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async () => {
    try {
      const fullUrl = `${window.location.origin}${documentPath}`;
      await navigator.clipboard.writeText(fullUrl);
      toast("Link copied", "success");
    } catch {
      toast("Failed to copy link", "error");
    }
  };

  const neutralItem =
    "flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-navy-700 transition-colors outline-none cursor-pointer data-[highlighted]:bg-slate-50 data-[highlighted]:text-navy-700";

  const destructiveItem =
    "flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-crimson-50 hover:text-crimson-700 transition-colors outline-none cursor-pointer data-[highlighted]:bg-crimson-50 data-[highlighted]:text-crimson-700";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${document.name}`}
          onClick={(e) => e.stopPropagation()}
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-navy-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 focus-visible:ring-offset-1"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          onClick={(e) => e.stopPropagation()}
          className="bg-white/95 backdrop-blur-lg rounded-xl shadow-dropdown border border-slate-100 py-2 min-w-[200px] z-50 data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 fade-out-0 zoom-in-95 zoom-out-95 data-[side=bottom]:slide-in-from-top-2 duration-200"
        >
          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              handlePreview();
            }}
            className={neutralItem}
          >
            <Eye className="h-4 w-4" />
            Preview
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              handleCopyLink();
            }}
            className={neutralItem}
          >
            <Link2 className="h-4 w-4" />
            Copy link
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              onToggleQuickAccess(document);
            }}
            className={neutralItem}
          >
            <Star
              className={`h-4 w-4 ${document.quickAccess ? "fill-amber-500 text-amber-500" : ""}`}
            />
            {document.quickAccess
              ? "Remove from Quick Access"
              : "Add to Quick Access"}
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-slate-100 my-1" />

          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              onRequestDelete(document);
            }}
            className={destructiveItem}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
