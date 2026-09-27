import './styles.css';
import './motion.css';
import { getVersion } from '@tauri-apps/api/app';
import { invoke } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { filterApps, formatBytes, riskLabel, selectedSafeIds, platformCanUninstall, safeItems } from './uninstall-engine.js';

const icons={
  apps:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/></svg>',
  residuals:'<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4 4M8 8h5M8 11h4"/></svg>',
  temp:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M7 7l1 14h8l1-14"/><path d="M10 11v6M14 11v6"/></svg>',
  settings:'<svg class="nav-settings-gear" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.09a2 2 0 0 1 1 1.74v.5a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
  refresh:'<svg class="refresh-fill-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12H1.6A10.4 10.4 0 0 1 20.15 5.54V4h1.4v4.92h-4.9v-1.4h3.15A9 9 0 0 0 12 3a9.01 9.01 0 0 0-9 9Zm18 0A9 9 0 0 1 12 21a9 9 0 0 1-7.8-4.5h3.15v-1.4h-4.9V20h1.4V18.46A10.4 10.4 0 0 0 22.4 12Z"/></svg>',
  uninstall:'<svg viewBox="0 0 24 24"><path d="M8 3h8v5H8zM5 8h14v13H5zM9 12h6M12 9v6"/></svg>',
  scan:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M8 11h6M11 8v6"/></svg>',
  shield:'<svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.6 2.8 8.1 7 10 4.2-1.9 7-5.4 7-10V6z"/><path d="m9 12 2 2 4-4"/></svg>',
  folder:'<svg viewBox="0 0 24 24"><path d="M3 7h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  registry:'<svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/></svg>',
  trash:'<svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg>',
  reveal:'<svg viewBox="0 0 24 24"><path d="M3 7h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="m9 16 2 2 4-4"/></svg>',
  alert:'<svg viewBox="0 0 24 24"><path d="M12 3 2.8 20h18.4z"/><path d="M12 9v5M12 17h.01"/></svg>',
  check:'<svg viewBox="0 0 24 24"><path d="m5 12 4 4 10-10"/></svg>',
  chevron:'<svg viewBox="0 0 24 24"><path d="m7 9 5 5 5-5"/></svg>',
  sun:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon:'<svg viewBox="0 0 24 24"><path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5z"/></svg>',
  globe:'<svg viewBox="0 0 390 390" aria-hidden="true"><path d="M195,0C87.305,0,0,87.304,0,195s87.305,195,195,195s195-87.304,195-195S302.695,0,195,0z M119.524,45.678c-3.493,4.838-6.838,10.033-10.007,15.6c-4.841,8.503-9.16,17.656-12.945,27.33c-8.064-2.22-16.089-4.713-24.064-7.483C85.91,66.718,101.813,54.667,119.524,45.678z M52.298,107.694c11.438,4.293,22.976,8.056,34.591,11.293c-4.78,18.934-7.744,39.182-8.745,60.087h-49.72C30.888,153.108,39.305,128.852,52.298,107.694z M52.298,282.306c-12.994-21.159-21.411-45.414-23.874-71.38h49.72c1.002,20.905,3.965,41.153,8.745,60.087C75.274,274.25,63.736,278.013,52.298,282.306z M72.508,308.876c7.975-2.77,16-5.265,24.063-7.483c3.786,9.674,8.105,18.827,12.946,27.33c3.168,5.566,6.514,10.762,10.007,15.6C101.813,335.333,85.91,323.283,72.508,308.876z M179.074,354.07c-20.393-7.648-38.458-29.593-51.05-59.894c16.931-3.125,33.977-5.059,51.05-5.8V354.07z M179.074,256.454c-20.448,0.818-40.862,3.221-61.117,7.191c-4.16-16.355-6.908-34.13-7.915-52.72h69.032V256.454z M179.074,179.074h-69.032c1.007-18.59,3.755-36.365,7.915-52.72c20.254,3.971,40.669,6.373,61.117,7.191V179.074z M179.074,101.623c-17.073-.741-34.118-2.675-51.05-5.8c12.592-30.301,30.657-52.245,51.05-59.894V101.623z M337.703,107.697c12.993,21.157,21.409,45.412,23.872,71.377h-49.72c-1.001-20.903-3.965-41.151-8.744-60.083C314.727,115.754,326.266,111.992,337.703,107.697z M317.495,81.128c-7.975,2.77-16,5.265-24.065,7.484c-3.786-9.676-8.105-18.831-12.947-27.335c-3.169-5.566-6.514-10.762-10.006-15.6C288.189,54.668,304.092,66.72,317.495,81.128z M210.926,35.93c20.393,7.648,38.459,29.595,51.051,59.898c-16.931,3.124-33.977,5.057-51.051,5.797V35.93z M210.926,133.547c20.45-.817,40.865-3.219,61.118-7.188c4.16,16.354,6.907,34.128,7.914,52.716h-69.032V133.547z M210.926,210.926h69.032c-1.007,18.588-3.754,36.362-7.914,52.716c-20.253-3.97-40.668-6.371-61.118-7.189V210.926z M210.926,354.07v-65.694c17.075.741,34.121,2.673,51.051,5.798C249.385,324.475,231.319,346.422,210.926,354.07z M270.477,344.322c3.493-4.838,6.838-10.033,10.006-15.6c4.842-8.504,9.161-17.659,12.947-27.334c8.064,2.22,16.089,4.714,24.065,7.484C304.092,323.28,288.189,335.332,270.477,344.322z M337.703,282.304c-11.437-4.296-22.976-8.058-34.591-11.296c4.779-18.932,7.742-39.179,8.744-60.082h49.72C359.112,236.891,350.696,261.146,337.703,282.304z"/></svg>',
  coffee:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m20.216 6.415-.132-.666c-.119-.598-.388-1.163-1.001-1.379-.197-.069-.42-.098-.57-.241-.152-.143-.196-.366-.231-.572-.065-.378-.125-.756-.192-1.133-.057-.325-.102-.69-.25-.987-.195-.4-.597-.634-.996-.788a5.723 5.723 0 0 0-.626-.194c-1-.263-2.05-.36-3.077-.416a25.834 25.834 0 0 0-3.7.062c-.915.083-1.88.184-2.75.5-.318.116-.646.256-.888.501-.297.302-.393.77-.177 1.146.154.267.415.456.692.58.36.162.737.284 1.123.366 1.075.238 2.189.331 3.287.37 1.218.05 2.437.01 3.65-.118.299-.033.598-.073.896-.119.352-.054.578-.513.474-.834-.124-.383-.457-.531-.834-.473-.466.074-.96.108-1.382.146-1.177.08-2.358.082-3.536.006a22.228 22.228 0 0 1-1.157-.107c-.086-.01-.18-.025-.258-.036-.243-.036-.484-.08-.724-.13-.111-.027-.111-.185 0-.212h.005c.277-.06.557-.108.838-.147h.002c.131-.009.263-.032.394-.048a25.076 25.076 0 0 1 3.426-.12c.674.019 1.347.067 2.017.144l.228.031c.267.04.533.088.798.145.392.085.895.113 1.07.542.055.137.08.288.111.431l.319 1.484a.237.237 0 0 1-.199.284h-.003c-.037.006-.075.01-.112.015a36.704 36.704 0 0 1-4.743.295 37.059 37.059 0 0 1-4.699-.304c-.14-.017-.293-.042-.417-.06-.326-.048-.649-.108-.973-.161-.393-.065-.768-.032-1.123.161-.29.16-.527.404-.675.701-.154.316-.199.66-.267 1-.069.34-.176.707-.135 1.056.087.753.613 1.365 1.37 1.502a39.69 39.69 0 0 0 11.343.376.483.483 0 0 1 .535.53l-.071.697-1.018 9.907c-.041.41-.047.832-.125 1.237-.122.637-.553 1.028-1.182 1.171-.577.131-1.165.2-1.756.205-.656.004-1.31-.025-1.966-.022-.699.004-1.556-.06-2.095-.58-.475-.458-.54-1.174-.605-1.793l-.731-7.013-.322-3.094c-.037-.351-.286-.695-.678-.678-.336.015-.718.3-.678.679l.228 2.185.949 9.112c.147 1.344 1.174 2.068 2.446 2.272.742.12 1.503.144 2.257.156.966.016 1.942.053 2.892-.122 1.408-.258 2.465-1.198 2.616-2.657.34-3.332.683-6.663 1.024-9.995l.215-2.087a.484.484 0 0 1 .39-.426c.402-.078.787-.212 1.074-.518.455-.488.546-1.124.385-1.766zm-1.478.772c-.145.137-.363.201-.578.233-2.416.359-4.866.54-7.308.46-1.748-.06-3.477-.254-5.207-.498-.17-.024-.353-.055-.47-.18-.22-.236-.111-.71-.054-.995.052-.26.152-.609.463-.646.484-.057 1.046.148 1.526.22.577.088 1.156.159 1.737.212 2.48.226 5.002.19 7.472-.14.45-.06.899-.13 1.345-.21.399-.072.84-.206 1.08.206.166.281.188.657.162.974a.544.544 0 0 1-.169.364zm-6.159 3.9c-.862.37-1.84.788-3.109.788a5.884 5.884 0 0 1-1.569-.217l.877 9.004c.065.78.717 1.38 1.5 1.38 0 0 1.243.065 1.658.065.447 0 1.786-.065 1.786-.065.783 0 1.434-.6 1.499-1.38l.94-9.95a3.996 3.996 0 0 0-1.322-.238c-.826 0-1.491.284-2.26.613z"/></svg>'
};

const isTauri=Boolean(window.__TAURI_INTERNALS__);
const defaults={theme:'system',language:'it',tempAgeDays:7,cleanupMode:'medium'};
const saved=JSON.parse(localStorage.getItem('davuninstall-settings')||'{}');
const state={page:'apps',version:'1.0.1',apps:[],query:'',selected:null,report:null,tempReport:null,forcedName:'',forcedPublisher:'',forcedPath:'',selectedResiduals:new Set(),selectedTemps:new Set(),lastCleanup:null,lastTempCleanup:null,busy:false,busyLabel:'',confirmUninstall:false,highConfirmStage:0,confirmResiduals:false,confirmTemps:false,autoPhase:'',autoAppName:'',autoAbortRequested:false,settings:{...defaults,...saved}};

function t(it,en){return state.settings.language==='en'?en:it;}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
function resolvedTheme(){if(state.settings.theme!=='system')return state.settings.theme;return matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}
function applyTheme(){document.documentElement.dataset.theme=resolvedTheme();}
function persistSettings(){localStorage.setItem('davuninstall-settings',JSON.stringify(state.settings));applyTheme();}
function runUiTransition(kind,callback){document.documentElement.dataset.uiTransition=kind;if(document.startViewTransition){document.startViewTransition(callback).finished.finally(()=>delete document.documentElement.dataset.uiTransition);}else{callback();setTimeout(()=>delete document.documentElement.dataset.uiTransition,430);}}
function navItem(page,label,icon){return `<button class="nav-item ${state.page===page?'active':''}" data-page="${page}">${icon}<span>${label}</span></button>`;}
function shell(content,motion='page'){document.querySelector('#app').innerHTML=`<div class="shell" data-motion-mode="${motion}"><aside class="sidebar"><div class="brand"><span>_dav</span>UNINSTALL</div><nav>${navItem('apps',t('Applicazioni','Applications'),icons.apps)}${navItem('residuals',t('Residui','Residuals'),icons.residuals)}${navItem('temp',t('Temporanei','Temporary files'),icons.temp)}${navItem('settings',t('Impostazioni','Settings'),icons.settings)}</nav><div class="sidebar-bottom"><button class="coffee-button" data-action="coffee">${icons.coffee}<span>${t('Comprami Un Caffè','Buy Me A Coffee')}</span></button><button class="icon-button theme-toggle" data-action="theme" title="${t('Cambia tema','Change theme')}" aria-label="${t('Cambia tema','Change theme')}"><span class="theme-icon theme-icon-sun">${icons.sun}</span><span class="theme-icon theme-icon-moon">${icons.moon}</span></button></div></aside><main class="main">${content}</main></div>${state.busy?`<div class="busy-indicator"><span class="busy-spinner"></span><span>${escapeHtml(state.busyLabel||t('Operazione in corso…','Working…'))}</span>${state.autoPhase==='waiting'?`<button class="busy-cancel" data-action="cancel-auto">${t('Interrompi','Stop')}</button>`:''}</div>`:''}<div id="toast-region"></div>`;bindGlobal();}
function header(title,subtitle,actions=''){return `<div class="topbar"><div><div class="eyebrow">_DAVUNINSTALL · V${escapeHtml(state.version)}</div><h1>${title}</h1><p class="page-subtitle">${subtitle}</p></div><div class="top-actions">${actions}</div></div>`;}
function stat(label,value,note){return `<div class="stat-card"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`;}
function cleanupModeMeta(mode=state.settings.cleanupMode){
  const modes={
    low:{label:t('Basso','Low'),note:t('solo disinstallazione','uninstaller only')},
    medium:{label:t('Medio','Medium'),note:t('scansione manuale','manual scan')},
    high:{label:t('Alto','High'),note:t('pulizia automatica Exact/High','automatic Exact/High cleanup')}
  };
  return modes[mode]||modes.medium;
}
function cleanupModeChooser(){
  const options=[
    ['low',t('Basso','Low'),t('Disinstalla soltanto con il disinstallatore ufficiale.','Only runs the official uninstaller.')],
    ['medium',t('Medio','Medium'),t('Dopo la disinstallazione analizzi e scegli manualmente i residui.','After uninstalling, scan and choose residuals manually.')],
    ['high',t('Alto','High'),t('Doppia conferma, poi scansione e pulizia automatica dei soli residui Exact/High.','Double confirmation, then automatic scan and cleanup of Exact/High residuals only.')]
  ];
  return `<div class="cleanup-mode-block"><div class="cleanup-mode-head"><strong>${t('Controllo eliminazione','Removal control')}</strong><span>${t('Scegli quanto automatizzare il processo.','Choose how much of the process to automate.')}</span></div><div class="cleanup-mode-grid">${options.map(([value,label,note])=>`<button class="cleanup-mode-card ${state.settings.cleanupMode===value?'active':''}" data-cleanup-mode="${value}"><span>${label}</span><small>${note}</small></button>`).join('')}</div></div>`;
}
function highConfirmation(){
  if(state.settings.cleanupMode!=='high'||state.highConfirmStage===0)return '';
  const finalStep=state.highConfirmStage===2;
  return `<div class="high-confirm ${finalStep?'critical':''}">${finalStep?icons.alert:icons.shield}<div><strong>${finalStep?t('Conferma finale modalità Alta','Final High-mode confirmation'):t('Prima conferma modalità Alta','First High-mode confirmation')}</strong><span>${finalStep?t('Confermando, _davUNINSTALL avvierà il disinstallatore e poi eliminerà automaticamente tutti i residui Exact/High rivalidati.','Confirming will start the uninstaller and then automatically remove all revalidated Exact/High residuals.'):t('La modalità Alta automatizza la pulizia profonda, ma continua a escludere elementi condivisi, deboli o non attribuibili con sufficiente certezza.','High mode automates deep cleanup but still excludes shared, weak, or insufficiently attributable items.')}</span></div></div>`;
}
function autoCleanupBanner(){
  if(!state.autoPhase)return '';
  const phases={
    waiting:[t('Modalità Alta: attendo la disinstallazione','High mode: waiting for uninstall'),t('Appena il programma non risulterà più installato partiranno scansione e pulizia automatica.','Scanning and automatic cleanup will start as soon as the program is no longer detected as installed.')],
    scanning:[t('Modalità Alta: scansione profonda','High mode: deep scan'),t('Sto cercando file, cartelle, chiavi e valori del Registro attribuibili al programma appena disinstallato.','Searching for files, folders, Registry keys, and values attributable to the program just uninstalled.')],
    cleaning:[t('Modalità Alta: pulizia automatica','High mode: automatic cleanup'),t('Vedi tutti i candidati rilevati; vengono rimossi automaticamente soltanto quelli Exact/High rivalidati.','All detected candidates are visible; only revalidated Exact/High items are removed automatically.')],
    complete:[t('Modalità Alta completata','High mode completed'),t('La verifica finale è terminata. Consulta l’elenco rilevato e il riepilogo della pulizia.','Final verification is complete. Review the detected list and cleanup summary.')],
    stopped:[t('Modalità Alta interrotta in sicurezza','High mode stopped safely'),t('Il programma risulta ancora installato o il flusso automatico non ha potuto proseguire. Nessun residuo è stato eliminato automaticamente.','The program is still detected as installed or the automated flow could not continue. No residuals were automatically removed.')]
  };
  const [title,note]=phases[state.autoPhase]||phases.waiting;
  return `<div class="guard-banner ${state.autoPhase==='complete'?'success':state.autoPhase==='stopped'?'warning':''} auto-cleanup-banner">${state.autoPhase==='complete'?icons.check:state.autoPhase==='stopped'?icons.alert:icons.shield}<div><strong>${title}${state.autoAppName?` · ${escapeHtml(state.autoAppName)}`:''}</strong><span>${note}</span></div></div>`;
}
function sleep(ms){return new Promise((resolve)=>setTimeout(resolve,ms));}
function nextPaint(){return new Promise((resolve)=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));}
function render(motion='page'){if(state.page==='apps')renderApps(motion);else if(state.page==='residuals')renderResiduals(motion);else if(state.page==='temp')renderTemp(motion);else renderSettings(motion);}

function renderApps(motion='page'){
  const apps=filterApps(state.apps,state.query);
  const selected=state.selected;
  const mode=cleanupModeMeta();
  const actions=`<button class="button secondary" data-action="refresh" ${state.busy?'disabled':''}>${icons.refresh}${t('Aggiorna','Refresh')}</button>`;
  const list=apps.length?apps.map((app)=>`<button class="app-row ${selected?.id===app.id?'active':''}" data-app-id="${escapeHtml(app.id)}"><span class="app-mark">${icons.apps}</span><span class="app-copy"><strong>${escapeHtml(app.name)}</strong><small>${escapeHtml([app.publisher,app.version].filter(Boolean).join(' · ')||app.source)}</small></span><span class="app-source">${escapeHtml(app.source)}</span></button>`).join(''):`<div class="list-empty">${state.busy?t('Caricamento applicazioni…','Loading applications…'):t('Nessuna applicazione trovata.','No applications found.')}</div>`;
  let detail=`<div class="detail-empty"><div class="empty-icon">${icons.apps}</div><h2>${t('Seleziona un’applicazione','Select an application')}</h2><p>${t('Visualizza dettagli, disinstallatore registrato e modalità di eliminazione.','View details, registered uninstaller, and removal mode.')}</p></div>`;
  if(selected){
    const can=platformCanUninstall(selected);
    const uninstallLabel=state.settings.cleanupMode==='high'?(state.highConfirmStage===0?t('Avvia modalità Alta','Start High mode'):state.highConfirmStage===1?t('Conferma 1 di 2','Confirm 1 of 2'):t('Conferma 2 di 2 e avvia','Confirm 2 of 2 and start')):(state.confirmUninstall?t('Conferma disinstallazione','Confirm uninstall'):t('Avvia disinstallazione','Start uninstall'));
    const scanButton=state.settings.cleanupMode==='medium'?`<button class="button primary" data-action="scan-selected" ${state.busy?'disabled':''}>${icons.scan}${t('Analizza residui','Scan residuals')}</button>`:'';
    detail=`<div class="app-detail-head"><div class="app-avatar">${icons.apps}</div><div><span class="detail-kicker">${escapeHtml(selected.source)}</span><h2>${escapeHtml(selected.name)}</h2><p>${escapeHtml([selected.publisher,selected.version].filter(Boolean).join(' · ')||t('Dettagli non disponibili','Details unavailable'))}</p></div></div><div class="detail-grid"><div><span>${t('Versione','Version')}</span><strong>${escapeHtml(selected.version||'—')}</strong></div><div><span>${t('Produttore','Publisher')}</span><strong>${escapeHtml(selected.publisher||'—')}</strong></div><div class="wide"><span>${t('Percorso installazione','Install location')}</span><strong>${escapeHtml(selected.installLocation||'—')}</strong></div></div><div class="safety-note">${icons.shield}<div><strong>${t('Rimozione clinica','Clinical removal')}</strong><span>${t('Anche in modalità Alta vengono eliminati automaticamente soltanto candidati Exact/High; elementi condivisi o dubbi restano esclusi.','Even in High mode, only Exact/High candidates are removed automatically; shared or uncertain items remain excluded.')}</span></div></div>${cleanupModeChooser()}${highConfirmation()}<div class="detail-actions"><button class="button danger" data-action="uninstall" ${!can||state.busy?'disabled':''}>${icons.uninstall}${uninstallLabel}</button>${scanButton}${selected.installLocation?`<button class="icon-button bordered" data-reveal="${escapeHtml(selected.installLocation)}" title="${t('Mostra posizione','Reveal location')}">${icons.reveal}</button>`:''}</div>${!can?`<p class="platform-note">${t('L’avvio automatico richiede un comando di disinstallazione esposto dal sistema, principalmente su Windows.','Automatic launch requires a system-exposed uninstall command, primarily on Windows.')}</p>`:''}`;
  }
  shell(`${header(t('Applicazioni','Applications'),t('Disinstalla scegliendo il livello di automazione della pulizia.','Uninstall by choosing the cleanup automation level.'),actions)}<section class="uninstall-apps-page"><section class="stats-strip">${stat(t('Installate','Installed'),state.apps.length.toLocaleString(),t('rilevate dal sistema','detected by the system'))}${stat(t('Risultati','Results'),apps.length.toLocaleString(),state.query?t('dopo il filtro','after filtering'):t('elenco completo','complete list'))}${stat(t('Controllo','Control'),mode.label,mode.note)}</section><section class="uninstall-workspace"><div class="panel apps-panel"><div class="panel-head"><div><h2>${t('Programmi installati','Installed programs')}</h2><span>${apps.length} ${t('elementi','items')}</span></div></div><div class="search-box">${icons.scan}<input data-app-search value="${escapeHtml(state.query)}" placeholder="${t('Cerca applicazione…','Search application…')}"></div><div class="app-list">${list}</div></div><div class="panel detail-panel">${detail}</div></section></section>`,motion);
  bindApps();
}

function cleanupResultCard(result){
  if(!result)return '';
  const ok=!result.errors?.length&&!result.remaining?.length&&result.verifiedRemoved===result.removed;
  const tone=ok?'success':'warning';
  const title=ok?t('Pulizia verificata','Cleanup verified'):t('Pulizia da controllare','Cleanup needs review');
  const note=ok?t('Gli elementi rimossi risultano effettivamente assenti dopo la verifica finale.','Removed items are confirmed absent after final verification.'):t('Controlla gli errori o gli elementi ancora presenti prima di procedere oltre.','Review errors or remaining items before proceeding.');
  return `<div class="guard-banner ${tone} cleanup-result">${ok?icons.check:icons.alert}<div class="cleanup-result-body"><strong>${title}</strong><span>${note}</span><div class="cleanup-result-stats"><b>${result.removed??0}<small>${t('rimossi','removed')}</small></b><b>${result.verifiedRemoved??0}<small>${t('verificati','verified')}</small></b><b>${result.alreadyAbsent??0}<small>${t('già assenti','already absent')}</small></b><b>${result.skipped??0}<small>${t('saltati','skipped')}</small></b><b>${result.errors?.length??0}<small>${t('errori','errors')}</small></b></div>${result.backupDir?`<button class="text-action cleanup-backup" data-reveal="${escapeHtml(result.backupDir)}">${icons.folder}${t('Apri cartella backup','Open backup folder')}</button>`:''}${result.remaining?.length?`<div class="cleanup-remaining"><strong>${t('Ancora presenti','Still present')}</strong>${result.remaining.slice(0,4).map((path)=>`<span>${escapeHtml(path)}</span>`).join('')}${result.remaining.length>4?`<span>+${result.remaining.length-4}</span>`:''}</div>`:''}</div></div>`;
}

function renderResiduals(motion='page'){
  const report=state.report;
  const items=report?[...report.filesystem,...report.registry]:[];
  const selectedIds=selectedSafeIds(report,state.selectedResiduals);
  const safeResiduals=safeItems(report);
  const allSafeSelected=safeResiduals.length>0&&safeResiduals.every((item)=>state.selectedResiduals.has(item.id));
  const actions=report?`<button class="button secondary" data-action="rescan" ${state.busy?'disabled':''}>${icons.refresh}${t('Ripeti scansione','Rescan')}</button>`:'';
  let body=`<div class="residual-empty-grid"><div class="panel empty-panel"><div class="detail-empty"><div class="empty-icon">${icons.residuals}</div><h2>${t('Nessuna scansione attiva','No active scan')}</h2><p>${t('Seleziona un’app nella sezione Applicazioni e scegli “Analizza residui”.','Select an app in Applications and choose “Scan residuals”.')}</p><button class="button primary" data-page="apps">${t('Vai alle applicazioni','Go to applications')}</button></div></div><div class="panel forced-scan-panel"><div class="panel-head"><div><h2>${t('Scansione forzata','Forced scan')}</h2><span>${t('Per programmi già rimossi o voci non più presenti nell’elenco.','For already removed programs or entries no longer listed.')}</span></div>${icons.scan}</div><div class="forced-fields"><label><span>${t('Nome applicazione','Application name')} *</span><input class="text-input" data-forced-name value="${escapeHtml(state.forcedName)}" placeholder="Adobe Dimension"></label><label><span>${t('Produttore','Publisher')}</span><input class="text-input" data-forced-publisher value="${escapeHtml(state.forcedPublisher)}" placeholder="Adobe"></label><label class="forced-path-field"><span>${t('Percorso residuo / installazione','Residual / install path')}</span><input class="text-input" data-forced-path value="${escapeHtml(state.forcedPath)}" placeholder="C:\\Program Files\\Adobe\\Adobe Dimension"></label><button class="button primary" data-action="forced-scan" ${state.busy?'disabled':''}>${icons.scan}${t('Avvia scansione profonda','Start deep scan')}</button></div><p class="forced-note">${t('Il nome è obbligatorio. Produttore e percorso sono facoltativi ma aumentano molto la precisione. Se lo stesso programma risulta ancora installato, la rimozione resta bloccata.','Name is required. Publisher and path are optional but greatly improve precision. If the same program is still installed, removal remains locked.')}</p></div></div>`;
  if(report){
    const installedWarning=report.stillInstalled?`<div class="guard-banner warning">${icons.alert}<div><strong>${t('Applicazione ancora installata','Application still installed')}</strong><span>${t('I candidati sono mostrati solo per analisi. La rimozione rimane bloccata finché il programma è rilevato come installato.','Candidates are shown for analysis only. Removal stays locked while the program is detected as installed.')}</span></div></div>`:`<div class="guard-banner success">${icons.shield}<div><strong>${t('Pulizia sbloccata','Cleanup unlocked')}</strong><span>${t('Il programma non risulta più installato. Verranno comunque rimossi solo elementi ad alta confidenza e il Registro verrà esportato prima della modifica.','The program is no longer detected as installed. Only high-confidence items can be removed and Registry keys are exported before modification.')}</span></div></div>`;
    const section=(title,icon,list)=>`<div class="panel residual-panel"><div class="panel-head"><div><h2>${title}</h2><span>${list.length} ${t('candidati','candidates')}</span></div>${icon}</div><div class="residual-list">${list.length?list.map((item)=>residualRow(item)).join(''):`<div class="list-empty compact">${t('Nessun residuo ad alta confidenza trovato.','No high-confidence residuals found.')}</div>`}</div></div>`;
    body=`${installedWarning}<section class="residual-summary">${stat(t('Applicazione','Application'),escapeHtml(report.appName),report.stillInstalled?t('ancora installata','still installed'):t('non rilevata','not detected'))}${stat(t('Residui','Residuals'),items.length.toLocaleString(),t('file/cartelle + chiavi/valori','files/folders + keys/values'))}${stat(t('Spazio rilevato','Detected size'),formatBytes(report.totalBytes),t('solo file system','filesystem only'))}</section><section class="residual-grid">${section(t('File system','Filesystem'),icons.folder,report.filesystem)}${section(t('Registro di sistema','System Registry'),icons.registry,report.registry)}</section>${cleanupResultCard(state.lastCleanup)}<div class="panel cleanup-bar"><div><strong>${selectedIds.length} ${t('elementi selezionati','items selected')}</strong><span>${t('Scansione profonda attiva: il backend rivalida ogni elemento prima della rimozione.','Deep scan active: the backend revalidates every item before removal.')}</span></div><div class="cleanup-actions"><button class="button secondary" data-action="select-safe" ${report.stillInstalled||!safeResiduals.length||state.busy?'disabled':''}>${icons.check}${allSafeSelected?t('Deseleziona tutti','Clear selection'):t('Seleziona tutti sicuri','Select all safe')}</button><button class="button danger" data-action="remove-residuals" ${report.stillInstalled||!selectedIds.length||state.busy?'disabled':''}>${icons.trash}${state.confirmResiduals?t('Conferma rimozione','Confirm removal'):t('Rimuovi selezionati','Remove selected')}</button></div></div>`;
  }
  shell(`${header(t('Residui','Residuals'),t('Scansione profonda di file, cartelle, chiavi e valori del Registro attribuibili all’app selezionata.','Deep scan of files, folders, Registry keys and values attributable to the selected app.'),actions)}<section class="uninstall-residuals-page">${autoCleanupBanner()}${body}</section>`,motion);
  bindResiduals();
}

function residualRow(item){const checked=state.selectedResiduals.has(item.id);const locked=!item.safeToRemove;return `<label class="residual-row ${locked?'locked':''}"><input type="checkbox" data-residual-id="${escapeHtml(item.id)}" ${checked?'checked':''} ${locked?'disabled':''}><span class="residual-kind">${item.kind.startsWith('registry')?icons.registry:icons.folder}</span><span class="residual-copy"><strong>${escapeHtml(item.valueName?`${item.path} → ${item.valueName}`:item.path)}</strong><small>${escapeHtml(item.reason)}${item.bytes?` · ${formatBytes(item.bytes)}`:''}</small></span><span class="confidence ${item.confidence}">${riskLabel(item.confidence,state.settings.language)}</span></label>`;}

function renderTemp(motion='page'){
  const report=state.tempReport;
  const selected=[...state.selectedTemps].filter((id)=>report?.items.some((item)=>item.id===id&&item.safeToRemove));
  const actions=`<button class="button primary" data-action="scan-temp" ${state.busy?'disabled':''}>${icons.scan}${t('Analizza temporanei','Scan temporary files')}</button>`;
  let body=`<section class="uninstall-temp-page temp-stack"><div class="panel temp-intro"><div class="summary-mark">${icons.temp}</div><div><h2>${t('Pulizia temporanei prudente','Cautious temporary cleanup')}</h2><p>${t('La versione stabile analizza solo la cartella TEMP dell’utente su Windows e considera elementi non modificati da almeno il numero di giorni scelto. Nessuna pulizia globale di sistema viene eseguita.','The stable release scans only the user TEMP folder on Windows and considers items not modified for at least the chosen number of days. No global system cleanup is performed.')}</p></div><div class="temp-age"><label>${t('Età minima','Minimum age')}</label><select data-temp-age><option value="7" ${state.settings.tempAgeDays===7?'selected':''}>7 ${t('giorni','days')}</option><option value="14" ${state.settings.tempAgeDays===14?'selected':''}>14 ${t('giorni','days')}</option><option value="30" ${state.settings.tempAgeDays===30?'selected':''}>30 ${t('giorni','days')}</option></select></div></div>`;
  if(report){
    if(!report.supported)body+=`<div class="guard-banner warning">${icons.alert}<div><strong>${t('Funzione non ancora disponibile','Feature not available yet')}</strong><span>${t('La pulizia TEMP generalizzata è intenzionalmente disabilitata su macOS/Linux in questa versione per evitare di toccare file temporanei condivisi dal sistema.','General TEMP cleanup is intentionally disabled on macOS/Linux in this version to avoid touching system-shared temporary files.')}</span></div></div><div class="panel empty-panel large-panel"><div class="detail-empty"><div class="empty-icon">${icons.temp}</div><h2>${t('Solo Windows per ora','Windows only for now')}</h2><p>${t('La pulizia dei temporanei è attiva solo su Windows, così evitiamo di toccare posizioni condivise di sistema su macOS e Linux.','Temporary cleanup is enabled only on Windows so we avoid touching shared system locations on macOS and Linux.')}</p></div></div>`;
    else body+=`<section class="stats-strip">${stat(t('Elementi','Items'),report.items.length.toLocaleString(),t('oltre la soglia','past the age threshold'))}${stat(t('Spazio','Space'),formatBytes(report.totalBytes),t('potenzialmente recuperabile','potentially recoverable'))}${stat(t('Soglia','Threshold'),`${report.minAgeDays} ${t('giorni','days')}`,escapeHtml(report.root))}</section>${cleanupResultCard(state.lastTempCleanup)}<div class="panel temp-panel large-panel"><div class="temp-list">${report.items.length?report.items.map((item)=>`<label class="temp-row"><input type="checkbox" data-temp-id="${escapeHtml(item.id)}" ${state.selectedTemps.has(item.id)?'checked':''}><span class="temp-file">${icons.temp}</span><span><strong>${escapeHtml(item.path)}</strong><small>${formatBytes(item.bytes)} · ${item.ageDays} ${t('giorni','days')}</small></span></label>`).join(''):`<div class="list-empty fill"><div class="empty-icon">${icons.check}</div><h2>${t('Nessun temporaneo critico','No eligible temporary items')}</h2><p>${t('Nessun elemento temporaneo supera la soglia selezionata. Prova ad aumentare l’intervallo oppure esegui una nuova analisi più tardi.','No temporary item exceeds the selected threshold. Try increasing the interval or run another scan later.')}</p></div>`}</div><div class="cleanup-footer"><span>${selected.length} ${t('selezionati','selected')}</span><button class="button danger" data-action="remove-temp" ${!selected.length||state.busy?'disabled':''}>${icons.trash}${state.confirmTemps?t('Conferma pulizia','Confirm cleanup'):t('Rimuovi selezionati','Remove selected')}</button></div></div>`;
  }else body+=`<div class="panel empty-panel large-panel"><div class="detail-empty"><div class="empty-icon">${icons.temp}</div><h2>${t('Nessuna analisi eseguita','No analysis yet')}</h2><p>${t('Avvia una scansione dei temporanei per vedere elementi rimovibili, spazio recuperabile e candidati sicuri alla pulizia.','Start a temporary-file scan to view removable items, recoverable space and safe cleanup candidates.')}</p><button class="button primary" data-action="scan-temp" ${state.busy?'disabled':''}>${icons.scan}${t('Analizza temporanei','Scan temporary files')}</button></div></div>`;
  body+=`</section>`;
  shell(`${header(t('Temporanei','Temporary files'),t('Recupera spazio con criteri temporali conservativi e selezione esplicita.','Recover space using conservative age criteria and explicit selection.'),actions)}${body}`,motion);
  bindTemp();
}

function davSelect(key,value,items){const selected=items.find(([v])=>v===value)?.[1]||value;return `<div class="dav-select" data-select="${key}"><button class="dav-select-trigger"><span>${selected}</span><span>⌄</span></button><div class="dav-select-menu">${items.map(([v,label])=>`<button class="dav-select-option ${v===value?'is-selected':''}" data-value="${v}"><span>${label}</span>${v===value?icons.check:''}</button>`).join('')}</div></div>`;}
function renderSettings(motion='page'){
  shell(`${header('_davUNINSTALL',t('Impostazioni','Settings'),t('Preferenze locali e principi di sicurezza della pulizia.','Local preferences and cleanup safety principles.'))}<section class="settings-grid uninstall-settings-page"><div class="panel settings-card"><h2>${t('Generali','General')}</h2><div class="setting-control"><span>${t('Tema','Theme')}</span>${davSelect('theme',state.settings.theme,[['system',t('Sistema','System')],['light',t('Chiaro','Light')],['dark',t('Scuro','Dark')]])}</div><div class="setting-control"><span>${t('Lingua','Language')}</span>${davSelect('language',state.settings.language,[['it','Italiano'],['en','English']])}</div><div class="setting-control"><span>${t('Età temporanei','Temporary age')}</span>${davSelect('tempAgeDays',String(state.settings.tempAgeDays),[['7',`7 ${t('giorni','days')}`],['14',`14 ${t('giorni','days')}`],['30',`30 ${t('giorni','days')}`]])}</div><div class="setting-control"><span>${t('Controllo eliminazione','Removal control')}</span>${davSelect('cleanupMode',state.settings.cleanupMode,[['low',t('Basso','Low')],['medium',t('Medio','Medium')],['high',t('Alto','High')]])}</div></div><div class="panel about-card"><div class="brand big"><span>_dav</span>UNINSTALL</div><p>${t('Disinstallatore conservativo e analizzatore di residui. Tutte le operazioni sono locali e richiedono una selezione esplicita.','Conservative uninstaller and residual analyzer. All operations are local and require explicit selection.')}</p><div class="about-links"><button class="website-button" data-action="website">${icons.globe}<span>davstudios.it</span></button><button class="coffee-button wide" data-action="coffee">${icons.coffee}<span>${t('Comprami Un Caffè','Buy Me A Coffee')}</span></button></div><div class="version">v${escapeHtml(state.version)} · Release stabile</div></div><div class="panel capability-card safety-principles"><h2>${t('Regole di sicurezza','Safety rules')}</h2><div class="capability-list"><div><strong>${t('Niente corrispondenze deboli','No weak matches')}</strong><span>${t('La rimozione accetta soltanto candidati esatti o ad alta confidenza generati dal backend.','Removal accepts only exact or high-confidence candidates generated by the backend.')}</span></div><div><strong>${t('Disinstallazione prima, residui dopo','Uninstall first, residuals second')}</strong><span>${t('Finché l’app risulta installata, i residui restano in sola lettura.','While the app is still installed, residuals remain read-only.')}</span></div><div><strong>${t('Backup del Registro','Registry backup')}</strong><span>${t('Ogni chiave Windows viene esportata prima della cancellazione e viene salvato un manifest delle operazioni.','Every Windows key is exported before deletion and an operation manifest is saved.')}</span></div><div><strong>${t('Rivalidazione al momento della pulizia','Revalidation at cleanup time')}</strong><span>${t('Il backend ripete la scansione e ignora qualsiasi ID non più appartenente alla whitelist corrente.','The backend rescans and ignores any ID no longer belonging to the current whitelist.')}</span></div></div></div></section>`,motion);
  bindSettings();
}

function bindGlobal(){
  document.querySelectorAll('[data-page]').forEach((node)=>node.addEventListener('click',()=>{state.page=node.dataset.page;state.confirmUninstall=false;state.confirmResiduals=false;state.confirmTemps=false;render('page');}));
  document.querySelectorAll('[data-action="coffee"]').forEach((node)=>node.addEventListener('click',()=>openExternal('https://buymeacoffee.com/davstudios')));
  document.querySelectorAll('[data-action="website"]').forEach((node)=>node.addEventListener('click',()=>openExternal(state.settings.language==='en'?'https://www.davstudios.it/en':'https://www.davstudios.it')));
  document.querySelectorAll('[data-action="theme"]').forEach((node)=>node.addEventListener('click',()=>{const next=resolvedTheme()==='dark'?'light':'dark';runUiTransition('theme',()=>{state.settings.theme=next;persistSettings();render('content');});}));
  document.querySelectorAll('[data-reveal]').forEach((node)=>node.addEventListener('click',()=>reveal(node.dataset.reveal)));
  document.querySelector('[data-action="cancel-auto"]')?.addEventListener('click',()=>{state.autoAbortRequested=true;state.busyLabel=t('Interruzione sicura in corso…','Stopping safely…');render('content');});
}
function bindApps(){
  document.querySelector('[data-action="refresh"]')?.addEventListener('click',loadApps);
  document.querySelector('[data-app-search]')?.addEventListener('input',(event)=>{state.query=event.target.value;render('filter');document.querySelector('[data-app-search]')?.focus();});
  document.querySelectorAll('[data-app-id]').forEach((node)=>node.addEventListener('click',()=>{state.selected=state.apps.find((app)=>app.id===node.dataset.appId)||state.selected;state.report=null;state.lastCleanup=null;state.autoPhase='';state.autoAppName='';state.autoAbortRequested=false;state.confirmUninstall=false;state.highConfirmStage=0;render('selection');}));
  document.querySelectorAll('[data-cleanup-mode]').forEach((node)=>node.addEventListener('click',()=>{state.settings.cleanupMode=node.dataset.cleanupMode;state.confirmUninstall=false;state.highConfirmStage=0;persistSettings();render('selection');}));
  document.querySelector('[data-action="uninstall"]')?.addEventListener('click',async()=>{
    if(!state.selected)return;
    if(state.settings.cleanupMode==='high'){
      if(state.highConfirmStage===0){state.highConfirmStage=1;render('selection');return;}
      if(state.highConfirmStage===1){state.highConfirmStage=2;render('selection');return;}
      state.highConfirmStage=0;
      await uninstallSelected();
      return;
    }
    if(!state.confirmUninstall){state.confirmUninstall=true;render('selection');return;}
    state.confirmUninstall=false;
    await uninstallSelected();
  });
  document.querySelector('[data-action="scan-selected"]')?.addEventListener('click',scanSelected);
}

function bindResiduals(){
  document.querySelector('[data-action="rescan"]')?.addEventListener('click',scanSelected);
  document.querySelector('[data-forced-name]')?.addEventListener('input',(event)=>{state.forcedName=event.target.value;});
  document.querySelector('[data-forced-publisher]')?.addEventListener('input',(event)=>{state.forcedPublisher=event.target.value;});
  document.querySelector('[data-forced-path]')?.addEventListener('input',(event)=>{state.forcedPath=event.target.value;});
  document.querySelector('[data-action="forced-scan"]')?.addEventListener('click',scanForcedResiduals);
  document.querySelector('[data-action="select-safe"]')?.addEventListener('click',()=>{const allowed=safeItems(state.report);const allSelected=allowed.length>0&&allowed.every((item)=>state.selectedResiduals.has(item.id));state.selectedResiduals=allSelected?new Set():new Set(allowed.map((item)=>item.id));state.confirmResiduals=false;render('selection');});
  document.querySelectorAll('[data-residual-id]').forEach((node)=>node.addEventListener('change',()=>{if(node.checked)state.selectedResiduals.add(node.dataset.residualId);else state.selectedResiduals.delete(node.dataset.residualId);state.confirmResiduals=false;render('selection');}));
  document.querySelector('[data-action="remove-residuals"]')?.addEventListener('click',async()=>{if(!state.confirmResiduals){state.confirmResiduals=true;render('selection');return;}state.confirmResiduals=false;await cleanupResiduals();});
}
function bindTemp(){
  document.querySelector('[data-action="scan-temp"]')?.addEventListener('click',scanTemp);
  document.querySelector('[data-temp-age]')?.addEventListener('change',(event)=>{state.settings.tempAgeDays=Number(event.target.value);persistSettings();state.tempReport=null;state.lastTempCleanup=null;state.selectedTemps.clear();render('content');});
  document.querySelectorAll('[data-temp-id]').forEach((node)=>node.addEventListener('change',()=>{if(node.checked)state.selectedTemps.add(node.dataset.tempId);else state.selectedTemps.delete(node.dataset.tempId);state.confirmTemps=false;render('selection');}));
  document.querySelector('[data-action="remove-temp"]')?.addEventListener('click',async()=>{if(!state.confirmTemps){state.confirmTemps=true;render('selection');return;}state.confirmTemps=false;await cleanupTemp();});
}
function bindSettings(){
  document.querySelectorAll('.dav-select-trigger').forEach((node)=>node.addEventListener('click',(event)=>{event.stopPropagation();const root=node.closest('.dav-select');document.querySelectorAll('.dav-select.is-open').forEach((other)=>{if(other!==root)other.classList.remove('is-open');});root.classList.toggle('is-open');}));
  document.querySelectorAll('.dav-select-option').forEach((node)=>node.addEventListener('click',()=>{const root=node.closest('.dav-select');const key=root.dataset.select;const value=node.dataset.value;runUiTransition(key==='theme'?'theme':'language',()=>{state.settings[key]=key==='tempAgeDays'?Number(value):value;persistSettings();render('content');});}));
}

async function loadApps(){if(!isTauri){toast(t('Apri _davUNINSTALL come app desktop per leggere i programmi installati.','Open _davUNINSTALL as a desktop app to read installed programs.'));return;}state.busy=true;state.busyLabel=t('Aggiornamento applicazioni…','Refreshing applications…');render('content');try{const previous=state.selected;state.apps=await invoke('list_installed_apps');if(previous)state.selected=state.apps.find((app)=>app.id===previous.id)||previous;}catch(error){toast(String(error));}finally{state.busy=false;state.busyLabel='';render('content');}}
async function runHighCleanupFlow(app){
  state.autoAppName=app.name;
  state.autoAbortRequested=false;
  state.autoPhase='uninstalling';
  state.busy=true;
  state.busyLabel=t('Disinstallatore in esecuzione…','Uninstaller running…');
  render('content');
  await invoke('run_uninstaller_and_wait',{app});
  if(state.autoAbortRequested){
    state.autoPhase='stopped';
    state.busy=false;
    state.busyLabel='';
    toast(t('Automazione interrotta dopo la chiusura del disinstallatore. Nessun residuo è stato eliminato automaticamente.','Automation stopped after the uninstaller closed. No residuals were automatically removed.'));
    render('content');
    return;
  }
  state.busyLabel=t('Disinstallatore terminato. Preparo la scansione profonda…','Uninstaller finished. Preparing deep scan…');
  render('content');
  await sleep(3500);
  state.page='residuals';
  state.autoPhase='scanning';
  state.busyLabel=t('Scansione profonda automatica…','Automatic deep scan…');
  render('page');
  const report=await invoke('scan_residuals_post_uninstall',{app});
  state.selected=app;
  state.report=report;
  state.lastCleanup=null;
  const allowed=safeItems(report);
  state.selectedResiduals=new Set(allowed.map((item)=>item.id));
  state.autoPhase='cleaning';
  state.busyLabel=t('Pulizia automatica e verifica…','Automatic cleanup and verification…');
  render('content');
  await nextPaint();
  if(!allowed.length){
    state.autoPhase='complete';
    state.busy=false;
    state.busyLabel='';
    toast(t('Disinstallazione completata. Nessun residuo Exact/High è stato rilevato.','Uninstall completed. No Exact/High residuals were detected.'));
    render('content');
    return;
  }
  const result=await invoke('remove_residuals_post_uninstall',{request:{app,itemIds:allowed.map((item)=>item.id)}});
  state.lastCleanup=result;
  state.selectedResiduals.clear();
  state.autoPhase='complete';
  state.busy=false;
  state.busyLabel='';
  toast(result.errors?.length||result.remaining?.length?t('Pulizia automatica completata con elementi da controllare.','Automatic cleanup completed with items to review.'):t('Modalità Alta completata e verificata.','High mode completed and verified.'));
  render('content');
}
async function uninstallSelected(){
  if(!isTauri||!state.selected)return;
  const app={...state.selected};
  const mode=state.settings.cleanupMode;
  state.busy=true;
  state.busyLabel=t('Avvio disinstallatore…','Starting uninstaller…');
  render('content');
  try{
    if(mode==='high'){
      await runHighCleanupFlow(app);
    }else{
      await invoke('launch_uninstaller',{app});
      toast(mode==='low'?t('Disinstallatore avviato. Modalità Bassa: nessuna scansione automatica verrà eseguita.','Uninstaller started. Low mode: no automatic scan will be performed.'):t('Disinstallatore avviato. Al termine puoi analizzare e scegliere manualmente i residui.','Uninstaller started. When it finishes, you can scan and manually choose residuals.'));
    }
  }catch(error){
    state.autoPhase=mode==='high'?'stopped':'';
    toast(String(error));
  }finally{
    if(mode!=='high'||state.autoPhase==='stopped'){
      state.busy=false;
      state.busyLabel='';
      render('content');
    }
  }
}

async function scanSelected(){if(!isTauri||!state.selected){state.page='apps';render('page');return;}state.busy=true;state.busyLabel=t('Analisi profonda dei residui…','Deep residual scan…');render('content');try{state.report=await invoke('scan_residuals',{app:state.selected});state.selectedResiduals.clear();state.page='residuals';}catch(error){toast(String(error));}finally{state.busy=false;state.busyLabel='';render('content');}}
async function scanForcedResiduals(){if(!isTauri)return;const name=state.forcedName.trim();if(!name){toast(t('Inserisci il nome dell’applicazione.','Enter the application name.'));return;}state.busy=true;state.busyLabel=t('Scansione forzata dei residui…','Forced residual scan…');render('content');try{const result=await invoke('scan_forced_residuals',{name,publisher:state.forcedPublisher.trim(),installLocation:state.forcedPath.trim()});state.selected=result.app;state.report=result.report;state.lastCleanup=null;state.selectedResiduals.clear();}catch(error){toast(String(error));}finally{state.busy=false;state.busyLabel='';render('content');}}
async function cleanupResiduals(){if(!isTauri||!state.selected||!state.report)return;const ids=selectedSafeIds(state.report,state.selectedResiduals);if(!ids.length)return;state.busy=true;state.busyLabel=t('Pulizia e verifica dei residui…','Cleaning and verifying residuals…');render('content');try{const result=await invoke('remove_residuals',{request:{app:state.selected,itemIds:ids}});state.lastCleanup=result;toast(result.errors?.length?`${t('Pulizia completata con elementi da controllare','Cleanup completed with items to review')}: ${result.errors.length}`:t('Pulizia completata e verificata.','Cleanup completed and verified.'));state.report=await invoke('scan_residuals',{app:state.selected});state.selectedResiduals.clear();}catch(error){toast(String(error));}finally{state.busy=false;state.busyLabel='';render('content');}}
async function scanTemp(){if(!isTauri){toast(t('Apri l’app desktop per analizzare i temporanei.','Open the desktop app to scan temporary files.'));return;}state.busy=true;state.busyLabel=t('Analisi dei file temporanei…','Scanning temporary files…');render('content');try{state.tempReport=await invoke('scan_user_temp',{minAgeDays:state.settings.tempAgeDays});state.selectedTemps.clear();}catch(error){toast(String(error));}finally{state.busy=false;state.busyLabel='';render('content');}}
async function cleanupTemp(){if(!isTauri||!state.tempReport)return;const allowed=new Set(state.tempReport.items.filter((item)=>item.safeToRemove).map((item)=>item.id));const ids=[...state.selectedTemps].filter((id)=>allowed.has(id));if(!ids.length)return;state.busy=true;state.busyLabel=t('Pulizia dei file temporanei…','Cleaning temporary files…');render('content');try{const result=await invoke('remove_temp_items',{request:{minAgeDays:state.settings.tempAgeDays,itemIds:ids}});state.lastTempCleanup=result;toast(result.errors?.length?`${t('Pulizia completata con elementi da controllare','Cleanup completed with items to review')}: ${result.errors.length}`:t('Temporanei rimossi e verificati.','Temporary items removed and verified.'));state.tempReport=await invoke('scan_user_temp',{minAgeDays:state.settings.tempAgeDays});state.selectedTemps.clear();}catch(error){toast(String(error));}finally{state.busy=false;state.busyLabel='';render('content');}}
async function reveal(path){if(!isTauri)return;try{await invoke('reveal_path',{path});}catch(error){toast(String(error));}}
async function openExternal(url){try{if(isTauri)await openUrl(url);else window.open(url,'_blank','noopener,noreferrer');}catch{window.open(url,'_blank','noopener,noreferrer');}}
function toast(message){const region=document.querySelector('#toast-region');if(!region)return;const node=document.createElement('div');node.className='toast';node.textContent=message;region.appendChild(node);setTimeout(()=>{node.classList.add('is-leaving');setTimeout(()=>node.remove(),190);},4200);}

async function init(){applyTheme();document.addEventListener('click',()=>document.querySelectorAll('.dav-select.is-open').forEach((node)=>node.classList.remove('is-open')));if(isTauri){try{state.version=await getVersion();}catch{}}render('startup');if(isTauri)loadApps();}
init();
