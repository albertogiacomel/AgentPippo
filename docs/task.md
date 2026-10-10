# Contratto e verifica — revisione 2

Nota storica: questo contratto descrive la revisione Sites iniziale. Lo stato attuale del progetto GitHub e la nuova CI sono documentati in `resume.md` e `deployment.md`.

Task: porto_buffo_v2_20261010. Owner: Codex. Priorità: normale. Scope L1: correggere gioco web isolato dopo feedback dell’utente. Rischio basso. Privacy: reference grafica fornita dall’utente. Effetti: file del progetto e aggiornamento del medesimo sito Sites privato. Benchmark: not_applicable, nessun obiettivo prestazionale dichiarato.

Problema: la versione iniziale aveva emoji, scena ripetuta e sei casi basati sulla stessa sequenza di azioni, senza veri enigmi. La revisione aggiunge fondali illustrati, sprite basate sul riferimento dell’utente, azioni contestuali, spostamenti tra luoghi, dialoghi selezionabili, diario, hint progressivi e sei meccaniche diverse. La carriera e i potenziamenti sono preservati.

Accettazione: storia di sei capitoli risolvibili; due luoghi per capitolo; indovinelli con feedback; sequenza sonora; combinazione dei colori; deduzione con due indizi; riordino dei pacchi; combinazione telo/corda; caso finale con indovinello e direzione. Nessun consumo irreversibile su errori. Salvataggi v1 migrati. Layout mobile e sprite animate.

Piano: implementazione completata; test del motore e campagna browser completati; packaging e pubblicazione successivi. Verifiche: `scripts/game_test.cjs`, `scripts/browser_test.cjs`, controllo sintassi JavaScript. Il browser test produce un report strutturato e screenshot desktop/mobile in artifacts. Nessuna GitHub Actions configurata: non dichiarare CI remota.

Backup/rollback: la precedente versione Sites e il commit b6ab632f86f55df760fa54a21d2655ffe7711514 restano disponibili. Lo storage v1 è conservato e non viene cancellato dalla migrazione. Nessuna modifica di sistemi esterni al progetto.

Limiti: KB PostgreSQL, CBMM, backlog R73, RACI e gate NAS non verificati dal workspace; non vengono simulati. Snapshot SOUL_GLOBAL già consultato nella sessione: 2026-10-10, sync iniziale non verificato. Nessuna modifica delle regole globali. La voce italiana dipende dal browser e non è stata ascoltata automaticamente; simboli e testo sono sempre disponibili.
