{
  description = "Flake for collie-cli";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-24.05";
  };


  outputs = { self, nixpkgs }:

    let
      shellsForSystem = system:
        let
          pkgs = import nixpkgs { inherit system; config.allowUnfree = false; };
        in
        {
          default = pkgs.mkShell {
            name = "collie-cli";
            packages = with pkgs;
              [
                deno

                # used for build scripts
                unzip
                gnused

                # cloud provider clis
                awscli2
                azure-cli
                google-cloud-sdk

                # terraform
                opentofu
                terragrunt
                tflint
                terraform-docs

                # for collie foundation docs
                nodejs
              ];
          };
        };


    in
    {
      devShells = {
        aarch64-darwin = (shellsForSystem "aarch64-darwin");
        x86_64-darwin = (shellsForSystem "x86_64-darwin");
        x86_64-linux = (shellsForSystem "x86_64-linux");
      };
    };
}
