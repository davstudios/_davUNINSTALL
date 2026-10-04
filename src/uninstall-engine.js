export function normalizeSearch(value){return String(value??'').trim().toLocaleLowerCase();}
export function filterApps(apps,query){const needle=normalizeSearch(query);if(!needle)return[...apps];return apps.filter((app)=>[app.name,app.publisher,app.version,app.source].some((value)=>normalizeSearch(value).includes(needle)));}
export function formatBytes(value){const bytes=Math.max(0,Number(value)||0);if(bytes<1024)return`${bytes} B`;const units=['KB','MB','GB','TB'];let amount=bytes;let index=-1;do{amount/=1024;index+=1;}while(amount>=1024&&index<units.length-1);return`${amount>=100?amount.toFixed(0):amount>=10?amount.toFixed(1):amount.toFixed(2)} ${units[index]}`;}
export function riskLabel(confidence,language='it'){const it={exact:'Esatto',high:'Alta',medium:'Media',low:'Bassa'};const en={exact:'Exact',high:'High',medium:'Medium',low:'Low'};return(language==='en'?en:it)[confidence]||confidence;}
export function safeItems(report){return [...(report?.filesystem||[]),...(report?.registry||[])].filter((item)=>item.safeToRemove&&(item.confidence==='exact'||item.confidence==='high'));}
export function selectedSafeIds(report,selected){const allowed=new Set(safeItems(report).map((item)=>item.id));return [...selected].filter((id)=>allowed.has(id));}
export function platformCanUninstall(app){return Boolean(app?.canUninstall&&app?.uninstallString);}


