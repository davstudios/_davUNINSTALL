import test from 'node:test';
import assert from 'node:assert/strict';
import { filterApps, formatBytes, normalizeSearch, platformCanUninstall, riskLabel, safeItems, selectedSafeIds } from '../src/uninstall-engine.js';

const apps=[
  {id:'a',name:'Alpha Editor',publisher:'Example Studio',version:'1.0',source:'Windows Registry',canUninstall:true,uninstallString:'uninstall.exe'},
  {id:'b',name:'Beta Tool',publisher:'Other',version:'2.0',source:'Flatpak',canUninstall:false,uninstallString:''}
];

test('normalizza la ricerca',()=>assert.equal(normalizeSearch('  ALPHA  '),'alpha'));
test('filtra applicazioni per nome produttore versione e sorgente',()=>{assert.equal(filterApps(apps,'studio').length,1);assert.equal(filterApps(apps,'flatpak')[0].id,'b');});
test('formatta dimensioni',()=>{assert.equal(formatBytes(0),'0 B');assert.match(formatBytes(1024),/1\.00 KB/);});
test('classifica confidenza in italiano e inglese',()=>{assert.equal(riskLabel('exact','it'),'Esatto');assert.equal(riskLabel('high','en'),'High');});
test('accetta solo residui sicuri ad alta confidenza',()=>{const report={filesystem:[{id:'1',safeToRemove:true,confidence:'exact'},{id:'2',safeToRemove:true,confidence:'medium'}],registry:[{id:'3',safeToRemove:true,confidence:'high'},{id:'4',safeToRemove:false,confidence:'exact'}]};assert.deepEqual(safeItems(report).map(x=>x.id),['1','3']);assert.deepEqual(selectedSafeIds(report,new Set(['1','2','3','4'])),['1','3']);});
test('abilita disinstallazione solo con comando registrato',()=>{assert.equal(platformCanUninstall(apps[0]),true);assert.equal(platformCanUninstall(apps[1]),false);});


