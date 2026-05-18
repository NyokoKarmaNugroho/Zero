import { chainRpc, type ChainClient } from "../clients/grpc-chain.js";

export async function discoverAgents(chain: ChainClient, limit = 50): Promise<string[]> {
  const res = await chainRpc.discoverSapAgents(chain, limit);
  return res.agents.map((a) => a.pubkey);
}
