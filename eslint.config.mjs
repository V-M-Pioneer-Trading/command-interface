import { react } from "@v-m-pioneer-trading/eslint-config/react";

export default react({
  tsconfigRootDir: import.meta.dirname,
  // .claude/worktrees/ holds agent task worktrees: full checkouts of this repo, linted in their own run.
  ignores: ["lcars-reference-files/", ".claude/worktrees/"],
});
