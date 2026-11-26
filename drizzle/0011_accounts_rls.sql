-- Optional free accounts: per-user RLS keyed on app.user_id (set per transaction by the server
-- after it has verified the session). Admins get no access to personal tracking tables.

CREATE OR REPLACE FUNCTION app_user_id() RETURNS text
LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('app.user_id', true), '') $$;
--> statement-breakpoint
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE user_saved_items ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE user_saved_searches ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE user_missions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE user_earnings ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON user_profiles, user_saved_items, user_saved_searches, user_missions, user_earnings FROM PUBLIC;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON user_profiles, user_saved_items, user_saved_searches, user_missions, user_earnings TO app_runtime;
--> statement-breakpoint
CREATE POLICY user_profiles_owner ON user_profiles FOR ALL TO app_runtime
  USING (user_id = app_user_id()) WITH CHECK (user_id = app_user_id());
--> statement-breakpoint
CREATE POLICY user_saved_items_owner ON user_saved_items FOR ALL TO app_runtime
  USING (user_id = app_user_id()) WITH CHECK (user_id = app_user_id());
--> statement-breakpoint
CREATE POLICY user_saved_searches_owner ON user_saved_searches FOR ALL TO app_runtime
  USING (user_id = app_user_id()) WITH CHECK (user_id = app_user_id());
--> statement-breakpoint
CREATE POLICY user_missions_owner ON user_missions FOR ALL TO app_runtime
  USING (user_id = app_user_id()) WITH CHECK (user_id = app_user_id());
--> statement-breakpoint
CREATE POLICY user_earnings_owner ON user_earnings FOR ALL TO app_runtime
  USING (user_id = app_user_id()) WITH CHECK (user_id = app_user_id());
--> statement-breakpoint
CREATE TRIGGER user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER user_missions_updated_at BEFORE UPDATE ON user_missions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

-- The signed-in user's own email subscription (by user id or by their verified address).
CREATE OR REPLACE FUNCTION email_account_get() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object('status', s.status, 'frequency', s.frequency, 'token', s.token,
    'consentedAt', s.consented_at, 'consentSource', s.consent_source)
  FROM email_subscribers s JOIN "user" u ON u.id = app_user_id()
  WHERE s.user_id = u.id OR s.email = lower(u.email)
  ORDER BY (s.user_id = u.id) DESC LIMIT 1
$$;
--> statement-breakpoint
-- Opt in from the account: the address is the account's verified email (proven by sign-in),
-- so no second confirmation email is needed. Consent is recorded. Suppressed/complained/bounced
-- addresses are never re-enabled.
CREATE OR REPLACE FUNCTION email_account_subscribe(p_prefs jsonb, p_consent_text text, p_consent_version text)
RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_uid text := app_user_id();
  v_email text;
  v email_subscribers;
BEGIN
  SELECT lower(email) INTO v_email FROM "user" WHERE id = v_uid AND email_verified;
  IF v_email IS NULL OR EXISTS (SELECT 1 FROM email_suppressions WHERE email = v_email) THEN RETURN false; END IF;
  SELECT * INTO v FROM email_subscribers WHERE email = v_email FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO email_subscribers (email, user_id, status, consent_text, consent_version, consent_source, confirmed_at, confirm_token)
    VALUES (v_email, v_uid, 'active', p_consent_text, p_consent_version, 'account', now(), NULL)
    RETURNING * INTO v;
  ELSIF v.status IN ('bounced', 'complained') THEN
    RETURN false;
  END IF;
  v := email_apply_prefs(v, p_prefs);
  UPDATE email_subscribers SET
    user_id = v_uid, status = 'active', frequency = v.frequency, country = v.country, region = v.region,
    city = v.city, categories = v.categories, creative_interests = v.creative_interests, work_mode = v.work_mode,
    beginner_only = v.beginner_only, equipment = v.equipment, compensation_types = v.compensation_types,
    time_zone = v.time_zone, consent_text = p_consent_text, consent_version = p_consent_version,
    consent_source = 'account', consented_at = now(), confirmed_at = coalesce(confirmed_at, now()),
    confirm_token = NULL, unsubscribed_at = NULL
  WHERE id = v.id;
  RETURN true;
END
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION email_account_unsubscribe() RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE email_subscribers s SET status = 'unsubscribed', unsubscribed_at = now()
  FROM "user" u WHERE u.id = app_user_id() AND (s.user_id = u.id OR s.email = lower(u.email))
    AND s.status IN ('active', 'pending');
  RETURN FOUND;
END
$$;
--> statement-breakpoint
-- Deletes the signed-in user's account and personal data. Suppression entries are kept (legal
-- requirement not to email bounced/complained addresses). Admin accounts cannot self-delete.
CREATE OR REPLACE FUNCTION delete_my_account() RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid text := app_user_id(); v_email text;
BEGIN
  SELECT lower(email) INTO v_email FROM "user" WHERE id = v_uid AND coalesce(role, 'user') <> 'admin';
  IF v_email IS NULL THEN RETURN false; END IF;
  DELETE FROM email_subscribers WHERE user_id = v_uid OR email = v_email;
  DELETE FROM "user" WHERE id = v_uid; -- cascades to sessions, accounts, profile, saves, missions, earnings
  RETURN true;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION email_account_get(), email_account_subscribe(jsonb, text, text), email_account_unsubscribe(), delete_my_account() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION email_account_get(), email_account_subscribe(jsonb, text, text), email_account_unsubscribe(), delete_my_account() TO app_runtime;
