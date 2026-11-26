-- Affiliate earnings feed: RLS, grants, triggers, postback writer, click-id redirect.
-- Hand-written (drizzle-kit --custom). See docs/SECURITY.md.

ALTER TABLE affiliate_programs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE affiliate_transactions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE affiliate_sync_runs ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON affiliate_programs, affiliate_transactions, affiliate_sync_runs FROM PUBLIC;
--> statement-breakpoint

-- Admin only (founder). app_runtime has no direct access to any of these tables.
GRANT SELECT, INSERT, UPDATE ON affiliate_programs TO app_admin;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON affiliate_transactions TO app_admin;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON affiliate_sync_runs TO app_admin;
--> statement-breakpoint
GRANT USAGE ON SEQUENCE affiliate_sync_runs_id_seq TO app_admin;
--> statement-breakpoint
CREATE POLICY affiliate_programs_admin ON affiliate_programs FOR ALL TO app_admin USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY affiliate_transactions_admin ON affiliate_transactions FOR ALL TO app_admin USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY affiliate_sync_runs_admin ON affiliate_sync_runs FOR ALL TO app_admin USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE TRIGGER affiliate_programs_updated_at BEFORE UPDATE ON affiliate_programs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

-- Postbacks arrive on public routes (secret-checked in the app). They write only through
-- this function, which upserts one transaction per (program, external id) and logs the run.
CREATE OR REPLACE FUNCTION record_affiliate_postback(
  p_program_id text,
  p_network text,
  p_campaign_id text,
  p_external_id text,
  p_click_id text,
  p_status affiliate_tx_status,
  p_commission numeric,
  p_sale numeric,
  p_currency text,
  p_event_at timestamptz,
  p_raw jsonb
) RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_network text;
  v_inserted boolean;
BEGIN
  -- Program comes from the callback URL (program=) or, for account-wide notifications
  -- such as Impact's, from the network campaign id stored on the program.
  IF p_program_id IS NOT NULL THEN
    SELECT id, network INTO p_program_id, v_network FROM affiliate_programs
    WHERE id = p_program_id AND status <> 'not_in_scope';
  ELSIF p_campaign_id IS NOT NULL THEN
    SELECT id, network INTO p_program_id, v_network FROM affiliate_programs
    WHERE network = p_network AND network_campaign_id = p_campaign_id AND status <> 'not_in_scope'
    LIMIT 1;
  END IF;
  IF v_network IS NULL THEN
    INSERT INTO affiliate_sync_runs (source, status, finished_at, message)
    VALUES ('postback', 'error', now(), 'unknown program');
    RETURN 'unknown_program';
  END IF;
  IF p_external_id IS NULL OR length(p_external_id) > 200 OR p_currency !~ '^[A-Z]{3}$' THEN
    RETURN 'invalid';
  END IF;

  INSERT INTO affiliate_transactions AS t
    (program_id, network, external_id, type, status, event_at, posted_at, commission_amount,
     sale_amount, currency, click_id, sub_id, raw, source, synced_at)
  VALUES
    (p_program_id, v_network, p_external_id, 'conversion', p_status, coalesce(p_event_at, now()), now(),
     coalesce(p_commission, 0), p_sale, p_currency, left(p_click_id, 100), left(p_click_id, 100),
     p_raw, 'postback', now())
  ON CONFLICT (program_id, source, external_id) WHERE external_id IS NOT NULL
  DO UPDATE SET status = excluded.status,
                commission_amount = excluded.commission_amount,
                sale_amount = coalesce(excluded.sale_amount, t.sale_amount),
                raw = excluded.raw,
                synced_at = now()
  RETURNING (xmax = 0) INTO v_inserted;

  INSERT INTO affiliate_sync_runs (source, status, finished_at, rows_upserted)
  VALUES ('postback:' || v_network, 'ok', now(), 1);
  RETURN CASE WHEN v_inserted THEN 'inserted' ELSE 'updated' END;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION record_affiliate_postback(text, text, text, text, text, affiliate_tx_status, numeric, numeric, text, timestamptz, jsonb) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION record_affiliate_postback(text, text, text, text, text, affiliate_tx_status, numeric, numeric, text, timestamptz, jsonb) TO app_runtime;
--> statement-breakpoint

-- Redirect now also returns the click id and the link's documented SubID parameter
-- (null for direct programs, whose links are never modified).
DROP FUNCTION IF EXISTS resolve_outbound_link(uuid, uuid, text, text, text, boolean);
--> statement-breakpoint
CREATE FUNCTION resolve_outbound_link(
  p_link_id uuid,
  p_opportunity_id uuid DEFAULT NULL,
  p_source_path text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_device_type text DEFAULT NULL,
  p_is_bot boolean DEFAULT false
) RETURNS TABLE (url text, click_id uuid, subid_param text)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_url text;
  v_param text;
  v_provider uuid;
  v_click uuid;
  v_show_demo boolean := app_show_demo();
BEGIN
  SELECT l.destination_url, l.subid_param, l.provider_id
    INTO v_url, v_param, v_provider
  FROM affiliate_links l
  JOIN providers p ON p.id = l.provider_id
  WHERE l.id = p_link_id
    AND l.is_active
    AND p.status = 'published'
    AND (NOT l.is_demo OR v_show_demo)
    AND (NOT p.is_demo OR v_show_demo);

  IF v_url IS NULL THEN
    RETURN;
  END IF;

  IF p_opportunity_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM opportunities o
    WHERE o.id = p_opportunity_id
      AND o.affiliate_link_id = p_link_id
      AND o.status = 'published'
      AND (NOT o.is_demo OR v_show_demo)
  ) THEN
    RETURN;
  END IF;

  INSERT INTO outbound_clicks (affiliate_link_id, provider_id, opportunity_id, source_path, country, device_type, is_bot)
  VALUES (
    p_link_id,
    v_provider,
    p_opportunity_id,
    CASE WHEN p_source_path ~ '^/[A-Za-z0-9/_\-]{0,255}$' THEN p_source_path END,
    CASE WHEN p_country ~ '^[A-Z]{2}$' THEN p_country END,
    CASE WHEN p_device_type IN ('mobile', 'tablet', 'desktop', 'other') THEN p_device_type END,
    coalesce(p_is_bot, false)
  )
  RETURNING outbound_clicks.click_id INTO v_click;

  RETURN QUERY SELECT v_url, v_click, v_param;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION resolve_outbound_link(uuid, uuid, text, text, text, boolean) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION resolve_outbound_link(uuid, uuid, text, text, text, boolean) TO app_runtime;
