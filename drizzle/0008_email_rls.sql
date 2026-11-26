-- Email (My Daily 8): RLS, grants, subscriber functions, settings row. Hand-written.
-- Public visitors never read these tables; they act only through SECURITY DEFINER functions
-- keyed by secret tokens. The scheduled job and webhooks run as app_admin on the server.

ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE email_sends ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE email_suppressions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON email_subscribers, email_sends, email_events, email_suppressions, email_settings FROM PUBLIC;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON email_subscribers, email_sends, email_settings TO app_admin;
--> statement-breakpoint
GRANT SELECT, INSERT ON email_events TO app_admin;
--> statement-breakpoint
GRANT SELECT, INSERT, DELETE ON email_suppressions TO app_admin;
--> statement-breakpoint
GRANT USAGE ON SEQUENCE email_events_id_seq TO app_admin;
--> statement-breakpoint
CREATE POLICY email_subscribers_admin ON email_subscribers FOR ALL TO app_admin USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY email_sends_admin ON email_sends FOR ALL TO app_admin USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY email_events_admin ON email_events FOR ALL TO app_admin USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY email_suppressions_admin ON email_suppressions FOR ALL TO app_admin USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY email_settings_admin ON email_settings FOR ALL TO app_admin USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE TRIGGER email_subscribers_updated_at BEFORE UPDATE ON email_subscribers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER email_settings_updated_at BEFORE UPDATE ON email_settings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
INSERT INTO email_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
--> statement-breakpoint
-- Email permission is shown to the public loader (needed to pick Daily 8 items); not sensitive.
GRANT SELECT (allows_email_traffic) ON providers TO app_runtime;
--> statement-breakpoint

-- Applies a validated preferences object (the app validates with Zod first).
CREATE OR REPLACE FUNCTION email_apply_prefs(s email_subscribers, p jsonb) RETURNS email_subscribers
LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  IF p ? 'frequency' THEN s.frequency := (p->>'frequency')::email_frequency; END IF;
  IF p ? 'country' THEN s.country := nullif(p->>'country', ''); END IF;
  IF p ? 'region' THEN s.region := nullif(left(p->>'region', 10), ''); END IF;
  IF p ? 'city' THEN s.city := nullif(left(p->>'city', 80), ''); END IF;
  IF p ? 'categories' THEN s.categories := ARRAY(SELECT left(x, 60) FROM jsonb_array_elements_text(p->'categories') x LIMIT 12); END IF;
  IF p ? 'creativeInterests' THEN s.creative_interests := ARRAY(SELECT left(x, 60) FROM jsonb_array_elements_text(p->'creativeInterests') x LIMIT 12); END IF;
  IF p ? 'workMode' THEN s.work_mode := (p->>'workMode')::work_mode; END IF;
  IF p ? 'beginnerOnly' THEN s.beginner_only := (p->>'beginnerOnly')::boolean; END IF;
  IF p ? 'equipment' THEN s.equipment := ARRAY(SELECT left(x, 30) FROM jsonb_array_elements_text(p->'equipment') x LIMIT 5); END IF;
  IF p ? 'compensationTypes' THEN s.compensation_types := ARRAY(SELECT left(x, 40) FROM jsonb_array_elements_text(p->'compensationTypes') x LIMIT 15); END IF;
  IF p ? 'searchQuery' THEN s.search_query := nullif(left(p->>'searchQuery', 200), ''); END IF;
  IF p ? 'timeZone' THEN s.time_zone := left(p->>'timeZone', 60); END IF;
  RETURN s;
END
$$;
--> statement-breakpoint

-- Sign-up (double opt-in). Returns a confirm token only when a confirmation email should be
-- sent: new address, still pending, or previously unsubscribed (needs fresh consent).
-- Active, bounced, complained or suppressed addresses are never changed by a third party.
CREATE OR REPLACE FUNCTION email_subscribe(
  p_email text, p_prefs jsonb, p_consent_text text, p_consent_version text, p_consent_source text
) RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v email_subscribers;
  v_email text := lower(trim(p_email));
BEGIN
  IF v_email IS NULL OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR char_length(v_email) > 254 THEN
    RETURN NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM email_suppressions WHERE email = v_email) THEN RETURN NULL; END IF;
  SELECT * INTO v FROM email_subscribers WHERE email = v_email FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO email_subscribers (email, consent_text, consent_version, consent_source)
    VALUES (v_email, p_consent_text, p_consent_version, p_consent_source)
    RETURNING * INTO v;
  END IF;
  IF v.status NOT IN ('pending', 'unsubscribed') THEN RETURN NULL; END IF;
  v := email_apply_prefs(v, p_prefs);
  UPDATE email_subscribers SET
    status = 'pending', frequency = v.frequency, country = v.country, region = v.region, city = v.city,
    categories = v.categories, creative_interests = v.creative_interests, work_mode = v.work_mode,
    beginner_only = v.beginner_only, equipment = v.equipment, compensation_types = v.compensation_types,
    search_query = v.search_query, time_zone = v.time_zone,
    consent_text = p_consent_text, consent_version = p_consent_version, consent_source = p_consent_source,
    consented_at = now(), confirm_token = coalesce(v.confirm_token, gen_random_uuid()), unsubscribed_at = NULL
  WHERE id = v.id
  RETURNING confirm_token INTO v.confirm_token;
  RETURN v.confirm_token;
END
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION email_confirm(p_confirm_token uuid) RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_token uuid;
BEGIN
  UPDATE email_subscribers SET status = 'active', confirmed_at = now(), confirm_token = NULL
  WHERE confirm_token = p_confirm_token AND status = 'pending'
  RETURNING token INTO v_token;
  RETURN v_token;
END
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION email_get_prefs(p_token uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object(
    'email', email, 'status', status, 'frequency', frequency, 'country', country, 'region', region,
    'city', city, 'categories', categories, 'creativeInterests', creative_interests, 'workMode', work_mode,
    'beginnerOnly', beginner_only, 'equipment', equipment, 'compensationTypes', compensation_types,
    'searchQuery', search_query, 'timeZone', time_zone)
  FROM email_subscribers WHERE token = p_token
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION email_update_prefs(p_token uuid, p_prefs jsonb) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v email_subscribers;
BEGIN
  SELECT * INTO v FROM email_subscribers WHERE token = p_token AND status IN ('active', 'pending') FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  v := email_apply_prefs(v, p_prefs);
  UPDATE email_subscribers SET
    frequency = v.frequency, country = v.country, region = v.region, city = v.city,
    categories = v.categories, creative_interests = v.creative_interests, work_mode = v.work_mode,
    beginner_only = v.beginner_only, equipment = v.equipment, compensation_types = v.compensation_types,
    search_query = v.search_query, time_zone = v.time_zone
  WHERE id = v.id;
  RETURN true;
END
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION email_unsubscribe(p_token uuid) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE email_subscribers SET status = 'unsubscribed', unsubscribed_at = now()
  WHERE token = p_token AND status IN ('active', 'pending');
  RETURN FOUND;
END
$$;
--> statement-breakpoint
-- Click redirects from emails: logs a click only for an opportunity that was in that email.
CREATE OR REPLACE FUNCTION email_record_click(p_send_id uuid, p_opportunity_id uuid) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v email_sends;
BEGIN
  SELECT * INTO v FROM email_sends WHERE id = p_send_id;
  IF NOT FOUND OR NOT (p_opportunity_id::text = ANY (v.items)) THEN RETURN false; END IF;
  INSERT INTO email_events (type, send_id, opportunity_id) VALUES ('click', p_send_id, p_opportunity_id);
  RETURN true;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION email_apply_prefs(email_subscribers, jsonb), email_subscribe(text, jsonb, text, text, text),
  email_confirm(uuid), email_get_prefs(uuid), email_update_prefs(uuid, jsonb), email_unsubscribe(uuid),
  email_record_click(uuid, uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION email_subscribe(text, jsonb, text, text, text), email_confirm(uuid), email_get_prefs(uuid),
  email_update_prefs(uuid, jsonb), email_unsubscribe(uuid), email_record_click(uuid, uuid) TO app_runtime;
--> statement-breakpoint
-- Non-sensitive sender settings for public pages (footer identity, whether confirmations are on).
CREATE OR REPLACE FUNCTION email_public_settings() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object('senderName', sender_name, 'postalAddress', postal_address,
    'confirmEnabled', coalesce((campaigns->>'confirm')::boolean, true))
  FROM email_settings WHERE id = 1
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION email_public_settings() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION email_public_settings() TO app_runtime;
