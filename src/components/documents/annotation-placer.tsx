"use client";

import { useState } from "react";
import type { AgentFieldKey, AgentInfo, ContactFieldKey } from "@/types/document-viewer";

interface ContactData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

interface AnnotationPlacerProps {
  agentInfo: AgentInfo;
  selectedContact: ContactData | null;
  onPlaceText: (text: string) => void;
  onPlaceAgentField: (key: AgentFieldKey) => void;
  onPlaceContactField: (key: ContactFieldKey) => void;
  onCancel: () => void;
}

const AGENT_FIELDS: { key: AgentFieldKey; label: string }[] = [
  { key: "name", label: "Full Name" },
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "brokerage", label: "Brokerage" },
  { key: "license", label: "License #" },
];

const CONTACT_FIELDS: { key: ContactFieldKey; label: string }[] = [
  { key: "fullName", label: "Full Name" },
  { key: "firstName", label: "First Name" },
  { key: "lastName", label: "Last Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
];

export function resolveAgentField(key: AgentFieldKey, info: AgentInfo): string {
  switch (key) {
    case "name":
      return `${info.firstName} ${info.lastName}`;
    case "firstName":
      return info.firstName;
    case "lastName":
      return info.lastName;
    case "email":
      return info.email ?? "";
    case "phone":
      return info.phone ?? "";
    case "brokerage":
      return info.brokerageName;
    case "license":
      return info.licenseNumber ?? "";
  }
}

export function resolveContactField(
  key: ContactFieldKey,
  contact: ContactData
): string {
  switch (key) {
    case "fullName":
      return `${contact.firstName} ${contact.lastName}`;
    case "firstName":
      return contact.firstName;
    case "lastName":
      return contact.lastName;
    case "email":
      return contact.email;
    case "phone":
      return contact.phone ?? "";
  }
}

type Tab = "text" | "agent" | "contact";

export function AnnotationPlacer({
  agentInfo,
  selectedContact,
  onPlaceText,
  onPlaceAgentField,
  onPlaceContactField,
  onCancel,
}: AnnotationPlacerProps) {
  const [tab, setTab] = useState<Tab>("text");
  const [freeText, setFreeText] = useState("");

  return (
    <div className="absolute z-40 top-full left-0 mt-1 w-72 bg-white rounded-xl shadow-dropdown border border-slate-100 p-3">
      {/* Tab bar */}
      <div className="flex gap-1 mb-3">
        {(["text", "agent", "contact"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              tab === t
                ? "bg-navy-50 text-navy-700"
                : "text-slate-500 hover:text-navy-600 hover:bg-slate-50"
            }`}
          >
            {t === "text" ? "Free Text" : t === "agent" ? "My Info" : "Client"}
          </button>
        ))}
      </div>

      {tab === "text" && (
        <div className="space-y-2">
          <input
            type="text"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && freeText.trim()) {
                onPlaceText(freeText.trim());
                setFreeText("");
              }
              if (e.key === "Escape") onCancel();
            }}
            placeholder="Type text to place..."
            className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent"
            autoFocus
          />
          <div className="flex justify-end gap-1">
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-xs text-slate-500 hover:text-navy-600"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (freeText.trim()) {
                  onPlaceText(freeText.trim());
                  setFreeText("");
                }
              }}
              disabled={!freeText.trim()}
              className="px-3 py-1.5 text-xs font-medium bg-navy-600 text-white rounded-lg disabled:opacity-40"
            >
              Place
            </button>
          </div>
        </div>
      )}

      {tab === "agent" && (
        <div className="space-y-1">
          {AGENT_FIELDS.map(({ key, label }) => {
            const value = resolveAgentField(key, agentInfo);
            return (
              <button
                key={key}
                onClick={() => onPlaceAgentField(key)}
                disabled={!value}
                className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-left"
              >
                <span className="text-navy-700 font-medium">{label}</span>
                <span className="text-xs text-slate-400 truncate max-w-[120px]">
                  {value || "—"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {tab === "contact" && (
        <div>
          {selectedContact ? (
            <div className="space-y-1">
              <p className="text-xs text-slate-400 mb-2 px-1">
                Placing for: <span className="font-medium text-navy-600">{selectedContact.firstName} {selectedContact.lastName}</span>
              </p>
              {CONTACT_FIELDS.map(({ key, label }) => {
                const value = resolveContactField(key, selectedContact);
                return (
                  <button
                    key={key}
                    onClick={() => onPlaceContactField(key)}
                    disabled={!value}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-left"
                  >
                    <span className="text-navy-700 font-medium">{label}</span>
                    <span className="text-xs text-slate-400 truncate max-w-[120px]">
                      {value || "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-4">
              Select a contact first using the contact picker in the toolbar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
