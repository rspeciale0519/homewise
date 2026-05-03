"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  MAIL_CLASSES,
  PRODUCT_SIZE_OPTIONS,
  PRODUCT_TYPES,
  earliestDropDate,
  mailClassLabel,
  productTypeLabel,
  type MailClass,
  type ProductType,
} from "@/lib/direct-mail/constants";
import type { DraftState } from "@/lib/direct-mail/types";

const PRODUCT_OPTIONS = PRODUCT_TYPES.map((p) => ({ value: p, label: productTypeLabel(p) }));
const MAIL_CLASS_OPTIONS = MAIL_CLASSES.map((c) => ({ value: c, label: mailClassLabel(c) }));

function toIsoDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function StepSpec({
  draft,
  onChange,
  errors,
}: {
  draft: DraftState;
  onChange: (patch: Partial<DraftState>) => void;
  errors: Partial<Record<string, string>>;
}) {
  const productType = draft.productType ?? "postcard";
  const sizeOptions = useMemo(() => {
    const sizes = PRODUCT_SIZE_OPTIONS[productType];
    return sizes.length > 0
      ? sizes.map((s) => ({ value: s, label: s }))
      : [{ value: "Other", label: "Specify in notes" }];
  }, [productType]);

  const minDate = toIsoDate(earliestDropDate());
  const ra = draft.returnAddress ?? {
    name: "",
    address1: "",
    address2: "",
    city: "",
    state: "FL",
    zip: "",
  };

  function patchRa(partial: Partial<typeof ra>) {
    onChange({ returnAddress: { ...ra, ...partial } });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="font-serif text-xl font-semibold text-navy-700 mb-1">Mail spec</h2>
        <p className="text-sm text-slate-500">
          Tell YLS what you&apos;re mailing and when it should drop.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Product type"
          required
          options={PRODUCT_OPTIONS}
          value={productType}
          onValueChange={(v) =>
            onChange({ productType: v as ProductType, productSize: null })
          }
          error={errors.productType}
        />
        <Select
          label="Size"
          required
          options={sizeOptions}
          value={draft.productSize ?? ""}
          placeholder="Choose size"
          onValueChange={(v) => onChange({ productSize: v })}
          error={errors.productSize}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Mail class"
          required
          options={MAIL_CLASS_OPTIONS}
          value={draft.mailClass ?? ""}
          placeholder="Choose mail class"
          onValueChange={(v) => onChange({ mailClass: v as MailClass })}
          error={errors.mailClass}
        />
        <Input
          type="date"
          label="Target drop date"
          required
          min={minDate}
          value={draft.dropDate ?? ""}
          onChange={(e) => onChange({ dropDate: e.target.value })}
          error={errors.dropDate}
          hint={`Earliest available: ${minDate}`}
        />
      </div>

      <fieldset className="rounded-xl border border-slate-100 p-4">
        <legend className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Return address
        </legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Name / brokerage"
              required
              value={ra.name}
              onChange={(e) => patchRa({ name: e.target.value })}
              error={errors["returnAddress.name"]}
            />
          </div>
          <Input
            label="Address line 1"
            required
            value={ra.address1}
            onChange={(e) => patchRa({ address1: e.target.value })}
            error={errors["returnAddress.address1"]}
          />
          <Input
            label="Address line 2"
            value={ra.address2 ?? ""}
            onChange={(e) => patchRa({ address2: e.target.value })}
          />
          <Input
            label="City"
            required
            value={ra.city}
            onChange={(e) => patchRa({ city: e.target.value })}
            error={errors["returnAddress.city"]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="State"
              required
              maxLength={2}
              value={ra.state}
              onChange={(e) => patchRa({ state: e.target.value.toUpperCase() })}
              error={errors["returnAddress.state"]}
            />
            <Input
              label="ZIP"
              required
              value={ra.zip}
              onChange={(e) => patchRa({ zip: e.target.value })}
              error={errors["returnAddress.zip"]}
            />
          </div>
        </div>
      </fieldset>

      <Textarea
        label="Special instructions (optional)"
        rows={3}
        value={draft.specialInstructions ?? ""}
        onChange={(e) => onChange({ specialInstructions: e.target.value })}
        hint="Anything our YLS team should know — postage class quirks, handling, etc."
      />
    </div>
  );
}
