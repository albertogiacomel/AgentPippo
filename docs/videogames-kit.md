# Videogames Kit — integrazione AgentPippo

Versione inclusa: 0.3.0. Moduli e stili locali, nessuna libreria scaricata a runtime. La copia vendorizzata è verificata tramite SHA256 durante ogni build; aggiornarla dal progetto source/videogames-kit con `KIT_SYNC_MODE=plan` per l’anteprima e `KIT_SYNC_MODE=write` per applicare; `KIT_CONSUMER` seleziona un singolo gioco. Il manifest registra il commit sorgente `6d916d602253ea8160922d9867eebb2cdb58ebfc`.

Impostazioni comuni: lingua IT/EN, aspetto Sistema/Chiaro/Scuro, animazioni ridotte, contrasto, mute generale e canali disponibili, difficoltà specifica. Il pulsante fullscreen usa l'API nativa con fallback CSS. Il controller apre il menu con View/Select (pulsante 8); D-pad per navigare, sinistra/destra per cambiare una select, A per attivare, B per chiudere.

Le preferenze usano ag-games:<id>:settings:v1. Le chiavi precedenti vengono lette e conservate: reset preferenze non cancella i progressi. Nessuna modifica agli schemi di partita o ai salvataggi cloud. Tema UI e mondo di gioco rimangono separati.

Verifiche locali: npm run build, npm run test:kit, npm run test:kit:browser; eseguire anche i test specifici del motore. Il test browser usa un profilo isolato e blocca servizi TTS remoti, font di rete e script pubblicitari per non generare richieste esterne non necessarie. BROWSER_BINARY può indicare Chrome/Edge.

La CI del gioco verifica build, integrità, migrazioni e browser. La CI centrale del kit prova il candidato su tutti e sette i consumer prima della release. I risultati sono associati ai commit effettivamente testati; la pubblicazione segue il workflow del repository.

Lo script classico game-kit.js e lo stylesheet game-kit.css mantengono anche l’edizione file:// e floppy. Lettura automatica e ascolto manuale restano distinti; il mute generale blocca entrambi.

UX 0.3.0: impostazioni raggruppate per argomento, messaggio sulle modifiche immediate, pulsante finale Fatto, conferma del reset nel dialogo e stato del salvataggio. Il mute generale disabilita i controlli dei singoli canali conservandone i valori. Il fullscreen espone lo stato attivo. Le pause per impostazioni, visibilità e utente restano indipendenti; chiudere un dialogo non annulla gli altri motivi di pausa.
