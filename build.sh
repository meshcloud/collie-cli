#!/usr/bin/env bash

set -e

version=$(git describe --tags)
sed -i "s/vDEVELOPMENT/$version/g" src/info.ts 

# before we do anything else, ensure we typecheck fine
deno task check

cli_name="collie"
deno_flags=$(deno run flags.ts --quiet)

mkdir -p bin

compile_unix(){
  target="$1"

  deno compile $deno_flags --target "$target" --output "./bin/$cli_name-$target" src/main.ts
  tar -czvf "./bin/$cli_name-$target.tar.gz" "./bin/$cli_name-$target"
}

compile_windows(){
  target="$1"

  deno compile $deno_flags --target "$target" --output "./bin/$cli_name-$target" src/main.ts
  # we currently don't tar gz windows binaries to maintain compatibility with out install.ps1 script
}

compile_unix "x86_64-unknown-linux-gnu"
compile_unix "x86_64-apple-darwin"
compile_unix "aarch64-apple-darwin"
compile_windows "x86_64-pc-windows-msvc"