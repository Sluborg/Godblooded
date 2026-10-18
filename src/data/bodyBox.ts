// The body box (Stefan 2026-10-19): every hero body shape (ball, bell, barrel, tattered) is painted
// inside ONE fixed box with fixed anchors, so any body plugs into the compact rig the same way and
// the code can move hands, feet, head and cape without knowing the shape. Art paints to these
// numbers (ppu 16); the rig reads them. Fractions are of the box, x right, y down from its top left.
export const BODY_BOX = {
  // The box in drawing units; at ppu 16 that is 416 x 416 px.
  w: 26,
  h: 26,
  ppu: 16,
  // Where the head's chin lands (the head overlaps the body's top by about a unit), where the cape
  // hangs from, and the pivot the body swings and bobs about (the box centre).
  anchors: {
    hip: [0.5, 0.5],
    neck: [0.62, 0.12],
    clasp: [0.2, 0.08],
  },
  // Where the ball hands rest, at shoulder height, out at the sides (back hand on the cape side).
  // Code moves them from here in every pose, so keep important painted detail clear of these two.
  hands: { back: [0.1, 0.3], front: [0.9, 0.3] },
  // The foot line: the ball feet sit under the hem, their centres this far below the box's bottom edge
  // (fraction of the box height), this far apart either side of the centre line.
  feet: { y: 1.06, spread: 0.12 },
} as const;

// The box in rig coordinates (drawing units, y up is negative, 0 at the ground between the feet): the
// hip sits where the rig puts the body's pivot (HIP_FLOAT in ui/parts/painted.ts).
export const BODY_BOX_HIP = { x: 0, y: -15 } as const;

export interface BoxPoint {
  x: number;
  y: number;
}

// A box fraction as a point in rig units, around the hip.
export function boxPoint(f: readonly [number, number]): BoxPoint {
  return {
    x: BODY_BOX_HIP.x + (f[0] - BODY_BOX.anchors.hip[0]) * BODY_BOX.w,
    y: BODY_BOX_HIP.y + (f[1] - BODY_BOX.anchors.hip[1]) * BODY_BOX.h,
  };
}
