#!/usr/bin/env sh
# Exit on all errors and undefined vars
set -o errexit
set -o nounset

deno test --allow-read --allow-run --allow-write --allow-env --unstable "$@"
