-- V2__add_audit_details.sql
-- Add details column to audit_logs table

ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS details TEXT;
