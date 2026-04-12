CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY,
  role VARCHAR(20) NOT NULL DEFAULT 'user',
  display_name VARCHAR(60),
  avatar_url TEXT,
  contact_phone VARCHAR(30),
  contact_email VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, contact_email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();

CREATE TABLE IF NOT EXISTS public.merchants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL,
  name VARCHAR(80) NOT NULL,
  category VARCHAR(40) NOT NULL,
  city VARCHAR(40),
  area VARCHAR(40),
  address VARCHAR(120) NOT NULL,
  phone VARCHAR(40),
  opening_hours VARCHAR(120),
  latitude REAL,
  longitude REAL,
  cover_url TEXT,
  description TEXT,
  avg_rating REAL NOT NULL DEFAULT 0,
  review_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_merchants_updated_at ON public.merchants;
CREATE TRIGGER trg_merchants_updated_at
BEFORE UPDATE ON public.merchants
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_merchants_search ON public.merchants (name, category, city, area);
CREATE INDEX IF NOT EXISTS idx_merchants_owner ON public.merchants (owner_user_id);

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID NOT NULL,
  author_user_id UUID NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content VARCHAR(1000) NOT NULL,
  merchant_reply VARCHAR(1000),
  reply_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_reviews_updated_at ON public.reviews;
CREATE TRIGGER trg_reviews_updated_at
BEFORE UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_reviews_merchant_created ON public.reviews (merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_author ON public.reviews (author_user_id);

CREATE OR REPLACE FUNCTION public.recompute_merchant_stats(p_merchant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_avg REAL;
  v_cnt INT;
BEGIN
  SELECT COALESCE(AVG(rating), 0)::REAL, COUNT(*)::INT
  INTO v_avg, v_cnt
  FROM public.reviews
  WHERE merchant_id = p_merchant_id;

  UPDATE public.merchants
  SET avg_rating = v_avg,
      review_count = v_cnt,
      updated_at = NOW()
  WHERE id = p_merchant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_review_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    PERFORM public.recompute_merchant_stats(OLD.merchant_id);
    RETURN OLD;
  END IF;

  PERFORM public.recompute_merchant_stats(NEW.merchant_id);
  IF (TG_OP = 'UPDATE' AND OLD.merchant_id IS DISTINCT FROM NEW.merchant_id) THEN
    PERFORM public.recompute_merchant_stats(OLD.merchant_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_stats_insert ON public.reviews;
CREATE TRIGGER trg_reviews_stats_insert
AFTER INSERT ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.on_review_changed();

DROP TRIGGER IF EXISTS trg_reviews_stats_update ON public.reviews;
CREATE TRIGGER trg_reviews_stats_update
AFTER UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.on_review_changed();

DROP TRIGGER IF EXISTS trg_reviews_stats_delete ON public.reviews;
CREATE TRIGGER trg_reviews_stats_delete
AFTER DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.on_review_changed();

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON public.user_profiles;
CREATE POLICY "select_own_profile" ON public.user_profiles
FOR SELECT
USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON public.user_profiles;
CREATE POLICY "insert_own_profile" ON public.user_profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON public.user_profiles;
CREATE POLICY "update_own_profile" ON public.user_profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "merchants_select_all" ON public.merchants;
CREATE POLICY "merchants_select_all" ON public.merchants
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "merchants_insert_owner" ON public.merchants;
CREATE POLICY "merchants_insert_owner" ON public.merchants
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "merchants_update_owner" ON public.merchants;
CREATE POLICY "merchants_update_owner" ON public.merchants
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_user_id)
WITH CHECK (auth.uid() = owner_user_id);

DROP POLICY IF EXISTS "reviews_select_all" ON public.reviews;
CREATE POLICY "reviews_select_all" ON public.reviews
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "reviews_insert_author" ON public.reviews;
CREATE POLICY "reviews_insert_author" ON public.reviews
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = author_user_id);

DROP POLICY IF EXISTS "reviews_delete_author" ON public.reviews;
CREATE POLICY "reviews_delete_author" ON public.reviews
FOR DELETE
TO authenticated
USING (auth.uid() = author_user_id);

DROP POLICY IF EXISTS "reviews_update_author" ON public.reviews;
CREATE POLICY "reviews_update_author" ON public.reviews
FOR UPDATE
TO authenticated
USING (auth.uid() = author_user_id)
WITH CHECK (auth.uid() = author_user_id);

DROP POLICY IF EXISTS "reviews_update_merchant_owner" ON public.reviews;
CREATE POLICY "reviews_update_merchant_owner" ON public.reviews
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.merchants m
    WHERE m.id = reviews.merchant_id
      AND m.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.merchants m
    WHERE m.id = reviews.merchant_id
      AND m.owner_user_id = auth.uid()
  )
);

GRANT SELECT ON public.merchants, public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.merchants, public.reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO authenticated;

INSERT INTO public.merchants (owner_user_id, name, category, city, area, address, phone, opening_hours, latitude, longitude, cover_url, description)
VALUES
  (gen_random_uuid(), '橙子餐厅', '餐饮', '上海', '浦东', '浦东新区世纪大道 100 号', '021-00000001', '10:00-22:00', 31.2304, 121.4737, '/covers/merchant-orange.svg', '主打家常菜与简餐，适合工作日午晚餐'),
  (gen_random_uuid(), '蓝鲸影院', '娱乐', '北京', '朝阳', '朝阳区建国路 88 号', '010-00000002', '10:00-23:30', 39.9042, 116.4074, '/covers/merchant-blue.svg', 'IMAX 巨幕，支持在线选座（原型不含购票）'),
  (gen_random_uuid(), '银杏书店', '购物', '广州', '天河', '天河路 200 号', '020-00000003', '09:30-21:30', 23.1291, 113.2644, '/covers/merchant-green.svg', '独立书店与文创周边，安静适合阅读');
