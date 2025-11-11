-- Migration: Create document chat tables for Chat with Documents feature
-- This enables users to chat with their uploaded documents using AI

-- Table: document_chats
-- Stores chat sessions for each document
CREATE TABLE IF NOT EXISTS public.document_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language TEXT DEFAULT 'en' CHECK (language IN ('en', 'de', 'fr', 'it')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure one chat per document per user
  UNIQUE(document_id, user_id)
);

-- Table: chat_messages
-- Stores individual messages in a chat session
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.document_chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  source_page INTEGER, -- Page number where AI found the information (if available)
  source_section TEXT, -- Section reference (e.g., "Section 7.2")
  tokens_used INTEGER, -- Track API costs
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_document_chats_document_id ON public.document_chats(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chats_user_id ON public.document_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON public.chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(chat_id, created_at DESC);

-- Updated_at trigger for document_chats
DROP TRIGGER IF EXISTS trg_document_chats_updated_at ON public.document_chats;
CREATE TRIGGER trg_document_chats_updated_at
BEFORE UPDATE ON public.document_chats
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Enable RLS
ALTER TABLE public.document_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_chats
-- Policy: Users can view their own chats
DROP POLICY IF EXISTS "Users can view their own document chats" ON public.document_chats;
CREATE POLICY "Users can view their own document chats"
  ON public.document_chats FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can create their own chats
DROP POLICY IF EXISTS "Users can create their own document chats" ON public.document_chats;
CREATE POLICY "Users can create their own document chats"
  ON public.document_chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own chats
DROP POLICY IF EXISTS "Users can update their own document chats" ON public.document_chats;
CREATE POLICY "Users can update their own document chats"
  ON public.document_chats FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for chat_messages
-- Policy: Users can view messages from their chats
DROP POLICY IF EXISTS "Users can view messages from their chats" ON public.chat_messages;
CREATE POLICY "Users can view messages from their chats"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.document_chats
      WHERE document_chats.id = chat_messages.chat_id
      AND document_chats.user_id = auth.uid()
    )
  );

-- Policy: Users can insert messages into their chats
DROP POLICY IF EXISTS "Users can insert messages into their chats" ON public.chat_messages;
CREATE POLICY "Users can insert messages into their chats"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.document_chats
      WHERE document_chats.id = chat_messages.chat_id
      AND document_chats.user_id = auth.uid()
    )
  );

-- Comments for documentation
COMMENT ON TABLE public.document_chats IS 'Stores chat sessions for documents. One chat per document per user.';
COMMENT ON TABLE public.chat_messages IS 'Stores individual messages in document chat sessions. Tracks source references and API costs.';
COMMENT ON COLUMN public.chat_messages.source_page IS 'Page number in the document where the AI found the information (if available)';
COMMENT ON COLUMN public.chat_messages.source_section IS 'Section reference (e.g., "Section 7.2", "Clause 3.1") where the AI found the information';
COMMENT ON COLUMN public.chat_messages.tokens_used IS 'Number of tokens used for this API call (for cost tracking)';



















