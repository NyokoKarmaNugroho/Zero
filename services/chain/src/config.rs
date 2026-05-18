use crate::error::{ChainError, ChainResult};
use solana_sdk::pubkey::Pubkey;
use solana_sdk::signature::Keypair;
use std::fs;
use std::str::FromStr;

pub const SAP_PROGRAM_ID: &str = "SAPpUhsWLJG1FfkGRcXagEDMrMsWGjbky7AyhGpFETZ";
pub const USDC_MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

pub struct AppConfig {
    pub rpc_url: String,
    pub grpc_addr: String,
    pub keypair: Keypair,
    pub sap_program: Pubkey,
}

impl AppConfig {
    pub fn from_env() -> ChainResult<Self> {
        dotenvy::dotenv().ok();
        dotenvy::from_filename(".env.local").ok();

        let rpc_url = std::env::var("SYNAPSE_RPC_URL")
            .map_err(|_| ChainError::Config("SYNAPSE_RPC_URL required".into()))?;

        let grpc_addr = std::env::var("CHAIN_GRPC_ADDR")
            .unwrap_or_else(|_| "127.0.0.1:50051".to_string());

        let path = std::env::var("SOLANA_KEYPAIR_PATH")
            .map_err(|_| ChainError::Config("SOLANA_KEYPAIR_PATH required".into()))?;

        let bytes: Vec<u8> = serde_json::from_slice(&fs::read(&path).map_err(|e| {
            ChainError::Config(format!("read keypair {path}: {e}"))
        })?)
        .map_err(|e| ChainError::Config(format!("parse keypair json: {e}")))?;

        let keypair = Keypair::from_bytes(&bytes)
            .map_err(|e| ChainError::Config(format!("invalid keypair: {e}")))?;

        let sap_program = Pubkey::from_str(SAP_PROGRAM_ID)
            .map_err(|e| ChainError::Config(format!("sap program id: {e}")))?;

        Ok(Self {
            rpc_url,
            grpc_addr,
            keypair,
            sap_program,
        })
    }
}
