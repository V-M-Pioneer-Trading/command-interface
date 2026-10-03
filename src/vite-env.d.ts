/// <reference types="vite/client" />

// The build-time variables the app reads (see .env.example and the deploy
// workflow). Declared so `import.meta.env.VITE_*` is `string | undefined`
// rather than the `any` Vite's own index signature would give.
interface ImportMetaEnv {
  readonly VITE_AGENT_SERVICE_URL?: string;
  readonly VITE_NAVIGATION_SERVICE_URL?: string;
  readonly VITE_FLEET_SERVICE_URL?: string;
  readonly VITE_AUTOMATION_SERVICE_URL?: string;
  readonly VITE_AUTH_SERVICE_URL?: string;
  readonly VITE_ST_GATEWAY_URL?: string;
  readonly VITE_AI_SERVICE_URL?: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
