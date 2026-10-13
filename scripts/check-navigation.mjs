/**
 * Browser regression check.
 *
 * Verifies the behaviour a user actually experiences: clicking between pages
 * with client-side routing must leave the new page's content VISIBLE.
 *
 * This exists because the reveal animation starts elements at `opacity: 0`.
 * When the motion component lived in the root layout — which Next.js keeps
 * alive across navigations — its one-shot effect never observed the elements
 * of subsequently visited pages, so everything stayed invisible until a hard
 * reload. That is a regression only a real browser can catch.
 *
 * Usage:  npm run check:browser        (expects a server on $BASE_URL)
 *         BASE_URL=https://… npm run check:browser
 */
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/opt/google/chrome/chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
].filter(Boolean);

const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!executablePath) {
  console.error("No Chrome/Chromium found. Set CHROME_PATH to your browser binary.");
  process.exit(2);
}

const failures = [];
let checks = 0;

function check(label, ok, detail = "") {
  checks += 1;
  console.log(`  ${ok ? "✓" : "✗"} ${label}${ok || !detail ? "" : ` — ${detail}`}`);
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
}

/** Every reveal element intersecting the viewport must actually be visible. */
async function inViewTransparency(page) {
  return page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll("[data-reveal], [data-panel-img]"));
    const inView = nodes.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0 && r.width > 0 && r.height > 0;
    });
    const hidden = inView.filter((el) => Number(getComputedStyle(el).opacity) < 0.99);
    return { inView: inView.length, hidden: hidden.length };
  });
}

/** Click a link in the header nav to trigger a client-side transition. */
async function clickNav(page, href) {
  const before = page.url();
  const clicked = await page.evaluate((target) => {
    const link = document.querySelector(`header a[href="${target}"], nav a[href="${target}"]`);
    if (!link) return false;
    link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
    return true;
  }, href);
  if (!clicked) return false;

  await page.waitForFunction((target) => window.location.pathname === target, { timeout: 15000 }, href);
  void before;
  return true;
}

/**
 * Poll until every reveal element intersecting the viewport is visible.
 * Polling (rather than a fixed sleep) keeps the check fast when it passes and
 * still fails deterministically when content never reveals — which is the bug
 * this script exists to catch.
 */
async function waitForReveal(page, timeout = 8000) {
  try {
    await page.waitForFunction(
      () => {
        const nodes = Array.from(document.querySelectorAll("[data-reveal], [data-panel-img]"));
        const inView = nodes.filter((el) => {
          const r = el.getBoundingClientRect();
          return r.top < window.innerHeight && r.bottom > 0 && r.width > 0 && r.height > 0;
        });
        return inView.length > 0 && inView.every((el) => Number(getComputedStyle(el).opacity) > 0.99);
      },
      { timeout },
    );
    return true;
  } catch {
    return false;
  }
}

const browser = await puppeteer.launch({
  executablePath,
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  const homeRevealed = await waitForReveal(page, 12000);

  console.log("\nFirst load");
  const home = await inViewTransparency(page);
  check(
    `home: reveal elements in view are visible (${home.inView} in view, ${home.hidden} hidden)`,
    homeRevealed && home.hidden === 0,
  );
  check("home: featured listing text rendered", (await page.content()).includes("DEMO]"));

  console.log("\nClient-side navigation (no reload)");
  const routes = [
    { href: "/rental", expect: "vehicles" },
    { href: "/real-estate", expect: "listings" },
    { href: "/shop", expect: "products" },
    { href: "/about", expect: "Penman" },
  ];

  for (const route of routes) {
    const navigated = await clickNav(page, route.href);
    if (!navigated) {
      check(`${route.href}: nav link found and clicked`, false, "no matching link in header");
      continue;
    }

    const revealed = await waitForReveal(page);
    const state = await inViewTransparency(page);
    check(
      `${route.href}: content visible after client-side nav (${state.inView} in view, ${state.hidden} hidden)`,
      revealed && state.hidden === 0,
      state.hidden > 0 ? `${state.hidden} element(s) stuck transparent` : "",
    );

    const body = await page.content();
    const hasContent = /rental|real-estate/.test(route.href)
      ? body.includes("Showing")
      : route.href === "/shop"
        ? body.includes("Showing")
        : body.includes("Penman Empire");
    check(`${route.href}: page body rendered expected content`, hasContent);
  }

  console.log("\nBrowser back/forward");
  await page.goBack({ waitUntil: "domcontentloaded" });
  const backRevealed = await waitForReveal(page);
  const back = await inViewTransparency(page);
  check(
    `back navigation: content visible (${back.inView} in view, ${back.hidden} hidden)`,
    backRevealed && back.hidden === 0,
  );

  console.log("\nDocument attributes");
  const scrollBehaviour = await page.evaluate(
    () => document.documentElement.getAttribute("data-scroll-behavior"),
  );
  check('html has data-scroll-behavior="smooth"', scrollBehaviour === "smooth", String(scrollBehaviour));
} finally {
  await browser.close();
}

console.log(`\n${checks - failures.length}/${checks} browser checks passed`);
if (failures.length > 0) {
  console.error("\nFailures:");
  for (const f of failures) console.error(`  • ${f}`);
  process.exit(1);
}
console.log("Browser navigation check passed.\n");
