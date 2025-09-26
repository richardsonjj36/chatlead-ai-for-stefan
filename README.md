# Realtime Chat Widget - Cloudflare SaaS Platform

A high-performance, real-time chatbot system built entirely on the Cloudflare ecosystem. This system provides a lightweight, embeddable frontend chat widget and a scalable backend that leverages edge computing for minimal latency.

## Architecture Overview

- **Frontend**: Cloudflare Pages (serving static HTML, CSS, JavaScript)
- **Backend Logic**: Cloudflare Workers
- **Real-time State Management**: Cloudflare Durable Objects (WebSocket connections)
- **Message Database**: Cloudflare D1 (Serverless SQL Database)
- **Configuration Store**: Cloudflare KV
- **External Services**: OpenAI (embeddings & chat completions), Pinecone (vector search)

## Features

- ⚡ **Real-time WebSocket communication** via Durable Objects
- 🤖 **AI-powered responses** with OpenAI GPT-4
- 🔍 **RAG (Retrieval Augmented Generation)** with Pinecone vector search
- 💾 **Persistent message storage** with Cloudflare D1
- 🎨 **Configurable widget styling** via KV store
- 🔐 **Secure API authentication** for Bubble.io integration
- 👥 **Human takeover capability** for live agent handoff
- 📊 **Conversation history tracking** and analytics

## Project Structure

```
/
├── public/                 # Frontend assets (served by Cloudflare Pages)
│   ├── index.html         # Chat widget HTML
│   ├── widget.js          # Client-side JavaScript
│   └── style.css          # Widget styling
├── src/                   # Backend TypeScript code
│   ├── durableObject.ts   # Durable Object for conversation management
│   ├── index.ts           # Main Worker router
│   └── types.ts           # TypeScript type definitions
├── package.json           # Node.js dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── wrangler.toml          # Cloudflare configuration
├── schema.sql             # Database schema
└── README.md              # This file
```

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ and npm
- Cloudflare account with Workers, Pages, D1, and KV access
- OpenAI API key
- Pinecone account and API key
- Bubble.io account (for external control panel)

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Cloudflare Resources

#### Create D1 Database
```bash
npm run db:create
```
Copy the database ID from the output and update `wrangler.toml`.

#### Create KV Namespace
```bash
npm run kv:create
```
Copy the namespace ID from the output and update `wrangler.toml`.

#### Run Database Migration
```bash
npm run db:migrate
```

### 4. Configure Secrets

Set your API keys in the Cloudflare dashboard or via Wrangler:

```bash
wrangler secret put OPENAI_API_KEY
wrangler secret put PINECONE_API_KEY
wrangler secret put PINECONE_BASE_URL
wrangler secret put BUBBLE_API_SECRET
```

### 5. Deploy

```bash
# Deploy the Worker
npm run deploy

# Deploy the Pages (frontend)
npm run deploy:pages
```

## API Endpoints

### WebSocket Connection
- **Endpoint**: `wss://your-domain.com/api/chat/{conversationId}`
- **Purpose**: Real-time chat communication

### Configuration Management (Bubble.io)
- **POST** `/api/config` - Save widget configuration
- **GET** `/api/config/{widgetId}` - Get widget configuration

### Conversation Management
- **GET** `/api/history/{conversationId}` - Get conversation history
- **GET** `/api/conversations/{widgetId}` - Get all conversations for a widget
- **POST** `/api/takeover/{conversationId}` - Initiate human takeover

### Health Check
- **GET** `/health` - Service health status

## Widget Configuration

Widgets are configured via the KV store with the following structure:

```json
{
  "widget_id": "widget-123",
  "org_id": "org-456",
  "color": "#007bff",
  "prompt": "You are a helpful AI assistant...",
  "title": "Chat with our AI",
  "welcome_message": "Hello! How can I help you today?"
}
```

## Development

### Local Development
```bash
npm run dev
```

### Type Checking
```bash
npm run type-check
```

## Security Considerations

- All Bubble.io requests require authentication via `BUBBLE_API_SECRET`
- WebSocket connections are isolated per conversation via Durable Objects
- API keys are stored as Cloudflare secrets
- Input validation and error handling throughout the system

## Performance Optimizations

- **Edge Computing**: All operations run at Cloudflare's edge locations
- **Durable Objects**: Stateful WebSocket connections with automatic scaling
- **D1 Database**: Serverless SQL with automatic scaling
- **KV Store**: Ultra-fast key-value storage for configuration
- **Streaming Responses**: Real-time token streaming from OpenAI

## Monitoring and Analytics

- Built-in health check endpoint
- Comprehensive error logging
- Conversation tracking and history
- Performance metrics via Cloudflare Analytics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Check the Cloudflare Workers documentation
- Review the OpenAI API documentation
- Consult the Pinecone documentation
- Open an issue in this repository
