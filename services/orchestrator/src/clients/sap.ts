import { createSapClient, Pdas } from "@oobe-protocol-labs/synapse-sap-sdk";
import { Keypair, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { loadKeypair } from "./solana-wallet.js";
import type { Env } from "../config/env.js";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

function anchorWallet(keypair: Keypair) {
  return {
    publicKey: keypair.publicKey,
    signTransaction: async (tx: { partialSign: (kp: Keypair) => void }) => {
      tx.partialSign(keypair);
      return tx;
    },
    signAllTransactions: async <T extends { partialSign: (kp: Keypair) => void }>(txs: T[]) => {
      for (const tx of txs) {
        tx.partialSign(keypair);
      }
      return txs;
    },
  };
}

export async function ensureSapAgentRegistered(env: Env): Promise<string | undefined> {
  const keypair = loadKeypair(env.SOLANA_KEYPAIR_PATH);
  const client = createSapClient(env.SYNAPSE_RPC_URL, anchorWallet(keypair) as never);

  const [agent] = Pdas.getAgentPDA(keypair.publicKey);
  const [agentStats] = Pdas.getAgentStatsPDA(keypair.publicKey);
  const [globalRegistry] = Pdas.getGlobalPDA();

  try {
    const ix = await client.agent.registerAgent({
      signer: keypair,
      wallet: keypair.publicKey,
      agent,
      agentStats,
      globalRegistry,
      name: "zero-agent",
      description: "Zero hybrid autonomous agent (SAP + Ace x402)",
      capabilities: [
        {
          id: "acedata:chat",
          description: "Ace Data Cloud chat completions",
          protocol_id: "acedata",
          version: "1",
        },
        {
          id: "acedata:image",
          description: "Ace image generation",
          protocol_id: "acedata",
          version: "1",
        },
        {
          id: "acedata:video",
          description: "Ace video generation",
          protocol_id: "acedata",
          version: "1",
        },
      ],
      pricing: [
        {
          tier_id: "default",
          price_per_call: new BN(10_000),
          min_price_per_call: null,
          max_price_per_call: null,
          rate_limit: 60,
          max_calls_per_session: 500,
          burst_limit: 10,
          token_type: { usdc: {} },
          token_mint: USDC_MINT,
          token_decimals: 6,
          settlement_mode: { x402: {} },
          min_escrow_deposit: new BN(0),
          batch_interval_sec: null,
          volume_curve: null,
        },
      ],
      protocols: ["sap", "x402", "acedata"],
      agentId: keypair.publicKey.toBase58(),
      agentUri: "https://github.com/NyokoKarmaNugroho/Zero",
      x402Endpoint: "https://api.acedata.cloud",
    });

    const tx = await client.buildTransaction([ix], keypair.publicKey);
    const sig = await client.sendTransaction(tx, [keypair]);
    return sig;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("already") || msg.includes("exists") || msg.includes("0x")) {
      return undefined;
    }
    console.warn("[sap] registerAgent:", msg);
    return undefined;
  }
}
