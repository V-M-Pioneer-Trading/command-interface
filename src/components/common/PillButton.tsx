import type { ReactNode } from "react";
import type { Accent } from "./accent";
import "./PillButton.css";

export function PillButton({
  accent = "orange",
  disabled = false,
  title,
  onClick,
  type = "button",
  children,
}: {
  accent?: Accent;
  disabled?: boolean;
  title?: string | undefined;
  onClick?: () => void;
  type?: "button" | "submit";
  children: ReactNode;
}) {
  return (
    <button
      type={type}
      className={`lcars-pill-button lcars-accent-${accent}`}
      disabled={disabled}
      title={title}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
