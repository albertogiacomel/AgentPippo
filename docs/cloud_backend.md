# Backend gratuito Cloudflare — salvataggi

Il frontend rimane statico e offline. Cloudflare Pages Functions espone `GET /api/save` e `PUT /api/save`; D1 conserva una riga per partita. La prima fase sposta persistenza, validazione del formato e gestione delle revisioni sul backend. Le regole di enigmi, stelle e carriera restano locali: non è ancora un server autorevole sulle azioni.

L’utente sceglie **Salvataggi → Crea copia cloud**, quindi usa **Salva nel cloud** dopo aver giocato. Per un altro dispositivo, copia il codice e usa **Riprendi con questo codice** sullo stesso sito Cloudflare. Nessuna email o dato del bambino richiesto. Il codice casuale di 256 bit autorizza lettura e scrittura: chi lo possiede accede alla partita. Il database memorizza solo il suo hash SHA-256.

Il salvataggio è manuale, senza polling né una scrittura per ogni clic. La revisione viene verificata atomicamente in SQL: un dispositivo con copia vecchia riceve 409 e deve riprendere la versione cloud, evitando sovrascritture silenziose. Riprendere chiede conferma e conserva il precedente stato locale in `porto_buffo_cloud_backup`. Creare una nuova partita locale non cancella automaticamente la copia cloud.

## Piano Free

Verificato il 2026-10-10: Workers Free 100.000 richieste/giorno e 10 ms CPU per invocazione; D1 Free 5 milioni di righe lette/giorno, 100.000 scritte/giorno, 5 GB totali. La quota è condivisa con gli altri progetti nell’account. A quota D1 esaurita le query falliscono; il gioco continua localmente. Non attivare Workers Paid. Nessuna funzione Workers AI, R2 o servizio esterno a pagamento è necessaria.

Fonti: https://developers.cloudflare.com/workers/platform/pricing/ e https://developers.cloudflare.com/d1/platform/pricing/

## Attivazione nell’account scelto

Configurazione AgentePippo del 2026-10-11: account `291702df5c8eef8684918f4f92ca4c4d`; progetto Pages `agent-pippo`; database D1 `agent-pippo`, UUID `82f87023-a583-4e66-ac43-fdde44b1a07e`. Binding di produzione in `wrangler.toml`, schema remoto applicato. Le anteprime non hanno accesso al DB di produzione. URL operativo: https://agent-pippo.pages.dev . Pubblicazione e test sul servizio remoto completati con successo: creazione/ripresa, isolamento codici, stato non valido, origine estranea, revisione obsoleta, scritture simultanee. Partita sintetica di verifica eliminata.

1. Autenticare Wrangler con `npx wrangler login`, oppure usare credenziali già gestite nel relativo ambiente senza copiarle nel repository.
2. Verificare account e piano Free. Creare D1 `agent-pippo` dalla dashboard oppure `npx wrangler d1 create agent-pippo`.
3. Aggiungere a `wrangler.toml` il binding restituito da Cloudflare, con **UUID reale**:

```toml
[[d1_databases]]
binding = "DB"
database_name = "agent-pippo"
database_id = "UUID_RESTITUITO_DA_CLOUDFLARE"
migrations_dir = "migrations"
```

4. Eseguire `npx wrangler d1 migrations apply agent-pippo --remote`.
5. Creare/collegare il progetto Pages GitHub `albertogiacomel/AgentPippo` (build `npm run build`, output `dist`). In alternativa `npx wrangler pages deploy dist --project-name agent-pippo` pubblica asset e `functions/` dalla radice.
6. Verificare sul sito pubblicato creazione, caricamento su secondo browser e conflitto fra due copie. Controllare la quota nella dashboard.

Il Direct Upload con trascinamento dei soli asset e il deploy Vercel statico non attivano le Functions Cloudflare. In quei casi il gioco locale continua a funzionare e il pannello segnala cloud non disponibile. Il backend richiede che sito e API siano sullo stesso dominio.

## Verifiche locali

Verifica remota esplicita: `npm run test:cloud:live`, con `CLOUDFLARE_API_TOKEN` disponibile nel solo processo. Il test crea una partita sintetica e cancella esclusivamente quella riga D1 alla fine. Non è eseguito automaticamente dalla CI e non modifica le partite dei giocatori.

```sh
npm ci
npm run build
npm test
npm run test:cloud
```

`test:cloud` esegue una vera istanza workerd con D1 locale, migra lo schema e verifica isolamento dei codici, creazione, ripresa, dati invalidi, revisioni obsolete e scritture simultanee. `wrangler.local.toml` contiene un identificativo **esclusivamente locale** e non va pubblicato. Gli artefatti dei test restano in `artifacts/`.

Per provare il gioco con backend locale:

```sh
npx wrangler d1 execute DB --local --config wrangler.local.toml --persist-to artifacts/cloudflare_local --file migrations/0001_saves.sql
npm run dev:cloud
```

## Accesso NAS e stato pubblicazione

La procedura NAS è `/app/working/wiki/rules/cf_auth_setup.md`, modulo `/app/working/scripts/cf_auth.py`. Le verifiche di autenticazione vanno eseguite sul NAS usando `iter_auth_headers()`: il bridge remoto maschera i segreti in uscita. Non recuperare segreti stampandoli e non salvarli in artefatti.

Il 2026-10-10 le credenziali NAS erano valide ma non autorizzate all’account richiesto (403). Il 2026-10-11 l’utente ha fornito un token dell’account richiesto: verifica attiva e accesso Pages/D1 confermati; creati progetto e database dedicati. Nessuna credenziale è salvata nel repository o negli artefatti. Il sito giacomel.info e le risorse R2 non sono stati modificati. Le verifiche delle sottoscrizioni non hanno mostrato Workers Paid; nessun upgrade richiesto.

## Limiti e rollback

Backend di salvataggio personale, senza gestione centralizzata di utenti, revoca del codice o prevenzione di stati costruiti manualmente ma formalmente validi. Le API hanno limiti di body, validazione, query parametrizzate, nessun CORS e risposte non memorizzabili. Per un futuro rilascio pubblico con molti giocatori aggiungere rate limiting sull’endpoint e gestione degli accessi.

Rollback: ripubblicare il commit precedente, mantenendo D1 e lo storage locale. La prima migrazione è additiva e idempotente. Prima di future migrazioni dei dati effettuare backup D1.
