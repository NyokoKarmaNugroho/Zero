import { createX402PaymentHandler } from "@acedatacloud/x402-client";
import type { PaymentRequiredResponse } from "@acedatacloud/x402-client";
import { ACE_PLATFORM_BASE_URL } from "../payments/constants.js";
import { createEvmProvider } from "./evm-wallet.js";

export interface AcePlatformPayConfig {
  platformToken: string;
  evmPrivateKey: string;
  orderId: string;
}

export async function payAcePlatformOrder(
  config: AcePlatformPayConfig,
): Promise<Record<string, unknown>> {
  const path = `/api/v1/orders/${encodeURIComponent(config.orderId)}/pay/`;
  const url = `${ACE_PLATFORM_BASE_URL}${path}`;
  const { provider, address } = createEvmProvider(config.evmPrivateKey);
  const paymentHandler = createX402PaymentHandler({
    network: "base",
    evmProvider: provider,
    evmAddress: address,
  });

  const headers: Record<string, string> = {
    authorization: `Bearer ${config.platformToken}`,
    "content-type": "application/json",
  };

  let paymentAttempted = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    const resp = await fetch(url, { method: "POST", headers });
    if (resp.status === 402 && !paymentAttempted) {
      const body = (await resp.json()) as PaymentRequiredResponse;
      if (!body.accepts?.length) {
        throw new Error("402 without payment requirements");
      }
      const { headers: payHeaders } = await paymentHandler({
        url,
        method: "POST",
        accepts: body.accepts,
      });
      Object.assign(headers, payHeaders);
      paymentAttempted = true;
      continue;
    }
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Platform pay failed (${resp.status}): ${text}`);
    }
    return (await resp.json()) as Record<string, unknown>;
  }

  throw new Error("Platform pay failed after x402 retry");
}
