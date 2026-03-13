/**
 * VEXX check – parse errors.
 */

import { Vexx } from "@core/formats/vexx";

export function checkParseErrors(vexx: Vexx, failures: string[]): void {
  for (const e of vexx.parseErrors) failures.push(e);
}
