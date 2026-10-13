// A one-line art report for the corner of the title screen, so a screenshot from a device that
// shows no art says why: how many pictures loaded, the first failing url and status, and the
// renderer with its largest texture size.
export interface ArtDiag {
  expected: number;
  loaded: number;
  failed: number;
  firstError: string | null;
  renderer: string;
  maxTexture: number;
}

export const DIAG_KEY = 'artDiag';

export function formatArtDiag(d: ArtDiag): string {
  const base = `art ${d.loaded}/${d.expected}`;
  const err = d.firstError ? ` (err ${d.failed}: ${d.firstError})` : '';
  const gl = d.renderer + (d.maxTexture > 0 ? ` ${d.maxTexture}px` : '');
  return `${base}${err} · ${gl}`;
}
