-- Add deleted_at column to support soft delete (Bin)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.recurring_transactions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.savings_jars ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.budgets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Indexes for fast Bin queries / cleanup
CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at ON public.transactions(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recurring_deleted_at ON public.recurring_transactions(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jars_deleted_at ON public.savings_jars(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_budgets_deleted_at ON public.budgets(deleted_at) WHERE deleted_at IS NOT NULL;

-- Enable extensions for scheduled cleanup
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Cleanup function: permanently delete items older than 7 days in the Bin
CREATE OR REPLACE FUNCTION public.purge_old_bin_items()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.transactions WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '7 days';
  DELETE FROM public.recurring_transactions WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '7 days';
  DELETE FROM public.savings_jars WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '7 days';
  DELETE FROM public.budgets WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '7 days';
END;
$$;

-- Schedule daily cleanup at 03:00 UTC
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-old-bin-items-daily') THEN
    PERFORM cron.schedule(
      'purge-old-bin-items-daily',
      '0 3 * * *',
      $cron$ SELECT public.purge_old_bin_items(); $cron$
    );
  END IF;
END $$;