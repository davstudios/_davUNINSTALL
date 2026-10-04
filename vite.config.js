import { defineConfig } from 'vite';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  clearScreen:false,
  build:{minify:'oxc'},
  server:{
    port:17460,
    strictPort:true,
    host:host||false,
    hmr:host?{protocol:'ws',host,port:17461}:undefined,
    watch:{ignored:['**/src-tauri/**']}
  }
});


