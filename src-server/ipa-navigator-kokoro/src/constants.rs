use std::{env, path::PathBuf, sync::LazyLock};

static DEFAULT_ASSETS_PATH: LazyLock<String> = LazyLock::new(|| {
    let manifest_dir = env!("CARGO_MANIFEST_DIR");
    let assets_path = PathBuf::from(manifest_dir)
        .parent()
        .unwrap()
        .join("assets")
        .to_string_lossy()
        .to_string();
    assets_path
});

pub static ASSETS_PATH: LazyLock<String> =
    LazyLock::new(|| env::var("ASSETS_PATH").unwrap_or_else(|_| DEFAULT_ASSETS_PATH.to_string()));
