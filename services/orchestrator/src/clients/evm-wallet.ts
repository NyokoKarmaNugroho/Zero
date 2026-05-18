import { Wallet } from "ethers";
import type { EVMProvider } from "@acedatacloud/x402-client";

export function createEvmProvider(privateKey: string): {
  provider: EVMProvider;
  address: string;
} {
  const wallet = new Wallet(privateKey);
  const address = wallet.address;

  const provider: EVMProvider = {
    request: async ({ method, params }) => {
      if (method === "eth_signTypedData_v4") {
        const [, typedDataJson] = (params ?? []) as [string, string];
        const typedData = JSON.parse(typedDataJson) as {
          domain: Record<string, unknown>;
          types: Record<string, Array<{ name: string; type: string }>>;
          message: Record<string, unknown>;
        };
        const { TransferWithAuthorization, ...restTypes } = typedData.types;
        return wallet.signTypedData(
          typedData.domain,
          { ...restTypes, TransferWithAuthorization },
          typedData.message,
        );
      }
      if (method === "eth_accounts") {
        return [address];
      }
      throw new Error(`Unsupported EVM provider method: ${method}`);
    },
  };

  return { provider, address };
}
