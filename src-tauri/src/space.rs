use serde::{Deserialize,Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path,PathBuf};
use std::process::Command;
use std::sync::{Arc,atomic::{AtomicBool,Ordering}};
use std::time::UNIX_EPOCH;
use tauri::{AppHandle,Emitter,State};
use walkdir::WalkDir;

#[derive(Default)]
pub struct SpaceState{cancelled:Arc<AtomicBool>}

#[derive(Clone,Deserialize)]
#[serde(rename_all="camelCase")]
pub struct ScanRequest{pub root:String,pub include_hidden:bool,pub exclude_names:Vec<String>}

#[derive(Clone,Serialize)]
#[serde(rename_all="camelCase")]
pub struct SpaceFile{pub path:String,pub name:String,pub extension:String,pub category:String,pub size:u64,pub modified:u64}

#[derive(Clone,Serialize)]
#[serde(rename_all="camelCase")]
pub struct SpaceFolder{pub path:String,pub size:u64,pub file_count:u64}

#[derive(Clone,Serialize)]
#[serde(rename_all="camelCase")]
pub struct SpaceCategory{pub category:String,pub size:u64,pub count:u64}

#[derive(Clone,Serialize)]
#[serde(rename_all="camelCase")]
pub struct ScanResult{pub root:String,pub total_bytes:u64,pub file_count:u64,pub folder_count:u64,pub inaccessible:u64,pub cancelled:bool,pub files:Vec<SpaceFile>,pub folders:Vec<SpaceFolder>,pub categories:Vec<SpaceCategory>}

#[derive(Clone,Serialize)]
#[serde(rename_all="camelCase")]
struct SpaceProgress{files:u64,bytes:u64,current:String}

fn hidden_name(path:&Path)->bool{path.file_name().and_then(|name|name.to_str()).map(|name|name.starts_with('.')).unwrap_or(false)}

fn excluded_name(path:&Path,names:&[String])->bool{
    path.file_name().and_then(|name|name.to_str()).map(|name|names.iter().any(|item|name.eq_ignore_ascii_case(item))).unwrap_or(false)
}

fn category_for(extension:&str)->String{
    let ext=extension.to_ascii_lowercase();
    let category=if ["mp4","mkv","mov","webm","avi","m4v","wmv","flv","mpeg","mpg","ts","mts","m2ts"].contains(&ext.as_str()){"video"}
    else if ["jpg","jpeg","png","webp","avif","gif","bmp","tif","tiff","heic","heif","svg","ico","raw","cr2","nef","arw"].contains(&ext.as_str()){"image"}
    else if ["mp3","m4a","aac","wav","flac","ogg","opus","wma","aiff","alac"].contains(&ext.as_str()){"audio"}
    else if ["zip","7z","rar","tar","gz","bz2","xz","iso","dmg"].contains(&ext.as_str()){"archive"}
    else if ["pdf","doc","docx","xls","xlsx","ppt","pptx","odt","ods","odp","rtf","txt","md","csv","epub"].contains(&ext.as_str()){"document"}
    else if ["js","mjs","cjs","ts","tsx","jsx","rs","py","java","c","cpp","h","hpp","go","swift","kt","kts","php","rb","cs","html","css","scss","json","xml","yaml","yml","toml","sql","sh","ps1"].contains(&ext.as_str()){"code"}
    else{"other"};
    category.to_string()
}

fn add_folder_bytes(root:&Path,file:&Path,size:u64,folders:&mut HashMap<PathBuf,(u64,u64)>){
    let mut current=file.parent();
    while let Some(dir)=current{
        if !dir.starts_with(root){break;}
        let value=folders.entry(dir.to_path_buf()).or_insert((0,0));
        value.0=value.0.saturating_add(size);
        value.1=value.1.saturating_add(1);
        if dir==root{break;}
        current=dir.parent();
    }
}

fn scan_blocking(app:AppHandle,cancelled:Arc<AtomicBool>,request:ScanRequest)->Result<ScanResult,String>{
    let root=PathBuf::from(&request.root);
    if !root.exists(){return Err("Il percorso selezionato non esiste.".into());}
    if !root.is_dir(){return Err("Seleziona una cartella o la radice di un disco.".into());}
    cancelled.store(false,Ordering::Relaxed);
    let mut files=Vec::new();
    let mut folders:HashMap<PathBuf,(u64,u64)>=HashMap::new();
    let mut categories:HashMap<String,(u64,u64)>=HashMap::new();
    let mut total_bytes=0u64;
    let mut file_count=0u64;
    let mut folder_count=0u64;
    let mut inaccessible=0u64;
    let mut iterator=WalkDir::new(&root).follow_links(false).into_iter().filter_entry(|entry|{
        if entry.path()==root{return true;}
        if !request.include_hidden&&hidden_name(entry.path()){return false;}
        !excluded_name(entry.path(),&request.exclude_names)
    });
    while let Some(item)=iterator.next(){
        if cancelled.load(Ordering::Relaxed){break;}
        let entry=match item{Ok(entry)=>entry,Err(_)=>{inaccessible=inaccessible.saturating_add(1);continue;}};
        let file_type=entry.file_type();
        if file_type.is_symlink(){continue;}
        if file_type.is_dir(){folder_count=folder_count.saturating_add(1);folders.entry(entry.path().to_path_buf()).or_insert((0,0));continue;}
        if !file_type.is_file(){continue;}
        let metadata=match entry.metadata(){Ok(metadata)=>metadata,Err(_)=>{inaccessible=inaccessible.saturating_add(1);continue;}};
        let size=metadata.len();
        let path=entry.path();
        let extension=path.extension().and_then(|value|value.to_str()).unwrap_or("").to_ascii_lowercase();
        let category=category_for(&extension);
        let modified=metadata.modified().ok().and_then(|time|time.duration_since(UNIX_EPOCH).ok()).map(|duration|duration.as_millis() as u64).unwrap_or(0);
        total_bytes=total_bytes.saturating_add(size);
        file_count=file_count.saturating_add(1);
        add_folder_bytes(&root,path,size,&mut folders);
        let category_value=categories.entry(category.clone()).or_insert((0,0));
        category_value.0=category_value.0.saturating_add(size);
        category_value.1=category_value.1.saturating_add(1);
        files.push(SpaceFile{path:path.to_string_lossy().to_string(),name:path.file_name().and_then(|value|value.to_str()).unwrap_or("").to_string(),extension,category,size,modified});
        if file_count%250==0{
            let _=app.emit("space-progress",SpaceProgress{files:file_count,bytes:total_bytes,current:path.to_string_lossy().to_string()});
        }
    }
    files.sort_by(|a,b|b.size.cmp(&a.size));
    let mut folder_list:Vec<SpaceFolder>=folders.into_iter().map(|(path,(size,count))|SpaceFolder{path:path.to_string_lossy().to_string(),size,file_count:count}).collect();
    folder_list.sort_by(|a,b|b.size.cmp(&a.size));
    let mut category_list:Vec<SpaceCategory>=categories.into_iter().map(|(category,(size,count))|SpaceCategory{category,size,count}).collect();
    category_list.sort_by(|a,b|b.size.cmp(&a.size));
    Ok(ScanResult{root:root.to_string_lossy().to_string(),total_bytes,file_count,folder_count,inaccessible,cancelled:cancelled.load(Ordering::Relaxed),files,folders:folder_list,categories:category_list})
}

#[tauri::command]
pub async fn scan_space(app:AppHandle,state:State<'_,SpaceState>,request:ScanRequest)->Result<ScanResult,String>{
    let cancelled=state.cancelled.clone();
    tauri::async_runtime::spawn_blocking(move||scan_blocking(app,cancelled,request)).await.map_err(|error|error.to_string())?
}

#[tauri::command]
pub fn cancel_space_scan(state:State<'_,SpaceState>){state.cancelled.store(true,Ordering::Relaxed);}

#[tauri::command]
pub fn reveal_path(path:String)->Result<(),String>{
    let target=PathBuf::from(&path);
    if !target.exists(){return Err("Il percorso non esiste più.".into());}
    #[cfg(target_os="windows")]
    let status=Command::new("explorer").arg(format!("/select,{}",target.to_string_lossy())).status();
    #[cfg(target_os="macos")]
    let status=Command::new("open").arg("-R").arg(&target).status();
    #[cfg(all(unix,not(target_os="macos")))]
    let status=Command::new("xdg-open").arg(if target.is_dir(){target.clone()}else{target.parent().unwrap_or(Path::new("/")).to_path_buf()}).status();
    status.map_err(|error|error.to_string()).and_then(|status|if status.success(){Ok(())}else{Err("Impossibile aprire il percorso.".into())})
}

