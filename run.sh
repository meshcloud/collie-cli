#!/usr/bin/env sh

# Exit on all errors and undefined vars
set -o errexit
set -o nounset

dir=$(dirname "$0")

deno_flags=$(deno run "$dir/flags.ts" --quiet)
deno run $deno_flags "$dir/src/main.ts" "$@"