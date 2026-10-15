export interface Command {
  label: string;
  do(): void;
  undo(): void;
}

export class History {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private listeners: (() => void)[] = [];

  /** Aviso tras cualquier cambio de pila: la UI sincroniza los botones deshacer/rehacer. */
  onChange(cb: () => void): void {
    this.listeners.push(cb);
  }
  private notify(): void {
    for (const cb of this.listeners) cb();
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.notify();
  }

  run(cmd: Command): void {
    cmd.do();
    this.undoStack.push(cmd);
    this.redoStack.length = 0;
    this.notify();
  }

  /** Registra un comando cuyo do() ya fue aplicado (drag en vivo). */
  record(cmd: Command): void {
    this.undoStack.push(cmd);
    this.redoStack.length = 0;
    this.notify();
  }

  undo(): boolean {
    const c = this.undoStack.pop();
    if (!c) return false;
    c.undo();
    this.redoStack.push(c);
    this.notify();
    return true;
  }

  redo(): boolean {
    const c = this.redoStack.pop();
    if (!c) return false;
    c.do();
    this.undoStack.push(c);
    this.notify();
    return true;
  }
}
