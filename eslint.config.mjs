import { react } from "@v-m-pioneer-trading/eslint-config/react";

// .claude/worktrees/ holds heinzelwerk task worktrees, each a full checkout of this repo (V-M-Pioneer-Trading/meta#120).
export default react({
  tsconfigRootDir: import.meta.dirname,
  ignores: [".claude/worktrees/", "lcars-reference-files/"],
});
