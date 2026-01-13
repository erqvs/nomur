-- 创建代理商搭赠情况表
CREATE TABLE IF NOT EXISTS `agent_gifts` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `agent_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '代理商ID',
  `product_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '产品ID',
  `product_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '产品名称',
  `delivered_quantity` int DEFAULT '0' COMMENT '已送达数量',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_agent_product` (`agent_id`, `product_id`),
  KEY `idx_agent_id` (`agent_id`),
  KEY `idx_product_id` (`product_id`),
  CONSTRAINT `agent_gifts_ibfk_1` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='代理商搭赠情况表';
