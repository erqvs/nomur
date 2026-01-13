// API 请求封装
// H5 走同域 Nginx 反代 (/api -> 127.0.0.1:3001)
// 微信小程序端必须使用完整 HTTPS 域名（否则会被视为非法/无效 URL）
const BASE_URL = (() => {
  // #ifdef MP-WEIXIN
  return 'https://100nomur.net/api'
  // #endif
  return '/api'
})()

interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

// 通用请求方法
// 注意：此函数不再自动显示toast，由调用方决定如何处理错误
type RequestOptionsWithoutUrl = Omit<UniApp.RequestOptions, 'url'> & {
  customHeader?: Record<string, string>
}

async function request<T>(url: string, options: RequestOptionsWithoutUrl = {}): Promise<T> {
  const { customHeader, ...restOptions } = options
  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${url}`,
      ...restOptions,
      header: {
        ...(restOptions.header as Record<string, string> || {}),
        ...(customHeader || {})
      },
      success: (res) => {
        try {
          // 检查HTTP状态码
          if (res.statusCode >= 200 && res.statusCode < 300) {
            const data = res.data as ApiResponse<T>
            if (data.code === 0) {
              resolve(data.data)
            } else {
              const errorMessage = data.message || '请求失败'
              reject(new Error(errorMessage))
            }
          } else {
            // HTTP状态码错误（400、500等）
            const data = res.data as ApiResponse<T>
            const errorMessage = data?.message || `请求失败 (${res.statusCode})`
            reject(new Error(errorMessage))
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '请求处理失败'
          reject(error)
        }
      },
      fail: (err) => {
        // 在H5平台，某些HTTP错误可能会触发fail回调
        // 尝试从err中获取错误信息
        const errorMessage = (err as any)?.message || (err as any)?.errMsg || '网络错误'
        reject(new Error(errorMessage))
      }
    })
  })
}

// ==================== 商品 API ====================
export const productApi = {
  // 获取所有商品
  getAll: () => request<Product[]>('/products'),
  
  // 创建商品
  create: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => 
    request<{ id: string }>('/products', { method: 'POST', data }),
  
  // 更新商品
  update: (id: string, data: Partial<Product>) =>
    request('/products/' + id, { method: 'PUT', data }),
  
  // 删除商品
  delete: (id: string) => request('/products/' + id, { method: 'DELETE' })
}

// ==================== 代理商 API ====================
export const agentApi = {
  // 获取所有代理商
  getAll: () => request<Agent[]>('/agents'),
  
  // 获取单个代理商
  getById: (id: string) => request<Agent>('/agents/' + id),
  
  // 创建代理商
  create: (data: Omit<Agent, 'id' | 'createdAt' | 'updatedAt' | 'balance' | 'sortOrder'>) =>
    request<{ id: string }>('/agents', { method: 'POST', data }),
  
  // 更新代理商
  update: (id: string, data: Partial<Agent>) =>
    request('/agents/' + id, { method: 'PUT', data }),
  
  // 批量更新代理商排序
  updateSort: (sortList: Array<{ id: string; sortOrder: number }>) =>
    request('/agents/sort', { method: 'PUT', data: { sortList } }),
  
  // 获取代理商统计
  getStatistics: (id: string) => request<{
    yearlyStats: { [productId: string]: { target: number; completed: number; percentage: number } }
    totalGiftsReceived: number
  }>('/agents/' + id + '/statistics'),
  
  // 获取代理商搭赠情况
  getGifts: (id: string) => request<Array<{
    productId?: string
    groupId?: string
    productName?: string
    groupName?: string
    totalQuantity: number
    deliveredQuantity: number
    undeliveredQuantity: number
    isGroup?: boolean
  }>>('/agents/' + id + '/gifts'),
  
  // 获取代理商促销活动进度
  getPromotionProgress: (id: string) => request<Array<{
    promotionId: string
    purchased: number
    giftsReceived: number
  }>>('/agents/' + id + '/promotions/progress'),
  
  // 更新代理商搭赠数量
  updateGifts: (id: string, gifts: Array<{
    productId: string
    productName: string
    deliveredQuantity: number
  }>) => request('/agents/' + id + '/gifts', {
    method: 'PUT',
    data: { gifts }
  }),
  
  // 删除代理商
  delete: (id: string) => request('/agents/' + id, { method: 'DELETE' })
}

// ==================== 司机 API ====================
export const driverApi = {
  getAll: () => request<Driver[]>('/drivers'),
  create: (data: Omit<Driver, 'id'>) => request<{ id: string }>('/drivers', { method: 'POST', data })
}

// ==================== 车型 API ====================
export interface TruckType {
  id: string
  name: string
  minWeight: number
  maxWeight: number
  isDefault: boolean
}

export const truckApi = {
  // 获取所有车型
  getAll: () => request<TruckType[]>('/truck-types'),
  
  // 创建车型
  create: (data: {
    name: string
    minWeight: number
    maxWeight: number
    isDefault: boolean
  }) => request<{ id: string }>('/truck-types', { method: 'POST', data }),
  
  // 更新车型
  update: (id: string, data: {
    name: string
    minWeight: number
    maxWeight: number
    isDefault: boolean
  }) => request('/truck-types/' + id, { method: 'PUT', data }),
  
  // 删除车型
  delete: (id: string) => request('/truck-types/' + id, { method: 'DELETE' })
}

// ==================== 促销活动 API ====================
export const promotionApi = {
  getAll: () => request<Promotion[]>('/promotions'),
  create: (data: Omit<Promotion, 'id'>) => request<{ id: string }>('/promotions', { method: 'POST', data }),
  update: (id: string, data: Partial<Promotion>) => request('/promotions/' + id, { method: 'PUT', data }),
  delete: (id: string) => request('/promotions/' + id, { method: 'DELETE' })
}

// ==================== 产品组合 API ====================
export const productGroupApi = {
  getAll: () => request<ProductGroup[]>('/product-groups'),

  create: (data: {
    name: string
    description?: string
    productIds: string[]
  }) => request<{ id: string }>('/product-groups', { method: 'POST', data }),

  update: (id: string, data: {
    name: string
    description?: string
    productIds: string[]
  }) => request('/product-groups/' + id, { method: 'PUT', data }),

  delete: (id: string) => request('/product-groups/' + id, { method: 'DELETE' })
}

// ==================== 订单 API ====================
export const orderApi = {
  // 获取订单列表
  getAll: (agentId?: string) => {
    const query = agentId ? `?agentId=${agentId}` : ''
    return request<Order[]>('/orders' + query)
  },
  
  // 获取单个订单
  getById: (id: string) => request<Order>('/orders/' + id),
  
  // 创建订单
  create: (data: {
    agentId: string
    items: OrderItem[]
    totalWeight: number
    totalAmount: number
    driverPhone?: string
    promotionId?: string
    giftItems?: GiftItem[]
    images?: string[]
    remark?: string
  }) => request<{ id: string }>('/orders', { method: 'POST', data }),
  
  // 修改订单（仅超级管理员）
  update: (id: string, data: {
    agentId: string
    items: OrderItem[]
    totalWeight: number
    totalAmount: number
    driverPhone?: string
    promotionId?: string
    giftItems?: GiftItem[]
    images?: string[]
    remark?: string
  }, adminId: string, adminRole: string) => request('/orders/' + id, { 
    method: 'PUT', 
    data,
    customHeader: {
      'admin-id': adminId,
      'admin-role': adminRole
    }
  }),
  
  // 更新订单状态（管理端可用）
  updateStatus: (id: string, status: 'pending' | 'shipped' | 'completed') =>
    request('/orders/' + id + '/status', {
      method: 'PUT',
      data: { status }
    }),
  
  // 更新订单搭赠送达状态
  updateGifts: (id: string, gifts: Array<{
    productId: string
    productName: string
    deliveredQuantity: number
  }>, remark?: string) => request('/orders/' + id + '/gifts', {
    method: 'PUT',
    data: { gifts, remark }
  }),
  
  // 获取订单的搭赠送达记录
  getGiftDeliveryRecords: (id: string) => request<GiftDeliveryRecord[]>('/orders/' + id + '/gift-delivery-records'),
  
  // 删除送达记录（仅管理员）
  deleteGiftDeliveryRecord: (orderId: string, recordId: string, adminId: string, adminRole: string) => request('/orders/' + orderId + '/gift-delivery-records/' + recordId, {
    method: 'DELETE',
    customHeader: {
      'admin-id': adminId,
      'admin-role': adminRole
    }
  }),
  
  // 删除订单（仅超级管理员）
  delete: (id: string, adminId: string, adminRole: string) => request('/orders/' + id, {
    method: 'DELETE',
    customHeader: {
      'admin-id': adminId,
      'admin-role': adminRole
    }
  })
}

// ==================== 交易流水 API ====================
export const transactionApi = {
  // 获取交易流水
  getAll: (agentId?: string) => {
    const query = agentId ? `?agentId=${agentId}` : ''
    return request<Transaction[]>('/transactions' + query)
  },
  
  // 充值
  recharge: (data: {
    agentId: string
    amount: number
    reason: 'gift' | 'payment' | 'freight'
    proof?: string
    remark?: string
    paymentAccountId?: string
  }) => request<{ id: string }>('/transactions/recharge', { method: 'POST', data }),
  
  // 扣款
  deduct: (data: {
    agentId: string
    amount: number
    reason: 'fine' | 'shipping'
    remark?: string
    productId?: string
    quantity?: number
    orderItems?: Array<{ productId: string; productName: string; quantity: number; price: number; weight: number }>
  }) => request<{ id: string }>('/transactions/deduct', { method: 'POST', data }),
  
  // 调货
  transfer: (data: {
    fromAgentId: string
    toAgentId: string
    amount: number
    productId?: string
    quantity?: number
    orderItems?: Array<{ productId: string; productName: string; quantity: number; price: number; weight: number }>
    remark?: string
  }) => request<{ inTxId: string; outTxId: string }>('/transactions/transfer', { method: 'POST', data }),
  
  // 修改交易记录（管理端可用）
  update: (id: string, data: {
    agentId: string
    amount: number
    reason: TransactionReason
    remark?: string
    paymentAccountId?: string
    proof?: string | string[]
  }, adminId: string, adminRole: string) => request('/transactions/' + id, {
    method: 'PUT',
    data,
    customHeader: {
      'admin-id': adminId,
      'admin-role': adminRole
    }
  }),
  
  // 删除交易记录（仅超级管理员）
  delete: (id: string, adminId: string, adminRole: string) => request('/transactions/' + id, {
    method: 'DELETE',
    customHeader: {
      'admin-id': adminId,
      'admin-role': adminRole
    }
  })
}

// ==================== 收款账户 API ====================
export const paymentAccountApi = {
  // 获取所有收款账户
  getAll: () => request('/payment-accounts'),
  
  // 创建收款账户
  create: (data: {
    name: string
    accountNo?: string
    bankName?: string
    qrCode?: string
  }) => request<{ id: string }>('/payment-accounts', { method: 'POST', data }),
  
  // 获取收款账户的收款明细
  getTransactions: (id: string) => request<{ transactions: Transaction[]; summary: { totalCount: number; totalAmount: number } }>('/payment-accounts/' + id + '/transactions'),
  
  // 获取收款账户余额明细
  getBalanceDetails: (id: string) => request<{
    account: { id: string; name: string; balance: number }
    transactions: Transaction[]
  }>('/payment-accounts/' + id + '/balance-details'),
  
  // 收款账户扣费
  deduct: (id: string, data: { amount: number; reason: string; remark?: string }) =>
    request<{ id: string }>('/payment-accounts/' + id + '/deduct', { method: 'POST', data }),
  
  // 更新收款账户
  update: (id: string, data: {
    name: string
    accountNo?: string
    bankName?: string
    qrCode?: string
  }) => request('/payment-accounts/' + id, { method: 'PUT', data }),
  
  // 更新收款账户余额
  updateBalance: (id: string, balance: number) =>
    request('/payment-accounts/' + id + '/balance', { method: 'PUT', data: { balance } }),
  
  // 删除收款账户
  delete: (id: string) => request('/payment-accounts/' + id, { method: 'DELETE' })
}

// ==================== 统计 API ====================
export const statisticsApi = {
  get: () => request<{
    totalShipments: number
    last30DaysShipments: number
    productStats: { productId: string; productName: string; quantity: number }[]
    last30DaysProductStats: { productId: string; productName: string; quantity: number }[]
  }>('/statistics')
}

// ==================== 数据补充 API ====================
export const supplementApi = {
  // 补充销售数据
  create: (agentId: string, data: {
    productType: 'productA' | 'mixed'
    quantity: number
    saleDate?: string
    remark?: string
  }) => request<{ id: string }>('/agents/' + agentId + '/supplement-sales', { method: 'POST', data }),
  
  // 获取补充数据记录
  getByAgent: (agentId: string) => request<Array<{
    id: string
    agentId: string
    productType: string
    quantity: number
    saleDate: string
    remark?: string
    createdAt: string
  }>>('/agents/' + agentId + '/supplement-sales'),
  
  // 删除补充数据
  delete: (id: string) => request('/supplement-sales/' + id, { method: 'DELETE' })
}

// ==================== 文件上传 API ====================
interface UploadResponse {
  url: string
  filename: string
  originalName: string
  size: number
}

export const uploadApi = {
  // 单文件上传
  uploadSingle: (filePath: string): Promise<UploadResponse> => {
    return new Promise((resolve, reject) => {
      uni.uploadFile({
        url: `${BASE_URL}/upload`,
        filePath: filePath,
        name: 'file',
        success: (res) => {
          try {
            const data = JSON.parse(res.data) as ApiResponse<UploadResponse>
            if (data.code === 0) {
              resolve(data.data)
            } else {
              uni.showToast({ title: data.message, icon: 'none' })
              reject(new Error(data.message))
            }
          } catch (error) {
            reject(error)
          }
        },
        fail: (err) => {
          uni.showToast({ title: '上传失败', icon: 'none' })
          reject(err)
        }
      })
    })
  },
  
  // 多文件上传
  uploadMultiple: (filePaths: string[]): Promise<UploadResponse[]> => {
    return Promise.all(filePaths.map(path => uploadApi.uploadSingle(path)))
  }
}

// 类型导入
import type {
  Product,
  Agent,
  Driver,
  Promotion,
  Order,
  OrderItem,
  GiftItem,
  Transaction,
  ProductGroup,
  TransactionReason
} from '@/types'

