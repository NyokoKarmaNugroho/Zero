import fs from "node:fs";
import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";
import type { SolanaWalletAdapter } from "@acedatacloud/x402-client";

export function loadKeypair(path: string): Keypair {
  const raw = JSON.parse(fs.readFileSync(path, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(raw));
}

export function createSolanaWalletAdapter(
  keypair: Keypair,
  connection: Connection,
): SolanaWalletAdapter {
  return {
    publicKey: {
      toBase58: () => keypair.publicKey.toBase58(),
      toString: () => keypair.publicKey.toBase58(),
    },
    async signAndSendTransaction(tx: unknown): Promise<string> {
      const vtx =
        tx instanceof VersionedTransaction
          ? tx
          : VersionedTransaction.deserialize(Buffer.from(tx as Uint8Array));
      vtx.sign([keypair]);
      const sig = await connection.sendRawTransaction(vtx.serialize(), {
        skipPreflight: false,
      });
      await connection.confirmTransaction(sig, "confirmed");
      return sig;
    },
  };
}
