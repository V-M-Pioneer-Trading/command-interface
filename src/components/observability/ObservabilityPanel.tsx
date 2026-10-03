import { useMetricsContextQuery, useAnomaliesDigestQuery } from "../../hooks/queries";
import type { ReactNode } from "react";
import { QueryState, type QueryStateSource } from "../common/QueryState";
import type { TogglePanelProps } from "../common/TogglePanelProps";
import { CreditsPerHourChart } from "./CreditsPerHourChart";
import { EventFeed } from "./EventFeed";
import { AnomalyLog } from "./AnomalyLog";
import "./ObservabilityPanel.css";

const METRICS_NOT_CONFIGURED = "Metrics rollups aren't configured on this deployment.";
const ANOMALIES_NOT_CONFIGURED =
  "Anomaly detection isn't configured on this deployment (no webhook set).";

function Section<T>({
  title,
  query,
  notConfigured,
  children,
}: {
  title: string;
  query: QueryStateSource<T>;
  notConfigured: string;
  children: (data: T) => ReactNode;
}) {
  return (
    <section className="lcars-observability-panel__section">
      <h3>{title}</h3>
      <QueryState query={query} notConfigured={notConfigured} empty={notConfigured}>
        {children}
      </QueryState>
    </section>
  );
}

export function ObservabilityPanel({ onClose, style }: TogglePanelProps) {
  const metrics = useMetricsContextQuery({ rollupLimit: 20, eventLimit: 20 });
  const anomalies = useAnomaliesDigestQuery({
    windowMinutes: 60,
    anomalyLimit: 20,
    eventLimit: 20,
  });

  return (
    <div className="lcars-observability-panel" style={style}>
      <div className="lcars-observability-panel__header">
        <h2>Observability</h2>
        <button type="button" onClick={onClose} className="lcars-observability-panel__close">
          ×
        </button>
      </div>

      <Section title="Credits / Hour" query={metrics} notConfigured={METRICS_NOT_CONFIGURED}>
        {(data) => <CreditsPerHourChart rollups={data.rollups} />}
      </Section>

      <Section
        title="Event / Decision Feed"
        query={metrics}
        notConfigured={METRICS_NOT_CONFIGURED}
      >
        {(data) => <EventFeed events={data.events} />}
      </Section>

      <Section title="Anomalies" query={anomalies} notConfigured={ANOMALIES_NOT_CONFIGURED}>
        {(data) => <AnomalyLog anomalies={data.anomalies} />}
      </Section>

      {/* The digest's own notable-events list (lifecycle transitions, task
          failures). Once meta#19's AI supervisor starts appending its event
          types to the same log they show up here with no UI change. */}
      <Section
        title="AI-Action / Notable Events"
        query={anomalies}
        notConfigured={ANOMALIES_NOT_CONFIGURED}
      >
        {(data) => <EventFeed events={data.events} />}
      </Section>
    </div>
  );
}
