# _davUNINSTALL

_davUNINSTALL è l'utility di disinstallazione e pulizia residui della suite _davstudios. La release candidate v0.11.5 offre il flusso completo di disinstallazione, scansione profonda, backup e pulizia automatica su Windows. Su macOS e Linux, in questa RC, l'app rileva le applicazioni e analizza residui utente in sola lettura: la parità completa di disinstallazione/pulizia non è ancora abilitata.

## Funzioni della v0.11.5

- elenco applicazioni installate con ricerca e dettagli;
- avvio del comando di disinstallazione registrato su Windows;
- modalità di controllo eliminazione **Basso / Medio / Alto**;
- scansione profonda dei residui del file system in posizioni software note e cartelle del produttore;
- scansione mirata di chiavi e singoli valori del Registro Windows;
- backup `.reg` prima di modificare chiavi o valori;
- manifest locale della pulizia e rivalidazione immediatamente prima della rimozione;
- file e cartelle residui inviati al Cestino di Windows;
- verifica post-rimozione con rimossi, verificati, già assenti, errori ed elementi ancora presenti;
- scansione forzata per programmi già disinstallati;
- pulizia TEMP utente su Windows con soglia 7/14/30 giorni;
- tema Sistema/Chiaro/Scuro, Italiano/English e design system condiviso con la suite _davstudios.

## Modalità di controllo eliminazione

- **Basso**: avvia solo il disinstallatore ufficiale registrato.
- **Medio**: dopo la disinstallazione consente di analizzare i residui e scegliere manualmente cosa rimuovere.
- **Alto**: richiede due conferme iniziali, attende la chiusura reale del processo del disinstallatore e, solo se questo termina con un codice di successo, esegue scansione profonda e pulizia automatica dei soli candidati `Exact` / `High confidence` rivalidati dal backend.

La modalità Alta non amplia la whitelist: cartelle condivise, corrispondenze deboli o elementi ambigui restano esclusi. Se il disinstallatore restituisce un errore, la pulizia automatica non parte.

## Sicurezza

_davUNINSTALL non usa la semplice somiglianza di nome come autorizzazione alla rimozione. I candidati rimovibili devono essere classificati `Exact` o `High confidence`, vengono rigenerati dal backend al momento della pulizia e gli ID inviati dal frontend non possono trasformarsi in percorsi arbitrari.

Su Windows le chiavi Registro vengono esportate prima della modifica. La pulizia del file system evita link simbolici e reparse point. La pulizia TEMP considera una cartella idonea solo se **la cartella e tutti i suoi elementi discendenti** non risultano modificati da almeno la soglia scelta; se non è possibile ispezionare in sicurezza un elemento, quella directory viene saltata.

## Compatibilità piattaforme

### Windows

Flusso completo: elenco programmi, disinstallazione, modalità Alta, scansione file/cartelle, scansione e rimozione Registro, backup, verifica e pulizia TEMP.

### macOS

Rilevamento delle app `.app` in `/Applications` e `~/Applications` e analisi conservativa dei residui utente. Disinstallazione e pulizia automatica restano in sola lettura nella RC.

### Linux

Rilevamento pacchetti `dpkg` e applicazioni Flatpak quando disponibili e analisi conservativa dei residui utente. Disinstallazione e pulizia automatica restano in sola lettura nella RC.

## Avvio sviluppo

### Windows

Esegui `RUN-WINDOWS.bat`. Il launcher libera eventuali vecchie sessioni di sviluppo di questo progetto, sincronizza le dipendenze npm e avvia Tauri.

### macOS / Linux

Esegui `./RUN-MACOS.sh` o `./RUN-LINUX.sh`. Gli script sincronizzano le dipendenze npm prima dell'avvio.

Sono richiesti Node.js/npm, Rust/Cargo e i prerequisiti Tauri 2 della piattaforma.

## Privacy

L'analisi avviene localmente. _davUNINSTALL non invia l'elenco dei programmi, percorsi o dati del Registro a servizi online.

## Protocollo di collaudo prima della v1.0.0

Usa inizialmente programmi di terze parti non critici e facilmente reinstallabili. Verifica almeno un caso per ciascuna modalità Basso, Medio e Alto. In Medio controlla che i residui siano mostrati prima della rimozione; in Alto controlla che il flusso prosegua solo dopo la chiusura del disinstallatore e che la pagina Residui mostri il risultato finale.

Per i primi collaudi evita driver, runtime Microsoft, antivirus, componenti hardware e software di sistema.

## Versione

v0.11.5 Release Candidate
