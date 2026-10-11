# Ripresa sviluppo — AgentePippo

Aggiornamento grafica/audio 2026-10-11: sei fondali ridisegnati, atlas Pippo rifinito, tre personaggi secondari in celle separate. `dist/art.js` visualizza i nuovi atlas illustrati di trenta oggetti e sei veicoli in contenitori SVG; anteprime illustrate nei reparti. `dist/speech.js` sceglie voci italiane naturali quando disponibili, preferenza maschile per Pippo/Berto e femminile per Ada, ritmo e tono moderati, lettura frase per frase e cancellazione delle battute precedenti. Nessun servizio vocale a pagamento: timbro e disponibilità dipendono dal browser/dispositivo. Test specifico `scripts/speech_test.cjs`; nessuna modifica al formato dei salvataggi o alle soluzioni degli enigmi.

Stato salvato: 2026-10-11. Repository: https://github.com/albertogiacomel/AgentPippo . Cartella locale: `source/AgentPippo` nella home utente. Questo documento è il punto di ingresso per le prossime sessioni.

Stato corrente: produzione https://agentpippo.giacomel.info, dominio Cloudflare attivo con HTTPS. Aggiunto solo il CNAME del nuovo sottodominio; nessuna modifica ad apex o www. Pubblicazione automatica tramite GitHub Actions su main. Il repository `albertogiacomel/website`, cartella `source/website`, presenta il gioco in Experiments (`contents/hobbies.ts`, italiano/inglese) con immagine locale e link demo/GitHub.

Fix successivo 2026-10-11: cambio lingua ora sincrono, senza reload e senza chiudere menu/enigmi. Root cause: sostituzioni parziali con regex e reload del selettore impedivano l'aggiornamento uniforme e azzeravano il contesto del menu. `content.js` espone `CONTENT_IT`/`CONTENT_EN`, selezionati dallo stato condiviso come giacomel.info. `i18n.js` associa contenuti originali a testo/attributi, aggiorna tutti i consumer e rimuove associazioni obsolete quando il pannello passa a SVG. Dettagli e verifiche in `localization.md`; nessuna modifica al formato delle partite o al sito portfolio.

Localizzazione completa di capitoli, dialoghi, enigmi, garage, reparti e salvataggi tramite `en.js`, `en_ui.js`, `i18n.js`. `settings.js`/`settings.css` gestiscono EN/IT, suoni, narrazione e difficoltà. Preferenze in `agent_pippo_settings`, separate dal cloud. Guidata conserva note corrette e offre aiuti espliciti; Normale suggerimenti progressivi; Sfida riduce gli indizi. Gli identificatori dello stato restano indipendenti dalla lingua. Verifiche: build, motore/localizzazione/backend, workerd+D1 e campagna Edge in entrambe le lingue. La voce sintetizzata dipende dalle voci installate sul dispositivo.

Aggiornamento backend: utente autorizza Cloudflare D1 purché gratuito (eccezione esplicita alla regola PostgreSQL per questo gioco). Prima fase implementata: salvataggi cloud manuali, codice di ripresa, validazione e revisioni atomiche. Leggere `cloud_backend.md`. Test reale workerd/D1 locale e interfaccia cloud disponibili. Credenziali NAS valide ma non autorizzate all’account del link: scelta account richiesta, nessun deployment remoto eseguito. KB e CBMM NAS ora raggiungibili; CBMM del repository NAS pronto, non un indice di questo progetto Windows.

Nuovi file: `backend/save.mjs`, `functions/api/save.js`, `migrations/0001_saves.sql`, `dist/cloud.js`, `dist/cloud.css`. Il motore resta locale; non dichiararlo spostato interamente sul server. L’ambiente Cloudflare locale richiede `npm ci`; Wrangler è vincolato nel lockfile. `npm run test:cloud` verifica D1 reale. Vercel rimane compatibile per il frontend statico, senza API Cloudflare.

Aggiornamento 2026-10-11: token dell’account indicato dall’utente verificato attivo, accesso Pages/D1 confermato. Progetto remoto `agent-pippo`, URL https://agent-pippo.pages.dev ; DB D1 `agent-pippo`, binding DB configurato in `wrangler.toml`; schema remoto applicato. Nessun upgrade a pagamento. Pubblicazione con `npx wrangler pages deploy dist --project-name agent-pippo --branch main`, usando credenziali nell’ambiente del processo. Non inserire token nei file. giacomel.info rimane indipendente. Il deploy è Direct Upload: un push GitHub verifica la CI ma **non** ripubblica automaticamente Pages.

Pubblicazione Cloudflare completata e verificata tramite `npm run test:cloud:live`: sito HTTP 200, copia/ripresa, isolamento, invalid state, foreign origin, conflitto tra due scritture e pulizia della partita sintetica PASS. Per riprendere nei prossimi giorni usare questa URL e questa cartella. Le credenziali fornite in chat sono state usate solo in memoria nei processi: non sono state salvate in file, GitHub o KB. Per future pubblicazioni autenticare Wrangler o fornire il token tramite ambiente sicuro.

Collegamento automatico GitHub (2026-10-11): `.github/workflows/ci.yml` pubblica sul progetto Pages esistente dopo i test, esclusivamente per push su `main`. Pull request eseguono i test senza pubblicare. Il token di deploy è nel secret cifrato GitHub `CLOUDFLARE_API_TOKEN`, escluso dai file e dalla KB. Il job di produzione è serializzato e verifica le API live, eliminando la propria partita sintetica. L’integrazione usa Actions + Direct Upload; la dashboard Pages non mostra un collegamento Git nativo. Le migrazioni D1 future restano manuali e vanno applicate prima di pubblicare codice che le richiede.

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

Fix lettura incompleta 2026-10-11: tutte le frasi sono accodate subito alla sintesi e conservate per riferimento, senza dipendere dagli eventi onend per avviare la frase successiva. La pulizia dei due punti elimina solo i nomi Pippo/Berto/Ada, non il contenuto dei messaggi. Gli enigmi leggono anche gli indizi; il cambio di enigma legge feedback e nuovo prompt insieme senza cancellazioni consecutive. Test con tutti e sei gli intro completi e callback finale assente.

Verifica voci: nomi estesi dei personaggi normalizzati; priorità al genere prima della qualità naturale. Edge reale seleziona Microsoft Diego Online Natural per Pippo/Berto/Barone e Microsoft Elsa Online Natural per Ada la fornaia. Report sanitizzato in artifacts/voice_verification.json. Su altri dispositivi si usano le voci disponibili; nomi non riconosciuti non hanno metadati di genere affidabili.

Fix direzione camminata: Pippo si orienta a sinistra/destra in base alla posizione effettivamente renderizzata, anche durante inversioni rapide. Sprite specchiata tramite facing-left; limiti della scena e centro di destinazione calcolati sulla larghezza reale desktop/mobile. Animazione termina con transitionend o timer di sicurezza. Regressione browser copre due inversioni, arresto e bordi su entrambe le dimensioni.
