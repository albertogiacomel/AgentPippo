# ADR 0001 — Motore separato dalla presentazione

Stato: adottato. Data: 2026-10-10.

Problema: la v1 ripeteva lo stesso puzzle e mescolava regole e rendering. Si richiedono enigmi distinti e verifiche complete anche senza DOM.

Decisione: `engine.js` contiene stato e transizioni deterministiche; `game.js` traduce click e dialoghi in chiamate al motore. Nessun framework o dependency manager aggiunto. Gli atlas sono asset statici.

Conseguenze: test Node dei casi negativi e test Edge della campagna reale. La persistenza resta browser-local; v1 migrata prima dell'uso. I test non sostituiscono il controllo visivo degli atlas e la prova delle voci sul dispositivo.
