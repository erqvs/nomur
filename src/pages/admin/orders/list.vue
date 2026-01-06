<template>
  <view class="orders-page">
    <!-- 订单列表 -->
    <view class="order-list">
      <view 
        v-for="order in filteredOrders" 
        :key="order.id"
        class="order-card"
        @tap="goToDetail(order.id)"
      >
        <view class="order-card__header">
          <text class="order-card__id">订单号：{{ order.id.slice(-8).toUpperCase() }}</text>
        </view>
        
        <view v-if="!filterAgentId" class="order-card__agent">
          <text>代理商：{{ order.agentName }}</text>
        </view>
        
        <view class="order-card__products">
          <view 
            v-for="item in order.items" 
            :key="item.productId"
            class="product-row"
          >
            <text class="product-row__name">{{ item.productName }}</text>
            <text class="product-row__quantity">x{{ item.quantity }}</text>
            <text class="product-row__subtotal">¥{{ (item.quantity * item.price).toLocaleString() }}</text>
          </view>
        </view>
        
        <view class="order-card__summary">
          <view class="summary-item">
            <text class="summary-item__label">总重量</text>
            <text class="summary-item__value">{{ order.totalWeight.toFixed(1) }}kg</text>
          </view>
          <view class="summary-item">
            <text class="summary-item__label">总金额</text>
            <text class="summary-item__value summary-item__value--highlight">¥{{ order.totalAmount.toLocaleString() }}</text>
          </view>
        </view>
        
        <view class="order-card__footer">
          <text class="order-card__time">{{ formatTime(order.createdAt) }}</text>
          <text v-if="order.driverPhone" class="order-card__driver">司机：{{ order.driverPhone }}</text>
        </view>
        
        <!-- 赠品信息 -->
        <view v-if="order.giftItems && order.giftItems.length > 0" class="order-card__gifts">
          <image src="/static/icons/gift.svg" class="gifts-icon" mode="aspectFit" />
          <view class="gifts-content">
            <view v-if="order.promotionNames && order.promotionNames.length > 0" class="gifts-promotion">
              <text class="promotion-label">活动：</text>
              <text v-for="(name, idx) in order.promotionNames" :key="idx" class="promotion-name">
                {{ name }}<text v-if="idx < order.promotionNames.length - 1">、</text>
              </text>
            </view>
            <view class="gifts-items">
              <text class="gifts-label">赠品：</text>
              <text v-for="gift in order.giftItems" :key="gift.productId" class="gift-item">
                {{ gift.productName }} x{{ gift.quantity }}
              </text>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 空状态 -->
      <view v-if="filteredOrders.length === 0" class="empty-state">
        <image src="/static/icons/box.svg" class="empty-icon" mode="aspectFit" />
        <text class="empty-text">暂无订单</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useAppStore } from '@/stores/app'
import { orderApi } from '@/api'
import type { Order } from '@/types'

const store = useAppStore()
const filterAgentId = ref<string>('')
const orders = ref<Order[]>([])
const loading = ref(true)

onLoad((options) => {
  if (options?.agentId) {
    filterAgentId.value = options.agentId
    uni.setNavigationBarTitle({
      title: '订单列表'
    })
  }
  loadOrders()
})

const loadOrders = async () => {
  try {
    loading.value = true
    orders.value = await orderApi.getAll(filterAgentId.value || undefined)
  } catch (error) {
    uni.showToast({ title: '加载订单失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const filteredOrders = computed(() => {
  return orders.value
})

const formatTime = (time: string | Date) => {
  const d = new Date(time)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${min}`
}

const goToDetail = (orderId: string) => {
  uni.navigateTo({
    url: `/pages/admin/orders/detail?id=${orderId}`
  })
}

onMounted(() => {
  loadOrders()
})
</script>

<style lang="scss" scoped>
.orders-page {
  padding: 24rpx;
  padding-bottom: 40rpx;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.order-card {
  background: #fff;
  border-radius: $border-radius;
  padding: 24rpx;
  box-shadow: $shadow-sm;
  
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;
  }
  
  &__id {
    font-size: 28rpx;
    font-weight: 600;
    color: $text-primary;
  }
  
  &__agent {
    font-size: 26rpx;
    color: $text-secondary;
    margin-bottom: 16rpx;
  }
  
  &__products {
    display: flex;
    flex-direction: column;
    gap: 12rpx;
    margin-bottom: 16rpx;
  }
  
  &__summary {
    display: flex;
    justify-content: space-between;
    padding: 16rpx 0;
    border-top: 1rpx solid $border-color;
    border-bottom: 1rpx solid $border-color;
    margin-bottom: 16rpx;
  }
  
  &__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 24rpx;
    color: $text-placeholder;
  }
  
  &__driver {
    margin-left: 16rpx;
  }
  
  &__gifts {
    display: flex;
    align-items: flex-start;
    gap: 12rpx;
    margin-top: 16rpx;
    padding-top: 16rpx;
    border-top: 1rpx solid $border-color;
    font-size: 24rpx;
    color: $text-secondary;
  }
}

.gifts-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.gifts-promotion {
  display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4rpx;
}

.promotion-label {
  font-weight: 500;
  color: $primary-color;
}

.promotion-name {
  color: $primary-color;
}

.gifts-items {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4rpx;
}

.product-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-row__name {
  flex: 1;
  font-size: 28rpx;
  color: $text-primary;
}

.product-row__quantity {
  font-size: 26rpx;
  color: $text-secondary;
  margin: 0 16rpx;
}

.product-row__subtotal {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-primary;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  
  &__label {
    font-size: 24rpx;
    color: $text-secondary;
  }
  
  &__value {
    font-size: 28rpx;
    font-weight: 600;
    color: $text-primary;
    
    &--highlight {
      font-size: 32rpx;
      color: $primary-color;
    }
  }
}

.gifts-icon {
  width: 32rpx;
  height: 32rpx;
}

.gifts-label {
  font-weight: 500;
}

.gift-item {
  &::after {
    content: '、';
  }
  
  &:last-child::after {
    content: '';
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
}

.empty-icon {
  width: 100rpx;
  height: 100rpx;
  opacity: 0.3;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: $text-placeholder;
}
</style>

