-- Migration: replace birthday_2days_before boolean with flexible birthday_days_before int
-- and add birthday_filter for wish-based filtering.

-- Add birthday_days_before (default 2 = same as old boolean true)
ALTER TABLE public.notification_settings
    ADD COLUMN IF NOT EXISTS birthday_days_before integer NOT NULL DEFAULT 2;

-- Migrate existing data: true -> 2, false -> 0
UPDATE public.notification_settings
    SET birthday_days_before = CASE WHEN birthday_2days_before THEN 2 ELSE 0 END;

-- Add birthday_filter column
ALTER TABLE public.notification_settings
    ADD COLUMN IF NOT EXISTS birthday_filter text NOT NULL DEFAULT 'all';

-- Drop the old boolean column
ALTER TABLE public.notification_settings
    DROP COLUMN IF EXISTS birthday_2days_before;
