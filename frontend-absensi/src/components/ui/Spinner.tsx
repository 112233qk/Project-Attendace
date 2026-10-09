interface Props {
  size?: "sm" | "md" | "lg";
  color?: "white" | "blue" | "muted";
}

const SIZES = {
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-10 h-10 border-3",
};

const COLORS = {
  white: "border-white/30 border-t-white",
  blue: "border-blue/20 border-t-blue",
  muted: "border-line border-t-muted",
};

export default function Spinner({ size = "md", color = "blue" }: Props) {
  return (
    <div
      className={`${SIZES[size]} ${COLORS[color]} rounded-full animate-spin`}
      role="status"
      aria-label="Loading"
    />
  );
}
