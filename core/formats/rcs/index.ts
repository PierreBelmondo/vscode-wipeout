export * from "./rcsmodel_ps3";
export * from "./rcsmodel_ps5";

import { RcsModel } from "./rcsmodel_ps3";
import { RcsModelPS5 } from "./rcsmodel_ps5";

export type AnyRcsModel = RcsModel | RcsModelPS5;

export function loadRcsModel(buffer: ArrayBuffer): AnyRcsModel {
  if (RcsModelPS5.canLoad(buffer)) return RcsModelPS5.load(buffer);
  return RcsModel.load(buffer);
}
