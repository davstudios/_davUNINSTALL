# Supporto multipiattaforma — v0.11.5 RC

## Windows

È la piattaforma completa della release candidate: lettura programmi dal Registro, disinstallatore registrato, modalità Basso/Medio/Alto, scansione profonda file e Registro, backup, rimozione verificata e pulizia TEMP utente.

## macOS

La RC rileva applicazioni `.app` in `/Applications` e `~/Applications` e analizza residui utente con regole conservative. Disinstallazione automatica e rimozione residui restano in sola lettura.

## Linux

La RC rileva pacchetti `dpkg` e applicazioni Flatpak quando gli strumenti sono disponibili e analizza residui utente con regole conservative. Disinstallazione automatica e rimozione residui restano in sola lettura.

La v1.0.0 può quindi essere dichiarata **stabile Windows** con supporto di analisi su macOS/Linux, oppure la parità funzionale macOS/Linux va completata prima di definirla una release multipiattaforma completa.
