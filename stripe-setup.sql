-- SQL Quest: Pending Subscriptions Table
-- Run this in Supabase SQL Editor to create the table

-- Table for storing payments when user hasn't signed up yet
CREATE TABLE IF NOT EXISTS pending_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT,
  username TEXT,
  plan_type TEXT NOT NULL, -- 'monthly', 'annual', 'lifetime'
  expiry TIMESTAMPTZ NOT NULL,
  stripe_session_id TEXT NOT NULL,
  claimed BOOLEAN DEFAULT FALSE,
  claimed_by TEXT,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pending_email ON pending_subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_pending_username ON pending_subscriptions(username);
CREATE INDEX IF NOT EXISTS idx_pending_claimed ON pending_subscriptions(claimed);

-- Function to check and claim pending subscription on user signup/login
CREATE OR REPLACE FUNCTION claim_pending_subscription(p_username TEXT, p_email TEXT)
RETURNS TABLE(plan_type TEXT, expiry TIMESTAMPTZ) AS $$
DECLARE
  pending RECORD;
BEGIN
  -- Look for unclaimed subscription by email or username
  SELECT * INTO pending FROM pending_subscriptions
  WHERE (email = LOWER(p_email) OR username = LOWER(p_username))
    AND claimed = FALSE
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF FOUND THEN
    -- Mark as claimed
    UPDATE pending_subscriptions
    SET claimed = TRUE, claimed_by = p_username, claimed_at = NOW()
    WHERE id = pending.id;
    
    RETURN QUERY SELECT pending.plan_type, pending.expiry;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION claim_pending_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION claim_pending_subscription TO anon;
