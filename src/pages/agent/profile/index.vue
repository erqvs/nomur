<template>
  <view class="profile-page" v-if="agent">
    <!-- 个人信息卡片 -->
    <view class="profile-card">
      <image :src="agent.avatar" class="profile-card__avatar" mode="aspectFill" />
      <view class="profile-card__info">
        <text class="profile-card__name">{{ agent.name }}</text>
        <text class="profile-card__phone">{{ agent.phone1 }}</text>
        <text v-if="agent.phone2" class="profile-card__phone">{{ agent.phone2 }}</text>
      </view>
    </view>
    
    <!-- 余额卡片 -->
    <view class="balance-card" @tap="goToBalance">
      <view class="balance-card__header">
        <text class="balance-card__title">账户余额</text>
        <text class="balance-card__link">查看明细 ›</text>
      </view>
      <text class="balance-card__value" :class="{ 'amount-negative': agent.balance < 0 }">
        ¥{{ agent.balance.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) }}
      </text>
    </view>
    
    <!-- 功能列表 -->
    <view class="menu-section">
      <view class="menu-item" @tap="goToOrders">
        <view class="menu-item__icon">
          <image src="/static/icons/box.svg" class="menu-icon" mode="aspectFit" />
        </view>
        <text class="menu-item__text">我的订单</text>
        <text class="menu-item__arrow">›</text>
      </view>
      <view class="menu-item" @tap="goToBalance">
        <view class="menu-item__icon">
          <image src="/static/icons/money.svg" class="menu-icon" mode="aspectFit" />
        </view>
        <text class="menu-item__text">余额明细</text>
        <text class="menu-item__arrow">›</text>
      </view>
      <view class="menu-item" @tap="goToPromotions">
        <view class="menu-item__icon">
          <image src="/static/icons/gift.svg" class="menu-icon" mode="aspectFit" />
        </view>
        <text class="menu-item__text">促销活动</text>
        <text class="menu-item__arrow">›</text>
      </view>
      <view class="menu-item" @tap="goToGifts">
        <view class="menu-item__icon">
          <image src="/static/icons/gift.svg" class="menu-icon" mode="aspectFit" />
        </view>
        <text class="menu-item__text">搭赠情况</text>
        <text class="menu-item__arrow">›</text>
      </view>
      <view class="menu-item" @tap="goToMaterials">
        <view class="menu-item__icon">
          <image src="/static/icons/folder.svg" class="menu-icon" mode="aspectFit" />
        </view>
        <text class="menu-item__text">素材下载</text>
        <text class="menu-item__arrow">›</text>
      </view>
    </view>
    
    <!-- 地址信息 -->
    <view class="address-section">
      <view class="section-header">
        <text class="section-title">收货地址</text>
      </view>
      <view class="address-content">
        <view class="address-icon">
          <image src="/static/icons/location.svg" class="location-icon" mode="aspectFit" />
        </view>
        <text class="address-text">{{ agent.address || '暂未设置收货地址' }}</text>
      </view>
    </view>
    
    <!-- 年度目标 -->
    <view class="target-section">
      <view class="section-header">
        <text class="section-title">年度目标</text>
      </view>
      <view class="target-grid">
        <view 
          v-for="(target, productId) in agent.yearlyTargets" 
          :key="productId"
          class="target-item"
        >
          <text class="target-item__label">{{ getTargetLabel(productId, target) }}</text>
          <text class="target-item__value">{{ getTargetValue(target) }}箱</text>
        </view>
        <view v-if="Object.keys(agent.yearlyTargets).length === 0" class="empty-targets">
          <text class="empty-text">暂未设置年度目标</text>
        </view>
      </view>
    </view>
    
    <!-- 切换账号 -->
    <view class="switch-btn" @tap="switchAccount">
      <text class="switch-btn__text">切换账号</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'

const store = useAppStore()

const agent = computed(() => store.currentAgent)

// 获取商品名称
const getProductName = (productId: string) => {
  const product = store.products.find(p => p.id === productId)
  return product?.name || productId
}

// 获取目标标签（支持组合目标和单个目标）
const getTargetLabel = (key: string, target: number | { products: string[]; target: number; groupId?: string }) => {
  // 如果是组合目标（对象类型）
  if (typeof target === 'object' && target !== null && 'products' in target) {
    // 如果有groupId，尝试从stores获取组合名称（需要先加载产品组合）
    // 暂时使用产品名称拼接，后续可以通过API获取组合名称
    const products = target.products
    if (Array.isArray(products)) {
      return products.map((pid: string) => getProductName(pid)).join(' + ')
    }
  }
  // 如果是组合目标的 key（以 _group_ 或 group_ 开头）
  if (key.startsWith('_group_') || key.startsWith('group_')) {
    // 尝试从 target 中获取组合信息
    if (typeof target === 'object' && target !== null && 'products' in target) {
      const products = (target as any).products
      if (Array.isArray(products)) {
        return products.map((pid: string) => getProductName(pid)).join(' + ')
      }
    }
    // 如果无法获取，返回 key（不应该到这里）
    return key
  }
  // 单个产品目标
  return getProductName(key)
}

// 获取目标值
const getTargetValue = (target: number | { products: string[]; target: number }) => {
  if (typeof target === 'object' && target !== null && 'target' in target) {
    return target.target
  }
  return target
}

const goToOrders = () => {
  uni.navigateTo({ url: '/pages/agent/orders/index' })
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

const goToMaterials = () => {
  uni.switchTab({ url: '/pages/agent/materials/index' })
}

const switchAccount = () => {
  uni.reLaunch({ url: '/pages/index/index' })
}
</script>

<style lang="scss" scoped>
.profile-page {
  padding: 24rpx;
  padding-bottom: 120rpx;
}

.profile-card {
  display: flex;
  align-items: center;
  padding: 32rpx;
  background: $primary-color;
  border-radius: $border-radius-lg;
  margin-bottom: 24rpx;
  
  &__avatar {
    width: 120rpx;
    height: 120rpx;
    border-radius: 50%;
    border: 4rpx solid rgba(255, 255, 255, 0.3);
    margin-right: 28rpx;
  }
  
  &__info {
    flex: 1;
  }
  
  &__name {
    font-size: 40rpx;
    font-weight: 700;
    color: #fff;
    display: block;
    margin-bottom: 8rpx;
  }
  
  &__phone {
    font-size: 28rpx;
    color: rgba(255, 255, 255, 0.8);
    display: block;
    margin-top: 4rpx;
  }
}

.balance-card {
  background: #fff;
  border-radius: $border-radius-lg;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: $shadow-sm;
  
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;
  }
  
  &__title {
    font-size: 28rpx;
    color: $text-secondary;
  }
  
  &__link {
    font-size: 26rpx;
    color: $primary-color;
  }
  
  &__value {
    font-size: 56rpx;
    font-weight: 700;
    color: $success-color;
  }
}

.amount-negative {
  color: $danger-color !important;
}

.menu-section {
  background: #fff;
  border-radius: $border-radius-lg;
  margin-bottom: 24rpx;
  box-shadow: $shadow-sm;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 32rpx 28rpx;
  border-bottom: 1rpx solid $border-color;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:active {
    background: $bg-hover;
  }
  
  &__icon {
    width: 48rpx;
    height: 48rpx;
    margin-right: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  &__text {
    flex: 1;
    font-size: 30rpx;
    color: $text-primary;
  }
  
  &__arrow {
    font-size: 36rpx;
    color: $text-placeholder;
  }
}

.menu-icon {
  width: 40rpx;
  height: 40rpx;
}

.location-icon {
  width: 32rpx;
  height: 32rpx;
}

.address-section,
.target-section {
  background: #fff;
  border-radius: $border-radius-lg;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: $shadow-sm;
}

.section-header {
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-primary;
}

.address-content {
  display: flex;
  align-items: flex-start;
}

.address-icon {
  font-size: 32rpx;
  margin-right: 12rpx;
}

.address-text {
  flex: 1;
  font-size: 28rpx;
  color: $text-secondary;
  line-height: 1.5;
}

.target-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 24rpx;
}

.target-item {
  flex: 1;
  min-width: calc(50% - 12rpx);
  padding: 20rpx;
  background: $bg-grey;
  border-radius: 12rpx;
  text-align: center;
  
  &__label {
    font-size: 26rpx;
    color: $text-secondary;
    display: block;
    margin-bottom: 8rpx;
  }
  
  &__value {
    font-size: 36rpx;
    font-weight: 700;
    color: $primary-color;
  }
}

.empty-targets {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0;
  
  .empty-text {
    font-size: 28rpx;
    color: $text-placeholder;
  }
}

.switch-btn {
  margin-top: 40rpx;
  padding: 28rpx;
  background: $bg-grey;
  border-radius: $border-radius-lg;
  text-align: center;
  
  &:active {
    background: darken($bg-grey, 5%);
  }
  
  &__text {
    font-size: 30rpx;
    color: $text-secondary;
  }
}
</style>

