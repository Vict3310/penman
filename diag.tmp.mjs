import puppeteer from "puppeteer-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3311";

const browser = await puppeteer.launch({
  executablePath: "/usr/bin/google-chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

// Count how many times each observer-style setup runs, by watching for side effects.
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
await new Promise((r) => setTimeout(r, 2500));

async function inspect(label) {
  const s = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll("[data-reveal], [data-panel-img]"));
    const inView = nodes.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.top < innerHeight && r.bottom > 0 && r.width > 0;
    });
    return {
      path: location.pathname,
      inViewCount: inView.length,
      rows: inView.map((el) => ({
        tag: el.tagName,
        isIn: el.classList.contains("is-in"),
        bound: el.dataset.revealBound ?? "(none)",
        opacity: getComputedStyle(el).opacity,
        cls: el.className.toString().slice(0, 60),
      })),
    };
  });
  console.log(`\n--- ${label} (path ${s.path}, ${s.inViewCount} in view) ---`);
  for (const r of s.rows) {
    console.log(
      `  ${r.tag.padEnd(4)} isIn=${String(r.isIn).padEnd(5)} bound=${String(r.bound).padEnd(6)} opacity=${r.opacity.padEnd(4)} :: ${r.cls}`,
    );
  }
  return s;
}

await inspect("first load");

await page.evaluate(() => {
  const link = document.querySelector('header a[href="/rental"], nav a[href="/rental"]');
  link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
});
await page.waitForFunction(() => location.pathname === "/rental", { timeout: 15000 });

console.log("\n>>> right after navigation commit:");
await inspect("immediately");

await new Promise((r) => setTimeout(r, 3000));
await inspect("after 3s");

await browser.close();
