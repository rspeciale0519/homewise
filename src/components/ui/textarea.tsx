import { cn } from "@/lib/utils";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className, id, ...props }: TextareaProps) {
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          {label}
          {props.required && <span className="text-crimson-600 ml-1">*</span>}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          "w-full px-4 py-3 rounded-md border bg-white text-slate-800 text-sm",
          "placeholder:text-slate-400 resize-y min-h-[120px]",
          "transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent",
          error
            ? "border-crimson-500 focus:ring-crimson-500"
            : "border-slate-200 hover:border-slate-300",
          className
        )}
        {...props}
      />
      {error && <p className="mt-1.5 text-xs text-crimson-600">{error}</p>}
      {hint && !error && <p className="mt-1.5 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
