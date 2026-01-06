mysqldump: [Warning] Using a password on the command line interface can be insecure.
-- MySQL dump 10.13  Distrib 8.0.44, for Linux (x86_64)
--
-- Host: 8.154.33.100    Database: nomur
-- ------------------------------------------------------
-- Server version	8.0.44-0ubuntu0.22.04.2

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admins`
--

DROP TABLE IF EXISTS `admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admins` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '管理员名称',
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '手机号',
  `role` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'admin' COMMENT '角色: super_admin/admin',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `can_edit_driver_phone` tinyint(1) DEFAULT '0' COMMENT '是否允许填写司机手机号',
  PRIMARY KEY (`id`),
  UNIQUE KEY `phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admins`
--

LOCK TABLES `admins` WRITE;
/*!40000 ALTER TABLE `admins` DISABLE KEYS */;
INSERT INTO `admins` VALUES ('admin1','超级管理员','13800000000','super_admin',1,'2025-12-30 12:48:12','2025-12-30 12:48:12',0),('admin2','张总','13800000001','admin',1,'2025-12-30 12:48:12','2025-12-30 12:48:12',0);
/*!40000 ALTER TABLE `admins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `agents`
--

DROP TABLE IF EXISTS `agents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `agents` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `avatar` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone1` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone2` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_product_a` int DEFAULT '0' COMMENT 'A产品年度目标(箱)',
  `target_mixed` int DEFAULT '0' COMMENT '混合产品年度目标(箱)',
  `yearly_targets` json DEFAULT NULL COMMENT '年度目标JSON: {productId: target}',
  `balance` decimal(12,2) DEFAULT '0.00' COMMENT '余额(可为负)',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `sort_order` int DEFAULT '0' COMMENT '排序顺序（数字越小越靠前）',
  PRIMARY KEY (`id`),
  KEY `idx_phone1` (`phone1`),
  KEY `idx_phone2` (`phone2`),
  KEY `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agents`
--

LOCK TABLES `agents` WRITE;
/*!40000 ALTER TABLE `agents` DISABLE KEYS */;
INSERT INTO `agents` VALUES ('6bed5029-f3a1-48be-ad5e-150dc97dc7d3','/api/uploads/1767549698557-0c62ef97-1809-4425-9a51-48618e8f2cda.jpeg','哈哈哈','13288889999','','啊啊啊',0,0,'{\"92a66608-e988-11f0-88fe-00163e0fcc94\": 80, \"92a8f010-e988-11f0-88fe-00163e0fcc94\": 40, \"92ab6f95-e988-11f0-88fe-00163e0fcc94\": 30, \"fb5255ac-ae2f-4b0e-84c0-eef1153bcdb7\": 10}',1000.00,'2026-01-04 18:01:40','2026-01-06 18:31:22',6),('70f1366b-deaa-4004-8755-15d66bd932f6','','李四','13800138002','','上海市浦东新区陆家嘴环路1000号',0,0,'{\"92a66608-e988-11f0-88fe-00163e0fcc94\": 83, \"92a8f010-e988-11f0-88fe-00163e0fcc94\": 83, \"92ab6f95-e988-11f0-88fe-00163e0fcc94\": 84, \"fb5255ac-ae2f-4b0e-84c0-eef1153bcdb7\": 400}',-1500.00,'2026-01-04 18:53:58','2026-01-06 18:31:22',4),('7e8e362a-2c23-42f5-8109-97ca3f2f64be','','喀什M','18328444413','19804004004','喀什市',0,0,'{\"92a66608-e988-11f0-88fe-00163e0fcc94\": 35000, \"92a8f010-e988-11f0-88fe-00163e0fcc94\": 10000, \"92ab6f95-e988-11f0-88fe-00163e0fcc94\": 167, \"fb5255ac-ae2f-4b0e-84c0-eef1153bcdb7\": 1000}',121500.00,'2026-01-04 18:53:59','2026-01-06 18:31:22',1),('8db511e9-9362-4bbf-ac09-e266c7f9b052','','乌鲁木齐','13800138003','','广州市天河区珠江新城花城大道',0,0,'{\"92a66608-e988-11f0-88fe-00163e0fcc94\": 133, \"92a8f010-e988-11f0-88fe-00163e0fcc94\": 133, \"92ab6f95-e988-11f0-88fe-00163e0fcc94\": 134, \"fb5255ac-ae2f-4b0e-84c0-eef1153bcdb7\": 600}',-137690.00,'2026-01-04 18:53:59','2026-01-06 18:31:22',2),('e6d181d2-d3a9-47b3-814a-040c52de5467','','赵六','13800138004','13900139004','深圳市南山区科技园南区',0,0,'{\"_group_1767699928353\": {\"target\": 4000, \"products\": [\"92a8f010-e988-11f0-88fe-00163e0fcc94\", \"92ab6f95-e988-11f0-88fe-00163e0fcc94\"]}, \"92a66608-e988-11f0-88fe-00163e0fcc94\": 27, \"fb5255ac-ae2f-4b0e-84c0-eef1153bcdb7\": 350}',-3300.00,'2026-01-04 18:53:59','2026-01-06 18:31:22',3),('f5510893-d44c-40b9-87b8-e3420d8b935b','','张三','13800138001','13900139001','北京市朝阳区建国路88号',0,0,'{\"92a66608-e988-11f0-88fe-00163e0fcc94\": 100, \"92a8f010-e988-11f0-88fe-00163e0fcc94\": 100, \"92ab6f95-e988-11f0-88fe-00163e0fcc94\": 100, \"fb5255ac-ae2f-4b0e-84c0-eef1153bcdb7\": 500}',-14900.00,'2026-01-04 18:53:58','2026-01-06 18:31:22',5);
/*!40000 ALTER TABLE `agents` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `drivers`
--

DROP TABLE IF EXISTS `drivers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `drivers` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `drivers`
--

LOCK TABLES `drivers` WRITE;
/*!40000 ALTER TABLE `drivers` DISABLE KEYS */;
INSERT INTO `drivers` VALUES ('d1','刘师傅','13600136001','2025-12-27 16:05:27'),('d2','陈师傅','13600136002','2025-12-27 16:05:27'),('d3','周师傅','13600136003','2025-12-27 16:05:27');
/*!40000 ALTER TABLE `drivers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `agent_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `items` json NOT NULL COMMENT '订单商品项',
  `total_weight` decimal(10,2) NOT NULL,
  `total_amount` decimal(12,2) NOT NULL,
  `driver_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `promotion_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gift_items` json DEFAULT NULL COMMENT '赠品',
  `images` json DEFAULT NULL COMMENT '订单图片',
  `status` enum('pending','shipped','completed') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `shipped_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `is_gift` tinyint(1) DEFAULT '0' COMMENT '是否为赠品订单',
  PRIMARY KEY (`id`),
  KEY `agent_id` (`agent_id`),
  KEY `promotion_id` (`promotion_id`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`),
  CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES ('081907c5-1fc4-4057-94c9-06b3b97f01d9','f5510893-d44c-40b9-87b8-e3420d8b935b','[{\"price\": 399, \"weight\": 3, \"quantity\": 100, \"productId\": \"92a66608-e988-11f0-88fe-00163e0fcc94\", \"productName\": \"金桂茶\"}]',300.00,39900.00,'13288883333',NULL,'[{\"quantity\": 6, \"productId\": \"92a66608-e988-11f0-88fe-00163e0fcc94\", \"productName\": \"金桂茶\"}]','[]','pending',NULL,'2026-01-05 14:11:58',NULL,NULL,0),('9b5b5723-2e23-4b6e-9d55-6387d8504f54','7e8e362a-2c23-42f5-8109-97ca3f2f64be','[{\"price\": 70, \"weight\": 7.34, \"quantity\": 1000, \"productId\": \"92a66608-e988-11f0-88fe-00163e0fcc94\", \"productName\": \"芒果果汁\"}, {\"price\": 45, \"weight\": 8.58, \"quantity\": 1000, \"productId\": \"92a8f010-e988-11f0-88fe-00163e0fcc94\", \"productName\": \"茉莉茶\"}]',15920.00,115000.00,'18328444413','2a1f3379-700c-44f2-a356-5352613f316a','[{\"quantity\": 40, \"productId\": \"92a8f010-e988-11f0-88fe-00163e0fcc94\", \"productName\": \"茉莉茶\"}, {\"quantity\": 40, \"productId\": \"92ab6f95-e988-11f0-88fe-00163e0fcc94\", \"productName\": \"龙井茶\"}, {\"quantity\": 40, \"productId\": \"fb5255ac-ae2f-4b0e-84c0-eef1153bcdb7\", \"productName\": \"金桂龙眼\"}]','[]','pending',NULL,'2026-01-06 16:05:37',NULL,NULL,0),('a1802a1d-785b-40cc-84b1-a57c0d4e96b2','8db511e9-9362-4bbf-ac09-e266c7f9b052','[{\"price\": 70, \"weight\": 7.24, \"quantity\": 14, \"productId\": \"92a66608-e988-11f0-88fe-00163e0fcc94\", \"productName\": \"芒果果汁\"}, {\"price\": 45, \"weight\": 8.58, \"quantity\": 13, \"productId\": \"92a8f010-e988-11f0-88fe-00163e0fcc94\", \"productName\": \"茉莉茶\"}, {\"price\": 45, \"weight\": 8.58, \"quantity\": 13, \"productId\": \"92ab6f95-e988-11f0-88fe-00163e0fcc94\", \"productName\": \"龙井茶\"}, {\"price\": 45, \"weight\": 8.58, \"quantity\": 12, \"productId\": \"fb5255ac-ae2f-4b0e-84c0-eef1153bcdb7\", \"productName\": \"金桂龙眼\"}]',427.40,2690.00,'18328444413',NULL,NULL,'[]','pending',NULL,'2026-01-06 07:51:47',NULL,NULL,0),('e2ae046b-a8d2-491a-900f-5fde4e721076','7e8e362a-2c23-42f5-8109-97ca3f2f64be','[{\"price\": 70, \"weight\": 7.24, \"quantity\": 1000, \"productId\": \"92a66608-e988-11f0-88fe-00163e0fcc94\", \"productName\": \"芒果果汁\"}]',7240.00,70000.00,'18328444413','2a1f3379-700c-44f2-a356-5352613f316a','[{\"quantity\": 20, \"productId\": \"92a8f010-e988-11f0-88fe-00163e0fcc94\", \"productName\": \"茉莉茶\"}, {\"quantity\": 20, \"productId\": \"92ab6f95-e988-11f0-88fe-00163e0fcc94\", \"productName\": \"龙井茶\"}, {\"quantity\": 20, \"productId\": \"fb5255ac-ae2f-4b0e-84c0-eef1153bcdb7\", \"productName\": \"金桂龙眼\"}]','[\"/api/uploads/1767688422219-36da5098-a78b-455a-9fb2-1d39ca7efe98.jpeg\", \"/api/uploads/1767688422655-92b60771-1aa6-46a6-ae58-47338c166c05.jpeg\"]','pending',NULL,'2026-01-06 08:33:47',NULL,NULL,0),('e94b4a73-9e3c-4d6f-b3b4-b092e1bc8e78','e6d181d2-d3a9-47b3-814a-040c52de5467','[{\"price\": 70, \"weight\": 7.24, \"quantity\": 100, \"productId\": \"92a66608-e988-11f0-88fe-00163e0fcc94\", \"productName\": \"芒果果汁\"}, {\"price\": 45, \"weight\": 8.58, \"quantity\": 100, \"productId\": \"92a8f010-e988-11f0-88fe-00163e0fcc94\", \"productName\": \"茉莉茶\"}]',1582.00,11500.00,'18328444413',NULL,'[{\"quantity\": 4, \"productId\": \"92a8f010-e988-11f0-88fe-00163e0fcc94\", \"productName\": \"茉莉茶\"}, {\"quantity\": 4, \"productId\": \"92ab6f95-e988-11f0-88fe-00163e0fcc94\", \"productName\": \"龙井茶\"}, {\"quantity\": 4, \"productId\": \"fb5255ac-ae2f-4b0e-84c0-eef1153bcdb7\", \"productName\": \"金桂龙眼\"}]','[]','pending',NULL,'2026-01-06 08:07:25',NULL,NULL,0);
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_accounts`
--

DROP TABLE IF EXISTS `payment_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_accounts` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '收款人/账户名',
  `account_no` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '账号',
  `bank_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '银行名称',
  `qr_code` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '收款码图片',
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `balance` decimal(12,2) DEFAULT '0.00' COMMENT '初始余额',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_accounts`
--

LOCK TABLES `payment_accounts` WRITE;
/*!40000 ALTER TABLE `payment_accounts` DISABLE KEYS */;
INSERT INTO `payment_accounts` VALUES ('2a52ee5f-4c60-4b2b-9b56-0e637ee9e553','张总微信',NULL,NULL,NULL,1,'2026-01-04 17:26:31',0.00),('80b15be1-73bd-4334-99a3-f762e3850f30','啊啊',NULL,NULL,NULL,0,'2026-01-04 17:32:10',0.00),('9440ca85-0c91-4c54-b829-1541cadab565','浙江','1231321','2313','/api/uploads/1767547398497-14c40d26-ff20-467f-a2d3-80c2b7319066.jpeg',0,'2026-01-04 17:23:19',0.00),('97b9a071-7726-43d7-a094-3231c51c3acc','啊啊',NULL,NULL,NULL,1,'2026-01-04 17:34:22',0.00),('990d1e58-97cf-46d5-b75f-7ce7def2eb63','张总支付宝',NULL,NULL,NULL,1,'2026-01-04 17:26:32',0.00),('f328e7dd-0df2-446e-ba07-c05d0b556aa1','李总正好',NULL,NULL,NULL,1,'2026-01-06 16:22:16',0.00),('f8ff1ea8-9c33-4b03-b25a-e14ce8af0863','JB厂',NULL,NULL,NULL,1,'2026-01-06 08:30:03',0.00);
/*!40000 ALTER TABLE `payment_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_groups`
--

DROP TABLE IF EXISTS `product_groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_groups` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `product_ids` json NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_groups`
--

LOCK TABLES `product_groups` WRITE;
/*!40000 ALTER TABLE `product_groups` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_groups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `image` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `weight` decimal(10,2) NOT NULL COMMENT '重量(kg)',
  `materials` json DEFAULT NULL COMMENT '素材库图片URLs',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES ('92a66608-e988-11f0-88fe-00163e0fcc94','芒果果汁','/api/uploads/1767685520363-e0f92920-8c8b-4426-8c40-d830350c0bc2.jpeg',70.00,7.34,'[\"/api/uploads/1767688632755-b748cb50-f4fc-4429-982b-dbee2e7a6693.jpeg\", \"/api/uploads/1767688633124-160580fd-79eb-4349-ab48-4eaeb3823412.jpeg\", \"/api/uploads/1767688639482-e23dee97-da6d-43d4-b676-316c2fe3487f.jpeg\"]','2026-01-04 16:15:23','2026-01-06 08:37:27'),('92a8f010-e988-11f0-88fe-00163e0fcc94','茉莉茶','/api/uploads/1767704691421-a2a88a75-64a6-462f-80e0-2b3881d8fb28.jpg',45.00,8.58,'[]','2026-01-04 16:15:23','2026-01-06 13:04:57'),('92ab6f95-e988-11f0-88fe-00163e0fcc94','龙井茶',NULL,45.00,8.58,'[]','2026-01-04 16:15:23','2026-01-06 07:45:59'),('fb5255ac-ae2f-4b0e-84c0-eef1153bcdb7','金桂龙眼',NULL,45.00,8.58,'[]','2026-01-04 16:13:34','2026-01-06 07:46:15');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `promotions`
--

DROP TABLE IF EXISTS `promotions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promotions` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `threshold` int NOT NULL COMMENT '满多少件',
  `condition_products` json DEFAULT NULL,
  `condition_group_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gifts` json DEFAULT NULL COMMENT '赠品列表',
  `is_active` tinyint(1) DEFAULT '1',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promotions`
--

LOCK TABLES `promotions` WRITE;
/*!40000 ALTER TABLE `promotions` DISABLE KEYS */;
INSERT INTO `promotions` VALUES ('2a1f3379-700c-44f2-a356-5352613f316a','芒果活动满100送8茶','芒果活动满100送8茶',100,NULL,NULL,'[{\"quantity\": 2, \"productId\": \"92a8f010-e988-11f0-88fe-00163e0fcc94\", \"productName\": \"茉莉茶\"}, {\"quantity\": 2, \"productId\": \"92ab6f95-e988-11f0-88fe-00163e0fcc94\", \"productName\": \"龙井茶\"}, {\"quantity\": 2, \"productId\": \"fb5255ac-ae2f-4b0e-84c0-eef1153bcdb7\", \"productName\": \"金桂龙眼\"}]',1,'2026-01-06','2026-01-25','2026-01-06 08:03:52');
/*!40000 ALTER TABLE `promotions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `supplement_sales`
--

DROP TABLE IF EXISTS `supplement_sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplement_sales` (
  `id` varchar(36) NOT NULL COMMENT '主键ID',
  `agent_id` varchar(36) NOT NULL COMMENT '代理商ID',
  `product_type` varchar(20) NOT NULL COMMENT '产品类型：productA（A产品）或 mixed（混合产品）',
  `quantity` int NOT NULL DEFAULT '0' COMMENT '数量（箱）',
  `sale_date` date NOT NULL COMMENT '销售日期',
  `remark` text COMMENT '备注说明',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (`id`),
  KEY `idx_agent_id` (`agent_id`),
  KEY `idx_sale_date` (`sale_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='补充销售数据表（仅用于任务完成率统计，不影响余额）';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `supplement_sales`
--

LOCK TABLES `supplement_sales` WRITE;
/*!40000 ALTER TABLE `supplement_sales` DISABLE KEYS */;
/*!40000 ALTER TABLE `supplement_sales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `transactions`
--

DROP TABLE IF EXISTS `transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `transactions` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `agent_id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` enum('recharge','deduct') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reason` enum('gift','payment','freight','shipping','fine','transfer_in','transfer_out','marketing','withdraw','fee','other') COLLATE utf8mb4_unicode_ci NOT NULL,
  `amount` decimal(12,2) NOT NULL COMMENT '金额(正数入账,负数扣款)',
  `proof` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '凭证图片',
  `related_order_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `related_agent_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '调货关联代理',
  `product_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantity` int DEFAULT NULL,
  `remark` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `payment_account_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '收款账户ID',
  PRIMARY KEY (`id`),
  KEY `agent_id` (`agent_id`),
  KEY `idx_payment_account_id` (`payment_account_id`),
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `transactions`
--

LOCK TABLES `transactions` WRITE;
/*!40000 ALTER TABLE `transactions` DISABLE KEYS */;
INSERT INTO `transactions` VALUES ('02cc53de-664e-43a8-b675-825323dd454a','8db511e9-9362-4bbf-ac09-e266c7f9b052','recharge','gift',5000.00,NULL,NULL,NULL,NULL,NULL,'赠送','2026-01-04 19:19:38',NULL),('05379fe7-4faa-4770-bb1d-f16205970699','7e8e362a-2c23-42f5-8109-97ca3f2f64be','recharge','freight',16500.00,'/api/uploads/1767689009085-bb0c72f7-31be-4b1d-aec0-7a53bc13ddce.jpeg',NULL,NULL,NULL,NULL,NULL,'2026-01-06 08:43:32',NULL),('0a979cdb-5c8b-495c-b70f-1a24a45e6027','8db511e9-9362-4bbf-ac09-e266c7f9b052','deduct','shipping',-2690.00,NULL,'a1802a1d-785b-40cc-84b1-a57c0d4e96b2',NULL,NULL,NULL,'发货扣款','2026-01-06 07:51:47',NULL),('0bd47b6e-bc3d-40e1-aef8-c316ca81b992','e6d181d2-d3a9-47b3-814a-040c52de5467','recharge','payment',8200.00,'/api/uploads/1767554418608-4421947b-5344-40cc-b2fe-100716a8f903.png',NULL,NULL,NULL,NULL,NULL,'2026-01-04 19:20:19','2a52ee5f-4c60-4b2b-9b56-0e637ee9e553'),('0be5bb8d-9a38-4cda-a29b-ede651dccb67','6bed5029-f3a1-48be-ad5e-150dc97dc7d3','recharge','payment',1000.00,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-04 18:50:10','2a52ee5f-4c60-4b2b-9b56-0e637ee9e553'),('45f0e555-8683-4f95-9bdd-b40c1d7b0b4b','7e8e362a-2c23-42f5-8109-97ca3f2f64be','recharge','transfer_in',70000.00,NULL,NULL,'8db511e9-9362-4bbf-ac09-e266c7f9b052','92a66608-e988-11f0-88fe-00163e0fcc94',1000,'乌鲁木齐 调货','2026-01-06 16:08:37',NULL),('46dc0078-ba29-4be5-9b7b-663320676ed3','7e8e362a-2c23-42f5-8109-97ca3f2f64be','recharge','payment',100000.00,NULL,NULL,NULL,NULL,NULL,'银行卡','2026-01-06 08:31:06','f8ff1ea8-9c33-4b03-b25a-e14ce8af0863'),('4e3a75b4-3683-44e4-946c-5925fd2b6e9e','f5510893-d44c-40b9-87b8-e3420d8b935b','deduct','shipping',-39900.00,NULL,'081907c5-1fc4-4057-94c9-06b3b97f01d9',NULL,NULL,NULL,'发货扣款','2026-01-05 14:11:58',NULL),('51f636a0-c00f-4403-9f1f-a20a8743aede','e6d181d2-d3a9-47b3-814a-040c52de5467','deduct','shipping',-11500.00,NULL,'e94b4a73-9e3c-4d6f-b3b4-b092e1bc8e78',NULL,NULL,NULL,'发货扣款','2026-01-06 08:07:25',NULL),('5c6c5f06-4e20-4df2-aecb-d762ffaac9b6','f5510893-d44c-40b9-87b8-e3420d8b935b','recharge','payment',5000.00,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-05 14:09:02','97b9a071-7726-43d7-a094-3231c51c3acc'),('6078242d-3268-4f3e-98f2-63fce835fc6e','70f1366b-deaa-4004-8755-15d66bd932f6','recharge','payment',30000.00,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-04 19:18:50','990d1e58-97cf-46d5-b75f-7ce7def2eb63'),('642e44af-ac4c-4508-a968-1b2e2a8256f1','7e8e362a-2c23-42f5-8109-97ca3f2f64be','deduct','shipping',-115000.00,NULL,'9b5b5723-2e23-4b6e-9d55-6387d8504f54',NULL,NULL,NULL,'发货扣款','2026-01-06 16:05:37',NULL),('784f6401-c0d3-44ae-8240-7953e75f4e93','f5510893-d44c-40b9-87b8-e3420d8b935b','recharge','payment',20000.00,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-06 07:40:48','2a52ee5f-4c60-4b2b-9b56-0e637ee9e553'),('7ae69fc0-1c3b-4706-a9bd-0e225785ab8d','8db511e9-9362-4bbf-ac09-e266c7f9b052','deduct','transfer_out',-70000.00,NULL,NULL,'7e8e362a-2c23-42f5-8109-97ca3f2f64be',NULL,NULL,'调货给 喀什M','2026-01-06 16:08:00',NULL),('9a0b2050-1465-4fd5-b476-af5e68ef841c','70f1366b-deaa-4004-8755-15d66bd932f6','deduct','shipping',-31500.00,NULL,NULL,NULL,NULL,NULL,'','2026-01-04 19:19:00',NULL),('9c6e8a47-ec2d-4ee5-9e97-54ee0337a87f','8db511e9-9362-4bbf-ac09-e266c7f9b052','deduct','transfer_out',-70000.00,NULL,NULL,'7e8e362a-2c23-42f5-8109-97ca3f2f64be',NULL,NULL,'调货给 喀什M','2026-01-06 16:08:37',NULL),('a689c5f5-ee5e-4dd7-b859-36bb882791df','7e8e362a-2c23-42f5-8109-97ca3f2f64be','recharge','payment',50000.00,NULL,NULL,NULL,NULL,NULL,NULL,'2026-01-06 16:07:27','f8ff1ea8-9c33-4b03-b25a-e14ce8af0863'),('b6bccd14-ef72-4b2c-b5d2-20e4eaa8b8e9','7e8e362a-2c23-42f5-8109-97ca3f2f64be','deduct','shipping',-70000.00,NULL,'e2ae046b-a8d2-491a-900f-5fde4e721076',NULL,NULL,NULL,'发货扣款','2026-01-06 08:33:48',NULL),('c92ea1de-7fe5-41da-be65-4b79c1abfc1d','7e8e362a-2c23-42f5-8109-97ca3f2f64be','recharge','transfer_in',70000.00,NULL,NULL,'8db511e9-9362-4bbf-ac09-e266c7f9b052','92a66608-e988-11f0-88fe-00163e0fcc94',1000,'王五 调货','2026-01-06 16:08:00',NULL);
/*!40000 ALTER TABLE `transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `truck_types`
--

DROP TABLE IF EXISTS `truck_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `truck_types` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '车型名称',
  `min_weight` decimal(10,2) NOT NULL COMMENT '最小载重(kg)',
  `max_weight` decimal(10,2) NOT NULL COMMENT '最大载重(kg)',
  `is_default` tinyint(1) DEFAULT '0' COMMENT '是否默认车型',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `truck_types`
--

LOCK TABLES `truck_types` WRITE;
/*!40000 ALTER TABLE `truck_types` DISABLE KEYS */;
INSERT INTO `truck_types` VALUES ('truck1','标准整车',35300.00,35400.00,0,'2025-12-30 11:56:49','2026-01-06 09:22:06'),('truck2','小型货车',15000.00,15500.00,1,'2025-12-30 11:56:49','2026-01-06 09:22:06');
/*!40000 ALTER TABLE `truck_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `upload_records`
--

DROP TABLE IF EXISTS `upload_records`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `upload_records` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `filename` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文件名',
  `file_hash` varchar(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '文件哈希（可选）',
  `upload_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '上传类型：recharge/order等',
  `related_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联ID',
  `agent_id` varchar(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '上传代理ID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_filename` (`filename`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `upload_records`
--

LOCK TABLES `upload_records` WRITE;
/*!40000 ALTER TABLE `upload_records` DISABLE KEYS */;
/*!40000 ALTER TABLE `upload_records` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-01-07  2:34:15
