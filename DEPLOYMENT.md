# Deployment Guide

This guide will walk you through deploying the Realtime Chat Widget to Cloudflare.

## Prerequisites

1. **Cloudflare Account**: Sign up at [cloudflare.com](https://cloudflare.com)
2. **Node.js**: Version 18 or higher
3. **Wrangler CLI**: Install globally with `npm install -g wrangler`
4. **API Keys**: OpenAI and Pinecone API keys

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Authenticate with Cloudflare

```bash
wrangler login
```

## Step 3: Create Cloudflare Resources

### Create D1 Database

```bash
wrangler d1 create chat-messages
```

Copy the database ID from the output and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "chat-messages"
database_id = "YOUR_DATABASE_ID_HERE"  # Replace with actual ID
```

### Create KV Namespace

```bash
wrangler kv:namespace create CONFIG_KV
```

Copy the namespace ID from the output and update `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "CONFIG_KV"
id = "YOUR_KV_NAMESPACE_ID_HERE"  # Replace with actual ID
```

### Run Database Migration

```bash
wrangler d1 execute chat-messages --file=./schema.sql
```

## Step 4: Set Environment Secrets

Set your API keys as Cloudflare secrets:

```bash
# OpenAI API Key
wrangler secret put OPENAI_API_KEY
# Enter your OpenAI API key when prompted

# Pinecone API Key
wrangler secret put PINECONE_API_KEY
# Enter your Pinecone API key when prompted

# Pinecone Base URL (e.g., https://your-index.svc.pinecone.io)
wrangler secret put PINECONE_BASE_URL
# Enter your Pinecone base URL when prompted

# Bubble API Secret (for authenticating requests from Bubble.io)
wrangler secret put BUBBLE_API_SECRET
# Enter a secure random string for Bubble authentication
```

## Step 5: Deploy the Worker

```bash
wrangler deploy
```

## Step 6: Deploy the Frontend (Pages)

```bash
wrangler pages deploy public
```

## Step 7: Configure Custom Domain (Optional)

1. Go to your Cloudflare dashboard
2. Navigate to Workers & Pages
3. Select your deployed worker
4. Go to Settings > Triggers
5. Add a custom domain

## Step 8: Test the Deployment

### Test the Health Endpoint

```bash
curl https://your-domain.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2023-10-30T12:00:00.000Z"
}
```

### Test Widget Configuration

```bash
curl -X POST https://your-domain.com/api/config \
  -H "Authorization: Bearer YOUR_BUBBLE_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "widgetId": "test-widget",
    "config": {
      "widget_id": "test-widget",
      "org_id": "test-org",
      "color": "#007bff",
      "prompt": "You are a helpful AI assistant.",
      "title": "Test Chat"
    }
  }'
```

### Test WebSocket Connection

You can test the WebSocket connection using a tool like `wscat`:

```bash
npm install -g wscat
wscat -c wss://your-domain.com/api/chat/test-conversation
```

Send a test message:
```json
{
  "widgetId": "test-widget",
  "conversationId": "test-conversation",
  "message": "Hello, how are you?"
}
```

## Step 9: Configure Bubble.io Integration

In your Bubble.io application, set up HTTP API calls to interact with your deployed worker:

### Save Widget Configuration
- **Method**: POST
- **URL**: `https://your-domain.com/api/config`
- **Headers**: 
  - `Authorization: Bearer YOUR_BUBBLE_API_SECRET`
  - `Content-Type: application/json`
- **Body**: 
  ```json
  {
    "widgetId": "{{widget_id}}",
    "config": {
      "widget_id": "{{widget_id}}",
      "org_id": "{{org_id}}",
      "color": "{{color}}",
      "prompt": "{{prompt}}",
      "title": "{{title}}"
    }
  }
  ```

### Get Conversation History
- **Method**: GET
- **URL**: `https://your-domain.com/api/history/{{conversation_id}}`
- **Headers**: 
  - `Authorization: Bearer YOUR_BUBBLE_API_SECRET`

### Initiate Human Takeover
- **Method**: POST
- **URL**: `https://your-domain.com/api/takeover/{{conversation_id}}`
- **Headers**: 
  - `Authorization: Bearer YOUR_BUBBLE_API_SECRET`

## Step 10: Embed the Widget

Add the widget to your website by including this script tag:

```html
<script>
  // Configure the widget
  window.CHAT_WIDGET_CONFIG = {
    widgetId: 'your-widget-id',
    apiUrl: 'https://your-domain.com'
  };
</script>
<script src="https://your-domain.com/widget.js"></script>
```

## Monitoring and Maintenance

### View Logs

```bash
wrangler tail
```

### Update Dependencies

```bash
npm update
wrangler deploy
```

### Database Management

```bash
# View database contents
wrangler d1 execute chat-messages --command="SELECT * FROM messages LIMIT 10"

# Backup database
wrangler d1 export chat-messages --output=backup.sql
```

## Troubleshooting

### Common Issues

1. **WebSocket Connection Fails**
   - Check that the worker is deployed correctly
   - Verify the WebSocket upgrade headers are present
   - Check browser console for errors

2. **API Keys Not Working**
   - Verify secrets are set correctly: `wrangler secret list`
   - Check that API keys have proper permissions

3. **Database Errors**
   - Ensure the database migration ran successfully
   - Check database binding in `wrangler.toml`

4. **CORS Issues**
   - Add CORS headers to your worker responses
   - Configure allowed origins in your worker

### Getting Help

- Check Cloudflare Workers documentation
- Review the README.md for architecture details
- Open an issue in the repository

## Security Considerations

1. **API Key Security**: Never commit API keys to version control
2. **Authentication**: Always use the BUBBLE_API_SECRET for Bubble requests
3. **Input Validation**: Validate all inputs in your worker
4. **Rate Limiting**: Consider implementing rate limiting for production use
5. **HTTPS Only**: Always use HTTPS in production

## Performance Optimization

1. **Edge Caching**: Leverage Cloudflare's edge network
2. **Database Indexing**: Ensure proper indexes on frequently queried columns
3. **Connection Pooling**: Durable Objects handle this automatically
4. **Monitoring**: Set up alerts for error rates and response times
