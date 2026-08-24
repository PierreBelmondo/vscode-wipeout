/**
 * Front-end screen settings, as authored in
 * `Data/plugins/frontend/gui/skin.xml`.
 *
 * The front-end background scene is not shaded by its material: the engine
 * keeps only the depth buffer and runs a screen-space edge detector over it,
 * driven by these three values:
 *
 *     <BackgroundAnim Src="Data\FE\FrontEndScene\FrontEndScene_HD_ATG.vex" ...>
 *       <ScreenSetting name="Main Menu" use_bands="false" blur="0">
 *         <Main edge_level="0.3" fill_level="0.1" edge_width="1.5"></Main>
 */
export type ScreenSetting = {
  name: string;
  blur: number;
  edgeLevel: number;
  fillLevel: number;
  edgeWidth: number;
};

/** What skin.xml ships for the main menu — used when the file isn't available. */
export const DEFAULT_SCREEN_SETTING: ScreenSetting = {
  name: "Main Menu",
  blur: 0,
  edgeLevel: 0.3,
  fillLevel: 0.1,
  edgeWidth: 1.5,
};

/**
 * Path of the skin file relative to the data root. Lower-case "data/" is
 * required: EditorProvider.resolveUri() tests `startsWith("data/")` to decide
 * whether a path is data-root-relative, and anything else is resolved relative
 * to the .vex file instead.
 */
export const SKIN_XML = "data/plugins/frontend/gui/skin.xml";

/**
 * True when this scene is drawn as a front-end background — i.e. skin.xml
 * names it in a <BackgroundAnim Src="...">. Matched on basename so the
 * "Data\FE\..." backslash form in the XML and the loader's path agree.
 */
export function isFrontEndScene(filename: string, skin?: string): boolean {
  const base = basename(filename);
  if (!base.endsWith(".vex")) return false;
  if (skin === undefined) {
    // Without the XML, fall back to the one scene the shipped game uses.
    return base === "frontendscene_hd_atg.vex";
  }
  for (const src of backgroundAnimSources(skin)) {
    if (basename(src) === base) return true;
  }
  return false;
}

/** Every <BackgroundAnim Src="..."> value in the skin file. */
export function backgroundAnimSources(skin: string): string[] {
  const out: string[] = [];
  const re = /<BackgroundAnim\b[^>]*>([\s\S]*?)<\/BackgroundAnim>|<BackgroundAnim\b[^>]*\/>/gi;
  for (const block of skin.matchAll(re)) {
    const src = /\bSrc\s*=\s*"([^"]*)"/i.exec(block[0]);
    if (src) out.push(src[1]);
  }
  // Src also appears on the <Values> child rather than the element itself.
  for (const m of skin.matchAll(/\bSrc\s*=\s*"([^"]*\.vex)"/gi)) out.push(m[1]);
  return out;
}

/**
 * Read the <ScreenSetting>/<Main> values for one screen. Falls back to the
 * first setting in the file, then to DEFAULT_SCREEN_SETTING.
 */
export function parseScreenSetting(skin: string, screenName = "Main Menu"): ScreenSetting {
  const settings = parseAllScreenSettings(skin);
  if (settings.length === 0) return DEFAULT_SCREEN_SETTING;
  const named = settings.find((s) => s.name.toLowerCase() === screenName.toLowerCase());
  return named ?? settings[0];
}

export function parseAllScreenSettings(skin: string): ScreenSetting[] {
  const out: ScreenSetting[] = [];
  const re = /<ScreenSetting\b([^>]*)>([\s\S]*?)<\/ScreenSetting>/gi;
  for (const m of skin.matchAll(re)) {
    const attrs = m[1];
    const body = m[2];
    const main = /<Main\b([^>]*)\/?>/i.exec(body);
    if (!main) continue;
    out.push({
      name: attr(attrs, "name") ?? "",
      blur: num(attr(attrs, "blur"), DEFAULT_SCREEN_SETTING.blur),
      edgeLevel: num(attr(main[1], "edge_level"), DEFAULT_SCREEN_SETTING.edgeLevel),
      fillLevel: num(attr(main[1], "fill_level"), DEFAULT_SCREEN_SETTING.fillLevel),
      edgeWidth: num(attr(main[1], "edge_width"), DEFAULT_SCREEN_SETTING.edgeWidth),
    });
  }
  return out;
}

function attr(s: string, name: string): string | undefined {
  const m = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`, "i").exec(s);
  return m ? m[1] : undefined;
}

function num(s: string | undefined, fallback: number): number {
  if (s === undefined) return fallback;
  const v = parseFloat(s);
  return Number.isFinite(v) ? v : fallback;
}

function basename(path: string): string {
  return path.replace(/\\/g, "/").split("/").pop()?.toLowerCase() ?? "";
}
