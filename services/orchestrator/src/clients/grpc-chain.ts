import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "node:path";
import { fileURLToPath } from "node:url";

const protoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../proto",
);

const packageDefinition = protoLoader.loadSync(
  [
    path.join(protoRoot, "zero/v1/common.proto"),
    path.join(protoRoot, "zero/v1/run.proto"),
  ],
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [protoRoot],
  },
);

const proto = grpc.loadPackageDefinition(packageDefinition) as grpc.GrpcObject;
const chain = (proto.zero as grpc.GrpcObject).v1 as {
  ChainService: grpc.ServiceClientConstructor;
};

export type ChainClient = InstanceType<typeof chain.ChainService>;

export function createChainClient(addr: string): ChainClient {
  return new chain.ChainService(addr, grpc.credentials.createInsecure());
}

function promisify<TReq, TRes>(
  client: ChainClient,
  method: keyof ChainClient,
  request: TReq,
): Promise<TRes> {
  return new Promise((resolve, reject) => {
    const fn = client[method] as (
      req: TReq,
      cb: (err: grpc.ServiceError | null, res: TRes) => void,
    ) => void;
    fn.call(client, request, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

export const chainRpc = {
  health: (c: ChainClient) => promisify<Record<string, never>, { service: string }>(c, "Health", {}),
  ensureAgentRegistered: (
    c: ChainClient,
    agentName: string,
    description: string,
  ) =>
    promisify<
      { agent_name: string; description: string },
      { agent_pubkey: string; already_registered: boolean; registration_txs: { signature: string }[] }
    >(c, "EnsureAgentRegistered", { agent_name: agentName, description }),
  discoverSapAgents: (c: ChainClient, limit: number) =>
    promisify<{ limit: number }, { agents: { pubkey: string }[] }>(c, "DiscoverSapAgents", {
      limit,
    }),
  runSentinelCheck: (c: ChainClient, taskId: string, taskType: string, query: string) =>
    promisify<
      { task_id: string; task_type: string; query: string },
      { passed: boolean; score: number; reason: string }
    >(c, "RunSentinelCheck", { task_id: taskId, task_type: taskType, query }),
  createEscrow: (c: ChainClient, amountUsdc: number, taskId: string) =>
    promisify<
      { amount_usdc: number; task_id: string },
      { escrow_id: string; create_tx?: { signature: string; explorer_url: string } }
    >(c, "CreateEscrow", { amount_usdc: amountUsdc, task_id: taskId }),
  settleEscrow: (c: ChainClient, escrowId: string) =>
    promisify<
      { escrow_id: string },
      { settle_tx?: { signature: string; explorer_url: string } }
    >(c, "SettleEscrow", { escrow_id: escrowId }),
};
