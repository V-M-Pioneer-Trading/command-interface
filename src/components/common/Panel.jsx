import "./Panel.css";

export function Panel({ title, accent = "orange", className = "", children }) {
  return (
    <section className={`lcars-panel lcars-accent-${accent} ${className}`}>
      {title && (
        <header className="lcars-panel__header">
          <div className="lcars-panel__elbow" />
          <h2 className="lcars-panel__title">{title}</h2>
        </header>
      )}
      <div className="lcars-panel__body">{children}</div>
    </section>
  );
}
