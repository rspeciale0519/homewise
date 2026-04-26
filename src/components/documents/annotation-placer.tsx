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
  onPlaceAgentField: (key: AgentFieldKey) => void;
  onPlaceContactField: (key: ContactFieldKey) => void;
  onCancel: () => void;
  defaultTab?: "agent" | "contact";
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

type Tab = "agent" | "contact";

export function AnnotationPlacer({
  agentInfo,
  selectedContact,
  onPlaceAgentField,
  onPlaceContactField,
  onCancel,
  defaultTab = "agent",
}: AnnotationPlacerProps) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  return (
    <div className="absolute z-40 top-full left-0 mt-1 w-72 bg-white rounded-xl shadow-dropdown border border-slate-100 p-3">
      {/* Tab bar */}
      <div className="flex gap-1 mb-3">
        {(["agent", "contact"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              tab === t
                ? "bg-navy-50 text-navy-700"
                : "text-slate-500 hover:text-navy-600 hover:bg-slate-50"
            }`}
          >
            {t === "agent" ? "My Info" : "Client"}
          </button>
        ))}
        <button
          onClick={onCancel}
          className="ml-auto px-2 py-1.5 text-xs text-slate-400 hover:text-navy-600 transition-colors"
          aria-label="Close"
        >
          &times;
        </button>
      </div>

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
