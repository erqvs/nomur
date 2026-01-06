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
            <text class="order-agent">代理商：{{ order.agentName }}</text>
            <text class="order-time">创建时间：{{ formatTime(order.createdAt) }}</text>
          </view>
        </view>
      </view>

      <!-- 商品列表 -->
      <view class="card">
        <view class="section-title">商品明细</view>
        <view class="product-list">
          <view 
            v-for="item in order.items" 
            :key="item.productId"
            class="product-item"
          >
            <text class="product-name">{{ item.productName }}</text>
            <text class="product-quantity">x{{ item.quantity }}</text>
            <text class="product-price">¥{{ (item.quantity * item.price).toLocaleString() }}</text>
          </view>
        </view>
      </view>

      <!-- 赠品信息 -->
      <view v-if="order.giftItems && order.giftItems.length > 0" class="card">
        <view class="section-title">赠品</view>
        <view v-if="order.promotionNames && order.promotionNames.length > 0" class="promotion-info">
          <text class="promotion-label">参与活动：</text>
          <text v-for="(name, idx) in order.promotionNames" :key="idx" class="promotion-name">
            {{ name }}<text v-if="idx < order.promotionNames.length - 1">、</text>
          </text>
        </view>
        <view class="gift-list">
          <view 
            v-for="gift in order.giftItems" 
            :key="gift.productId"
            class="gift-item"
          >
            <image src="/static/icons/gift.svg" class="gift-icon" mode="aspectFit" />
            <text class="gift-name">{{ gift.productName }}</text>
            <text class="gift-quantity">x{{ gift.quantity }}</text>
          </view>
        </view>
      </view>

      <!-- 订单汇总 -->
      <view class="card">
        <view class="section-title">订单汇总</view>
        <view class="summary-list">
          <view class="summary-item">
            <text class="summary-label">总重量</text>
            <text class="summary-value">{{ order.totalWeight.toFixed(1) }}kg</text>
          </view>
          <view class="summary-item">
            <text class="summary-label">总金额</text>
            <text class="summary-value summary-value--highlight">¥{{ order.totalAmount.toLocaleString() }}</text>
          </view>
          <view class="summary-item">
            <text class="summary-label">司机手机号</text>
            <text class="summary-value">{{ order.driverPhone || '未填写' }}</text>
          </view>
          <view v-if="order.remark" class="summary-item">
            <text class="summary-label">备注</text>
            <text class="summary-value">{{ order.remark }}</text>
          </view>
        </view>
      </view>

      <!-- 订单图片 -->
      <view v-if="order.images && order.images.length > 0" class="card">
        <view class="section-title">订单图片</view>
        <view class="image-list">
          <image 
            v-for="(img, index) in order.images" 
            :key="index"
            :src="img" 
            class="order-image"
            mode="aspectFill"
            @tap="previewImage(index)"
          />
        </view>
      </view>

      <!-- 分享按钮 -->
      <view class="share-btn" @tap="shareOrder">
        <image src="/static/icons/arrow-right.svg" class="share-icon" mode="aspectFit" />
        <text class="share-btn__text">分享订单</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { orderApi } from '@/api'
import type { Order } from '@/types'

const orderId = ref('')
const order = ref<Order | null>(null)
const loading = ref(true)

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
  } catch (error) {
    uni.showToast({ title: '加载订单失败', icon: 'none' })
  } finally {
    loading.value = false
  }
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

const previewImage = (index: number) => {
  if (!order.value?.images) return
  uni.previewImage({
    urls: order.value.images,
    current: index
  })
}

const shareOrder = () => {
  if (!order.value) return
  
  const shareUrl = `https://nomur.linkmate.site/#/pages/admin/orders/detail?id=${order.value.id}`
  
  // #ifdef H5
  // H5端：复制链接到剪贴板
  if (navigator.clipboard) {
    navigator.clipboard.writeText(shareUrl).then(() => {
      uni.showToast({ title: '链接已复制', icon: 'success' })
    }).catch(() => {
      // 降级方案：使用输入框选择
      copyTextFallback(shareUrl)
    })
  } else {
    copyTextFallback(shareUrl)
  }
  // #endif
  
  // #ifdef MP-WEIXIN
  // 微信小程序：使用分享功能
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline']
  })
  // #endif
}

const copyTextFallback = (text: string) => {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    document.execCommand('copy')
    uni.showToast({ title: '链接已复制', icon: 'success' })
  } catch (err) {
    uni.showToast({ title: '复制失败', icon: 'none' })
  }
  document.body.removeChild(textarea)
}
</script>

<style lang="scss" scoped>
.order-detail {
  min-height: 100vh;
  background: $bg-grey;
  padding: 24rpx;
  padding-bottom: 200rpx;
}

.loading {
  text-align: center;
  padding: 100rpx 0;
  color: $text-secondary;
}

.order-content {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.card {
  background: #fff;
  border-radius: $border-radius-lg;
  padding: 32rpx;
  box-shadow: $shadow-sm;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 24rpx;
  display: block;
}

.order-header {
  &__info {
    display: flex;
    justify-content: space-between;
    align-items: center;
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
}

.order-agent,
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
  padding: 20rpx 0;
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
  margin: 0 24rpx;
}

.product-price {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-primary;
}

.promotion-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4rpx;
  margin-bottom: 16rpx;
  padding: 12rpx 16rpx;
  background: rgba($primary-color, 0.08);
  border-radius: 8rpx;
  font-size: 26rpx;
}

.promotion-label {
  font-weight: 500;
  color: $text-secondary;
}

.promotion-name {
  color: $primary-color;
  font-weight: 500;
}

.gift-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.gift-item {
  display: flex;
  align-items: center;
  padding: 16rpx;
  background: rgba(#FFA726, 0.1);
  border-radius: 8rpx;
}

.gift-icon {
  width: 32rpx;
  height: 32rpx;
  margin-right: 12rpx;
}

.gift-name {
  flex: 1;
  font-size: 28rpx;
  color: $text-primary;
}

.gift-quantity {
  font-size: 28rpx;
  color: $text-secondary;
}

.summary-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-label {
  font-size: 28rpx;
  color: $text-secondary;
}

.summary-value {
  font-size: 28rpx;
  color: $text-primary;
  font-weight: 500;
  
  &--highlight {
    font-size: 32rpx;
    font-weight: 700;
    color: $primary-color;
  }
}

.image-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.order-image {
  width: 100%;
  height: 200rpx;
  border-radius: 8rpx;
}

.share-btn {
  position: fixed;
  bottom: 140rpx;
  left: 24rpx;
  right: 24rpx;
  height: 100rpx;
  background: $primary-color;
  border-radius: $border-radius-lg;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 8rpx 24rpx rgba($primary-color, 0.4);
  
  &:active {
    transform: scale(0.98);
  }
}

.share-icon {
  width: 40rpx;
  height: 40rpx;
  filter: brightness(0) invert(1);
}

.share-btn__text {
  font-size: 34rpx;
  font-weight: 600;
  color: #fff;
}
</style>

