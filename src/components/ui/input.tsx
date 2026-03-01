import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-700 mb-1.5"
        >
          {label}
          {props.required && <span className="text-crimson-600 ml-1">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "w-full h-11 px-4 rounded-md border bg-white text-slate-800 text-sm",
          "placeholder:text-slate-400",
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
