import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Product, Agent, Order, Transaction, Promotion, Driver } from '@/types'
import { productApi, agentApi, driverApi, promotionApi, orderApi, transactionApi, statisticsApi } from '@/api'

export const useAppStore = defineStore('app', () => {
  // 用户角色
  const userRole = ref<'admin' | 'agent'>('admin')
  const currentAgentId = ref<string>('a1') // 当前代理ID（代理端使用）
  
  // 当前管理员信息（用于权限控制）
  const currentAdmin = ref<{
    id: string
    name: string
    role: 'admin' | 'super_admin'
  } | null>(null)
  
  // 是否为超级管理员
  const isSuperAdmin = computed(() => currentAdmin.value?.role === 'super_admin')
  
  // 数据状态
  const products = ref<Product[]>([])
  const agents = ref<Agent[]>([])
  const orders = ref<Order[]>([])
  const transactions = ref<Transaction[]>([])
  const promotions = ref<Promotion[]>([])
  const drivers = ref<Driver[]>([])
  const statistics = ref({
    totalShipments: 0,
    last30DaysShipments: 0,
    productStats: [] as { productId: string; productName: string; quantity: number }[],
    last30DaysProductStats: [] as { productId: string; productName: string; quantity: number }[]
  })
  
  // 加载状态
  const loading = ref(false)
  
  // 获取当前代理信息
  const currentAgent = computed(() => {
    return agents.value.find(a => a.id === currentAgentId.value)
  })
  
  // 全局统计
  const globalStats = computed(() => statistics.value)
  
  // ==================== 数据加载方法 ====================
  
  // 加载商品
  const loadProducts = async () => {
    try {
      products.value = await productApi.getAll()
    } catch (error) {
      console.error('加载商品失败:', error)
    }
  }
  
  // 加载代理商
  const loadAgents = async () => {
    try {
      agents.value = await agentApi.getAll()
    } catch (error) {
      console.error('加载代理商失败:', error)
    }
  }
  
  // 加载司机
  const loadDrivers = async () => {
    try {
      drivers.value = await driverApi.getAll()
    } catch (error) {
      console.error('加载司机失败:', error)
    }
  }
  
  // 加载促销活动
  const loadPromotions = async () => {
    try {
      promotions.value = await promotionApi.getAll()
    } catch (error) {
      console.error('加载促销活动失败:', error)
    }
  }
  
  // 加载订单
  const loadOrders = async (agentId?: string) => {
    try {
      orders.value = await orderApi.getAll(agentId)
    } catch (error) {
      console.error('加载订单失败:', error)
    }
  }
  
  // 加载交易流水
  const loadTransactions = async (agentId?: string) => {
    try {
      transactions.value = await transactionApi.getAll(agentId)
    } catch (error) {
      console.error('加载交易流水失败:', error)
    }
  }
  
  // 加载统计数据
  const loadStatistics = async () => {
    try {
      statistics.value = await statisticsApi.get()
    } catch (error) {
      console.error('加载统计数据失败:', error)
    }
  }
  
  // 初始化所有数据
  const initData = async () => {
    loading.value = true
    try {
      await Promise.all([
        loadProducts(),
        loadAgents(),
        loadDrivers(),
        loadPromotions(),
        loadOrders(),
        loadTransactions(),
        loadStatistics()
      ])
    } finally {
      loading.value = false
    }
  }
  
  // ==================== 业务方法 ====================
  
  // 获取代理业绩（已废弃，请使用API获取统计）
  const getAgentStats = (agentId: string) => {
    const agent = agents.value.find(a => a.id === agentId)
    if (!agent) return null
    
    // 计算完成情况（从订单统计）- 按商品ID统计
    const agentOrders = orders.value.filter(o => o.agentId === agentId)
    const completedByProduct: { [productId: string]: number } = {}
    
    agentOrders.forEach(order => {
      order.items.forEach(item => {
        const productId = item.productId
        if (productId) {
          completedByProduct[productId] = (completedByProduct[productId] || 0) + item.quantity
        }
      })
    })
    
    // 构建年度统计（只包含有目标的商品）
    const yearlyStats: { [productId: string]: { target: number; completed: number; percentage: number } } = {}
    Object.keys(agent.yearlyTargets).forEach(productId => {
      const target = agent.yearlyTargets[productId] || 0
      const completed = completedByProduct[productId] || 0
      yearlyStats[productId] = {
        target,
        completed,
        percentage: target > 0 ? Math.round((completed / target) * 100) : 0
      }
    })
    
    return {
      agentId,
      yearlyStats,
      promotionProgress: {
        purchased: Object.values(completedByProduct).reduce((sum, qty) => sum + qty, 0),
        giftsEarned: []
      }
    }
  }
  
  // 获取代理订单
  const getAgentOrders = (agentId: string) => {
    return orders.value.filter(o => o.agentId === agentId)
  }
  
  // 获取代理流水
  const getAgentTransactions = (agentId: string) => {
    return transactions.value.filter(t => t.agentId === agentId)
  }
  
  // 添加商品
  const addProduct = async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
    const result = await productApi.create(product)
    await loadProducts()
    return result
  }
  
  // 更新商品
  const updateProduct = async (id: string, product: Partial<Product>) => {
    await productApi.update(id, product)
    await loadProducts()
  }
  
  // 删除商品
  const deleteProduct = async (id: string) => {
    await productApi.delete(id)
    await loadProducts()
  }
  
  // 添加代理
  const addAgent = async (agent: Omit<Agent, 'id' | 'createdAt' | 'updatedAt' | 'balance'>) => {
    const result = await agentApi.create(agent)
    await loadAgents()
    return result
  }
  
  // 创建订单
  const createOrder = async (order: {
    agentId: string
    agentName: string
    items: any[]
    totalWeight: number
    totalAmount: number
    driverPhone?: string
    promotionId?: string
    giftItems?: any[]
    images?: string[]
  }) => {
    const result = await orderApi.create({
      agentId: order.agentId,
      items: order.items,
      totalWeight: order.totalWeight,
      totalAmount: order.totalAmount,
      driverPhone: order.driverPhone,
      promotionId: order.promotionId,
      giftItems: order.giftItems,
      images: order.images
    })
    
    // 刷新数据（包括统计数据，以便驾驶舱自动更新）
    await Promise.all([loadOrders(), loadAgents(), loadTransactions(), loadStatistics()])
    return result
  }
  
  // 充值
  const recharge = async (
    agentId: string, 
    amount: number, 
    reason: 'gift' | 'payment' | 'freight', 
    proof?: string,
    remark?: string,
    paymentAccountId?: string
  ) => {
    const result = await transactionApi.recharge({ agentId, amount, reason, proof, remark, paymentAccountId })
    await Promise.all([loadAgents(), loadTransactions()])
    return result
  }
  
  // 扣款
  const deduct = async (
    agentId: string,
    amount: number,
    reason: 'fine' | 'shipping',
    remark?: string,
    productId?: string,
    quantity?: number
  ) => {
    const result = await transactionApi.deduct({ agentId, amount, reason, remark, productId, quantity })
    await Promise.all([loadAgents(), loadTransactions()])
    return result
  }
  
  // 调货
  const transfer = async (fromAgentId: string, toAgentId: string, amount: number, productId?: string, quantity?: number, remark?: string) => {
    const result = await transactionApi.transfer({ fromAgentId, toAgentId, amount, productId, quantity, remark })
    await Promise.all([loadAgents(), loadTransactions()])
    return result
  }
  
  // 切换角色
  const switchRole = (role: 'admin' | 'agent') => {
    userRole.value = role
  }
  
  // 设置当前管理员信息
  const setCurrentAdmin = (admin: { id: string; name: string; role: 'admin' | 'super_admin' } | null) => {
    currentAdmin.value = admin
  }
  
  return {
    // 状态
    userRole,
    currentAgentId,
    currentAdmin,
    products,
    agents,
    orders,
    transactions,
    promotions,
    drivers,
    loading,
    
    // 计算属性
    currentAgent,
    globalStats,
    isSuperAdmin,
    
    // 加载方法
    initData,
    loadProducts,
    loadAgents,
    loadDrivers,
    loadPromotions,
    loadOrders,
    loadTransactions,
    loadStatistics,
    
    // 业务方法
    getAgentStats,
    getAgentOrders,
    getAgentTransactions,
    addProduct,
    updateProduct,
    deleteProduct,
    addAgent,
    createOrder,
    recharge,
    deduct,
    transfer,
    switchRole,
    setCurrentAdmin
  }
})
