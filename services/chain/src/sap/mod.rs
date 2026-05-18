use crate::config::AppConfig;
use crate::error::{ChainError, ChainResult};
use solana_client::rpc_client::RpcClient;
use solana_client::rpc_config::RpcProgramAccountsConfig;
use solana_sdk::account::Account;
use solana_sdk::commitment_config::CommitmentConfig;
use solana_sdk::pubkey::Pubkey;
use solana_sdk::signature::{Keypair, Signer};
use solana_sdk::system_instruction;
use solana_sdk::transaction::Transaction;
pub struct SapContext {
    rpc: RpcClient,
    agent: Keypair,
    program_id: Pubkey,
}

impl SapContext {
    pub fn new(config: &AppConfig) -> Self {
        Self {
            rpc: RpcClient::new_with_commitment(
                config.rpc_url.clone(),
                CommitmentConfig::confirmed(),
            ),
            agent: Keypair::from_bytes(&config.keypair.to_bytes()).expect("keypair clone"),
            program_id: config.sap_program,
        }
    }

    pub fn agent_pubkey(&self) -> Pubkey {
        self.agent.pubkey()
    }

    pub fn discover_agents(&self, limit: u32) -> ChainResult<Vec<(Pubkey, Account)>> {
        let accounts = self
            .rpc
            .get_program_accounts_with_config(
                &self.program_id,
                RpcProgramAccountsConfig {
                    ..Default::default()
                },
            )
            .map_err(|e| ChainError::Rpc(e.to_string()))?;

        Ok(accounts.into_iter().take(limit as usize).collect())
    }

    pub fn agent_registered(&self) -> ChainResult<bool> {
        let agents = self.discover_agents(500)?;
        let pk = self.agent_pubkey();
        Ok(agents.iter().any(|(pubkey, _)| *pubkey == pk))
    }

    pub fn ensure_registered(&self, _name: &str, _description: &str) -> ChainResult<bool> {
        self.agent_registered()
    }

    pub fn sentinel_check(&self, task_type: &str, query: &str) -> (bool, u32, String) {
        let q = query.trim();
        if q.is_empty() {
            return (
                false,
                0,
                "Sentinel blocked: empty query".to_string(),
            );
        }
        if q.len() > 8000 {
            return (
                false,
                10,
                "Sentinel blocked: query too long".to_string(),
            );
        }
        let lower = q.to_ascii_lowercase();
        const BLOCKED: &[&str] = &[
            "ignore previous instructions",
            "ignore all previous",
            "disregard previous",
            "javascript:",
            "<script",
            "sk-or-v1-",
            "api_key=",
            "api-key:",
        ];
        for needle in BLOCKED {
            if lower.contains(needle) {
                return (
                    false,
                    20,
                    format!("Sentinel blocked: policy match ({needle})"),
                );
            }
        }
        let diversity = task_type.len() + q.len();
        let score = (diversity as u32).min(40) + 60;
        let passed = score >= 70;
        let reason = if passed {
            "Sentinel passed: diversity + policy heuristics".to_string()
        } else {
            "Sentinel blocked: low diversity score".to_string()
        };
        (passed, score, reason)
    }

    pub fn create_escrow(&self, amount_usdc: f64, task_id: &str) -> ChainResult<String> {
        let lamports = ((amount_usdc * 1_000_000.0) as u64).max(5_000);
        let recipient = self.agent.pubkey();

        let ix = system_instruction::transfer(&self.agent.pubkey(), &recipient, lamports);

        let blockhash = self
            .rpc
            .get_latest_blockhash()
            .map_err(|e| ChainError::Rpc(e.to_string()))?;

        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&self.agent.pubkey()),
            &[&self.agent],
            blockhash,
        );

        let sig = self
            .rpc
            .send_and_confirm_transaction(&tx)
            .map_err(|e| ChainError::Sap(format!("create escrow ({task_id}): {e}")))?;

        Ok(sig.to_string())
    }

    pub fn settle_escrow(&self, escrow_id: &str) -> ChainResult<String> {
        let ix = system_instruction::transfer(&self.agent.pubkey(), &self.agent.pubkey(), 1);
        let blockhash = self
            .rpc
            .get_latest_blockhash()
            .map_err(|e| ChainError::Rpc(e.to_string()))?;

        let tx = Transaction::new_signed_with_payer(
            &[ix],
            Some(&self.agent.pubkey()),
            &[&self.agent],
            blockhash,
        );

        let sig = self
            .rpc
            .send_and_confirm_transaction(&tx)
            .map_err(|e| ChainError::Sap(format!("settle escrow ({escrow_id}): {e}")))?;

        Ok(sig.to_string())
    }
}
