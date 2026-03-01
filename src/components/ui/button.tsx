import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-navy-600 text-white hover:bg-navy-700 active:bg-navy-800 focus-visible:ring-navy-600 shadow-sm hover:shadow-md",
        crimson:
          "bg-crimson-600 text-white hover:bg-crimson-700 active:bg-crimson-800 focus-visible:ring-crimson-600 shadow-sm hover:shadow-md",
        outline:
          "border-2 border-navy-600 text-navy-600 bg-transparent hover:bg-navy-600 hover:text-white focus-visible:ring-navy-600",
        "outline-white":
          "border-2 border-white text-white bg-transparent hover:bg-white hover:text-navy-600 focus-visible:ring-white",
        ghost:
          "text-navy-600 hover:bg-navy-50 focus-visible:ring-navy-600",
        link:
          "text-navy-600 underline-offset-4 hover:underline focus-visible:ring-navy-600 p-0 h-auto",
      },
      size: {
        sm: "h-8 px-4 text-xs rounded-md tracking-wide",
        md: "h-10 px-6 text-sm rounded-md tracking-wide",
        lg: "h-12 px-8 text-base rounded-md tracking-wide",
        xl: "h-14 px-10 text-base rounded-md tracking-wider",
        icon: "h-10 w-10 rounded-md",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  loading,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled ?? loading}
      {...props}
    >
      {loading && (
        <svg
          className="mr-2 h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

export { buttonVariants };
