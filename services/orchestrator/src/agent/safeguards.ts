import type { RunReceipt } from "./types.js";
import type { RunsStore } from "../state/runsStore.js";

export async function assertDiversity(store: RunsStore, next: RunReceipt): Promise<void> {
  const last = await store.lastReceipt();
  if (!last) return;

  const sameRoute = last.route === next.route;
  const sameServices =
    last.aceServiceIds.join(",") === next.aceServiceIds.join(",") &&
    next.aceServiceIds.length > 0;

  if (sameRoute && sameServices) {
    throw new Error("Safeguard: identical back-to-back run pattern (wash-trade risk)");
  }
}
