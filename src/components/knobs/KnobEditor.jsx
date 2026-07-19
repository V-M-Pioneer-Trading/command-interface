import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAlerts } from "../../context/AlertContext";
import { useKnobsQuery } from "../../hooks/queries";
import { automationService } from "../../api/automationService";
import { KnobRow } from "./KnobRow";
import "./KnobEditor.css";

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
      <ul className="lcars-knob-editor__list">
        {knobs?.map((knob) => (
          <KnobRow
            key={knob.name}
            knob={knob}
            busy={setMutation.isPending}
            onSave={(name, value) => setMutation.mutate({ name, value })}
          />
        ))}
      </ul>
    </div>
  );
}
