-- Add deleted_at to profiles for admin soft-delete (Admin Bin)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Admin can update any profile (needed to set/clear deleted_at)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admin can hard-delete profiles (used when purging from Admin Bin)
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Extend purge function to include profiles
CREATE OR REPLACE FUNCTION public.purge_old_bin_items()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.transactions WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '7 days';
  DELETE FROM public.recurring_transactions WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '7 days';
  DELETE FROM public.savings_jars WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '7 days';
  DELETE FROM public.budgets WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '7 days';
  DELETE FROM public.profiles WHERE deleted_at IS NOT NULL AND deleted_at < now() - interval '7 days';
END;
$function$;