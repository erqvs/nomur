<template>
  <view class="balance-card" :class="{ 'balance-card--negative': balance < 0 }">
    <view class="balance-card__bg"></view>
    <view class="balance-card__content">
      <view class="balance-card__header">
        <text class="balance-card__label">{{ label }}</text>
        <view v-if="showEye" class="balance-card__eye" @tap="toggleVisible">
          <image 
            :src="isVisible ? '/static/icons/eye.svg' : '/static/icons/eye-off.svg'" 
            class="eye-icon" 
            mode="aspectFit" 
          />
        </view>
      </view>
      <view class="balance-card__amount">
        <text class="balance-card__currency">¥</text>
        <text class="balance-card__value">
          {{ isVisible ? formattedBalance : '****' }}
        </text>
      </view>
      <view v-if="balance < 0" class="balance-card__warning">
        <text class="balance-card__warning-icon">⚠</text>
        <text class="balance-card__warning-text">当前为欠款状态</text>
      </view>
      <view v-if="subInfo" class="balance-card__sub">
        {{ subInfo }}
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  balance: number
  label?: string
  showEye?: boolean
  subInfo?: string
}>(), {
  label: '账户余额',
  showEye: true
})

const isVisible = ref(true)

const formattedBalance = computed(() => {
  const absValue = Math.abs(props.balance)
  const formatted = absValue.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return props.balance < 0 ? `-${formatted}` : formatted
})

const toggleVisible = () => {
  isVisible.value = !isVisible.value
}
</script>

<style lang="scss" scoped>
.balance-card {
  position: relative;
  border-radius: $border-radius-lg;
  overflow: hidden;
  padding: 40rpx;
  background: $primary-color;
  color: #fff;
  
  &--negative {
    background: $danger-color;
  }
  
  &__bg {
    position: absolute;
    top: -50%;
    right: -20%;
    width: 300rpx;
    height: 300rpx;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
  }
  
  &__content {
    position: relative;
    z-index: 1;
  }
  
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20rpx;
  }
  
  &__label {
    font-size: 28rpx;
    opacity: 0.9;
  }
  
  &__eye {
    padding: 8rpx;
    
    .eye-icon {
      width: 40rpx;
      height: 40rpx;
      filter: brightness(0) invert(1);
    }
  }
  
  &__amount {
    display: flex;
    align-items: baseline;
    margin-bottom: 16rpx;
  }
  
  &__currency {
    font-size: 36rpx;
    font-weight: 500;
    margin-right: 8rpx;
  }
  
  &__value {
    font-size: 64rpx;
    font-weight: 700;
    letter-spacing: -2rpx;
  }
  
  &__warning {
    display: flex;
    align-items: center;
    padding: 12rpx 20rpx;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 8rpx;
    margin-bottom: 16rpx;
  }
  
  &__warning-icon {
    margin-right: 8rpx;
  }
  
  &__warning-text {
    font-size: 24rpx;
  }
  
  &__sub {
    font-size: 24rpx;
    opacity: 0.8;
  }
}
</style>

