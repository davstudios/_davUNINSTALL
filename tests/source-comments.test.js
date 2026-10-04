import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const includedExtensions=new Set(['.js','.css','.rs','.html']);
const excluded=new Set([resolve(root,'tests/source-comments.test.js')]);

function walk(path){if(!statSync(path).isDirectory())return[path];return readdirSync(path).flatMap((entry)=>walk(join(path,entry)));}
function stripQuoted(source){let result='';let quote='';let escaped=false;for(let index=0;index<source.length;index+=1){const char=source[index];if(quote){if(char==='\n')result+='\n';else result+=' ';if(escaped){escaped=false;continue;}if(char==='\\'){escaped=true;continue;}if(char===quote)quote='';continue;}if(char==='"'||char==="'"||char==='`'){quote=char;result+=' ';continue;}result+=char;}return result;}
function hasComment(path){const source=readFileSync(path,'utf8');if(extname(path)==='.html'&&source.includes('<!--'))return true;const code=stripQuoted(source);return code.includes('/*')||/(^|[^:])\/\//m.test(code);}

test('sorgenti senza commenti',()=>{
  const paths=[...walk(resolve(root,'src')),...walk(resolve(root,'src-tauri/src')),resolve(root,'src-tauri/build.rs'),resolve(root,'index.html'),resolve(root,'vite.config.js'),resolve(root,'tests/uninstall-engine.test.js'),resolve(root,'tests/version-sync.test.js')].filter((path)=>includedExtensions.has(extname(path))&&!excluded.has(path));
  const findings=paths.filter(hasComment).map((path)=>path.slice(root.length+1));
  assert.deepEqual(findings,[]);
});


