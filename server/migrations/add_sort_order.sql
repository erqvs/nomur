-- 数据库迁移脚本：添加代理商排序字段
-- 执行日期：2024-12-20

-- ==================== 添加代理商排序字段 ====================
SET @dbname = DATABASE();
SET @tablename = 'agents';
SET @columnname = 'sort_order';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' INT DEFAULT 0 COMMENT ''排序顺序（数字越小越靠前）''')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- 为现有数据初始化排序值（按创建时间倒序）
SET @row_number = 0;
UPDATE agents 
SET sort_order = (@row_number := @row_number + 1)
WHERE sort_order = 0 OR sort_order IS NULL
ORDER BY created_at DESC;

-- 添加索引以提高排序查询性能
SET @indexExists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = @dbname 
  AND TABLE_NAME = @tablename 
  AND INDEX_NAME = 'idx_sort_order');
SET @preparedStatement2 = (SELECT IF(
  @indexExists > 0,
  'SELECT 1',
  'CREATE INDEX idx_sort_order ON agents(sort_order)'
));
PREPARE createIndexIfNotExists FROM @preparedStatement2;
EXECUTE createIndexIfNotExists;
DEALLOCATE PREPARE createIndexIfNotExists;

-- ==================== 完成 ====================
SELECT 'Sort order migration completed successfully!' AS result;

