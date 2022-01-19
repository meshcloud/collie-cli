{ pkgs ? import <nixpkgs> { } }:

let
  unstable = import <nixos-unstable> {}; # deno latest is only available as an unstable package right now
in
pkgs.mkShell {
  NIX_SHELL = "collie-cli";
  shellHook = ''
    echo starting collie-cli dev shell
  '';

  buildInputs = [
    unstable.deno
    
    # used for build scripts
    pkgs.unzip

    # cloud provider clis
    pkgs.awscli2
    pkgs.azure-cli
    pkgs.google-cloud-sdk

  ];
}
