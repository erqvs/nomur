# 数据库迁移说明

## 新功能数据库迁移

本次迁移添加了两个新功能的数据库支持：

1. **补充销售数据功能** - 创建 `supplement_sales` 表
2. **收款账户余额管理** - 为 `payment_accounts` 表添加 `balance` 字段

## 执行迁移

### 方法1：使用 MySQL 命令行

```bash
mysql -h 8.154.33.100 -P 3306 -u root -p nomur < migrations/add_new_features.sql
```

输入数据库密码：`Xk9mP2vL5nQ8wR3jF6yH1bT4cU7eA0sDzGqW`

### 方法2：使用 MySQL Workbench 或其他工具

1. 连接到数据库服务器：`8.154.33.100:3306`
2. 选择数据库：`nomur`
3. 执行 SQL 文件：`migrations/add_new_features.sql`

## 迁移内容

### 1. supplement_sales 表

用于存储手动补充的销售数据，仅用于任务完成率统计，不影响代理商余额。

**字段说明：**
- `id`: 主键
- `agent_id`: 代理商ID（外键）
- `product_type`: 产品类型（productA 或 mixed）
- `quantity`: 数量（箱）
- `sale_date`: 销售日期
- `remark`: 备注
- `created_at`: 创建时间

### 2. payment_accounts 表新增字段

- `balance`: 初始余额（DECIMAL(12,2)，默认0）

**注意：** 当前余额 = 初始余额 + 所有交易金额总和

### 3. transactions 表支持收款账户

- `payment_account_id`: 收款账户ID（用于收款账户扣费记录）

## 验证迁移

执行以下SQL验证迁移是否成功：

```sql
-- 检查补充数据表
SHOW TABLES LIKE 'supplement_sales';

-- 检查收款账户余额字段
DESC payment_accounts;

-- 检查交易表字段
DESC transactions;
```

## 回滚（如需要）

如果需要回滚，执行以下SQL：

```sql
-- 删除补充数据表
DROP TABLE IF EXISTS supplement_sales;

-- 删除余额字段（如果已添加）
ALTER TABLE payment_accounts DROP COLUMN IF EXISTS balance;

-- 删除交易表的收款账户字段（如果已添加）
ALTER TABLE transactions DROP COLUMN IF EXISTS payment_account_id;
```

