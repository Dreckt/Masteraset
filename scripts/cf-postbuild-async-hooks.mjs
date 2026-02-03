// scripts/cf-postbuild-async-hooks.mjs
import fs from "node:fs";
import path from "node:path";

function exists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function walk(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) stack.push(p);
      else out.push(p);
    }
  }
  return out;
}

const root = process.cwd();
const functionsRoot = path.join(
  root,
  ".vercel",
  "output",
  "static",
  "_worker.js",
  "__next-on-pages-dist__",
  "functions"
);

if (!exists(functionsRoot)) {
  console.error("ERROR: functionsRoot not found:", functionsRoot);
  process.exit(1);
}

// The canonical shim (when it exists) is usually here:
const canonicalShim = path.join(functionsRoot, "async_hooks.js");

// Fallback shim content if the canonical shim isn't present for some reason
const fallbackShimContent = `export * from "node:async_hooks";\n`;

let shimSourcePath = null;
let shimSourceContent = null;

if (exists(canonicalShim)) {
  shimSourcePath = canonicalShim;
} else {
  shimSourceContent = fallbackShimContent;
}

const files = walk(functionsRoot).filter((f) => f.endsWith(".js"));

let copied = 0;
let touchedDirs = new Set();

for (const f of files) {
  let content = "";
  try {
    content = fs.readFileSync(f, "utf8");
  } catch {
    continue;
  }

  // Look for imports like "./async_hooks" or "async_hooks" in generated function bundles
  const needsShim =
    content.includes('"/async_hooks"') ||
    content.includes("'./async_hooks'") ||
    content.includes('"./async_hooks"') ||
    content.includes("async_hooks") && content.includes("__next-on-pages-dist__/functions");

  if (!needsShim) continue;

  const dir = path.dirname(f);
  const targetShim = path.join(dir, "async_hooks.js");

  if (exists(targetShim)) continue;

  try {
    if (shimSourcePath) {
      fs.copyFileSync(shimSourcePath, targetShim);
    } else {
      fs.writeFileSync(targetShim, shimSourceContent, "utf8");
    }
    copied++;
    touchedDirs.add(dir);
  } catch (e) {
    console.error("Failed to place shim in:", dir, e?.message || e);
  }
}

console.log(
  `cf-postbuild-async-hooks: placed ${copied} shim file(s) in ${touchedDirs.size} directorie(s).`
);
