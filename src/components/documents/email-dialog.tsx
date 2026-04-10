"use client";

import { useCallback, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";

interface EmailDialogProps {
  open: boolean;
  onClose: () => void;
  onSend: (to: string, subject: string, message: string) => Promise<void>;
  documentName: string;
}

export function EmailDialog({ open, onClose, onSend, documentName }: EmailDialogProps) {
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(`Document: ${documentName}`);
  const [message, setMessage] = useState("Please find the attached document.");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const handleSend = useCallback(async () => {
    if (!to.trim()) return;
    setStatus("sending");
    setError("");
    try {
      await onSend(to.trim(), subject.trim(), message.trim());
      setStatus("sent");
      setTimeout(() => {
        onClose();
        setStatus("idle");
        setTo("");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
      setStatus("error");
    }
  }, [to, subject, message, onSend, onClose]);

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <Dialog.Content aria-describedby="email-dialog-desc" className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-2xl shadow-elevated p-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95">
          <Dialog.Title className="text-base font-semibold text-navy-700 mb-4">
            Email Document
          </Dialog.Title>
          <Dialog.Description id="email-dialog-desc" className="sr-only">
            Send the filled PDF document as an email attachment.
          </Dialog.Description>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">
                To <span className="text-crimson-500">*</span>
              </label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="w-full h-10 px-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full h-10 px-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">
                Message <span className="text-xs text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent resize-none"
              />
            </div>

            {error && (
              <div className="rounded-lg bg-crimson-50 border border-crimson-200 px-3 py-2">
                <p className="text-sm text-crimson-700">{error}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 mt-5">
            <Button variant="outline" size="sm" onClick={onClose} disabled={status === "sending"}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!to.trim() || status === "sending" || status === "sent"}
            >
              {status === "sending"
                ? "Sending..."
                : status === "sent"
                  ? "Sent!"
                  : "Send Email"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
