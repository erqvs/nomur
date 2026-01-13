-- 添加促销条件详情字段，支持每个条件产品/组合独立设置数量
-- 执行时间：2026-01-06

-- 添加 condition_details 字段，用于存储每个条件产品/组合的详细信息
-- 格式：[
--   { type: 'product', productId: 'xxx', quantity: 100 },
--   { type: 'group', groupId: 'xxx', quantity: 200 }
-- ]
ALTER TABLE `promotions` 
ADD COLUMN `condition_details` json DEFAULT NULL COMMENT '条件详情：每个条件产品/组合的数量' 
AFTER `condition_group_id`;

-- 为现有数据迁移：将 threshold 和 condition_products/condition_group_id 转换为 condition_details
-- 注意：这个迁移需要手动执行，因为需要根据每个促销的具体情况来设置
-- UPDATE promotions SET condition_details = CASE
--   WHEN condition_group_id IS NOT NULL THEN 
--     JSON_ARRAY(JSON_OBJECT('type', 'group', 'groupId', condition_group_id, 'quantity', threshold))
--   WHEN condition_products IS NOT NULL AND JSON_LENGTH(condition_products) > 0 THEN
--     JSON_ARRAYAGG(JSON_OBJECT('type', 'product', 'productId', value, 'quantity', threshold))
--   ELSE NULL
-- END
-- WHERE condition_details IS NULL;

