<template>
  <view class="balance-page" v-if="agent">
    <!-- 余额卡片 -->
    <BalanceCard
      :balance="agent.balance"
      label="当前余额"
    />
    
    <!-- 交易记录 -->
    <view class="card">
      <view class="section-title">交易记录</view>
      
      <!-- 筛选标签 -->
      <view class="filter-tags">
        <view 
          v-for="filter in filters"
          :key="filter.value"
          class="filter-tag"
          :class="{ 'filter-tag--active': currentFilter === filter.value }"
          @tap="currentFilter = filter.value"
        >
          {{ filter.label }}
        </view>
      </view>
      
      <!-- 交易列表 -->
      <view class="transaction-list">
        <view 
          v-for="record in mergedRecords" 
          :key="record.id"
          class="transaction-item"
        >
          <view class="transaction-item__icon">
            <image :src="getIcon(record.reason)" class="tx-icon" mode="aspectFit" />
          </view>
          <view class="transaction-item__info">
            <text class="transaction-item__reason">{{ record.label }}</text>
            <text class="transaction-item__time">{{ formatTime(record.createdAt) }}</text>
            <!-- 订单商品信息 -->
            <view v-if="record.items && record.items.length > 0" class="transaction-item__details">
              <text v-for="(item, idx) in getDisplayOrderItems(record.items)" :key="idx" class="detail-item">
                {{ item.name }} x{{ item.quantity }}
              </text>
            </view>
            <!-- 搭赠信息 -->
            <view v-if="record.giftItems && record.giftItems.length > 0" class="transaction-item__gifts">
              <text class="gift-label">搭赠：</text>
              <text class="gift-text">{{ getGiftDisplayText(record.giftItems) }}</text>
            </view>
            <text v-if="record.remark" class="transaction-item__remark">{{ record.remark }}</text>
            <!-- 凭证图片 -->
            <view v-if="getProofImages(record.proof).length > 0" class="transaction-item__proof">
              <view 
                v-for="(proofUrl, index) in getProofImages(record.proof).slice(0, 3)" 
                :key="index"
                class="proof-thumbnail"
                @tap="previewProof(getProofImages(record.proof), index)"
              >
                <image :src="proofUrl" class="proof-thumbnail-img" mode="aspectFill" />
                <view class="proof-thumbnail-badge">
                  <image src="/static/icons/eye.svg" class="proof-badge-icon" mode="aspectFit" />
                </view>
              </view>
              <view v-if="getProofImages(record.proof).length > 3" class="proof-more-badge">
                <text>+{{ getProofImages(record.proof).length - 3 }}</text>
              </view>
            </view>
          </view>
          <view class="transaction-item__right">
            <text 
              class="transaction-item__amount"
              :class="{ 
                'amount-positive': record.amount > 0,
                'amount-negative': record.amount < 0
              }"
            >
              {{ record.amount > 0 ? '+' : '' }}¥{{ Math.abs(record.amount).toLocaleString() }}
            </text>
          </view>
        </view>
        
        <view v-if="mergedRecords.length === 0" class="empty-state">
          <text class="empty-icon">📋</text>
          <text class="empty-text">暂无交易记录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/stores/app'
import BalanceCard from '@/components/BalanceCard/index.vue'
import type { TransactionReason } from '@/types'

const store = useAppStore()

const agent = computed(() => store.currentAgent)
const transactions = computed(() => store.getAgentTransactions(store.currentAgentId))
const orders = computed(() => store.getAgentOrders(store.currentAgentId))

const filters = [
  { label: '全部', value: 'all' },
  { label: '收入', value: 'in' },
  { label: '支出', value: 'out' }
]

const currentFilter = ref('all')

// 合并订单和发货扣款记录
const mergedRecords = computed(() => {
  const allRecords: Array<{
    id: string
    label: string
    reason: TransactionReason
    items?: any[]
    giftItems?: any[]
    amount: number
    createdAt: string
    remark?: string
    proof?: string | string[]
  }> = []
  
  // 用于标记已处理的发货扣款记录
  const processedShippingTxIds = new Set<string>()
  
  // 先处理发货扣款记录，查找对应的订单并合并
  transactions.value.forEach(tx => {
    // 如果是发货扣款且有关联订单，查找订单并合并
    if (tx.reason === 'shipping' && tx.relatedOrderId) {
      const relatedOrder = orders.value.find(o => o.id === tx.relatedOrderId)
      if (relatedOrder) {
        // 合并成一条记录：显示订单信息
        allRecords.push({
          id: `merged-${tx.id}-${relatedOrder.id}`,
          label: '订单',
          reason: 'shipping',
          items: relatedOrder.items,
          giftItems: relatedOrder.giftItems,
          amount: relatedOrder.totalAmount, // 使用订单金额（正数）
          createdAt: relatedOrder.createdAt || tx.createdAt,
          remark: tx.remark,
          proof: tx.proof
        })
        processedShippingTxIds.add(tx.id)
        return
      }
    }
    
    // 其他交易记录，如果不是已处理的发货扣款，正常显示
    if (!(tx.reason === 'shipping' && processedShippingTxIds.has(tx.id))) {
      allRecords.push({
        id: `tx-${tx.id}`,
        label: getLabel(tx.reason),
        reason: tx.reason,
        items: tx.orderItems,
        amount: tx.amount,
        createdAt: tx.createdAt,
        remark: tx.remark,
        proof: tx.proof
      })
    }
  })
  
  // 按时间倒序排序
  allRecords.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
  
  // 应用筛选
  let filtered = allRecords
  if (currentFilter.value === 'in') {
    filtered = allRecords.filter(r => r.amount > 0)
  } else if (currentFilter.value === 'out') {
    filtered = allRecords.filter(r => r.amount < 0)
  }
  
  return filtered
})

const getIcon = (reason: TransactionReason) => {
  const icons: Record<TransactionReason, string> = {
    gift: '/static/icons/gift.svg',
    payment: '/static/icons/credit-card.svg',
    shipping: '/static/icons/box.svg',
    fine: '/static/icons/warning.svg',
    transfer_in: '/static/icons/arrow-down-circle.svg',
    transfer_out: '/static/icons/arrow-up-circle.svg',
    marketing: '/static/icons/target.svg',
    withdraw: '/static/icons/file-text.svg',
    fee: '/static/icons/file-text.svg',
    other: '/static/icons/file-text.svg',
    freight: '/static/icons/truck.svg'
  }
  return icons[reason] || '/static/icons/file-text.svg'
}

const getLabel = (reason: TransactionReason) => {
  const labels: Record<TransactionReason, string> = {
    gift: '赠送',
    payment: '充值到账',
    shipping: '发货扣款',
    fine: '罚款',
    transfer_in: '调货收入',
    transfer_out: '调货支出',
    marketing: '营销退款',
    withdraw: '提现',
    fee: '手续费',
    other: '其他',
    freight: '运费'
  }
  return labels[reason] || reason
}

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

// 解析凭证图片（支持字符串或数组）
const getProofImages = (proof: string | string[] | undefined): string[] => {
  if (!proof) return []
  if (Array.isArray(proof)) return proof
  // 尝试解析 JSON 字符串
  try {
    const parsed = JSON.parse(proof)
    if (Array.isArray(parsed)) return parsed
    return [proof] // 如果不是数组，返回原字符串作为单元素数组
  } catch {
    return [proof] // 解析失败，返回原字符串作为单元素数组
  }
}

// 预览凭证图片
const previewProof = (urls: string | string[], index: number = 0) => {
  const images = Array.isArray(urls) ? urls : [urls]
  uni.previewImage({
    urls: images,
    current: index
  })
}

// 处理订单商品显示：按组合分组，如果item有groupId，只显示一次组合名称和组合数量
const getDisplayOrderItems = (items: any[]) => {
  if (!items || items.length === 0) return []
  
  const displayMap = new Map<string, { name: string; quantity: number }>()
  
  items.forEach((item: any) => {
    if (item.groupId && item.groupName && item.groupQuantity) {
      // 组合商品：按groupId分组，只显示一次组合名称和组合数量
      const key = `group-${item.groupId}`
      if (!displayMap.has(key)) {
        displayMap.set(key, {
          name: item.groupName,
          quantity: item.groupQuantity
        })
      }
    } else {
      // 单个商品：正常显示
      const key = `product-${item.productId}`
      displayMap.set(key, {
        name: item.productName,
        quantity: item.quantity
      })
    }
  })
  
  return Array.from(displayMap.values())
}

// 获取搭赠显示文本
const getGiftDisplayText = (giftItems: any[]) => {
  if (!giftItems || giftItems.length === 0) return ''
  
  // 优先检查是否有组合赠品（新格式：有 isGroup 和 groupName）
  const groupGifts = giftItems.filter((g: any) => g.isGroup === true)
  if (groupGifts.length > 0) {
    // 组合赠品：直接使用 groupName 和 quantity
    return groupGifts.map((g: any) => `${g.groupName} x${g.quantity}箱`).join('、')
  }
  
  // 单个产品赠品，显示每个商品
  return giftItems.map((gift: any) => `${gift.productName} x${gift.quantity}`).join('、')
}

onShow(async () => {
  // 刷新交易记录、订单和代理商数据（因为编辑交易记录后余额可能变化）
  await Promise.all([
    store.loadTransactions(),
    store.loadOrders(),
    store.loadAgents()
  ])
})
</script>

<style lang="scss" scoped>
.balance-page {
  padding: 24rpx;
}

.filter-tags {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.filter-tag {
  padding: 12rpx 28rpx;
  background: $bg-grey;
  border-radius: 100rpx;
  font-size: 26rpx;
  color: $text-secondary;
  transition: all $transition-fast;
  
  &--active {
    background: $primary-color;
    color: #fff;
  }
}

.transaction-list {
  display: flex;
  flex-direction: column;
}

.transaction-item {
  display: flex;
  align-items: flex-start;
  padding: 24rpx 0;
  border-bottom: 1rpx solid $border-color;
  
  &:last-child {
    border-bottom: none;
  }
  
  &__icon {
    width: 72rpx;
    height: 72rpx;
    border-radius: 50%;
    background: $bg-grey;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32rpx;
    margin-right: 20rpx;
    flex-shrink: 0;
  }
  
  &__info {
    flex: 1;
    min-width: 0;
  }
  
  &__reason {
    font-size: 30rpx;
    font-weight: 500;
    color: $text-primary;
    display: block;
  }
  
  &__time {
    font-size: 24rpx;
    color: $text-placeholder;
    margin-top: 4rpx;
    display: block;
  }
  
  &__details {
    display: flex;
    flex-wrap: wrap;
    gap: 8rpx;
    margin-top: 8rpx;
  }
  
  &__gifts {
    display: flex;
    flex-wrap: wrap;
    gap: 8rpx;
    margin-top: 8rpx;
    align-items: center;
  }
  
  &__remark {
    font-size: 24rpx;
    color: $text-secondary;
    margin-top: 8rpx;
    padding: 8rpx 12rpx;
    background: $bg-grey;
    border-radius: 6rpx;
    display: inline-block;
  }
  
  &__right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    flex-shrink: 0;
    margin-left: 16rpx;
  }
  
  &__amount {
    font-size: 36rpx;
    font-weight: 700;
    color: $text-primary; // 默认颜色（用于金额为0的情况）
  }
  
  &__proof {
    display: flex;
    gap: 12rpx;
    margin-top: 12rpx;
    flex-wrap: wrap;
  }
}

.proof-thumbnail {
  position: relative;
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
  overflow: hidden;
  background: $bg-grey;
  
  &:active {
    opacity: 0.8;
  }
}

.proof-thumbnail-img {
  width: 100%;
  height: 100%;
}

.proof-thumbnail-badge {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 40rpx;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.proof-badge-icon {
  width: 24rpx;
  height: 24rpx;
  filter: brightness(0) invert(1);
}

.proof-more-badge {
  width: 120rpx;
  height: 120rpx;
  border-radius: 8rpx;
  background: $bg-grey;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: $text-secondary;
  border: 2rpx dashed $border-color;
}

.amount-positive {
  color: $success-color !important;
}

.amount-negative {
  color: $danger-color !important;
}

.detail-item {
  font-size: 22rpx;
  color: $text-secondary;
  padding: 4rpx 10rpx;
  background: $bg-grey;
  border-radius: 4rpx;
}

.gift-label {
  font-size: 22rpx;
  color: $text-secondary;
}

.gift-text {
  font-size: 22rpx;
  color: $success-color;
  font-weight: 500;
}
</style>

