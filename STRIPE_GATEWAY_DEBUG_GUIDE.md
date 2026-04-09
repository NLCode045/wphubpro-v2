# Stripe Gateway Multiple Execution Investigation Guide

## Problem Description
When loading admin/finance/subscriptions page, stripe-gateway function is executed 10+ times at once, then fails with "No response from stripe-gateway" error.

## Root Cause Analysis

The multiple concurrent executions suggest one of these scenarios:

1. **Frontend is making multiple API calls in parallel** - All tabs/queries firing simultaneously
2. **React Query retry logic** - Queries retrying when first attempt fails
3. **Cascade effect** - One function calling stripe-gateway multiple times
4. **Browser-triggered multiple requests** - Duplicate requests from browser

## Investigation Steps

### Step 1: Identify Which Action Is Being Called
Look for these patterns in the function logs:

```
stripe-gateway: Parsed action="admin-finance-summary"
```

Check if ALL 10 executions are the same action or different actions:
- **All same action**: Duplicate request problem (Step 2)
- **Different actions**: Parallel legitimate queries (Step 3)

### Step 2: Check Request Deduplication
For each execution, check the HTTP headers - particularly:
- `x-appwrite-client-ip`: Should see `172.20.0.1`
- Look for identical request parameters

If all 10 requests are identical (same action, same parameters), then:
- → **Problem: Frontend is sending duplicate requests**
- → Solution: Add debouncing/request deduplication in frontend

### Step 3: Check Individual Execution Durations
Look for timing patterns in successful vs failed executions:

```
adminFinanceSummary: START
...many Stripe API calls...
adminFinanceSummary: SUCCESS - duration=8234ms
```

Expected times:
- `admin-list-subscriptions`: 500-2000ms (1 API call)
- `admin-finance-summary`: 5000-15000ms (7+ API calls)  
- `admin-finance-dashboard`: 5000-20000ms (many API calls)

If you see:
- **All < 1000ms**: Probably successful cache hits
- **All > 30000ms**: Hitting function timeout (300s default)
- **Mixed times**: Some blocking others

### Step 4: Identify Hanging Executions
Look for logs that have:
- ✓ `START` message
- ✗ NO `SUCCESS` or `FAILED` message at the end

Example of hanging:
```
adminFinanceSummary: START
adminFinanceSummary: Counting subscriptions by status
adminFinanceSummary: Querying status="active"
adminFinanceSummary: Stripe API call - subscriptions.list({status:"active", page:0, limit:100})
adminFinanceSummary: Received 50 items for status="active", page=0
[LOGS END HERE - NO FINAL SUCCESS/FAILED]
```

This means it's stuck waiting for next API call.

### Step 5: Check Stripe API Rate Limits
Look for Stripe API error responses in logs:

```
error: Rate limit exceeded on Stripe API
error: 429 Too Many Requests
error: Stripe API error: ...
```

If seeing rate limit errors:
- → All 10 executions are hitting Stripe too fast
- → Solution: Add delay/queue between gateway calls

### Step 6: Check Vault Access Contention
Look for vault retrieval timing:

```
getProviderCredentials: Querying vault for provider="stripe"
getProviderCredentials: Retrieved vault document (2ms)
```

If you see slow vault operations (> 5000ms):
- → Vault queries might be blocking each other
- → Check Appwrite database performance

## Common Scenarios & Solutions

### Scenario A: 10 Identical Requests, All Success
```
Execution 1: admin-finance-summary, duration=8234ms, SUCCESS
Execution 2: admin-finance-summary, duration=8221ms, SUCCESS  
Execution 3: admin-finance-summary, duration=8198ms, SUCCESS
... (all similar)
Execution 10: admin-finance-summary, duration=8176ms, SUCCESS
```

**Problem**: Frontend sending 10 duplicate requests for same data
**Solution**: 
1. Add request deduplication in frontend
2. Use React Query's deduplication features
3. Add debouncing to prevent multiple simultaneous calls

### Scenario B: Mixed Actions, Some Hang
```
Execution 1: admin-list-subscriptions, duration=1234ms, SUCCESS
Execution 2: admin-finance-summary, duration=NONE, FAILED (waiting)
Execution 3: admin-get-details(sub_123), duration=1567ms, SUCCESS
Execution 4: admin-list-payment-intents, duration=NONE, FAILED (waiting)
```

**Problem**: Some actions hang while others work
**Solution**:
1. Check which actions hang - likely has an issue
2. Review error message for that specific handler
3. Increase function timeout if needed

### Scenario C: All Hang After ~30 Seconds
```
All 10 executions show duration=(around 30000ms)
All show: FAILED or NO RESPONSE
Logs end abruptly
```

**Problem**: Function timeout (Appwrite default 60s, but may be configured lower)
**Solution**:
1. Check function timeout setting
2. If admin-finance-dashboard is causing it, may need to reduce data queries
3. Optimize Stripe API queries (pagination, limits)

### Scenario D: Cascading Requests
```
Execution 1: admin-list-subscriptions, START
  └─ calls Stripe API
  └─ returns success
Execution 2-10: all admin-finance-summary, START
  └─ each calls multiple Stripe APIs
  └─ frontend gets data from Ex1
  └─ frontend retries Ex2-10 when partial data received
```

**Problem**: Frontend logic triggers multiple retries
**Solution**:
1. Review frontend query logic
2. Only fetch what's needed
3. Cache results appropriately

## Logging Export

To export and analyze logs:

1. **In Appwrite Console**:
   - Functions → stripe-gateway → Executions
   - Filter by date/time of the issue
   - Click each execution to view full logs

2. **Export logs** (if available):
   - Copy-paste all 10 execution logs
   - Grep for "duration=" to extract timing
   - Grep for "FAILED" to find errors

3. **Analysis queries**:
   ```bash
   # Count successful vs failed
   grep "SUCCESS\|FAILED" logs.txt | wc -l
   
   # Extract durations
   grep "duration=" logs.txt
   
   # Find hanging executions (no duration)
   grep "START" logs.txt | grep -v "SUCCESS\|FAILED"
   
   # Count API calls per execution
   grep "Stripe API call" logs.txt | wc -l
   ```

## Next Steps

After identifying which scenario applies:

1. **For duplicate frontend requests**: Implement request deduplication
2. **For cascading/retry logic**: Review React Query configuration
3. **For timeout issues**: Optimize handlers to reduce data queries
4. **For rate limiting**: Implement queue/backoff mechanism
5. **For vault/database issues**: Check Appwrite performance

## Fallback Debugging

If logs don't give clear answer:

1. **Add timing to each Stripe call**:
   ```javascript
   const startStripeCall = Date.now();
   const result = await stripe.subscriptions.list({...});
   log(`API call took ${Date.now() - startStripeCall}ms`);
   ```

2. **Add memory/resource logging**:
   ```javascript
   const memBefore = process.memoryUsage();
   // ... do work ...
   const memAfter = process.memoryUsage();
   log(`Memory delta: ${(memAfter.heapUsed - memBefore.heapUsed) / 1024}kb`);
   ```

3. **Add concurrent request counter**:
   ```javascript
   global.activeRequests = (global.activeRequests || 0) + 1;
   log(`Active requests: ${global.activeRequests}`);
   // ... do work ...
   global.activeRequests--;
   ```

This helps identify if multiple concurrent requests are interfering with each other.
