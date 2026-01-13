-- 删除测试数据脚本
-- 删除所有名称以"测试"开头的数据

USE nomur;

-- 1. 删除测试交易记录（先删除子表数据）
DELETE FROM transactions 
WHERE agent_id IN (SELECT id FROM agents WHERE name LIKE '测试%')
   OR related_agent_id IN (SELECT id FROM agents WHERE name LIKE '测试%')
   OR payment_account_id IN (SELECT id FROM payment_accounts WHERE name LIKE '测试%')
   OR related_order_id IN (SELECT id FROM orders WHERE agent_id IN (SELECT id FROM agents WHERE name LIKE '测试%'));

-- 2. 删除测试订单（关联测试代理商）
DELETE FROM orders 
WHERE agent_id IN (SELECT id FROM agents WHERE name LIKE '测试%');

-- 3. 删除测试代理商赠品记录
DELETE FROM agent_gifts 
WHERE agent_id IN (SELECT id FROM agents WHERE name LIKE '测试%');

-- 4. 删除测试促销活动
DELETE FROM promotions 
WHERE name LIKE '测试%';

-- 5. 删除测试收款账户（需要先删除关联的交易记录，已在步骤1完成）
DELETE FROM payment_accounts 
WHERE name LIKE '测试%';

-- 6. 删除测试司机
DELETE FROM drivers 
WHERE name LIKE '测试%';

-- 7. 删除测试商品
DELETE FROM products 
WHERE name LIKE '测试%';

-- 8. 最后删除测试代理商
DELETE FROM agents 
WHERE name LIKE '测试%';

SELECT '测试数据删除完成！' AS message;
