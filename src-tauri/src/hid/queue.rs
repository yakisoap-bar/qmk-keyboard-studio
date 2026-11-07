use crate::hid::protocol::ViaProtocol;
use crate::models::registry::{default_definition, KeyboardDefinition};
use parking_lot::Mutex;
use std::sync::Arc;

pub struct HidSession {
    pub proto: Option<ViaProtocol>,
    pub definition: KeyboardDefinition,
}

impl Default for HidSession {
    fn default() -> Self {
        Self {
            proto: None,
            definition: default_definition(),
        }
    }
}

/// Thread-safe serialized connection and definition manager for QMK/VIA Raw HID interfaces.
/// All commands sent from the UI or CLI acquire the mutex so 32-byte request/response
/// pairs never interleave on the USB interrupt endpoint.
#[derive(Clone, Default)]
pub struct HidQueue {
    inner: Arc<Mutex<HidSession>>,
}

impl HidQueue {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(Mutex::new(HidSession::default())),
        }
    }

    pub fn is_connected(&self) -> bool {
        self.inner.lock().proto.is_some()
    }

    pub fn active_definition(&self) -> KeyboardDefinition {
        self.inner.lock().definition.clone()
    }

    pub fn set_definition(&self, definition: KeyboardDefinition) {
        self.inner.lock().definition = definition;
    }

    pub fn set_protocol(&self, proto: Option<ViaProtocol>) {
        self.inner.lock().proto = proto;
    }

    pub fn with_exclusive_lock<F, R>(&self, f: F) -> R
    where
        F: FnOnce(&mut HidSession) -> R,
    {
        let mut guard = self.inner.lock();
        f(&mut guard)
    }

    pub fn with_device<F, R>(&self, f: F) -> anyhow::Result<R>
    where
        F: FnOnce(&ViaProtocol, &KeyboardDefinition) -> anyhow::Result<R>,
    {
        let mut guard = self.inner.lock();
        let def = guard.definition.clone();
        let Some(ref proto) = guard.proto else {
            anyhow::bail!("Keyboard is not connected");
        };
        let res = f(proto, &def);
        if res.is_err() {
            // Verify if device is still alive via protocol version ping; if disconnected, drop handle
            if proto.get_protocol_version().is_err() {
                guard.proto = None;
            }
        }
        res
    }
}
