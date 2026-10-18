// One pending action while the art is still loading: a second tap replaces the first instead of
// queueing another (Play twice must not start the map twice), and a cancel drops it (the scene
// that asked has been stopped).
export class ArtGate {
  private pending: (() => void) | null = null;

  // Runs `go` at once when the art is in; else keeps it (the latest request wins) and calls `wait`.
  request(ready: boolean, go: () => void, wait: () => void): void {
    if (ready) {
      this.pending = null;
      go();
      return;
    }
    const first = this.pending === null;
    this.pending = go;
    if (first) wait();
  }

  // The art has arrived: run the pending action once.
  release(): void {
    const go = this.pending;
    this.pending = null;
    go?.();
  }

  cancel(): void {
    this.pending = null;
  }

  get waiting(): boolean {
    return this.pending !== null;
  }
}
