# Stripe Gateway Troubleshooting Guide

## Issue
stripe-subscriptions consumer receives "No credentials response from stripe-gateway" when attempting to get Stripe credentials.

## Diagnostic Steps

### 1. Check Appwrite Function Logs
Go to Appwrite Console:
1. Navigate to Functions → stripe-gateway
2. Open the latest deployment
3. Check the execution logs for recent calls
4. Look for patterns:
   - Does `stripe-gateway: Handler entry point` appear?
   - Does `handleStripeOperation: Routing to getStripeCredentials` appear?
   - Are there errors during Stripe initialization?

### 2. Verify Environment Variables
Check that stripe-gateway has these variables set:

```bash
# Via Appwrite CLI:
appwrite project list-variables --filter-search "ENCRYPTION_KEY|APPWRITE_ENDPOINT|APPWRITE_PROJECT_ID|APPWRITE_API_KEY|VAULT_DB_ID"
```

Required variables:
- `ENCRYPTION_KEY` - Encryption key for vault
- `APPWRITE_ENDPOINT` - Appwrite API endpoint
- `APPWRITE_PROJECT_ID` - Appwrite project ID  
- `APPWRITE_API_KEY` - Appwrite API key (admin)
- `VAULT_DB_ID` - Vault database ID (default: 69d2ecf3000f449c752f)

### 3. Test Gateway Direct Call
Test if the gateway works by calling it directly:

```bash
curl -X POST https://your-appwrite-endpoint/functions/stripe-gateway/executions \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get-credentials"
  }'
```

Expected response (if working):
```json
{
  "success": true,
  "STRIPE_SECRET_KEY": "sk_...",
  "STRIPE_WEBHOOK_SECRET": "whsec_..."
}
```

### 4. Check stripe-subscriptions Logs
1. Navigate to Functions → stripe-subscriptions
2. Open latest deployment
3. Look for:
   - `getStripeCredentials: Calling stripe-gateway`
   - `getStripeCredentials: Got response`
   - Response statusCode and keys
   - Any error messages

### 5. Verify Vault Data
Ensure Stripe credentials are in the vault:

```bash
# List vault entries (requires database access)
appwrite databases list-documents --database-id 69d2ecf3000f449c752f --collection-id connectors --filter 'provider="stripe"'
```

Should return at least one document with:
- `provider: "stripe"`
- `encrypted_payload: "..."`
- `iv: "..."`

### 6. Test Encryption Key
If vault data exists but credentials can't be decrypted:
- Verify `ENCRYPTION_KEY` environment variable is correctly set
- Ensure it's the same key used when vault was created
- Check for recent changes to the key

## Common Issues

### Issue: "Unknown action: get-credentials"
**Cause**: The action isn't being parsed correctly
**Solution**:
- Check function logs for how the action is being parsed
- Verify the stripe-subscriptions is sending `{ action: 'get-credentials' }`
- Check if newer deployment hasn't been activated

### Issue: "No credentials response from stripe-gateway"
**Cause**: responseBody is missing or empty
**Possible reasons**:
1. Function execution is failing before response is sent
2. Response structure is different in newer Appwrite versions
3. Network timeout between functions
4. Configuration missing

**Solution**:
- Check stripe-gateway logs for initialization errors
- Verify all environment variables are set
- Check function response timeout settings
- Redeploy both functions

### Issue: "STRIPE_SECRET_KEY not found in vault"
**Cause**: Vault doesn't have Stripe credentials
**Solution**:
- Run `node scripts/seed-vault.js` to add credentials
- Verify Stripe credentials are in .env file
- Check vault database has the correct provider entry

### Issue: "Failed to initialize Stripe: ..."
**Cause**: Problem getting credentials from vault during gateway startup
**Solution**:
- Same as "STRIPE_SECRET_KEY not found" above
- Check ENCRYPTION_KEY is correct
- Ensure vault database is accessible

## Logs to Check

### Successful Flow
```
stripe-gateway: Handler entry point
stripe-gateway: Validating gateway environment
stripe-gateway: Environment validated. Vault DB: 69d2ecf3000f449c752f
stripe-gateway: Initializing Appwrite admin client
stripe-gateway: Appwrite clients initialized
stripe-gateway: Initializing Stripe client
stripe-gateway: Stripe client initialized
stripe-gateway: Parsed action="get-credentials"
stripe-gateway: Routing to handler for action: get-credentials
handleStripeOperation: Processing action="get-credentials"
handleStripeOperation: Routing to getStripeCredentials
getStripeCredentials: START
getStripeCredentials: SUCCESS
```

### Failing Flow - Action Mismatch
```
stripe-gateway: Parsed action="get-credentials-typo"
stripe-gateway: Routing to handler for action: get-credentials-typo
handleStripeOperation: Processing action="get-credentials-typo"
handleStripeOperation: UNHANDLED ACTION "get-credentials-typo" - returning 400 error
```

### Failing Flow - Vault Issue
```
stripe-gateway: Initializing Stripe client
initializeStripe: Getting Stripe credentials from vault
stripe-gateway fatal error: Failed to initialize Stripe: STRIPE_SECRET_KEY not found in vault
```

## Recovery Steps

1. **Verify Environment**
   ```bash
   appwrite project list-variables
   ```

2. **Reseed Vault (if credentials expired)**
   ```bash
   node scripts/seed-vault.js
   ```

3. **Redeploy Functions**
   ```bash
   appwrite push
   # Select stripe-gateway and stripe-subscriptions
   ```

4. **Test via Logs**
   - Trigger a subscription action that calls stripe-subscriptions
   - Watch the logs in real-time
   - Look for the detailed logging output

## Response Structure (for debugging)

The expected response from stripe-gateway should have:

```javascript
{
  responseBody: "{\"success\":true,\"STRIPE_SECRET_KEY\":\"...\",\"STRIPE_WEBHOOK_SECRET\":\"...\"}" OR
               {success: true, STRIPE_SECRET_KEY: "...", STRIPE_WEBHOOK_SECRET: "..."},
  statusCode: 200,
  $id: "...",
  functionId: "...",
  duration: 123,
  status: "completed"
}
```

If `responseBody` is missing:
- Function execution didn't complete properly
- Check for errors in the gateway logs
- Check function timeout settings
- Check memory/CPU limits

## Next Steps if Still Failing

1. Enable enhanced logging (already added to stripe-subscriptions)
2. Collect logs from BOTH functions (gateway and consumer)
3. Cross-reference timestamps to see exact failure point
4. Check if network/connectivity issue between functions
5. Verify Appwrite version compatibility with node-appwrite SDK

## Helpful Commands

```bash
# Check function status
appwrite functions get stripe-gateway
appwrite functions get stripe-subscriptions

# View recent executions
appwrite functions list-executions --function-id stripe-gateway

# Check project variables
appwrite project list-variables

# Redeploy single function
appwrite push
```
