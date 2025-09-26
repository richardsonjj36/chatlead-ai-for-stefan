import type { Env } from './types';
export { ConversationEngine } from './durableObject';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Security: Authenticate requests from Bubble
    const authHeader = request.headers.get('Authorization');
    const isBubbleRequest = authHeader === `Bearer ${env.BUBBLE_API_SECRET}`;

    // Route 1: WebSocket connection for the chat widget
    if (url.pathname.startsWith('/api/chat/')) {
      const conversationId = url.pathname.split('/')[3];
      if (!conversationId) {
        return new Response('Missing conversation ID', { status: 400 });
      }
      
      try {
        const doId = env.CONVERSATION_ENGINE.idFromName(conversationId);
        const durableObject = env.CONVERSATION_ENGINE.get(doId);
        return durableObject.fetch(request);
      } catch (error: any) {
        console.error('Error creating Durable Object:', error);
        return new Response('Internal Server Error', { status: 500 });
      }
    }
    
    // Route 2: Bubble Endpoint to save widget configuration
    if (url.pathname === '/api/config' && request.method === 'POST') {
      if (!isBubbleRequest) {
        return new Response('Unauthorized', { status: 401 });
      }
      
      try {
        const { widgetId, config } = await request.json();
        if (!widgetId || !config) {
          return new Response('Missing widgetId or config', { status: 400 });
        }
        
        await env.CONFIG_KV.put(widgetId, JSON.stringify(config));
        return new Response('Configuration saved', { status: 200 });
      } catch (error: any) {
        console.error('Error saving configuration:', error);
        return new Response('Internal Server Error', { status: 500 });
      }
    }

    // Route 3: Bubble Endpoint to get widget configuration
    if (url.pathname.startsWith('/api/config/') && request.method === 'GET') {
      if (!isBubbleRequest) {
        return new Response('Unauthorized', { status: 401 });
      }
      
      try {
        const widgetId = url.pathname.split('/')[3];
        if (!widgetId) {
          return new Response('Missing widget ID', { status: 400 });
        }
        
        const config = await env.CONFIG_KV.get(widgetId, 'json');
        if (!config) {
          return new Response('Configuration not found', { status: 404 });
        }
        
        return new Response(JSON.stringify(config), { 
          headers: { 'Content-Type': 'application/json' } 
        });
      } catch (error: any) {
        console.error('Error retrieving configuration:', error);
        return new Response('Internal Server Error', { status: 500 });
      }
    }

    // Route 4: Bubble Endpoint to get conversation history
    if (url.pathname.startsWith('/api/history/') && request.method === 'GET') {
      if (!isBubbleRequest) {
        return new Response('Unauthorized', { status: 401 });
      }
      
      try {
        const conversationId = url.pathname.split('/')[3];
        if (!conversationId) {
          return new Response('Missing conversation ID', { status: 400 });
        }
        
        const { results } = await env.DB.prepare(
          'SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC'
        ).bind(conversationId).all();
        
        return new Response(JSON.stringify(results), { 
          headers: { 'Content-Type': 'application/json' } 
        });
      } catch (error: any) {
        console.error('Error retrieving conversation history:', error);
        return new Response('Internal Server Error', { status: 500 });
      }
    }

    // Route 5: Bubble Endpoint for human takeover
    if (url.pathname.startsWith('/api/takeover/') && request.method === 'POST') {
      if (!isBubbleRequest) {
        return new Response('Unauthorized', { status: 401 });
      }
      
      try {
        const conversationId = url.pathname.split('/')[3];
        if (!conversationId) {
          return new Response('Missing conversation ID', { status: 400 });
        }
        
        // Get the Durable Object and trigger human takeover
        const doId = env.CONVERSATION_ENGINE.idFromName(conversationId);
        const durableObject = env.CONVERSATION_ENGINE.get(doId);
        
        // Call the human takeover method on the Durable Object
        await durableObject.fetch(new Request('https://fake-url/takeover', {
          method: 'POST',
          headers: { 'X-Takeover': 'true' }
        }));
        
        return new Response('Takeover initiated', { status: 200 });
      } catch (error: any) {
        console.error('Error initiating human takeover:', error);
        return new Response('Internal Server Error', { status: 500 });
      }
    }

    // Route 6: Health check endpoint
    if (url.pathname === '/health' && request.method === 'GET') {
      return new Response(JSON.stringify({ 
        status: 'healthy', 
        timestamp: new Date().toISOString() 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Route 7: Get all conversations for a widget (for Bubble dashboard)
    if (url.pathname.startsWith('/api/conversations/') && request.method === 'GET') {
      if (!isBubbleRequest) {
        return new Response('Unauthorized', { status: 401 });
      }
      
      try {
        const widgetId = url.pathname.split('/')[3];
        if (!widgetId) {
          return new Response('Missing widget ID', { status: 400 });
        }
        
        // Get all unique conversation IDs for this widget
        // Note: This is a simplified approach. In production, you might want to 
        // store widget_id in the messages table or have a separate conversations table
        const { results } = await env.DB.prepare(
          'SELECT DISTINCT conversation_id, MIN(timestamp) as first_message FROM messages GROUP BY conversation_id ORDER BY first_message DESC LIMIT 50'
        ).all();
        
        return new Response(JSON.stringify(results), { 
          headers: { 'Content-Type': 'application/json' } 
        });
      } catch (error: any) {
        console.error('Error retrieving conversations:', error);
        return new Response('Internal Server Error', { status: 500 });
      }
    }

    // Default Route: Serve the frontend from Cloudflare Pages
    // The `wrangler.toml` `pages_build_output_dir` handles this automatically.
    // This return is a fallback for assets not found.
    return new Response('Not Found', { status: 404 });
  },
};
