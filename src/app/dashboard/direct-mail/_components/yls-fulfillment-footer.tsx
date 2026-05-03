export function YlsFulfillmentFooter() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-300 to-amber-500 text-xs font-extrabold text-white">
          YLS
        </div>
        <div className="flex-1 text-sm">
          <p className="font-semibold text-amber-900">
            Fulfilled by YellowLetterShop.com
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-amber-800/80">
            Your direct-mail printing and mailing partner. Proofs, invoices, and shipping
            updates come directly from <span className="font-medium">yellowlettershop.com</span>{" "}
            — keep an eye on your inbox (and spam folder).
          </p>
        </div>
      </div>
    </div>
  );
}
