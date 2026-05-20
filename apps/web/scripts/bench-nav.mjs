/**
 * Server response + simulated in-app navigations (fetch + RSC flight).
 * Usage: node scripts/bench-nav.mjs [baseUrl] [--label name]
 */
const base = process.argv[2] ?? "http://127.0.0.1:3000";
const labelArg = process.argv.indexOf("--label");
const label = labelArg >= 0 ? process.argv[labelArg + 1] : "run";

const routes = [
  { name: "home", path: "/" },
  { name: "home-zh", path: "/zh" },
  { name: "search", path: "/search" },
  { name: "about", path: "/about" },
  { name: "subscribe", path: "/subscribe" },
];

const navSequences = [
  { name: "home→about→home", paths: ["/", "/about", "/"] },
  { name: "home→search→home", paths: ["/", "/search", "/"] },
  { name: "home→zh→home", paths: ["/", "/zh", "/"] },
];

async function medianFetch(path) {
  const url = `${base}${path}`;
  const runs = [];
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    const res = await fetch(url, { redirect: "follow" });
    await res.arrayBuffer();
    runs.push(performance.now() - start);
  }
  runs.sort((a, b) => a - b);
  return runs[2];
}

async function medianSequence(paths) {
  const runs = [];
  for (let i = 0; i < 3; i++) {
    const start = performance.now();
    for (const path of paths) {
      const res = await fetch(`${base}${path}`, { redirect: "follow" });
      await res.arrayBuffer();
    }
    runs.push(performance.now() - start);
  }
  runs.sort((a, b) => a - b);
  return runs[1];
}

async function main() {
  console.log(`\n=== ${label} @ ${base} ===`);

  console.log("\n-- cold-ish route median (5 runs) --");
  for (const r of routes) {
    try {
      const ms = await medianFetch(r.path);
      console.log(`${r.name.padEnd(14)} ${ms.toFixed(1)}ms`);
    } catch (err) {
      console.log(`${r.name.padEnd(14)} ERROR ${err}`);
    }
  }

  console.log("\n-- navigation sequence total (3 runs) --");
  for (const seq of navSequences) {
    try {
      const ms = await medianSequence(seq.paths);
      console.log(`${seq.name.padEnd(22)} ${ms.toFixed(1)}ms`);
    } catch (err) {
      console.log(`${seq.name.padEnd(22)} ERROR ${err}`);
    }
  }
}

main();
