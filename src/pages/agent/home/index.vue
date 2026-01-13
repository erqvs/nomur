<template>
  <view class="agent-home" v-if="agent">
    <!-- 返回按钮 -->
    <view class="back-bar" @tap="goBack">
      <image src="/static/icons/arrow-left.svg" class="back-icon" mode="aspectFit" />
      <text class="back-text">切换身份</text>
    </view>
    
    <!-- 个人信息卡片 -->
    <view class="profile-header">
      <image 
        :src="agent.avatar || '/static/images/default-avatar.svg'" 
        class="profile-header__avatar"
        mode="aspectFill"
      />
      <view class="profile-header__info">
        <text class="profile-header__name">{{ agent.name }}</text>
        <text class="profile-header__phone">{{ agent.phone1 }}</text>
      </view>
    </view>
    
    <!-- 余额卡片 -->
    <BalanceCard
      :balance="agent.balance"
      :subInfo="`点击查看余额明细`"
      @tap="goToBalance"
    />
    
    <!-- 年度目标进度 -->
    <view class="card">
      <view class="section-title">
        <text>年度任务进度</text>
        <text class="section-note">（搭赠不计入任务）</text>
      </view>
      <view v-if="performance && performance.yearlyStats" class="task-progress">
        <view 
          v-for="(stats, key, index) in performance.yearlyStats" 
          :key="key"
          class="task-item"
        >
          <view class="task-item__header">
            <view class="task-item__icon">
              <image src="/static/icons/box.svg" class="task-icon" mode="aspectFit" />
            </view>
            <text class="task-item__name">
              {{ getTargetLabel(key, stats) }}
            </text>
          </view>
          <view class="task-item__body">
            <view class="task-item__stats">
              <text class="task-item__current">{{ stats.completed }}</text>
              <text class="task-item__divider">/</text>
              <text class="task-item__target">{{ typeof stats.target === 'number' ? stats.target : 0 }}箱</text>
            </view>
            <view 
              class="progress-ring" 
              :class="{ 'progress-ring--green': index % 2 === 1 }"
              :style="{ background: `conic-gradient(${index % 2 === 1 ? '#10B981' : '#1890FF'} ${stats.percentage}%, #F5F7FA ${stats.percentage}%)` }"
            >
              <text class="progress-ring__value">{{ stats.percentage }}%</text>
            </view>
          </view>
          <view class="progress-bar progress-bar--thick">
            <view 
              class="progress-inner" 
              :class="{ 'progress-inner--green': index % 2 === 1 }"
              :style="{ width: stats.percentage + '%' }"
            ></view>
          </view>
        </view>
        <view v-if="Object.keys(performance.yearlyStats).length === 0" class="empty-targets">
          <text class="empty-text">暂未设置年度目标</text>
        </view>
      </view>
    </view>
    
    <!-- 搭赠情况 -->
    <view class="card" v-if="giftsSummary">
      <view class="section-title">搭赠情况</view>
      <view class="gifts-summary-card">
        <view class="gifts-summary-card__body">
          <view class="gifts-summary-stat">
            <text class="gifts-summary-stat__label">总数量</text>
            <text class="gifts-summary-stat__value">{{ giftsSummary.totalQuantity }}箱</text>
          </view>
          <view class="gifts-summary-stat gifts-summary-stat--success">
            <text class="gifts-summary-stat__label">已送达</text>
            <text class="gifts-summary-stat__value">{{ giftsSummary.deliveredQuantity }}箱</text>
          </view>
          <view class="gifts-summary-stat gifts-summary-stat--warning">
            <text class="gifts-summary-stat__label">未送达</text>
            <text class="gifts-summary-stat__value">{{ giftsSummary.undeliveredQuantity }}箱</text>
          </view>
        </view>
        <view class="gifts-summary-progress" v-if="giftsSummary.totalQuantity > 0">
          <view 
            class="gifts-summary-progress__inner"
            :style="{ width: Math.min(100, (giftsSummary.deliveredQuantity / giftsSummary.totalQuantity * 100)) + '%' }"
          ></view>
        </view>
      </view>
      <!-- 搭赠详情列表 -->
      <view v-if="giftsList.length > 0" class="gifts-summary-list">
        <view 
          v-for="gift in giftsList" 
          :key="gift.isGroup ? gift.groupId : gift.productId"
          class="gifts-summary-item"
        >
          <text class="gifts-summary-item__name">
            {{ gift.isGroup ? (gift.groupName || '组合赠品') : (gift.productName || '商品') }}
          </text>
          <text class="gifts-summary-item__qty">
            {{ gift.totalQuantity }}箱
            <text v-if="gift.deliveredQuantity > 0" class="gifts-summary-item__delivered">
              （已送达{{ gift.deliveredQuantity }}箱）
            </text>
          </text>
        </view>
      </view>
    </view>
    
    <!-- 快捷入口 -->
    <view class="quick-entry">
      <view class="quick-entry-item" @tap="goToBalance">
        <view class="quick-entry-item__icon">
          <image src="/static/icons/money.svg" class="entry-icon" mode="aspectFit" />
        </view>
        <text class="quick-entry-item__text">余额明细</text>
      </view>
      <view class="quick-entry-item" @tap="goToPromotions">
        <view class="quick-entry-item__icon">
          <image src="/static/icons/gift.svg" class="entry-icon" mode="aspectFit" />
        </view>
        <text class="quick-entry-item__text">促销查询</text>
      </view>
      <view class="quick-entry-item" @tap="goToOrders">
        <view class="quick-entry-item__icon">
          <image src="/static/icons/box.svg" class="entry-icon" mode="aspectFit" />
        </view>
        <text class="quick-entry-item__text">我的订单</text>
      </view>
      <view class="quick-entry-item" @tap="goToGifts">
        <view class="quick-entry-item__icon">
          <image src="/static/icons/gift.svg" class="entry-icon" mode="aspectFit" />
        </view>
        <text class="quick-entry-item__text">搭赠情况</text>
      </view>
      <view class="quick-entry-item" @tap="goToMaterials">
        <view class="quick-entry-item__icon">
          <image src="/static/icons/folder.svg" class="entry-icon" mode="aspectFit" />
        </view>
        <text class="quick-entry-item__text">素材下载</text>
      </view>
    </view>
    
    <!-- 最近订单 -->
    <view class="card">
      <view class="section-title">最近订单</view>
      <view class="order-list">
        <view 
          v-for="order in recentOrders" 
          :key="order.id"
          class="order-item"
        >
          <view class="order-item__header">
            <text class="order-item__id">#{{ order.id.slice(-6) }}</text>
          </view>
          <view class="order-item__products">
            <text v-for="item in getDisplayItems(order.items)" :key="item.key">
              {{ item.name }} x{{ item.quantity }}
            </text>
          </view>
          <!-- 搭赠信息 -->
          <view v-if="order.giftItems && order.giftItems.length > 0" class="order-item__gifts">
            <text class="order-item__gifts-label">赠品：</text>
            <text class="order-item__gifts-text">
              {{ getGiftDisplayText(order) }}
            </text>
          </view>
          <view class="order-item__footer">
            <text class="order-item__time">{{ formatOrderTime(order.createdAt) }}</text>
            <text class="order-item__amount">¥{{ order.totalAmount.toLocaleString() }}</text>
          </view>
        </view>
        
        <view v-if="recentOrders.length === 0" class="empty-state">
          <text class="empty-text">暂无订单</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { productGroupApi, agentApi } from '@/api'
import BalanceCard from '@/components/BalanceCard/index.vue'
import type { ProductGroup, AgentPerformance } from '@/types'

const store = useAppStore()

const agent = computed(() => store.currentAgent)
const performance = ref<AgentPerformance | null>(null)
const recentOrders = computed(() => store.getAgentOrders(store.currentAgentId).slice(0, 5))

// 产品组合列表（用于获取组合名称）
const productGroups = ref<ProductGroup[]>([])

// 搭赠情况
const giftsList = ref<Array<{
  productId?: string
  groupId?: string
  productName?: string
  groupName?: string
  totalQuantity: number
  deliveredQuantity: number
  undeliveredQuantity: number
  isGroup?: boolean
}>>([])
const loadingGifts = ref(false)

// 搭赠情况汇总
const giftsSummary = computed(() => {
  if (giftsList.value.length === 0) {
    return null
  }
  const total = giftsList.value.reduce((sum, gift) => sum + gift.totalQuantity, 0)
  const delivered = giftsList.value.reduce((sum, gift) => sum + gift.deliveredQuantity, 0)
  const undelivered = giftsList.value.reduce((sum, gift) => sum + gift.undeliveredQuantity, 0)
  return {
    totalQuantity: total,
    deliveredQuantity: delivered,
    undeliveredQuantity: undelivered
  }
})

onMounted(async () => {
  // 加载产品组合列表
  try {
    productGroups.value = await productGroupApi.getAll()
  } catch (error) {
    console.error('加载产品组合失败:', error)
  }
  
  // 加载促销活动列表
  try {
    await store.loadPromotions()
  } catch (error) {
    console.error('加载促销活动失败:', error)
  }
  
  // 加载代理业绩数据
  try {
    if (store.currentAgentId) {
      const stats = await agentApi.getStatistics(store.currentAgentId)
      performance.value = {
        agentId: store.currentAgentId,
        yearlyStats: stats.yearlyStats || {}
      }
    }
  } catch (error) {
    console.error('加载代理业绩失败:', error)
    // 如果API失败，使用旧的本地计算方法作为后备
    performance.value = store.getAgentStats(store.currentAgentId)
  }
  
  // 加载搭赠情况
  await loadGifts()
})

// 加载搭赠情况
const loadGifts = async () => {
  if (!store.currentAgentId) return
  
  try {
    loadingGifts.value = true
    const gifts = await agentApi.getGifts(store.currentAgentId)
    giftsList.value = gifts || []
  } catch (error) {
    console.error('加载搭赠情况失败:', error)
    giftsList.value = []
  } finally {
    loadingGifts.value = false
  }
}

// 获取商品名称
const getProductName = (productId: string) => {
  const product = store.products.find(p => p.id === productId)
  return product?.name || productId
}

// 获取目标标签（支持组合目标和单个目标）
const getTargetLabel = (key: string, stats: any): string => {
  // 确保返回字符串，避免返回对象
  if (!stats || typeof stats !== 'object') {
    // 即使 stats 为空，也尝试通过 key 判断是否是组合任务
    if (key.startsWith('_group_') || key.startsWith('group_')) {
      const groupIdMatch = key.match(/group_(.+)/)
      if (groupIdMatch && groupIdMatch[1]) {
        const groupId = groupIdMatch[1]
        const group = productGroups.value.find(g => g.id === groupId)
        if (group && group.name) {
          return group.name
        }
      }
      // 尝试从 yearlyTargets 中获取组合信息
      const currentAgent = store.agents.find(a => a.id === store.currentAgentId)
      if (currentAgent && currentAgent.yearlyTargets) {
        const groupTarget = currentAgent.yearlyTargets[key]
        if (groupTarget && typeof groupTarget === 'object' && groupTarget !== null && !Array.isArray(groupTarget)) {
          if ('groupId' in groupTarget && typeof (groupTarget as any).groupId === 'string') {
            const groupId = (groupTarget as any).groupId
            const group = productGroups.value.find(g => g.id === groupId)
            if (group && group.name) {
              return group.name
            }
          }
          if ('products' in groupTarget && Array.isArray((groupTarget as any).products)) {
            const products = (groupTarget as any).products
            if (products.length > 0) {
              return products.map((pid: string) => getProductName(pid)).join(' + ')
            }
          }
        }
      }
      return `产品组合`
    }
    return String(key)
  }
  
  // 优先检查 key 是否是组合 key（即使 stats.isGroup 未设置）
  const isGroupKey = key.startsWith('_group_') || key.startsWith('group_')
  
  // 如果是组合目标（通过 isGroup 标志或 key 格式判断）
  if (stats.isGroup || isGroupKey) {
    // 优先使用 productNames（后端已经处理了组合名称）
    if (stats.productNames && typeof stats.productNames === 'string' && stats.productNames.trim()) {
      return stats.productNames
    }
    
    // 如果有 groupId，尝试从产品组合列表中获取名称
    if (stats.groupId && typeof stats.groupId === 'string') {
      const group = productGroups.value.find(g => g.id === stats.groupId)
      if (group && group.name) {
        return group.name
      }
    }
    
    // 如果没有 productNames，尝试从 products 数组生成
    if (stats.products && Array.isArray(stats.products) && stats.products.length > 0) {
      const productNames = stats.products
        .map((pid: string) => getProductName(pid))
        .filter(name => name && name.trim())
      if (productNames.length > 0) {
        return productNames.join(' + ')
      }
    }
    
    // 如果 key 是组合 key，尝试从 yearlyTargets 中获取组合信息
    if (isGroupKey) {
      const currentAgent = store.agents.find(a => a.id === store.currentAgentId)
      if (currentAgent && currentAgent.yearlyTargets) {
        const groupTarget = currentAgent.yearlyTargets[key]
        if (groupTarget && typeof groupTarget === 'object' && groupTarget !== null && !Array.isArray(groupTarget)) {
          // 如果 groupTarget 有 groupId，尝试查找组合名称
          if ('groupId' in groupTarget && typeof (groupTarget as any).groupId === 'string') {
            const groupId = (groupTarget as any).groupId
            const group = productGroups.value.find(g => g.id === groupId)
            if (group && group.name) {
              return group.name
            }
          }
          // 如果有 products 数组，使用产品名称拼接
          if ('products' in groupTarget && Array.isArray((groupTarget as any).products)) {
            const products = (groupTarget as any).products
            if (products.length > 0) {
              const productNames = products
                .map((pid: string) => getProductName(pid))
                .filter(name => name && name.trim())
              if (productNames.length > 0) {
                return productNames.join(' + ')
              }
            }
          }
        }
      }
      
      // 如果 key 是 group_xxx 格式，尝试提取 groupId 并查找组合名称
      const groupIdMatch = key.match(/group_(.+)/)
      if (groupIdMatch && groupIdMatch[1]) {
        const groupId = groupIdMatch[1]
        const group = productGroups.value.find(g => g.id === groupId)
        if (group && group.name) {
          return group.name
        }
      }
    }
    
    // 最后的后备方案：返回友好的提示
    return `产品组合`
  }
  
  // 单个产品目标
  return getProductName(key)
}

const goToBalance = () => {
  uni.navigateTo({ url: '/pages/agent/balance/index' })
}

const goToPromotions = () => {
  uni.navigateTo({ url: '/pages/agent/promotions/index' })
}

const goToGifts = () => {
  uni.navigateTo({ url: '/pages/agent/gifts/index' })
}

const goToOrders = () => {
  uni.navigateTo({ url: '/pages/agent/orders/index' })
}

const goToMaterials = () => {
  uni.navigateTo({ url: '/pages/agent/materials/index' })
}

const goBack = () => {
  uni.reLaunch({ url: '/pages/index/index' })
}

const formatOrderTime = (dateStr: string) => {
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${min}`
}

// 处理订单商品显示：按组合分组，如果item有groupId，只显示一次组合名称和组合数量
const getDisplayItems = (items: any[]) => {
  if (!items || items.length === 0) return []
  
  const displayMap = new Map<string, { key: string; name: string; quantity: number }>()
  
  items.forEach((item: any) => {
    if (item.groupId && item.groupName && item.groupQuantity) {
      // 组合商品：按groupId分组，只显示一次组合名称和组合数量
      const key = `group-${item.groupId}`
      if (!displayMap.has(key)) {
        displayMap.set(key, {
          key,
          name: item.groupName,
          quantity: item.groupQuantity
        })
      }
    } else {
      // 单个商品：正常显示
      const key = `product-${item.productId}`
      displayMap.set(key, {
        key,
        name: item.productName,
        quantity: item.quantity
      })
    }
  })
  
  return Array.from(displayMap.values())
}

// 获取搭赠显示文本
const getGiftDisplayText = (order: any) => {
  if (!order.giftItems || order.giftItems.length === 0) return ''
  
  // 优先检查 giftItems 中是否有组合赠品（新格式：有 isGroup 和 groupName）
  const groupGifts = order.giftItems.filter((g: any) => g.isGroup === true)
  if (groupGifts.length > 0) {
    // 组合赠品：直接使用 groupName 和 quantity
    return groupGifts.map((g: any) => `${g.groupName} x${g.quantity}箱`).join('、')
  }
  
  // 如果订单有 groupGiftInfo（旧格式），使用它
  if (order.groupGiftInfo) {
    return `${order.groupGiftInfo.groupName} x${order.groupGiftInfo.totalRequirement}箱`
  }
  
  // 单个产品赠品，显示每个商品
  return order.giftItems.map((gift: any) => `${gift.productName} x${gift.quantity}`).join('、')
}
</script>

<style lang="scss" scoped>
.agent-home {
  padding: 24rpx;
  padding-bottom: 48rpx;
}

.back-bar {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  margin-bottom: 16rpx;
  
  &:active {
    opacity: 0.7;
  }
}

.back-icon {
  width: 40rpx;
  height: 40rpx;
  margin-right: 8rpx;
}

.back-text {
  font-size: 28rpx;
  color: $primary-color;
}

.profile-header {
  display: flex;
  align-items: center;
  padding: 32rpx;
  background: $primary-color;
  border-radius: $border-radius-lg;
  margin-bottom: 24rpx;
  color: #fff;
  
  &__avatar {
    width: 100rpx;
    height: 100rpx;
    border-radius: 50%;
    border: 4rpx solid rgba(255, 255, 255, 0.3);
    margin-right: 24rpx;
  }
  
  &__info {
    flex: 1;
  }
  
  &__name {
    font-size: 36rpx;
    font-weight: 700;
    display: block;
  }
  
  &__phone {
    font-size: 26rpx;
    opacity: 0.8;
    margin-top: 4rpx;
    display: block;
  }
}

.task-progress {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.task-icon {
  width: 40rpx !important;
  height: 40rpx !important;
  display: block;
}

.entry-icon {
  width: 48rpx !important;
  height: 48rpx !important;
  display: block;
}

.task-item {
  &__header {
    display: flex;
    align-items: center;
    margin-bottom: 16rpx;
  }
  
  &__icon {
    width: 40rpx;
    height: 40rpx;
    min-width: 40rpx;
    min-height: 40rpx;
    max-width: 40rpx;
    max-height: 40rpx;
    margin-right: 12rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  
  &__name {
    font-size: 28rpx;
    font-weight: 500;
    color: $text-primary;
  }
  
  &__body {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;
  }
  
  &__stats {
    display: flex;
    align-items: baseline;
  }
  
  &__current {
    font-size: 48rpx;
    font-weight: 700;
    color: $primary-color;
  }
  
  &__divider {
    font-size: 32rpx;
    color: $text-placeholder;
    margin: 0 8rpx;
  }
  
  &__target {
    font-size: 28rpx;
    color: $text-secondary;
  }
}

.progress-ring {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    width: 60rpx;
    height: 60rpx;
    background: #fff;
    border-radius: 50%;
    z-index: 1;
  }
  
  &__value {
    position: relative;
    z-index: 2;
    font-size: 22rpx;
    font-weight: 600;
    color: $primary-color;
  }
  
  &--green {
    .progress-ring__value {
      color: $success-color;
    }
  }
}

.progress-bar--thick {
  height: 16rpx;
}

.progress-inner--green {
  background: linear-gradient(90deg, #10B981 0%, #059669 100%);
}

.gifts-summary-card {
  background: #FFF7ED;
  border-radius: $border-radius;
  padding: 24rpx;
  
  &__body {
    display: flex;
    gap: 16rpx;
    margin-bottom: 16rpx;
  }
}

.gifts-summary-stat {
  flex: 1;
  padding: 16rpx;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8rpx;
  text-align: center;
  
  &--success {
    background: rgba($success-color, 0.1);
  }
  
  &--warning {
    background: rgba($warning-color, 0.1);
  }
  
  &__label {
    font-size: 22rpx;
    color: $text-secondary;
    display: block;
  }
  
  &__value {
    font-size: 28rpx;
    font-weight: 600;
    color: $text-primary;
    margin-top: 4rpx;
    display: block;
    
    .gifts-summary-stat--success & {
      color: $success-color;
    }
    
    .gifts-summary-stat--warning & {
      color: $warning-color;
    }
  }
}

.gifts-summary-progress {
  height: 12rpx;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 6rpx;
  overflow: hidden;
  margin-bottom: 16rpx;
  
  &__inner {
    height: 100%;
    background: linear-gradient(90deg, #10B981 0%, #059669 100%);
    border-radius: 6rpx;
    transition: width $transition;
  }
}

.gifts-summary-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.gifts-summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 16rpx;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8rpx;
  
  &__name {
    font-size: 24rpx;
    color: $text-primary;
    flex: 1;
  }
  
  &__qty {
    font-size: 24rpx;
    color: $text-secondary;
    font-weight: 500;
  }
  
  &__delivered {
    font-size: 22rpx;
    color: $success-color;
    margin-left: 4rpx;
  }
}

.gifts-summary-more {
  text-align: center;
  padding: 12rpx;
  
  text {
    font-size: 24rpx;
    color: $text-placeholder;
  }
}

.gifts-summary-empty {
  text-align: center;
  padding: 24rpx;
  
  text {
    font-size: 24rpx;
    color: $text-placeholder;
  }
}

.quick-entry {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.quick-entry-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 16rpx;
  background: #fff;
  border-radius: $border-radius;
  box-shadow: $shadow-sm;
  
  &:active {
    transform: scale(0.96);
  }
  
  &__icon {
    font-size: 40rpx;
    margin-bottom: 8rpx;
  }
  
  &__text {
    font-size: 24rpx;
    color: $text-secondary;
  }
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.order-item {
  padding: 20rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12rpx;
  }
  
  &__id {
    font-size: 26rpx;
    color: $text-secondary;
  }
  
  &__status {
    font-size: 22rpx;
    padding: 4rpx 12rpx;
    border-radius: 4rpx;
    
    &--pending {
      background: rgba($warning-color, 0.1);
      color: $warning-color;
    }
    
    &--shipped {
      background: rgba($primary-color, 0.1);
      color: $primary-color;
    }
    
    &--completed {
      background: rgba($success-color, 0.1);
      color: $success-color;
    }
  }
  
  &__products {
    font-size: 28rpx;
    color: $text-primary;
    margin-bottom: 12rpx;
    
    text {
      display: block;
    }
  }
  
  &__gifts {
    font-size: 24rpx;
    color: $success-color;
    margin-bottom: 8rpx;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4rpx;
    
    &-label {
      font-weight: 500;
    }
    
    &-text {
      color: $text-primary;
    }
  }
  
  &__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  &__time {
    font-size: 24rpx;
    color: $text-placeholder;
  }
  
  &__amount {
    font-size: 28rpx;
    font-weight: 600;
    color: $danger-color;
  }
}

.empty-targets {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0;
  
  .empty-text {
    font-size: 28rpx;
    color: $text-placeholder;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: $text-placeholder;
}
</style>

