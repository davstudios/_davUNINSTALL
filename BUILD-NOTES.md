# BUILD NOTES — _davUNINSTALL v26.10.2

Stack: Tauri 2, Rust 2021, JavaScript ES modules e Vite 8.

## Motore e sicurezza

La pulizia dei residui usa una whitelist generata dal backend e accetta soltanto candidati `exact` / `high`. Gli elementi vengono rivalidati subito prima della rimozione. Su Windows le chiavi del Registro interessate vengono esportate prima della modifica e viene scritto un manifest JSON. File e cartelle vengono inviati al Cestino quando possibile.

La modalità Alta automatizza il flusso protetto senza ampliare la whitelist: doppia conferma iniziale, attesa della chiusura reale del disinstallatore, scansione post-uninstall, selezione automatica dei soli candidati sicuri, pulizia e verifica finale.

La pulizia TEMP è limitata alla cartella TEMP dell'utente su Windows. Le directory vengono considerate eleggibili solo quando anche il contenuto più recente supera la soglia configurata. Link simbolici e reparse point sono esclusi dalle operazioni distruttive.

## Standard release

La v26.10.2 adotta il versioning `YY.M.REVISIONE` e i metadata ufficiali `_davstudios`. L'identifier storico `studio.dav.uninstall` resta invariato. La categoria pacchetto è `Productivity`; le build Linux includono metadata Debian `section=utils` e `priority=optional`.

`.github/workflows/release.yml` si attiva sui tag `v*`, verifica la sincronizzazione di `package.json`, `package-lock.json`, `tauri.conf.json`, `Cargo.toml` e `Cargo.lock`, richiede nel commit associato al tag una Description contenente entrambe le sezioni 🇮🇹 e 🇺🇸, esegue i test e pubblica una GitHub Release stabile usando automaticamente quella Description come corpo della release:

- Windows: NSIS
- macOS: Universal DMG
- Linux: AppImage + DEB

Il job Linux disabilita preventivamente eventuali repository Microsoft presenti sul runner Ubuntu che possono restituire HTTP 403 pur non essendo necessari alla build Tauri.

Il controllo di `Cargo.lock` accetta terminatori di riga sia LF sia CRLF; `.gitattributes` normalizza inoltre `Cargo.lock` e gli script shell a LF per ridurre le differenze tra checkout Windows, macOS e Linux.

## Verifiche nell'ambiente di generazione

- suite Node.js del progetto;
- controllo sintattico JavaScript;
- validazione JSON di package/Tauri/capability;
- verifica del workflow YAML;
- verifica PNG Tauri in formato RGBA;
- controllo sincronizzazione versioni e lockfile;
- simulazione `Cargo.lock` con terminatori Windows CRLF;
- controllo integrità ZIP finale.

La compilazione Tauri nativa finale resta demandata all'ambiente di sviluppo e ai runner GitHub quando Rust/Cargo o le dipendenze native di piattaforma non sono disponibili nell'ambiente di preparazione.

