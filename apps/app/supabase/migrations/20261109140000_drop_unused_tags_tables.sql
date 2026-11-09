-- Tags were removed from the product in May 2026 (20260501213000_remove_tags_feature.sql),
-- but that migration never ran on production and was later marked as applied without running.
-- This finishes the removal. Export the rows first if you want to keep them (see notes in chat).
drop table if exists public.time_entry_tags;
drop table if exists public.tags;
