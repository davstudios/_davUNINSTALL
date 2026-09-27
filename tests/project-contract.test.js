import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const packageJson=JSON.parse(fs.readFileSync('package.json','utf8'));
const tauri=JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json','utf8'));
const cargo=fs.readFileSync('src-tauri/Cargo.toml','utf8');
const launcher=fs.readFileSync('RUN-WINDOWS.bat','utf8');
const vite=fs.readFileSync('vite.config.js','utf8');
const backend=fs.readFileSync('src-tauri/src/uninstall.rs','utf8');
const styles=fs.readFileSync('src/styles.css','utf8');
const motion=fs.readFileSync('src/motion.css','utf8');
const main=fs.readFileSync('src/main.js','utf8');

test('Windows launcher preserves the proven suite flow',()=>{assert.match(launcher,/npm install --no-audit --no-fund/i);assert.match(launcher,/npm run desktop/i);assert.doesNotMatch(launcher,/if not exist \"node_modules/);assert.ok(launcher.indexOf('prepare-windows-dev.ps1')<launcher.indexOf('npm install --no-audit --no-fund'));});
test('Vite preserves Tauri isolation',()=>{assert.match(vite,/const host = process\.env\.TAURI_DEV_HOST/);assert.match(vite,/src-tauri/);assert.match(vite,/strictPort:true/);});
test('frontend and Tauri dependency versions match suite base',()=>{assert.equal(packageJson.dependencies['@tauri-apps/api'],'2.11.1');assert.equal(packageJson.devDependencies['@tauri-apps/cli'],'2.11.4');assert.equal(packageJson.devDependencies.vite,'8.2.2');});
test('stable metadata is coherent',()=>{const rustVersion=cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1];assert.equal(packageJson.version,'1.1.0');assert.equal(tauri.version,packageJson.version);assert.equal(rustVersion,packageJson.version);for(const path of ['README.md','CHANGELOG.md','src-tauri/icons/icon.ico'])assert.equal(fs.existsSync(path),true);});
test('safety backend revalidates and backs up registry before deletion',()=>{assert.match(backend,/still_installed\(&request\.app\)/);assert.match(backend,/scan_residuals_sync_mode\(request\.app\.clone\(\),post_uninstall\)/);assert.match(backend,/confidence=="exact"\|\|item\.confidence=="high"/);assert.match(backend,/backup_registry\(&item\.path,&backup\)/);assert.match(backend,/execute_cleanup_plan_windows/);assert.match(backend,/reg\.exe delete \$item\.path/);assert.match(backend,/SendToRecycleBin/);});
test('temporary cleanup is intentionally Windows-only in stable release',()=>{assert.match(backend,/cfg\(target_os="windows"\)/);assert.match(backend,/supported:false/);});
test('suite visual tokens and motion are present',()=>{assert.match(styles,/--accent:#006edb/);assert.match(styles,/Plus Jakarta Sans/);assert.match(main,/Comprami Un Caffè/);assert.match(motion,/--motion-ease-out/);assert.match(motion,/prefers-reduced-motion/);});

test('root layout matches the proven _davCONVERT shell',()=>{assert.match(styles,/html,body,#app\{margin:0;width:100%;height:100%/);assert.match(styles,/\.shell\{display:grid;grid-template-columns:220px 1fr;height:100vh\}/);assert.match(styles,/\.sidebar\{background:/);assert.match(styles,/\.main\{min-width:0;overflow:auto;padding:/);});

test('shell keeps toast outside the grid like _davCONVERT',()=>{assert.match(main,/<main class="main">\$\{content\}<\/main><\/div>[\s\S]*<div id="toast-region"><\/div>/);assert.doesNotMatch(main,/<main class="main">\$\{content\}<\/main><div id="toast-region"/);});
test('suite shell uses full viewport height',()=>{assert.match(styles,/\.shell\{display:grid;grid-template-columns:220px 1fr;height:100vh\}/);assert.match(styles,/\.main\{min-width:0;overflow:auto;padding:/);});

test('uninstall pages use suite motion staging',()=>{assert.match(main,/uninstall-apps-page/);assert.match(main,/uninstall-residuals-page/);assert.match(main,/uninstall-temp-page/);assert.match(main,/render\('filter'\)/);assert.match(main,/render\('selection'\)/);assert.match(motion,/dav-uninstall-row-in/);assert.match(motion,/uninstall-settings-page/);assert.match(motion,/refresh-fill-icon/);});

test('residual page uses layered suite motion',()=>{assert.match(motion,/dav-residual-banner-in/);assert.match(motion,/dav-residual-panel-left-in/);assert.match(motion,/dav-residual-panel-right-in/);assert.match(motion,/dav-residual-row-in/);assert.match(motion,/dav-residual-cleanup-in/);assert.match(motion,/data-motion-mode=\"selection\"[\s\S]*uninstall-residuals-page \.residual-row/);});


test('cleanup result verifies removal before reporting success',()=>{
  assert.match(backend,/verified_removed/);
  assert.match(backend,/remaining:Vec<String>/);
  assert.match(backend,/registry_exists/);
  assert.match(backend,/path_exists/);
  assert.match(main,/cleanupResultCard/);
  assert.match(main,/verifiedRemoved/);
});

test('Windows uninstaller launcher parses quoted executable paths directly',()=>{
  assert.match(backend,/fn split_windows_uninstall_command/);
  assert.match(backend,/fn parse_windows_arguments/);
  assert.match(backend,/spawn_windows_uninstaller\(&app\.uninstall_string\)/);assert.match(backend,/raw_os_error\(\)==Some\(740\)/);assert.match(backend,/elevated_windows_spawn/);
  assert.doesNotMatch(backend,/args\(\["\/S","\/C",app\.uninstall_string\.as_str\(\)\]\)/);
});


test('deep residual scan searches product traces without targeting shared vendor roots',()=>{
  assert.match(backend,/fn product_terms/);
  assert.match(backend,/PROGRAMFILES/);
  assert.match(backend,/COMMONPROGRAMFILES/);
  assert.match(backend,/LocalLow/);
  assert.match(backend,/Start Menu/);
  assert.match(backend,/fn reg_search/);
  assert.match(backend,/registry-value/);
  assert.match(backend,/ProductName/);
  assert.match(backend,/vendor_keys/);
  assert.match(backend,/prune_nested_fs_candidates/);
});

test('protected cleanup can elevate and verifies keys and values',()=>{
  assert.match(backend,/fn elevated_windows_wait/);
  assert.match(backend,/registry_value_exists/);
  assert.match(backend,/verified_removed/);
  assert.match(backend,/SendToRecycleBin/);
});


test('residual UI exposes safe bulk selection',()=>{assert.match(main,/data-action="select-safe"/);assert.match(main,/safeItems\(state\.report\)/);});


test('deep cleanup uses a single elevated cleanup plan after revalidation',()=>{assert.match(backend,/fn execute_cleanup_plan_windows/);assert.match(backend,/cleanup-plan\.json/);assert.match(backend,/cleanup-elevated\.ps1/);assert.match(backend,/elevated_windows_wait\("powershell\.exe"/);});


test('forced scan supports already-uninstalled programs safely',()=>{assert.match(backend,/pub async fn scan_forced_residuals/);assert.match(backend,/source:"Forced Scan"/);assert.match(backend,/app\.source=="Forced Scan"/);assert.match(main,/data-action="forced-scan"/);assert.match(main,/scan_forced_residuals/);});


test('registry cleanup treats vanished entries as already absent without surfacing reg.exe errors',()=>{
  assert.match(backend,/command\.output\(\)\.map\(\|output\|output\.status\.success\(\)\)/);
  assert.match(backend,/already_absent/);
  assert.match(backend,/if !exists\{already_absent\+=1;continue;\}/);
  assert.match(backend,/reg\.exe query \$item\.path \*> \$null/);
  assert.match(backend,/LASTEXITCODE -eq 0/);
});

test('deep scan and cleanup run off the UI thread',()=>{
  assert.match(backend,/pub async fn scan_residuals/);
  assert.match(backend,/pub async fn scan_forced_residuals/);
  assert.match(backend,/pub async fn remove_residuals/);
  assert.match(backend,/tauri::async_runtime::spawn_blocking/);
});


test('deep Registry scan avoids repeated full Software hive traversal',()=>{assert.doesNotMatch(backend,/let search_roots=/);assert.match(backend,/trace_roots/);assert.match(backend,/uninstall_roots/);assert.match(backend,/installer_roots/);});
test('busy operations expose visible progress instead of a silent disabled UI',()=>{assert.match(main,/busyLabel/);assert.match(main,/busy-indicator/);assert.match(styles,/busy-spinner/);assert.match(main,/Analisi profonda dei residui/);});
test('installed app enumeration also runs outside the UI thread',()=>{assert.match(backend,/pub async fn list_installed_apps/);assert.match(backend,/spawn_blocking\(installed_apps\)/);});


test('three removal control modes are exposed and persisted',()=>{
  assert.match(main,/cleanupMode:'medium'/);
  assert.match(main,/data-cleanup-mode/);
  assert.match(main,/Controllo eliminazione/);
  assert.match(main,/Basso/);
  assert.match(main,/Medio/);
  assert.match(main,/Alto/);
  assert.match(main,/davSelect\('cleanupMode'/);
});

test('High mode requires two confirmations and automates only safe residuals',()=>{
  assert.match(main,/highConfirmStage===0/);
  assert.match(main,/highConfirmStage===1/);
  assert.match(main,/Conferma 2 di 2 e avvia/);
  assert.match(main,/runHighCleanupFlow/);
  assert.match(main,/safeItems\(report\)/);
  assert.match(main,/remove_residuals/);
  assert.match(main,/itemIds:allowed\.map/);
});

test('High mode waits for the real uninstaller process and then scans stale leftovers',()=>{
  assert.match(main,/run_uninstaller_and_wait/);
  assert.match(main,/scan_residuals_post_uninstall/);
  assert.match(main,/remove_residuals_post_uninstall/);
  assert.doesNotMatch(main,/waitForUninstall/);
  assert.match(backend,/pub async fn run_uninstaller_and_wait/);
  assert.match(backend,/run_windows_uninstaller_and_wait/);
  assert.match(backend,/scan_residuals_post_uninstall/);
});


test('High mode can be stopped safely while waiting',()=>{
  assert.match(main,/autoAbortRequested/);
  assert.match(main,/data-action="cancel-auto"/);
  assert.match(main,/Interrompi/);
});

test('installed-state polling uses the registered uninstall key when available',()=>{
  assert.match(backend,/app\.source=="Windows Registry"/);
  assert.match(backend,/reg\.exe/);
  assert.match(backend,/app\.registry_key\.as_str\(\)/);
});

test('Windows launcher cleans stale _davUNINSTALL dev sessions before starting',()=>{const launcher=fs.readFileSync('RUN-WINDOWS.bat','utf8');const cleanup=fs.readFileSync('scripts/prepare-windows-dev.ps1','utf8');assert.match(launcher,/prepare-windows-dev\.ps1/);assert.match(cleanup,/Get-NetTCPConnection/);assert.match(cleanup,/@tauri-apps/);assert.match(cleanup,/taskkill\.exe \/PID/);assert.match(cleanup,/porta \$Port e ancora occupata/);});

test('Windows dev launcher does not pass a trailing-slash RepoRoot to PowerShell',()=>{
  const bat=fs.readFileSync('RUN-WINDOWS.bat','utf8');
  const prep=fs.readFileSync('scripts/prepare-windows-dev.ps1','utf8');
  assert.doesNotMatch(bat,/-RepoRoot\s+"%~dp0"/);
  assert.match(bat,/prepare-windows-dev\.ps1" -Port 17460/);
  assert.match(prep,/Trim\('"'\)/);
  assert.match(prep,/GetFullPath/);
});


test('temporary cleanup is conservative for directories and runs off the UI thread',()=>{
  assert.match(backend,/fn scan_user_temp_sync/);
  assert.match(backend,/pub async fn scan_user_temp/);
  assert.match(backend,/pub async fn remove_temp_items/);
  assert.match(backend,/spawn_blocking\(move\|\|scan_user_temp_sync/);
  assert.match(backend,/spawn_blocking\(move\|\|remove_temp_items_sync/);
  assert.match(backend,/fn is_link_or_reparse/);
  assert.match(backend,/file_attributes\(\)&0x400/);
  assert.match(backend,/if modified>newest\{newest=modified;\}/);
});

test('Italian and common localized Registry default values are handled safely',()=>{
  assert.match(backend,/is_default_registry_value_name/);
  assert.match(backend,/\(predefinito\)/i);
  assert.match(backend,/\(par défaut\)/i);
  assert.match(backend,/valueName -eq '\(Predefinito\)'/);
});

test('legacy _davSPACE backend is not compiled or referenced',()=>{const lib=fs.readFileSync('src-tauri/src/lib.rs','utf8');assert.doesNotMatch(lib,/\bmod\s+space\s*;/);assert.doesNotMatch(lib,/space::/);});

test('all platform launch and build scripts synchronize npm dependencies',()=>{
  for(const file of ['RUN-WINDOWS.bat','BUILD-WINDOWS.bat','RUN-MACOS.sh','BUILD-MACOS.sh','RUN-LINUX.sh','BUILD-LINUX.sh']){
    assert.match(fs.readFileSync(file,'utf8'),/npm install --no-audit --no-fund/i);
  }
});


test('stable release workflow publishes installers',()=>{const workflow=fs.readFileSync('.github/workflows/release.yml','utf8');assert.match(workflow,/name: Release _davUNINSTALL/);assert.match(workflow,/push:[\s\S]*tags:[\s\S]*'v\*'/);assert.match(workflow,/Verify release versions/);assert.match(workflow,/tauri-apps\/tauri-action@v1/);assert.match(workflow,/releaseDraft: false/);assert.match(workflow,/prerelease: false/);assert.match(workflow,/github\.ref_name/);});
