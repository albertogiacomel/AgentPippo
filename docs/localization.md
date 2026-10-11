# Lingua e impostazioni

Il gioco adotta lo stesso schema di `website/lib/contexts.tsx` su giacomel.info: uno stato lingua condiviso seleziona `CONTENT_IT` o `CONTENT_EN` e aggiorna i componenti che lo consumano. Nel sito il rendering usa React Context; nel gioco senza framework usa sottoscrizioni e associazioni esplicite tra contenuto originale e nodo DOM.

`dist/content.js` costruisce i due cataloghi completi dai contenuti dei capitoli, `en.js` e `en_ui.js`. La ricerca è sulla chiave intera; nessuna sostituzione di parole dentro frasi, nessuna traduzione inversa del testo inglese. I messaggi con contatori usano i template `stars`, `chapter`, `locked`. I messaggi composti da elementi del gioco hanno voci complete derivate dai dati canonici.

`PippoI18n.update({language: 'en'})` valida e salva le preferenze, seleziona il catalogo e aggiorna sincronicamente testo, attributi accessibili e selettori. Non ricarica la pagina e non modifica la partita. `text(node, source)` e `attribute(node, name, source)` mantengono il contenuto originale anche dopo più cambi lingua; `subscribe(callback)` sincronizza le impostazioni. `clearText(node)` rimuove un'associazione prima di sostituire testo con illustrazioni. Questo evita che un cambio lingua cancelli gli SVG del laboratorio o dell'officina.

Nuove etichette richiedono la voce inglese completa e un'associazione `text`/`attribute`. Non inserire testo tradotto dentro `innerHTML`: creare uno span associato accanto agli SVG. `missing()` segnala etichette associate senza voce nel catalogo.

Il salvataggio delle preferenze resta `agent_pippo_settings`; partita e cloud mantengono il formato precedente. I suoni si applicano agli effetti; la lettura dei dialoghi segue la preferenza voce della partita. Guidata/Normale/Sfida mantengono le regole esistenti.

Regressioni verificate: apertura Impostazioni con puntatore desktop/mobile, selettore IT/EN ripetuto con menu ancora aperto, nessuna navigazione o sostituzione dello stato, titolo e aria-label immediati, cambio lingua durante gli enigmi e in tutti i reparti senza perdere illustrazioni, feedback e indizi completi, persistenza dopo riapertura. La campagna Edge attraversa tutti e sei i casi in ciascuna lingua; unit test e runtime Cloudflare verificano cataloghi, preferenze, difficoltà e salvataggi.

Per verificare il dominio pubblicato su Windows impostare `AGENT_PIPPO_URL=https://agentpippo.giacomel.info` prima di `npm run test:browser`. Il test usa un profilo Edge isolato e simula le richieste cloud dell'interfaccia; le API D1 reali sono verificate separatamente dal workflow di deploy.
