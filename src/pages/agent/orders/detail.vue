<template>
  <view class="order-detail">
    <view v-if="loading" class="loading">加载中...</view>
    <view v-else-if="order" class="order-content">
      <!-- 订单头部信息 -->
      <view class="card">
        <view class="order-header">
          <view class="order-header__info">
            <text class="order-id">订单号：{{ order.id.slice(-8).toUpperCase() }}</text>
          </view>
          <view class="order-header__meta">
            <text class="order-time">创建时间：{{ formatTime(order.createdAt) }}</text>
          </view>
        </view>
      </view>

      <!-- 商品列表 -->
      <view class="card">
        <view class="section-title">商品明细</view>
        <view class="product-list">
          <view 
            v-for="item in displayItems" 
            :key="item.key"
            class="product-item"
          >
            <text class="product-name">{{ item.name }}</text>
            <text class="product-quantity">x{{ item.quantity }}</text>
            <text class="product-price">¥{{ item.totalPrice.toLocaleString() }}</text>
          </view>
        </view>
      </view>

      <!-- 赠品信息 -->
      <view v-if="order.giftItems && order.giftItems.length > 0" class="card">
        <view class="section-title">搭赠情况</view>
        <view v-if="order.promotionNames && order.promotionNames.length > 0" class="promotion-info">
          <text class="promotion-label">参与活动：</text>
          <text v-for="(name, idx) in order.promotionNames" :key="idx" class="promotion-name">
            {{ name }}<text v-if="idx < order.promotionNames.length - 1">、</text>
          </text>
        </view>
        
        <!-- 组合赠品 -->
        <view v-if="order.groupGiftInfo" class="group-gift-section">
          <view class="group-gift-header">
            <text class="group-gift-name">{{ order.groupGiftInfo.groupName }}</text>
            <view class="group-gift-summary">
              <text class="summary-text">要求：{{ order.groupGiftInfo.totalRequirement }}箱</text>
              <text class="summary-text">已送达：{{ order.groupGiftInfo.deliveredTotal }}箱</text>
              <text class="summary-text summary-text--highlight">剩余：{{ order.groupGiftInfo.remainingQuantity }}箱</text>
            </view>
            <view v-if="order.groupGiftInfo.isCompleted" class="completed-badge">已完成</view>
          </view>
          
          <view class="group-products-list">
            <view 
              v-for="product in order.groupGiftInfo.products" 
              :key="product.productId"
              class="group-product-item"
            >
              <view class="group-product-info">
                <text class="group-product-name">{{ product.productName }}</text>
                <text class="group-product-delivered">已送达：{{ product.deliveredQuantity }}箱</text>
              </view>
            </view>
          </view>
        </view>
        
        <!-- 单个产品赠品 -->
        <view v-else-if="order.giftItems && order.giftItems.length > 0" class="gift-list">
          <view 
            v-for="gift in order.giftItems" 
            :key="gift.productId || gift.groupId"
            class="gift-item"
          >
            <view class="gift-item__header">
              <image src="/static/icons/gift.svg" class="gift-icon" mode="aspectFit" />
              <text class="gift-name">{{ gift.groupName || gift.productName || '赠品' }}</text>
            </view>
            <view class="gift-item__stats">
              <view class="gift-stat gift-stat--delivered">
                <text class="gift-stat__label">已送达</text>
                <view class="gift-stat__value gift-stat__value--readonly">
                  <text class="gift-stat__number">{{ gift.deliveredQuantity || 0 }}</text>
                  <text class="gift-stat__unit">箱</text>
                </view>
              </view>
              <view class="gift-stat gift-stat--undelivered">
                <text class="gift-stat__label">未送达</text>
                <view class="gift-stat__value gift-stat__value--readonly">
                  <text class="gift-stat__number gift-stat__number--highlight">{{ (gift.quantity || 0) - (gift.deliveredQuantity || 0) }}</text>
                  <text class="gift-stat__unit">箱</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 送达记录历史 -->
      <view v-if="order.giftItems && order.giftItems.length > 0 && deliveryRecords.length > 0" class="card">
        <view class="section-title">送达记录</view>
        <view class="delivery-records-list">
          <view 
            v-for="record in deliveryRecords" 
            :key="record.id"
            class="delivery-record-item"
          >
            <view class="delivery-record-header">
              <view class="delivery-record-info">
                <text class="delivery-record-name">
                  {{ record.groupName || record.productName || '赠品' }}
                </text>
                <text class="delivery-record-quantity">+{{ record.quantity }}箱</text>
              </view>
              <text class="delivery-record-time">{{ formatTime(record.createdAt) }}</text>
            </view>
            <view v-if="record.deliveredByName" class="delivery-record-operator">
              <text class="delivery-record-operator-label">操作人：</text>
              <text class="delivery-record-operator-name">{{ record.deliveredByName }}</text>
            </view>
            <view v-if="record.remark" class="delivery-record-remark">
              <text class="delivery-record-remark-label">备注：</text>
              <text class="delivery-record-remark-text">{{ record.remark }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { orderApi } from '@/api'
import type { Order, GiftDeliveryRecord } from '@/types'

const loading = ref(true)
const order = ref<Order | null>(null)
const orderId = ref('')
const deliveryRecords = ref<GiftDeliveryRecord[]>([])

// 处理订单商品显示：按组合分组，如果item有groupId，只显示一次组合名称和组合数量
const displayItems = computed(() => {
  if (!order.value || !order.value.items) return []
  
  const items = order.value.items
  const displayMap = new Map<string, { key: string; name: string; quantity: number; totalPrice: number }>()
  
  items.forEach(item => {
    if (item.groupId && item.groupName && item.groupQuantity) {
      // 组合商品：按groupId分组，只显示一次组合名称和组合数量
      const key = `group-${item.groupId}`
      if (!displayMap.has(key)) {
        // 计算组合的总价格（组合中所有商品的价格总和）
        const groupItems = items.filter(i => i.groupId === item.groupId)
        const totalPrice = groupItems.reduce((sum, i) => sum + i.quantity * i.price, 0)
        displayMap.set(key, {
          key,
          name: item.groupName,
          quantity: item.groupQuantity,
          totalPrice
        })
      }
    } else {
      // 单个商品：正常显示
      const key = `product-${item.productId}`
      displayMap.set(key, {
        key,
        name: item.productName,
        quantity: item.quantity,
        totalPrice: item.quantity * item.price
      })
    }
  })
  
  return Array.from(displayMap.values())
})

onLoad((options) => {
  if (options?.id) {
    orderId.value = options.id
    loadOrder()
  }
})

const loadOrder = async () => {
  try {
    loading.value = true
    order.value = await orderApi.getById(orderId.value)
    
    // 加载送达记录
    if (order.value?.giftItems && order.value.giftItems.length > 0) {
      deliveryRecords.value = await orderApi.getGiftDeliveryRecords(orderId.value)
    }
  } catch (error) {
    uni.showToast({ title: '加载订单失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const formatTime = (time: string | Date) => {
  const d = new Date(time)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style lang="scss" scoped>
.order-detail {
  min-height: 100vh;
  background: $bg-grey;
  padding-bottom: 40rpx;
}

.loading {
  padding: 100rpx 0;
  text-align: center;
  color: $text-secondary;
  font-size: 28rpx;
}

.order-content {
  padding: 24rpx;
}

.card {
  background: #fff;
  border-radius: $border-radius-lg;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: $shadow-sm;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 24rpx;
}

.order-header {
  &__info {
    margin-bottom: 16rpx;
  }
  
  &__meta {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }
}

.order-id {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-primary;
  font-family: monospace;
}

.order-time {
  font-size: 26rpx;
  color: $text-secondary;
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.product-item {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid $border-color;
  
  &:last-child {
    border-bottom: none;
  }
}

.product-name {
  flex: 1;
  font-size: 28rpx;
  color: $text-primary;
}

.product-quantity {
  font-size: 28rpx;
  color: $text-secondary;
  margin-right: 24rpx;
}

.product-price {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-primary;
}

.promotion-info {
  margin-bottom: 20rpx;
  padding: 16rpx 20rpx;
  background: rgba($primary-color, 0.08);
  border-radius: 12rpx;
}

.promotion-label {
  font-size: 26rpx;
  font-weight: 500;
  color: $primary-color;
  margin-right: 8rpx;
}

.promotion-name {
  font-size: 26rpx;
  color: $primary-color;
}

.group-gift-section {
  margin-top: 20rpx;
}

.group-gift-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid $border-color;
}

.group-gift-name {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-primary;
}

.group-gift-summary {
  display: flex;
  gap: 24rpx;
  margin-top: 12rpx;
}

.summary-text {
  font-size: 26rpx;
  color: $text-secondary;
  
  &--highlight {
    color: $warning-color;
    font-weight: 500;
  }
}

.completed-badge {
  padding: 8rpx 32rpx;
  background: $success-color;
  color: #fff;
  font-size: 24rpx;
  border-radius: 100rpx;
  min-width: 120rpx;
  text-align: center;
  z-index: 1;
}

.group-products-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.group-product-item {
  padding: 20rpx;
  background: $bg-grey;
  border-radius: 12rpx;
}

.group-product-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.group-product-name {
  font-size: 28rpx;
  font-weight: 500;
  color: $text-primary;
}

.group-product-delivered {
  font-size: 26rpx;
  color: $text-secondary;
}

.gift-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-top: 20rpx;
}

.gift-item {
  padding: 24rpx;
  background: #fff;
  border: 1rpx solid $border-color;
  border-radius: 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  
  &__header {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 20rpx;
  }
  
  &__stats {
    display: flex;
    gap: 24rpx;
  }
}

.gift-icon {
  width: 32rpx;
  height: 32rpx;
}

.gift-name {
  font-size: 28rpx;
  font-weight: 500;
  color: $text-primary;
  flex: 1;
}

.gift-stat {
  flex: 1;
  padding: 16rpx;
  background: $bg-grey;
  border-radius: 12rpx;
  text-align: center;
  
  &--delivered {
    background: rgba($success-color, 0.1);
  }
  
  &--undelivered {
    background: rgba($warning-color, 0.1);
  }
  
  &__label {
    font-size: 24rpx;
    color: $text-secondary;
    display: block;
    margin-bottom: 8rpx;
  }
  
  &__value {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 4rpx;
    
    &--readonly {
      // 只读状态
    }
  }
  
  &__number {
    font-size: 36rpx;
    font-weight: 700;
    color: $text-primary;
    
    &--highlight {
      color: $warning-color;
    }
  }
  
  &__unit {
    font-size: 24rpx;
    color: $text-secondary;
  }
}

// 送达记录样式
.delivery-records-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 16rpx;
}

.delivery-record-item {
  padding: 20rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  border-left: 4rpx solid $primary-color;
}

.delivery-record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.delivery-record-info {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.delivery-record-name {
  font-size: 28rpx;
  font-weight: 500;
  color: $text-primary;
}

.delivery-record-quantity {
  font-size: 28rpx;
  font-weight: 600;
  color: $success-color;
}

.delivery-record-time {
  font-size: 24rpx;
  color: $text-secondary;
}

.delivery-record-operator {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 8rpx;
  font-size: 24rpx;
}

.delivery-record-operator-label {
  color: $text-secondary;
}

.delivery-record-operator-name {
  color: $text-primary;
  font-weight: 500;
}

.delivery-record-remark {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  margin-top: 8rpx;
  font-size: 24rpx;
}

.delivery-record-remark-label {
  color: $text-secondary;
  flex-shrink: 0;
}

.delivery-record-remark-text {
  color: $text-primary;
  flex: 1;
  word-break: break-all;
}
</style>
