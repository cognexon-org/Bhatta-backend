#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if [[ "$(id -u)" != "0" ]]; then
  echo "Run this once with sudo/root so the keyfile can be owned by MongoDB container UID 999." >&2
  exit 1
fi
mkdir -p secrets
umask 077
openssl rand -base64 756 > secrets/mongo-keyfile
chown 999:999 secrets/mongo-keyfile
chmod 400 secrets/mongo-keyfile
echo "Created deploy/secrets/mongo-keyfile (owner 999:999, mode 0400). Do not commit it."
