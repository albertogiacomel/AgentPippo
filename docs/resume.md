# Ripresa sviluppo — AgentePippo

Stato salvato: 2026-10-10. Repository previsto: https://github.com/albertogiacomel/AgentPippo . Cartella locale: `source/AgentPippo` nella home utente. Questo documento è il punto di ingresso per le prossime sessioni.

## Obiettivo e preferenze

Gioco web punta e clicca per bambino di 6 anni, in italiano, avventura umoristica ispirata alle meccaniche classiche di Monkey Island. Personaggi originali, nessun asset della serie. Il protagonista poliziotto Pippo segue il riferimento grafico fornito dall’utente: capelli castani, giacca blu, camicia verde, distintivo, pantaloni grigi. Evitare scene ripetitive e missioni tutte uguali; mantenere enigmi reali e feedback senza punizioni.

## Funzionalità completate

Sei capitoli: indovinello della chiave; melodia Sole-Luna-Sole-Stella; rosso+giallo=arancione; deduzione guanti rossi e stivali infangati; pacchi piccolo-medio-grande; telo+corda=aquilone, indovinello e nuvola sul mare aperto. Due luoghi per capitolo; sei fondali illustrati; sprite di Pippo animate; dialoghi, inventario, diario, suggerimenti e voce facoltativa.

Carriera: ogni caso dà 5 stelle una sola volta; ogni nuovo mezzo/reparto costa 2 stelle. Mezzi: bicicletta, moto, auto, sportiva, camion, elicottero. Tutti gli acquistati possono essere selezionati gratuitamente. `vehicle` rappresenta il massimo acquistato; `activeVehicle` quello scelto. Mezzi nella scena e animazioni di viaggio, campanello/faro/lampeggianti/sprint. Il camion è richiesto per consegnare i pacchi; elicottero richiesto per raggiungere il faro. Avanzare richiede caso risolto, mezzo adeguato selezionato e reparto successivo costruito.

Reparti utilizzabili: ufficio con fascicolo e partenze; radio con spartito scoperto; laboratorio con colori raccolti; archivio con confronto dei due indizi; officina con ordinamento/consegna; centro con aquilone e radar. Tutti i reparti già costruiti rimangono apribili.

## Mappa del codice

- `dist/engine.js`: stato, migrazioni, acquisti, selezione mezzi, strumenti e regole degli enigmi.
- `dist/game.js`: interfaccia, dialoghi, scene, input, salvataggio locale.
- `dist/vehicles.js`, `dist/garage.css`: mezzi SVG, garage, reparti e animazioni.
- `dist/index.html`, altri CSS, `dist/assets/`: pagina e grafica.
- `scripts/game_test.cjs`: motore, campagna, errori, migrazioni e reparti.
- `scripts/browser_test.cjs`: Edge su Windows, campagna UI, reload, garage, laboratorio, mobile; genera report e screenshot in `artifacts/`.
- `scripts/build.cjs`, `scripts/serve.cjs`: verifica artefatti e anteprima; nessuna dipendenza esterna.

## Riprendere

Leggere le istruzioni workspace applicabili e questo file; eseguire `git status`, `npm run build`, `npm test`. Su Windows con Edge usare anche `npm run test:browser`. Avviare `npm run dev`, aprire http://127.0.0.1:3000 . Consultare `docs/deployment.md` per Vercel/Pages. Aggiornare questo documento a ogni modifica importante.

## Cronologia e limiti

Versione Sites verificata: commit `ed328099fcb87fcc865c3f5153d6d595be702e2c`, URL https://agente-pippo-porto-buffo.brownauk3.chatgpt.site . La copia `porto_buffo` mantiene il flusso Sites; sviluppare il progetto GitHub in `AgentPippo` per evitare modifiche incrociate involontarie.

Le verifiche locali e browser erano passate; la voce non è stata ascoltata automaticamente. Persistenza locale al browser, nessuna sincronizzazione cloud o trasferimento automatico tra domini. NAS KB/CBMM e gate infrastrutturali non disponibili/verificati: non dichiararli completati. Nessun deployment Vercel/Cloudflare effettuato durante la preparazione del repository.
