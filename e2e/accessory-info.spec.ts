import { test, expect, type Page } from "@playwright/test";
import type { State } from "../src/model";

async function savedState(page: Page): Promise<State> {
  return page.evaluate(
    () =>
      new Promise<State>((resolve, reject) => {
        const open = indexedDB.open("strength-tracker", 2);
        open.onsuccess = () => {
          const db = open.result;
          const r = db.transaction("state").objectStore("state").get("current");
          r.onsuccess = () => {
            resolve(r.result.state);
            db.close();
          };
          r.onerror = () => {
            reject(r.error);
            db.close();
          };
        };
        open.onerror = () => reject(open.error);
      }),
  );
}

test("accessory information uses the session snapshot, has safe search links, and preserves logged and paused workouts", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: /Exercise information for/ }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Start Workout A →", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /Exercise information for/ }),
  ).toHaveCount(2);
  await expect(
    page.getByRole("button", {
      name: "Exercise information for Barbell Back Squat",
      exact: true,
    }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Dips set 1", exact: true }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const before = await savedState(page);
  const info = page.getByRole("button", {
    name: "Exercise information for Dips",
    exact: true,
  });
  await info.click();
  const sheet = page.getByRole("dialog", { name: "Dips", exact: true });
  await expect(sheet).toContainText(
    before.active!.lifts[3].exercise.description,
  );
  await expect(sheet).toContainText("added load");
  const query = encodeURIComponent("Dips exercise technique");
  for (const [label, url] of [
    ["Google", `https://www.google.com/search?q=${query}`],
    ["Images", `https://www.google.com/search?tbm=isch&q=${query}`],
    ["YouTube", `https://www.youtube.com/results?search_query=${query}`],
  ]) {
    const link = sheet.getByRole("link", { name: `${label} ↗`, exact: true });
    await expect(link).toHaveAttribute("href", url);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }
  await sheet.getByRole("link", { name: "YouTube ↗", exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(
    sheet.getByRole("button", {
      name: "Close exercise information",
      exact: true,
    }),
  ).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath("accessory-information.png"),
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(sheet).not.toBeVisible();
  await expect(info).toBeFocused();
  expect(await savedState(page)).toEqual(before);

  // Editing the live catalog does not rewrite an active session's description.
  await page.getByRole("button", { name: "Program", exact: true }).click();
  const dips = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: "Dips", exact: true }) });
  await dips.getByText("Exercise information", { exact: true }).click();
  await dips
    .getByRole("textbox", { name: "Description", exact: true })
    .fill("Future technique notes");
  await dips
    .getByRole("button", { name: "Save exercise information", exact: true })
    .click();
  await page.getByRole("button", { name: "Workout", exact: true }).click();
  await info.click();
  await expect(sheet).toContainText(
    before.active!.lifts[3].exercise.description,
  );
  await expect(sheet).not.toContainText("Future technique notes");
  await sheet
    .getByRole("button", { name: "Close exercise information", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Dips set 1", exact: true }),
  ).toHaveClass("done");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.context().setOffline(true);
  await page.reload();
  await info.click();
  await expect(sheet).toContainText(
    before.active!.lifts[3].exercise.description,
  );
  await expect(sheet.getByRole("link")).toHaveCount(3);
  await sheet
    .getByRole("button", { name: "Close exercise information", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Dips set 1", exact: true }),
  ).toHaveClass("done");
  await page.context().setOffline(false);
});

test("dips can swap to either approved triceps exercise and information follows the replacement", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start Workout A →", exact: true })
    .click();
  await page.getByRole("button", { name: "Swap Dips", exact: true }).click();
  let sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("radio")).toHaveCount(2);
  await sheet.locator('input[value="skull"]').check();
  await sheet.getByRole("spinbutton").fill("15");
  await sheet
    .getByRole("button", { name: "Use for this workout", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Exercise information for Skull Crusher",
      exact: true,
    })
    .click();
  sheet = page.getByRole("dialog", { name: "Skull Crusher", exact: true });
  await expect(sheet).toContainText("Bend and extend elbows");
  await expect(
    sheet.getByRole("link", { name: "YouTube ↗", exact: true }),
  ).toHaveAttribute(
    "href",
    `https://www.youtube.com/results?search_query=${encodeURIComponent("Skull Crusher exercise technique")}`,
  );
  await sheet
    .getByRole("button", { name: "Close exercise information", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Swap Skull Crusher", exact: true })
    .click();
  sheet = page.getByRole("dialog");
  await sheet.locator('input[value="triceps"]').check();
  await sheet.getByRole("spinbutton").fill("10");
  await sheet
    .getByRole("button", { name: "Use for this workout", exact: true })
    .click();
  await expect(
    page.getByText("Replaces Dips · Today only", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Triceps Extension set 1", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Triceps Extension set 1", exact: true }),
  ).toHaveClass("done");
  await page
    .getByRole("button", {
      name: "Exercise information for Triceps Extension",
      exact: true,
    })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Extend elbows against resistance",
  );
});

test("existing installs gain the new pool without changing their unfinished workout", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Workout B", exact: true }).click();
  await page
    .getByRole("button", { name: "Start Workout B →", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Barbell Back Squat set 1", exact: true })
    .click();
  const before = await savedState(page);
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open("strength-tracker", 2);
        open.onsuccess = () => {
          const db = open.result,
            tx = db.transaction("state", "readwrite"),
            store = tx.objectStore("state"),
            request = store.get("current");
          request.onsuccess = () => {
            const saved = request.result;
            const additions = [
              "cable-lateral",
              "db-reverse-fly",
              "db-calf-raise",
            ];
            saved.state.exercises = saved.state.exercises.filter(
              (e: { id: string }) => !additions.includes(e.id),
            );
            for (const id of additions) delete saved.state.progression[id];
            store.put(saved, "current");
          };
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
        };
      }),
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Swap Dumbbell Lateral Raise", exact: true })
    .click();
  const sheet = page.getByRole("dialog");
  await sheet.locator('input[value="cable-lateral"]').check();
  await expect(sheet).toContainText("both sides before logging");
  await sheet.getByRole("spinbutton").fill("4");
  await sheet
    .getByRole("button", { name: "Use for this workout", exact: true })
    .click();
  const after = await savedState(page);
  expect(after.active!.lifts.slice(0, 4)).toEqual(
    before.active!.lifts.slice(0, 4),
  );
  expect(after.templates).toEqual(before.templates);
  for (const id of ["cable-lateral", "db-reverse-fly", "db-calf-raise"])
    expect(after.exercises.some((e) => e.id === id)).toBe(true);
});

test("face pulls and calf raises offer their researched alternatives", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Program", exact: true }).click();
  for (const id of ["face-pull", "calf"]) {
    await page
      .getByRole("combobox", { name: "Exercise", exact: true })
      .selectOption(id);
    await page
      .getByRole("button", { name: "Add to Workout A", exact: true })
      .click();
  }
  await page.getByRole("button", { name: "Workout", exact: true }).click();
  await page
    .getByRole("button", { name: "Start Workout A →", exact: true })
    .click();
  for (const [original, replacement] of [
    ["Face Pull", "db-reverse-fly"],
    ["Calf Raise", "db-calf-raise"],
  ]) {
    await page
      .getByRole("button", { name: `Swap ${original}`, exact: true })
      .click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("radio")).toHaveCount(1);
    await sheet.locator(`input[value="${replacement}"]`).check();
    await sheet.getByRole("spinbutton").fill("5");
    await sheet
      .getByRole("button", { name: "Use for this workout", exact: true })
      .click();
    await expect(
      page.getByText(`Replaces ${original} · Today only`, { exact: true }),
    ).toBeVisible();
  }
});
