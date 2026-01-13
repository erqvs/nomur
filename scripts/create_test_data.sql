-- 创建测试数据脚本
-- 所有测试数据名称前缀都添加"测试"两个字

USE nomur;

-- 获取现有商品ID（用于测试订单）
SET @product_id_1 = (SELECT id FROM products LIMIT 1);
SET @product_id_2 = (SELECT id FROM products LIMIT 1 OFFSET 1);
SET @product_id_3 = (SELECT id FROM products LIMIT 1 OFFSET 2);

-- 1. 创建测试代理商
SET @test_agent_a_id = UUID();
SET @test_agent_b_id = UUID();
SET @test_agent_c_id = UUID();

INSERT INTO agents (id, name, phone1, phone2, address, yearly_targets, balance, sort_order) VALUES
(@test_agent_a_id, '测试代理商A', '13900000001', '13900000002', '测试地址A-北京市朝阳区测试街道1号', 
 JSON_OBJECT(@product_id_1, 1000, @product_id_2, 500), 50000.00, 100),
(@test_agent_b_id, '测试代理商B', '13900000003', '13900000004', '测试地址B-上海市浦东新区测试路2号', 
 JSON_OBJECT(@product_id_1, 800, @product_id_3, 400), 30000.00, 101),
(@test_agent_c_id, '测试代理商C', '13900000005', NULL, '测试地址C-广州市天河区测试大道3号', 
 JSON_OBJECT(@product_id_2, 600, @product_id_3, 300), 20000.00, 102);

-- 2. 创建测试商品
SET @test_product_id_1 = UUID();
SET @test_product_id_2 = UUID();
SET @test_product_id_3 = UUID();

INSERT INTO products (id, name, image, price, weight, materials) VALUES
(@test_product_id_1, '测试商品A', '/api/uploads/test-product-a.jpg', 299.00, 10.5, '[]'),
(@test_product_id_2, '测试商品B', '/api/uploads/test-product-b.jpg', 399.00, 15.0, '[]'),
(@test_product_id_3, '测试商品C', '/api/uploads/test-product-c.jpg', 199.00, 8.0, '[]');

-- 3. 创建测试司机
SET @test_driver_a_id = UUID();
SET @test_driver_b_id = UUID();
SET @test_driver_c_id = UUID();

INSERT INTO drivers (id, name, phone) VALUES
(@test_driver_a_id, '测试司机A', '13800000001'),
(@test_driver_b_id, '测试司机B', '13800000002'),
(@test_driver_c_id, '测试司机C', '13800000003');

-- 4. 创建测试收款账户
SET @test_payment_account_a_id = UUID();
SET @test_payment_account_b_id = UUID();

INSERT INTO payment_accounts (id, name, account_no, bank_name, qr_code, balance) VALUES
(@test_payment_account_a_id, '测试收款账户A', '6222021234567890123', '测试银行A', '[]', 100000.00),
(@test_payment_account_b_id, '测试收款账户B', '6222021234567890124', '测试银行B', '[]', 50000.00);

-- 5. 创建测试促销活动
SET @test_promotion_id_1 = UUID();
SET @test_promotion_id_2 = UUID();

INSERT INTO promotions (id, name, description, threshold, condition_products, gifts, is_active, start_date, end_date) VALUES
(@test_promotion_id_1, '测试促销活动A', '测试促销活动A描述：每满100件赠送10件', 100, '[]', 
 CONCAT('[{"productId": "', @product_id_1, '", "quantity": 10}]'), 1, '2026-01-01', '2026-12-31'),
(@test_promotion_id_2, '测试促销活动B', '测试促销活动B描述：每满200件赠送20件', 200, '[]', 
 CONCAT('[{"productId": "', @product_id_2, '", "quantity": 20}]'), 1, '2026-01-01', '2026-12-31');

-- 6. 创建测试订单
SET @test_order_id_1 = UUID();
SET @test_order_id_2 = UUID();

INSERT INTO orders (id, agent_id, items, total_weight, total_amount, driver_phone, promotion_id, gift_items, images, remark) VALUES
(@test_order_id_1, @test_agent_a_id, 
 CONCAT('[{"productId": "', @product_id_1, '", "productName": "测试商品A", "quantity": 10, "price": 299.00, "weight": 10.5}]'),
 105.0, 2990.00, '13800000001', NULL, '[]', '[]', '测试订单备注A'),
(@test_order_id_2, @test_agent_b_id,
 CONCAT('[{"productId": "', @product_id_2, '", "productName": "测试商品B", "quantity": 5, "price": 399.00, "weight": 15.0}]'),
 75.0, 1995.00, '13800000002', NULL, '[]', '[]', '测试订单备注B');

-- 7. 创建测试交易记录（充值、扣款）
SET @test_tx_id_1 = UUID();
SET @test_tx_id_2 = UUID();
SET @test_tx_id_3 = UUID();
SET @test_tx_id_4 = UUID();

-- 充值记录
INSERT INTO transactions (id, agent_id, type, reason, amount, proof, remark, payment_account_id) VALUES
(@test_tx_id_1, @test_agent_a_id, 'recharge', 'payment', 10000.00, NULL, '测试充值记录A', @test_payment_account_a_id),
(@test_tx_id_2, @test_agent_b_id, 'recharge', 'gift', 5000.00, NULL, '测试充值记录B（赠送）', NULL);

-- 扣款记录（关联订单）
INSERT INTO transactions (id, agent_id, type, reason, amount, related_order_id, remark) VALUES
(@test_tx_id_3, @test_agent_a_id, 'deduct', 'shipping', -2990.00, @test_order_id_1, '测试扣款记录A（发货扣款）'),
(@test_tx_id_4, @test_agent_b_id, 'deduct', 'shipping', -1995.00, @test_order_id_2, '测试扣款记录B（发货扣款）');

-- 8. 更新代理商余额（根据交易记录）
UPDATE agents SET balance = balance + 10000.00 WHERE id = @test_agent_a_id;
UPDATE agents SET balance = balance + 5000.00 WHERE id = @test_agent_b_id;
UPDATE agents SET balance = balance - 2990.00 WHERE id = @test_agent_a_id;
UPDATE agents SET balance = balance - 1995.00 WHERE id = @test_agent_b_id;

-- 9. 创建测试调货记录（从测试代理商A调货给测试代理商B）
SET @test_transfer_in_id = UUID();
SET @test_transfer_out_id = UUID();
SET @transfer_amount = 2000.00;

INSERT INTO transactions (id, agent_id, type, reason, amount, related_agent_id, product_id, quantity, remark) VALUES
(@test_transfer_in_id, @test_agent_a_id, 'recharge', 'transfer_in', @transfer_amount, @test_agent_b_id, @product_id_1, 5, '测试调货收入：从测试代理商A调货给测试代理商B'),
(@test_transfer_out_id, @test_agent_b_id, 'deduct', 'transfer_out', -@transfer_amount, @test_agent_a_id, NULL, NULL, '测试调货支出：调货给测试代理商A');

-- 更新调货后的余额
UPDATE agents SET balance = balance + @transfer_amount WHERE id = @test_agent_a_id;
UPDATE agents SET balance = balance - @transfer_amount WHERE id = @test_agent_b_id;

SELECT '测试数据创建完成！' AS message;
