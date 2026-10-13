// While a path offer is open the run slows to this share of normal speed, whatever the speed
// button says (Lead's decision: absolute, not multiplied by 1x, 2x or 4x).
export const PATH_OFFER_SPEED = 0.3;

export function effectiveSpeed(buttonSpeed: number, pathOfferOpen: boolean): number {
  return pathOfferOpen ? PATH_OFFER_SPEED : buttonSpeed;
}
