{ pkgs ? import <nixpkgs> { }, unstable ? import <nixpkgs-unstable> { } }:

pkgs.mkShell {
  NIX_SHELL = "collie-cli";
  shellHook = ''
    echo starting collie-cli dev shell
  '';

  buildInputs = [
    unstable.deno
    
    # used for build scripts
    pkgs.unzip
    pkgs.gnused

    # cloud provider clis
    pkgs.awscli2
    pkgs.azure-cli
    pkgs.google-cloud-sdk

    # terraform
    unstable.terraform
    unstable.terragrunt
    unstable.tflint
    unstable.terraform-docs

    # for collie foundation docs
    pkgs.nodejs
  ];
}
