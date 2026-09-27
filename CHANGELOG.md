# Changelog

## 0.11.5
- Audit completo pre-v1.0.0 e hardening senza cambiare il flusso di disinstallazione collaudato.
- TEMP: età delle cartelle calcolata sull'elemento discendente più recente.
- TEMP e operazioni relative spostate fuori dal thread UI.
- Esclusi link simbolici e reparse point dalle rimozioni file system.
- Gestiti i nomi localizzati del valore predefinito del Registro, incluso `(Predefinito)`.
- Script run/build sincronizzano sempre le dipendenze npm.
- Rimossi codice Rust e `space.rs` non utilizzati; documentazione riallineata.

## 0.11.4
- Corretto il launcher Windows: il percorso repository viene ricavato tramite `$PSScriptRoot`, evitando errori `GetFullPath` con barra finale/virgolette.

## 0.11.3
- Modalità Alta: attesa del processo reale del disinstallatore invece del polling infinito della chiave `Uninstall`.
- Scansione post-disinstallazione autorizzata dopo un exit code di successo; le voci Registro stale vengono trattate come residui.

## 0.11.2
- Pulizia automatica delle vecchie sessioni Vite/Tauri prima dell'avvio sviluppo Windows.
- Controllo sicuro della porta 17460 senza terminare processi estranei.

## 0.11.1
- Migliorate le animazioni della pagina Residui e la leggibilità del menu Controllo eliminazione.

## 0.11.0
- Introdotte le modalità Basso, Medio e Alto con doppia conferma per la pulizia automatica.

## 0.10.2
- Ottimizzata la scansione profonda del Registro evitando attraversamenti globali ripetuti.
- Migliorati gli indicatori di operazione in corso.

## 0.10.1
- Pulizia Registro idempotente: chiavi/valori già assenti non bloccano più il flusso.
- Scansioni e pulizia profonda spostate fuori dal thread UI.

## 0.10.0
- Nuovo motore Windows di scansione profonda post-disinstallazione per file, cartelle, chiavi e valori Registro.
- Piano di pulizia rivalidato, backup e verifica post-rimozione.
- Scansione forzata per programmi già rimossi dall'elenco.

## 0.9.1
- Corretto l’avvio di UninstallString Windows con percorsi tra virgolette, incluso Adobe HDBox/Uninstaller.exe.
- Avvio diretto dell’eseguibile e fallback UAC quando richiesto da Windows.

## 0.9.0
- Release candidate per collaudo reale di disinstallazione, scansione, pulizia e verifica.
- Aggiunta verifica post-rimozione e riepilogo con rimossi, verificati, saltati, errori e backup.

## 0.2.1
- Rifinita l’animazione della pagina Residui.

## 0.2.0
- Migliorato il motion system delle pagine e degli elementi interattivi.

## 0.1.4
- Migliorata l’icona Aggiorna.

## 0.1.3
- Riallineata la shell a _davCONVERT e corretto il layout a tutta altezza.
- Migliorate le icone Applicazioni e Temporanei.

## 0.1.2
- Primo intervento sul layout verticale della shell.

## 0.1.1
- Migliorate le prime icone di navigazione e la pagina Temporanei.

## 0.1.0
- Prima preview di _davUNINSTALL.
- Elenco applicazioni installate, disinstallazione registrata, analisi residui e pulizia temporanei conservativa.
- Backup del Registro di Windows prima della rimozione di chiavi residue.
