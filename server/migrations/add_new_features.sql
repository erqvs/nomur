-- 数据库迁移脚本：添加新功能支持
-- 执行日期：2024-12-20

-- ==================== 1. 补充销售数据表 ====================
CREATE TABLE IF NOT EXISTS `supplement_sales` (
  `id` VARCHAR(36) PRIMARY KEY COMMENT '主键ID',
  `agent_id` VARCHAR(36) NOT NULL COMMENT '代理商ID',
  `product_type` VARCHAR(20) NOT NULL COMMENT '产品类型：productA（A产品）或 mixed（混合产品）',
  `quantity` INT NOT NULL DEFAULT 0 COMMENT '数量（箱）',
  `sale_date` DATE NOT NULL COMMENT '销售日期',
  `remark` TEXT COMMENT '备注说明',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX `idx_agent_id` (`agent_id`),
  INDEX `idx_sale_date` (`sale_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='补充销售数据表（仅用于任务完成率统计，不影响余额）';

-- ==================== 2. 收款账户余额字段 ====================
-- 检查字段是否存在，如果不存在则添加
SET @dbname = DATABASE();
SET @tablename = 'payment_accounts';
SET @columnname = 'balance';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' DECIMAL(12,2) DEFAULT 0 COMMENT ''初始余额''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ==================== 3. 更新交易表支持收款账户扣费 ====================
-- 检查 payment_account_id 字段是否存在（如果已存在则跳过）
SET @columnname2 = 'payment_account_id';
SET @preparedStatement2 = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = 'transactions')
      AND (COLUMN_NAME = @columnname2)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE transactions ADD COLUMN ', @columnname2, ' VARCHAR(36) COMMENT ''收款账户ID（用于收款账户扣费）''')
));
PREPARE alterIfNotExists2 FROM @preparedStatement2;
EXECUTE alterIfNotExists2;
DEALLOCATE PREPARE alterIfNotExists2;

-- 添加索引（如果不存在）
SET @indexExists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = @dbname 
  AND TABLE_NAME = 'transactions' 
  AND INDEX_NAME = 'idx_payment_account_id');
SET @preparedStatement3 = (SELECT IF(
  @indexExists > 0,
  'SELECT 1',
  'CREATE INDEX idx_payment_account_id ON transactions(payment_account_id)'
));
PREPARE createIndexIfNotExists FROM @preparedStatement3;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;

-- ==================== 4. 更新交易原因类型（添加新值） ====================
-- 注意：MySQL的ENUM类型添加新值需要修改表结构
-- 由于可能已有数据，这里先不修改，后端代码会处理新值
-- 如果需要，可以手动执行：
-- ALTER TABLE transactions MODIFY COLUMN reason ENUM('gift','payment','freight','shipping','fine','transfer_in','transfer_out','marketing','withdraw','fee','other') NOT NULL;

-- ==================== 完成 ====================
SELECT 'Migration completed successfully!' AS result;

