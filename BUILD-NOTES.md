# _davUNINSTALL v1.1.1 — Build Notes

## Stack

- Tauri 2
- Rust 2021
- JavaScript ES modules
- Vite 8

## Sicurezza

La pulizia dei residui usa una whitelist generata dal backend e accetta soltanto candidati `exact` / `high`. Gli elementi vengono rivalidati subito prima della rimozione. Su Windows le chiavi del Registro interessate vengono esportate prima della modifica e viene scritto un manifest JSON. File e cartelle vengono inviati al Cestino quando possibile.

La modalità Alta automatizza il flusso protetto senza ampliare la whitelist: doppia conferma iniziale, attesa della chiusura reale del disinstallatore, scansione post-uninstall, selezione automatica dei soli candidati sicuri, pulizia e verifica finale.

La pulizia TEMP è limitata alla cartella TEMP dell'utente su Windows. Le directory vengono considerate eleggibili solo quando anche il contenuto più recente supera la soglia configurata. Link simbolici e reparse point sono esclusi dalle operazioni distruttive.

## Release

La v1.1.1 è una patch release stabile dedicata al workflow Linux. Windows, macOS e il comportamento dell’app restano invariati rispetto alla v1.1.0. Prima di `apt-get update`, il job Ubuntu disabilita le sorgenti APT `packages.microsoft.com`, che non sono necessarie alla build Tauri e possono restituire HTTP 403 sui runner GitHub; APT usa inoltre retry e installa soltanto le dipendenze richieste con `--no-install-recommends`.

## Verifiche nell'ambiente di generazione

- test Node.js del progetto;
- controllo sintattico JavaScript;
- validazione JSON di package/Tauri/capability;
- verifica PNG Tauri in formato RGBA;
- controllo integrità ZIP finale.

Nell'ambiente di generazione Rust/Cargo non è disponibile, quindi la build Tauri nativa non può essere eseguita localmente. È stato tentato anche `npm install --no-audit --no-fund` per una build frontend, ma l'installazione ha superato il timeout disponibile; gli artefatti parziali sono stati rimossi. La compilazione definitiva degli installer viene eseguita dal workflow GitHub sulle piattaforme previste.

## v1.1.1

- Corretto il job Linux di GitHub Actions contro errori esterni delle sorgenti `packages.microsoft.com`.
- Conservato integralmente il set di icone definitivo introdotto in v1.1.0.
- Nessuna modifica funzionale al motore di disinstallazione.
