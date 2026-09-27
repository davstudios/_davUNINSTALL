# Changelog

## 1.1.0

- Nuova icona definitiva di _davUNINSTALL e set Tauri rigenerato per Windows, macOS e Linux.
- Corretto il test CI sul vecchio backend _davSPACE: ora verifica che il modulo non venga compilato né referenziato, senza fallire per un file legacy non utilizzato rimasto nel repository.
- Versioni, metadati, documentazione e workflow sincronizzati su `1.1.0`.


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
