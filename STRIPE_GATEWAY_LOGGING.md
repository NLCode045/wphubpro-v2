# Stripe Gateway Detailed Logging

## Overview
The stripe-gateway function now includes comprehensive logging at every step to help diagnose issues when multiple executions occur or when calls hang.

## Log Sequence for a Single Request

### 1. Entry & Initialization
```
stripe-gateway: Handler entry point
stripe-gateway: Validating gateway environment
stripe-gateway: Environment validated. Vault DB: 69d2ecf3000f449c752f
stripe-gateway: Initializing Appwrite admin client
stripe-gateway: Appwrite clients initialized
stripe-gateway: Initializing Stripe client
initializeStripe: Getting Stripe credentials from vault
getProviderCredentials: Querying vault for provider="stripe", vaultDbId="69d2ecf3000f449c752f"
getProviderCredentials: Retrieved vault document for provider="stripe"
getProviderCredentials: Decrypting payload for provider="stripe"
getProviderCredentials: Successfully decrypted credentials for provider="stripe"
initializeStripe: Creating Stripe client with API version 2023-10-16
stripe-gateway: Stripe client initialized
```

### 2. Action Parsing
```
stripe-gateway: Parsed action="admin-list-subscriptions", payload keys: action, limit, status
stripe-gateway: Routing to handler for action: admin-list-subscriptions
handleStripeOperation: Processing action="admin-list-subscriptions"
handleStripeOperation: Routing to adminListSubscriptions
```

### 3. Handler Execution Example (adminListSubscriptions)
```
adminListSubscriptions: START - payload: {"action":"admin-list-subscriptions","limit":100,"status":"active"}
adminListSubscriptions: Getting Stripe credentials from vault
getProviderCredentials: Querying vault for provider="stripe", vaultDbId="69d2ecf3000f449c752f"
getProviderCredentials: Retrieved vault document for provider="stripe"
getProviderCredentials: Decrypting payload for provider="stripe"
getProviderCredentials: Successfully decrypted credentials for provider="stripe"
adminListSubscriptions: Stripe API call with params: {"limit":100,"status":"active"}
adminListSubscriptions: SUCCESS - received 42 subscriptions, has_more=false, duration=1234ms
```

### 4. For adminFinanceSummary (Multiple API Calls)
```
adminFinanceSummary: START
adminFinanceSummary: Counting subscriptions by status
adminFinanceSummary: Querying status="active"
adminFinanceSummary: Stripe API call - subscriptions.list({status:"active", page:0, limit:100})
adminFinanceSummary: Received 50 items for status="active", page=0
adminFinanceSummary: Status "active" total count: 50
adminFinanceSummary: Querying status="trialing"
adminFinanceSummary: Stripe API call - subscriptions.list({status:"trialing", page:0, limit:100})
adminFinanceSummary: Received 5 items for status="trialing", page=0
adminFinanceSummary: Status "trialing" total count: 5
... (continues for other statuses)
adminFinanceSummary: Computing MRR from active subscriptions
adminFinanceSummary: Stripe API call - subscriptions.list({status:"active", page:0, expand:...})
adminFinanceSummary: Received 50 active subscriptions for MRR calculation, page=0
adminFinanceSummary: Computed MRR: 45000 cents
adminFinanceSummary: Querying failed payment intents
adminFinanceSummary: Stripe API call - paymentIntents.list() returned 3 intents
adminFinanceSummary: Found 2 failed payments in last 7 days
adminFinanceSummary: Querying paid invoices
adminFinanceSummary: Stripe API call - invoices.list() returned 20 paid invoices
adminFinanceSummary: Total revenue from last 30 paid invoices: 500000 cents
adminFinanceSummary: SUCCESS - duration=5432ms
```

### 5. Error Case
```
adminListSubscriptions: START - payload: {"action":"admin-list-subscriptions"}
adminListSubscriptions: Getting Stripe credentials from vault
getProviderCredentials: Querying vault for provider="stripe", vaultDbId="69d2ecf3000f449c752f"
getProviderCredentials: Retrieved vault document for provider="stripe"
getProviderCredentials: Decrypting payload for provider="stripe"
adminListSubscriptions: FAILED after 2341ms - Decryption failed: Invalid IV length: expected 12 bytes, got 16
```

## What the Logs Tell You

### Normal Successful Execution
- Look for: `START` → multiple API calls → `SUCCESS - duration=XXXms`
- The duration shows how long each operation took
- Can identify which Stripe API call is slow

### Parallel/Cascade Executions (Multiple Calls at Once)
- Look for: Multiple `stripe-gateway: Handler entry point` entries
- If you see 10+ of these, it means 10+ concurrent requests
- Each log entry will have a duration showing if one is blocking others
- Helps identify if there's a problem with one handler causing retries

### Hanging/Timeout (No Response)
- Look for: `START` but NO `SUCCESS` or `FAILED` message
- Look for: API calls that never complete (no log after the `Stripe API call` line)
- Look for: Missing or broken error messages
- Duration will be missing or very long (> function timeout)

### Vault/Credentials Issues
- Look for: Messages about vault queries failing
- Look for: Decryption errors with details about IV length, tag length
- Look for: 404 errors when querying vault

## Key Metrics to Extract

1. **Function Start to End Duration**: Total execution time
2. **API Call Count**: How many Stripe API calls were made
3. **Largest Duration**: Which individual Stripe call took longest
4. **Errors**: Any exceptions with full stack/message

## Checking Function Logs in Appwrite

1. Go to Appwrite Console → Functions → stripe-gateway
2. Click "Executions" tab
3. For recent failed execution, click to see logs
4. Search for:
   - `stripe-gateway: Handler entry point` - confirms execution started
   - `adminFinanceSummary: START` or relevant handler name - shows which action
   - `FAILED` - shows if error occurred
   - `SUCCESS` - shows successful completion
   - `duration=` - shows timing

## Example Debug Session

If user reports "No response from stripe-gateway" after 10+ executions:

1. **Check how many entries you see for "stripe-gateway: Handler entry point"**
   - 1 = single call (normal)
   - 10+ = retry/cascade happening

2. **For each execution, find the duration**
   - If all have `duration=1234ms` and SUCCESS, it's working
   - If some have no duration or FAILED, those are problem calls

3. **Look for the pattern of Stripe API calls**
   - Should see predictable sequence for each action
   - If seeing repeated calls to same endpoint, may indicate retry loop

4. **Check error messages**
   - Full error text after FAILED explains what went wrong
