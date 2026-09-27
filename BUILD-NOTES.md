# _davUNINSTALL v0.11.5 — Build Notes

## Stack

- Tauri 2
- Rust 2021
- JavaScript ES modules
- Vite 8

## Audit pre-v1.0.0

La v0.11.5 è una RC di rifinitura senza modifiche al flusso di disinstallazione già collaudato. L'audit ha verificato frontend, backend, modalità Basso/Medio/Alto, launcher, configurazione Tauri/Vite, Registro, pulizia residui, TEMP, icone e metadati.

Correzioni introdotte:

- launcher e script build/run sincronizzano sempre le dipendenze npm;
- scansione e pulizia TEMP spostate su `spawn_blocking`;
- una directory TEMP viene considerata vecchia solo in base all'elemento più recente contenuto al suo interno;
- link simbolici e reparse point vengono esclusi da scansione/rimozione file e TEMP;
- gestione dei nomi localizzati del valore predefinito del Registro, incluso `(Predefinito)`;
- rimosse funzioni Rust obsolete e il vecchio sorgente `space.rs` non utilizzato;
- documentazione e report riallineati alla release candidate corrente.

## Sicurezza residui

La whitelist viene rigenerata al momento della pulizia. Vengono accettati soltanto candidati `Exact` / `High confidence`. Le chiavi Registro vengono esportate prima della modifica e i residui file system vengono inviati al Cestino Windows. Dopo l'operazione ogni elemento viene ricontrollato.

La modalità Alta attende il processo reale del disinstallatore. Solo dopo un codice di uscita considerato riuscito avvia scansione e pulizia post-disinstallazione; eventuali vecchie voci `Uninstall` rimaste vengono analizzate come residui.

## Verifiche nell'ambiente di generazione

- `npm test`: 48/48 test passati.
- `node --check src/main.js`: superato.
- `node --check src/uninstall-engine.js`: superato.
- PNG Tauri: test RGBA superati.
- Build Rust/Tauri nativa: non eseguibile in questo ambiente perché Rust/Cargo non è installato.

Il collaudo nativo Windows dell'utente resta quindi indispensabile prima della v1.0.0.
