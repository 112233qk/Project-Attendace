import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import Toast, { ToastData, ToastType } from "./Toast";

interface ToastContextValue {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast harus dipakai di dalam ToastProvider");
  }
  return ctx;
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, title, message }]);
    },
    []
  );

  const value: ToastContextValue = {
    success: (title, message) => addToast("success", title, message),
    error: (title, message) => addToast("error", title, message),
    info: (title, message) => addToast("info", title, message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Container */}
      <div
        className="fixed top-4 right-4 z-[100] flex flex-col gap-3 
                      pointer-events-none w-full max-w-sm px-4 md:px-0"
      >
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
