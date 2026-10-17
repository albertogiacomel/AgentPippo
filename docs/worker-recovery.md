# Pubblicazione di Battleship e Word Chain

Il workflow manuale **Publish Battleship and Word Chain** usa il secret di
distribuzione già disponibile in questo repository, senza esportarlo. Accetta
soltanto i due repository pubblici e pubblica sui Worker esistenti `battleship`
e `word-chain-game` dell'account dei giochi. Non crea progetti o domini.

Prima del deploy esegue build, integrità del kit, migrazioni e browser locale.
Salva la versione precedente, misura dieci navigazioni HTTP e interrompe
l'operazione se trova una distribuzione graduale. Dopo il deploy controlla
la nuova distribuzione, l'hash dell'HTML, HTTP e gameplay reale in Chrome.
Un fallimento delle verifiche live ripristina la versione precedente.

Gli artifact contengono ricevute, screenshot, versione per rollback e mean,
p50, p95, ops/s prima/dopo. La misura HTTP include rete/CDN e non misura FPS
o prestazioni del motore. Il secret rimane disponibile solo negli step API
e Wrangler, non durante build o test.

Questo percorso ripristina la pubblicazione quando Workers Builds non accetta
il vecchio token. **Non ripara né disabilita il trigger Git di Cloudflare**:
il relativo errore rimane da risolvere con un token utente valido nel pannello.
Il recupero è manuale; i futuri push non attivano questo workflow centrale.
Non considerare verde il controllo esterno Workers Builds per il solo fatto
che questa distribuzione è riuscita.
