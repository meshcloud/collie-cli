#!/usr/bin/env bash

set -e

cli_name="collie"

deno_flags="--unstable --allow-read --allow-write --allow-env --allow-run"

mkdir -p bin/unix bin/windows

compile_unix(){
  target="$1"

  deno compile $deno_flags --target "$target" --output "./bin/unix/$cli_name-$target" src/main.ts
}

compile_windows(){
  target="$1"

  deno compile $deno_flags --target "$target" --output "./bin/windows/$cli_name-$target" src/main.ts
 
}

deno test $deno_flags

compile_unix "x86_64-unknown-linux-gnu"
compile_unix "x86_64-apple-darwin"
compile_windows "x86_64-pc-windows-msvc"