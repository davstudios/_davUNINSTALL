# Supporto multipiattaforma — _davUNINSTALL v26.10.1

## Windows

È la piattaforma principale della v26.10.1. Supporta lettura dei programmi dal Registro, avvio e attesa del disinstallatore registrato, modalità Basso/Medio/Alto, scansione profonda di file/cartelle e Registro, backup, rimozione, verifica post-pulizia e pulizia selettiva della TEMP utente.

## macOS

La v26.10.1 rileva applicazioni `.app` in `/Applications` e `~/Applications` e può analizzare residui utente con regole conservative. La rimozione profonda automatica e la pulizia temporanei generalizzata restano disabilitate per evitare operazioni distruttive non ancora validate sulla piattaforma.

## Linux

La v26.10.1 rileva pacchetti `dpkg` e applicazioni Flatpak quando i relativi strumenti sono disponibili e può analizzare residui con regole conservative. La rimozione profonda automatica e la pulizia temporanei generalizzata restano disabilitate.

## Release

Il workflow GitHub costruisce e pubblica automaticamente installer NSIS per Windows, Universal DMG per macOS e AppImage/DEB per Linux quando viene pubblicato un tag `v*` coerente con la versione del progetto. La Description bilingue 🇮🇹/🇺🇸 del commit associato al tag viene utilizzata come descrizione della GitHub Release; il workflow interrompe la pubblicazione se una delle due sezioni manca.
