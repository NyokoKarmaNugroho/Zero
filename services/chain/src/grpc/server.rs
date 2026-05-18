use crate::config::AppConfig;
use crate::grpc::proto::chain_service_server::{ChainService, ChainServiceServer};
use crate::grpc::proto::*;
use crate::sap::SapContext;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tonic::{Request, Response, Status};

pub struct ChainGrpc {
    sap: SapContext,
    runs: Arc<RwLock<HashMap<String, GetRunStatusResponse>>>,
}

impl ChainGrpc {
    pub fn new(config: &AppConfig) -> Self {
        Self {
            sap: SapContext::new(config),
            runs: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    fn explorer_url(sig: &str) -> String {
        format!("https://orbmarkets.io/tx/{sig}")
    }

    fn tx_proof(sig: &str, label: &str) -> TxProof {
        TxProof {
            signature: sig.to_string(),
            explorer_url: Self::explorer_url(sig),
            label: label.to_string(),
        }
    }
}

#[tonic::async_trait]
impl ChainService for ChainGrpc {
    async fn health(
        &self,
        _request: Request<HealthRequest>,
    ) -> Result<Response<HealthResponse>, Status> {
        Ok(Response::new(HealthResponse {
            service: "zero-chain".into(),
            version: env!("CARGO_PKG_VERSION").into(),
        }))
    }

    async fn ensure_agent_registered(
        &self,
        request: Request<EnsureAgentRegisteredRequest>,
    ) -> Result<Response<EnsureAgentRegisteredResponse>, Status> {
        let req = request.into_inner();
        let registered = self
            .sap
            .ensure_registered(&req.agent_name, &req.description)
            .map_err(Status::from)?;

        Ok(Response::new(EnsureAgentRegisteredResponse {
            agent_pubkey: self.sap.agent_pubkey().to_string(),
            already_registered: registered,
            registration_txs: vec![],
        }))
    }

    async fn discover_sap_agents(
        &self,
        request: Request<DiscoverSapAgentsRequest>,
    ) -> Result<Response<DiscoverSapAgentsResponse>, Status> {
        let limit = request.into_inner().limit.max(1).min(200);
        let accounts = self.sap.discover_agents(limit).map_err(Status::from)?;

        let agents = accounts
            .into_iter()
            .map(|(pubkey, _)| AgentRef {
                pubkey: pubkey.to_string(),
                name: String::new(),
                metadata_uri: String::new(),
            })
            .collect();

        Ok(Response::new(DiscoverSapAgentsResponse { agents }))
    }

    async fn run_sentinel_check(
        &self,
        request: Request<RunSentinelCheckRequest>,
    ) -> Result<Response<RunSentinelCheckResponse>, Status> {
        let req = request.into_inner();
        let (passed, score, reason) = self.sap.sentinel_check(&req.task_type, &req.query);

        Ok(Response::new(RunSentinelCheckResponse {
            passed,
            score,
            reason,
        }))
    }

    async fn create_escrow(
        &self,
        request: Request<CreateEscrowRequest>,
    ) -> Result<Response<CreateEscrowResponse>, Status> {
        let req = request.into_inner();
        let escrow_id = uuid::Uuid::new_v4().to_string();
        let sig = self
            .sap
            .create_escrow(req.amount_usdc, &req.task_id)
            .map_err(Status::from)?;

        Ok(Response::new(CreateEscrowResponse {
            escrow_id: escrow_id.clone(),
            create_tx: Some(Self::tx_proof(&sig, "escrow_create")),
        }))
    }

    async fn settle_escrow(
        &self,
        request: Request<SettleEscrowRequest>,
    ) -> Result<Response<SettleEscrowResponse>, Status> {
        let req = request.into_inner();
        let sig = self
            .sap
            .settle_escrow(&req.escrow_id)
            .map_err(Status::from)?;

        Ok(Response::new(SettleEscrowResponse {
            settle_tx: Some(Self::tx_proof(&sig, "escrow_settle")),
        }))
    }

    async fn get_run_status(
        &self,
        request: Request<GetRunStatusRequest>,
    ) -> Result<Response<GetRunStatusResponse>, Status> {
        let run_id = request.into_inner().run_id;
        let runs = self.runs.read().await;
        let status = runs
            .get(&run_id)
            .cloned()
            .ok_or_else(|| Status::not_found(format!("run {run_id}")))?;
        Ok(Response::new(status))
    }
}

pub fn chain_service(config: AppConfig) -> ChainServiceServer<ChainGrpc> {
    ChainServiceServer::new(ChainGrpc::new(&config))
}

pub async fn store_run(
    runs: Arc<RwLock<HashMap<String, GetRunStatusResponse>>>,
    response: GetRunStatusResponse,
) {
    runs.write().await.insert(response.run_id.clone(), response);
}
