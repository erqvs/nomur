// 商品类型
export interface Product {
  id: string
  name: string
  image: string
  price: number
  weight: number // 单位：kg
  materials: string[] // 素材库图片URLs
  netdiskUrl?: string // 百度网盘链接（大文件）
  createdAt: string
  updatedAt: string
}

// 代理商类型
export interface Agent {
  id: string
  avatar: string
  name: string
  phone1: string
  phone2?: string
  address: string
  yearlyTargets: YearlyTarget
  balance: number // 余额（可为负数表示欠款）
  sortOrder?: number // 排序顺序（数字越小越靠前）
  createdAt: string
  updatedAt: string
}

// 组合目标类型
export interface GroupTarget {
  products: string[]  // 产品ID数组
  target: number  // 总目标
}

// 年度目标：可以是单个产品目标（number）或组合目标（GroupTarget）
// 单个产品：{ "p1": 10000 }
// 组合目标（旧格式）：{ "_group_1": { products: ["p2", "p3"], target: 30000 } }
// 组合目标（新格式，使用组合ID）：{ "group_xxx": { products: ["p2", "p3"], target: 30000, groupId: "xxx" } }
export type YearlyTarget = {
  [key: string]: number | GroupTarget
}

// 组合目标类型（增强版，支持组合ID）
export interface GroupTarget {
  products: string[]  // 产品ID数组（保留兼容性）
  target: number  // 总目标
  groupId?: string // 组合ID（如果使用产品组合功能）
}

// 订单项
export interface OrderItem {
  productId: string
  productName: string
  quantity: number
  price: number
  weight: number
  // 组合商品信息（如果该商品是组合商品的一部分）
  groupId?: string
  groupName?: string
  groupQuantity?: number // 组合数量（如果该商品属于组合）
}

// 赠品项
export interface GiftItem {
  productId: string
  productName: string
  quantity: number
}

// 赠品送达状态
export interface GiftStatus {
  productId: string
  productName: string
  totalQuantity: number
  deliveredQuantity: number
  undeliveredQuantity: number
}

// 组合赠品信息
export interface GroupGiftInfo {
  groupId: string
  groupName: string
  totalRequirement: number // 组合总要求（箱）
  deliveredTotal: number // 已送达合计（箱）
  remainingQuantity: number // 剩余需要送达（箱）
  isCompleted: boolean // 是否已完成
  products: Array<{
    productId: string
    productName: string
    quantity: number // 订单中该产品的赠品数量
    deliveredQuantity: number // 该产品已送达数量
  }>
}

// 订单类型
export interface Order {
  id: string
  agentId: string
  agentName: string
  items: OrderItem[]
  totalWeight: number
  totalAmount: number
  driverPhone: string
  promotionId?: string | string[] // 促销ID（支持多个）
  promotionNames?: string[] // 促销活动名称列表
  giftItems?: GiftItem[]
  giftStatusList?: GiftStatus[] // 搭赠送达状态列表（单个产品赠品）
  groupGiftInfo?: GroupGiftInfo // 组合赠品信息
  images: string[] // 订单相关图片
  remark?: string
  createdAt: string
}

// 交易类型
export interface Transaction {
  id: string
  agentId: string
  agentName: string
  type: TransactionType
  reason: TransactionReason
  amount: number // 正数为入账，负数为扣款
  proof?: string | string[] // 凭证图片（支持单张或多张）
  relatedOrderId?: string
  relatedAgentId?: string // 调货时的关联代理
  remark?: string
  orderItems?: Array<{ productName: string; quantity: number }> // 关联订单商品
  paymentAccountId?: string // 收款账户ID
  paymentAccountName?: string // 收款账户名称
  createdAt: string
}

export type TransactionType = 'recharge' | 'deduct'

export type TransactionReason = 
  | 'gift'          // 赠送
  | 'payment'       // 代理打款
  | 'freight'       // 运费
  | 'shipping'      // 发货扣款
  | 'fine'          // 罚款
  | 'transfer_in'   // 调货收入（退款）
  | 'transfer_out'  // 调货支出（扣款）
  | 'marketing'     // 营销送礼退款
  | 'withdraw'      // 提现
  | 'fee'           // 手续费
  | 'other'         // 其他

// 产品组合
export interface ProductGroup {
  id: string
  name: string // 组合名称，如"茶类产品组合"
  description?: string // 组合描述
  productIds: string[] // 包含的产品ID列表
  createdAt: string
  updatedAt: string
}

// 促销条件详情
export interface ConditionDetail {
  type: 'product' | 'group' // 类型：单个产品或组合
  productId?: string // 产品ID（type为product时）
  groupId?: string // 组合ID（type为group时）
  quantity: number // 触发数量
}

// 促销活动
export interface Promotion {
  id: string
  name: string
  description: string
  threshold: number // 满多少件（向后兼容，取所有条件中的最小值）
  conditionProducts?: string[] // 触发条件的产品ID列表（向后兼容）
  conditionGroupId?: string // 触发条件的组合ID（向后兼容）
  conditionDetails?: ConditionDetail[] // 条件详情：每个条件产品/组合的数量（新字段）
  gifts: GiftItem[] // 赠送商品
  isActive: boolean
  startDate: string
  endDate: string
}

// 司机信息
export interface Driver {
  id: string
  name: string
  phone: string
}

// 统计数据
export interface Statistics {
  totalShipments: number // 总发货箱数
  productStats: ProductStats[] // 分产品统计
  last30DaysShipments: number // 最近30天出库
  last30DaysProductStats: ProductStats[]
}

export interface ProductStats {
  productId: string
  productName: string
  quantity: number
}

// 代理业绩
export interface AgentPerformance {
  agentId: string
  yearlyStats: {
    [productId: string]: {
      target: number
      completed: number
      percentage: number
    }
  }
  promotionProgress?: {
    purchased: number
    giftsEarned: GiftItem[]
  }
}

// API响应格式
export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

// 分页
export interface Pagination {
  page: number
  pageSize: number
  total: number
}

export interface PaginatedData<T> {
  list: T[]
  pagination: Pagination
}


// 搭赠送达记录
export interface GiftDeliveryRecord {
  id: string
  orderId: string
  agentId: string
  productId?: string
  productName?: string
  groupId?: string
  groupName?: string
  quantity: number
  deliveredBy?: string
  deliveredByName?: string
  remark?: string
  createdAt: string
}
