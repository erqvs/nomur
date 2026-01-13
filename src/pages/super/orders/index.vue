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
          <view class="order-card__actions">
            <view class="order-card__edit-btn" @tap.stop="editOrder(order)">
              <text class="edit-btn-text">✏️ 修改</text>
            </view>
            <view class="order-card__delete-btn" @tap.stop="deleteOrder(order)">
              <text class="delete-btn-text">🗑️ 删除</text>
            </view>
          </view>
        </view>
        
        <view v-if="!filterAgentId" class="order-card__agent">
          <text>代理商：{{ order.agentName }}</text>
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
            <!-- 组合赠品显示 -->
            <view v-if="order.groupGiftInfo" class="gifts-items">
              <text class="gifts-label">赠品：</text>
              <text class="gift-group-name">{{ order.groupGiftInfo.groupName }}</text>
              <text class="gift-group-quantity">x{{ order.groupGiftInfo.totalRequirement }}箱</text>
            </view>
            <!-- 单个产品赠品显示（检查是否有组合信息） -->
            <view v-else class="gifts-items">
              <text class="gifts-label">赠品：</text>
              <text 
                v-for="(gift, index) in order.giftItems" 
                :key="gift.productId || gift.groupId || index"
                class="gift-item"
              >
                <template v-if="gift.isGroup && gift.groupId">
                  {{ getGroupName(gift.groupId) }} x{{ gift.quantity }}
                </template>
                <template v-else>
                  {{ gift.productName }} x{{ gift.quantity }}
                </template>
                <text v-if="index < order.giftItems.length - 1">、</text>
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
import { orderApi, productGroupApi } from '@/api'
import type { Order, ProductGroup } from '@/types'
import CustomTabBar from '@/components/CustomTabBar/index.vue'

const store = useAppStore()
const filterAgentId = ref<string>('')
const orders = ref<Order[]>([])
const loading = ref(true)
const productGroups = ref<ProductGroup[]>([])

onLoad(async (options) => {
  if (options?.agentId) {
    filterAgentId.value = options.agentId
    uni.setNavigationBarTitle({
      title: '订单列表'
    })
  }
  // 加载产品组合数据
  try {
    productGroups.value = await productGroupApi.getAll()
  } catch (error) {
    console.error('加载产品组合失败:', error)
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

// 获取组合名称
const getGroupName = (groupId: string) => {
  const group = productGroups.value.find(g => g.id === groupId)
  return group?.name || `组合${groupId.slice(-4)}`
}

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
    url: `/pages/super/orders/detail?id=${orderId}`
  })
}

const editOrder = (order: Order) => {
  // 跳转到编辑页面
  uni.navigateTo({
    url: `/pages/super/orders/edit?id=${order.id}`
  })
}

const deleteOrder = (order: Order) => {
  // 确认删除
  uni.showModal({
    title: '确认删除',
    content: `确定要删除订单 ${order.id.slice(-8).toUpperCase()} 吗？\n此操作不可恢复，如果订单已发货，将退回代理商余额。`,
    confirmText: '删除',
    confirmColor: '#FF4D4F',
    cancelText: '取消',
    success: async (res) => {
      if (res.confirm) {
        // 检查是否为管理员
        if (!store.currentAdmin || (store.currentAdmin.role !== 'super_admin' && store.currentAdmin.role !== 'admin')) {
          uni.showToast({ title: '需要管理员权限', icon: 'none' })
          return
        }
        
        try {
          uni.showLoading({ title: '删除中...' })
          
          await orderApi.delete(
            order.id,
            store.currentAdmin.id,
            store.currentAdmin.role
          )
          
          uni.hideLoading()
          uni.showToast({ title: '删除成功', icon: 'success' })
          
          // 刷新订单列表和代理商数据
          await Promise.all([
            loadOrders(),
            store.loadAgents(),
            store.loadTransactions()
          ])
        } catch (error: any) {
          uni.hideLoading()
          uni.showToast({ title: error.message || '删除失败', icon: 'none' })
        }
      }
    }
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
  
  &__actions {
    display: flex;
    align-items: center;
    gap: 12rpx;
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
  
  &__delete-btn {
    padding: 8rpx 16rpx;
    background: rgba($danger-color, 0.1);
    border-radius: 8rpx;
    border: 1rpx solid rgba($danger-color, 0.3);
    
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

.delete-btn-text {
  font-size: 24rpx;
  color: $danger-color;
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
}

.gift-group-quantity {
  color: $text-secondary;
  margin-left: 8rpx;
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

