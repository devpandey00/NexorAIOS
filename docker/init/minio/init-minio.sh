#!/bin/sh
set -eu

echo "Initializing MinIO buckets..."

mc alias set nexor http://minio:9000 nexor_minio nexor_minio_secret

mc mb --ignore-existing nexor/nexoraios
mc mb --ignore-existing nexor/nexoraios-media
mc mb --ignore-existing nexor/nexoraios-documents

mc anonymous set download nexor/nexoraios-public 2>/dev/null || true

echo "MinIO initialization complete."
