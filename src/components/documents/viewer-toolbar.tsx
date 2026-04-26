"use client";

import { forwardRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/ui/back-button";
import { AnnotationPlacer } from "@/components/documents/annotation-placer";
import { ContactPicker } from "@/components/documents/contact-picker";
import type { ContactOption } from "@/components/documents/contact-picker";
import type {
  Annotation,
  AnnotationMode,
  AgentFieldKey,
  AgentInfo,
  ContactFieldKey,
} from "@/types/document-viewer";
import { SignaturePicker } from "@/components/documents/signature-picker";
import { cn } from "@/lib/utils";

interface ViewerToolbarProps {
  documentName: string;
  currentPage: number;
  numPages: number | null;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomFit: () => void;
  activeMode: AnnotationMode;
  onSetMode: (mode: AnnotationMode) => void;
  agentInfo: AgentInfo;
  selectedContact: ContactOption | null;
  onSelectContact: (contact: ContactOption | null) => void;
  onSelectAgentField: (key: AgentFieldKey) => void;
  onSelectContactField: (key: ContactFieldKey) => void;
  annotations: Annotation[];
  onCancelPlacement: () => void;
  onDownload: () => void;
  onPrint: () => void;
  onEmail: () => void;
  isExporting: boolean;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onSaveDraft: () => void;
  isDirty: boolean;
  savedSignatures: Array<{ id: string; label: string; imageData: string }>;
  onSelectSignature: (imageData: string) => void;
  onDrawNewSignature: () => void;
  onUploadSignature: () => void;
}

export function ViewerToolbar({
  documentName,
  currentPage,
  numPages,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomFit,
  activeMode,
  onSetMode,
  agentInfo,
  selectedContact,
  onSelectContact,
  onSelectAgentField,
  onSelectContactField,
  annotations,
  onCancelPlacement,
  onDownload,
  onPrint,
  onEmail,
  isExporting,
  isFavorite,
  onToggleFavorite,
  onSaveDraft,
  isDirty,
  savedSignatures,
  onSelectSignature,
  onDrawNewSignature,
  onUploadSignature,
}: ViewerToolbarProps) {
  const zoomPercent = Math.round(zoom * 100);
  const [showPlacer, setShowPlacer] = useState(false);

  const hasAnnotations = annotations.length > 0;

  return (
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-100">
      {/* Top row: nav + zoom + page */}
      <div className="px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <BackButton
            fallbackHref="/dashboard/agent-hub/documents"
            label="Documents"
            hideLabelOnMobile
            className="shrink-0"
          />
          <div className="h-5 w-px bg-slate-200 shrink-0" />
          <h1 className="text-sm font-semibold text-navy-700 truncate">{documentName}</h1>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onZoomOut} disabled={zoom <= 0.5} title="Zoom out">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
            </svg>
          </Button>
          <button
            onClick={onZoomFit}
            className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-navy-700 hover:bg-slate-50 rounded transition-colors min-w-[3.5rem] text-center"
            title="Fit to width"
          >
            {zoomPercent}%
          </button>
          <Button variant="ghost" size="icon" onClick={onZoomIn} disabled={zoom >= 3} title="Zoom in">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {numPages !== null && (
            <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
              Page {currentPage} of {numPages}
            </span>
          )}
          {hasAnnotations && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-crimson-50 text-crimson-600">
              {annotations.length}
            </span>
          )}
          <button
            onClick={onToggleFavorite}
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            className="text-slate-400 hover:text-amber-500 transition-colors"
          >
            <svg className={cn("h-5 w-5", isFavorite && "fill-amber-400 text-amber-400")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.562.562 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
            </svg>
          </button>
          {isDirty && (
            <button
              onClick={onSaveDraft}
              className="text-xs font-medium text-navy-600 hover:text-navy-700 transition-colors"
            >
              Save Draft
            </button>
          )}
        </div>
      </div>

      {/* Bottom row: annotation tools + actions */}
      <div className="px-4 py-1.5 border-t border-slate-50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <ToolButton
            active={activeMode === "cursor"}
            onClick={() => onSetMode("cursor")}
            title="Select"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
            </svg>
          </ToolButton>

          <div className="relative">
            <ToolButton
              active={activeMode === "text" || activeMode === "agent-field" || activeMode === "contact-field"}
              onClick={() => {
                if (activeMode === "text") {
                  onSetMode("cursor");
                  setShowPlacer(false);
                } else {
                  onSetMode("text");
                  setShowPlacer(true);
                }
              }}
              title="Place text"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </ToolButton>

            {showPlacer && (activeMode === "text" || activeMode === "agent-field" || activeMode === "contact-field") && (
              <AnnotationPlacer
                agentInfo={agentInfo}
                selectedContact={selectedContact}
                onPlaceAgentField={(key) => {
                  onSelectAgentField(key);
                  setShowPlacer(false);
                }}
                onPlaceContactField={(key) => {
                  onSelectContactField(key);
                  setShowPlacer(false);
                }}
                onCancel={() => {
                  onSetMode("cursor");
                  onCancelPlacement();
                  setShowPlacer(false);
                }}
              />
            )}
          </div>

          <SignaturePicker
            signatures={savedSignatures.map((s) => ({ ...s, source: "drawn" as const }))}
            onSelectSignature={onSelectSignature}
            onDrawNew={onDrawNewSignature}
            onUploadNew={onUploadSignature}
          >
            <ToolButton
              active={activeMode === "signature"}
              onClick={savedSignatures.length === 0
                ? () => onSetMode(activeMode === "signature" ? "cursor" : "signature")
                : undefined
              }
              title="Place signature"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
              </svg>
            </ToolButton>
          </SignaturePicker>

          <div className="h-5 w-px bg-slate-200 mx-1" />

          <ContactPicker
            selectedContact={selectedContact}
            onSelect={onSelectContact}
          />
        </div>

        {activeMode !== "cursor" && (
          <p className="text-xs text-slate-400 animate-pulse">
            Click on the document to place
          </p>
        )}

        {/* Export actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onDownload}
            disabled={isExporting}
            title="Download filled PDF"
            className="text-xs gap-1.5"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            <span className="hidden sm:inline">Download</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onPrint}
            disabled={isExporting}
            title="Print filled PDF"
            className="text-xs gap-1.5"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 3.75H5.25" />
            </svg>
            <span className="hidden sm:inline">Print</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEmail}
            disabled={isExporting}
            title="Email filled PDF"
            className="text-xs gap-1.5"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <span className="hidden sm:inline">Email</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

const ToolButton = forwardRef<
  HTMLButtonElement,
  {
    active: boolean;
    onClick?: () => void;
    title: string;
    children: React.ReactNode;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>
>(function ToolButton({ active, onClick, title, children, className: _, ...rest }, ref) {
  return (
    <button
      ref={ref}
      onClick={onClick}
      title={title}
      className={cn(
        "h-8 w-8 flex items-center justify-center rounded-lg transition-colors",
        active
          ? "bg-navy-100 text-navy-700"
          : "text-slate-500 hover:text-navy-700 hover:bg-slate-50"
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
