-- Discovery config, admin-only provider facts, public intake: RLS, grants, functions, seeds.
-- Hand-written (drizzle-kit --custom). See docs/SECURITY.md and docs/DATABASE.md.

ALTER TABLE provider_internal ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE discovery_groups ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE opportunity_categories ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE opportunity_groups ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE listing_reports ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE provider_submissions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE alert_subscriptions ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON provider_internal, discovery_groups, opportunity_categories, opportunity_groups,
  listing_reports, provider_submissions, alert_subscriptions FROM PUBLIC;
--> statement-breakpoint

-- New public provider column (providers uses column-level grants for app_runtime).
-- opportunities already has a table-level SELECT grant, so its new public columns are covered.
GRANT SELECT (last_verified_at) ON providers TO app_runtime;
--> statement-breakpoint

-- Discovery config: public read of active groups; memberships follow opportunity visibility.
GRANT SELECT ON discovery_groups, opportunity_categories, opportunity_groups TO app_runtime;
--> statement-breakpoint
CREATE POLICY discovery_groups_public_read ON discovery_groups FOR SELECT TO app_runtime USING (is_active);
--> statement-breakpoint
CREATE POLICY opportunity_categories_public_read ON opportunity_categories FOR SELECT TO app_runtime
  USING (EXISTS (SELECT 1 FROM opportunities o WHERE o.id = opportunity_id));
--> statement-breakpoint
CREATE POLICY opportunity_groups_public_read ON opportunity_groups FOR SELECT TO app_runtime
  USING (EXISTS (SELECT 1 FROM opportunities o WHERE o.id = opportunity_id));
--> statement-breakpoint

-- Admin: full control of config + internal facts; review (not delete) intake rows.
GRANT SELECT, INSERT, UPDATE, DELETE ON provider_internal, discovery_groups, opportunity_categories, opportunity_groups TO app_admin;
--> statement-breakpoint
GRANT SELECT, UPDATE (status, admin_note) ON listing_reports, provider_submissions TO app_admin;
--> statement-breakpoint
GRANT SELECT, UPDATE (status) ON alert_subscriptions TO app_admin;
--> statement-breakpoint
CREATE POLICY provider_internal_admin ON provider_internal FOR ALL TO app_admin USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY discovery_groups_admin ON discovery_groups FOR ALL TO app_admin USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY opportunity_categories_admin ON opportunity_categories FOR ALL TO app_admin USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY opportunity_groups_admin ON opportunity_groups FOR ALL TO app_admin USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY listing_reports_admin ON listing_reports FOR ALL TO app_admin USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY provider_submissions_admin ON provider_submissions FOR ALL TO app_admin USING (true) WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY alert_subscriptions_admin ON alert_subscriptions FOR ALL TO app_admin USING (true) WITH CHECK (true);
--> statement-breakpoint

-- Public intake: app_runtime may INSERT new, unreviewed rows only (no SELECT/UPDATE/DELETE).
GRANT INSERT ON listing_reports, provider_submissions TO app_runtime;
--> statement-breakpoint
GRANT USAGE ON SEQUENCE listing_reports_id_seq, provider_submissions_id_seq TO app_runtime;
--> statement-breakpoint
CREATE POLICY listing_reports_runtime_insert ON listing_reports FOR INSERT TO app_runtime
  WITH CHECK (status = 'new' AND admin_note IS NULL);
--> statement-breakpoint
CREATE POLICY provider_submissions_runtime_insert ON provider_submissions FOR INSERT TO app_runtime
  WITH CHECK (status = 'new' AND admin_note IS NULL);
--> statement-breakpoint

CREATE TRIGGER provider_internal_updated_at BEFORE UPDATE ON provider_internal FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER discovery_groups_updated_at BEFORE UPDATE ON discovery_groups FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
CREATE TRIGGER alert_subscriptions_updated_at BEFORE UPDATE ON alert_subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint

-- Free alerts: the public role can only add a new subscriber or unsubscribe by token.
-- An existing address is never changed or re-subscribed by a third party (returns NULL).
CREATE OR REPLACE FUNCTION subscribe_alerts(
  p_email text,
  p_categories text[],
  p_query text,
  p_frequency alert_frequency,
  p_consent text
) RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_token uuid;
BEGIN
  IF p_email IS NULL OR p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR char_length(p_email) > 254 THEN
    RETURN NULL;
  END IF;
  INSERT INTO alert_subscriptions (email, category_slugs, search_query, frequency, consent_text)
  VALUES (lower(p_email), coalesce(p_categories, '{}'), nullif(left(p_query, 200), ''), p_frequency, p_consent)
  ON CONFLICT (email) DO NOTHING
  RETURNING unsubscribe_token INTO v_token;
  RETURN v_token;
END
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION unsubscribe_alerts(p_token uuid) RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE alert_subscriptions SET status = 'unsubscribed' WHERE unsubscribe_token = p_token;
  RETURN FOUND;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION subscribe_alerts(text, text[], text, alert_frequency, text), unsubscribe_alerts(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION subscribe_alerts(text, text[], text, alert_frequency, text), unsubscribe_alerts(uuid) TO app_runtime;
--> statement-breakpoint

-- Seeds: new subcategories (master prompt §3.3–3.4) and default discovery groups.
-- Idempotent; existing rows (and admin edits) are left alone.
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'online-surveys', 'Online surveys', 0 FROM categories WHERE slug = 'surveys' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'polls', 'Quick polls', 1 FROM categories WHERE slug = 'surveys' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'receipt-scanning', 'Receipt scanning', 2 FROM categories WHERE slug = 'surveys' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'usability-testing', 'Usability testing', 0 FROM categories WHERE slug = 'app-website-testing' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'bug-testing', 'Bug testing', 1 FROM categories WHERE slug = 'app-website-testing' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'prototype-testing', 'Prototype testing', 2 FROM categories WHERE slug = 'app-website-testing' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'video-feedback', 'Video feedback', 3 FROM categories WHERE slug = 'app-website-testing' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'storefronts-locations', 'Storefronts & locations', 0 FROM categories WHERE slug = 'photography' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'shelf-checks', 'Store shelf checks', 1 FROM categories WHERE slug = 'photography' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'product-photos', 'Product photos', 2 FROM categories WHERE slug = 'photography' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'stock-licensing', 'Stock photo licensing', 3 FROM categories WHERE slug = 'photography' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'property-inspections', 'Property inspection photos', 4 FROM categories WHERE slug = 'photography' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'local-verification', 'Local verification photos', 5 FROM categories WHERE slug = 'photography' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'visual-data-collection', 'Visual data collection', 6 FROM categories WHERE slug = 'photography' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'vehicle-photography', 'Vehicle photography', 7 FROM categories WHERE slug = 'photography' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'in-store', 'Retail shopping', 0 FROM categories WHERE slug = 'mystery-shopping' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'dining', 'Restaurants & dining', 1 FROM categories WHERE slug = 'mystery-shopping' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'coffee-shops', 'Coffee shops', 2 FROM categories WHERE slug = 'mystery-shopping' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'drive-through', 'Drive-through evaluations', 3 FROM categories WHERE slug = 'mystery-shopping' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'hotels-hospitality', 'Hotels & hospitality', 4 FROM categories WHERE slug = 'mystery-shopping' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'automotive', 'Automotive dealerships', 5 FROM categories WHERE slug = 'mystery-shopping' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'phone-online', 'Telephone evaluations', 6 FROM categories WHERE slug = 'mystery-shopping' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'online-shopping', 'Online mystery shopping', 7 FROM categories WHERE slug = 'mystery-shopping' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'ecommerce', 'E-commerce evaluations', 8 FROM categories WHERE slug = 'mystery-shopping' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'retail-audits', 'Retail audits', 9 FROM categories WHERE slug = 'mystery-shopping' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'entertainment-venues', 'Entertainment venues', 10 FROM categories WHERE slug = 'mystery-shopping' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'customer-service', 'Customer service evaluations', 11 FROM categories WHERE slug = 'mystery-shopping' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'display-photography', 'Product display photography', 12 FROM categories WHERE slug = 'mystery-shopping' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'inventory-verification', 'Inventory verification', 13 FROM categories WHERE slug = 'mystery-shopping' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'pricing-verification', 'Pricing verification', 14 FROM categories WHERE slug = 'mystery-shopping' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'video-reviewing', 'Video reviewing', 0 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'ad-evaluation', 'Commercial & advertisement evaluation', 1 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'trailer-feedback', 'Movie trailer feedback', 2 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'article-evaluation', 'Article reviewing', 3 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'book-reviewing', 'Book reviewing', 4 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'music-reviewing', 'Music reviewing', 5 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'digital-content-evaluation', 'Digital content evaluation', 6 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'product-concept-feedback', 'Product concept feedback', 7 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'design-feedback', 'Creative design evaluation', 8 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'consumer-feedback', 'Private consumer feedback', 9 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'blogging', 'Blogging', 10 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'vlogging', 'Vlogging', 11 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'sponsored-articles', 'Sponsored articles', 12 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'content-writing', 'Content writing', 13 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'sponsored-videos', 'Sponsored videos', 14 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'user-generated-content', 'User-generated content', 15 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'product-demonstrations', 'Product demonstrations', 16 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'product-unboxing', 'Product unboxing', 17 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'affiliate-marketing', 'Affiliate marketing', 18 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'influencer-collaborations', 'Influencer collaborations', 19 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'brand-ambassador', 'Brand ambassador opportunities', 20 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'sponsored-newsletters', 'Sponsored newsletters', 21 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'direct-brand-collaborations', 'Direct brand collaborations', 22 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'brand-product-testing', 'Brand product testing', 23 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'product-descriptions-copywriting', 'Product descriptions & copywriting', 24 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'video-testimonials', 'Video testimonials', 25 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'voiceover-narration', 'Voiceover & narration', 26 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'software-reviews', 'Software reviews', 27 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'written-reviews', 'Written reviews', 28 FROM categories WHERE slug = 'content-media' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'game-testing', 'Game testing', 0 FROM categories WHERE slug = 'gaming-entertainment' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'entertainment-feedback', 'Entertainment feedback', 1 FROM categories WHERE slug = 'gaming-entertainment' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'game-studio-playtesting', 'Game studio playtesting', 2 FROM categories WHERE slug = 'gaming-entertainment' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'beta-testing', 'Beta testing', 3 FROM categories WHERE slug = 'gaming-entertainment' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'game-feedback', 'Game feedback', 4 FROM categories WHERE slug = 'gaming-entertainment' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'focus-groups', 'Focus groups', 0 FROM categories WHERE slug = 'paid-research' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'interviews', '1:1 interviews', 1 FROM categories WHERE slug = 'paid-research' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'academic-studies', 'Academic studies', 2 FROM categories WHERE slug = 'paid-research' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'home-testing', 'At-home product testing', 3 FROM categories WHERE slug = 'paid-research' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'taste-tests', 'Taste tests', 4 FROM categories WHERE slug = 'paid-research' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'share-your-expertise', 'Share your expertise', 5 FROM categories WHERE slug = 'paid-research' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'expert-consultations', 'Expert consultations', 6 FROM categories WHERE slug = 'paid-research' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'professional-research', 'Professional research', 7 FROM categories WHERE slug = 'paid-research' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'ai-evaluation', 'AI response evaluation', 0 FROM categories WHERE slug = 'microtasks-ai' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'fact-checking', 'Factual accuracy checking', 1 FROM categories WHERE slug = 'microtasks-ai' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'data-labelling', 'Data labelling', 2 FROM categories WHERE slug = 'microtasks-ai' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'categorisation', 'Data categorization', 3 FROM categories WHERE slug = 'microtasks-ai' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'search-evaluation', 'Search result evaluation', 4 FROM categories WHERE slug = 'microtasks-ai' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'ai-training', 'AI training tasks', 5 FROM categories WHERE slug = 'microtasks-ai' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'content-moderation', 'Content review', 6 FROM categories WHERE slug = 'microtasks-ai' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'transcription', 'Transcription', 7 FROM categories WHERE slug = 'microtasks-ai' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'translation', 'Translation', 8 FROM categories WHERE slug = 'microtasks-ai' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'captioning', 'Captioning', 9 FROM categories WHERE slug = 'microtasks-ai' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'photo-video-collection', 'Photo & video collection', 10 FROM categories WHERE slug = 'microtasks-ai' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO subcategories (category_id, slug, name, sort_order) SELECT id, 'audio-recording', 'Audio recording', 11 FROM categories WHERE slug = 'microtasks-ai' ON CONFLICT (category_id, slug) DO NOTHING;
--> statement-breakpoint
INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES ('pathway', 'quick-earnings', NULL, 'Quick Earnings', 'Small, simple tasks.', 'zap', '#FBBF24', ARRAY['Surveys','Short video reviews','Quick app tests','Music reviews','Content evaluation','Simple microtasks','Short consumer feedback']::text[], ARRAY['video-reviewing','music-reviewing','digital-content-evaluation','consumer-feedback','ad-evaluation','trailer-feedback','ai-evaluation','categorisation','data-labelling','search-evaluation','fact-checking']::text[], ARRAY['surveys']::text[], 1) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;
--> statement-breakpoint
INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES ('pathway', 'local-missions', NULL, 'Local Missions', 'Explore your community.', 'map-pin', '#7DB8FF', ARRAY['Mystery shopping','Retail audits','Photography assignments','Restaurant evaluations','Product display checks','Automotive evaluations','In-person research']::text[], ARRAY['in-store','dining','coffee-shops','drive-through','hotels-hospitality','automotive','retail-audits','entertainment-venues','display-photography','inventory-verification','pricing-verification','storefronts-locations','shelf-checks','focus-groups']::text[], ARRAY[]::text[], 2) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;
--> statement-breakpoint
INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES ('pathway', 'create-earn', NULL, 'Create & Earn', 'Blog, vlog and create.', 'clapperboard', '#B5A0F5', ARRAY['Sponsored blog posts','Freelance content writing','YouTube videos','Product demonstrations','User-generated content','Product photography','Sponsored newsletters','Brand collaborations']::text[], ARRAY['blogging','vlogging','sponsored-articles','content-writing','sponsored-videos','user-generated-content','product-demonstrations','product-unboxing','influencer-collaborations','sponsored-newsletters','product-photos']::text[], ARRAY[]::text[], 3) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;
--> statement-breakpoint
INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES ('pathway', 'recurring-income', NULL, 'Recurring Income', 'Affiliate opportunities.', 'repeat', '#53E6A0', ARRAY['Affiliate blogging and vlogging','Publisher networks','Performance-based promotion','Brand ambassador programs','Recurring affiliate commissions']::text[], ARRAY['affiliate-marketing','brand-ambassador']::text[], ARRAY[]::text[], 4) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;
--> statement-breakpoint
INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES ('category_tab', 'review', (SELECT id FROM categories WHERE slug = 'content-media'), 'Review & Earn', NULL, NULL, NULL, ARRAY[]::text[], ARRAY['video-reviewing','ad-evaluation','trailer-feedback','article-evaluation','book-reviewing','music-reviewing','digital-content-evaluation','product-concept-feedback','design-feedback','consumer-feedback','written-reviews','software-reviews','video-testimonials']::text[], ARRAY[]::text[], 1) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;
--> statement-breakpoint
INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES ('category_tab', 'blogging', (SELECT id FROM categories WHERE slug = 'content-media'), 'Blogging', NULL, NULL, NULL, ARRAY[]::text[], ARRAY['blogging','sponsored-articles','content-writing','sponsored-newsletters','product-descriptions-copywriting']::text[], ARRAY[]::text[], 2) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;
--> statement-breakpoint
INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES ('category_tab', 'vlogging', (SELECT id FROM categories WHERE slug = 'content-media'), 'Vlogging', NULL, NULL, NULL, ARRAY[]::text[], ARRAY['vlogging','sponsored-videos','voiceover-narration']::text[], ARRAY[]::text[], 3) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;
--> statement-breakpoint
INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES ('category_tab', 'ugc', (SELECT id FROM categories WHERE slug = 'content-media'), 'UGC', NULL, NULL, NULL, ARRAY[]::text[], ARRAY['user-generated-content','product-demonstrations','product-unboxing']::text[], ARRAY[]::text[], 4) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;
--> statement-breakpoint
INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES ('category_tab', 'affiliate', (SELECT id FROM categories WHERE slug = 'content-media'), 'Affiliate', NULL, NULL, NULL, ARRAY[]::text[], ARRAY['affiliate-marketing','influencer-collaborations','brand-ambassador']::text[], ARRAY[]::text[], 5) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;
--> statement-breakpoint
INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES ('category_tab', 'brand-ambassador', (SELECT id FROM categories WHERE slug = 'content-media'), 'Brand Ambassador Opportunities', NULL, NULL, NULL, ARRAY[]::text[], ARRAY['brand-ambassador']::text[], ARRAY[]::text[], 6) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;
--> statement-breakpoint
INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES ('category_tab', 'direct-brand-collaborations', (SELECT id FROM categories WHERE slug = 'content-media'), 'Direct Brand Collaborations', NULL, NULL, NULL, ARRAY[]::text[], ARRAY['direct-brand-collaborations']::text[], ARRAY[]::text[], 7) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;
--> statement-breakpoint
INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES ('category_tab', 'product-testing', (SELECT id FROM categories WHERE slug = 'content-media'), 'Product Testing', NULL, NULL, NULL, ARRAY[]::text[], ARRAY['brand-product-testing']::text[], ARRAY[]::text[], 8) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;
--> statement-breakpoint
INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES ('category_tab', 'sponsored-content', (SELECT id FROM categories WHERE slug = 'content-media'), 'Sponsored Content', NULL, NULL, NULL, ARRAY[]::text[], ARRAY['sponsored-articles','sponsored-videos','sponsored-newsletters']::text[], ARRAY[]::text[], 9) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;
--> statement-breakpoint
INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES ('category_tab', 'retail', (SELECT id FROM categories WHERE slug = 'mystery-shopping'), 'Retail', NULL, NULL, NULL, ARRAY[]::text[], ARRAY['in-store']::text[], ARRAY[]::text[], 1) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;
--> statement-breakpoint
INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES ('category_tab', 'dining', (SELECT id FROM categories WHERE slug = 'mystery-shopping'), 'Dining', NULL, NULL, NULL, ARRAY[]::text[], ARRAY['dining','coffee-shops','drive-through']::text[], ARRAY[]::text[], 2) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;
--> statement-breakpoint
INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES ('category_tab', 'hospitality', (SELECT id FROM categories WHERE slug = 'mystery-shopping'), 'Hospitality', NULL, NULL, NULL, ARRAY[]::text[], ARRAY['hotels-hospitality','entertainment-venues']::text[], ARRAY[]::text[], 3) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;
--> statement-breakpoint
INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES ('category_tab', 'automotive', (SELECT id FROM categories WHERE slug = 'mystery-shopping'), 'Automotive', NULL, NULL, NULL, ARRAY[]::text[], ARRAY['automotive']::text[], ARRAY[]::text[], 4) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;
--> statement-breakpoint
INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES ('category_tab', 'telephone', (SELECT id FROM categories WHERE slug = 'mystery-shopping'), 'Telephone', NULL, NULL, NULL, ARRAY[]::text[], ARRAY['phone-online','customer-service']::text[], ARRAY[]::text[], 5) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;
--> statement-breakpoint
INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES ('category_tab', 'online', (SELECT id FROM categories WHERE slug = 'mystery-shopping'), 'Online', NULL, NULL, NULL, ARRAY[]::text[], ARRAY['online-shopping','ecommerce']::text[], ARRAY[]::text[], 6) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;
--> statement-breakpoint
INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES ('category_tab', 'audits', (SELECT id FROM categories WHERE slug = 'mystery-shopping'), 'Audits', NULL, NULL, NULL, ARRAY[]::text[], ARRAY['retail-audits','display-photography','inventory-verification','pricing-verification']::text[], ARRAY[]::text[], 7) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;
--> statement-breakpoint
INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES ('subsection', 'capture-earn', NULL, 'Capture & Earn', 'Photograph products, storefronts, places and everyday scenes for companies.', 'camera', '#F6BE78', ARRAY['Smartphone photo assignments','Storefront and shelf photos','Product photography','Stock photo licensing','Property and vehicle photos','Visual data collection']::text[], ARRAY['display-photography','photo-video-collection','product-photos']::text[], ARRAY['photography']::text[], 1) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;
--> statement-breakpoint
INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES ('subsection', 'write-earn', NULL, 'Write & Earn', 'Blog posts, articles, product descriptions and written reviews.', 'pen-line', '#7DB8FF', ARRAY['Blogging','Article writing','Website content','Product descriptions and copywriting','Sponsored editorial content','Written reviews']::text[], ARRAY['blogging','sponsored-articles','content-writing','sponsored-newsletters','product-descriptions-copywriting','written-reviews']::text[], ARRAY[]::text[], 2) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;
--> statement-breakpoint
INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES ('subsection', 'film-earn', NULL, 'Film & Earn', 'UGC videos, product demos, unboxings and video feedback.', 'video', '#B5A0F5', ARRAY['UGC video creation','Product demonstrations','Unboxing videos','Sponsored video content','Video feedback on apps and sites','Genuine video testimonials']::text[], ARRAY['vlogging','sponsored-videos','user-generated-content','product-demonstrations','product-unboxing','video-testimonials','video-feedback','voiceover-narration']::text[], ARRAY[]::text[], 3) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;
--> statement-breakpoint
INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES ('subsection', 'review-earn', NULL, 'Review & Earn', 'Honest feedback on products, media, software and services.', 'star', '#68D8DB', ARRAY['Honest product reviews','Software reviews','Private consumer feedback','Book and music reviews','Ad and trailer evaluations']::text[], ARRAY['video-reviewing','ad-evaluation','trailer-feedback','article-evaluation','book-reviewing','music-reviewing','digital-content-evaluation','product-concept-feedback','design-feedback','consumer-feedback','written-reviews','software-reviews','video-testimonials']::text[], ARRAY[]::text[], 4) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;
--> statement-breakpoint
INSERT INTO discovery_groups (kind, slug, category_id, title, description, icon, accent, includes, subcategory_slugs, category_slugs, sort_order) VALUES ('subsection', 'promote-earn', NULL, 'Promote & Earn', 'Affiliate programs, brand ambassador roles and brand collaborations.', 'megaphone', '#53E6A0', ARRAY['Affiliate marketing','Brand ambassador opportunities','Direct brand collaborations','Influencer collaborations']::text[], ARRAY['affiliate-marketing','brand-ambassador','influencer-collaborations','direct-brand-collaborations']::text[], ARRAY[]::text[], 5) ON CONFLICT ON CONSTRAINT discovery_groups_kind_slug_key DO NOTHING;
