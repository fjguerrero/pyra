export interface Command {
  label: string;
  do(): void;
  undo(): void;
}

export class History {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }

  run(cmd: Command): void {
    cmd.do();
    this.undoStack.push(cmd);
    this.redoStack.length = 0;
  }

  /** Registra un comando cuyo do() ya fue aplicado (drag en vivo). */
  record(cmd: Command): void {
    this.undoStack.push(cmd);
    this.redoStack.length = 0;
  }

  undo(): boolean {
    const c = this.undoStack.pop();
    if (!c) return false;
    c.undo();
    this.redoStack.push(c);
    return true;
  }

  redo(): boolean {
    const c = this.redoStack.pop();
    if (!c) return false;
    c.do();
    this.undoStack.push(c);
    return true;
  }
}
