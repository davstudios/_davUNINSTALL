mod uninstall;

use tauri::Manager;
use uninstall::{is_app_installed,launch_uninstaller,list_installed_apps,remove_residuals,remove_residuals_post_uninstall,remove_temp_items,reveal_path,run_uninstaller_and_wait,scan_forced_residuals,scan_residuals,scan_residuals_post_uninstall,scan_user_temp};

#[cfg_attr(mobile,tauri::mobile_entry_point)]
pub fn run(){
    tauri::Builder::default()
        .setup(|app|{
            #[cfg(target_os="windows")]
            {
                if let Some(window)=app.get_webview_window("main"){window.set_icon(tauri::include_image!("./icons/icon.ico"))?;}
            }
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![list_installed_apps,is_app_installed,launch_uninstaller,run_uninstaller_and_wait,scan_residuals,scan_residuals_post_uninstall,scan_forced_residuals,remove_residuals,remove_residuals_post_uninstall,scan_user_temp,remove_temp_items,reveal_path])
        .run(tauri::generate_context!())
        .expect("error while running _davUNINSTALL");
}

