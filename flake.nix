{
  description = "Multica development environment and packaging";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        
        # Shared Go module configuration
        commonGoArgs = {
          version = (builtins.fromJSON (builtins.readFile ./package.json)).version;
          src = ./server;
          vendorHash = "sha256-w0HxFUdGZmQ3jz2kvvcf9zwlftI6fOLxR0z4MG8RzrI=";
        };
      in
      {
        packages = rec {
          multica = pkgs.buildGoModule (commonGoArgs // {
            pname = "multica";
            subPackages = [ "cmd/server" "cmd/migrate" ];
          });

          multica-cli = pkgs.buildGoModule (commonGoArgs // {
            pname = "multica-cli";
            subPackages = [ "cmd/multica" ];
          });

          default = multica;
        } // pkgs.lib.optionalAttrs pkgs.stdenv.isDarwin {
          multica-desktop = pkgs.stdenv.mkDerivation {
            pname = "multica-desktop";
            version = commonGoArgs.version;
            src = ./.;
            
            # Note: Building Electron apps natively from source inside Nix's pure sandbox 
            # requires fetching pnpm dependencies ahead of time and providing the native macOS SDKs.
            # This is a placeholder for the desktop build process on macOS.
            nativeBuildInputs = with pkgs; [ nodejs_22 pnpm python3 ];
            
            buildPhase = ''
              export HOME=$(mktemp -d)
              # In a pure Nix build, pnpm install requires a pre-fetched store or fetching bypass.
              # For now we'll echo to indicate where the build would happen.
              echo "Building desktop app for macOS..."
            '';
            
            installPhase = ''
              mkdir -p $out/Applications
              echo "Mac app would be copied to $out/Applications/Multica.app"
            '';
          };
        };

        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            go
            nodejs_22
            corepack_22
            postgresql_16
            gnumake
            python3
          ];

          shellHook = ''
            echo "Welcome to the Multica development environment (Nix)!"
            echo "Available tools: go, node, pnpm, psql, make"
          '';
        };
      }
    ) // {
      # Top-level NixOS module output
      nixosModules.default = { config, lib, pkgs, ... }:
        with lib;
        let
          cfg = config.programs.multica;
        in {
          options.programs.multica = {
            enable = mkEnableOption "Multica CLI and Desktop tools";

            package = mkOption {
              type = types.package;
              default = self.packages.${pkgs.system}.multica-cli;
              description = "The multica-cli package to use.";
            };
          };

          config = mkIf cfg.enable {
            environment.systemPackages = [
              cfg.package
            ];
          };
        };
    };
}
