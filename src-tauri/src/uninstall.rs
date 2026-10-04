use serde::{Deserialize,Serialize};
use serde_json::{json,Value};
use std::collections::{HashMap,HashSet};
use std::fs;
use std::hash::{Hash,Hasher};
use std::path::{Path,PathBuf};
use std::process::Command;
use std::time::{SystemTime,UNIX_EPOCH};
use walkdir::WalkDir;

#[cfg(target_os="windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os="windows")]
const CREATE_NO_WINDOW:u32=0x08000000;

#[cfg(target_os="windows")]
fn hidden_windows_command(program:&str)->Command{
    let mut command=Command::new(program);
    command.creation_flags(CREATE_NO_WINDOW);
    command
}

#[derive(Clone,Debug,Serialize,Deserialize)]
#[serde(rename_all="camelCase")]
pub struct InstalledApp{
    pub id:String,
    pub name:String,
    pub version:String,
    pub publisher:String,
    pub install_location:String,
    pub uninstall_string:String,
    pub source:String,
    pub can_uninstall:bool,
    pub registry_key:String,
}

#[derive(Clone,Debug,Serialize,Deserialize)]
#[serde(rename_all="camelCase")]
pub struct ResidualItem{
    pub id:String,
    pub kind:String,
    pub path:String,
    pub bytes:u64,
    pub reason:String,
    pub confidence:String,
    pub safe_to_remove:bool,
    #[serde(default)]
    pub value_name:String,
}

#[derive(Clone,Debug,Serialize,Deserialize)]
#[serde(rename_all="camelCase")]
pub struct ResidualReport{
    pub app_id:String,
    pub app_name:String,
    pub still_installed:bool,
    pub filesystem:Vec<ResidualItem>,
    pub registry:Vec<ResidualItem>,
    pub total_bytes:u64,
}

#[derive(Clone,Debug,Serialize,Deserialize)]
#[serde(rename_all="camelCase")]
pub struct ForcedScanResult{
    pub app:InstalledApp,
    pub report:ResidualReport,
}

#[derive(Clone,Debug,Serialize,Deserialize)]
#[serde(rename_all="camelCase")]
pub struct CleanupRequest{
    pub app:InstalledApp,
    pub item_ids:Vec<String>,
}

#[derive(Clone,Debug,Serialize,Deserialize)]
#[serde(rename_all="camelCase")]
pub struct CleanupResult{
    pub removed:usize,
    pub verified_removed:usize,
    pub skipped:usize,
    #[serde(default)]
    pub already_absent:usize,
    pub errors:Vec<String>,
    pub remaining:Vec<String>,
    pub backup_dir:String,
}

#[derive(Clone,Debug,Serialize,Deserialize)]
#[serde(rename_all="camelCase")]
pub struct TempItem{
    pub id:String,
    pub path:String,
    pub bytes:u64,
    pub age_days:u64,
    pub safe_to_remove:bool,
}

#[derive(Clone,Debug,Serialize,Deserialize)]
#[serde(rename_all="camelCase")]
pub struct TempReport{
    pub supported:bool,
    pub root:String,
    pub min_age_days:u64,
    pub items:Vec<TempItem>,
    pub total_bytes:u64,
}

#[derive(Clone,Debug,Serialize,Deserialize)]
#[serde(rename_all="camelCase")]
pub struct TempCleanupRequest{
    pub min_age_days:u64,
    pub item_ids:Vec<String>,
}

fn stable_id(value:&str)->String{
    let mut hasher=std::collections::hash_map::DefaultHasher::new();
    value.hash(&mut hasher);
    format!("{:016x}",hasher.finish())
}

fn normalize(value:&str)->String{value.chars().filter(|c|c.is_alphanumeric()).flat_map(|c|c.to_lowercase()).collect()}
fn now_secs()->u64{SystemTime::now().duration_since(UNIX_EPOCH).map(|d|d.as_secs()).unwrap_or(0)}
fn text(value:Option<&Value>)->String{value.and_then(Value::as_str).unwrap_or("").trim().to_string()}

fn is_link_or_reparse(path:&Path)->bool{
    let Ok(metadata)=fs::symlink_metadata(path)else{return true;};
    if metadata.file_type().is_symlink(){return true;}
    #[cfg(target_os="windows")]
    {
        use std::os::windows::fs::MetadataExt;
        if metadata.file_attributes()&0x400!=0{return true;}
    }
    false
}

fn dir_size(path:&Path)->u64{
    if is_link_or_reparse(path){return 0;}
    if path.is_file(){return fs::metadata(path).map(|m|m.len()).unwrap_or(0);}
    WalkDir::new(path).follow_links(false).into_iter().filter_map(Result::ok).filter(|entry|!is_link_or_reparse(entry.path())&&entry.file_type().is_file()).filter_map(|entry|entry.metadata().ok().map(|m|m.len())).sum()
}

fn backup_root()->PathBuf{
    #[cfg(target_os="windows")]
    let root=std::env::var_os("LOCALAPPDATA").map(PathBuf::from).unwrap_or_else(std::env::temp_dir);
    #[cfg(target_os="macos")]
    let root=std::env::var_os("HOME").map(PathBuf::from).unwrap_or_else(std::env::temp_dir).join("Library/Application Support");
    #[cfg(all(not(target_os="windows"),not(target_os="macos")))]
    let root=std::env::var_os("HOME").map(PathBuf::from).unwrap_or_else(std::env::temp_dir).join(".local/share");
    root.join("_davUNINSTALL").join("backups").join(now_secs().to_string())
}

#[cfg(target_os="windows")]
fn powershell(script:&str)->Result<String,String>{
    let output=hidden_windows_command("powershell.exe").args(["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-Command",script]).output().map_err(|e|e.to_string())?;
    if !output.status.success(){return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());}
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}

#[cfg(target_os="windows")]
fn list_windows()->Result<Vec<InstalledApp>,String>{
    let script=r#"$roots=@('HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*','HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*');$items=Get-ItemProperty $roots -ErrorAction SilentlyContinue|Where-Object{$_.DisplayName -and $_.SystemComponent -ne 1}|ForEach-Object{$command=if($_.UninstallString){$_.UninstallString}elseif($_.QuietUninstallString){$_.QuietUninstallString}else{''};[PSCustomObject]@{DisplayName=$_.DisplayName;DisplayVersion=$_.DisplayVersion;Publisher=$_.Publisher;InstallLocation=$_.InstallLocation;UninstallString=$command;RegistryPath=($_.PSPath.Substring($_.PSPath.IndexOf('::')+2))}};$items|Sort-Object DisplayName,DisplayVersion -Unique|ConvertTo-Json -Compress"#;
    let raw=powershell(script)?;
    if raw.is_empty(){return Ok(Vec::new());}
    let parsed:Value=serde_json::from_str(&raw).map_err(|e|e.to_string())?;
    let values=match parsed{Value::Array(items)=>items,item=>vec![item]};
    let mut apps=Vec::new();
    let mut seen=HashSet::new();
    for item in values{
        let name=text(item.get("DisplayName"));
        if name.is_empty(){continue;}
        let registry_key=text(item.get("RegistryPath"));
        let uninstall=text(item.get("UninstallString"));
        let id=stable_id(if registry_key.is_empty(){&name}else{&registry_key});
        if !seen.insert(id.clone()){continue;}
        apps.push(InstalledApp{id,name,version:text(item.get("DisplayVersion")),publisher:text(item.get("Publisher")),install_location:text(item.get("InstallLocation")),uninstall_string:uninstall.clone(),source:"Windows Registry".into(),can_uninstall:!uninstall.is_empty(),registry_key});
    }
    apps.sort_by(|a,b|a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(apps)
}

#[cfg(target_os="macos")]
fn list_macos()->Result<Vec<InstalledApp>,String>{
    let mut roots=vec![PathBuf::from("/Applications")];
    if let Some(home)=std::env::var_os("HOME"){roots.push(PathBuf::from(home).join("Applications"));}
    let mut apps=Vec::new();
    for root in roots{
        let Ok(entries)=fs::read_dir(root)else{continue;};
        for entry in entries.flatten(){
            let path=entry.path();
            if path.extension().and_then(|v|v.to_str()).map(|v|v.eq_ignore_ascii_case("app"))!=Some(true){continue;}
            let name=path.file_stem().and_then(|v|v.to_str()).unwrap_or("Application").to_string();
            let location=path.to_string_lossy().to_string();
            apps.push(InstalledApp{id:stable_id(&location),name,version:String::new(),publisher:String::new(),install_location:location,uninstall_string:String::new(),source:"macOS Applications".into(),can_uninstall:false,registry_key:String::new()});
        }
    }
    apps.sort_by(|a,b|a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(apps)
}

#[cfg(all(not(target_os="windows"),not(target_os="macos")))]
fn list_linux()->Result<Vec<InstalledApp>,String>{
    let mut apps=Vec::new();
    if let Ok(output)=Command::new("dpkg-query").args(["-W","-f=${binary:Package}\t${Version}\t${binary:Summary}\n"]).output(){
        if output.status.success(){
            for line in String::from_utf8_lossy(&output.stdout).lines(){
                let mut parts=line.splitn(3,'\t');
                let name=parts.next().unwrap_or("").trim().to_string();
                if name.is_empty(){continue;}
                let version=parts.next().unwrap_or("").trim().to_string();
                apps.push(InstalledApp{id:stable_id(&format!("dpkg:{name}")),name,version,publisher:String::new(),install_location:String::new(),uninstall_string:String::new(),source:"dpkg".into(),can_uninstall:false,registry_key:String::new()});
            }
        }
    }
    if let Ok(output)=Command::new("flatpak").args(["list","--app","--columns=application,name,version"]).output(){
        if output.status.success(){
            for line in String::from_utf8_lossy(&output.stdout).lines(){
                let parts:Vec<_>=line.split('\t').collect();
                if parts.is_empty(){continue;}
                let app_id=parts[0].trim();
                if app_id.is_empty(){continue;}
                let name=parts.get(1).map(|v|v.trim()).filter(|v|!v.is_empty()).unwrap_or(app_id).to_string();
                let version=parts.get(2).map(|v|v.trim()).unwrap_or("").to_string();
                apps.push(InstalledApp{id:stable_id(&format!("flatpak:{app_id}")),name,version,publisher:String::new(),install_location:String::new(),uninstall_string:String::new(),source:"Flatpak".into(),can_uninstall:false,registry_key:String::new()});
            }
        }
    }
    apps.sort_by(|a,b|a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(apps)
}

fn installed_apps()->Result<Vec<InstalledApp>,String>{
    #[cfg(target_os="windows")]
    {list_windows()}
    #[cfg(target_os="macos")]
    {list_macos()}
    #[cfg(all(not(target_os="windows"),not(target_os="macos")))]
    {list_linux()}
}

#[tauri::command]
pub async fn list_installed_apps()->Result<Vec<InstalledApp>,String>{
    tauri::async_runtime::spawn_blocking(installed_apps).await.map_err(|error|format!("Lettura applicazioni interrotta: {error}"))?
}

fn still_installed(app:&InstalledApp)->bool{
    #[cfg(target_os="windows")]
    {
        if app.source=="Windows Registry"&&!app.registry_key.trim().is_empty(){
            return hidden_windows_command("reg.exe").args(["query",app.registry_key.as_str()]).output().map(|output|output.status.success()).unwrap_or(true);
        }
    }
    installed_apps().map(|apps|apps.iter().any(|current|current.id==app.id||(app.source=="Forced Scan"&&normalize(&current.name)==normalize(&app.name)))).unwrap_or(true)
}

#[tauri::command]
pub async fn is_app_installed(app:InstalledApp)->Result<bool,String>{
    tauri::async_runtime::spawn_blocking(move||still_installed(&app)).await.map_err(|error|format!("Verifica installazione interrotta: {error}"))
}

fn split_words(value:&str)->Vec<String>{
    value.split(|c:char|!c.is_alphanumeric()).map(|part|part.trim().to_lowercase()).filter(|part|!part.is_empty()).collect()
}

fn push_unique(values:&mut Vec<String>,value:String,min_len:usize){
    let normalized=normalize(&value);
    if normalized.len()<min_len{return;}
    if !values.iter().any(|item|normalize(item)==normalized){values.push(value);}
}

fn publisher_words(app:&InstalledApp)->Vec<String>{
    let ignored=["inc","incorporated","llc","ltd","limited","corp","corporation","company","co","software","systems","system","technologies","technology","gmbh","srl","spa"];
    split_words(&app.publisher).into_iter().filter(|word|word.len()>=3&&!ignored.contains(&word.as_str())).collect()
}

fn product_terms(app:&InstalledApp)->Vec<String>{
    let mut terms=Vec::new();
    push_unique(&mut terms,app.name.trim().to_string(),3);
    let vendor:HashSet<String>=publisher_words(app).into_iter().collect();
    let words=split_words(&app.name);
    let reduced=words.iter().filter(|word|!vendor.contains(*word)).cloned().collect::<Vec<_>>();
    if !reduced.is_empty(){push_unique(&mut terms,reduced.join(" "),4);}
    if words.len()>1{
        let tail=words[1..].join(" ");
        push_unique(&mut terms,tail,5);
    }
    terms.sort_by_key(|value|std::cmp::Reverse(normalize(value).len()));
    terms
}

fn publisher_terms(app:&InstalledApp)->Vec<String>{
    let mut terms=Vec::new();
    if !app.publisher.trim().is_empty(){push_unique(&mut terms,app.publisher.trim().to_string(),3);}
    for word in publisher_words(app){push_unique(&mut terms,word,3);}
    terms
}

fn normalized_file_name(path:&Path)->String{
    let raw=if path.is_file(){path.file_stem().or_else(||path.file_name())}else{path.file_name()};
    raw.and_then(|value|value.to_str()).map(normalize).unwrap_or_default()
}

fn path_matches_terms(path:&Path,terms:&[String],allow_contains:bool)->bool{
    let name=normalized_file_name(path);
    if name.is_empty(){return false;}
    terms.iter().any(|term|{
        let needle=normalize(term);
        !needle.is_empty()&&(name==needle||(allow_contains&&needle.len()>=6&&name.contains(&needle)))
    })
}

fn push_fs_candidate(items:&mut Vec<ResidualItem>,seen:&mut HashSet<String>,path:PathBuf,reason:&str,confidence:&str,safe:bool){
    if !path.exists()||is_link_or_reparse(&path){return;}
    let key=path.to_string_lossy().to_string();
    if !seen.insert(key.to_lowercase()){return;}
    items.push(ResidualItem{id:stable_id(&format!("file:{key}")),kind:"filesystem".into(),path:key,bytes:dir_size(&path),reason:reason.into(),confidence:confidence.into(),safe_to_remove:safe,value_name:String::new()});
}

fn scan_fs_root(items:&mut Vec<ResidualItem>,seen:&mut HashSet<String>,root:&Path,terms:&[String],max_depth:usize,allow_contains:bool,reason:&str,safe:bool){
    if !root.exists()||terms.is_empty(){return;}
    for entry in WalkDir::new(root).follow_links(false).max_depth(max_depth).into_iter().filter_map(Result::ok){
        if entry.depth()==0||entry.file_type().is_symlink(){continue;}
        let path=entry.path();
        if path_matches_terms(path,terms,allow_contains){push_fs_candidate(items,seen,path.to_path_buf(),reason,"high",safe);}
    }
}

fn prune_nested_fs_candidates(mut items:Vec<ResidualItem>)->Vec<ResidualItem>{
    items.sort_by_key(|item|Path::new(&item.path).components().count());
    let mut kept:Vec<ResidualItem>=Vec::new();
    for item in items{
        let lower=item.path.to_lowercase();
        let nested=kept.iter().any(|parent|{
            let base=parent.path.to_lowercase();
            lower!=base&&(lower.starts_with(&(base.clone()+"\\"))||lower.starts_with(&(base+"/")))
        });
        if !nested{kept.push(item);}
    }
    kept
}

fn filesystem_candidates(app:&InstalledApp,safe:bool)->Vec<ResidualItem>{
    let mut items=Vec::new();
    let mut seen=HashSet::new();
    let product=product_terms(app);
    if !app.install_location.trim().is_empty(){
        let path=PathBuf::from(app.install_location.trim());
        push_fs_candidate(&mut items,&mut seen,path,"Percorso di installazione registrato","exact",safe);
    }
    #[cfg(target_os="windows")]
    {
        let mut roots=Vec::<PathBuf>::new();
        for key in ["PROGRAMFILES","PROGRAMFILES(X86)","PROGRAMDATA","APPDATA","LOCALAPPDATA","COMMONPROGRAMFILES","COMMONPROGRAMFILES(X86)"]{
            if let Some(value)=std::env::var_os(key){let path=PathBuf::from(value);if path.exists()&&!roots.contains(&path){roots.push(path);}}
        }
        if let Some(profile)=std::env::var_os("USERPROFILE"){
            let profile=PathBuf::from(profile);
            for path in [profile.join("AppData").join("LocalLow"),profile.join("Documents"),profile.join("Desktop")]{if path.exists(){roots.push(path);}}
        }
        if let Some(temp)=std::env::var_os("TEMP"){roots.push(PathBuf::from(temp));}
        let publisher=publisher_terms(app);
        let full_product=product.first().cloned().into_iter().collect::<Vec<_>>();
        for root in &roots{
            scan_fs_root(&mut items,&mut seen,root,&full_product,2,false,"Elemento con nome applicazione esatto in una posizione software nota",safe);
            if root.to_string_lossy().to_lowercase().contains("temp"){
                scan_fs_root(&mut items,&mut seen,root,&full_product,3,true,"Residuo temporaneo attribuibile al nome dell'applicazione",safe);
            }
            if !publisher.is_empty(){
                let vendor_dirs=fs::read_dir(root).ok().into_iter().flat_map(|entries|entries.flatten()).map(|entry|entry.path()).filter(|path|path.is_dir()&&path_matches_terms(path,&publisher,false)).collect::<Vec<_>>();
                for vendor in vendor_dirs{
                    scan_fs_root(&mut items,&mut seen,&vendor,&product,5,true,"Residuo dell'applicazione dentro la cartella del produttore",safe);
                }
            }
        }
        if let Some(appdata)=std::env::var_os("APPDATA"){
            let start=PathBuf::from(appdata).join("Microsoft").join("Windows").join("Start Menu").join("Programs");
            scan_fs_root(&mut items,&mut seen,&start,&full_product,5,true,"Collegamento o cartella del menu Start",safe);
        }
        if let Some(programdata)=std::env::var_os("PROGRAMDATA"){
            let start=PathBuf::from(programdata).join("Microsoft").join("Windows").join("Start Menu").join("Programs");
            scan_fs_root(&mut items,&mut seen,&start,&full_product,5,true,"Collegamento o cartella del menu Start",safe);
        }
    }
    #[cfg(target_os="macos")]
    {
        if let Some(home)=std::env::var_os("HOME"){
            let home=PathBuf::from(home);
            for root in [home.join("Library/Application Support"),home.join("Library/Caches"),home.join("Library/Preferences")]{
                scan_fs_root(&mut items,&mut seen,&root,&product,3,true,"Elemento utente attribuibile all'applicazione",safe);
            }
        }
    }
    #[cfg(all(not(target_os="windows"),not(target_os="macos")))]
    {
        if let Some(home)=std::env::var_os("HOME"){
            let home=PathBuf::from(home);
            for root in [home.join(".config"),home.join(".cache"),home.join(".local/share")]{
                scan_fs_root(&mut items,&mut seen,&root,&product,3,true,"Elemento utente attribuibile all'applicazione",safe);
            }
        }
    }
    prune_nested_fs_candidates(items)
}

#[cfg(target_os="windows")]
fn reg_subkeys(parent:&str)->Vec<String>{
    let Ok(output)=hidden_windows_command("reg.exe").args(["query",parent]).output()else{return Vec::new();};
    if !output.status.success(){return Vec::new();}
    String::from_utf8_lossy(&output.stdout).lines().map(str::trim).filter(|line|line.starts_with("HKEY_")&&*line!=parent).map(str::to_string).collect()
}

#[cfg(target_os="windows")]
fn exact_registry_children(parent:&str,terms:&[String])->Vec<String>{
    reg_subkeys(parent).into_iter().filter(|key|{
        let leaf=key.rsplit('\\').next().map(normalize).unwrap_or_default();
        terms.iter().any(|term|leaf==normalize(term))
    }).collect()
}

#[cfg(target_os="windows")]
#[derive(Clone,Debug)]
struct RegistrySearchMatch{key:String,value_name:String,value_data:String}

#[cfg(target_os="windows")]
fn parse_reg_search(output:&[u8])->Vec<RegistrySearchMatch>{
    let mut current=String::new();
    let mut matches=Vec::new();
    for raw in String::from_utf8_lossy(output).lines(){
        let line=raw.trim();
        if line.starts_with("HKEY_"){
            current=line.to_string();
            matches.push(RegistrySearchMatch{key:current.clone(),value_name:String::new(),value_data:String::new()});
            continue;
        }
        if current.is_empty()||line.is_empty()||line.starts_with("End of search")||line.starts_with("Fine ricerca"){continue;}
        let parts=line.split_whitespace().collect::<Vec<_>>();
        if let Some(index)=parts.iter().position(|part|part.starts_with("REG_")){
            if index>=1{
                let value_name=parts[..index].join(" ");
                let value_data=if index+1<parts.len(){parts[index+1..].join(" ")}else{String::new()};
                matches.push(RegistrySearchMatch{key:current.clone(),value_name,value_data});
            }
        }
    }
    matches
}

#[cfg(target_os="windows")]
fn reg_search(root:&str,needle:&str)->Vec<RegistrySearchMatch>{
    if needle.trim().is_empty(){return Vec::new();}
    let Ok(output)=hidden_windows_command("reg.exe").args(["query",root,"/f",needle,"/s"]).output()else{return Vec::new();};
    if !output.status.success()&&output.stdout.is_empty(){return Vec::new();}
    parse_reg_search(&output.stdout)
}

#[cfg(target_os="windows")]
fn extract_guids(value:&str)->Vec<String>{
    let chars:Vec<char>=value.chars().collect();
    let mut out=Vec::new();
    let mut i=0usize;
    while i<chars.len(){
        if chars[i]=='{'{
            if let Some(end)=chars[i+1..].iter().position(|ch|*ch=='}').map(|offset|i+1+offset){
                let candidate:String=chars[i..=end].iter().collect();
                let body=&candidate[1..candidate.len()-1];
                if body.len()>=32&&body.chars().all(|ch|ch.is_ascii_hexdigit()||ch=='-'){if !out.contains(&candidate){out.push(candidate);}}
                i=end+1;continue;
            }
        }
        i+=1;
    }
    out
}

#[cfg(target_os="windows")]
fn registry_candidate(id_seed:&str,kind:&str,path:String,value_name:String,reason:&str,confidence:&str,safe:bool)->ResidualItem{
    ResidualItem{id:stable_id(id_seed),kind:kind.into(),path,bytes:0,reason:reason.into(),confidence:confidence.into(),safe_to_remove:safe,value_name}
}

#[cfg(target_os="windows")]
fn registry_candidates(app:&InstalledApp,safe:bool)->Vec<ResidualItem>{
    let product=product_terms(app);
    let full_product=product.first().cloned().into_iter().collect::<Vec<_>>();
    let reduced_product=product.iter().skip(1).cloned().collect::<Vec<_>>();
    let publisher=publisher_terms(app);
    let full_name=normalize(&app.name);
    let install_location=normalize(&app.install_location);
    let mut guids=extract_guids(&app.registry_key);
    for guid in extract_guids(&app.uninstall_string){if !guids.contains(&guid){guids.push(guid);}}
    let direct_roots=["HKEY_CURRENT_USER\\Software","HKEY_LOCAL_MACHINE\\Software","HKEY_LOCAL_MACHINE\\Software\\WOW6432Node"];
    let trace_roots=[
        "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
        "HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
        "HKEY_LOCAL_MACHINE\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run",
        "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FeatureUsage",
        "HKEY_CURRENT_USER\\Software\\Classes\\Applications",
        "HKEY_LOCAL_MACHINE\\Software\\Classes\\Applications",
        "HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\App Paths",
        "HKEY_LOCAL_MACHINE\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\App Paths"
    ];
    let uninstall_roots=[
        "HKEY_CURRENT_USER\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        "HKEY_LOCAL_MACHINE\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall",
        "HKEY_LOCAL_MACHINE\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall"
    ];
    let installer_roots=["HKEY_LOCAL_MACHINE\\Software\\Classes\\Installer\\Products"];
    let mut items=Vec::new();
    let mut seen=HashSet::new();
    if !app.registry_key.is_empty()&&registry_exists(&app.registry_key){
        let id=stable_id(&format!("reg:{}",app.registry_key));
        if seen.insert(id){items.push(registry_candidate(&format!("reg:{}",app.registry_key),"registry",app.registry_key.clone(),String::new(),"Voce di disinstallazione registrata","exact",safe));}
    }
    let mut vendor_keys=Vec::new();
    for root in direct_roots{
        for key in exact_registry_children(root,&full_product){
            let id=stable_id(&format!("reg:{key}"));
            if seen.insert(id){items.push(registry_candidate(&format!("reg:{key}"),"registry",key,String::new(),"Chiave software con nome applicazione esatto","high",safe));}
        }
        for vendor in exact_registry_children(root,&publisher){
            if !vendor_keys.iter().any(|existing:&String|existing.eq_ignore_ascii_case(&vendor)){vendor_keys.push(vendor.clone());}
            for key in exact_registry_children(&vendor,&product){
                let id=stable_id(&format!("reg:{key}"));
                if seen.insert(id){items.push(registry_candidate(&format!("reg:{key}"),"registry",key,String::new(),"Chiave applicazione esatta dentro il produttore","high",safe));}
            }
        }
    }
    let process_match=|found:RegistrySearchMatch,vendor_context:bool,items:&mut Vec<ResidualItem>,seen:&mut HashSet<String>|{
        let key_lower=found.key.to_lowercase();
        let leaf=found.key.rsplit('\\').next().map(normalize).unwrap_or_default();
        let key_matches=full_product.iter().any(|term|{let n=normalize(term);leaf==n||(n.len()>=8&&leaf.contains(&n))})||guids.iter().any(|guid|key_lower.contains(&guid.to_lowercase()))||(vendor_context&&product.iter().any(|term|leaf==normalize(term)));
        if found.value_name.is_empty(){
            if key_matches{
                let id=stable_id(&format!("reg:{}",found.key));
                if seen.insert(id){items.push(registry_candidate(&format!("reg:{}",found.key),"registry",found.key,String::new(),"Chiave trovata dalla scansione mirata del Registro","high",safe));}
            }
            return;
        }
        let value_name_norm=normalize(&found.value_name);
        let value_data_norm=normalize(&found.value_data);
        let full_match=!full_name.is_empty()&&(value_name_norm.contains(&full_name)||value_data_norm.contains(&full_name));
        let install_match=!install_location.is_empty()&&value_data_norm.contains(&install_location);
        let guid_match=guids.iter().any(|guid|value_data_norm.contains(&normalize(guid))||key_lower.contains(&guid.to_lowercase()));
        let reduced_match=vendor_context&&reduced_product.iter().any(|term|{let n=normalize(term);n.len()>=5&&(value_name_norm.contains(&n)||value_data_norm.contains(&n))});
        let installer_product_key=key_lower.contains("\\installer\\products\\")&&found.value_name.eq_ignore_ascii_case("ProductName")&&(full_match||reduced_match);
        if installer_product_key{
            let id=stable_id(&format!("reg:{}",found.key));
            if seen.insert(id){items.push(registry_candidate(&format!("reg:{}",found.key),"registry",found.key,String::new(),"Registrazione Windows Installer riferita al prodotto","high",safe));}
        }else if full_match||install_match||guid_match||reduced_match{
            let seed=format!("regval:{}:{}",found.key,found.value_name);
            let id=stable_id(&seed);
            if seen.insert(id){items.push(registry_candidate(&seed,"registry-value",found.key,found.value_name,"Valore del Registro riferito all'applicazione","high",safe));}
        }
    };
    for root in trace_roots{
        for needle in &full_product{
            for found in reg_search(root,needle){process_match(found,false,&mut items,&mut seen);}
        }
    }
    for root in uninstall_roots{
        for needle in &full_product{
            for found in reg_search(root,needle){process_match(found,false,&mut items,&mut seen);}
        }
        for guid in &guids{
            for found in reg_search(root,guid){process_match(found,false,&mut items,&mut seen);}
        }
    }
    for root in installer_roots{
        for needle in &full_product{
            for found in reg_search(root,needle){process_match(found,false,&mut items,&mut seen);}
        }
    }
    for vendor in &vendor_keys{
        for needle in &reduced_product{
            for found in reg_search(vendor,needle){process_match(found,true,&mut items,&mut seen);}
        }
    }
    let key_targets:HashSet<String>=items.iter().filter(|item|item.kind=="registry").map(|item|item.path.to_lowercase()).collect();
    items.retain(|item|item.kind!="registry-value"||!key_targets.contains(&item.path.to_lowercase()));
    items
}

#[cfg(not(target_os="windows"))]
fn registry_candidates(_app:&InstalledApp,_safe:bool)->Vec<ResidualItem>{Vec::new()}


fn scan_residuals_sync_mode(app:InstalledApp,post_uninstall:bool)->Result<ResidualReport,String>{
    let installed=if post_uninstall{false}else{still_installed(&app)};
    let safe=!installed&&cfg!(target_os="windows");
    let filesystem=filesystem_candidates(&app,safe);
    let registry=registry_candidates(&app,safe);
    let total_bytes=filesystem.iter().map(|item|item.bytes).sum();
    Ok(ResidualReport{app_id:app.id.clone(),app_name:app.name.clone(),still_installed:installed,filesystem,registry,total_bytes})
}

fn scan_residuals_sync(app:InstalledApp)->Result<ResidualReport,String>{scan_residuals_sync_mode(app,false)}

#[tauri::command]
pub async fn scan_residuals(app:InstalledApp)->Result<ResidualReport,String>{
    tauri::async_runtime::spawn_blocking(move||scan_residuals_sync(app)).await.map_err(|error|format!("Scansione interrotta: {error}"))?
}

#[tauri::command]
pub async fn scan_residuals_post_uninstall(app:InstalledApp)->Result<ResidualReport,String>{
    tauri::async_runtime::spawn_blocking(move||scan_residuals_sync_mode(app,true)).await.map_err(|error|format!("Scansione post-disinstallazione interrotta: {error}"))?
}

fn scan_forced_residuals_sync(name:String,publisher:String,install_location:String)->Result<ForcedScanResult,String>{
    let name=name.trim().to_string();
    if normalize(&name).len()<3{return Err("Inserisci un nome applicazione valido per la scansione forzata.".into());}
    let publisher=publisher.trim().to_string();
    let install_location=install_location.trim().trim_matches('"').to_string();
    let seed=format!("forced:{}:{}:{}",name,publisher,install_location);
    let app=InstalledApp{id:stable_id(&seed),name,version:String::new(),publisher,install_location,uninstall_string:String::new(),source:"Forced Scan".into(),can_uninstall:false,registry_key:String::new()};
    let report=scan_residuals_sync(app.clone())?;
    Ok(ForcedScanResult{app,report})
}

#[tauri::command]
pub async fn scan_forced_residuals(name:String,publisher:String,install_location:String)->Result<ForcedScanResult,String>{
    tauri::async_runtime::spawn_blocking(move||scan_forced_residuals_sync(name,publisher,install_location)).await.map_err(|error|format!("Scansione forzata interrotta: {error}"))?
}

#[cfg(target_os="windows")]
fn backup_registry(path:&str,destination:&Path)->Result<(),String>{
    if !registry_exists(path){return Ok(());}
    let file=destination.join(format!("registry-{}.reg",stable_id(path)));
    let output=hidden_windows_command("reg.exe").args(["export",path,file.to_string_lossy().as_ref(),"/y"]).output().map_err(|e|e.to_string())?;
    if output.status.success(){Ok(())}else if !registry_exists(path){Ok(())}else{
        let detail=String::from_utf8_lossy(&output.stderr).trim().to_string();
        if detail.is_empty(){Err(format!("Backup registro non riuscito: {path}"))}else{Err(format!("Backup registro non riuscito: {path} — {detail}"))}
    }
}

#[cfg(target_os="windows")]
fn elevated_windows_wait(executable:&str,arguments:&[String])->Result<(),String>{
    let params=arguments.iter().map(|value|quote_windows_argument(value)).collect::<Vec<_>>().join(" ");
    let script=r#"$exe=$env:DAV_ELEVATED_EXE;$params=$env:DAV_ELEVATED_PARAMS;if([string]::IsNullOrWhiteSpace($params)){$p=Start-Process -FilePath $exe -Verb RunAs -Wait -PassThru}else{$p=Start-Process -FilePath $exe -ArgumentList $params -Verb RunAs -Wait -PassThru};exit $p.ExitCode"#;
    let status=hidden_windows_command("powershell.exe").env("DAV_ELEVATED_EXE",executable).env("DAV_ELEVATED_PARAMS",params).args(["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-Command",script]).status().map_err(|e|e.to_string())?;
    if status.success(){Ok(())}else{Err(format!("Operazione con privilegi amministrativi non riuscita: {executable}"))}
}


#[cfg(target_os="windows")]
fn registry_exists(path:&str)->bool{
    hidden_windows_command("reg.exe").args(["query",path]).output().map(|output|output.status.success()).unwrap_or(false)
}

#[cfg(target_os="windows")]
fn is_default_registry_value_name(value_name:&str)->bool{
    matches!(value_name.trim().to_lowercase().as_str(),"(default)"|"<no name>"|"(predefinito)"|"(standard)"|"(predeterminado)"|"(par défaut)")
}

#[cfg(target_os="windows")]
fn registry_value_exists(path:&str,value_name:&str)->bool{
    let mut command=hidden_windows_command("reg.exe");
    command.args(["query",path]);
    if is_default_registry_value_name(value_name){command.arg("/ve");}else{command.args(["/v",value_name]);}
    command.output().map(|output|output.status.success()).unwrap_or(false)
}

fn path_exists(path:&Path)->bool{path.exists()}

fn delete_path(path:&Path)->Result<(),String>{
    #[cfg(target_os="windows")]
    {
        let script=r#"Add-Type -AssemblyName Microsoft.VisualBasic;$p=$env:DAV_TARGET;if(Test-Path -LiteralPath $p -PathType Container){[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($p,[Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,[Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)}elseif(Test-Path -LiteralPath $p){[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($p,[Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,[Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)}"#;
        let output=hidden_windows_command("powershell.exe").env("DAV_TARGET",path).args(["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-Command",script]).output().map_err(|e|e.to_string())?;
        if output.status.success()&&!path.exists(){return Ok(());}
        let ps1=std::env::temp_dir().join(format!("davuninstall-{}.ps1",stable_id(&path.to_string_lossy())));
        let elevated_script=r#"param([string]$Target);Add-Type -AssemblyName Microsoft.VisualBasic;if(Test-Path -LiteralPath $Target -PathType Container){[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($Target,[Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,[Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)}elseif(Test-Path -LiteralPath $Target){[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($Target,[Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,[Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)}"#;
        fs::write(&ps1,elevated_script).map_err(|e|e.to_string())?;
        let args=vec!["-NoProfile".into(),"-NonInteractive".into(),"-ExecutionPolicy".into(),"Bypass".into(),"-File".into(),ps1.to_string_lossy().to_string(),path.to_string_lossy().to_string()];
        let result=elevated_windows_wait("powershell.exe",&args);
        let _=fs::remove_file(ps1);
        result?;
        if path.exists(){Err(format!("L'elemento risulta ancora presente dopo la rimozione: {}",path.to_string_lossy()))}else{Ok(())}
    }
    #[cfg(not(target_os="windows"))]
    {Err("La rimozione dei residui è in sola lettura su questa piattaforma in questa versione.".into())}
}


#[cfg(target_os="windows")]
fn execute_cleanup_plan_windows(items:&[&ResidualItem],backup:&Path)->Result<(),String>{
    if items.is_empty(){return Ok(());}
    let plan=backup.join("cleanup-plan.json");
    fs::write(&plan,serde_json::to_vec_pretty(items).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;
    let script_path=backup.join("cleanup-elevated.ps1");
    let script=r#"param([string]$PlanPath)
$ErrorActionPreference='Continue'
Add-Type -AssemblyName Microsoft.VisualBasic
$items=Get-Content -Raw -LiteralPath $PlanPath | ConvertFrom-Json
foreach($item in @($items)){
  try{
    if($item.kind -eq 'filesystem'){
      if(Test-Path -LiteralPath $item.path -PathType Container){[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($item.path,[Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,[Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)}
      elseif(Test-Path -LiteralPath $item.path){[Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($item.path,[Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs,[Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin)}
    }elseif($item.kind -eq 'registry'){
      & reg.exe query $item.path *> $null
      if($LASTEXITCODE -eq 0){& reg.exe delete $item.path /f *> $null}
    }elseif($item.kind -eq 'registry-value'){
      if($item.valueName -eq '(Default)' -or $item.valueName -eq '<NO NAME>' -or $item.valueName -eq '(Predefinito)' -or $item.valueName -eq '(Standard)' -or $item.valueName -eq '(Predeterminado)' -or $item.valueName -eq '(Par défaut)'){
        & reg.exe query $item.path /ve *> $null
        if($LASTEXITCODE -eq 0){& reg.exe delete $item.path /ve /f *> $null}
      }else{
        & reg.exe query $item.path /v $item.valueName *> $null
        if($LASTEXITCODE -eq 0){& reg.exe delete $item.path /v $item.valueName /f *> $null}
      }
    }
  }catch{}
}
"#;
    fs::write(&script_path,script).map_err(|e|e.to_string())?;
    let args=vec!["-NoProfile".into(),"-NonInteractive".into(),"-ExecutionPolicy".into(),"Bypass".into(),"-File".into(),script_path.to_string_lossy().to_string(),plan.to_string_lossy().to_string()];
    let result=elevated_windows_wait("powershell.exe",&args);
    let _=fs::remove_file(script_path);
    result
}


fn remove_residuals_sync_mode(request:CleanupRequest,post_uninstall:bool)->Result<CleanupResult,String>{
    if !post_uninstall&&still_installed(&request.app){return Err("L'app risulta ancora installata. Completa prima la disinstallazione e ripeti la scansione.".into());}
    let report=scan_residuals_sync_mode(request.app.clone(),post_uninstall)?;
    let allowed:HashMap<String,ResidualItem>=report.filesystem.into_iter().chain(report.registry.into_iter()).filter(|item|item.safe_to_remove&&(item.confidence=="exact"||item.confidence=="high")).map(|item|(item.id.clone(),item)).collect();
    let requested:HashSet<String>=request.item_ids.into_iter().collect();
    let backup=backup_root();
    fs::create_dir_all(&backup).map_err(|e|e.to_string())?;
    let manifest:Vec<&ResidualItem>=allowed.values().filter(|item|requested.contains(&item.id)).collect();
    fs::write(backup.join("manifest.json"),serde_json::to_vec_pretty(&manifest).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;
    let mut removed=0usize;
    let mut verified_removed=0usize;
    let mut skipped=0usize;
    let mut already_absent=0usize;
    let mut errors=Vec::new();
    let mut remaining=Vec::new();
    #[cfg(target_os="windows")]
    {
        let mut ready:Vec<&ResidualItem>=Vec::new();
        let mut backed_up=HashSet::<String>::new();
        for id in &requested{
            let Some(item)=allowed.get(id)else{skipped+=1;continue;};
            let exists=if item.kind=="filesystem"{path_exists(Path::new(&item.path))}else if item.kind=="registry-value"{registry_value_exists(&item.path,&item.value_name)}else{registry_exists(&item.path)};
            if !exists{already_absent+=1;continue;}
            if item.kind=="registry"||item.kind=="registry-value"{
                let backup_key=item.path.to_lowercase();
                if backed_up.insert(backup_key){
                    if let Err(error)=backup_registry(&item.path,&backup){errors.push(error);continue;}
                }
                let still_exists=if item.kind=="registry-value"{registry_value_exists(&item.path,&item.value_name)}else{registry_exists(&item.path)};
                if !still_exists{already_absent+=1;continue;}
            }
            ready.push(item);
        }
        if !ready.is_empty(){
            if let Err(error)=execute_cleanup_plan_windows(&ready,&backup){errors.push(error);}
            for item in ready{
                let gone=if item.kind=="filesystem"{!path_exists(Path::new(&item.path))}else if item.kind=="registry-value"{!registry_value_exists(&item.path,&item.value_name)}else{!registry_exists(&item.path)};
                if gone{removed+=1;verified_removed+=1;}else{
                    let display=if item.kind=="registry-value"{format!("{} -> {}",item.path,item.value_name)}else{item.path.clone()};
                    remaining.push(display);
                }
            }
        }
    }
    #[cfg(not(target_os="windows"))]
    {
        for id in requested{
            let Some(item)=allowed.get(&id)else{skipped+=1;continue;};
            if item.kind=="filesystem"{
                if !path_exists(Path::new(&item.path)){already_absent+=1;continue;}
                match delete_path(Path::new(&item.path)){
                    Ok(())=>{removed+=1;if !path_exists(Path::new(&item.path)){verified_removed+=1;}else{remaining.push(item.path.clone());}},
                    Err(error)=>errors.push(format!("{}: {}",item.path,error))
                }
            }else{skipped+=1;}
        }
    }
    if !remaining.is_empty(){errors.push(format!("{} elementi risultano ancora presenti dopo la rimozione.",remaining.len()));}
    Ok(CleanupResult{removed,verified_removed,skipped,already_absent,errors,remaining,backup_dir:backup.to_string_lossy().to_string()})
}

fn remove_residuals_sync(request:CleanupRequest)->Result<CleanupResult,String>{remove_residuals_sync_mode(request,false)}

#[tauri::command]
pub async fn remove_residuals(request:CleanupRequest)->Result<CleanupResult,String>{
    tauri::async_runtime::spawn_blocking(move||remove_residuals_sync(request)).await.map_err(|error|format!("Pulizia interrotta: {error}"))?
}

#[tauri::command]
pub async fn remove_residuals_post_uninstall(request:CleanupRequest)->Result<CleanupResult,String>{
    tauri::async_runtime::spawn_blocking(move||remove_residuals_sync_mode(request,true)).await.map_err(|error|format!("Pulizia post-disinstallazione interrotta: {error}"))?
}


#[cfg(target_os="windows")]
fn expand_windows_env(value:&str)->String{
    let chars:Vec<char>=value.chars().collect();
    let mut out=String::new();
    let mut i=0usize;
    while i<chars.len(){
        if chars[i]=='%'{
            if let Some(end)=chars[i+1..].iter().position(|c|*c=='%').map(|offset|i+1+offset){
                let key:String=chars[i+1..end].iter().collect();
                if !key.is_empty(){
                    if let Ok(replacement)=std::env::var(&key){out.push_str(&replacement);i=end+1;continue;}
                }
            }
        }
        out.push(chars[i]);
        i+=1;
    }
    out
}

#[cfg(target_os="windows")]
fn parse_windows_arguments(input:&str)->Vec<String>{
    let chars:Vec<char>=input.chars().collect();
    let mut args=Vec::new();
    let mut i=0usize;
    while i<chars.len(){
        while i<chars.len()&&chars[i].is_whitespace(){i+=1;}
        if i>=chars.len(){break;}
        let mut arg=String::new();
        let mut quoted=false;
        while i<chars.len(){
            if chars[i].is_whitespace()&&!quoted{break;}
            if chars[i]=='\\'{
                let start=i;
                while i<chars.len()&&chars[i]=='\\'{i+=1;}
                let count=i-start;
                if i<chars.len()&&chars[i]=='"'{
                    for _ in 0..count/2{arg.push('\\');}
                    if count%2==0{quoted=!quoted;}else{arg.push('"');}
                    i+=1;
                }else{
                    for _ in 0..count{arg.push('\\');}
                }
                continue;
            }
            if chars[i]=='"'{quoted=!quoted;i+=1;continue;}
            arg.push(chars[i]);
            i+=1;
        }
        args.push(arg);
        while i<chars.len()&&chars[i].is_whitespace(){i+=1;}
    }
    args
}

#[cfg(target_os="windows")]
fn split_windows_uninstall_command(command:&str)->Result<(String,Vec<String>),String>{
    let expanded=expand_windows_env(command.trim());
    if expanded.is_empty(){return Err("Comando di disinstallazione vuoto.".into());}
    let parts=parse_windows_arguments(&expanded);
    if parts.is_empty()||parts[0].trim().is_empty(){return Err("Impossibile determinare l'eseguibile del disinstallatore.".into());}
    let mut executable=parts[0].clone();
    let mut arguments=parts[1..].to_vec();
    if !expanded.starts_with('"')&&!executable.to_ascii_lowercase().ends_with(".exe"){
        let lower=expanded.to_ascii_lowercase();
        if let Some(index)=lower.find(".exe"){
            let candidate=expanded[..index+4].trim().trim_matches('"').to_string();
            let expanded_candidate=expand_windows_env(&candidate);
            if Path::new(&expanded_candidate).exists(){
                executable=expanded_candidate;
                arguments=parse_windows_arguments(expanded[index+4..].trim());
            }
        }
    }
    Ok((executable,arguments))
}

#[cfg(target_os="windows")]
fn quote_windows_argument(value:&str)->String{
    if !value.is_empty()&&!value.chars().any(|c|c.is_whitespace()||c=='"'){return value.to_string();}
    let mut out=String::from("\"");
    let mut slashes=0usize;
    for ch in value.chars(){
        if ch=='\\'{slashes+=1;continue;}
        if ch=='"'{
            for _ in 0..slashes*2+1{out.push('\\');}
            out.push('"');
            slashes=0;
            continue;
        }
        for _ in 0..slashes{out.push('\\');}
        slashes=0;
        out.push(ch);
    }
    for _ in 0..slashes*2{out.push('\\');}
    out.push('"');
    out
}

#[cfg(target_os="windows")]
fn elevated_windows_spawn(executable:&str,arguments:&[String])->Result<(),String>{
    let params=arguments.iter().map(|value|quote_windows_argument(value)).collect::<Vec<_>>().join(" ");
    let script=r#"$exe=$env:DAV_UNINSTALL_EXE;$params=$env:DAV_UNINSTALL_PARAMS;if([string]::IsNullOrWhiteSpace($params)){Start-Process -FilePath $exe -Verb RunAs}else{Start-Process -FilePath $exe -ArgumentList $params -Verb RunAs}"#;
    let status=hidden_windows_command("powershell.exe").env("DAV_UNINSTALL_EXE",executable).env("DAV_UNINSTALL_PARAMS",params).args(["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-Command",script]).status().map_err(|e|format!("Impossibile richiedere i privilegi amministrativi per '{}': {e}",executable))?;
    if status.success(){Ok(())}else{Err(format!("Avvio con privilegi amministrativi annullato o non riuscito per '{}'.",executable))}
}

#[cfg(target_os="windows")]
fn elevated_windows_uninstaller_wait(executable:&str,arguments:&[String])->Result<i32,String>{
    let params=arguments.iter().map(|value|quote_windows_argument(value)).collect::<Vec<_>>().join(" ");
    let script=r#"$exe=$env:DAV_UNINSTALL_EXE;$params=$env:DAV_UNINSTALL_PARAMS;if([string]::IsNullOrWhiteSpace($params)){$p=Start-Process -FilePath $exe -Verb RunAs -Wait -PassThru}else{$p=Start-Process -FilePath $exe -ArgumentList $params -Verb RunAs -Wait -PassThru};if($null -eq $p.ExitCode){exit 0}else{exit $p.ExitCode}"#;
    let status=hidden_windows_command("powershell.exe").env("DAV_UNINSTALL_EXE",executable).env("DAV_UNINSTALL_PARAMS",params).args(["-NoProfile","-NonInteractive","-ExecutionPolicy","Bypass","-Command",script]).status().map_err(|e|format!("Impossibile attendere il disinstallatore elevato '{}': {e}",executable))?;
    Ok(status.code().unwrap_or(-1))
}

#[cfg(target_os="windows")]
fn run_windows_uninstaller_and_wait(command:&str)->Result<i32,String>{
    let (executable,arguments)=split_windows_uninstall_command(command)?;
    let lower=executable.to_ascii_lowercase();
    let code=if lower.ends_with(".bat")||lower.ends_with(".cmd"){
        let status=Command::new("cmd.exe").args(["/D","/S","/C"]).arg(command).status().map_err(|e|format!("Impossibile avviare il disinstallatore: {e}"))?;
        status.code().unwrap_or(-1)
    }else{
        match Command::new(&executable).args(&arguments).spawn(){
            Ok(mut child)=>child.wait().map_err(|e|format!("Impossibile attendere '{}': {e}",executable))?.code().unwrap_or(-1),
            Err(error) if error.raw_os_error()==Some(740)=>elevated_windows_uninstaller_wait(&executable,&arguments)?,
            Err(error)=>return Err(format!("Impossibile avviare '{}': {error}",executable)),
        }
    };
    if matches!(code,0|1641|3010){Ok(code)}else{Err(format!("Il disinstallatore è terminato con codice {code}. La pulizia automatica è stata interrotta per sicurezza."))}
}

#[tauri::command]
pub async fn run_uninstaller_and_wait(app:InstalledApp)->Result<i32,String>{
    if !app.can_uninstall||app.uninstall_string.trim().is_empty(){return Err("Questa applicazione non espone un comando di disinstallazione gestibile.".into());}
    #[cfg(target_os="windows")]
    {tauri::async_runtime::spawn_blocking(move||run_windows_uninstaller_and_wait(&app.uninstall_string)).await.map_err(|error|format!("Attesa disinstallatore interrotta: {error}"))?}
    #[cfg(not(target_os="windows"))]
    {Err("La modalità Alta automatica è disponibile su Windows in questa versione stabile.".into())}
}

#[cfg(target_os="windows")]
fn spawn_windows_uninstaller(command:&str)->Result<(),String>{
    let (executable,arguments)=split_windows_uninstall_command(command)?;
    let lower=executable.to_ascii_lowercase();
    if lower.ends_with(".bat")||lower.ends_with(".cmd"){
        Command::new("cmd.exe").args(["/D","/S","/C"]).arg(command).spawn().map_err(|e|format!("Impossibile avviare il disinstallatore: {e}"))?;
        return Ok(());
    }
    match Command::new(&executable).args(&arguments).spawn(){
        Ok(_)=>Ok(()),
        Err(error) if error.raw_os_error()==Some(740)=>elevated_windows_spawn(&executable,&arguments),
        Err(error)=>Err(format!("Impossibile avviare '{}': {error}",executable)),
    }
}

#[tauri::command]
pub fn launch_uninstaller(app:InstalledApp)->Result<(),String>{
    if !app.can_uninstall||app.uninstall_string.trim().is_empty(){return Err("Questa piattaforma o applicazione non espone un comando di disinstallazione gestibile in questa versione.".into());}
    #[cfg(target_os="windows")]
    {
        spawn_windows_uninstaller(&app.uninstall_string)?;
        return Ok(());
    }
    #[cfg(not(target_os="windows"))]
    {Err("La disinstallazione automatica sarà abilitata su questa piattaforma in una revisione successiva.".into())}
}

fn temp_age_days(path:&Path)->Option<u64>{
    if is_link_or_reparse(path){return None;}
    let metadata=fs::symlink_metadata(path).ok()?;
    let mut newest=metadata.modified().ok()?;
    if metadata.is_dir(){
        for entry in WalkDir::new(path).follow_links(false).into_iter(){
            let entry=entry.ok()?;
            if entry.depth()==0{continue;}
            if is_link_or_reparse(entry.path()){return None;}
            let modified=fs::symlink_metadata(entry.path()).ok()?.modified().ok()?;
            if modified>newest{newest=modified;}
        }
    }
    Some(SystemTime::now().duration_since(newest).ok()?.as_secs()/86_400)
}

fn scan_user_temp_sync(min_age_days:u64)->Result<TempReport,String>{
    #[cfg(target_os="windows")]
    {
        let root=std::env::temp_dir();
        let mut items=Vec::new();
        if let Ok(entries)=fs::read_dir(&root){
            for entry in entries.flatten(){
                let path=entry.path();
                if is_link_or_reparse(&path){continue;}
                let Some(age_days)=temp_age_days(&path)else{continue;};
                if age_days<min_age_days{continue;}
                let key=path.to_string_lossy().to_string();
                items.push(TempItem{id:stable_id(&format!("temp:{key}")),path:key,bytes:dir_size(&path),age_days,safe_to_remove:true});
            }
        }
        items.sort_by(|a,b|b.bytes.cmp(&a.bytes));
        let total_bytes=items.iter().map(|item|item.bytes).sum();
        return Ok(TempReport{supported:true,root:root.to_string_lossy().to_string(),min_age_days,items,total_bytes});
    }
    #[cfg(not(target_os="windows"))]
    {Ok(TempReport{supported:false,root:String::new(),min_age_days,items:Vec::new(),total_bytes:0})}
}

#[tauri::command]
pub async fn scan_user_temp(min_age_days:u64)->Result<TempReport,String>{
    tauri::async_runtime::spawn_blocking(move||scan_user_temp_sync(min_age_days)).await.map_err(|error|format!("Analisi temporanei interrotta: {error}"))?
}

fn remove_temp_items_sync(request:TempCleanupRequest)->Result<CleanupResult,String>{
    let report=scan_user_temp_sync(request.min_age_days)?;
    if !report.supported{return Err("La pulizia temporanei conservativa è disponibile solo su Windows.".into());}
    let allowed:HashMap<String,TempItem>=report.items.into_iter().filter(|item|item.safe_to_remove).map(|item|(item.id.clone(),item)).collect();
    let requested:HashSet<String>=request.item_ids.into_iter().collect();
    let backup=backup_root();
    fs::create_dir_all(&backup).map_err(|e|e.to_string())?;
    let manifest:Vec<Value>=allowed.values().filter(|item|requested.contains(&item.id)).map(|item|json!({"id":item.id,"path":item.path,"bytes":item.bytes,"ageDays":item.age_days})).collect();
    fs::write(backup.join("temp-manifest.json"),serde_json::to_vec_pretty(&manifest).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;
    let mut removed=0usize;
    let mut verified_removed=0usize;
    let mut skipped=0usize;
    let mut already_absent=0usize;
    let mut errors=Vec::new();
    let mut remaining=Vec::new();
    for id in requested{
        let Some(item)=allowed.get(&id)else{skipped+=1;continue;};
        let target=Path::new(&item.path);
        if is_link_or_reparse(target){skipped+=1;continue;}
        if !path_exists(target){already_absent+=1;continue;}
        match delete_path(target){
            Ok(())=>{
                removed+=1;
                if !path_exists(target){verified_removed+=1;}else{remaining.push(item.path.clone());}
            },
            Err(error)=>errors.push(format!("{}: {}",item.path,error))
        }
    }
    if !remaining.is_empty(){errors.push(format!("{} elementi temporanei risultano ancora presenti dopo la rimozione.",remaining.len()));}
    Ok(CleanupResult{removed,verified_removed,skipped,already_absent,errors,remaining,backup_dir:backup.to_string_lossy().to_string()})
}

#[tauri::command]
pub async fn remove_temp_items(request:TempCleanupRequest)->Result<CleanupResult,String>{
    tauri::async_runtime::spawn_blocking(move||remove_temp_items_sync(request)).await.map_err(|error|format!("Pulizia temporanei interrotta: {error}"))?
}

#[tauri::command]
pub fn reveal_path(path:String)->Result<(),String>{
    let target=PathBuf::from(path);
    #[cfg(target_os="windows")]
    {
        let arg=format!("/select,{}",target.to_string_lossy());
        Command::new("explorer.exe").arg(arg).spawn().map_err(|e|e.to_string())?;
    }
    #[cfg(target_os="macos")]
    {Command::new("open").arg("-R").arg(&target).spawn().map_err(|e|e.to_string())?;}
    #[cfg(all(not(target_os="windows"),not(target_os="macos")))]
    {
        let open_target=if target.is_dir(){target}else{target.parent().unwrap_or(Path::new("/")).to_path_buf()};
        Command::new("xdg-open").arg(open_target).spawn().map_err(|e|e.to_string())?;
    }
    Ok(())
}

