use thiserror::Error;

#[derive(Debug, Error)]
pub enum ChainError {
    #[error("configuration: {0}")]
    Config(String),
    #[error("rpc: {0}")]
    Rpc(String),
    #[error("sap: {0}")]
    Sap(String),
    #[error("not found: {0}")]
    NotFound(String),
}

impl From<ChainError> for tonic::Status {
    fn from(value: ChainError) -> Self {
        match value {
            ChainError::Config(msg) => tonic::Status::failed_precondition(msg),
            ChainError::Rpc(msg) => tonic::Status::unavailable(msg),
            ChainError::Sap(msg) => tonic::Status::internal(msg),
            ChainError::NotFound(msg) => tonic::Status::not_found(msg),
        }
    }
}

pub type ChainResult<T> = Result<T, ChainError>;
