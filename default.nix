{ pkgs ? import <nixpkgs-unstable> { } }:

pkgs.mkShell {
  NIX_SHELL = "collie-cli";
  shellHook = ''
    echo starting collie-cli dev shell
  '';

  buildInputs = [
    pkgs.deno
    
    # used for build scripts
    pkgs.unzip
    pkgs.gnused

    # cloud provider clis
    pkgs.awscli2
    pkgs.azure-cli
    pkgs.google-cloud-sdk

    # terraform
    pkgs.terraform
    pkgs.terragrunt
    pkgs.tflint
    pkgs.terraform-docs
  ];
}
