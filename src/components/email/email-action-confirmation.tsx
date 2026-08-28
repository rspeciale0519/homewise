"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardFooter, CardHeader } from "@/components/ui/card";

interface EmailActionConfirmationProps {
  token: string;
  endpoint: string;
  title: string;
  description: string;
  buttonLabel: string;
  successTitle: string;
  successMessage: string;
}

export function EmailActionConfirmation({
  token,
  endpoint,
  title,
  description,
  buttonLabel,
  successTitle,
  successMessage,
}: EmailActionConfirmationProps) {
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function submit() {
    setStatus("submitting");
    setError("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "This link could not be processed.");
      setStatus("success");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "This link could not be processed.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" aria-hidden="true" />
          <h1 className="mt-4 font-serif text-3xl font-semibold text-navy-800">{successTitle}</h1>
        </CardHeader>
        <CardBody>
          <p className="text-center text-slate-600">{successMessage}</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg">
      <CardHeader className="text-center">
        <h1 className="font-serif text-3xl font-semibold text-navy-800">{title}</h1>
      </CardHeader>
      <CardBody>
        <p className="text-center text-slate-600">{description}</p>
        {status === "error" && (
          <div className="mt-5 flex gap-3 rounded-lg border border-crimson-200 bg-crimson-50 p-4 text-crimson-800" role="alert">
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p className="text-sm">{error}</p>
          </div>
        )}
      </CardBody>
      <CardFooter className="justify-center">
        <Button
          type="button"
          variant="crimson"
          size="lg"
          loading={status === "submitting"}
          onClick={submit}
        >
          {buttonLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}
