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
          <view class="order-card__edit-btn" @tap.stop="editOrder(order)">
            <text class="edit-btn-text">✏️ 修改</text>
          </view>
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
    
    <!-- 自定义TabBar -->
    <CustomTabBar />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/stores/app'
import { orderApi } from '@/api'
import type { Order } from '@/types'
import CustomTabBar from '@/components/CustomTabBar/index.vue'

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

// 更新 tabbar 路径
const updateTabBarPath = () => {
  try {
    const pages = getCurrentPages()
    if (pages.length > 0) {
      const route = '/' + pages[pages.length - 1].route
      uni.$emit('update-tabbar-path', route)
    }
  } catch (error) {
    console.error('更新 tabbar 路径失败:', error)
  }
}

onShow(() => {
  updateTabBarPath()
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

const editOrder = (order: Order) => {
  // 跳转到编辑页面
  uni.navigateTo({
    url: `/pages/super/orders/edit?id=${order.id}`
  })
}

onMounted(() => {
  updateTabBarPath()
  loadOrders()
})
</script>

<style lang="scss" scoped>
.orders-page {
  padding: 24rpx;
  padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
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
    font-size: 30rpx;
    font-weight: 600;
    color: $text-primary;
  }
  
  &__edit-btn {
    padding: 8rpx 16rpx;
    background: rgba($warning-color, 0.1);
    border-radius: 8rpx;
    border: 1rpx solid rgba($warning-color, 0.3);
    
    &:active {
      opacity: 0.8;
    }
  }
  
  &__agent {
    font-size: 26rpx;
    color: $text-secondary;
    margin-bottom: 16rpx;
  }
  
  &__products {
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
  
  &__time {
    flex: 1;
  }
  
  &__driver {
    margin-left: 16rpx;
  }
  
  &__gifts {
    display: flex;
    align-items: flex-start;
    padding: 16rpx;
    background: rgba(#FFA726, 0.1);
    border-radius: 8rpx;
    margin-top: 16rpx;
  }
}

.edit-btn-text {
  font-size: 24rpx;
  color: $warning-color;
  font-weight: 500;
}

.product-row {
  display: flex;
  align-items: center;
  padding: 8rpx 0;
  
  &__name {
    flex: 1;
    font-size: 28rpx;
    color: $text-primary;
  }
  
  &__quantity {
    font-size: 26rpx;
    color: $text-secondary;
    margin: 0 16rpx;
  }
  
  &__subtotal {
    font-size: 28rpx;
    font-weight: 500;
    color: $text-primary;
  }
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  
  &__label {
    font-size: 24rpx;
    color: $text-secondary;
    margin-bottom: 4rpx;
  }
  
  &__value {
    font-size: 28rpx;
    font-weight: 500;
    color: $text-primary;
    
    &--highlight {
      font-size: 32rpx;
      font-weight: 700;
      color: $primary-color;
    }
  }
}

.gifts-icon {
  width: 32rpx;
  height: 32rpx;
  margin-right: 12rpx;
  margin-top: 4rpx;
}

.gifts-content {
  flex: 1;
}

.gifts-promotion {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4rpx;
  margin-bottom: 8rpx;
  font-size: 24rpx;
}

.promotion-label {
  color: $text-secondary;
}

.promotion-name {
  color: $primary-color;
  font-weight: 500;
}

.gifts-items {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8rpx;
  font-size: 24rpx;
}

.gifts-label {
  color: $text-secondary;
}

.gift-item {
  color: $text-primary;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 0;
}

.empty-icon {
  width: 120rpx;
  height: 120rpx;
  opacity: 0.3;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: $text-placeholder;
}

</style>

