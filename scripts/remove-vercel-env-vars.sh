#!/bin/bash

# Script to remove all environment variables from a Vercel project
# Usage: ./remove-vercel-env-vars.sh [--confirm]
#
# This script:
# 1. Lists all environment variables in the current Vercel project
# 2. Extracts the variable names/keys
# 3. Removes each variable one by one
#
# Pass --confirm flag to skip the confirmation prompt

set -e

CONFIRM_FLAG="${1:-}"
DRY_RUN=true

if [ "$CONFIRM_FLAG" = "--confirm" ]; then
  DRY_RUN=false
fi

echo "📋 Fetching environment variables from Vercel project..."
echo ""

# Get the list of environment variables
ENV_VARS=$(vercel env ls 2>&1)

# Check if vercel CLI is available
if [ $? -ne 0 ]; then
  echo "❌ Error: vercel CLI not found or not authenticated"
  echo "Please ensure you have the Vercel CLI installed and are logged in"
  echo "Install: npm i -g vercel"
  echo "Login: vercel login"
  exit 1
fi

# Extract variable names from the output
# The output format is typically: KEY VALUE [ENVIRONMENTS]
# We need to get just the KEY part (first column)
VAR_NAMES=$(echo "$ENV_VARS" | grep -v "^$" | awk 'NR>1 {print $1}' || true)

# Count variables
VAR_COUNT=$(echo "$VAR_NAMES" | grep -c . || echo 0)

if [ "$VAR_COUNT" -eq 0 ]; then
  echo "✅ No environment variables found to remove"
  exit 0
fi

echo "Found $VAR_COUNT environment variable(s):"
echo "$VAR_NAMES" | sed 's/^/  - /'
echo ""

if [ "$DRY_RUN" = "true" ]; then
  echo "⚠️  DRY RUN MODE"
  echo "This will remove the following variables:"
  echo "$VAR_NAMES" | nl
  echo ""
  read -p "Continue with removal? (type 'yes' to confirm): " RESPONSE
  if [ "$RESPONSE" != "yes" ]; then
    echo "❌ Cancelled"
    exit 0
  fi
fi

echo ""
echo "🗑️  Removing environment variables..."
echo ""

REMOVED_COUNT=0
FAILED_COUNT=0

while IFS= read -r VAR_NAME; do
  if [ -z "$VAR_NAME" ]; then
    continue
  fi

  echo -n "  Removing '$VAR_NAME'... "
  
  if vercel env rm "$VAR_NAME" --yes >/dev/null 2>&1; then
    echo "✅"
    ((REMOVED_COUNT++))
  else
    echo "❌"
    ((FAILED_COUNT++))
  fi
done <<< "$VAR_NAMES"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Summary:"
echo "  ✅ Removed: $REMOVED_COUNT"
echo "  ❌ Failed: $FAILED_COUNT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$FAILED_COUNT" -eq 0 ]; then
  echo "✅ All environment variables removed successfully!"
  exit 0
else
  echo "⚠️  Some variables failed to remove"
  exit 1
fi
