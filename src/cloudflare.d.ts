// Cloudflare Workers type declarations
declare global {
  interface DurableObjectState {
    storage: DurableObjectStorage;
    id: DurableObjectId;
  }

  interface DurableObjectStorage {
    get<T = unknown>(key: string): Promise<T | undefined>;
    put<T = unknown>(key: string, value: T): Promise<void>;
    delete(key: string): Promise<boolean>;
    list<T = unknown>(options?: { prefix?: string; start?: string; end?: string; limit?: number }): Promise<Map<string, T>>;
  }

  interface DurableObjectId {
    toString(): string;
  }

  interface DurableObjectNamespace {
    idFromName(name: string): DurableObjectId;
    get(id: DurableObjectId): DurableObjectStub;
  }

  interface DurableObjectStub {
    fetch(request: Request): Promise<Response>;
  }

  interface D1Database {
    prepare(query: string): D1PreparedStatement;
  }

  interface D1PreparedStatement {
    bind(...values: any[]): D1PreparedStatement;
    all(): Promise<D1Result>;
    run(): Promise<D1RunResult>;
    first(): Promise<any>;
  }

  interface D1Result {
    results: any[];
    success: boolean;
    meta: any;
  }

  interface D1RunResult {
    success: boolean;
    meta: any;
  }

  interface KVNamespace {
    get(key: string, type?: 'text'): Promise<string | null>;
    get(key: string, type: 'json'): Promise<any>;
    put(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
  }

  interface ExecutionContext {
    waitUntil(promise: Promise<any>): void;
    passThroughOnException(): void;
  }

  interface WebSocketPair {
    0: WebSocket;
    1: WebSocket;
  }

  class WebSocketPair {
    constructor();
    0: WebSocket;
    1: WebSocket;
  }

  interface WebSocket {
    accept(): void;
    send(data: string | ArrayBuffer): void;
    close(code?: number, reason?: string): void;
    addEventListener(type: string, listener: (event: any) => void): void;
    readyState: number;
  }

  const OPEN: number;
  const CLOSED: number;
  const CONNECTING: number;
  const CLOSING: number;
}

export {};
