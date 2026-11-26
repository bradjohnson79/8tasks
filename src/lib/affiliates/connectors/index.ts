import { impactConnector } from "./impact";
import { awinConnector, cjConnector, daisyconConnector, flexoffersConnector } from "./others";
import type { EarningsConnector } from "./types";

/** Order = priority (Impact first: highest leverage). */
export const CONNECTORS: EarningsConnector[] = [
  impactConnector,
  awinConnector,
  flexoffersConnector,
  cjConnector,
  daisyconConnector,
];
