#!/bin/sh
# Build the probe binary. Compiled (not JIT) because duration is a SCORE — see probes.swift header.
# The binary hash is part of the block key; print it so deploys can record it.
set -e
cd "$(dirname "$0")"
mkdir -p build
xcrun swiftc -O probes.swift -o build/probes
shasum -a 256 build/probes
