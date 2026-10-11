# Pubblicazione

Il sito è statico: JavaScript, CSS e PNG in `dist/`. Nessun backend, database, variabile segreta o dipendenza npm. Node serve solo per verifica e anteprima locale.

## Vercel

Importa `albertogiacomel/AgentPippo` da GitHub. Root directory: radice del repository; framework: Other. `vercel.json` imposta `npm run build` e output `dist`. Pubblica con Deploy. Non configurare una cartella `public` o un framework Next.js.

Documentazione: https://vercel.com/docs/project-configuration/vercel-json

## Cloudflare Pages

Workers & Pages → crea un progetto **Pages** e collega il repository GitHub. Branch produzione: `main`; framework: None; build command: `npm run build`; output: `dist`; root: radice del repository. `wrangler.toml` dichiara la stessa directory per Pages. In alternativa, carica direttamente il contenuto di `dist` con Direct Upload.

Documentazione: https://developers.cloudflare.com/pages/framework-guides/deploy-anything/

## Salvataggi

La partita è in `localStorage` con chiave `porto_buffo_v2`. Cambiando dominio o browser, la partita precedente non viene trasferita automaticamente: usare Salvataggi per creare la copia cloud e riprenderla con il codice sul nuovo dominio. Le preferenze lingua/suoni/difficoltà sono locali (`agent_pippo_settings`). La migrazione v1/v2 conserva i progressi sullo stesso dominio.

Produzione attuale: https://agentpippo.giacomel.info. CNAME proxied verso `agent-pippo.pages.dev`, dominio associato a Pages e HTTPS verificato. GitHub Actions pubblica tramite Direct Upload dopo i test; non ricreare il progetto come integrazione Git nativa. Lo schema D1 resta gestito con migrazioni manuali.

## Ripristino

Esegui `git log --oneline`, seleziona un commit verificato e ripubblica quella versione. La vecchia pubblicazione Sites resta indipendente e disponibile. Le configurazioni `.openai` storiche non sono necessarie a Vercel o Pages.
