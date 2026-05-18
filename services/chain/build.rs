fn main() -> Result<(), Box<dyn std::error::Error>> {
    tonic_build::configure()
        .build_server(true)
        .build_client(false)
        .compile(
            &["../../proto/zero/v1/common.proto", "../../proto/zero/v1/run.proto"],
            &["../../proto"],
        )?;
    Ok(())
}
