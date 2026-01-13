<template>
  <view class="orders-page">
    <!-- 订单列表 -->
    <view class="order-list">
      <view 
        v-for="order in filteredOrders" 
        :key="order.id"
        class="order-card"
      >
        <view class="order-card__header">
          <text class="order-card__id">订单号：{{ order.id.slice(-8).toUpperCase() }}</text>
        </view>
        
        <view class="order-card__products">
          <view 
            v-for="item in getDisplayItems(order.items)" 
            :key="item.key"
            class="product-row"
          >
            <text class="product-row__name">{{ item.name }}</text>
            <text class="product-row__quantity">x{{ item.quantity }}</text>
            <text class="product-row__subtotal">¥{{ item.totalPrice.toLocaleString() }}</text>
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
          <view class="order-card__footer-left">
            <text class="order-card__time">{{ formatTime(order.createdAt) }}</text>
            <text v-if="order.driverPhone" class="order-card__driver">司机：{{ order.driverPhone }}</text>
          </view>
          <view class="order-card__actions">
            <view class="order-card__detail" @tap.stop="goToDetail(order.id)">
              <image src="/static/icons/arrow-right.svg" class="action-icon" mode="aspectFit" />
              <text class="action-text">详情</text>
            </view>
            <view class="order-card__share" @tap.stop="shareOrder(order.id)">
              <image src="/static/icons/arrow-right.svg" class="share-icon" mode="aspectFit" />
              <text class="share-text">分享</text>
            </view>
          </view>
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
            <!-- 组合赠品显示（优先检查 giftItems 中的组合赠品） -->
            <view v-if="hasGroupGifts(order)" class="gifts-items">
              <text class="gifts-label">赠品：</text>
              <template v-for="gift in order.giftItems" :key="gift.groupId || gift.productId">
                <template v-if="gift.isGroup">
                  <text class="gift-group-name">{{ gift.groupName }}</text>
                  <text class="gift-group-quantity">x{{ gift.quantity }}箱</text>
                </template>
              </template>
            </view>
            <!-- 旧格式：groupGiftInfo -->
            <view v-else-if="order.groupGiftInfo" class="gifts-items">
              <text class="gifts-label">赠品：</text>
              <text class="gift-group-name">{{ order.groupGiftInfo.groupName }}</text>
              <text class="gift-group-quantity">x{{ order.groupGiftInfo.totalRequirement }}箱</text>
            </view>
            <!-- 单个产品赠品显示 -->
            <view v-else class="gifts-items">
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
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'

const store = useAppStore()

const orders = computed(() => store.getAgentOrders(store.currentAgentId))

const filteredOrders = computed(() => {
  return orders.value
})

// 处理订单商品显示：按组合分组，如果item有groupId，只显示一次组合名称和组合数量
const getDisplayItems = (items: any[]) => {
  if (!items || items.length === 0) return []
  
  const displayMap = new Map<string, { key: string; name: string; quantity: number; totalPrice: number }>()
  
  items.forEach((item: any) => {
    if (item.groupId && item.groupName && item.groupQuantity) {
      // 组合商品：按groupId分组，只显示一次组合名称和组合数量
      const key = `group-${item.groupId}`
      if (!displayMap.has(key)) {
        // 计算组合的总价格（组合中所有商品的价格总和）
        const groupItems = items.filter((i: any) => i.groupId === item.groupId)
        const totalPrice = groupItems.reduce((sum: number, i: any) => sum + (i.quantity || 0) * (i.price || 0), 0)
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
}

// 检查订单是否有组合赠品
const hasGroupGifts = (order: any) => {
  if (!order.giftItems || order.giftItems.length === 0) return false
  return order.giftItems.some((gift: any) => gift.isGroup === true)
}

const goToDetail = (orderId: string) => {
  uni.navigateTo({
    url: `/pages/agent/orders/detail?id=${orderId}`
  })
}

const shareOrder = (orderId: string) => {
  const shareUrl = `https://nomur.linkmate.site/#/pages/admin/orders/detail?id=${orderId}`
  
  // #ifdef H5
  // H5端：复制链接到剪贴板
  if (navigator.clipboard) {
    navigator.clipboard.writeText(shareUrl).then(() => {
      uni.showToast({ title: '订单链接已复制', icon: 'success' })
    }).catch(() => {
      copyTextFallback(shareUrl)
    })
  } else {
    copyTextFallback(shareUrl)
  }
  // #endif
  
  // #ifdef MP-WEIXIN
  // 微信小程序：跳转到订单详情页面
  uni.navigateTo({
    url: `/pages/admin/orders/detail?id=${orderId}`
  })
  // #endif
}

const copyTextFallback = (text: string) => {
  // #ifdef H5
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    document.execCommand('copy')
    uni.showToast({ title: '订单链接已复制', icon: 'success' })
  } catch (err) {
    uni.showToast({ title: '复制失败', icon: 'none' })
  }
  document.body.removeChild(textarea)
  // #endif
}

const formatTime = (time: string | Date) => {
  const d = new Date(time)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
</script>

<style lang="scss" scoped>
.orders-page {
  padding: 24rpx;
  padding-bottom: 120rpx;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.order-card {
  background: #fff;
  border-radius: $border-radius-lg;
  padding: 28rpx;
  box-shadow: $shadow-sm;
  
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20rpx;
    padding-bottom: 20rpx;
    border-bottom: 1rpx solid $border-color;
  }
  
  &__id {
    font-size: 26rpx;
    color: $text-secondary;
    font-family: monospace;
  }
  
  &__status {
    font-size: 24rpx;
    padding: 6rpx 16rpx;
    border-radius: 8rpx;
    
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
    margin-bottom: 20rpx;
  }
  
  &__summary {
    display: flex;
    gap: 32rpx;
    padding: 16rpx 20rpx;
    background: $bg-grey;
    border-radius: 12rpx;
    margin-bottom: 16rpx;
  }
  
  &__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 20rpx;
    padding-top: 20rpx;
    border-top: 1rpx solid $border-color;
  }
  
  &__footer-left {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
    flex: 1;
  }
  
  &__actions {
    display: flex;
    gap: 12rpx;
    align-items: center;
  }
  
  &__detail {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6rpx;
    padding: 12rpx 20rpx;
    background: linear-gradient(135deg, rgba($primary-color, 0.1) 0%, rgba($primary-color, 0.15) 100%);
    border: 1rpx solid rgba($primary-color, 0.2);
    border-radius: 12rpx;
    min-width: 120rpx;
    transition: all 0.2s;
    
    &:active {
      background: linear-gradient(135deg, rgba($primary-color, 0.2) 0%, rgba($primary-color, 0.25) 100%);
      transform: scale(0.98);
    }
  }
  
  &__share {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6rpx;
    padding: 12rpx 20rpx;
    background: linear-gradient(135deg, rgba($text-secondary, 0.08) 0%, rgba($text-secondary, 0.12) 100%);
    border: 1rpx solid rgba($text-secondary, 0.15);
    border-radius: 12rpx;
    min-width: 120rpx;
    transition: all 0.2s;
    
    &:active {
      background: linear-gradient(135deg, rgba($text-secondary, 0.15) 0%, rgba($text-secondary, 0.2) 100%);
      transform: scale(0.98);
    }
  }
  
  &__time {
    font-size: 24rpx;
    color: $text-placeholder;
  }
  
  &__driver {
    font-size: 24rpx;
    color: $text-secondary;
  }
  
  &__gifts {
    margin-top: 16rpx;
    padding: 16rpx 20rpx;
    background: rgba($success-color, 0.08);
    border-radius: 12rpx;
    font-size: 26rpx;
    display: flex;
    align-items: flex-start;
    gap: 12rpx;
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
  align-items: center;
  padding: 12rpx 0;
  
  &__name {
    flex: 1;
    font-size: 28rpx;
    color: $text-primary;
  }
  
  &__quantity {
    font-size: 28rpx;
    color: $text-secondary;
    margin-right: 24rpx;
  }
  
  &__subtotal {
    font-size: 28rpx;
    font-weight: 500;
    color: $text-primary;
  }
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  
  &__label {
    font-size: 26rpx;
    color: $text-secondary;
  }
  
  &__value {
    font-size: 28rpx;
    font-weight: 600;
    color: $text-primary;
    
    &--highlight {
      color: $danger-color;
      font-size: 32rpx;
    }
  }
}

.gifts-icon {
  width: 32rpx;
  height: 32rpx;
  margin-right: 8rpx;
}

.gifts-label {
  color: $success-color;
  font-weight: 500;
}

.gift-item {
  color: $text-primary;
  margin-left: 12rpx;
  
  &::after {
    content: '、';
  }
  
  &:last-child::after {
    content: '';
  }
}

.gift-group-name {
  font-weight: 500;
  color: $text-primary;
  margin-left: 12rpx;
}

.gift-group-quantity {
  color: $text-secondary;
  margin-left: 8rpx;
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
  margin-bottom: 20rpx;
  opacity: 0.5;
}

.empty-text {
  font-size: 28rpx;
  color: $text-placeholder;
}

.action-icon {
  width: 28rpx;
  height: 28rpx;
  filter: brightness(0) saturate(100%) invert(40%) sepia(93%) saturate(1352%) hue-rotate(200deg) brightness(97%) contrast(96%);
}

.action-text {
  font-size: 26rpx;
  color: $primary-color;
  font-weight: 600;
}

.share-icon {
  width: 28rpx;
  height: 28rpx;
  filter: brightness(0) saturate(100%) invert(50%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(60%) contrast(100%);
}

.share-text {
  font-size: 26rpx;
  color: $text-secondary;
  font-weight: 600;
}
</style>

