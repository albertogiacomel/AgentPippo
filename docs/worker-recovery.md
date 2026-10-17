# Pubblicazione di Battleship e Word Chain

Il workflow manuale **Publish Battleship and Word Chain** usa il secret di
distribuzione già disponibile in questo repository, senza esportarlo. Accetta
soltanto i due repository pubblici e pubblica sui Worker esistenti `battleship`
e `word-chain-game` dell'account dei giochi. Non crea progetti o domini.

Eccezione esplicita: dopo che il proprietario ha cancellato manualmente i due
Worker, `allow_create=true` consente di ricrearli con gli stessi nomi e i domini
canonici presenti nei repository. In questo caso la versione precedente non
esiste più: il report riporta deployment precedente nullo, indisponibilità prima
del ripristino e speedup non calcolabile. Non è possibile ripristinare una
versione cancellata dal proprietario.

Prima del deploy esegue build, integrità del kit, migrazioni e browser locale.
Salva la versione precedente, misura dieci navigazioni HTTP e interrompe
l'operazione se trova una distribuzione graduale. Dopo il deploy controlla
la nuova distribuzione, titolo/root/bundle della pagina, SHA256 dei bundle JS/CSS,
HTTP e gameplay reale in Chrome. Cloudflare può aggiungere lo script di sicurezza
al documento HTML: non si richiede l'uguaglianza byte per byte dell'HTML modificato
dal CDN. Lo script di sicurezza resta attivo; i bundle applicativi devono invece
coincidere esattamente con la build collaudata.
Un fallimento delle verifiche live ripristina la versione precedente.

Gli artifact contengono ricevute, screenshot, versione per rollback e mean,
p50, p95, ops/s prima/dopo. La misura HTTP include rete/CDN e non misura FPS
o prestazioni del motore. Il secret rimane disponibile solo negli step API
e Wrangler, non durante build o test.

Questo percorso ripristina la pubblicazione quando Workers Builds non accetta
il vecchio token. **Non ripara né disabilita il trigger Git di Cloudflare**:
il relativo errore rimane da risolvere con un token utente valido nel pannello.
Il workflow è anche riutilizzabile dai due repository: il chiamante passa il
proprio commit esatto e il proprio secret; l'implementazione condivisa è fissata
a un commit. La pubblicazione automatica può quindi seguire i test di ogni push.
Non considerare verde il controllo esterno Workers Builds per il solo fatto
che questa distribuzione è riuscita.

## Credenziali dei due repository

Il workflow manuale `Seal deployment credential for game repositories` cifra
il secret esistente con le due chiavi pubbliche GitHub revisionate nello script.
L'artefatto contiene soltanto ciphertext libsodium, destinato alle API Secrets
dei due repository dello stesso proprietario. La chiave privata è detenuta da
GitHub: il token in chiaro non viene esportato dal runner o scritto negli artifact.
L'installazione deve verificare nuovamente chiave e fingerprint del destinatario,
e creare il secret soltanto se il repository non ne possiede già uno. Non viene
ruotata o revocata la credenziale sorgente. Il rollback dell'aggiunta è la rimozione
del solo nuovo secret dai destinatari; le credenziali preesistenti non si toccano.
