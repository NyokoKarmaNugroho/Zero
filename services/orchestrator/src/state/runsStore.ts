import fs from "node:fs/promises";
import path from "node:path";
import type { RunReceipt } from "../agent/types.js";

export class RunsStore {
  constructor(private readonly stateDir: string) {}

  private filePath(): string {
    return path.join(this.stateDir, "runs.jsonl");
  }

  async ensureDir(): Promise<void> {
    await fs.mkdir(this.stateDir, { recursive: true });
  }

  async append(receipt: RunReceipt): Promise<void> {
    await this.ensureDir();
    const line = JSON.stringify({ ...receipt, recordedAt: new Date().toISOString() });
    await fs.appendFile(this.filePath(), `${line}\n`, "utf8");
  }

  async lastReceipt(): Promise<RunReceipt | null> {
    try {
      const raw = await fs.readFile(this.filePath(), "utf8");
      const lines = raw.trim().split("\n").filter(Boolean);
      if (lines.length === 0) return null;
      return JSON.parse(lines[lines.length - 1]!) as RunReceipt;
    } catch {
      return null;
    }
  }

  async countSince(sinceMs: number): Promise<number> {
    try {
      const raw = await fs.readFile(this.filePath(), "utf8");
      const lines = raw.trim().split("\n").filter(Boolean);
      let count = 0;
      for (const line of lines) {
        const row = JSON.parse(line) as { recordedAt?: string };
        if (!row.recordedAt) continue;
        const ts = Date.parse(row.recordedAt);
        if (Number.isFinite(ts) && ts >= sinceMs) count += 1;
      }
      return count;
    } catch {
      return 0;
    }
  }
}
