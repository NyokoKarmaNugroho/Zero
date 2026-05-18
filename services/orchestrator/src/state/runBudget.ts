import type { RunsStore } from "./runsStore.js";

const HOUR_MS = 60 * 60 * 1000;

export async function assertHourlyRunBudget(store: RunsStore, maxPerHour: number): Promise<void> {
  if (maxPerHour <= 0) return;
  const since = Date.now() - HOUR_MS;
  const count = await store.countSince(since);
  if (count >= maxPerHour) {
    throw new Error(`Safeguard: hourly run budget exceeded (${maxPerHour}/hour)`);
  }
}
