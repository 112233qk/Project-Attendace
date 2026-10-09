import { ReactNode } from "react";

interface Props {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({
  icon = "📭",
  title,
  description,
  action,
}: Props) {
  return (
    <div className="p-10 md:p-14 text-center space-y-3">
      <div className="text-5xl md:text-6xl">{icon}</div>
      <p className="text-lg font-display font-bold text-ink">{title}</p>
      {description && (
        <p className="text-sm text-muted max-w-sm mx-auto">{description}</p>
      )}
      {action && <div className="pt-3">{action}</div>}
    </div>
  );
}
