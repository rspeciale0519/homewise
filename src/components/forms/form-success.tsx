interface FormSuccessProps {
  title?: string;
  message?: string;
  onReset?: () => void;
  resetLabel?: string;
}

export function FormSuccess({
  title = "Message Sent!",
  message = "We'll be in touch within one business day.",
  onReset,
  resetLabel = "Send Another Message",
}: FormSuccessProps) {
  return (
    <div className="text-center py-8 animate-fade-in">
      {/* Animated checkmark */}
      <div className="relative mx-auto mb-6 h-20 w-20">
        <div className="absolute inset-0 rounded-full bg-emerald-100 animate-ping opacity-20" />
        <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
          <svg
            className="h-10 w-10 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
              className="animate-[draw_0.5s_ease-out_0.3s_forwards]"
              style={{
                strokeDasharray: 24,
                strokeDashoffset: 24,
                animation: "draw 0.5s ease-out 0.3s forwards",
              }}
            />
          </svg>
        </div>
      </div>

      <h3 className="font-serif text-2xl font-semibold text-navy-700 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto mb-6">{message}</p>

      {onReset && (
        <button
          onClick={onReset}
          type="button"
          className="text-sm font-medium text-crimson-600 hover:text-crimson-700 transition-colors"
        >
          {resetLabel}
        </button>
      )}

      <style jsx>{`
        @keyframes draw {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
}
