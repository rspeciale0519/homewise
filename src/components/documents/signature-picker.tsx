"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import * as Popover from "@radix-ui/react-popover";
import type { SavedSignature } from "@/types/document-viewer";

interface SignaturePickerProps {
  signatures: SavedSignature[];
  onSelectSignature: (imageData: string) => void;
  onDrawNew: () => void;
  onUploadNew: () => void;
  children: React.ReactNode;
}

export function SignaturePicker({
  signatures, onSelectSignature, onDrawNew, onUploadNew, children,
}: SignaturePickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = useCallback(
    (imageData: string) => { setOpen(false); onSelectSignature(imageData); },
    [onSelectSignature]
  );

  const handleDraw = useCallback(() => { setOpen(false); onDrawNew(); }, [onDrawNew]);
  const handleUpload = useCallback(() => { setOpen(false); onUploadNew(); }, [onUploadNew]);

  if (signatures.length === 0) {
    return <>{children}</>;
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={8} className="z-50 w-64 rounded-xl border border-slate-200 bg-white shadow-elevated p-2 animate-in fade-in-0 zoom-in-95">
          <div className="px-2 py-1.5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Saved Signatures</p>
          </div>

          <div className="max-h-[240px] overflow-y-auto">
            {signatures.map((sig) => (
              <button key={sig.id} onClick={() => handleSelect(sig.imageData)} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left">
                <div className="flex-shrink-0 w-[60px] h-[28px] rounded border border-slate-100 bg-white flex items-center justify-center overflow-hidden">
                  <Image src={sig.imageData} alt={sig.label} width={60} height={28} className="w-full h-full object-contain" unoptimized />
                </div>
                <span className="text-sm text-navy-700 truncate">{sig.label}</span>
              </button>
            ))}
          </div>

          <div className="border-t border-slate-100 mt-1 pt-1">
            <button onClick={handleDraw} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left">
              <svg className="h-4 w-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
              </svg>
              <span className="text-sm text-navy-700">Draw new signature</span>
            </button>
            <button onClick={handleUpload} className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left">
              <svg className="h-4 w-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span className="text-sm text-navy-700">Upload PNG</span>
            </button>
          </div>

          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
