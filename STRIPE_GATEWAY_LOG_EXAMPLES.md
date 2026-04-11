# Expected Stripe Gateway Log Output by Action

## Reference: Full Log Dumps for Each Admin Action

Use these as templates to identify what a successful vs failed execution looks like.

---

## Action: admin-list-subscriptions

### ✅ SUCCESSFUL EXECUTION
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
stripe-gateway: Parsed action="admin-list-subscriptions", payload keys: action, limit, status
stripe-gateway: Routing to handler for action: admin-list-subscriptions
handleStripeOperation: Processing action="admin-list-subscriptions"
handleStripeOperation: Routing to adminListSubscriptions
adminListSubscriptions: START - payload: {"action":"admin-list-subscriptions","limit":100,"status":"active"}
adminListSubscriptions: Getting Stripe credentials from vault
getProviderCredentials: Querying vault for provider="stripe", vaultDbId="69d2ecf3000f449c752f"
getProviderCredentials: Retrieved vault document for provider="stripe"
getProviderCredentials: Decrypting payload for provider="stripe"
getProviderCredentials: Successfully decrypted credentials for provider="stripe"
adminListSubscriptions: Stripe API call with params: {"limit":100,"status":"active"}
adminListSubscriptions: SUCCESS - received 42 subscriptions, has_more=false, duration=1234ms
```

### ❌ FAILED: Vault Credentials Not Found
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
[ERROR] getProviderCredentials: Decryption failed: Invalid IV length: expected 12 bytes, got 16
stripe-gateway fatal error: Failed to initialize Stripe: Decryption failed: Invalid IV length...
```

### ❌ HANGING: No Final Message
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
stripe-gateway: Parsed action="admin-list-subscriptions", payload keys: action, limit
stripe-gateway: Routing to handler for action: admin-list-subscriptions
handleStripeOperation: Processing action="admin-list-subscriptions"
handleStripeOperation: Routing to adminListSubscriptions
adminListSubscriptions: START - payload: {"action":"admin-list-subscriptions","limit":100}
adminListSubscriptions: Getting Stripe credentials from vault
getProviderCredentials: Querying vault for provider="stripe", vaultDbId="69d2ecf3000f449c752f"
getProviderCredentials: Retrieved vault document for provider="stripe"
getProviderCredentials: Decrypting payload for provider="stripe"
getProviderCredentials: Successfully decrypted credentials for provider="stripe"
adminListSubscriptions: Stripe API call with params: {"limit":100}
[... EXECUTION TIMEOUT - NO FURTHER LOGS ...]
```

---

## Action: admin-finance-summary

### ✅ SUCCESSFUL EXECUTION (Truncated)
```
stripe-gateway: Handler entry point
stripe-gateway: Validating gateway environment
stripe-gateway: Environment validated. Vault DB: 69d2ecf3000f449c752f
stripe-gateway: Initializing Appwrite admin client
stripe-gateway: Appwrite clients initialized
stripe-gateway: Initializing Stripe client
[... credential retrieval ...]
stripe-gateway: Stripe client initialized
stripe-gateway: Parsed action="admin-finance-summary", payload keys: action, maxPagesPerStatus
handleStripeOperation: Processing action="admin-finance-summary"
handleStripeOperation: Routing to adminFinanceSummary
adminFinanceSummary: START
adminFinanceSummary: Counting subscriptions by status
adminFinanceSummary: Querying status="active"
adminFinanceSummary: Stripe API call - subscriptions.list({status:"active", page:0, limit:100})
adminFinanceSummary: Received 50 items for status="active", page=0
adminFinanceSummary: Status "active" total count: 50
adminFinanceSummary: Querying status="trialing"
adminFinanceSummary: Stripe API call - subscriptions.list({status:"trialing", page:0, limit:100})
adminFinanceSummary: Received 8 items for status="trialing", page=0
adminFinanceSummary: Status "trialing" total count: 8
adminFinanceSummary: Querying status="past_due"
adminFinanceSummary: Stripe API call - subscriptions.list({status:"past_due", page:0, limit:100})
adminFinanceSummary: Received 3 items for status="past_due", page=0
adminFinanceSummary: Status "past_due" total count: 3
adminFinanceSummary: Querying status="canceled"
adminFinanceSummary: Stripe API call - subscriptions.list({status:"canceled", page:0, limit:100})
adminFinanceSummary: Received 0 items for status="canceled", page=0
adminFinanceSummary: Status "canceled" total count: 0
adminFinanceSummary: Querying status="unpaid"
adminFinanceSummary: Stripe API call - subscriptions.list({status:"unpaid", page:0, limit:100})
adminFinanceSummary: Received 0 items for status="unpaid", page=0
adminFinanceSummary: Status "unpaid" total count: 0
adminFinanceSummary: Querying status="paused"
adminFinanceSummary: Stripe API call - subscriptions.list({status:"paused", page:0, limit:100})
adminFinanceSummary: Received 1 items for status="paused", page=0
adminFinanceSummary: Status "paused" total count: 1
adminFinanceSummary: Querying status="incomplete"
adminFinanceSummary: Stripe API call - subscriptions.list({status:"incomplete", page:0, limit:100})
adminFinanceSummary: Received 0 items for status="incomplete", page=0
adminFinanceSummary: Status "incomplete" total count: 0
adminFinanceSummary: Computing MRR from active subscriptions
adminFinanceSummary: Stripe API call - subscriptions.list({status:"active", page:0, expand:...})
adminFinanceSummary: Received 50 active subscriptions for MRR calculation, page=0
adminFinanceSummary: Computed MRR: 245000 cents
adminFinanceSummary: Querying failed payment intents
adminFinanceSummary: Stripe API call - paymentIntents.list() returned 5 intents
adminFinanceSummary: Found 2 failed payments in last 7 days
adminFinanceSummary: Querying paid invoices
adminFinanceSummary: Stripe API call - invoices.list() returned 20 paid invoices
adminFinanceSummary: Total revenue from last 30 paid invoices: 750000 cents
adminFinanceSummary: SUCCESS - duration=8234ms
```

### ❌ HANGING: Stops During Status Counting
```
adminFinanceSummary: START
adminFinanceSummary: Counting subscriptions by status
adminFinanceSummary: Querying status="active"
adminFinanceSummary: Stripe API call - subscriptions.list({status:"active", page:0, limit:100})
adminFinanceSummary: Received 50 items for status="active", page=0
adminFinanceSummary: Status "active" total count: 50
adminFinanceSummary: Querying status="trialing"
adminFinanceSummary: Stripe API call - subscriptions.list({status:"trialing", page:0, limit:100})
[... EXECUTION TIMEOUT - STUCK WAITING FOR STRIPE API RESPONSE ...]
```

This indicates Stripe API is slow/unresponsive for trialing subscriptions query.

---

## Action: admin-finance-dashboard

### ✅ SUCCESSFUL EXECUTION (Truncated)
```
stripe-gateway: Handler entry point
handleStripeOperation: Processing action="admin-finance-dashboard"
handleStripeOperation: Routing to adminFinanceDashboard
adminFinanceDashboard: START - payload: {"action":"admin-finance-dashboard","period":"week"}
adminFinanceDashboard: Getting Stripe credentials from vault
[... credential retrieval ...]
adminFinanceDashboard: Stripe credentials retrieved
adminFinanceDashboard: Period="week"
adminFinanceDashboard: Window: 1712678400 to 1713283200
adminFinanceDashboard: Querying recent paid invoices
adminFinanceDashboard: Stripe API call - invoices.list() returned 18 invoices
adminFinanceDashboard: Initialized recentSubscriptionChanges array
adminFinanceDashboard: SUCCESS - duration=2156ms
```

### ❌ FAILED: Invalid Period
```
adminFinanceDashboard: START - payload: {"action":"admin-finance-dashboard","period":"invalid"}
adminFinanceDashboard: Getting Stripe credentials from vault
[... credential retrieval ...]
adminFinanceDashboard: Stripe credentials retrieved
adminFinanceDashboard: Period="invalid"
adminFinanceDashboard: Window: 1712678400 to 1713283200
[Note: Invalid period gets default week handling, so should still work]
```

---

## Action: admin-get-details

### ✅ SUCCESSFUL EXECUTION
```
stripe-gateway: Handler entry point
handleStripeOperation: Processing action="admin-get-details"
handleStripeOperation: Routing to adminGetDetails
adminGetDetails: START - payload: {"action":"admin-get-details","subscription_id":"sub_1234567890"}
adminGetDetails: Stripe API call - subscriptions.retrieve("sub_1234567890", {expand:...})
adminGetDetails: SUCCESS - retrieved subscription "sub_1234567890", duration=856ms
```

### ❌ FAILED: Missing Subscription ID
```
adminGetDetails: START - payload: {"action":"admin-get-details"}
adminGetDetails: Missing subscription_id parameter
[RESPONSE: 400 error - subscription_id required]
```

### ❌ FAILED: Subscription Not Found
```
adminGetDetails: START - payload: {"action":"admin-get-details","subscription_id":"sub_INVALID"}
adminGetDetails: Stripe API call - subscriptions.retrieve("sub_INVALID", {expand:...})
[STRIPE ERROR: No such subscription: sub_INVALID]
adminGetDetails: FAILED after 234ms - No such subscription: sub_INVALID
```

---

## Key Log Patterns to Watch

### Pattern 1: Credential Retrieval Loop
If you see credential retrieval repeated MORE than expected (e.g., 10x in one execution):
- Suggests the function is being called 10x
- Each call retrieves credentials independently (not a problem, but inefficient)

### Pattern 2: API Call Failure
Look for this pattern:
```
Stripe API call - [operation]
[ERROR MESSAGE - NOT "Received X items"]
FAILED after XXXms
```

### Pattern 3: Timeout (No Duration)
```
adminFinanceSummary: START
[... many API calls ...]
[... logs end without SUCCESS or FAILED ...]
```

### Pattern 4: Rate Limiting
```
Stripe API call - subscriptions.list()
[ERROR] Error: Stripe API error: Too many requests - 429
```

### Pattern 5: Vault Issues  
```
getProviderCredentials: Decrypting payload
[ERROR] Decryption failed: Invalid IV length: expected 12 bytes, got 16
```

---

## How to Collect Logs for Debugging

### From Appwrite Console:
1. Go to **Functions** → **stripe-gateway**
2. Click **Executions** tab
3. **Filter by time** of the issue
4. Click each execution ID to view logs
5. **Copy full log text**

### Export for Analysis:
```bash
# Save each execution's logs to a file
cat > stripe_execution_1.log << 'EOF'
[paste full logs here]
EOF

# Search across all logs
grep "FAILED" stripe_execution_*.log
grep "duration=" stripe_execution_*.log
grep "START" stripe_execution_*.log | wc -l  # Count total executions

# Extract timing
for f in stripe_execution_*.log; do 
  echo "$f:"; 
  grep "duration=" "$f" | tail -1;
done
```

### Analyze Pattern:
```bash
# Check if all executions are same action
grep "Parsed action=" stripe_execution_*.log | sort | uniq -c

# Check if any are hanging (no SUCCESS/FAILED)
for f in stripe_execution_*.log; do
  if ! grep -q "SUCCESS\|FAILED" "$f"; then
    echo "$f appears to be hanging"
  fi
done
```

---

## What Each Metric Means

| Log Entry | Meaning | Good Value |
|-----------|---------|-----------|
| `Received X items` | Number of records from API | Should match query |
| `duration=XXXms` | How long operation took | <10000ms for single call |
| `Querying status="..."` | Counting subscriptions | Should see 7 statuses |
| `Stripe API call` | About to hit Stripe | Should be followed by "Received" |
| `SUCCESS - duration=` | Total execution time | <30000ms |
| `FAILED` | Error occurred | Should see error message |
| Missing "SUCCESS" | Function timed out | Indicates problem |

