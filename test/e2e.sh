#!/usr/bin/env bash
set -o errexit   # exit on error
set -o errtrace  # enables ERR traps so we can run cleanup
set -o pipefail  # exit on error in a pipe, without this only the status of the last command in a pipe is considered
set -o nounset   # exit on undefined variables

tmpdir=$(mktemp -d)
echo "Running test in $tmpdir - please remember to cleanup"

cd "$tmpdir"

collie init .

echo "Testing foundation features"
collie foundation new f > /dev/null

# fake a platform config file
mkdir -p ./foundations/f/platforms/az/
cat > ./foundations/f/platforms/az/README.md <<-EOF
---
id: az
name: Likvid Bank Azure
azure:
    aadTenantId: 1234-1234
    subscriptionId: 1234-1234
cli:
    az: {}
---
# Likvid Bank Azure
Test test
EOF

echo "Testing kit features"
collie kit import foundation/docs
collie kit import azure/bootstrap
collie kit apply azure/bootstrap --foundation f --platform az

collie kit new azure/dummy dummy
cat > ./kit/azure/dummy/variables.tf <<-EOF
variable "my_input_var" {}
EOF

collie kit apply azure/dummy --foundation f --platform az

collie foundation deploy --auto-approve

echo "Testing compliance features"
collie compliance import cfmm

echo "Testing outputs"
collie foundation tree
collie kit tree
collie compliance tree