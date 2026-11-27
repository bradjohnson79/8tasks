ALTER TABLE "affiliate_links" ADD COLUMN "is_affiliate" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Public pages only need to know whether a listing's link earns commission (to show the
-- affiliate disclosure or the free-listing note). app_runtime still has no access to
-- affiliate_links itself, so URLs and notes stay admin-only.
CREATE OR REPLACE FUNCTION link_is_affiliate(p_link_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT is_affiliate FROM affiliate_links WHERE id = p_link_id
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION link_is_affiliate(uuid) FROM PUBLIC;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION link_is_affiliate(uuid) TO app_runtime;
