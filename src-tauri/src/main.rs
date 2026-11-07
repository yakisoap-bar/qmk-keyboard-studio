#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

pub mod cli;
pub mod commands;
pub mod hid;
pub mod models;

use clap::Parser;
use cli::{run_cli, CliArgs};
use hid::queue::HidQueue;
use tauri::{LogicalSize, Manager};

fn main() {
    env_logger::init();

    // Check if CLI subcommand arguments were passed
    let args = CliArgs::parse();
    if let Some(subcmd) = args.command {
        if let Err(err) = run_cli(subcmd, args.device, args.definition) {
            eprintln!("Error: {:#}", err);
            std::process::exit(1);
        }
        return;
    }

    // Launch Tauri v2 Desktop Studio
    tauri::Builder::default()
        .manage(HidQueue::new())
        .setup(|app| {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.set_min_size(Some(LogicalSize::new(1102.0, 740.0)));
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_devices_and_definitions_cmd,
            commands::select_device_or_definition_cmd,
            commands::import_definition_cmd,
            commands::remove_definition_cmd,
            commands::get_connection_diagnostics,
            commands::connect_keyboard,
            commands::disconnect_keyboard,
            commands::install_udev_rules,
            commands::get_udev_rule_snippet,
            commands::set_single_key,
            commands::write_all_layers,
            commands::set_layout_options_cmd,
            commands::set_via_lighting_cmd,
            commands::save_macros_cmd,
            commands::poll_matrix_state_cmd,
            commands::apply_profile_cmd,
            commands::factory_reset_cmd,
        ])
        .run(tauri::generate_context!())
        .expect("error while running QMK / VIA Studio Tauri application");
}
