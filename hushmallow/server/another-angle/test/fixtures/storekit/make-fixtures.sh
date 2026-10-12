#!/usr/bin/env bash
# TEST-ONLY certificate chain shaped like Apple's App Store signing chain:
#   root (P-384, self-signed CA) → intermediate (P-384 CA, Apple WWDR marker
#   OID 1.2.840.113635.100.6.2.1) → leaf (P-256, receipt-signing marker OID
#   1.2.840.113635.100.6.11.1), plus a leaf WITHOUT the marker.
# These keys sign nothing real. Regenerate with: bash make-fixtures.sh
set -euo pipefail
cd "$(dirname "$0")"
days=7300
openssl ecparam -name secp384r1 -genkey -noout -out root.key
openssl req -x509 -new -key root.key -sha384 -days $days -subj "/CN=Test Root CA - G3/O=hushmallow tests" \
  -addext "basicConstraints=critical,CA:TRUE" -addext "keyUsage=critical,keyCertSign,cRLSign" -out root.pem
openssl ecparam -name secp384r1 -genkey -noout -out intermediate.key
openssl req -new -key intermediate.key -subj "/CN=Test Worldwide Developer Relations/O=hushmallow tests" -out intermediate.csr
printf 'basicConstraints=critical,CA:TRUE,pathlen:0\nkeyUsage=critical,keyCertSign,cRLSign\n1.2.840.113635.100.6.2.1=ASN1:NULL\n' > intermediate.ext
openssl x509 -req -in intermediate.csr -CA root.pem -CAkey root.key -CAcreateserial -sha384 -days $days -extfile intermediate.ext -out intermediate.pem
openssl ecparam -name prime256v1 -genkey -noout -out leaf.ec.key
openssl pkcs8 -topk8 -nocrypt -in leaf.ec.key -out leaf.key
openssl req -new -key leaf.ec.key -subj "/CN=Test StoreKit Signing/O=hushmallow tests" -out leaf.csr
printf 'basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\n1.2.840.113635.100.6.11.1=ASN1:NULL\n' > leaf.ext
openssl x509 -req -in leaf.csr -CA intermediate.pem -CAkey intermediate.key -CAcreateserial -sha384 -days $days -extfile leaf.ext -out leaf.pem
printf 'basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature\n' > leaf-nomarker.ext
openssl x509 -req -in leaf.csr -CA intermediate.pem -CAkey intermediate.key -CAcreateserial -sha384 -days $days -extfile leaf-nomarker.ext -out leaf-nomarker.pem
rm -f ./*.csr ./*.srl ./*.ext leaf.ec.key root.key intermediate.key
echo "root sha256: $(openssl x509 -in root.pem -noout -fingerprint -sha256)"
