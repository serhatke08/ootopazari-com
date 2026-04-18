#!/usr/bin/env node
/**
 * Değişiklikleri stage eder, commit eder, origin'e push eder.
 *
 * Manuel: npm run git:sync -- "commit mesajı"
 * Cursor:  `stop` hook → `node scripts/git-sync.mjs --hook`
 *
 * Hook modunda push hatası Cursor'u bloklamasın diye çıkış kodu 0 kalır.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const hookMode = process.argv.includes("--hook");
const args = process.argv.slice(2).filter((a) => a !== "--hook");

if (hookMode) {
  try {
    readFileSync(0, "utf8");
  } catch {
    /* stdin yok / boş */
  }
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(cmd, stdio = ["ignore", "inherit", "inherit"]) {
  execSync(cmd, { cwd: root, stdio });
}

function runSilent(cmd) {
  return execSync(cmd, { cwd: root, stdio: "pipe", encoding: "utf8" });
}

try {
  runSilent("git rev-parse --is-inside-work-tree");
} catch {
  if (hookMode) process.stdout.write("{}\n");
  process.exit(0);
}

try {
  runSilent("git remote get-url origin");
} catch {
  console.error("[git-sync] origin remote yok, push atlandı.");
  if (hookMode) process.stdout.write("{}\n");
  process.exit(0);
}

const msg =
  args.join(" ").trim() ||
  `chore: otomatik senkronizasyon ${new Date().toISOString()}`;

const porcelain = runSilent("git status --porcelain").trim();
if (porcelain) {
  run("git add -A", ["ignore", "pipe", "inherit"]);
  try {
    run(`git commit -m ${JSON.stringify(msg)}`, ["ignore", "pipe", "inherit"]);
  } catch {
    /* commit gerekmedi veya boş */
  }
}

try {
  run("git push origin HEAD", ["ignore", "pipe", "inherit"]);
} catch (e) {
  console.error("[git-sync] push başarısız:", e?.message ?? e);
  if (!hookMode) process.exit(1);
}

if (hookMode) {
  process.stdout.write("{}\n");
}
