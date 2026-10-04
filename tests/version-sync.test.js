import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const packageVersion = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version;
const packageLock = JSON.parse(readFileSync(resolve(root, 'package-lock.json'), 'utf8'));
const tauri = JSON.parse(readFileSync(resolve(root, 'src-tauri/tauri.conf.json'), 'utf8'));
const tauriVersion = tauri.version;
const cargoText = readFileSync(resolve(root, 'src-tauri/Cargo.toml'), 'utf8');
const cargoVersion = cargoText.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
const cargoLockText = readFileSync(resolve(root, 'src-tauri/Cargo.lock'), 'utf8');
const cargoLockVersion = cargoLockText.match(/\[\[package\]\]\r?\nname = "davuninstall"\r?\nversion = "([^"]+)"/)?.[1];
const mainSource = readFileSync(resolve(root, 'src/main.js'), 'utf8');

test('versioni tecniche sincronizzate', () => {
  assert.equal(packageVersion, '26.10.3');
  assert.equal(packageLock.version, packageVersion);
  assert.equal(packageLock.packages[''].version, packageVersion);
  assert.equal(tauriVersion, packageVersion);
  assert.equal(cargoVersion, packageVersion);
  assert.equal(cargoLockVersion, packageVersion);
});

test('Cargo.lock resta leggibile con terminatori Windows CRLF', () => {
  const windowsCargoLock = cargoLockText.replace(/(?<!\r)\n/g, '\r\n');
  const windowsCargoLockVersion = windowsCargoLock.match(/\[\[package\]\]\r?\nname = "davuninstall"\r?\nversion = "([^"]+)"/)?.[1];
  assert.equal(windowsCargoLockVersion, packageVersion);
});

test('interfaccia non espone la versione di release', () => {
  assert.doesNotMatch(mainSource, /getVersion/);
  assert.doesNotMatch(mainSource, /state\.version/);
  assert.doesNotMatch(mainSource, /v\d+\.\d+\.\d+/);
  assert.doesNotMatch(mainSource, /version:'\d+\.\d+\.\d+'/);
});

