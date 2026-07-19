import { useMetricsContextQuery, useAnomaliesDigestQuery } from "../../hooks/queries";
import { CreditsPerHourChart } from "./CreditsPerHourChart";
import { EventFeed } from "./EventFeed";
import { AnomalyLog } from "./AnomalyLog";
import "./ObservabilityPanel.css";

export function ObservabilityPanel({ onClose, style }) {
  const { data: metricsContext, isLoading: metricsLoading } = useMetricsContextQuery({
    rollupLimit: 20,
    eventLimit: 20,
  });
  const { data: anomaliesDigest, isLoading: anomaliesLoading } = useAnomaliesDigestQuery({
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

      <section className="lcars-observability-panel__section">
        <h3>Credits / Hour</h3>
        {metricsLoading && <div className="lcars-observability-panel__loading">Loading...</div>}
        {!metricsLoading && metricsContext === null && (
          <div className="lcars-observability-panel__disabled">
            Metrics rollups aren't configured on this deployment.
          </div>
        )}
        {metricsContext && <CreditsPerHourChart rollups={metricsContext.rollups} />}
      </section>

      <section className="lcars-observability-panel__section">
        <h3>Event / Decision Feed</h3>
        {metricsLoading && <div className="lcars-observability-panel__loading">Loading...</div>}
        {!metricsLoading && metricsContext === null && (
          <div className="lcars-observability-panel__disabled">
            Metrics rollups aren't configured on this deployment.
          </div>
        )}
        {metricsContext && <EventFeed events={metricsContext.events} />}
      </section>

      <section className="lcars-observability-panel__section">
        <h3>Anomalies</h3>
        {anomaliesLoading && <div className="lcars-observability-panel__loading">Loading...</div>}
        {!anomaliesLoading && anomaliesDigest === null && (
          <div className="lcars-observability-panel__disabled">
            Anomaly detection isn't configured on this deployment (no webhook set).
          </div>
        )}
        {anomaliesDigest && <AnomalyLog anomalies={anomaliesDigest.anomalies} />}
      </section>

      <section className="lcars-observability-panel__section">
        <h3>AI-Action / Notable Events</h3>
        {anomaliesLoading && <div className="lcars-observability-panel__loading">Loading...</div>}
        {!anomaliesLoading && anomaliesDigest === null && (
          <div className="lcars-observability-panel__disabled">
            Anomaly detection isn't configured on this deployment (no webhook set).
          </div>
        )}
        {anomaliesDigest && <EventFeed events={anomaliesDigest.events} />}
      </section>
    </div>
  );
}
