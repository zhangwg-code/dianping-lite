-- 重新创建评价统计触发器，确保新增评价时自动更新商户的 avg_rating 和 review_count

-- 1. 先删除可能存在的旧触发器
DROP TRIGGER IF EXISTS trg_reviews_stats_insert ON public.reviews;
DROP TRIGGER IF EXISTS trg_reviews_stats_update ON public.reviews;
DROP TRIGGER IF EXISTS trg_reviews_stats_delete ON public.reviews;

-- 2. 重新创建触发器
CREATE TRIGGER trg_reviews_stats_insert
AFTER INSERT ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.on_review_changed();

CREATE TRIGGER trg_reviews_stats_update
AFTER UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.on_review_changed();

CREATE TRIGGER trg_reviews_stats_delete
AFTER DELETE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.on_review_changed();

-- 3. 验证触发器已创建
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table = 'reviews' 
AND trigger_name LIKE 'trg_reviews_stats_%';
