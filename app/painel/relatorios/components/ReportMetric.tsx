export function Metric({
  label,
  value,
  detail,
  compact = false,
  onClick,
  expanded = false,
  actionLabel = "Ver detalhes",
}: {
  label: string;
  value: string;
  detail: string;
  compact?: boolean;
  onClick?: () => void;
  expanded?: boolean;
  actionLabel?: string;
}) {
  return (
    <div
      className={`product-card product-stat ${compact ? "soft" : ""}`}
      style={compact ? { minHeight: 105, padding: 16 } : undefined}
    >
      <small>{label}</small>
      <strong style={compact ? { fontSize: 26, marginTop: 10 } : undefined}>{value}</strong>
      <span>{detail}</span>
      {onClick && (
        <button
          className="management-report-drilldown-action"
          type="button"
          aria-expanded={expanded}
          onClick={onClick}
        >
          {expanded ? "Ocultar detalhes" : actionLabel}
        </button>
      )}
    </div>
  );
}
