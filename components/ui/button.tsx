import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300",
  secondary:
    "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 disabled:text-zinc-400",
  danger:
    "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
};

export function Button({
  className = "",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
