use std::{env, sync::LazyLock};

static DEFAULT_ASSETS_PATH: &str = "src-server/assets";
pub static ASSETS_PATH: LazyLock<String> =
    LazyLock::new(|| env::var("ASSETS_PATH").unwrap_or_else(|_| DEFAULT_ASSETS_PATH.to_string()));
