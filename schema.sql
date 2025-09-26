-- Database schema for the realtime chat widget system
-- This file contains the SQL commands to create the necessary tables

-- Messages table to store all conversation messages
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_type TEXT NOT NULL, -- 'user', 'ai', or 'human'
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Index for efficient querying by conversation_id
CREATE INDEX idx_conversation_id ON messages (conversation_id);

-- Index for efficient querying by timestamp (for conversation history)
CREATE INDEX idx_timestamp ON messages (timestamp);

-- Optional: Conversations table for better conversation management
-- This can be added later for more advanced features
CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    widget_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active' -- 'active', 'closed', 'human_takeover'
);

-- Index for efficient querying by widget_id
CREATE INDEX idx_widget_id ON conversations (widget_id);

-- Index for efficient querying by status
CREATE INDEX idx_status ON conversations (status);
