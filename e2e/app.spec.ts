import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
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
  for (const icon of manifest.icons)
    expect((await request.get(icon.src)).status()).toBe(200);
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
