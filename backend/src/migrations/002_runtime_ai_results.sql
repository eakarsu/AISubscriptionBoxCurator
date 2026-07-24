CREATE TABLE IF NOT EXISTS ai_results (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  endpoint VARCHAR(100) NOT NULL,
  input_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_results_user_endpoint_created
  ON ai_results (user_id, endpoint, created_at DESC);
