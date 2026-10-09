import { useEffect } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface Props {
  toast: ToastData;
  onClose: (id: string) => void;
}

const STYLES: Record<
  ToastType,
  { bg: string; border: string; icon: string; progressColor: string }
> = {
  success: {
    bg: "bg-white",
    border: "border-emerald-200",
    icon: "✅",
    progressColor: "bg-emerald-500",
  },
  error: {
    bg: "bg-white",
    border: "border-red-200",
    icon: "⚠️",
    progressColor: "bg-red-500",
  },
  info: {
    bg: "bg-white",
    border: "border-blue-200",
    icon: "ℹ️",
    progressColor: "bg-blue-500",
  },
};

export default function Toast({ toast, onClose }: Props) {
  const duration = toast.duration ?? 3500;
  const style = STYLES[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => onClose(toast.id), duration);
    return () => clearTimeout(timer);
  }, [toast.id, duration, onClose]);

  return (
    <div
      className={`${style.bg} border ${style.border} rounded-2xl shadow-2xl 
                  overflow-hidden w-full max-w-sm pointer-events-auto
                  animate-[slideIn_0.3s_ease-out]`}
      role="alert"
    >
      <div className="flex gap-3 p-4">
        <span className="text-xl shrink-0">{style.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-ink text-sm">
            {toast.title}
          </p>
          {toast.message && (
            <p className="text-xs text-muted mt-0.5 break-words">
              {toast.message}
            </p>
          )}
        </div>
        <button
          onClick={() => onClose(toast.id)}
          className="text-muted hover:text-ink text-xl leading-none cursor-pointer shrink-0"
          aria-label="Tutup"
        >
          ×
        </button>
      </div>
      {/* Progress Bar */}
      <div className="h-1 bg-line/50">
        <div
          className={`h-full ${style.progressColor}`}
          style={{
            animation: `shrinkWidth ${duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}
