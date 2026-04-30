-- V4__secure_schema_rls.sql
-- Enable Row Level Security (RLS) on all public tables to fix Supabase security warnings
-- (RLS Disabled in Public and Sensitive Columns Exposed).
-- The Spring Boot application connects as a privileged user (e.g., postgres) which bypasses RLS,
-- so this change primarily secures the database against unintended direct access via PostgREST
-- or other exposed Supabase APIs.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passkeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;


-- Revoke all privileges from anon and authenticated roles if they exist (Supabase specific)
-- This fixes the "Sensitive Columns Exposed" warning for public.refresh_tokens and hardens the schema.
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
        EXECUTE 'REVOKE ALL ON public.users FROM anon';
        EXECUTE 'REVOKE ALL ON public.vault_items FROM anon';
        EXECUTE 'REVOKE ALL ON public.refresh_tokens FROM anon';
        EXECUTE 'REVOKE ALL ON public.passkeys FROM anon';
        EXECUTE 'REVOKE ALL ON public.audit_logs FROM anon';
        
        -- Removed revoke from flyway_schema_history
    END IF;
    
    IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'REVOKE ALL ON public.users FROM authenticated';
        EXECUTE 'REVOKE ALL ON public.vault_items FROM authenticated';
        EXECUTE 'REVOKE ALL ON public.refresh_tokens FROM authenticated';
        EXECUTE 'REVOKE ALL ON public.passkeys FROM authenticated';
        EXECUTE 'REVOKE ALL ON public.audit_logs FROM authenticated';
        
        -- Removed revoke from flyway_schema_history
    END IF;
END
$$;
