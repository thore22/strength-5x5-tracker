import { describe, it, expect } from "vitest";
import {
  appearanceVariables,
  contrast,
  readableAccent,
  textOn,
} from "./appearance";
import { freshState } from "./defaults";
import { validateState } from "./validation";
describe("custom appearance", () => {
  it("keeps old databases valid and rejects invalid color values", () => {
    const state = freshState();
    expect(validateState(state)).toEqual(state);
    expect(appearanceVariables(state.settings)).toEqual({});
    state.settings.primaryColor = "red";
    expect(() => validateState(state)).toThrow("Invalid training data");
  });
  it("keeps button and accent text readable on dark, light, and matching colors", () => {
    for (const background of [
      "#ffffff",
      "#000000",
      "#888888",
      "#191f16",
      "#e3eadb",
    ])
      for (const primary of [
        "#ffffff",
        "#000000",
        "#888888",
        "#e040fb",
        background,
      ]) {
        expect(contrast(primary, textOn(primary))).toBeGreaterThanOrEqual(4.5);
        expect(
          contrast(readableAccent(primary, background), background),
        ).toBeGreaterThanOrEqual(4.5);
        const vars = appearanceVariables({
          primaryColor: primary,
          secondaryColor: background,
        });
        for (const surface of [
          vars["--surface"],
          vars["--raised"],
          vars["--background"],
        ]) {
          expect(contrast(vars["--text"], surface)).toBeGreaterThanOrEqual(4.5);
          expect(contrast(vars["--accent"], surface)).toBeGreaterThanOrEqual(
            4.5,
          );
        }
      }
  });
});
