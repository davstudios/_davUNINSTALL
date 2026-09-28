# _davUNINSTALL

_davUNINSTALL è il disinstallatore e analizzatore di residui di _davstudios. La v1.1.1 mantiene il flusso completo di disinstallazione e pulizia profonda su Windows, con analisi locale, backup del Registro e verifica post-rimozione. Su macOS e Linux l'app mantiene il rilevamento e l'analisi conservativa, mentre le operazioni distruttive avanzate restano intenzionalmente limitate.

## Funzioni della v1.1.1

- elenco delle applicazioni installate con ricerca, versione, produttore e percorso;
- avvio del disinstallatore registrato su Windows, incluso supporto a percorsi quotati, variabili d'ambiente e richiesta UAC quando necessaria;
- tre modalità di controllo eliminazione: **Basso**, **Medio** e **Alto**;
- scansione profonda post-disinstallazione di file e cartelle nelle principali posizioni software di Windows;
- scansione del Registro per chiavi e singoli valori attribuibili all'app tramite nome, publisher, percorso e GUID/Product Code;
- scansione forzata per programmi già rimossi dall'elenco;
- selezione manuale dei residui sicuri in modalità Media;
- flusso automatico in modalità Alta con doppia conferma iniziale;
- backup `.reg` prima delle modifiche al Registro e manifest locale delle operazioni;
- rivalidazione immediatamente prima della rimozione;
- verifica post-pulizia con conteggio di rimossi, verificati, già assenti, saltati, errori ed eventuali elementi ancora presenti;
- file e cartelle rimossi tramite Cestino su Windows quando possibile;
- pulizia prudente della cartella TEMP dell'utente su Windows con soglia 7/14/30 giorni;
- esclusione di link simbolici e reparse point dalle operazioni distruttive;
- tema Sistema/Chiaro/Scuro, Italiano/English e design system coerente con la suite _davstudios.

## Modalità di controllo eliminazione

**Basso** avvia soltanto il disinstallatore ufficiale registrato. Non viene eseguita alcuna scansione automatica.

**Medio** avvia il disinstallatore e lascia all'utente la scansione e la scelta manuale dei residui da rimuovere.

**Alto** richiede due conferme esplicite, attende la chiusura reale del processo di disinstallazione, esegue la scansione profonda e rimuove automaticamente soltanto i candidati `Exact` / `High confidence` rivalidati dal backend. Corrispondenze deboli, directory condivise e elementi ambigui non vengono rimossi automaticamente.

## Sicurezza

_davUNINSTALL non considera sufficiente una semplice somiglianza di nome. La rimozione accetta soltanto candidati esatti o ad alta confidenza prodotti dal backend e rivalidati al momento dell'operazione. Le chiavi del Registro interessate vengono esportate prima della modifica. Gli ID inviati dal frontend non possono trasformarsi in percorsi arbitrari.

La pulizia TEMP è limitata alla cartella temporanea dell'utente su Windows. Per le directory viene considerata anche la data di modifica più recente dei contenuti, e link simbolici/reparse point vengono esclusi.

## Supporto piattaforme

### Windows

È la piattaforma con il flusso completo: rilevamento applicazioni, disinstallazione, scansione profonda, backup e pulizia di file/cartelle/Registro, modalità Alta automatica e pulizia TEMP.

### macOS

Rileva applicazioni `.app` in `/Applications` e `~/Applications` e consente analisi conservativa dei residui utente. La rimozione profonda automatica e la pulizia TEMP generalizzata non sono abilitate nella v1.1.1.

### Linux

Rileva pacchetti `dpkg` e applicazioni Flatpak quando gli strumenti sono disponibili e consente analisi conservativa. La rimozione profonda automatica e la pulizia TEMP generalizzata non sono abilitate nella v1.1.1.

## Avvio sviluppo

### Windows

Esegui `RUN-WINDOWS.bat`.

### macOS / Linux

Esegui rispettivamente `./RUN-MACOS.sh` o `./RUN-LINUX.sh`.

Sono richiesti Node.js/npm, Rust/Cargo e i prerequisiti Tauri 2 della piattaforma.

## Privacy

L'analisi avviene localmente. _davUNINSTALL non invia elenco dei programmi, percorsi, chiavi del Registro o altri dati a servizi online.

## Versione

v1.1.1 · Release stabile
