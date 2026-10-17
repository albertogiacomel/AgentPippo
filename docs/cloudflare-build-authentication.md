# Audit delle credenziali di build Cloudflare

Il workflow manuale `Audit Cloudflare build authentication` verifica dall'interno
di GitHub Actions il token di distribuzione già configurato, senza esportarlo.
Esegue soltanto GET sull'account dei giochi, sui due Worker `battleship` e
`word-chain-game` e sui rispettivi trigger. Non cambia token o configurazioni.

L'artefatto `cloudflare-build-authentication` contiene soltanto stato HTTP,
codici di errore, identificatori e comandi dei trigger. Non contiene credenziali,
variabili di ambiente dei trigger o risposte API complete. Un HTTP 403 indica
che il token disponibile non può accedere alla risorsa richiesta; non dimostra
che l'account del gioco sia diverso da quello di Pippo o Salti.

La riuscita di GitHub Actions e quella dei controlli esterni `Workers Builds`
devono essere verificate separatamente prima di dichiarare riuscita una build.
