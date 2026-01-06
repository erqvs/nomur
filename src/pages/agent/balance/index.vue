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
          v-for="tx in filteredTransactions" 
          :key="tx.id"
          class="transaction-item"
        >
          <view class="transaction-item__icon">
            <image :src="getIcon(tx.reason)" class="tx-icon" mode="aspectFit" />
          </view>
          <view class="transaction-item__info">
            <text class="transaction-item__reason">{{ getLabel(tx.reason) }}</text>
            <text class="transaction-item__time">{{ formatTime(tx.createdAt) }}</text>
            <view v-if="tx.orderItems && tx.orderItems.length > 0" class="transaction-item__details">
              <text v-for="(item, idx) in tx.orderItems" :key="idx" class="detail-item">
                {{ item.productName }} x{{ item.quantity }}
              </text>
            </view>
            <text v-if="tx.remark" class="transaction-item__remark">{{ tx.remark }}</text>
          </view>
          <text 
            class="transaction-item__amount"
            :class="{ 
              'amount-positive': tx.amount > 0,
              'amount-negative': tx.amount < 0
            }"
          >
            {{ tx.amount > 0 ? '+' : '' }}{{ tx.amount.toLocaleString() }}
          </text>
        </view>
        
        <view v-if="filteredTransactions.length === 0" class="empty-state">
          <text class="empty-icon">📋</text>
          <text class="empty-text">暂无交易记录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '@/stores/app'
import BalanceCard from '@/components/BalanceCard/index.vue'
import type { TransactionReason } from '@/types'

const store = useAppStore()

const agent = computed(() => store.currentAgent)
const transactions = computed(() => store.getAgentTransactions(store.currentAgentId))

const filters = [
  { label: '全部', value: 'all' },
  { label: '收入', value: 'in' },
  { label: '支出', value: 'out' }
]

const currentFilter = ref('all')

const filteredTransactions = computed(() => {
  if (currentFilter.value === 'all') return transactions.value
  if (currentFilter.value === 'in') return transactions.value.filter(t => t.amount > 0)
  return transactions.value.filter(t => t.amount < 0)
})

const getIcon = (reason: TransactionReason) => {
  const icons: Record<TransactionReason, string> = {
    gift: '/static/icons/gift.svg',
    payment: '/static/icons/credit-card.svg',
    shipping: '/static/icons/box.svg',
    fine: '/static/icons/warning.svg',
    transfer_in: '/static/icons/arrow-down-circle.svg',
    transfer_out: '/static/icons/arrow-up-circle.svg',
    marketing: '/static/icons/target.svg'
  }
  return icons[reason]
}

const getLabel = (reason: TransactionReason) => {
  const labels: Record<TransactionReason, string> = {
    gift: '赠送',
    payment: '充值到账',
    shipping: '发货扣款',
    fine: '罚款',
    transfer_in: '调货收入',
    transfer_out: '调货支出',
    marketing: '营销退款'
  }
  return labels[reason]
}

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}
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
  
  &__remark {
    font-size: 24rpx;
    color: $text-secondary;
    margin-top: 8rpx;
    padding: 8rpx 12rpx;
    background: $bg-grey;
    border-radius: 6rpx;
    display: inline-block;
  }
  
  &__amount {
    font-size: 36rpx;
    font-weight: 700;
    flex-shrink: 0;
    margin-left: 16rpx;
  }
}

.amount-positive {
  color: $success-color;
}

.amount-negative {
  color: $danger-color;
}

.detail-item {
  font-size: 22rpx;
  color: $text-secondary;
  padding: 4rpx 10rpx;
  background: $bg-grey;
  border-radius: 4rpx;
}
</style>

