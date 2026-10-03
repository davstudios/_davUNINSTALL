# Changelog

## 26.10.2
- Eseguita la repository normalization completa dell’intero pacchetto: tutti i file tracciati ricevono una modifica reale ma neutra per riallinearli al commit della release corrente.
- Sincronizzata la versione 26.10.2 in package.json, package-lock.json, Cargo.toml, Cargo.lock, configurazione Tauri, documentazione e test.
- Preservata integralmente la logica di disinstallazione, scansione residui, backup Registro, pulizia TEMP e controlli di sicurezza.

## 26.10.1

- Adottato il nuovo standard di release `_davstudios` e il sistema di versioning `YY.M.REVISIONE`.
- Sincronizzate le versioni in `package.json`, `package-lock.json`, `Cargo.toml`, `Cargo.lock`, configurazione Tauri, documentazione e test.
- Standardizzati publisher, homepage, copyright, licenza MIT, categoria Productivity, descrizioni del pacchetto e metadata Debian per Linux.
- Mantenuto invariato l'identifier storico `studio.dav.uninstall`.
- Aggiunte al README le istruzioni per release non firmate su Windows SmartScreen, macOS Gatekeeper e Linux AppImage.
- Il workflow GitHub Actions usa la Description bilingue 🇮🇹/🇺🇸 del commit associato al tag come corpo della GitHub Release e ne verifica la presenza prima della pubblicazione.
- Mantenuto l'hardening Linux contro repository Microsoft non raggiungibili sui runner Ubuntu.
- Aggiunto il controllo completo di sincronizzazione dei lockfile con regressione per terminatori Windows CRLF.
- Nessuna modifica funzionale al motore di disinstallazione, scansione residui, backup Registro, cleanup TEMP, interfaccia o logica di sicurezza.

## 1.1.1

- Corretto il job Linux di GitHub Actions: il workflow disabilita le sorgenti APT `packages.microsoft.com`, non necessarie alla build Tauri, che sul runner possono rispondere `403 Forbidden` prima di eseguire `apt-get update`.
- Aggiunti retry ad APT e installazione `--no-install-recommends` delle sole dipendenze Tauri necessarie.
- Nessuna modifica funzionale all'app rispetto alla v1.1.0.

## 1.1.0

- Aggiornata l’icona definitiva di _davUNINSTALL e rigenerato il set Tauri per Windows, macOS e Linux.
- Eliminato il backend legacy `_davSPACE` dal pacchetto e corretto il relativo controllo di progetto.
- Versioni e metadati sincronizzati su `1.1.0`.

## 1.0.1
- Patch release di riallineamento dopo l’aggiornamento del file di release.
- Versioni, metadati, launcher, documentazione, test e workflow sincronizzati su `1.0.1`.
- Nessuna modifica funzionale rispetto alla v1.0.0.

## 1.0.0
- Prima release stabile di _davUNINSTALL.
- Modalità di controllo eliminazione Basso, Medio e Alto.
- Flusso automatico Alto con doppia conferma, attesa del processo di disinstallazione, scansione profonda, pulizia e verifica finale.
- Scansione profonda Windows di file, cartelle, chiavi e singoli valori del Registro attribuibili al prodotto.
- Scansione forzata per programmi già disinstallati.
- Backup `.reg`, manifest delle operazioni e rivalidazione immediatamente prima della rimozione.
- Gestione idempotente di chiavi/valori già assenti.
- Avvio robusto delle `UninstallString` Windows, inclusi percorsi quotati, MSI e richiesta UAC.
- Pulizia TEMP prudente con controllo del contenuto più recente delle directory e protezione da symlink/reparse point.
- Operazioni pesanti spostate fuori dal thread UI.
- Design, motion system, impostazioni e launcher riallineati alla suite _davstudios.
- Workflow GitHub Release stabile multipiattaforma.

## 0.11.5
- Hardening pre-release: TEMP directory age, reparse point, task asincroni, valori predefiniti del Registro localizzati e script npm sincronizzati.

## 0.11.4
- Corretto il launcher Windows e la preparazione delle sessioni di sviluppo precedenti.

## 0.11.3
- La modalità Alta attende la chiusura reale del processo di disinstallazione invece di dipendere dalla scomparsa della chiave Uninstall.

## 0.11.2
- Gestione automatica di vecchie sessioni Vite/Tauri e porta di sviluppo occupata.

## 0.11.1
- Migliorate animazioni Residui e leggibilità dei menu a tendina nelle Impostazioni.

## 0.11.0
- Introdotte le modalità Basso / Medio / Alto.

## 0.10.2
- Ottimizzata la scansione profonda del Registro evitando traversate globali ripetute.

## 0.10.1
- Gestione idempotente delle voci Registro già assenti e migliore reattività UI.

## 0.10.0
- Nuovo motore Windows di scansione profonda post-disinstallazione.

## 0.9.1
- Corretto l'avvio delle UninstallString Windows con percorsi tra virgolette.

## 0.9.0
- Release candidate iniziale per il collaudo reale della catena disinstallazione → scansione → pulizia → verifica.

## 0.2.1
- Rifinita l'animazione della pagina Residui.

## 0.2.0
- Migliorato il motion system delle pagine e degli elementi interattivi.

## 0.1.0
- Prima preview di _davUNINSTALL.

