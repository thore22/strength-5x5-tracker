import type { Settings } from "./model";

export const defaultPrimary = "#c7ed84";
export const defaultSecondary = "#191f16";
const rgb = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
export function luminance(hex: string) {
  const c = rgb(hex).map((v) => {
    const n = v / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
}
export function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function textOn(color: string) {
  return contrast(color, "#ffffff") > contrast(color, "#000000")
    ? "#ffffff"
    : "#000000";
}
function mix(a: string, b: string, amount: number) {
  const x = rgb(a),
    y = rgb(b);
  return (
    "#" +
    x
      .map((v, i) =>
        Math.round(v + (y[i] - v) * amount)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
export function readableAccent(primary: string, background: string) {
  const target = textOn(background);
  for (let i = 0; i <= 20; i++) {
    const color = mix(primary, target, i / 20);
    if (contrast(color, background) >= 4.5) return color;
  }
  return target;
}
export function appearanceVariables(
  settings: Pick<Settings, "primaryColor" | "secondaryColor">,
): Record<string, string> {
  const primary = settings.primaryColor ?? defaultPrimary;
  const secondary = settings.secondaryColor ?? defaultSecondary;
  const vars: Record<string, string> = {};
  if (settings.primaryColor) {
    vars["--primary"] = primary;
    vars["--on-primary"] = textOn(primary);
    vars["--accent"] = readableAccent(primary, "#283420");
    vars["--light-accent"] = readableAccent(primary, "#e3eadb");
  }
  if (settings.secondaryColor) {
    const text = textOn(secondary);
    const dark = text === "#ffffff";
    vars["--surface"] = secondary;
    vars["--background"] = mix(secondary, dark ? "#000000" : "#ffffff", 0.2);
    vars["--raised"] = mix(secondary, text, 0.05);
    if (contrast(text, vars["--raised"]) < 4.5) vars["--raised"] = secondary;
    vars["--input"] = vars["--background"];
    vars["--border"] = mix(secondary, text, 0.3);
    vars["--text"] = text;
    vars["--muted"] = text;
    const backgrounds = [secondary, vars["--raised"], vars["--background"]];
    for (let i = 0; i <= 20; i++) {
      const accent = mix(primary, text, i / 20);
      if (backgrounds.every((color) => contrast(accent, color) >= 4.5)) {
        vars["--accent"] = accent;
        break;
      }
    }
    vars["--light-accent"] = vars["--accent"];
    vars["--scheme"] = dark ? "dark" : "light";
  }
  return vars;
}
