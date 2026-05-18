mod config;
mod error;
mod grpc;
mod sap;

use config::AppConfig;
use grpc::server::chain_service;
use tracing_subscriber::EnvFilter;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive("zero_chain=info".parse()?))
        .init();

    let config = AppConfig::from_env()?;
    let addr = config.grpc_addr.parse()?;
    let svc = chain_service(config);

    tracing::info!(%addr, "zero-chain gRPC listening");
    tonic::transport::Server::builder()
        .add_service(svc)
        .serve(addr)
        .await?;

    Ok(())
}
