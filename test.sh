#!/usr/bin/env sh
# Exit on all errors and undefined vars
set -o errexit
set -o nounset

deno_flags=$(deno run flags.ts --quiet)
deno test $deno_flags "$@"
