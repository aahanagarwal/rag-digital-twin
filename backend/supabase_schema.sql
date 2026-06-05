-- Run this in your Supabase SQL Editor

-- 1. Create the Users table
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create the Long-Term Memory table
CREATE TABLE IF NOT EXISTS public.long_term_memory (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    fact_key TEXT NOT NULL,
    fact_value TEXT NOT NULL,
    confidence_score FLOAT DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, fact_key)
);

-- 3. Enable RLS (Row Level Security) - Optional but recommended
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.long_term_memory ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Allow service role to bypass RLS, or allow anon to read/write if needed)
-- (Assuming the backend uses the SERVICE_ROLE key, it will bypass RLS automatically).
