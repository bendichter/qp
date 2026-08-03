# API Security Hardening Documentation

This document describes the security hardening measures implemented for the QP Worker API and how to deploy them.

## Security Features Implemented

### 1. Rate Limiting
- **Completion API**: 100 requests/minute, 1000 requests/hour per IP
- **Chat Operations**: 300 requests/minute, 5000 requests/hour per IP
- **Auto-blocking**: IPs with 10+ violations in an hour are blocked for 24 hours
- **Privacy**: IP addresses are hashed (SHA-256) before storage

### 2. Request Size Validation
- **Completion requests**: Max 2 MB
- **Chat operations**: Max 10 MB (to support images)
- **Messages per completion**: Max 50 messages
- **Characters per message**: Max 400,000 characters
- **Chat storage size**: Max 10 MB per chat

### 3. Chat Limits
- **Chats per app**: Max 1,000 chats per app
- Returns error when limit is reached

### 4. Protected Routes
- Admin-only routes remain protected with `x-admin-key` header
- Rate limits apply to all public endpoints

## Deployment Instructions

### Step 1: Create KV Namespace

You need to create a Cloudflare KV namespace for rate limiting:

```bash
cd worker
npx wrangler kv:namespace create "RATE_LIMIT_KV"
```

This will output something like:
```
🌀 Creating namespace with title "qp-worker-RATE_LIMIT_KV"
✨ Success!
Add the following to your wrangler.toml:
{ binding = "RATE_LIMIT_KV", id = "xxxxxxxxxxxxxxxxxxxxxx" }
```

### Step 2: Update wrangler.toml

Replace `YOUR_KV_NAMESPACE_ID` in `wrangler.toml` with the actual ID from Step 1:

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "xxxxxxxxxxxxxxxxxxxxxx"  # Replace with your actual KV namespace ID
```

### Step 3: Deploy

Deploy the updated worker:

```bash
npx wrangler deploy
```

## Error Responses

### Rate Limit Exceeded (429)
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 60,
  "message": "Rate limit exceeded: 100 requests per minute"
}
```

### Request Too Large (413)
```json
{
  "error": "Request validation failed",
  "message": "Request body too large: 1.2 MB (max: 500.0 KB)"
}
```

### Chat Limit Exceeded (400)
```json
{
  "error": "Chat limit exceeded for app myapp. Maximum 1000 chats allowed."
}
```

### IP Blocked (429)
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 86400,
  "message": "IP blocked due to excessive violations"
}
```

## Monitoring

### Rate Limit Data
Rate limit data is stored in KV with the following keys:
- `ratelimit:completion:{hashedIP}` - Completion request counts
- `ratelimit:chatOps:{hashedIP}` - Chat operation counts
- `blocked:{hashedIP}` - Blocked IPs with expiration timestamp

### Check Blocked IPs
Use the Cloudflare dashboard or Wrangler CLI to view KV entries:

```bash
npx wrangler kv:key list --namespace-id YOUR_KV_NAMESPACE_ID
```

### Unblock an IP Manually
If you need to manually unblock an IP:

1. Get the hashed IP value (from logs or KV)
2. Delete the block key:
```bash
npx wrangler kv:key delete "blocked:HASHED_IP_VALUE" --namespace-id YOUR_KV_NAMESPACE_ID
```

## Configuration

### Adjusting Rate Limits

To modify rate limits, edit `worker/src/utils/rateLimiter.ts`:

```typescript
export const RATE_LIMITS = {
  completion: {
    perMinute: 10,  // Adjust as needed
    perHour: 100,   // Adjust as needed
  },
  chatOps: {
    perMinute: 30,  // Adjust as needed
    perHour: 500,   // Adjust as needed
  },
};
```

### Adjusting Size Limits

To modify size limits, edit `worker/src/utils/sizeValidation.ts`:

```typescript
export const SIZE_LIMITS = {
  defaultRequest: 2 * 1024 * 1024, // Adjust as needed
  chatRequest: 10 * 1024 * 1024,   // Adjust as needed
  maxMessagesPerCompletion: 50,    // Adjust as needed
  maxCharsPerMessage: 400000,      // Adjust as needed
  maxChatStorageSize: 10 * 1024 * 1024, // Adjust as needed
};
```

### Adjusting Chat Limit

To modify the chat limit per app, edit `worker/src/utils/sizeValidation.ts`:

```typescript
export const MAX_CHATS_PER_APP = 1000; // Adjust as needed
```

After making any configuration changes, redeploy:
```bash
npx wrangler deploy
```

## Frontend Integration

When implementing frontend handling for these errors:

### Rate Limit Handling
```typescript
if (response.status === 429) {
  const data = await response.json();
  // Show user-friendly message
  alert(`Rate limit exceeded. Please try again in ${data.retryAfter} seconds.`);
  // Or implement automatic retry with exponential backoff
}
```

### Size Limit Handling
```typescript
if (response.status === 413) {
  const data = await response.json();
  alert(`Request too large: ${data.message}`);
  // Suggest user to reduce content or split into smaller requests
}
```

### Chat Limit Handling
```typescript
if (response.status === 400 && data.error.includes('limit exceeded')) {
  alert('You have reached the maximum number of chats. Please delete some old chats to create new ones.');
  // Redirect to chats list with delete option
}
```

## Security Best Practices

1. **Monitor KV Usage**: Regularly check KV storage usage in Cloudflare dashboard
2. **Review Blocked IPs**: Periodically review blocked IPs to identify abuse patterns
3. **Update Limits**: Adjust rate limits based on actual usage patterns
4. **Log Analysis**: Monitor worker logs for unusual patterns
5. **Rotate Salt**: Consider rotating the IP hash salt periodically for enhanced privacy

