import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

for(const file of ['32x32.png','128x128.png','128x128@2x.png','app-icon.png'])test(`${file} usa PNG RGBA`,()=>{const data=fs.readFileSync(`src-tauri/icons/${file}`);assert.equal(data[25],6);});


