import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext";
import { useAlerts } from "../../context/AlertContext";
import { useOperator, SCOPE_FLEET_CONTROL } from "../../hooks/useOperator";
import { agentService } from "../../api/agentService";
import { PillButton } from "../common/PillButton";
import "./ContractsPanel.css";

function ContractCard({ contract, onAccept, onFulfill, busy }) {
  const deliverTerms = contract.terms?.deliver || [];
  const allDelivered = deliverTerms.every((d) => d.unitsFulfilled >= d.unitsRequired);

  return (
    <li className="lcars-contract-card">
      <div className="lcars-contract-card__header">
        <span className="lcars-contract-card__id">{contract.id.slice(0, 8)}</span>
        <span className="lcars-contract-card__type">{contract.type}</span>
      </div>
      <div className="lcars-contract-card__payment">
        Payment: {contract.terms?.payment?.onAccepted ?? 0} accepted /{" "}
        {contract.terms?.payment?.onFulfilled ?? 0} fulfilled
      </div>
      <ul className="lcars-contract-card__deliveries">
        {deliverTerms.map((d) => (
          <li key={`${d.tradeSymbol}-${d.destinationSymbol}`}>
            {d.tradeSymbol} → {d.destinationSymbol}: {d.unitsFulfilled}/{d.unitsRequired}
          </li>
        ))}
      </ul>
      <div className="lcars-contract-card__actions">
        {!contract.accepted && (
          <PillButton accent="green" disabled={busy} onClick={() => onAccept(contract.id)}>
            Accept
          </PillButton>
        )}
        {contract.accepted && !contract.fulfilled && (
          <PillButton
            accent="orange"
            disabled={busy || !allDelivered}
            onClick={() => onFulfill(contract.id)}
            title={allDelivered ? undefined : "Deliver all required cargo first"}
          >
            Fulfill
          </PillButton>
        )}
        {contract.fulfilled && <span className="lcars-contract-card__done">FULFILLED</span>}
      </div>
    </li>
  );
}

export function ContractsPanel({ contracts, onClose, style }) {
  const { token } = useAuth();
  const { pushAlert } = useAlerts();
  const queryClient = useQueryClient();
  const { can, getToken } = useOperator();
  const hasControl = can(SCOPE_FLEET_CONTROL);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["contracts", token] });
    queryClient.invalidateQueries({ queryKey: ["agent", token] });
  };

  const acceptMutation = useMutation({
    mutationFn: async (contractId) => agentService.acceptContract(token, contractId, await getToken()),
    onSuccess: invalidate,
    onError: (err) => pushAlert(err.message || "Failed to accept contract"),
  });
  const fulfillMutation = useMutation({
    mutationFn: async (contractId) => agentService.fulfillContract(token, contractId, await getToken()),
    onSuccess: invalidate,
    onError: (err) => pushAlert(err.message || "Failed to fulfill contract"),
  });

  const busy = acceptMutation.isPending || fulfillMutation.isPending || !hasControl;

  return (
    <div className="lcars-contracts-panel" style={style}>
      <div className="lcars-contracts-panel__header">
        <h2>Contracts</h2>
        <button type="button" onClick={onClose} className="lcars-contracts-panel__close">
          ×
        </button>
      </div>
      {(!contracts || contracts.length === 0) && (
        <div className="lcars-contracts-panel__empty">No contracts</div>
      )}
      <ul className="lcars-contracts-panel__list">
        {contracts?.map((c) => (
          <ContractCard
            key={c.id}
            contract={c}
            busy={busy}
            onAccept={acceptMutation.mutate}
            onFulfill={fulfillMutation.mutate}
          />
        ))}
      </ul>
    </div>
  );
}
