# Videogames Kit — integrazione AgentPippo

Versione inclusa: 0.2.0. Moduli e stili locali, nessuna libreria scaricata a runtime. La copia vendorizzata è verificata tramite SHA256 durante ogni build; aggiornarla dal progetto source/videogames-kit con npm run sync:consumers.

Impostazioni comuni: lingua IT/EN, aspetto Sistema/Chiaro/Scuro, animazioni ridotte, contrasto, mute generale e canali disponibili, difficoltà specifica. Il pulsante fullscreen usa l'API nativa con fallback CSS. Il controller apre il menu con View/Select (pulsante 8); D-pad per navigare, sinistra/destra per cambiare una select, A per attivare, B per chiudere.

Le preferenze usano ag-games:<id>:settings:v1. Le chiavi precedenti vengono lette e conservate: reset preferenze non cancella i progressi. Nessuna modifica agli schemi di partita o ai salvataggi cloud. Tema UI e mondo di gioco rimangono separati.

Verifiche locali: npm run build, npm run test:kit, npm run test:kit:browser; eseguire anche i test specifici del motore. Il test browser usa un profilo isolato e blocca servizi TTS remoti, font di rete e script pubblicitari per non generare richieste esterne non necessarie. BROWSER_BINARY può indicare Chrome/Edge.

CI aggiornata per build, integrità, migrazioni e browser. In questa attività non sono stati eseguiti commit, push o deploy; le esecuzioni remote nuove restano da verificare dopo pubblicazione autorizzata.

Lo script classico game-kit.js e lo stylesheet game-kit.css mantengono anche l’edizione file:// e floppy. Lettura automatica e ascolto manuale restano distinti; il mute generale blocca entrambi.
