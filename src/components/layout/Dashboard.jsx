import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { SelectionProvider } from "../../context/SelectionContext";
import { useAgentQuery, useContractsQuery } from "../../hooks/queries";
import { systemSymbolFromWaypoint } from "../../utils/spaceTraders";
import { computeTogglePanelOffsets } from "../../utils/togglePanelLayout";
import { AgentBar } from "./AgentBar";
import { AlertBanner } from "./AlertBanner";
import { FleetList } from "../fleet/FleetList";
import { SystemMap } from "../map/SystemMap";
import { ShipDetailPanel } from "../shipDetail/ShipDetailPanel";
import { ContractsPanel } from "../contracts/ContractsPanel";
import { AutopilotPanel } from "../autopilot/AutopilotPanel";
import { ObservabilityPanel } from "../observability/ObservabilityPanel";
import { KnobEditor } from "../knobs/KnobEditor";
import { ChatStub } from "../chat/ChatStub";
import "./Dashboard.css";

export function Dashboard() {
  const { token } = useAuth();
  const { data: agent } = useAgentQuery(token);
  const { data: contracts } = useContractsQuery(token);
  const [openPanels, setOpenPanels] = useState({
    contracts: false,
    autopilot: false,
    observability: false,
    knobs: false,
  });
  const togglePanel = (key) => setOpenPanels((prev) => ({ ...prev, [key]: !prev[key] }));

  const systemSymbol = systemSymbolFromWaypoint(agent?.headquarters);
  const activeContractCount =
    contracts?.filter((c) => c.accepted && !c.fulfilled).length ?? 0;

  const openKeys = new Set(Object.keys(openPanels).filter((k) => openPanels[k]));
  const offsets = computeTogglePanelOffsets(openKeys);
  const styleFor = (key) => ({ right: `${offsets[key]}rem` });

  return (
    <SelectionProvider>
      <div className="lcars-dashboard">
        <AlertBanner />
        <AgentBar
          contractCount={activeContractCount}
          contractsOpen={openPanels.contracts}
          onToggleContracts={() => togglePanel("contracts")}
          autopilotOpen={openPanels.autopilot}
          onToggleAutopilot={() => togglePanel("autopilot")}
          observabilityOpen={openPanels.observability}
          onToggleObservability={() => togglePanel("observability")}
          knobsOpen={openPanels.knobs}
          onToggleKnobs={() => togglePanel("knobs")}
        />
        {openPanels.contracts && (
          <ContractsPanel
            contracts={contracts}
            onClose={() => togglePanel("contracts")}
            style={styleFor("contracts")}
          />
        )}
        {openPanels.autopilot && (
          <AutopilotPanel onClose={() => togglePanel("autopilot")} style={styleFor("autopilot")} />
        )}
        {openPanels.observability && (
          <ObservabilityPanel
            onClose={() => togglePanel("observability")}
            style={styleFor("observability")}
          />
        )}
        {openPanels.knobs && (
          <KnobEditor onClose={() => togglePanel("knobs")} style={styleFor("knobs")} />
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
