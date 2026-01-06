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
      <view class="section-title">年度任务进度</view>
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
              <text class="task-item__target">{{ stats.target }}箱</text>
            </view>
            <view class="progress-ring" :class="{ 'progress-ring--green': index % 2 === 1 }">
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
    
    <!-- 促销进度 -->
    <view class="card" v-if="performance?.promotionProgress">
      <view class="section-title">促销活动进度</view>
      <view class="promotion-card">
        <view class="promotion-card__header">
          <text class="promotion-card__title">年终大促</text>
          <text class="promotion-card__rule">每满100件赠送5件A产品</text>
        </view>
        <view class="promotion-card__body">
          <view class="promotion-stat">
            <text class="promotion-stat__label">已购买</text>
            <text class="promotion-stat__value">{{ performance.promotionProgress.purchased }}件</text>
          </view>
          <view class="promotion-stat promotion-stat--wide">
            <text class="promotion-stat__label">已获赠品</text>
            <view class="promotion-stat__gifts">
              <view 
                v-for="gift in performance.promotionProgress.giftsEarned" 
                :key="gift.productId"
                class="gift-item"
              >
                <text class="gift-name">{{ gift.productName }}</text>
                <text class="gift-qty">x{{ gift.quantity }}</text>
              </view>
              <text v-if="performance.promotionProgress.giftsEarned.length === 0" class="no-gift">暂无</text>
            </view>
          </view>
        </view>
        <view class="promotion-progress">
          <view 
            class="promotion-progress__inner"
            :style="{ width: (performance.promotionProgress.purchased % 100) + '%' }"
          ></view>
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
            <text v-for="item in order.items" :key="item.productId">
              {{ item.productName }} x{{ item.quantity }}
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
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'
import BalanceCard from '@/components/BalanceCard/index.vue'

const store = useAppStore()

const agent = computed(() => store.currentAgent)
const performance = computed(() => store.getAgentStats(store.currentAgentId))
const recentOrders = computed(() => store.getAgentOrders(store.currentAgentId).slice(0, 5))

// 获取商品名称
const getProductName = (productId: string) => {
  const product = store.products.find(p => p.id === productId)
  return product?.name || productId
}

// 获取目标标签（支持组合目标和单个目标）
const getTargetLabel = (key: string, stats: any) => {
  // 如果是组合目标
  if (stats.isGroup) {
    // 优先使用 productNames（后端已经处理了组合名称）
    if (stats.productNames) {
      return stats.productNames
    }
    // 如果没有 productNames，尝试从 products 数组生成
    if (stats.products && Array.isArray(stats.products)) {
      return stats.products.map((pid: string) => getProductName(pid)).join(' + ')
    }
    // 如果都没有，检查 key 是否是组合 key
    if (key.startsWith('_group_') || key.startsWith('group_')) {
      // 尝试从 yearlyTargets 中获取组合信息
      const currentAgent = store.agents.find(a => a.id === store.currentAgentId)
      if (currentAgent && currentAgent.yearlyTargets) {
        const groupTarget = currentAgent.yearlyTargets[key]
        if (groupTarget && typeof groupTarget === 'object' && 'products' in groupTarget) {
          const products = (groupTarget as any).products
          if (Array.isArray(products)) {
            return products.map((pid: string) => getProductName(pid)).join(' + ')
          }
        }
      }
    }
    // 最后的后备方案：返回 key（不应该到这里）
    return key
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
  background: conic-gradient($primary-color 0%, $bg-grey 0%);
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
  }
  
  &__value {
    position: relative;
    z-index: 1;
    font-size: 22rpx;
    font-weight: 600;
    color: $primary-color;
  }
  
  &--green {
    background: conic-gradient($success-color 0%, $bg-grey 0%);
    
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

.promotion-card {
  background: #FFF7ED;
  border-radius: $border-radius;
  padding: 24rpx;
  
  &__header {
    margin-bottom: 20rpx;
  }
  
  &__title {
    font-size: 32rpx;
    font-weight: 600;
    color: #d48806;
    display: block;
  }
  
  &__rule {
    font-size: 24rpx;
    color: #ad6800;
    margin-top: 4rpx;
    display: block;
  }
  
  &__body {
    display: flex;
    gap: 16rpx;
    margin-bottom: 16rpx;
  }
}

.promotion-stat {
  flex: 1;
  padding: 16rpx;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8rpx;
  text-align: center;
  
  &--wide {
    flex: 2;
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
    
    &--highlight {
      color: $success-color;
    }
  }
  
  &__gifts {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8rpx;
    margin-top: 8rpx;
  }
}

.gift-item {
  display: flex;
  align-items: center;
  padding: 4rpx 12rpx;
  background: rgba($success-color, 0.1);
  border-radius: 4rpx;
}

.gift-name {
  font-size: 22rpx;
  color: $success-color;
}

.gift-qty {
  font-size: 22rpx;
  color: $success-color;
  font-weight: 600;
  margin-left: 4rpx;
}

.no-gift {
  font-size: 24rpx;
  color: $text-placeholder;
  margin-top: 4rpx;
}

.promotion-progress {
  height: 12rpx;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 6rpx;
  overflow: hidden;
  
  &__inner {
    height: 100%;
    background: linear-gradient(90deg, #ffc53d 0%, #fa8c16 100%);
    border-radius: 6rpx;
    transition: width $transition;
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

