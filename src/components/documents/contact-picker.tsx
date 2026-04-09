"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ContactOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

interface ContactPickerProps {
  selectedContact: ContactOption | null;
  onSelect: (contact: ContactOption | null) => void;
}

export function ContactPicker({ selectedContact, onSelect }: ContactPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContactOption[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.contacts ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => search(value), 300);
    },
    [search]
  );

  if (selectedContact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-navy-50 rounded-lg">
          <span className="text-xs font-medium text-navy-700">
            {selectedContact.firstName} {selectedContact.lastName}
          </span>
          <button
            onClick={() => onSelect(null)}
            className="text-navy-400 hover:text-crimson-600 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-navy-700 hover:bg-slate-50 rounded-lg transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
        Select Client
      </button>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-white rounded-xl shadow-dropdown border border-slate-100 p-2">
          <input
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search contacts..."
            className="w-full h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent mb-2"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto">
            {loading && (
              <p className="text-xs text-slate-400 text-center py-3">Searching...</p>
            )}
            {!loading && query.length >= 2 && results.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-3">No contacts found</p>
            )}
            {!loading && query.length < 2 && (
              <p className="text-xs text-slate-400 text-center py-3">Type at least 2 characters</p>
            )}
            {results.map((contact) => (
              <button
                key={contact.id}
                onClick={() => {
                  onSelect(contact);
                  setIsOpen(false);
                  setQuery("");
                  setResults([]);
                }}
                className="w-full flex flex-col px-3 py-2 text-left rounded-lg hover:bg-slate-50 transition-colors"
              >
                <span className="text-sm font-medium text-navy-700">
                  {contact.firstName} {contact.lastName}
                </span>
                <span className="text-xs text-slate-400">{contact.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
