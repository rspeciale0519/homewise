"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function SearchAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = text ?? input;
    if (!msg.trim() || isLoading) return;

    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: msg };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, conversationId, config: "public", sessionId }),
      });
      const data = (await res.json()) as { conversationId: string; content: string };
      if (!conversationId) setConversationId(data.conversationId);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: data.content }]);
    } catch {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: "Sorry, something went wrong." }]);
    }

    setIsLoading(false);
  };

  const suggestions = [
    "Show me 3-bedroom homes in Oviedo under $400k",
    "Find waterfront homes with a pool",
    "What's available in Winter Park near schools?",
    "New construction in Seminole County",
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Messages */}
      <div className="h-[50vh] sm:h-[55vh] lg:h-[60vh] min-h-[320px] max-h-[600px] overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-8">
            <div className="h-14 w-14 rounded-full bg-navy-50 flex items-center justify-center mb-4">
              <svg className="h-7 w-7 text-navy-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-base font-medium text-navy-700 mb-1">Search with AI</p>
            <p className="text-sm text-slate-400 mb-6 text-center max-w-xs">
              Describe what you&apos;re looking for in plain English
            </p>
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-xs sm:text-sm px-3 sm:px-4 py-2 bg-navy-50 text-navy-600 rounded-full hover:bg-navy-100 transition-colors text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[90%] sm:max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "bg-navy-600 text-white rounded-br-md" : "bg-slate-50 text-slate-700 rounded-bl-md border border-slate-100"}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-50 rounded-2xl rounded-bl-md px-4 py-3 text-sm text-slate-500 border border-slate-100">
              <span className="inline-flex gap-1 items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50/50">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) handleSend(); }}
            placeholder="Describe what you're looking for..."
            className="flex-1 h-11 sm:h-12 px-4 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-navy-600 transition-colors"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="h-11 sm:h-12 px-5 sm:px-6 bg-navy-600 text-white text-sm font-semibold rounded-xl hover:bg-navy-700 disabled:opacity-40 transition-all active:scale-[0.98] shrink-0"
          >
            Search
          </button>
        </div>
      </div>
    </div>
  );
}
