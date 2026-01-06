import type { Product, Agent, Order, Transaction, Promotion, Driver } from '@/types'

// 模拟商品数据
export const mockProducts: Product[] = [
  {
    id: 'p1',
    name: '芒果果汁',
    image: 'https://picsum.photos/seed/mango-juice/200/200',
    price: 299,
    weight: 2.5,
    materials: [
      'https://picsum.photos/seed/mango1/400/400',
      'https://picsum.photos/seed/mango2/400/400',
      'https://picsum.photos/seed/mango3/400/400',
      'https://picsum.photos/seed/mango4/400/400',
      'https://picsum.photos/seed/mango5/400/400'
    ],
    netdiskUrl: 'https://pan.baidu.com/s/1example-mango',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'p2',
    name: '金桂茶',
    image: 'https://picsum.photos/seed/osmanthus-tea/200/200',
    price: 399,
    weight: 3.0,
    materials: [
      'https://picsum.photos/seed/osmanthus1/400/400',
      'https://picsum.photos/seed/osmanthus2/400/400',
      'https://picsum.photos/seed/osmanthus3/400/400'
    ],
    netdiskUrl: 'https://pan.baidu.com/s/1example-osmanthus',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'p3',
    name: '茉莉茶',
    image: 'https://picsum.photos/seed/jasmine-tea/200/200',
    price: 499,
    weight: 3.5,
    materials: [
      'https://picsum.photos/seed/jasmine1/400/400',
      'https://picsum.photos/seed/jasmine2/400/400',
      'https://picsum.photos/seed/jasmine3/400/400',
      'https://picsum.photos/seed/jasmine4/400/400'
    ],
    netdiskUrl: 'https://pan.baidu.com/s/1example-jasmine',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: 'p4',
    name: '龙井茶',
    image: 'https://picsum.photos/seed/longjing-tea/200/200',
    price: 599,
    weight: 4.0,
    materials: [
      'https://picsum.photos/seed/longjing1/400/400',
      'https://picsum.photos/seed/longjing2/400/400'
    ],
    netdiskUrl: 'https://pan.baidu.com/s/1example-longjing',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  }
]

// 模拟代理数据
export const mockAgents: Agent[] = [
  {
    id: 'a1',
    avatar: 'https://ui-avatars.com/api/?name=张三&background=2563EB&color=fff&size=128',
    name: '张三',
    phone1: '13800138001',
    phone2: '13900139001',
    address: '北京市朝阳区建国路88号',
    yearlyTargets: { productA: 500, mixed: 300 },
    balance: 15000,
    createdAt: '2024-01-01',
    updatedAt: '2024-12-01'
  },
  {
    id: 'a2',
    avatar: 'https://ui-avatars.com/api/?name=李四&background=10B981&color=fff&size=128',
    name: '李四',
    phone1: '13800138002',
    address: '上海市浦东新区陆家嘴环路1000号',
    yearlyTargets: { productA: 400, mixed: 250 },
    balance: -1500,
    createdAt: '2024-01-15',
    updatedAt: '2024-12-01'
  },
  {
    id: 'a3',
    avatar: 'https://ui-avatars.com/api/?name=王五&background=F59E0B&color=fff&size=128',
    name: '王五',
    phone1: '13800138003',
    address: '广州市天河区珠江新城花城大道',
    yearlyTargets: { productA: 600, mixed: 400 },
    balance: 28500,
    createdAt: '2024-02-01',
    updatedAt: '2024-12-01'
  },
  {
    id: 'a4',
    avatar: 'https://ui-avatars.com/api/?name=赵六&background=8B5CF6&color=fff&size=128',
    name: '赵六',
    phone1: '13800138004',
    phone2: '13900139004',
    address: '深圳市南山区科技园南区',
    yearlyTargets: { productA: 350, mixed: 200 },
    balance: 8200,
    createdAt: '2024-03-01',
    updatedAt: '2024-12-01'
  }
]

// 模拟订单数据
export const mockOrders: Order[] = [
  {
    id: 'o1',
    agentId: 'a1',
    agentName: '张三',
    items: [
      { productId: 'p1', productName: '芒果果汁', quantity: 50, price: 299, weight: 2.5 },
      { productId: 'p2', productName: '金桂茶', quantity: 30, price: 399, weight: 3.0 }
    ],
    totalWeight: 215,
    totalAmount: 26920,
    driverPhone: '13600136001',
    status: 'completed',
    images: [],
    createdAt: '2024-12-20 10:30:00',
    shippedAt: '2024-12-20 14:00:00',
    completedAt: '2024-12-21 09:00:00'
  },
  {
    id: 'o2',
    agentId: 'a2',
    agentName: '李四',
    items: [
      { productId: 'p1', productName: '芒果果汁', quantity: 100, price: 299, weight: 2.5 }
    ],
    totalWeight: 250,
    totalAmount: 29900,
    driverPhone: '13600136002',
    promotionId: 'promo1',
    giftItems: [{ productId: 'p2', productName: '金桂茶', quantity: 8 }],
    status: 'shipped',
    images: [],
    createdAt: '2024-12-25 09:00:00',
    shippedAt: '2024-12-25 15:00:00'
  },
  {
    id: 'o3',
    agentId: 'a3',
    agentName: '王五',
    items: [
      { productId: 'p3', productName: '茉莉茶', quantity: 40, price: 499, weight: 3.5 },
      { productId: 'p4', productName: '龙井茶', quantity: 20, price: 599, weight: 4.0 }
    ],
    totalWeight: 220,
    totalAmount: 31940,
    driverPhone: '13600136001',
    status: 'pending',
    images: [],
    createdAt: '2024-12-27 08:00:00'
  }
]

// 模拟交易流水
export const mockTransactions: Transaction[] = [
  {
    id: 't1',
    agentId: 'a1',
    agentName: '张三',
    type: 'recharge',
    reason: 'payment',
    amount: 50000,
    proof: '/static/images/proof-1.png',
    createdAt: '2024-12-01 10:00:00'
  },
  {
    id: 't2',
    agentId: 'a1',
    agentName: '张三',
    type: 'deduct',
    reason: 'shipping',
    amount: -26920,
    relatedOrderId: 'o1',
    orderItems: [
      { productName: '芒果果汁', quantity: 50 },
      { productName: '金桂茶', quantity: 30 }
    ],
    createdAt: '2024-12-20 10:30:00'
  },
  {
    id: 't3',
    agentId: 'a2',
    agentName: '李四',
    type: 'recharge',
    reason: 'payment',
    amount: 30000,
    proof: '/static/images/proof-2.png',
    createdAt: '2024-12-15 14:00:00'
  },
  {
    id: 't4',
    agentId: 'a2',
    agentName: '李四',
    type: 'deduct',
    reason: 'shipping',
    amount: -29900,
    relatedOrderId: 'o2',
    orderItems: [
      { productName: '芒果果汁', quantity: 100 }
    ],
    createdAt: '2024-12-25 09:00:00'
  },
  {
    id: 't5',
    agentId: 'a3',
    agentName: '王五',
    type: 'recharge',
    reason: 'gift',
    amount: 5000,
    remark: '年度优秀代理奖励',
    createdAt: '2024-12-10 09:00:00'
  },
  {
    id: 't6',
    agentId: 'a1',
    agentName: '张三',
    type: 'recharge',
    reason: 'transfer_in',
    amount: 5000,
    relatedAgentId: 'a2',
    remark: '李四调货给张三',
    createdAt: '2024-12-22 11:00:00'
  },
  {
    id: 't7',
    agentId: 'a2',
    agentName: '李四',
    type: 'deduct',
    reason: 'transfer_out',
    amount: -5000,
    relatedAgentId: 'a1',
    remark: '调货给张三',
    createdAt: '2024-12-22 11:00:00'
  }
]

// 模拟促销活动
export const mockPromotions: Promotion[] = [
  {
    id: 'promo1',
    name: '芒果果汁促销',
    description: '芒果果汁买100箱送8箱随机茶',
    threshold: 100,
    gifts: [{ productId: 'p2', productName: '金桂茶', quantity: 8 }], // 随机茶，mock数据中用金桂茶代表
    isActive: true,
    startDate: '2024-12-01',
    endDate: '2025-12-31'
  },
  {
    id: 'promo2',
    name: '茶类产品促销',
    description: '茶类产品买100箱送6箱随机茶',
    threshold: 100,
    gifts: [{ productId: 'p2', productName: '金桂茶', quantity: 6 }], // 随机茶，mock数据中用金桂茶代表
    isActive: true,
    startDate: '2024-12-01',
    endDate: '2025-12-31'
  }
]

// 模拟司机数据
export const mockDrivers: Driver[] = [
  { id: 'd1', name: '刘师傅', phone: '13600136001' },
  { id: 'd2', name: '陈师傅', phone: '13600136002' },
  { id: 'd3', name: '周师傅', phone: '13600136003' }
]

// 获取代理业绩统计
export function getAgentPerformance(agentId: string) {
  const agent = mockAgents.find(a => a.id === agentId)
  if (!agent) return null
  
  // 模拟完成数据
  const completedA = Math.floor(agent.yearlyTargets.productA * 0.72)
  const completedMixed = Math.floor(agent.yearlyTargets.mixed * 0.65)
  
  return {
    agentId,
    yearlyStats: {
      productA: {
        target: agent.yearlyTargets.productA,
        completed: completedA,
        percentage: Math.round((completedA / agent.yearlyTargets.productA) * 100)
      },
      mixed: {
        target: agent.yearlyTargets.mixed,
        completed: completedMixed,
        percentage: Math.round((completedMixed / agent.yearlyTargets.mixed) * 100)
      }
    },
    promotionProgress: {
      purchased: 280,
      giftsEarned: [{ productId: 'p2', productName: '金桂茶', quantity: 14 }]
    }
  }
}

// 获取全局统计
export function getGlobalStatistics() {
  return {
    totalShipments: 1580,
    productStats: [
      { productId: 'p1', productName: '芒果果汁', quantity: 680 },
      { productId: 'p2', productName: '金桂茶', quantity: 420 },
      { productId: 'p3', productName: '茉莉茶', quantity: 280 },
      { productId: 'p4', productName: '龙井茶', quantity: 200 }
    ],
    last30DaysShipments: 320,
    last30DaysProductStats: [
      { productId: 'p1', productName: '芒果果汁', quantity: 150 },
      { productId: 'p2', productName: '金桂茶', quantity: 80 },
      { productId: 'p3', productName: '茉莉茶', quantity: 55 },
      { productId: 'p4', productName: '龙井茶', quantity: 35 }
    ]
  }
}

