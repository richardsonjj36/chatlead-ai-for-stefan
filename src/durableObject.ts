import type { Env, ChatMessage, WidgetConfig, WebSocketMessage, PineconeResponse, OpenAIEmbeddingResponse, OpenAIChatCompletionChunk } from './types';

export class ConversationEngine {
  state: DurableObjectState;
  env: Env;
  webSocket?: WebSocket;
  isHumanTakeover: boolean = false;
  conversationId?: string;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  // The main entry point for requests to this Durable Object
  async fetch(request: Request) {
    // Expecting a WebSocket upgrade request
    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = [webSocketPair[0], webSocketPair[1]];
    await this.handleWebSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    } as any);
  }

  async handleWebSocket(ws: WebSocket) {
    this.webSocket = ws;
    ws.accept();

    ws.addEventListener('message', async (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string);
        this.conversationId = data.conversationId || `conv-${Date.now()}`;

        // Persist user message to D1
        const userMessage: ChatMessage = {
          conversation_id: this.conversationId!,
          sender_type: 'user',
          content: data.message,
        };
        await this.saveMessageToD1(userMessage);

        // If a human has taken over, do not proceed with AI response
        if (this.isHumanTakeover) {
          this.sendMessage({ type: 'error', content: 'A human agent has taken over this conversation.' });
          return;
        }
        
        // Full RAG and AI Response Pipeline
        await this.processAIRAGPipeline(data.message, data.widgetId);
      } catch (error: any) {
        console.error('Error processing WebSocket message:', error);
        this.sendMessage({ type: 'error', content: 'Sorry, I encountered an error processing your message.' });
      }
    });

    ws.addEventListener('close', () => {
      console.log('WebSocket connection closed');
    });

    ws.addEventListener('error', (error: Event) => {
      console.error('WebSocket error:', error);
    });
  }

  async processAIRAGPipeline(userMessage: string, widgetId: string) {
    try {
      // Get widget configuration from KV
      const configData = await this.env.CONFIG_KV.get(widgetId, 'json') as WidgetConfig;
      if (!configData) {
        this.sendMessage({ type: 'error', content: 'Widget configuration not found.' });
        return;
      }

      // 1. Get Embeddings from OpenAI
      const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: userMessage,
          model: 'text-embedding-ada-002',
        }),
      });

      if (!embeddingResponse.ok) {
        throw new Error(`OpenAI embedding API error: ${embeddingResponse.status}`);
      }

      const embeddingData: OpenAIEmbeddingResponse = await embeddingResponse.json();
      const vector = embeddingData.data[0]?.embedding;
      if (!vector) {
        throw new Error('No embedding returned from OpenAI');
      }

      // 2. Query Pinecone for relevant context
      const pineconeResponse = await fetch(`${this.env.PINECONE_BASE_URL}/query`, {
        method: 'POST',
        headers: {
          'Api-Key': this.env.PINECONE_API_KEY,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vector: vector,
          topK: 5,
          includeMetadata: true,
          filter: { org_id: configData.org_id },
        }),
      });

      if (!pineconeResponse.ok) {
        throw new Error(`Pinecone API error: ${pineconeResponse.status}`);
      }

      const pineconeData: PineconeResponse = await pineconeResponse.json();
      const context = pineconeData.matches
        .map((match) => match.metadata.text)
        .join('\n\n');

      // 3. Get conversation history for context
      const history = await this.getConversationHistory();
      
      // 4. Call OpenAI Chat Completion API with Streaming
      const systemPrompt = this.buildSystemPrompt(configData, context);
      const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...history,
        { role: 'user' as const, content: userMessage }
      ];

      const completionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: messages,
          stream: true,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      });

      if (!completionResponse.ok) {
        throw new Error(`OpenAI chat completion API error: ${completionResponse.status}`);
      }

      // 5. Stream the response back to the client
      const reader = completionResponse.body!.getReader();
      let fullResponse = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));
        
        for (const line of lines) {
          const message = line.replace(/^data: /, '');
          if (message === '[DONE]') break;
          
          try {
            const json: OpenAIChatCompletionChunk = JSON.parse(message);
            const token = json.choices[0]?.delta?.content;
            if (token) {
              this.sendMessage({ type: 'token', content: token });
              fullResponse += token;
            }
          } catch (parseError: any) {
            console.error('Error parsing OpenAI response:', parseError);
          }
        }
      }
      
      // 6. Persist the final AI message to D1
      if (fullResponse.trim()) {
        const aiMessage: ChatMessage = {
          conversation_id: this.conversationId!,
          sender_type: 'ai',
          content: fullResponse,
        };
        await this.saveMessageToD1(aiMessage);
      }

      // Send completion signal
      this.sendMessage({ type: 'complete' });

    } catch (error: any) {
      console.error('Error in AI pipeline:', error);
      this.sendMessage({ 
        type: 'error', 
        content: 'Sorry, I encountered an error while processing your request. Please try again.' 
      });
    }
  }

  private buildSystemPrompt(config: WidgetConfig, context: string): string {
    const basePrompt = config.prompt || 'You are a helpful AI assistant.';
    const contextSection = context ? `\n\nRelevant context:\n${context}` : '';
    
    return `${basePrompt}${contextSection}\n\nPlease provide helpful, accurate responses based on the context provided. If the context doesn't contain relevant information, let the user know and offer to help in other ways.`;
  }

  private async getConversationHistory(): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
    if (!this.conversationId) return [];
    
    try {
      const { results } = await this.env.DB.prepare(
        'SELECT sender_type, content FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC LIMIT 10'
      ).bind(this.conversationId).all() as { results: Array<{ sender_type: string; content: string }> };

      return results.map(msg => ({
        role: msg.sender_type === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      }));
    } catch (error: any) {
      console.error('Error fetching conversation history:', error);
      return [];
    }
  }

  private sendMessage(message: WebSocketMessage) {
    if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.send(JSON.stringify(message));
    }
  }

  async saveMessageToD1(message: ChatMessage) {
    try {
      const messageId = crypto.randomUUID();
      await this.env.DB.prepare(
        'INSERT INTO messages (id, conversation_id, sender_type, content) VALUES (?, ?, ?, ?)'
      ).bind(messageId, message.conversation_id, message.sender_type, message.content).run();
    } catch (error: any) {
      console.error('Error saving message to D1:', error);
      throw error;
    }
  }

  // Method to handle human takeover (called via HTTP from the main worker)
  async handleHumanTakeover() {
    this.isHumanTakeover = true;
    this.sendMessage({ 
      type: 'complete', 
      content: 'A human agent is now taking over this conversation.' 
    });
  }
}
