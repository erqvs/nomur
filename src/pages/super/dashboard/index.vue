<template>
  <view class="dashboard">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-content">
        <text class="navbar-title">数据驾驶舱</text>
        <view class="switch-btn" @tap="switchAccount">
          <text>切换账号</text>
        </view>
      </view>
    </view>
    
    <!-- 管理员身份标签 -->
    <view class="admin-badge">
      <text class="admin-badge__text">超级管理员</text>
    </view>
    
    <!-- 顶部操作栏 -->
    <view class="top-bar">
      <view class="quick-link" @tap="goToProducts">
        <text>商品管理</text>
      </view>
      <view class="quick-link" @tap="goToPromotions">
        <text>促销管理</text>
      </view>
      <view class="quick-link" @tap="goToTrucks">
        <text>车型管理</text>
      </view>
      <view class="quick-link" @tap="goToProductGroups">
        <text>产品组合</text>
      </view>
      <view class="quick-link" @tap="goToQuickOrder">
        <text>极速开单</text>
      </view>
      <view class="quick-link" @tap="goToOrders">
        <text>订单列表</text>
      </view>
    </view>
    
    <!-- 顶部统计卡片 -->
    <view class="stats-header">
      <view class="stats-card stats-card--primary">
        <view class="stats-card__icon">
          <image src="/static/icons/stats-package.svg" class="stats-icon" mode="aspectFit" />
        </view>
        <view class="stats-card__info">
          <text class="stats-card__value">{{ globalStats.totalShipments }}</text>
          <text class="stats-card__label">年总发货箱数</text>
        </view>
      </view>
      <view class="stats-card stats-card--success">
        <view class="stats-card__icon">
          <image src="/static/icons/stats-trending.svg" class="stats-icon" mode="aspectFit" />
        </view>
        <view class="stats-card__info">
          <text class="stats-card__value">{{ globalStats.last30DaysShipments }}</text>
          <text class="stats-card__label">近30天出库</text>
        </view>
      </view>
    </view>
    
    <!-- 产品分布 -->
    <view class="card">
      <view class="section-title">年度发货分布</view>
      <view class="product-stats">
        <view 
          v-for="stat in globalStats.productStats" 
          :key="stat.productId"
          class="product-stat-item"
        >
          <view class="product-stat-item__header">
            <text class="product-stat-item__name">{{ stat.productName }}</text>
            <text class="product-stat-item__value">{{ stat.quantity }}箱</text>
          </view>
          <view class="progress-bar">
            <view 
              class="progress-inner" 
              :style="{ width: getPercentage(stat.quantity) + '%' }"
            ></view>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 近30天分布 -->
    <view class="card">
      <view class="section-title">近30天发货分布</view>
      <view class="product-stats">
        <view 
          v-for="stat in globalStats.last30DaysProductStats" 
          :key="stat.productId"
          class="product-stat-item"
        >
          <view class="product-stat-item__header">
            <text class="product-stat-item__name">{{ stat.productName }}</text>
            <text class="product-stat-item__value">{{ stat.quantity }}箱</text>
          </view>
          <view class="progress-bar">
            <view 
              class="progress-inner progress-inner--orange" 
              :style="{ width: getPercentage30(stat.quantity) + '%' }"
            ></view>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 代理列表 -->
    <view class="card" v-if="agents.length > 0">
      <view class="section-title">代理商列表</view>
      <view class="agent-list">
        <view 
          v-for="agent in agents" 
          :key="agent.id"
          class="agent-item"
          @tap="goToAgentDetail(agent.id)"
        >
          <image :src="agent.avatar || '/static/images/default-avatar.svg'" class="agent-item__avatar" mode="aspectFill" />
          <view class="agent-item__info">
            <text class="agent-item__name">{{ agent.name }}</text>
            <text class="agent-item__phone">{{ agent.phone1 }}</text>
          </view>
          <view class="agent-item__balance" :class="{ 'amount-negative': agent.balance < 0 }">
            ¥{{ formatBalance(agent.balance) }}
          </view>
          <view class="agent-item__arrow">›</view>
        </view>
      </view>
    </view>
    
    <!-- 空状态提示 -->
    <view v-if="agents.length === 0" class="card">
      <view class="empty-state">
        <image src="/static/icons/users.svg" class="empty-icon" mode="aspectFit" />
        <text class="empty-text">暂无代理商</text>
      </view>
    </view>
    
    <!-- 自定义TabBar -->
    <CustomTabBar />
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/stores/app'
import CustomTabBar from '@/components/CustomTabBar/index.vue'

const store = useAppStore()

const globalStats = computed(() => store.globalStats)
const agents = computed(() => store.agents)

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

onMounted(() => {
  updateTabBarPath()
})

onShow(async () => {
  updateTabBarPath()
  await Promise.all([
    store.loadStatistics(),
    store.loadAgents()
  ])
})

// 计算百分比（年度）
const getPercentage = (quantity: number) => {
  if (!globalStats.value.productStats || globalStats.value.productStats.length === 0) return 0
  const max = Math.max(...globalStats.value.productStats.map(s => s.quantity), 1)
  return max > 0 ? Math.round((quantity / max) * 100) : 0
}

// 计算百分比（30天）
const getPercentage30 = (quantity: number) => {
  if (!globalStats.value.last30DaysProductStats || globalStats.value.last30DaysProductStats.length === 0) return 0
  const max = Math.max(...globalStats.value.last30DaysProductStats.map(s => s.quantity), 1)
  return max > 0 ? Math.round((quantity / max) * 100) : 0
}

// 格式化余额
const formatBalance = (balance: number) => {
  const abs = Math.abs(balance)
  const formatted = abs.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return balance < 0 ? `-${formatted}` : formatted
}

// 跳转代理详情
const goToAgentDetail = (agentId: string) => {
  uni.navigateTo({
    url: `/pages/super/agents/detail?id=${agentId}`
  })
}

// 跳转商品管理
const goToProducts = () => {
  uni.navigateTo({ url: '/pages/super/products/index' })
}

// 跳转促销管理
const goToPromotions = () => {
  uni.navigateTo({ url: '/pages/super/promotions/index' })
}

// 跳转车型管理
const goToTrucks = () => {
  uni.navigateTo({ url: '/pages/super/trucks/index' })
}

// 跳转产品组合
const goToProductGroups = () => {
  uni.navigateTo({ url: '/pages/super/product-groups/index' })
}

// 跳转极速开单
const goToQuickOrder = () => {
  uni.navigateTo({ url: '/pages/super/orders/quick-order' })
}

// 跳转订单列表
const goToOrders = () => {
  uni.navigateTo({ url: '/pages/super/orders/list' })
}

// 切换账号
const switchAccount = () => {
  uni.reLaunch({ url: '/pages/index/index' })
}
</script>

<style lang="scss" scoped>
// 确保没有任何输入框或表单元素导致红色边框
.dashboard {
  min-height: 100vh;
  padding: 0 24rpx;
  padding-bottom: calc(100rpx + env(safe-area-inset-bottom));
  background: $bg-page;
  
  // 禁止任何输入框的验证样式
  input,
  textarea,
  select {
    border: none !important;
    outline: none !important;
    box-shadow: none !important;
    
    &:invalid,
    &:required {
      border: none !important;
      outline: none !important;
      box-shadow: none !important;
    }
  }
}

// 自定义导航栏
.custom-navbar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: calc(44px + env(safe-area-inset-top));
  background: $primary-color;
  z-index: 1000;
  padding-top: env(safe-area-inset-top);
}

.navbar-content {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
}

.navbar-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #fff;
  flex: 1;
  text-align: center;
}

.switch-btn {
  padding: 8rpx 16rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #fff;
  
  text {
    display: block;
  }
  
  &:active {
    background: rgba(255, 255, 255, 0.3);
  }
}

// 管理员身份标签
.admin-badge {
  margin-top: calc(44px + env(safe-area-inset-top) + 24rpx);
  margin-bottom: 24rpx;
  padding: 16rpx 24rpx;
  background: #fff;
  border-radius: $border-radius;
  box-shadow: $shadow-sm;
  display: flex;
  align-items: center;
  justify-content: center;
}

.admin-badge__text {
  font-size: 28rpx;
  font-weight: 500;
  color: $primary-color;
}

// 顶部操作栏
.top-bar {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
  flex-wrap: wrap;
}

.quick-link {
  flex: 1;
  min-width: calc(33.333% - 12rpx);
  padding: 20rpx;
  background: #fff;
  border-radius: $border-radius;
  text-align: center;
  font-size: 28rpx;
  color: $primary-color;
  box-shadow: $shadow-sm;
  
  text {
    display: block;
  }
  
  &:active {
    background: $bg-hover;
  }
}

// 统计卡片
.stats-header {
  display: flex;
  gap: 24rpx;
  margin-bottom: 24rpx;
}

.stats-card {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 32rpx;
  border-radius: $border-radius-lg;
  color: #fff;
  
  &--primary {
    background: $primary-color;
  }
  
  &--success {
    background: $success-color;
  }
  
  &__icon {
    width: 56rpx;
    height: 56rpx;
    margin-right: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  &__info {
    display: flex;
    flex-direction: column;
  }
  
  &__value {
    font-size: 48rpx;
    font-weight: 700;
    line-height: 1.2;
  }
  
  &__label {
    font-size: 24rpx;
    opacity: 0.9;
    margin-top: 4rpx;
  }
}

.stats-icon {
  width: 48rpx;
  height: 48rpx;
}

// 卡片
.card {
  background: #fff;
  border-radius: $border-radius-lg;
  padding: 32rpx;
  box-shadow: $shadow-sm;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 24rpx;
  display: block;
  padding-left: 8rpx;
  border-left: 4rpx solid $primary-color;
}

.product-stats {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.product-stat-item {
  &__header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12rpx;
  }
  
  &__name {
    font-size: 28rpx;
    color: $text-primary;
  }
  
  &__value {
    font-size: 28rpx;
    font-weight: 600;
    color: $primary-color;
  }
}

.progress-bar {
  height: 12rpx;
  background: $bg-grey;
  border-radius: 6rpx;
  overflow: hidden;
  position: relative;
}

.progress-inner {
  height: 100%;
  background: linear-gradient(90deg, $primary-color 0%, lighten($primary-color, 10%) 100%);
  border-radius: 6rpx;
  transition: width 0.3s ease;
  
  &--orange {
    background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);
  }
}

.agent-list {
  display: flex;
  flex-direction: column;
}

.agent-item {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid $border-color;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:active {
    background: $bg-hover;
    margin: 0 -24rpx;
    padding: 24rpx;
  }
  
  &__avatar {
    width: 88rpx;
    height: 88rpx;
    border-radius: 50%;
    background: $bg-grey;
    margin-right: 20rpx;
  }
  
  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  
  &__name {
    font-size: 30rpx;
    font-weight: 500;
    color: $text-primary;
  }
  
  &__phone {
    font-size: 24rpx;
    color: $text-secondary;
    margin-top: 6rpx;
  }
  
  &__balance {
    font-size: 32rpx;
    font-weight: 600;
    color: $success-color;
    margin-right: 12rpx;
  }
  
  &__arrow {
    font-size: 36rpx;
    color: $text-placeholder;
  }
}

.amount-negative {
  color: $danger-color !important;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0;
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
