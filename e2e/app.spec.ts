import { test, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
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
test("custom colors persist, preserve an active session, and reset to defaults", async ({
  page,
}) => {
  await start(page);
  await page
    .getByRole("button", { name: "Barbell Back Squat set 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const primary = page.getByLabel("Primary color", { exact: true });
  const secondary = page.getByLabel("Secondary color", { exact: true });
  await primary.fill("#220044");
  await expect(primary).toBeEnabled();
  await page.emulateMedia({ colorScheme: "light" });
  await page
    .getByRole("combobox", { name: "Theme", exact: true })
    .selectOption("system");
  await page
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(page.locator(".shell")).toHaveCSS("color", "rgb(23, 34, 13)");
  await secondary.fill("#ffffff");
  await expect(page.locator(".appearance-preview")).toHaveCSS(
    "background-color",
    "rgb(242, 242, 242)",
  );
  await expect(page.locator(".preview-chip")).toHaveCSS(
    "background-color",
    "rgb(34, 0, 68)",
  );
  await expect(page.locator(".preview-chip")).toHaveCSS(
    "color",
    "rgb(255, 255, 255)",
  );
  await page.screenshot({
    path: "test-results/custom-appearance.png",
    fullPage: true,
  });
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(primary).toHaveValue("#220044");
  await expect(secondary).toHaveValue("#ffffff");
  await page
    .getByRole("button", { name: "Reset colors to defaults", exact: true })
    .click();
  await expect(primary).toHaveValue("#c7ed84");
  await expect(secondary).toHaveValue("#191f16");
  await expect(page.locator(".preview-chip")).toHaveCSS(
    "background-color",
    "rgb(199, 237, 132)",
  );
  await page.reload();
  await page.getByRole("button", { name: "Workout", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Barbell Back Squat set 1", exact: true }),
  ).toHaveClass("done");
});

test("progress reset requires confirmation, persists, and remains restorable from an external backup", async ({
  page,
}, testInfo) => {
  await start(page);
  await page
    .getByRole("button", { name: "Barbell Back Squat set 1", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Complete & save", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start Workout B →", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Barbell Back Squat set 1", exact: true })
    .click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.locator("#recovery-description")).toContainText(
    "Nothing is replaced until you confirm",
  );
  await expect(page.locator("#persistent-storage-description")).toContainText(
    "does not create a backup",
  );
  await page
    .getByRole("button", { name: "Reset all progress", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Delete progress permanently",
      exact: true,
    }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Cancel reset", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Barbell Back Squat set 1", exact: true }),
  ).toHaveClass("done");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("button", { name: "Reset all progress", exact: true })
    .click();
  const downloadBefore = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download backup before reset", exact: true })
    .click();
  const beforePath = testInfo.outputPath("before-reset.json");
  await (await downloadBefore).saveAs(beforePath);
  const before = JSON.parse(await readFile(beforePath, "utf8")).data;
  await page.locator("input[type=file]").setInputFiles(beforePath);
  await page
    .getByRole("button", { name: "Replace with this backup", exact: true })
    .click();
  await page.getByLabel("Type RESET to confirm", { exact: true }).fill("RESET");
  await page.screenshot({
    path: "test-results/reset-confirmation.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Delete progress permanently", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Progress reset");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Start Workout A →", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Preview pre-restore recovery snapshot",
      exact: true,
    })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "No pre-restore snapshot exists",
  );
  const downloadAfter = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Generate JSON backup", exact: true })
    .click();
  const afterPath = testInfo.outputPath("after-reset.json");
  await (await downloadAfter).saveAs(afterPath);
  const after = JSON.parse(await readFile(afterPath, "utf8")).data;
  expect(after.history).toEqual([]);
  expect(after.active).toBeNull();
  expect(after.timerEnd).toBeNull();
  expect(after.templates).toEqual(before.templates);
  expect(after.exercises).toEqual(before.exercises);
  expect(after.settings).toEqual(before.settings);
  for (const [id, value] of Object.entries(after.progression) as [
    string,
    {
      weight: number;
      successes: number;
      failures: number;
      suggestion: number | null;
    },
  ][]) {
    expect(value.weight).toBe(before.progression[id].weight);
    expect(value.successes).toBe(0);
    expect(value.failures).toBe(0);
    expect(value.suggestion).toBeNull();
  }
  await page.locator("input[type=file]").setInputFiles(beforePath);
  await page
    .getByRole("button", { name: "Replace with this backup", exact: true })
    .click();
  await page.getByRole("button", { name: "Workout", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Barbell Back Squat set 1", exact: true }),
  ).toHaveClass("done");
});

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
  for (let i = 0; i < 4; i++) await set.click();
  await expect(set.locator("strong")).toHaveText("0");
  expect(await savedTimer(page)).toBe(timer);
  await set.click();
  await expect(set.locator("strong")).toHaveText("5");
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
test("global rest applies to future A/B workouts while an active workout keeps its rest", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("spinbutton", { name: "Default rest seconds", exact: true })
    .fill("60");
  await page
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await page.getByRole("button", { name: "Workout", exact: true }).click();
  await page
    .getByRole("button", { name: "Start Workout A →", exact: true })
    .click();
  const warmups = page.getByRole("button", {
    name: "Warm-up sets for Barbell Back Squat",
    exact: true,
  });
  await expect(warmups).toBeVisible();
  expect((await warmups.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await warmups.click();
  await expect(page.locator("#warmups-squat")).toContainText(
    "No lighter warm-up sets can be generated",
  );
  await page
    .getByRole("button", { name: "Barbell Back Squat set 1", exact: true })
    .click();
  expect((await savedTimer(page))! - Date.now()).toBeGreaterThan(55000);
  expect((await savedTimer(page))! - Date.now()).toBeLessThanOrEqual(60000);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("spinbutton", { name: "Default rest seconds", exact: true })
    .fill("120");
  await page
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await page.getByRole("button", { name: "Workout", exact: true }).click();
  await page
    .getByRole("button", { name: "Barbell Back Squat set 2", exact: true })
    .click();
  expect((await savedTimer(page))! - Date.now()).toBeLessThanOrEqual(60000);
  await page.getByRole("button", { name: "Discard", exact: true }).click();
  await page
    .getByRole("button", { name: "Discard session", exact: true })
    .click();
  await page.getByRole("button", { name: "Workout B", exact: true }).click();
  await page
    .getByRole("button", { name: "Start Workout B →", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Pull-ups set 1", exact: true })
    .click();
  expect((await savedTimer(page))! - Date.now()).toBeGreaterThan(115000);
  expect((await savedTimer(page))! - Date.now()).toBeLessThanOrEqual(120000);
});

test("warm-up button expands generated sets and preserves their edits without logging working sets", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Program", exact: true }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).first().click();
  await page
    .getByRole("spinbutton", { name: "Next working weight", exact: true })
    .fill("100");
  await page
    .getByRole("button", { name: "Save prescription", exact: true })
    .click();
  await page.getByRole("button", { name: "Workout", exact: true }).click();
  await page
    .getByRole("button", { name: "Start Workout A →", exact: true })
    .click();
  const toggle = page.getByRole("button", {
    name: "Warm-up sets for Barbell Back Squat",
    exact: true,
  });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  const panel = page.locator("#warmups-squat");
  await expect(panel.locator(".row")).toHaveCount(4);
  await page
    .getByRole("button", { name: "Warm-up 1 Barbell Back Squat", exact: true })
    .click();
  await page
    .getByRole("spinbutton", {
      name: "Warm-up 1 weight Barbell Back Squat",
      exact: true,
    })
    .fill("25");
  await page
    .getByRole("spinbutton", {
      name: "Warm-up 1 reps Barbell Back Squat",
      exact: true,
    })
    .fill("4");
  await page
    .getByRole("spinbutton", {
      name: "Warm-up 1 reps Barbell Back Squat",
      exact: true,
    })
    .blur();
  await expect(
    page.getByRole("button", {
      name: "Warm-up 1 Barbell Back Squat",
      exact: true,
    }),
  ).toBeEnabled();
  await panel.getByRole("button", { name: "Skip", exact: true }).nth(1).click();
  await expect(
    panel.getByRole("button", { name: "Unskip", exact: true }),
  ).toBeVisible();
  await page.reload();
  await toggle.click();
  await expect(
    page.getByRole("button", {
      name: "Warm-up 1 Barbell Back Squat",
      exact: true,
    }),
  ).toHaveText("✓");
  await expect(
    page.getByRole("spinbutton", {
      name: "Warm-up 1 weight Barbell Back Squat",
      exact: true,
    }),
  ).toHaveValue("25");
  await expect(
    page.getByRole("spinbutton", {
      name: "Warm-up 1 reps Barbell Back Squat",
      exact: true,
    }),
  ).toHaveValue("4");
  await expect(
    panel.getByRole("button", { name: "Unskip", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("button", { name: "Barbell Back Squat set 1", exact: true })
      .locator("strong"),
  ).toHaveText("○");
  expect(await savedTimer(page)).toBeNull();
  await panel
    .locator("..")
    .screenshot({ path: "test-results/warm-up-controls.png" });
  await toggle.click();
  await expect(panel).toBeHidden();
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
