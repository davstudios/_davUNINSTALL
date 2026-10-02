# _davUNINSTALL

_davUNINSTALL è il disinstallatore e analizzatore di residui di _davstudios. La v26.10.1 adotta il nuovo standard di release `_davstudios` e il versioning `YY.M.REVISIONE`, mantenendo invariato il flusso completo di disinstallazione e pulizia profonda su Windows, con analisi locale, backup del Registro e verifica post-rimozione. Su macOS e Linux l'app mantiene il rilevamento e l'analisi conservativa, mentre le operazioni distruttive avanzate restano intenzionalmente limitate.

## Funzioni della v26.10.1

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

Rileva applicazioni `.app` in `/Applications` e `~/Applications` e consente analisi conservativa dei residui utente. La rimozione profonda automatica e la pulizia TEMP generalizzata non sono abilitate nella v26.10.1.

### Linux

Rileva pacchetti `dpkg` e applicazioni Flatpak quando gli strumenti sono disponibili e consente analisi conservativa. La rimozione profonda automatica e la pulizia TEMP generalizzata non sono abilitate nella v26.10.1.

## Installazione delle release GitHub non firmate

Le release di `_davUNINSTALL` sono distribuite direttamente tramite GitHub e, al momento, non utilizzano certificati commerciali di code signing o notarizzazione Apple. Il codice sorgente è disponibile pubblicamente con licenza MIT.

### Windows

Windows SmartScreen può mostrare l'avviso **“Windows ha protetto il PC”** perché l'installer non è firmato con un certificato di publisher attendibile. Se hai scaricato il file dalla repository GitHub ufficiale di `_davstudios`, seleziona **Ulteriori informazioni** e poi **Esegui comunque**.

### macOS

Gatekeeper può impedire la prima apertura perché l'app non è firmata con Developer ID e non è notarizzata da Apple. Dopo aver tentato di aprire l'app, vai in **Impostazioni di Sistema → Privacy e Sicurezza**, individua il messaggio relativo a `_davUNINSTALL` e scegli **Apri comunque**.

### Linux

Per un'AppImage può essere necessario rendere il file eseguibile prima dell'avvio:

```bash
chmod +x _davUNINSTALL*.AppImage
```

Scarica sempre le release dalla repository GitHub ufficiale di `_davstudios`. Quando viene pubblicato un hash SHA-256, puoi usarlo per verificare l'integrità del file scaricato.

## Informazioni pacchetto

- Developer / Publisher: `_davstudios`
- Homepage: https://davstudios.it
- Copyright: © 2026 _davstudios
- Licenza: MIT
- Categoria: Productivity
- Bundle identifier: `studio.dav.uninstall`
- Versione corrente: `26.10.1`

## Installing unsigned GitHub releases

`_davUNINSTALL` releases are distributed directly through GitHub and currently do not use a commercial Windows code-signing certificate or Apple Developer ID notarization. The source code is publicly available under the MIT License.

### Windows

Windows SmartScreen may display **“Windows protected your PC”** because the installer is not signed by a trusted publisher certificate. If you downloaded the file from the official `_davstudios` GitHub repository, choose **More info** and then **Run anyway**.

### macOS

Gatekeeper may block the first launch because the app is not signed with Developer ID and notarized by Apple. After attempting to open the app, go to **System Settings → Privacy & Security**, find the `_davUNINSTALL` message and choose **Open Anyway**.

### Linux

An AppImage may need to be marked as executable before launch:

```bash
chmod +x _davUNINSTALL*.AppImage
```

Always download releases from the official `_davstudios` GitHub repository. When a SHA-256 hash is published, you can use it to verify the integrity of the downloaded file.

## Package information

- Developer / Publisher: `_davstudios`
- Homepage: https://davstudios.it
- Copyright: © 2026 _davstudios
- License: MIT
- Category: Productivity
- Bundle identifier: `studio.dav.uninstall`
- Current version: `26.10.1`

## Avvio sviluppo

### Windows

Esegui `RUN-WINDOWS.bat`.

### macOS / Linux

Esegui rispettivamente `./RUN-MACOS.sh` o `./RUN-LINUX.sh`.

Sono richiesti Node.js/npm, Rust/Cargo e i prerequisiti Tauri 2 della piattaforma.

## Build

- Windows: `BUILD-WINDOWS.bat`
- macOS: `./BUILD-MACOS.sh`
- Linux: `./BUILD-LINUX.sh`

La GitHub Release stabile viene generata automaticamente dal workflow quando viene pubblicato un tag `v*` coerente con la versione dell'app. La Description bilingue 🇮🇹/🇺🇸 del commit associato al tag viene utilizzata come descrizione della release.

## Privacy

L'analisi avviene localmente. _davUNINSTALL non invia elenco dei programmi, percorsi, chiavi del Registro o altri dati a servizi online.

## Versione

v26.10.1 · Release stabile
