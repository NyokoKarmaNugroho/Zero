import { config as loadDotenv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { payAcePlatformOrder } from "../src/clients/ace-platform.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
loadDotenv({ path: path.join(root, ".env.local") });
loadDotenv({ path: path.join(root, ".env") });

const orderId = process.argv[2] ?? process.env.ACE_X402_ORDER_ID;
const platformToken = process.env.ACE_PLATFORM_TOKEN;
const evmPrivateKey = process.env.ACE_X402_PRIVATE_KEY;

if (!orderId) {
  console.error("Usage: pnpm run pay-ace-order -- <order_id>  (or set ACE_X402_ORDER_ID)");
  process.exit(1);
}
if (!platformToken) {
  console.error("ACE_PLATFORM_TOKEN is required (platform.acedata.cloud Account Token)");
  process.exit(1);
}
if (!evmPrivateKey) {
  console.error("ACE_X402_PRIVATE_KEY is required (Base USDC x402, 0x…)");
  process.exit(1);
}

const result = await payAcePlatformOrder({
  platformToken,
  evmPrivateKey,
  orderId,
});
console.log(JSON.stringify(result, null, 2));
