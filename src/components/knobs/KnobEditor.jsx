import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAlerts } from "../../context/AlertContext";
import { useKnobsQuery } from "../../hooks/queries";
import { automationService } from "../../api/automationService";
import { KnobRow } from "./KnobRow";
import "./KnobEditor.css";

/**
 * Knobs are grouped by class because the classes mean genuinely different
 * things, and editing one without knowing which kind it is invites trouble —
 * a `model` value is a measurement the fleet maintains for itself, so pinning
 * one by hand changes what the planner believes rather than what is true.
 * Order runs from "safe to tune" to "think first".
 */
const CLASS_SECTIONS = [
  {
    key: "policy",
    title: "Policy",
    caption: "Your preferences. No measurable right answer — tune these freely. The AI supervisor may also change them.",
  },
  {
    key: "alert",
    title: "Alerts",
    caption: "What counts as something being wrong. Operator-only: the AI cannot widen its own alarms.",
  },
  {
    key: "model",
    title: "Model priors",
    caption:
      "What the planner believes about the universe. Measured from the fleet's own history — these values only apply until there is data.",
  },
];

export function KnobEditor({ onClose, style }) {
  const { pushAlert } = useAlerts();
  const queryClient = useQueryClient();
  const { data: knobs, isLoading } = useKnobsQuery();

  const setMutation = useMutation({
    mutationFn: ({ name, value }) => automationService.setKnob(name, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knobs"] });
      // A successful edit is logged as a knob_changed event server-side —
      // refresh the event feed so it shows up without waiting for its own poll.
      queryClient.invalidateQueries({ queryKey: ["metricsContext"] });
    },
    onError: (err) => pushAlert(err.message || "Failed to update knob"),
  });

  return (
    <div className="lcars-knob-editor" style={style}>
      <div className="lcars-knob-editor__header">
        <h2>Knobs</h2>
        <button type="button" onClick={onClose} className="lcars-knob-editor__close">
          ×
        </button>
      </div>
      {isLoading && <div className="lcars-knob-editor__loading">Loading...</div>}
      {!isLoading && (!knobs || knobs.length === 0) && (
        <div className="lcars-knob-editor__empty">No knobs</div>
      )}
      {CLASS_SECTIONS.map((section) => {
        // A knob with no class (an older automation-service) falls into Policy,
        // matching the server's own default, rather than vanishing from the UI.
        const inSection = knobs?.filter((knob) =>
          section.key === "policy" ? (knob.class ?? "policy") === "policy" : knob.class === section.key
        );
        if (!inSection || inSection.length === 0) return null;
        return (
          <section key={section.key} className="lcars-knob-editor__section">
            <h3 className="lcars-knob-editor__section-title">{section.title}</h3>
            <p className="lcars-knob-editor__section-caption">{section.caption}</p>
            <ul className="lcars-knob-editor__list">
              {inSection.map((knob) => (
                <KnobRow
                  key={knob.name}
                  knob={knob}
                  busy={setMutation.isPending}
                  onSave={(name, value) => setMutation.mutate({ name, value })}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
