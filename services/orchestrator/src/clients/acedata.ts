import { AceDataCloud, type PaymentHandler } from "@acedatacloud/sdk";
import { createX402PaymentHandler } from "@acedatacloud/x402-client";
import { Connection } from "@solana/web3.js";
import type { Env } from "../config/env.js";
import { ACE_API_BASE_URL } from "../payments/constants.js";
import { createSolanaWalletAdapter, loadKeypair } from "./solana-wallet.js";

export function createAceDataClient(env: Env): AceDataCloud {
  const keypair = loadKeypair(env.SOLANA_KEYPAIR_PATH);
  const connection = new Connection(env.SYNAPSE_RPC_URL, "confirmed");
  const solanaWallet = createSolanaWalletAdapter(keypair, connection);

  const paymentHandler = createX402PaymentHandler({
    network: "solana",
    solanaWallet,
  }) as PaymentHandler;

  return new AceDataCloud({
    apiToken: env.acedataApiKey,
    baseURL: ACE_API_BASE_URL,
    paymentHandler,
  });
}

export async function runAceChat(
  client: AceDataCloud,
  messages: { role: string; content: string }[],
): Promise<unknown> {
  return client.openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
  });
}

export async function runAceImage(client: AceDataCloud, prompt: string): Promise<unknown> {
  return client.images.generate({
    prompt,
    model: "dall-e-3",
  });
}

export async function runAceVideo(client: AceDataCloud, prompt: string): Promise<unknown> {
  return client.video.generate({
    prompt,
    provider: "luma",
    wait: true,
  });
}
