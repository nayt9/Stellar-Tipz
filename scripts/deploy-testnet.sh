#!/usr/bin/env bash
# Deploy the Tipz contract to Stellar Testnet.
#
# Usage:
#   ./scripts/deploy-testnet.sh [KEY_NAME]
#
# KEY_NAME defaults to "tipz-deployer"

set -euo pipefail

KEY_NAME="${1:-tipz-deployer}"
NATIVE_TOKEN_ID="${NATIVE_TOKEN_ID:-CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC}"

echo "=== Stellar Tipz — Testnet Deployment ==="
echo ""

# Check soroban CLI is installed
if ! command -v soroban &> /dev/null; then
    echo "Error: soroban CLI not found. Install it with:"
    echo "  cargo install --locked soroban-cli"
    exit 1
fi

# Check if key exists, create if not
if ! soroban keys address "$KEY_NAME" &> /dev/null; then
    echo "Generating new key: $KEY_NAME"
    soroban keys generate "$KEY_NAME" --network testnet
fi

DEPLOYER_ADDR="$(soroban keys address "$KEY_NAME")"
echo "Deployer address: $DEPLOYER_ADDR"

# Fund via Friendbot
echo "Funding account via Friendbot..."
curl -s "https://friendbot.stellar.org?addr=$DEPLOYER_ADDR" > /dev/null
echo "Account funded."

# Build the contract
echo "Building contract..."
cd contracts
cargo build --target wasm32-unknown-unknown --release
cd ..

WASM_PATH="contracts/target/wasm32-unknown-unknown/release/tipz_contract.wasm"

if [ ! -f "$WASM_PATH" ]; then
    echo "Error: Wasm file not found at $WASM_PATH"
    exit 1
fi

# Deploy
echo "Deploying to testnet..."
CONTRACT_ID=$(soroban contract deploy \
    --wasm "$WASM_PATH" \
    --source "$KEY_NAME" \
    --network testnet)

echo ""
echo "=== Deployment Successful ==="
echo "Contract ID: $CONTRACT_ID"
echo ""

# Initialize
echo "Initializing contract..."
soroban contract invoke \
    --id "$CONTRACT_ID" \
    --source "$KEY_NAME" \
    --network testnet \
    -- \
    initialize \
    --admin "$DEPLOYER_ADDR" \
    --fee_collector "$DEPLOYER_ADDR" \
    --fee_bps 200 \
    --native_token "$NATIVE_TOKEN_ID"

echo "Contract initialized with 2% fee."
echo "Native token SAC: $NATIVE_TOKEN_ID"
echo ""
echo "=== Done ==="
echo "Contract ID: $CONTRACT_ID"
echo "Save this in your frontend-scaffold/.env as:"
echo "  CONTRACT_ID=$CONTRACT_ID"
