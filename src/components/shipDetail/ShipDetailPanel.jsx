import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelection } from "../../context/SelectionContext";
import { useAlerts } from "../../context/AlertContext";
import { useOperator, SCOPE_FLEET_CONTROL } from "../../hooks/useOperator";
import {
  useShipsQuery,
  useCooldownQuery,
  useCargoQuery,
  useSystemWaypointsQuery,
  useMarketQuery,
  useAgentQuery,
} from "../../hooks/queries";
import { fleetService } from "../../api/fleetService";
import { agentService } from "../../api/agentService";
import { Panel } from "../common/Panel";
import { PillButton } from "../common/PillButton";
import { StatusPill } from "../common/StatusPill";
import { CooldownTimer } from "./CooldownTimer";
import { TransitTimer } from "./TransitTimer";
import { CargoList } from "./CargoList";
import { MarketList } from "./MarketList";
import { SurveyList } from "./SurveyList";
import { NavigatePicker } from "./NavigatePicker";
import "./ShipDetailPanel.css";

const FLIGHT_MODES = ["CRUISE", "BURN", "DRIFT", "STEALTH"];

export function ShipDetailPanel({ token, contracts }) {
  const { can, getToken } = useOperator();
  const hasControl = can(SCOPE_FLEET_CONTROL);
  const { selectedShipSymbol } = useSelection();
  const { data: ships } = useShipsQuery(token);
  const ship = ships?.find((s) => s.symbol === selectedShipSymbol);

  const { data: cooldownResp } = useCooldownQuery(token, selectedShipSymbol);
  const { data: cargo } = useCargoQuery(token, selectedShipSymbol);
  const { data: waypointData } = useSystemWaypointsQuery(token, ship?.nav?.systemSymbol);
  const { data: agent } = useAgentQuery(token);
  const cooldown = cooldownResp?.data;

  const status = ship?.nav?.status;
  const isDocked = status === "DOCKED";
  const currentWaypoint = waypointData?.data?.find((w) => w.symbol === ship?.nav?.waypointSymbol);
  const hasMarketplace = !!currentWaypoint?.traits?.some((t) => t.symbol === "MARKETPLACE");
  const { data: market } = useMarketQuery(token, ship?.nav?.waypointSymbol, {
    enabled: isDocked && hasMarketplace,
  });

  const [surveys, setSurveys] = useState([]);
  const { pushAlert } = useAlerts();
  const queryClient = useQueryClient();

  const invalidateShip = () => {
    queryClient.invalidateQueries({ queryKey: ["ships", token] });
    queryClient.invalidateQueries({ queryKey: ["cooldown", token, selectedShipSymbol] });
    queryClient.invalidateQueries({ queryKey: ["cargo", token, selectedShipSymbol] });
  };

  const onActionError = (err) => pushAlert(err.message || "Action failed");

  const orbitMutation = useMutation({
    mutationFn: async () => fleetService.orbit(token, selectedShipSymbol, await getToken()),
    onSuccess: invalidateShip,
    onError: onActionError,
  });
  const dockMutation = useMutation({
    mutationFn: async () => fleetService.dock(token, selectedShipSymbol, await getToken()),
    onSuccess: invalidateShip,
    onError: onActionError,
  });
  const navigateMutation = useMutation({
    mutationFn: async (waypointSymbol) =>
      fleetService.navigate(token, selectedShipSymbol, waypointSymbol, await getToken()),
    onSuccess: invalidateShip,
    onError: onActionError,
  });
  const refuelMutation = useMutation({
    mutationFn: async () => fleetService.refuel(token, selectedShipSymbol, await getToken()),
    onSuccess: (res) => {
      const units = res?.data?.transaction?.units;
      if (units === 0) {
        pushAlert("Tank already full (or ship has no fuel tank) — nothing to refuel", {
          severity: "info",
        });
      } else if (units > 0) {
        pushAlert(`Refueled ${units} units`, { severity: "info", timeoutMs: 3000 });
      }
      invalidateShip();
      queryClient.invalidateQueries({ queryKey: ["agent", token] });
    },
    onError: onActionError,
  });
  const extractMutation = useMutation({
    mutationFn: async () => fleetService.extract(token, selectedShipSymbol, await getToken()),
    onSuccess: invalidateShip,
    onError: onActionError,
  });
  const extractSurveyMutation = useMutation({
    mutationFn: async (survey) =>
      fleetService.extractWithSurvey(token, selectedShipSymbol, survey, await getToken()),
    onSuccess: invalidateShip,
    onError: onActionError,
  });
  const sellMutation = useMutation({
    mutationFn: async ({ symbol, units }) =>
      agentService.sell(token, selectedShipSymbol, symbol, units, await getToken()),
    onSuccess: () => {
      invalidateShip();
      queryClient.invalidateQueries({ queryKey: ["agent", token] });
    },
    onError: onActionError,
  });
  const deliverMutation = useMutation({
    mutationFn: async ({ contractId, symbol, units }) =>
      fleetService.deliverContract(token, contractId, selectedShipSymbol, symbol, units, await getToken()),
    onSuccess: () => {
      invalidateShip();
      queryClient.invalidateQueries({ queryKey: ["contracts", token] });
    },
    onError: (err) => pushAlert(err.message || "Delivery failed"),
  });
  const surveyMutation = useMutation({
    mutationFn: async () => fleetService.survey(token, selectedShipSymbol, await getToken()),
    onSuccess: (data) => {
      setSurveys((prev) => [...prev, ...(data?.data?.surveys || [])]);
      invalidateShip();
    },
    onError: (err) => pushAlert(err.message || "Survey failed"),
  });
  const flightModeMutation = useMutation({
    mutationFn: async (flightMode) =>
      fleetService.setFlightMode(token, selectedShipSymbol, flightMode, await getToken()),
    onSuccess: invalidateShip,
    onError: onActionError,
  });
  const purchaseMutation = useMutation({
    mutationFn: async ({ symbol, units }) =>
      agentService.purchaseCargo(token, selectedShipSymbol, symbol, units, await getToken()),
    onSuccess: () => {
      invalidateShip();
      queryClient.invalidateQueries({ queryKey: ["agent", token] });
    },
    onError: onActionError,
  });
  const transferMutation = useMutation({
    mutationFn: async ({ targetShipSymbol, symbol, units }) =>
      fleetService.transferCargo(token, selectedShipSymbol, symbol, units, targetShipSymbol, await getToken()),
    onSuccess: invalidateShip,
    onError: onActionError,
  });

  if (!selectedShipSymbol || !ship) {
    return (
      <Panel title="Ship Detail" accent="tan" className="lcars-ship-detail">
        <div className="lcars-ship-detail__empty">Select a ship from the fleet list</div>
      </Panel>
    );
  }

  const hasCooldown = !!cooldown && new Date(cooldown.expiration).getTime() > Date.now();
  const isOrbiting = status === "IN_ORBIT";
  const otherShipsAtWaypoint = (ships || []).filter(
    (s) => s.symbol !== ship.symbol && s.nav?.waypointSymbol === ship.nav?.waypointSymbol
  );
  const anyMutating =
    orbitMutation.isPending ||
    dockMutation.isPending ||
    navigateMutation.isPending ||
    refuelMutation.isPending ||
    extractMutation.isPending ||
    extractSurveyMutation.isPending ||
    surveyMutation.isPending ||
    sellMutation.isPending ||
    deliverMutation.isPending ||
    flightModeMutation.isPending ||
    purchaseMutation.isPending ||
    transferMutation.isPending;

  return (
    <Panel title={ship.symbol} accent="tan" className="lcars-ship-detail">
      <div className="lcars-ship-detail__status-row">
        <StatusPill status={status} />
        <span>{ship.nav?.waypointSymbol}</span>
        <CooldownTimer cooldown={cooldown} />
        <TransitTimer nav={ship.nav} />
        <select
          value={ship.nav?.flightMode || "CRUISE"}
          disabled={anyMutating || !hasControl}
          onChange={(e) => flightModeMutation.mutate(e.target.value)}
        >
          {FLIGHT_MODES.map((mode) => (
            <option key={mode} value={mode}>
              {mode}
            </option>
          ))}
        </select>
      </div>

      <div className="lcars-ship-detail__stats">
        <span>FUEL {ship.fuel?.current}/{ship.fuel?.capacity}</span>
        <span>
          CARGO {cargo?.units ?? ship.cargo?.units}/{cargo?.capacity ?? ship.cargo?.capacity}
        </span>
      </div>

      <div className="lcars-ship-detail__actions">
        <PillButton
          accent="blue"
          disabled={!isDocked || anyMutating || !hasControl}
          onClick={() => orbitMutation.mutate()}
        >
          Orbit
        </PillButton>
        <PillButton
          accent="green"
          disabled={!isOrbiting || anyMutating || !hasControl}
          onClick={() => dockMutation.mutate()}
        >
          Dock
        </PillButton>
        <PillButton
          accent="orange"
          disabled={!isDocked || anyMutating || ship.fuel?.capacity === 0 || !hasControl}
          title={ship.fuel?.capacity === 0 ? "This ship has no fuel tank" : undefined}
          onClick={() => refuelMutation.mutate()}
        >
          Refuel
        </PillButton>
      </div>

      <NavigatePicker
        token={token}
        systemSymbol={ship.nav?.systemSymbol}
        disabled={!isOrbiting || anyMutating || !hasControl}
        isNavigating={navigateMutation.isPending}
        onNavigate={(waypointSymbol) => navigateMutation.mutate(waypointSymbol)}
      />

      <div className="lcars-ship-detail__actions">
        <PillButton
          accent="tan"
          disabled={!isOrbiting || hasCooldown || anyMutating || !hasControl}
          onClick={() => surveyMutation.mutate()}
        >
          Survey
        </PillButton>
        <PillButton
          accent="violet"
          disabled={!isOrbiting || hasCooldown || anyMutating || !hasControl}
          onClick={() => extractMutation.mutate()}
        >
          Extract
        </PillButton>
      </div>

      <SurveyList
        surveys={surveys}
        disabled={!isOrbiting || hasCooldown || anyMutating || !hasControl}
        onExtract={(survey) => extractSurveyMutation.mutate(survey)}
      />

      <h3 className="lcars-ship-detail__subheading">Cargo</h3>
      <CargoList
        cargo={cargo}
        docked={isDocked}
        hasMarketplace={hasMarketplace}
        currentWaypointSymbol={ship.nav?.waypointSymbol}
        contracts={contracts}
        otherShipsAtWaypoint={otherShipsAtWaypoint}
        busy={anyMutating || !hasControl}
        onSell={(symbol, units) => sellMutation.mutate({ symbol, units })}
        onDeliver={(contractId, symbol, units) =>
          deliverMutation.mutate({ contractId, symbol, units })
        }
        onTransfer={(targetShipSymbol, symbol, units) =>
          transferMutation.mutate({ targetShipSymbol, symbol, units })
        }
      />

      {isDocked && hasMarketplace && (
        <>
          <h3 className="lcars-ship-detail__subheading">Market</h3>
          <MarketList
            market={market}
            docked={isDocked}
            credits={agent?.credits}
            busy={anyMutating || !hasControl}
            onBuy={(symbol, units) => purchaseMutation.mutate({ symbol, units })}
          />
        </>
      )}
    </Panel>
  );
}
