// The replay code of a run (Sim: RunReport.replay, base64 of the seed and every command that took
// effect): copied to the clipboard so a tester can paste it to the team. Null for a run loaded from
// an old save without a command log.
export function replayButtonLabel(
  replay: string | null | undefined,
  copied: boolean,
): string | null {
  if (!replay) return null;
  return copied ? 'Replay code copied' : 'Copy replay code';
}

// Writes the code to the clipboard; true when the browser took it.
export async function copyReplay(
  replay: string,
  clipboard: Pick<Clipboard, 'writeText'> | undefined = typeof navigator === 'undefined'
    ? undefined
    : navigator.clipboard,
): Promise<boolean> {
  if (!clipboard) return false;
  try {
    await clipboard.writeText(replay);
    return true;
  } catch {
    return false;
  }
}
