-- 搭赠送达记录表
CREATE TABLE IF NOT EXISTS gift_delivery_records (
  id varchar(36) NOT NULL,
  order_id varchar(36) NOT NULL COMMENT '订单ID',
  agent_id varchar(36) NOT NULL COMMENT '代理商ID',
  product_id varchar(36) DEFAULT NULL COMMENT '产品ID（单个产品赠品时使用）',
  product_name varchar(100) DEFAULT NULL COMMENT '产品名称',
  group_id varchar(36) DEFAULT NULL COMMENT '组合ID（组合赠品时使用）',
  group_name varchar(100) DEFAULT NULL COMMENT '组合名称',
  quantity int NOT NULL COMMENT '本次送达数量',
  delivered_by varchar(36) DEFAULT NULL COMMENT '操作人ID（管理员ID）',
  delivered_by_name varchar(100) DEFAULT NULL COMMENT '操作人名称',
  remark varchar(500) DEFAULT NULL COMMENT '备注',
  created_at timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_order_id (order_id),
  KEY idx_agent_id (agent_id),
  KEY idx_product_id (product_id),
  KEY idx_group_id (group_id),
  KEY idx_created_at (created_at),
  CONSTRAINT fk_gift_delivery_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
  CONSTRAINT fk_gift_delivery_agent FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='搭赠送达记录表';
