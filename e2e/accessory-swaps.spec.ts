import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("accessory sheet is accessible, persists offline, restores from backup and keeps the program unchanged", async ({
  page,
  context,
}, testInfo) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start Workout A →", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Barbell Back Squat set 1", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Swap Barbell Back Squat", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Swap Dips", exact: true }),
  ).toBeDisabled();
  const swap = page.getByRole("button", {
    name: "Swap Hanging Leg Raise",
    exact: true,
  });
  await swap.click();
  const sheet = page.getByRole("dialog", {
    name: "Swap Hanging Leg Raise",
    exact: true,
  });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("radio")).toHaveCount(1);
  await expect(
    sheet.getByRole("button", { name: "Use for this workout", exact: true }),
  ).toBeDisabled();
  // Native modal dialog keeps keyboard focus inside and supports Escape.
  await sheet.getByRole("button", { name: "Cancel", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(
    sheet.getByRole("button", { name: "Close accessory swap", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(sheet).not.toBeVisible();
  await expect(swap).toBeFocused();
  await swap.click();
  await sheet.getByRole("radio").check();
  await expect(sheet).toContainText("No added load");
  await page.screenshot({
    path: testInfo.outputPath("accessory-swap-sheet.png"),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await sheet
    .getByRole("button", { name: "Use for this workout", exact: true })
    .click();
  await expect(sheet).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Swap Hanging Knee Raise", exact: true }),
  ).toBeFocused();
  await expect(
    page.getByText("Replaces Hanging Leg Raise · Today only", { exact: true }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByText("Replaces Hanging Leg Raise · Today only", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Barbell Back Squat set 1", exact: true }),
  ).toHaveClass("done");
  await context.setOffline(false);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Generate JSON backup", exact: true })
    .click();
  const path = testInfo.outputPath("swapped-session.json");
  await (await download).saveAs(path);
  const backup = JSON.parse(await readFile(path, "utf8"));
  expect(backup.version).toBe(3);
  expect(backup.data.active.lifts[4].replaced.exercise.id).toBe("leg-raise");
  expect(backup.data.templates.A[4].exerciseId).toBe("leg-raise");
  await page.getByRole("button", { name: "Workout", exact: true }).click();
  await page
    .getByRole("button", { name: "Swap Hanging Knee Raise", exact: true })
    .click();
  await page.getByRole("dialog").getByRole("radio").check();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Use for this workout", exact: true })
    .click();
  await expect(swap).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles(path);
  await page
    .getByRole("button", { name: "Replace with this backup", exact: true })
    .click();
  await page.getByRole("button", { name: "Workout", exact: true }).click();
  await expect(
    page.getByText("Replaces Hanging Leg Raise · Today only", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Hanging Knee Raise set 1", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Swap Hanging Knee Raise", exact: true }),
  ).toBeDisabled();
  await expect(page.getByText(/Already started/)).toBeVisible();
  await page
    .getByRole("button", { name: "Finish workout", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Complete & save", exact: true })
    .click();
  await page.getByRole("button", { name: "Progress", exact: true }).click();
  await page.getByText("View every set", { exact: true }).click();
  await expect(
    page.getByText("Replaces Hanging Leg Raise · This workout only", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Workout", exact: true }).click();
  await page.getByRole("button", { name: "Workout A", exact: true }).click();
  await page
    .getByRole("button", { name: "Start Workout A →", exact: true })
    .click();
  await expect(swap).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "Hanging Knee Raise set 1", exact: true }),
  ).toHaveCount(0);
});

test("loaded alternative requires its own load, cannot swap after starting, and remains saved after reopening", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Workout B", exact: true }).click();
  await page
    .getByRole("button", { name: "Start Workout B →", exact: true })
    .click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Swap Pull-ups", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page
    .getByRole("button", { name: "Swap Pull-ups", exact: true })
    .click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("radio").check();
  const weight = sheet.getByRole("spinbutton", { name: /Added load/ });
  await expect(weight).toHaveValue("");
  await expect(
    sheet.getByRole("button", { name: "Use for this workout", exact: true }),
  ).toBeDisabled();
  await weight.fill("5");
  // A failed atomic save must leave the current workout intact and keep
  // useful feedback inside the modal, where it remains accessible.
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      IDBObjectStore.prototype.put = put;
      throw new DOMException("Simulated storage error", "QuotaExceededError");
    };
  });
  await sheet
    .getByRole("button", { name: "Use for this workout", exact: true })
    .click();
  await expect(sheet.getByRole("alert")).toContainText(
    "Your workout is unchanged",
  );
  await expect(sheet).toBeVisible();
  await expect(
    page.locator("article h2").filter({ hasText: /^Pull-ups$/ }),
  ).toHaveCount(1);
  await sheet
    .getByRole("button", { name: "Use for this workout", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Swap Dumbbell Lateral Raise",
      exact: true,
    }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Chin-ups", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Chin-ups set 1", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Swap Chin-ups", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Chin-ups set 1", exact: true }),
  ).toHaveClass("done");
});

test("timed alternatives preview seconds instead of reusing repetition targets", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Program", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Exercise", exact: true })
    .selectOption("ab-wheel");
  await page
    .getByRole("button", { name: "Add to Workout A", exact: true })
    .click();
  await page.getByRole("button", { name: "Workout", exact: true }).click();
  await page
    .getByRole("button", { name: "Start Workout A →", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Swap Ab Wheel", exact: true })
    .click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("radio").check();
  await expect(sheet).toContainText("3 × 20–40 sec");
  await expect(sheet).toContainText("Log seconds for each hold");
  await sheet
    .getByRole("button", { name: "Use for this workout", exact: true })
    .click();
  await page.getByRole("button", { name: "Plank set 1", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Plank set 1", exact: true }),
  ).toContainText("20");
});
