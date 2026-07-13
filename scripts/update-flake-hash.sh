#!/usr/bin/env bash
set -e

# Run a build which will fail with a hash mismatch if vendorHash is outdated
OUTPUT=$(nix build .#multica 2>&1 || true)

# Extract the "got:" hash from the output
GOT_HASH=$(echo "$OUTPUT" | grep "got:" | awk '{print $2}' || true)

if [ -n "$GOT_HASH" ]; then
    echo "Found new vendorHash: $GOT_HASH"
    # Update flake.nix with the new hash
    sed -i "s|vendorHash = \"sha256-.*\"|vendorHash = \"$GOT_HASH\"|" flake.nix
    echo "Updated flake.nix"
else
    echo "vendorHash is up to date"
fi
