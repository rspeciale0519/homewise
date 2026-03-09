"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";

interface UserFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
}

interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: UserFormData) => Promise<void>;
  initialData?: Partial<UserFormData>;
  mode: "add" | "edit";
}

const ROLES = ["user", "agent", "admin"] as const;

export function UserFormDialog({ open, onClose, onSubmit, initialData, mode }: UserFormDialogProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("user");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFirstName(initialData?.firstName ?? "");
      setLastName(initialData?.lastName ?? "");
      setEmail(initialData?.email ?? "");
      setPhone(initialData?.phone ?? "");
      setRole(initialData?.role ?? "user");
      setError(null);
    }
  }, [open, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await onSubmit({ firstName, lastName, email, phone, role });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-200" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl max-w-md w-full p-6 shadow-elevated z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 duration-200">
          <Dialog.Title className="font-semibold text-navy-700 text-lg">
            {mode === "add" ? "Add User" : "Edit User"}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-slate-500 mt-1">
            {mode === "add"
              ? "Create a new user account. They can use 'Forgot Password' to set their credentials."
              : "Update user details."}
          </Dialog.Description>

          <form onSubmit={handleSubmit} className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="uf-first" className="block text-xs font-medium text-slate-600 mb-1">
                  First Name
                </label>
                <input
                  id="uf-first"
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-300"
                />
              </div>
              <div>
                <label htmlFor="uf-last" className="block text-xs font-medium text-slate-600 mb-1">
                  Last Name
                </label>
                <input
                  id="uf-last"
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-300"
                />
              </div>
            </div>

            <div>
              <label htmlFor="uf-email" className="block text-xs font-medium text-slate-600 mb-1">
                Email
              </label>
              <input
                id="uf-email"
                type="email"
                required
                disabled={mode === "edit"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-300 disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>

            <div>
              <label htmlFor="uf-phone" className="block text-xs font-medium text-slate-600 mb-1">
                Phone <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="uf-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-300"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
              <div className="flex gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                      role === r
                        ? "bg-navy-600 text-white"
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <p className="text-xs text-crimson-600 bg-crimson-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-navy-600 text-white rounded-lg text-sm font-semibold hover:bg-navy-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : mode === "add" ? "Create User" : "Save Changes"}
              </button>
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </Dialog.Close>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
