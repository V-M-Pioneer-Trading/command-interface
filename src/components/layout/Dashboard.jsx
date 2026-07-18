import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { SelectionProvider } from "../../context/SelectionContext";
import { useAgentQuery, useContractsQuery } from "../../hooks/queries";
import { systemSymbolFromWaypoint } from "../../utils/spaceTraders";
import { AgentBar } from "./AgentBar";
import { AlertBanner } from "./AlertBanner";
import { FleetList } from "../fleet/FleetList";
import { SystemMap } from "../map/SystemMap";
import { ShipDetailPanel } from "../shipDetail/ShipDetailPanel";
import { ContractsPanel } from "../contracts/ContractsPanel";
import { AutopilotPanel } from "../autopilot/AutopilotPanel";
import { ObservabilityPanel } from "../observability/ObservabilityPanel";
import { ChatStub } from "../chat/ChatStub";
import "./Dashboard.css";

export function Dashboard() {
  const { token } = useAuth();
  const { data: agent } = useAgentQuery(token);
  const { data: contracts } = useContractsQuery(token);
  const [contractsOpen, setContractsOpen] = useState(false);
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [observabilityOpen, setObservabilityOpen] = useState(false);

  const systemSymbol = systemSymbolFromWaypoint(agent?.headquarters);
  const activeContractCount =
    contracts?.filter((c) => c.accepted && !c.fulfilled).length ?? 0;

  return (
    <SelectionProvider>
      <div className="lcars-dashboard">
        <AlertBanner />
        <AgentBar
          contractCount={activeContractCount}
          contractsOpen={contractsOpen}
          onToggleContracts={() => setContractsOpen((v) => !v)}
          autopilotOpen={autopilotOpen}
          onToggleAutopilot={() => setAutopilotOpen((v) => !v)}
          observabilityOpen={observabilityOpen}
          onToggleObservability={() => setObservabilityOpen((v) => !v)}
        />
        {contractsOpen && (
          <ContractsPanel contracts={contracts} onClose={() => setContractsOpen(false)} />
        )}
        {autopilotOpen && <AutopilotPanel onClose={() => setAutopilotOpen(false)} />}
        {observabilityOpen && (
          <ObservabilityPanel onClose={() => setObservabilityOpen(false)} />
        )}
        <div className="lcars-dashboard__fleet">
          <FleetList token={token} />
        </div>
        <div className="lcars-dashboard__map">
          <SystemMap token={token} systemSymbol={systemSymbol} />
        </div>
        <div className="lcars-dashboard__detail">
          <ShipDetailPanel token={token} contracts={contracts} />
        </div>
        <div className="lcars-dashboard__chat">
          <ChatStub />
        </div>
      </div>
    </SelectionProvider>
  );
}
