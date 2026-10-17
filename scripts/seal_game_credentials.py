"""Seal the deployment credential for two fixed GitHub repository recipients."""

import hashlib
import json
import os
from base64 import b64encode
from pathlib import Path

from cyclopts import App
from nacl import encoding, public

app = App()
RECIPIENTS = {
    "Battleship": "YRtcx/p1dLidEpPXfdJPGeZkXTYL026tQ1su7SnQ3jc=",
    "Word-Chain-Game": "k7OLTM21ciiIhZN0yv5hTTn9TG1Cspf3EwGqT7vyGBM=",
}
KEY_ID = "3380204578043523366"


@app.default
def main() -> None:
    """Encrypt an environment credential; never print or persist plaintext."""
    secret = os.environ["CLOUDFLARE_API_TOKEN"].encode("utf-8")
    if not secret:
        raise ValueError("Deployment credential is empty")
    sealed = {}
    for repository, value in RECIPIENTS.items():
        key = public.PublicKey(value.encode("utf-8"), encoding.Base64Encoder())
        ciphertext = public.SealedBox(key).encrypt(secret)
        sealed[repository] = {
            "key_id": KEY_ID,
            "public_key_sha256": hashlib.sha256(bytes(key)).hexdigest(),
            "encrypted_value": b64encode(ciphertext).decode("ascii"),
        }
    folder = (
        Path(__file__).resolve().parent.parent / "artifacts" / "credential-transfer"
    )
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "sealed.json").write_text(
        json.dumps(sealed, indent=2) + "\n", encoding="utf-8"
    )
    print(
        "Credential sealed for Battleship and Word-Chain-Game; no plaintext exported."
    )


if __name__ == "__main__":
    app()
