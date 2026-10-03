import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAlerts } from "../../context/AlertContext";
import { useKnobsQuery } from "../../hooks/queries";
import { useOperator, SCOPE_PLANNER_ADVISE } from "../../context/OperatorContext";
import { queryKeys } from "../../hooks/queryKeys";
import { automationService } from "../../api/automationService";
import type { KnobClass } from "../../api/types";
import { QueryState } from "../common/QueryState";
import type { TogglePanelProps } from "../common/TogglePanelProps";
import { KnobRow } from "./KnobRow";
import "./KnobEditor.css";

/**
 * Knobs are grouped by class because the classes mean genuinely different
 * things, and editing one without knowing which kind it is invites trouble —
 * a `model` value is a measurement the fleet maintains for itself, so pinning
 * one by hand changes what the planner believes rather than what is true.
 * Order runs from "safe to tune" to "think first".
 */
const CLASS_SECTIONS: { key: KnobClass; title: string; caption: string }[] = [
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

export function KnobEditor({ onClose, style }: TogglePanelProps) {
  const { pushAlert } = useAlerts();
  const queryClient = useQueryClient();
  const knobsQuery = useKnobsQuery();
  const { isSignedIn, can, getToken } = useOperator();

  // Knob *values* stay public — reading what the planner believes is the most
  // useful thing on this panel and needs no credential. Only writing is gated.
  const canAdvise = can(SCOPE_PLANNER_ADVISE);

  const setMutation = useMutation({
    mutationFn: async ({ name, value }: { name: string; value: number }) => automationService.setKnob(name, value, await getToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.knobs() });
      // A successful edit is logged as a knob_changed event server-side —
      // refresh the event feed so it shows up without waiting for its own poll.
      // The bare prefix matches every parameterised metricsContext key.
      queryClient.invalidateQueries({ queryKey: queryKeys.metricsContext() });
    },
    onError: (err: Error) => pushAlert(err.message || "Failed to update knob"),
  });

  return (
    <div className="lcars-knob-editor" style={style}>
      <div className="lcars-knob-editor__header">
        <h2>Knobs</h2>
        <button type="button" onClick={onClose} className="lcars-knob-editor__close">
          ×
        </button>
      </div>
      {!canAdvise && (
        <p className="lcars-knob-editor__gated">
          {isSignedIn
            ? "This account has no planner:advise scope. Values are read-only."
            : "Sign in as an operator to change knob values."}
        </p>
      )}
      <QueryState query={knobsQuery} empty="Knob values are unavailable.">
        {(knobs) =>
          knobs.length === 0 ? (
            <div className="lcars-knob-editor__empty">No knobs</div>
          ) : (
            // A knob with no class (an older automation-service) falls into
            // Policy, matching the server's own default, rather than vanishing
            // from the UI.
            CLASS_SECTIONS.map((section) => {
              const inSection = knobs.filter((knob) =>
                section.key === "policy"
                  ? (knob.class ?? "policy") === "policy"
                  : knob.class === section.key
              );
              if (inSection.length === 0) return null;
              return (
                <section key={section.key} className="lcars-knob-editor__section">
                  <h3 className="lcars-knob-editor__section-title">{section.title}</h3>
                  <p className="lcars-knob-editor__section-caption">{section.caption}</p>
                  <ul className="lcars-knob-editor__list">
                    {inSection.map((knob) => (
                      <KnobRow
                        key={knob.name}
                        knob={knob}
                        busy={setMutation.isPending || !canAdvise}
                        onSave={(name, value) => setMutation.mutate({ name, value })}
                      />
                    ))}
                  </ul>
                </section>
              );
            })
          )
        }
      </QueryState>
    </div>
  );
}
