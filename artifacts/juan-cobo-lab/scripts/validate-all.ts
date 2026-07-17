#!/usr/bin/env tsx
/**
 * scripts/validate-all.ts — HELIOS unified validation runner (S-017)
 *
 * Runs all suites sequentially, continues on failure for a complete
 * diagnostic picture, then prints a summary table.
 *
 * Exit 0  → all suites passed
 * Exit 1  → one or more suites failed
 *
 * Usage:
 *   pnpm run validate
 *   pnpm run validate -- --verbose   (show full output from every suite)
 */

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");
const verbose = process.argv.includes("--verbose");

// ─── ANSI helpers ─────────────────────────────────────────────────────────────
const C = {
  reset: "\x1b[0m",
  bold:  "\x1b[1m",
  dim:   "\x1b[2m",
  green: "\x1b[32m",
  red:   "\x1b[31m",
  yellow:"\x1b[33m",
};

// ─── Suite definitions ────────────────────────────────────────────────────────

interface Suite {
  name: string;
  cmd: string;
  args: string[];
}

const suites: Suite[] = [
  {
    name: "Typecheck",
    cmd: "pnpm",
    args: ["exec", "tsc", "-p", "tsconfig.json", "--noEmit"],
  },
  {
    name: "S-012",
    cmd: "pnpm",
    args: ["exec", "tsx", "src/thinking/__tests__/validacion_s012.ts"],
  },
  {
    name: "S-013",
    cmd: "pnpm",
    args: ["exec", "tsx", "src/thinking/__tests__/validacion_s013.ts"],
  },
  {
    name: "S-014",
    cmd: "pnpm",
    args: ["exec", "tsx", "src/thinking/__tests__/validacion_s014.ts"],
  },
  {
    name: "S-015",
    cmd: "pnpm",
    args: ["exec", "tsx", "src/hypothesis/__tests__/validacion_s015.ts"],
  },
  {
    name: "S-016",
    cmd: "pnpm",
    args: ["exec", "tsx", "src/hypothesis/__tests__/validacion_s016.ts"],
  },
  {
    name: "S-017",
    cmd: "pnpm",
    args: ["exec", "tsx", "src/conceptual/__tests__/validacion_s017.ts"],
  },
  {
    name: "S-018",
    cmd: "pnpm",
    args: ["exec", "tsx", "src/operationalization/__tests__/validacion_s018.ts"],
  },
  {
    name: "S-019",
    cmd: "pnpm",
    args: ["exec", "tsx", "src/contrastation/__tests__/validacion_s019.ts"],
  },
  {
    name: "S-020",
    cmd: "pnpm",
    args: ["exec", "tsx", "src/knowledge-graph/__tests__/validacion_s020.ts"],
  },
  {
    name: "S-021",
    cmd: "pnpm",
    args: ["exec", "tsx", "src/methodological-consistency/__tests__/validacion_s021.ts"],
  },
  {
    name: "Smoke",
    cmd: "pnpm",
    args: ["exec", "tsx", "src/thinking/__tests__/smoke.ts"],
  },
  {
    name: "Integration",
    cmd: "pnpm",
    args: ["exec", "tsx", "src/thinking/__tests__/integration_flow.ts"],
  },
  {
    name: "Build",
    cmd: "pnpm",
    args: ["exec", "vite", "build", "--config", "vite.config.ts"],
  },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

type Status = "PASS" | "FAIL";

interface Result {
  name: string;
  status: Status;
  stdout: string;
  stderr: string;
}

const results: Result[] = [];

console.log(
  `\n${C.bold}HELIOS — Validation Suite${C.reset}  ${C.dim}(S-021)${C.reset}\n` +
  "─".repeat(44) + "\n"
);

for (const suite of suites) {
  process.stdout.write(`  ${suite.name.padEnd(14)}  `);

  const r = spawnSync(suite.cmd, suite.args, {
    cwd: root,
    encoding: "utf-8",
    env: { ...process.env },
    maxBuffer: 10 * 1024 * 1024,
  });

  const ok = (r.status ?? 1) === 0;
  const status: Status = ok ? "PASS" : "FAIL";
  const stdout = r.stdout ?? "";
  const stderr = r.stderr ?? "";

  results.push({ name: suite.name, status, stdout, stderr });

  console.log(ok ? `${C.green}PASS${C.reset}` : `${C.red}FAIL${C.reset}`);

  // Always show output for failures; show all for --verbose
  if (!ok || verbose) {
    const combined = stdout + stderr;
    const lines = combined.trim().split("\n").filter(Boolean);
    // In non-verbose mode cap at last 20 lines so failures are still readable
    const show = verbose ? lines : lines.slice(-20);
    if (!verbose && show.length < lines.length) {
      console.log(
        `${C.dim}    … (${lines.length - show.length} lines hidden; run --verbose for full output)${C.reset}`
      );
    }
    for (const line of show) {
      console.log(`    ${C.dim}${line}${C.reset}`);
    }
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────

const passed = results.filter((r) => r.status === "PASS").length;
const total  = results.length;
const allOk  = passed === total;
const nameW  = Math.max(...results.map((r) => r.name.length)) + 2;

console.log("\n" + "─".repeat(44));
console.log(`${C.bold}HELIOS validation summary${C.reset}\n`);
for (const r of results) {
  const badge = r.status === "PASS"
    ? `${C.green}PASS${C.reset}`
    : `${C.red}FAIL${C.reset}`;
  console.log(`  ${r.name.padEnd(nameW)}  ${badge}`);
}
console.log(
  `\n  Result: ${allOk ? C.green : C.red}${passed}/${total} suites passed${C.reset}\n`
);

process.exit(allOk ? 0 : 1);
