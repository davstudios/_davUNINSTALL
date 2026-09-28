# Supporto multipiattaforma

## Windows

È la piattaforma principale della v1.1.1. Supporta lettura dei programmi dal Registro, avvio e attesa del disinstallatore registrato, modalità Basso/Medio/Alto, scansione profonda di file/cartelle e Registro, backup, rimozione, verifica post-pulizia e pulizia selettiva della TEMP utente.

## macOS

La v1.1.1 rileva applicazioni `.app` in `/Applications` e `~/Applications` e può analizzare residui utente con regole conservative. La rimozione profonda automatica e la pulizia temporanei generalizzata restano disabilitate per evitare operazioni distruttive non ancora validate sulla piattaforma.

## Linux

La v1.1.1 rileva pacchetti `dpkg` e applicazioni Flatpak quando i relativi strumenti sono disponibili e può analizzare residui con regole conservative. La rimozione profonda automatica e la pulizia temporanei generalizzata restano disabilitate.
