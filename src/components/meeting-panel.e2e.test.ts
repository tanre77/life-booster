import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import tailwindcss from "@tailwindcss/vite";
import { createServer as createViteServer } from "vite";

const root = fileURLToPath(new URL("../..", import.meta.url));
const src = join(root, "src");

describe("meeting panel component", () => {
  it(
    "saves a provider choice and creates fallback, pasted, and practice links",
    { timeout: 120_000 },
    async () => {
    const vite = await createViteServer({
      configFile: false,
      root,
      appType: "custom",
      logLevel: "error",
      plugins: [tailwindcss()],
      resolve: { alias: { "@": src } },
      // Vite still forwards this to esbuild; the public ESBuildOptions type omits jsx.
      esbuild: { jsx: "automatic" } as import("vite").ESBuildOptions,
      server: { middlewareMode: true },
    });
      const server = createServer((req, res) => {
        const path = (req.url ?? "/").split("?", 1)[0];
        if (path === "/" || path === "/index.html") {
          res.setHeader("content-type", "text/html; charset=utf-8");
          res.end(`<!doctype html>
          <html lang="en">
            <head>
              <meta charset="utf-8" />
              <meta name="viewport" content="width=device-width, initial-scale=1" />
            </head>
            <body>
              <div id="root"></div>
              <script type="module" src="/src/components/meeting-harness.tsx"></script>
            </body>
          </html>`);
          return;
        }
        vite.middlewares(req, res, () => {
          res.statusCode = 404;
          res.end("not found");
        });
      });
      const errors: string[] = [];
      let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
      try {
        await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
        const address = server.address();
        if (!address || typeof address === "string") throw new Error("No port");
        browser = await chromium.launch({ headless: true });
        const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
        page.on("pageerror", (error) => errors.push(String(error)));
        page.on("console", (message) => {
          if (message.type() === "error") errors.push(message.text());
        });
        await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: "domcontentloaded" });
        await page.getByRole("heading", { name: "Video meetings" }).waitFor();
        const zoom = page.getByRole("radio", { name: "Zoom" });
        const meet = page.getByRole("radio", { name: "Google Meet" });
        await meet.click();
        assert.equal(await meet.getAttribute("aria-checked"), "true");
        await zoom.click();
        assert.equal(await zoom.getAttribute("aria-checked"), "true");
        assert.equal(await meet.getAttribute("aria-checked"), "false");

        await page.getByLabel("Zoom link").fill("https://example.com/not-a-meeting");
        await page.getByRole("button", { name: "Use pasted link" }).click();
        await page.getByText("Paste a full Zoom link").waitFor();

        await page.getByRole("button", { name: "Instant meeting" }).click();
        const instant = page.getByRole("link", { name: "Open Zoom" });
        await instant.waitFor();
        assert.equal(await instant.getAttribute("href"), "https://zoom.us/start/videomeeting");
        mkdirSync(join(root, "screenshots"), { recursive: true });
        mkdirSync("/opt/cursor/artifacts/screenshots", { recursive: true });
        await page.screenshot({
          path: "/opt/cursor/artifacts/screenshots/counselor-meeting-zoom.png",
          fullPage: true,
        });

        await meet.click();
        await page.getByLabel("Google Meet link").fill("https://meet.google.com/abc-defg-hij");
        await page.getByRole("button", { name: "Use pasted link" }).click();
        const pasted = page.getByRole("link", { name: "Open Google Meet" });
        await pasted.waitFor();
        assert.equal(await pasted.getAttribute("href"), "https://meet.google.com/abc-defg-hij");

        await page.getByRole("button", { name: "Practice mode off" }).click();
        await page.getByRole("button", { name: "Create practice link" }).click();
        const practice = page.getByRole("link", { name: "Open Google Meet" });
        await practice.waitFor();
        assert.match(
          (await practice.getAttribute("href")) ?? "",
          /^https:\/\/meet\.google\.com\/demo-/,
        );
        await page.getByText("Practice link").waitFor();
        await page.screenshot({
          path: "/opt/cursor/artifacts/screenshots/counselor-meeting-practice.png",
          fullPage: true,
        });

        await page.setViewportSize({ width: 390, height: 844 });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        );
        assert.equal(overflow, false);
        await page.screenshot({
          path: "/opt/cursor/artifacts/screenshots/counselor-meeting-mobile.png",
          fullPage: true,
        });
        assert.deepEqual(errors, []);
      } finally {
        await browser?.close();
        await new Promise<void>((resolve) => server.close(() => resolve()));
        await vite.close();
      }
    },
  );
});
