export interface Env {
  CONVERSATION_ENGINE: DurableObjectNamespace;
  DB: D1Database;
  CONFIG_KV: KVNamespace;

  // Secrets
  OPENAI_API_KEY: string;
  PINECONE_API_KEY: string;
  PINECONE_BASE_URL: string;
  BUBBLE_API_SECRET: string; // Used to authenticate requests from Bubble
}

export interface ChatMessage {
  id?: string;
  conversation_id: string;
  sender_type: 'user' | 'ai' | 'human';
  content: string;
  timestamp?: string;
}

export interface WidgetConfig {
  widget_id: string;
  org_id: string;
  color?: string;
  prompt?: string;
  title?: string;
  welcome_message?: string;
  [key: string]: any; // Allow for additional configuration options
}

export interface WebSocketMessage {
  type: 'token' | 'error' | 'complete' | 'typing';
  content?: string;
  conversationId?: string;
  widgetId?: string;
  message?: string;
}

export interface PineconeMatch {
  id: string;
  score: number;
  metadata: {
    text: string;
    [key: string]: any;
  };
}

export interface PineconeResponse {
  matches: PineconeMatch[];
}

export interface OpenAIEmbeddingResponse {
  data: Array<{
    embedding: number[];
  }>;
}

export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIChatCompletionRequest {
  model: string;
  messages: OpenAIChatMessage[];
  stream: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface OpenAIChatCompletionChunk {
  choices: Array<{
    delta: {
      content?: string;
    };
    finish_reason?: string;
  }>;
}
