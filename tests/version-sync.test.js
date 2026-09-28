import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const packageJson=JSON.parse(fs.readFileSync('package.json','utf8'));
const tauri=JSON.parse(fs.readFileSync('src-tauri/tauri.conf.json','utf8'));
const cargo=fs.readFileSync('src-tauri/Cargo.toml','utf8');
const main=fs.readFileSync('src/main.js','utf8');

test('versioni tecniche sincronizzate',()=>{const rustVersion=cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1];assert.equal(packageJson.version,'1.1.1');assert.equal(tauri.version,packageJson.version);assert.equal(rustVersion,packageJson.version);});
test('interfaccia legge versione da Tauri',()=>{assert.match(main,/getVersion/);assert.match(main,/version:'1\.1\.1'/);});
