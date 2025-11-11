-- Migration: Create API usage tracking for cost monitoring and rate limiting
-- Tracks Gemini API usage, token consumption, and costs per user

-- Table: api_usage_tracking
-- Stores individual API calls for detailed tracking
CREATE TABLE IF NOT EXISTS public.api_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api_provider TEXT NOT NULL CHECK (api_provider IN ('gemini', 'openai', 'anthropic', 'other')),
  api_model TEXT NOT NULL, -- e.g., 'gemini-1.5-flash', 'gpt-4', etc.
  operation_type TEXT NOT NULL CHECK (operation_type IN ('document_chat', 'global_chat', 'text_extraction', 'document_classification', 'other')),

  -- Token usage
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER NOT NULL DEFAULT 0,

  -- Cost tracking (in USD cents to avoid floating point issues)
  estimated_cost_cents INTEGER DEFAULT 0,

  -- Performance metrics
  response_time_ms INTEGER,

  -- Context
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  chat_id UUID REFERENCES public.document_chats(id) ON DELETE SET NULL,

  -- Request details
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Table: user_usage_limits
-- Stores usage limits and current consumption per user
CREATE TABLE IF NOT EXISTS public.user_usage_limits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Daily limits
  daily_requests_limit INTEGER DEFAULT 100,
  daily_tokens_limit INTEGER DEFAULT 1000000, -- 1M tokens per day
  daily_cost_limit_cents INTEGER DEFAULT 1000, -- $10 per day

  -- Current usage (reset daily)
  daily_requests_used INTEGER DEFAULT 0,
  daily_tokens_used INTEGER DEFAULT 0,
  daily_cost_used_cents INTEGER DEFAULT 0,

  -- Last reset timestamp
  last_reset_date DATE DEFAULT CURRENT_DATE,

  -- Account status
  is_premium BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_user_created ON public.api_usage_tracking(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_operation ON public.api_usage_tracking(operation_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_provider ON public.api_usage_tracking(api_provider, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_document ON public.api_usage_tracking(document_id) WHERE document_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_usage_chat ON public.api_usage_tracking(chat_id) WHERE chat_id IS NOT NULL;

-- Updated_at trigger for user_usage_limits
DROP TRIGGER IF EXISTS trg_user_usage_limits_updated_at ON public.user_usage_limits;
CREATE TRIGGER trg_user_usage_limits_updated_at
BEFORE UPDATE ON public.user_usage_limits
FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- Enable RLS
ALTER TABLE public.api_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_usage_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_usage_tracking
DROP POLICY IF EXISTS "Users can view their own usage" ON public.api_usage_tracking;
CREATE POLICY "Users can view their own usage"
  ON public.api_usage_tracking FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert usage records" ON public.api_usage_tracking;
CREATE POLICY "System can insert usage records"
  ON public.api_usage_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_usage_limits
DROP POLICY IF EXISTS "Users can view their own limits" ON public.user_usage_limits;
CREATE POLICY "Users can view their own limits"
  ON public.user_usage_limits FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own limits" ON public.user_usage_limits;
CREATE POLICY "Users can update their own limits"
  ON public.user_usage_limits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can modify their own limits" ON public.user_usage_limits;
CREATE POLICY "Users can modify their own limits"
  ON public.user_usage_limits FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to reset daily usage counters
CREATE OR REPLACE FUNCTION reset_daily_usage()
RETURNS void AS $$
BEGIN
  UPDATE public.user_usage_limits
  SET
    daily_requests_used = 0,
    daily_tokens_used = 0,
    daily_cost_used_cents = 0,
    last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and update usage limits
CREATE OR REPLACE FUNCTION check_usage_limits(
  p_user_id UUID,
  p_estimated_tokens INTEGER DEFAULT 0,
  p_estimated_cost_cents INTEGER DEFAULT 0
)
RETURNS TABLE (
  can_proceed BOOLEAN,
  reason TEXT,
  daily_requests_remaining INTEGER,
  daily_tokens_remaining INTEGER,
  daily_cost_remaining_cents INTEGER
) AS $$
DECLARE
  v_limits RECORD;
BEGIN
  -- Get or create user limits
  SELECT * INTO v_limits
  FROM public.user_usage_limits
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    -- Create default limits for new user
    INSERT INTO public.user_usage_limits (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_limits;
  END IF;

  -- Reset daily counters if needed
  IF v_limits.last_reset_date < CURRENT_DATE THEN
    UPDATE public.user_usage_limits
    SET
      daily_requests_used = 0,
      daily_tokens_used = 0,
      daily_cost_used_cents = 0,
      last_reset_date = CURRENT_DATE
    WHERE user_id = p_user_id
    RETURNING * INTO v_limits;
  END IF;

  -- Check if user is blocked
  IF v_limits.is_blocked THEN
    RETURN QUERY SELECT
      false,
      'Account blocked',
      0,
      0,
      0;
    RETURN;
  END IF;

  -- Check limits
  IF (v_limits.daily_requests_used + 1) > v_limits.daily_requests_limit THEN
    RETURN QUERY SELECT
      false,
      'Daily request limit exceeded',
      v_limits.daily_requests_limit - v_limits.daily_requests_used,
      v_limits.daily_tokens_limit - v_limits.daily_tokens_used,
      v_limits.daily_cost_limit_cents - v_limits.daily_cost_used_cents;
    RETURN;
  END IF;

  IF (v_limits.daily_tokens_used + p_estimated_tokens) > v_limits.daily_tokens_limit THEN
    RETURN QUERY SELECT
      false,
      'Daily token limit exceeded',
      v_limits.daily_requests_limit - v_limits.daily_requests_used,
      v_limits.daily_tokens_limit - v_limits.daily_tokens_used,
      v_limits.daily_cost_limit_cents - v_limits.daily_cost_used_cents;
    RETURN;
  END IF;

  IF (v_limits.daily_cost_used_cents + p_estimated_cost_cents) > v_limits.daily_cost_limit_cents THEN
    RETURN QUERY SELECT
      false,
      'Daily cost limit exceeded',
      v_limits.daily_requests_limit - v_limits.daily_requests_used,
      v_limits.daily_tokens_limit - v_limits.daily_tokens_used,
      v_limits.daily_cost_limit_cents - v_limits.daily_cost_used_cents;
    RETURN;
  END IF;

  -- All checks passed
  RETURN QUERY SELECT
    true,
    'OK',
    v_limits.daily_requests_limit - v_limits.daily_requests_used,
    v_limits.daily_tokens_limit - v_limits.daily_tokens_used,
    v_limits.daily_cost_limit_cents - v_limits.daily_cost_used_cents;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE public.api_usage_tracking IS 'Tracks individual API calls for cost monitoring and analytics';
COMMENT ON TABLE public.user_usage_limits IS 'Stores usage limits and current consumption per user with daily reset';
COMMENT ON COLUMN public.api_usage_tracking.estimated_cost_cents IS 'Estimated cost in USD cents (e.g., 150 = $1.50)';
COMMENT ON COLUMN public.user_usage_limits.daily_cost_limit_cents IS 'Daily cost limit in USD cents (e.g., 1000 = $10.00)';
COMMENT ON FUNCTION check_usage_limits IS 'Checks if user can make API call within their limits and returns remaining quotas';