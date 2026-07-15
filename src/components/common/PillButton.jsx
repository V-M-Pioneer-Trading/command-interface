import "./PillButton.css";

export function PillButton({
  accent = "orange",
  disabled = false,
  title,
  onClick,
  type = "button",
  children,
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
