import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
async function savedTimer(
  page: import("@playwright/test").Page,
): Promise<number | null> {
  return page.evaluate(
    () =>
      new Promise<number | null>((resolve, reject) => {
        const open = indexedDB.open("strength-tracker", 2);
        open.onsuccess = () => {
          const db = open.result;
          const request = db
            .transaction("state")
            .objectStore("state")
            .get("current");
          request.onsuccess = () => {
            resolve(request.result.state.timerEnd);
            db.close();
          };
          request.onerror = () => {
            reject(request.error);
            db.close();
          };
        };
        open.onerror = () => reject(open.error);
      }),
  );
}
async function start(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start Workout A →", exact: true })
    .click();
}
test("logging survives refresh and template changes preserve history", async ({
  page,
}) => {
  await start(page);
  await page
    .getByRole("button", { name: "Barbell Back Squat set 1", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Barbell Back Squat set 1", exact: true }),
  ).toHaveClass("done");
  await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Complete & save", exact: true })
    .click();
  await expect(
    page.getByText("Workout complete ✓", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Program", exact: true }).click();
  await page
    .getByRole("button", { name: "Remove", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await page.getByText("View every set", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Barbell Back Squat", exact: true }),
  ).toBeVisible();
});
test("set-box taps reduce reps to zero, keep rest unchanged and retain the edit menu", async ({
  page,
}) => {
  await start(page);
  const set = page.getByRole("button", {
    name: "Barbell Back Squat set 1",
    exact: true,
  });
  await set.click();
  await expect(set.locator("strong")).toHaveText("5");
  const timer = await savedTimer(page);
  await set.click();
  await expect(set.locator("strong")).toHaveText("4");
  expect(await savedTimer(page)).toBe(timer);
  await page.reload();
  await expect(set.locator("strong")).toHaveText("4");
  for (let i = 0; i < 5; i++) await set.click();
  await expect(set.locator("strong")).toHaveText("0");
  expect(await savedTimer(page)).toBe(timer);
  const lift = page.locator("article").filter({
    has: page.getByRole("heading", {
      name: "Barbell Back Squat",
      exact: true,
    }),
  });
  await lift.getByText("Edit reps / load per set", { exact: true }).click();
  const form = lift.locator("form").first();
  await form.locator("input[name=reps]").fill("3");
  await form.getByRole("button", { name: "Log", exact: true }).click();
  await expect(set.locator("strong")).toHaveText("3");
});
test("timer stays below simulated iPhone safe area when scrolling and adjusts by 15 seconds", async ({
  page,
}) => {
  await start(page);
  await page.addStyleTag({ content: "html { --safe-area-top: 44px; }" });
  await page
    .getByRole("button", { name: "Barbell Back Squat set 1", exact: true })
    .click();
  const original = (await savedTimer(page))!;
  await page.getByRole("button", { name: "+15s", exact: true }).click();
  expect(await savedTimer(page)).toBe(original + 15000);
  await page.getByRole("button", { name: "−15s", exact: true }).click();
  expect(await savedTimer(page)).toBe(original);
  await page
    .getByRole("button", { name: "Skip exercise", exact: true })
    .last()
    .scrollIntoViewIfNeeded();
  const box = (await page.locator(".timer").boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(56);
  expect(box.y + box.height).toBeLessThan(720);
  await expect(
    page.getByRole("button", { name: "+15s", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/timer-safe-area.png" });
});
test("offline reload, logging and history work after service worker caching", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole("button", { name: "Start Workout A →", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Barbell Back Squat set 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Complete & save", exact: true })
    .click();
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Workout A", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("tab", { name: "Help", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Set up your program and working weights",
      exact: true,
    }),
  ).toBeVisible();
  await context.setOffline(false);
});
test("JSON export/import and invalid backup leave existing data intact", async ({
  page,
}, testInfo) => {
  await start(page);
  await page
    .getByRole("button", { name: "Barbell Back Squat set 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Generate JSON backup", exact: true })
    .click();
  const downloaded = await downloadPromise;
  const filePath = testInfo.outputPath("backup.json");
  await downloaded.saveAs(filePath);
  expect(filePath).not.toBeNull();
  await page.locator("input[type=file]").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"bad":true}'),
  });
  await expect(page.getByRole("alert")).toContainText("Unsupported");
  await page.locator("input[type=file]").setInputFiles(filePath!);
  await expect(
    page.getByRole("heading", { name: "Backup preview" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Replace with this backup", exact: true })
    .click();
  await page.getByRole("button", { name: "Workout", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Barbell Back Squat set 1", exact: true }),
  ).toHaveClass("done");
});
test("responsive screens have no horizontal overflow and installable manifest assets", async ({
  page,
  request,
}) => {
  await page.goto("/");
  for (const screen of ["Workout", "Program", "Progress", "Settings"]) {
    await page.getByRole("button", { name: screen, exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.name).toBe("5x5 gromritt");
  expect(manifest.short_name).toBe("5x5 gromritt");
  await expect(page).toHaveTitle("5x5 gromritt");
  await expect(page.getByRole("banner")).toContainText("5x5 gromritt");
  await expect(
    page.locator("meta[name=apple-mobile-web-app-title]"),
  ).toHaveAttribute("content", "5x5 gromritt");
  for (const icon of manifest.icons)
    expect((await request.get(icon.src)).status()).toBe(200);
  const bar = page.getByRole("spinbutton", {
    name: "Bar weight (kg)",
    exact: true,
  });
  await bar.fill("25");
  const preferences = page.getByRole("tab", {
    name: "Preferences",
    exact: true,
  });
  await preferences.focus();
  await preferences.press("ArrowRight");
  const help = page.getByRole("tab", { name: "Help", exact: true });
  await expect(help).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("heading", { name: "Getting started", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Stored locally on this device",
      exact: true,
    }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .locator(".data-information")
    .screenshot({ path: "test-results/help-data-information.png" });
  await help.press("ArrowLeft");
  await expect(preferences).toHaveAttribute("aria-selected", "true");
  await expect(bar).toHaveValue("25");
  await page.screenshot({
    path: "test-results/mobile-settings.png",
    fullPage: true,
  });
});
test("a service worker deployment update preserves history and the active session", async ({
  page,
}) => {
  await writeFile(".qa-build-version", "release-one");
  await start(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page
    .getByRole("button", { name: "Barbell Back Squat set 1", exact: true })
    .click();
  await writeFile(".qa-build-version", "release-two");
  await page.evaluate(async () => {
    const r = await navigator.serviceWorker.getRegistration();
    await r!.update();
  });
  await expect(
    page.getByRole("button", { name: "Apply update", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Barbell Back Squat set 1", exact: true }),
  ).toHaveClass("done");
  await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Complete & save", exact: true })
    .click();
  await page.getByRole("button", { name: "Apply update", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Workout B", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Workout A", exact: true }),
  ).toBeVisible();
});
