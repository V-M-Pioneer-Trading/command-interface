import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelection } from "../../context/SelectionContext";
import { useAlerts } from "../../context/AlertContext";
import {
  useShipsQuery,
  useCooldownQuery,
  useCargoQuery,
  useSystemWaypointsQuery,
} from "../../hooks/queries";
import { fleetService } from "../../api/fleetService";
import { Panel } from "../common/Panel";
import { PillButton } from "../common/PillButton";
import { StatusPill } from "../common/StatusPill";
import { CooldownTimer } from "./CooldownTimer";
import { CargoList } from "./CargoList";
import { SurveyList } from "./SurveyList";
import { NavigatePicker } from "./NavigatePicker";
import "./ShipDetailPanel.css";

export function ShipDetailPanel({ token, contracts }) {
  const { selectedShipSymbol } = useSelection();
  const { data: ships } = useShipsQuery(token);
  const ship = ships?.find((s) => s.symbol === selectedShipSymbol);

  const { data: cooldownResp } = useCooldownQuery(token, selectedShipSymbol);
  const { data: cargo } = useCargoQuery(token, selectedShipSymbol);
  const { data: waypointData } = useSystemWaypointsQuery(token, ship?.nav?.systemSymbol);
  const cooldown = cooldownResp?.data;

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
    mutationFn: () => fleetService.orbit(token, selectedShipSymbol),
    onSuccess: invalidateShip,
    onError: onActionError,
  });
  const dockMutation = useMutation({
    mutationFn: () => fleetService.dock(token, selectedShipSymbol),
    onSuccess: invalidateShip,
    onError: onActionError,
  });
  const navigateMutation = useMutation({
    mutationFn: (waypointSymbol) =>
      fleetService.navigate(token, selectedShipSymbol, waypointSymbol),
    onSuccess: invalidateShip,
    onError: onActionError,
  });
  const refuelMutation = useMutation({
    mutationFn: () => fleetService.refuel(token, selectedShipSymbol),
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
    mutationFn: () => fleetService.extract(token, selectedShipSymbol),
    onSuccess: invalidateShip,
    onError: onActionError,
  });
  const extractSurveyMutation = useMutation({
    mutationFn: (survey) => fleetService.extractWithSurvey(token, selectedShipSymbol, survey),
    onSuccess: invalidateShip,
    onError: onActionError,
  });
  const sellMutation = useMutation({
    mutationFn: ({ symbol, units }) => fleetService.sell(token, selectedShipSymbol, symbol, units),
    onSuccess: () => {
      invalidateShip();
      queryClient.invalidateQueries({ queryKey: ["agent", token] });
    },
    onError: onActionError,
  });
  const deliverMutation = useMutation({
    mutationFn: ({ contractId, symbol, units }) =>
      fleetService.deliverContract(token, contractId, selectedShipSymbol, symbol, units),
    onSuccess: () => {
      invalidateShip();
      queryClient.invalidateQueries({ queryKey: ["contracts", token] });
    },
    onError: (err) => pushAlert(err.message || "Delivery failed"),
  });
  const surveyMutation = useMutation({
    mutationFn: () => fleetService.survey(token, selectedShipSymbol),
    onSuccess: (data) => {
      setSurveys((prev) => [...prev, ...(data?.data?.surveys || [])]);
      invalidateShip();
    },
    onError: (err) => pushAlert(err.message || "Survey failed"),
  });

  if (!selectedShipSymbol || !ship) {
    return (
      <Panel title="Ship Detail" accent="tan" className="lcars-ship-detail">
        <div className="lcars-ship-detail__empty">Select a ship from the fleet list</div>
      </Panel>
    );
  }

  const status = ship.nav?.status;
  const hasCooldown = !!cooldown && new Date(cooldown.expiration).getTime() > Date.now();
  const isDocked = status === "DOCKED";
  const isOrbiting = status === "IN_ORBIT";
  const currentWaypoint = waypointData?.data?.find((w) => w.symbol === ship.nav?.waypointSymbol);
  const hasMarketplace = !!currentWaypoint?.traits?.some((t) => t.symbol === "MARKETPLACE");
  const anyMutating =
    orbitMutation.isPending ||
    dockMutation.isPending ||
    navigateMutation.isPending ||
    refuelMutation.isPending ||
    extractMutation.isPending ||
    extractSurveyMutation.isPending ||
    surveyMutation.isPending ||
    sellMutation.isPending ||
    deliverMutation.isPending;

  return (
    <Panel title={ship.symbol} accent="tan" className="lcars-ship-detail">
      <div className="lcars-ship-detail__status-row">
        <StatusPill status={status} />
        <span>{ship.nav?.waypointSymbol}</span>
        <CooldownTimer cooldown={cooldown} />
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
          disabled={!isDocked || anyMutating}
          onClick={() => orbitMutation.mutate()}
        >
          Orbit
        </PillButton>
        <PillButton
          accent="green"
          disabled={!isOrbiting || anyMutating}
          onClick={() => dockMutation.mutate()}
        >
          Dock
        </PillButton>
        <PillButton
          accent="orange"
          disabled={!isDocked || anyMutating || ship.fuel?.capacity === 0}
          title={ship.fuel?.capacity === 0 ? "This ship has no fuel tank" : undefined}
          onClick={() => refuelMutation.mutate()}
        >
          Refuel
        </PillButton>
      </div>

      <NavigatePicker
        token={token}
        systemSymbol={ship.nav?.systemSymbol}
        disabled={!isOrbiting || anyMutating}
        isNavigating={navigateMutation.isPending}
        onNavigate={(waypointSymbol) => navigateMutation.mutate(waypointSymbol)}
      />

      <div className="lcars-ship-detail__actions">
        <PillButton
          accent="tan"
          disabled={!isOrbiting || hasCooldown || anyMutating}
          onClick={() => surveyMutation.mutate()}
        >
          Survey
        </PillButton>
        <PillButton
          accent="violet"
          disabled={!isOrbiting || hasCooldown || anyMutating}
          onClick={() => extractMutation.mutate()}
        >
          Extract
        </PillButton>
      </div>

      <SurveyList
        surveys={surveys}
        disabled={!isOrbiting || hasCooldown || anyMutating}
        onExtract={(survey) => extractSurveyMutation.mutate(survey)}
      />

      <h3 className="lcars-ship-detail__subheading">Cargo</h3>
      <CargoList
        cargo={cargo}
        docked={isDocked}
        hasMarketplace={hasMarketplace}
        currentWaypointSymbol={ship.nav?.waypointSymbol}
        contracts={contracts}
        busy={anyMutating}
        onSell={(symbol, units) => sellMutation.mutate({ symbol, units })}
        onDeliver={(contractId, symbol, units) =>
          deliverMutation.mutate({ contractId, symbol, units })
        }
      />
    </Panel>
  );
}
