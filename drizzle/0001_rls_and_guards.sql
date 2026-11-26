-- 8Tasks: roles, grants, row-level security, guards and the outbound redirect function.
-- Hand-written (drizzle-kit --custom). Runs as the schema owner. See docs/SECURITY.md.
--
-- Group roles (NOLOGIN). Login roles are created per environment and granted membership:
--   app_runtime : public site + Better Auth. Reads published content only.
--   app_admin   : admin server actions, used only after a server-side admin + MFA check.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_admin') THEN
    CREATE ROLE app_admin NOLOGIN;
  END IF;
END
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO app_runtime, app_admin;
--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
-- Demo rows are visible only when the server sets app.show_demo = 'on' for the
-- transaction (never in production; see src/lib/demo.ts). Production databases
-- should also never be seeded with demo rows (scripts/seed.ts refuses).
CREATE OR REPLACE FUNCTION app_show_demo() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('app.show_demo', true), '') = 'on'
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER subcategories_updated_at BEFORE UPDATE ON subcategories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER providers_updated_at BEFORE UPDATE ON providers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER affiliate_links_updated_at BEFORE UPDATE ON affiliate_links FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER opportunities_updated_at BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Enable RLS on every table (CLAUDE.md rule 4)
-- ---------------------------------------------------------------------------
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE session ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE account ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE verification ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE two_factor ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE affiliate_links ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE outbound_clicks ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Better Auth tables: managed by the auth library through app_runtime.
-- Authorization for these rows is enforced by Better Auth itself.
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON "user", session, account, verification, two_factor TO app_runtime;
--> statement-breakpoint
CREATE POLICY auth_user_runtime ON "user" FOR ALL TO app_runtime USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY auth_session_runtime ON session FOR ALL TO app_runtime USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY auth_account_runtime ON account FOR ALL TO app_runtime USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY auth_verification_runtime ON verification FOR ALL TO app_runtime USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY auth_two_factor_runtime ON two_factor FOR ALL TO app_runtime USING (true) WITH CHECK (true);
--> statement-breakpoint
-- Admins may list users (e.g. for audit display) but not change auth rows directly.
GRANT SELECT (id, name, email, role, created_at) ON "user" TO app_admin;
--> statement-breakpoint
CREATE POLICY auth_user_admin_read ON "user" FOR SELECT TO app_admin USING (true);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Public content: app_runtime reads only active/published, non-demo rows.
-- Admin-only columns (admin_notes) are excluded by column-level grants.
-- ---------------------------------------------------------------------------
GRANT SELECT ON categories, subcategories TO app_runtime;
--> statement-breakpoint
GRANT SELECT (id, slug, name, website_url, summary, description, logo_url, countries, status,
              supports_sub_ids, supports_postbacks, provides_feed, allows_revenue_share,
              affiliate_network, is_demo, created_at, updated_at)
  ON providers TO app_runtime;
--> statement-breakpoint
GRANT SELECT ON opportunities TO app_runtime;
--> statement-breakpoint
CREATE POLICY categories_public_read ON categories FOR SELECT TO app_runtime
  USING (is_active);
--> statement-breakpoint
CREATE POLICY subcategories_public_read ON subcategories FOR SELECT TO app_runtime
  USING (is_active AND EXISTS (SELECT 1 FROM categories c WHERE c.id = category_id));
--> statement-breakpoint
CREATE POLICY providers_public_read ON providers FOR SELECT TO app_runtime
  USING (status = 'published' AND (NOT is_demo OR app_show_demo()));
--> statement-breakpoint
CREATE POLICY opportunities_public_read ON opportunities FOR SELECT TO app_runtime
  USING (
    status = 'published'
    AND (NOT is_demo OR app_show_demo())
    AND EXISTS (SELECT 1 FROM providers p WHERE p.id = provider_id)
    AND EXISTS (SELECT 1 FROM categories c WHERE c.id = category_id)
  );
--> statement-breakpoint
-- affiliate_links, outbound_clicks, admin_audit_log: no grants to app_runtime at all.

-- ---------------------------------------------------------------------------
-- Admin role
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON categories, subcategories, providers, affiliate_links, opportunities TO app_admin;
--> statement-breakpoint
GRANT SELECT ON outbound_clicks TO app_admin;
--> statement-breakpoint
GRANT SELECT, INSERT ON admin_audit_log TO app_admin;
--> statement-breakpoint
GRANT USAGE ON SEQUENCE admin_audit_log_id_seq TO app_admin;
--> statement-breakpoint
CREATE POLICY categories_admin ON categories FOR ALL TO app_admin USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY subcategories_admin ON subcategories FOR ALL TO app_admin USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY providers_admin ON providers FOR ALL TO app_admin USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY affiliate_links_admin ON affiliate_links FOR ALL TO app_admin USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY opportunities_admin ON opportunities FOR ALL TO app_admin USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY outbound_clicks_admin_read ON outbound_clicks FOR SELECT TO app_admin USING (true);
--> statement-breakpoint
CREATE POLICY admin_audit_log_admin_read ON admin_audit_log FOR SELECT TO app_admin USING (true);
--> statement-breakpoint
CREATE POLICY admin_audit_log_admin_insert ON admin_audit_log FOR INSERT TO app_admin WITH CHECK (true);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Append-only audit log (also guards against the owner editing history by mistake)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION forbid_mutation() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % is not allowed', TG_TABLE_NAME, TG_OP;
END
$$;
--> statement-breakpoint
CREATE TRIGGER admin_audit_log_append_only
  BEFORE UPDATE OR DELETE ON admin_audit_log
  FOR EACH ROW EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint
CREATE TRIGGER admin_audit_log_no_truncate
  BEFORE TRUNCATE ON admin_audit_log
  FOR EACH STATEMENT EXECUTE FUNCTION forbid_mutation();
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Outbound redirect (CLAUDE.md rule 2)
-- Returns the admin-stored destination for an active link of a published provider
-- (and, if given, a published opportunity that uses that link), and logs the click.
-- Returns NULL when the link may not be used. Never accepts a URL as input.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION resolve_outbound_link(
  p_link_id uuid,
  p_opportunity_id uuid DEFAULT NULL,
  p_source_path text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_device_type text DEFAULT NULL,
  p_is_bot boolean DEFAULT false
) RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_url text;
  v_provider uuid;
  v_show_demo boolean := app_show_demo();
BEGIN
  SELECT l.destination_url, l.provider_id
    INTO v_url, v_provider
  FROM affiliate_links l
  JOIN providers p ON p.id = l.provider_id
  WHERE l.id = p_link_id
    AND l.is_active
    AND p.status = 'published'
    AND (NOT l.is_demo OR v_show_demo)
    AND (NOT p.is_demo OR v_show_demo);

  IF v_url IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_opportunity_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM opportunities o
    WHERE o.id = p_opportunity_id
      AND o.affiliate_link_id = p_link_id
      AND o.status = 'published'
      AND (NOT o.is_demo OR v_show_demo)
  ) THEN
    RETURN NULL;
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
  );

  RETURN v_url;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION resolve_outbound_link(uuid, uuid, text, text, text, boolean) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION resolve_outbound_link(uuid, uuid, text, text, text, boolean) TO app_runtime;
