import { useState } from "react";
import { SelectionProvider } from "../../context/SelectionContext";
import { useAgentQuery, useContractsQuery } from "../../hooks/queries";
import { systemSymbolFromWaypoint } from "../../utils/spaceTraders";
import { PANEL_ORDER, computeTogglePanelOffsets } from "../../utils/togglePanelLayout";
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
  const { data: agent } = useAgentQuery();
  const { data: contracts } = useContractsQuery();
  const [openPanels, setOpenPanels] = useState({});
  const togglePanel = (key) => setOpenPanels((prev) => ({ ...prev, [key]: !prev[key] }));

  const systemSymbol = systemSymbolFromWaypoint(agent?.headquarters);
  const activeContractCount = contracts?.filter((c) => c.accepted && !c.fulfilled).length ?? 0;

  const offsets = computeTogglePanelOffsets(new Set(PANEL_ORDER.filter((k) => openPanels[k])));
  const panelProps = (key) => ({
    onClose: () => togglePanel(key),
    style: { right: `${offsets[key]}rem` },
  });

  return (
    <SelectionProvider>
      <div className="lcars-dashboard">
        <AlertBanner />
        <AgentBar
          contractCount={activeContractCount}
          openPanels={openPanels}
          onTogglePanel={togglePanel}
        />
        {openPanels.contracts && <ContractsPanel {...panelProps("contracts")} />}
        {openPanels.autopilot && <AutopilotPanel {...panelProps("autopilot")} />}
        {openPanels.observability && <ObservabilityPanel {...panelProps("observability")} />}
        {openPanels.knobs && <KnobEditor {...panelProps("knobs")} />}
        <div className="lcars-dashboard__fleet">
          <FleetList />
        </div>
        <div className="lcars-dashboard__map">
          <SystemMap systemSymbol={systemSymbol} />
        </div>
        <div className="lcars-dashboard__detail">
          <ShipDetailPanel />
        </div>
        <div className="lcars-dashboard__chat">
          <ChatStub />
        </div>
      </div>
    </SelectionProvider>
  );
}
