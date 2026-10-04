import type { Vec2 } from '../sim/api';

// Fixed building plots around the town hall (the sim accepts any in-map position; the plot
// grid is a Scene rule for where the player may tap).
export const PLOT_SIZE = 120;
export const PLOT_RADIUS = 110;

export function makePlots(center: Vec2): Vec2[] {
  const ring = 300;
  const plots: Vec2[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    plots.push({
      x: Math.round(center.x + Math.cos(a) * ring * 1.3),
      y: Math.round(center.y + Math.sin(a) * ring),
    });
  }
  return plots;
}
