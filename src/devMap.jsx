// Dev-only harness: renders SystemMap against stubbed backend responses so the
// map can be worked on without a live SpaceTraders token. Not part of the app
// build (Vite only bundles index.html); reachable at /dev-map.html in dev.
//
// The generated system deliberately mirrors the density of a real one
// (X1-DT69: 93 waypoints, 58 of them asteroids, 7 planets with co-located
// orbitals) because that density is what surfaces layout and hit-testing bugs
// a small mock never will.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AlertProvider } from "./context/AlertContext";
import { OperatorContext } from "./context/OperatorContext";
import { SelectionProvider } from "./context/SelectionContext";
import { mulberry32 } from "./map/rand";
import { SystemMap } from "./components/map/SystemMap";
import "./styles/fonts.css";
import "./styles/theme.css";
import "./styles/global.css";

const trait = (symbol) => ({ symbol });

function buildSystem() {
  // Deterministic, so the harness renders the same system every reload.
  const rand = mulberry32(20260809);
  const wps = [];
  const push = (w) => {
    wps.push({ traits: [], ...w });
    return w.symbol;
  };

  // 7 planets, each with 0-4 co-located orbitals.
  const ORBITAL_TYPES = ["MOON", "MOON", "MOON", "ORBITAL_STATION", "FUEL_STATION"];
  for (let p = 0; p < 7; p += 1) {
    const angle = (p / 7) * Math.PI * 2 + rand() * 0.4;
    const dist = 90 + rand() * 260;
    const x = Math.round(Math.cos(angle) * dist);
    const y = Math.round(Math.sin(angle) * dist);
    const traits = [];
    if (p % 2 === 0) traits.push(trait("MARKETPLACE"));
    if (p === 1 || p === 4) traits.push(trait("SHIPYARD"));
    const parent = push({
      symbol: `X1-DV-P${p}`,
      type: p === 3 ? "GAS_GIANT" : "PLANET",
      x,
      y,
      traits,
    });
    const kids = Math.floor(rand() * 5);
    for (let k = 0; k < kids; k += 1) {
      push({
        symbol: `X1-DV-P${p}M${k}`,
        type: ORBITAL_TYPES[Math.floor(rand() * ORBITAL_TYPES.length)],
        x,
        y,
        orbits: parent,
        traits: rand() > 0.7 ? [trait("MARKETPLACE")] : [],
      });
    }
  }

  // A dense belt of 58 asteroids — the case that never got tested before.
  for (let i = 0; i < 58; i += 1) {
    const angle = rand() * Math.PI * 2;
    const dist = 300 + rand() * 140;
    push({
      symbol: `X1-DV-A${i}`,
      type: i === 0 ? "ENGINEERED_ASTEROID" : i < 3 ? "ASTEROID_BASE" : "ASTEROID",
      x: Math.round(Math.cos(angle) * dist),
      y: Math.round(Math.sin(angle) * dist),
      traits: i < 3 ? [trait("MARKETPLACE")] : [],
    });
  }

  push({ symbol: "X1-DV-J1", type: "JUMP_GATE", x: -420, y: 380, traits: [] });
  push({ symbol: "X1-DV-N1", type: "NEBULA", x: 430, y: -350, traits: [] });
  push({ symbol: "X1-DV-D1", type: "DEBRIS_FIELD", x: -80, y: 460, traits: [] });
  push({
    symbol: "X1-DV-G1",
    type: "GRAVITY_WELL",
    x: 380,
    y: 300,
    traits: [],
    isUnderConstruction: true,
  });
  return wps;
}

const WAYPOINTS = buildSystem();

const ship = (symbol, frame, role, nav) => ({
  symbol,
  frame: { symbol: frame, name: frame.replace("FRAME_", "") },
  registration: { role },
  fuel: { current: 319, capacity: 400 },
  cargo: { units: 12, capacity: 40 },
  nav: { systemSymbol: "X1-DV", flightMode: "CRUISE", ...nav },
});

// Several ships parked on the *same* waypoints as bodies, which is the normal
// case in the real app and the thing most likely to steal a click.
const SHIPS = [
  ship("VNM-1", "FRAME_FRIGATE", "COMMAND", { status: "DOCKED", waypointSymbol: "X1-DV-P0" }),
  ship("VNM-2", "FRAME_PROBE", "SATELLITE", { status: "IN_ORBIT", waypointSymbol: "X1-DV-P0" }),
  ship("VNM-3", "FRAME_MINER", "EXCAVATOR", { status: "IN_ORBIT", waypointSymbol: "X1-DV-P0" }),
  ship("VNM-4", "FRAME_DRONE", "SURVEYOR", { status: "IN_ORBIT", waypointSymbol: "X1-DV-A4" }),
  ship("VNM-5", "FRAME_HEAVY_FREIGHTER", "HAULER", {
    status: "IN_TRANSIT",
    waypointSymbol: "X1-DV-P2",
    route: {
      origin: { symbol: "X1-DV-P0" },
      destination: { symbol: "X1-DV-P2" },
      departureTime: new Date(Date.now() - 8_000).toISOString(),
      arrival: new Date(Date.now() + 92_000).toISOString(),
    },
  }),
];

const originalFetch = window.fetch;
window.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input.url;
  const json = (body) =>
    new Response(JSON.stringify(body), { headers: { "Content-Type": "application/json" } });
  if (url.includes("/waypoints")) return json({ data: WAYPOINTS, total: WAYPOINTS.length });
  if (url.includes("/ships")) return json(SHIPS);
  if (url.includes("/agent")) return json({ credits: 500000, headquarters: "X1-DV-P0" });
  return originalFetch(input, init);
};

// The harness runs with no Clerk instance, so it supplies the operator context
// itself. `useOperator` outside a provider reports a signed-out observer, and
// the gated reads (ships among them) would never fire — the whole point of this
// page is ships on a dense map. There is no ClerkProvider to nest under: this
// is also why the operator context exists at all, since Clerk's own `useAuth`
// throws outside its provider and used to take this page down on render.
const DEV_OPERATOR = {
  isLoaded: true,
  isSignedIn: true,
  signOut: async () => {},
  getToken: async () => "dev-operator-token",
  can: () => true,
};

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <OperatorContext.Provider value={DEV_OPERATOR}>
      <QueryClientProvider client={new QueryClient()}>
        <AlertProvider>
          <>
            <SelectionProvider>
              <div style={{ height: "100vh", padding: "1rem", background: "var(--lcars-bg)" }}>
                <SystemMap systemSymbol="X1-DV" />
              </div>
            </SelectionProvider>
          </>
        </AlertProvider>
      </QueryClientProvider>
    </OperatorContext.Provider>
  </StrictMode>,
);
