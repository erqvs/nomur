<template>
  <view class="gifts-page" v-if="agent">
    <!-- 搭赠汇总 -->
    <view class="card" v-if="giftsSummary">
      <view class="section-title">搭赠情况</view>
      <view class="gifts-summary-card">
        <view class="gifts-summary-card__body">
          <view class="gifts-summary-stat">
            <text class="gifts-summary-stat__label">总数量</text>
            <text class="gifts-summary-stat__value">{{ giftsSummary.totalQuantity }}箱</text>
          </view>
          <view class="gifts-summary-stat gifts-summary-stat--success">
            <text class="gifts-summary-stat__label">已送达</text>
            <text class="gifts-summary-stat__value">{{ giftsSummary.deliveredQuantity }}箱</text>
          </view>
          <view class="gifts-summary-stat gifts-summary-stat--warning">
            <text class="gifts-summary-stat__label">未送达</text>
            <text class="gifts-summary-stat__value">{{ giftsSummary.undeliveredQuantity }}箱</text>
          </view>
        </view>
        <view class="gifts-summary-progress" v-if="giftsSummary.totalQuantity > 0">
          <view 
            class="gifts-summary-progress__inner"
            :style="{ width: Math.min(100, (giftsSummary.deliveredQuantity / giftsSummary.totalQuantity * 100)) + '%' }"
          ></view>
        </view>
      </view>
    </view>
    
    <!-- 搭赠详情列表 -->
    <view class="card" v-if="giftsList.length > 0">
      <view class="section-title">搭赠详情</view>
      <view class="gifts-detail-list">
        <view 
          v-for="gift in giftsList" 
          :key="gift.isGroup ? gift.groupId : gift.productId"
          class="gifts-detail-item"
        >
          <text class="gifts-detail-item__name">
            {{ gift.isGroup ? gift.groupName : gift.productName }}
          </text>
          <text class="gifts-detail-item__quantity">
            x{{ gift.totalQuantity }}箱
          </text>
        </view>
      </view>
    </view>
    
    <view v-if="loading" class="loading-state">
      <text class="loading-text">加载中...</text>
    </view>
    
    <view v-else-if="!giftsSummary && giftsList.length === 0" class="empty-state">
      <image src="/static/icons/gift.svg" class="empty-icon" mode="aspectFit" />
      <text class="empty-text">暂无搭赠记录</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { agentApi } from '@/api'

const store = useAppStore()

const agent = computed(() => store.currentAgent)
const giftsList = ref<Array<{
  productId?: string
  groupId?: string
  productName?: string
  groupName?: string
  totalQuantity: number
  deliveredQuantity: number
  undeliveredQuantity: number
  isGroup?: boolean
}>>([])
const loading = ref(false)

// 搭赠情况汇总
const giftsSummary = computed(() => {
  if (giftsList.value.length === 0) {
    return null
  }
  const total = giftsList.value.reduce((sum, gift) => sum + gift.totalQuantity, 0)
  const delivered = giftsList.value.reduce((sum, gift) => sum + gift.deliveredQuantity, 0)
  const undelivered = giftsList.value.reduce((sum, gift) => sum + gift.undeliveredQuantity, 0)
  return {
    totalQuantity: total,
    deliveredQuantity: delivered,
    undeliveredQuantity: undelivered
  }
})

onMounted(async () => {
  await loadGifts()
})

const loadGifts = async () => {
  if (!store.currentAgentId) return
  
  try {
    loading.value = true
    const gifts = await agentApi.getGifts(store.currentAgentId)
    giftsList.value = gifts || []
  } catch (error) {
    console.error('加载搭赠情况失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
    giftsList.value = []
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.gifts-page {
  padding: 24rpx;
  padding-bottom: 48rpx;
}

.card {
  background: #fff;
  border-radius: $border-radius;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: $shadow-sm;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 24rpx;
  padding-left: 8rpx;
  border-left: 4rpx solid $primary-color;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 80rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: $text-placeholder;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
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

.gifts-summary-card {
  background: #FFF7ED;
  border-radius: $border-radius;
  padding: 24rpx;
  
  &__body {
    display: flex;
    gap: 16rpx;
    margin-bottom: 16rpx;
  }
}

.gifts-summary-stat {
  flex: 1;
  padding: 16rpx;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 8rpx;
  text-align: center;
  
  &--success {
    background: rgba($success-color, 0.1);
  }
  
  &--warning {
    background: rgba($warning-color, 0.1);
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
    
    .gifts-summary-stat--success & {
      color: $success-color;
    }
    
    .gifts-summary-stat--warning & {
      color: $warning-color;
    }
  }
}

.gifts-summary-progress {
  height: 12rpx;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 6rpx;
  overflow: hidden;
  
  &__inner {
    height: 100%;
    background: linear-gradient(90deg, #10B981 0%, #059669 100%);
    border-radius: 6rpx;
    transition: width 0.3s;
  }
}

.gifts-detail-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.gifts-detail-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  
  &__name {
    font-size: 28rpx;
    font-weight: 600;
    color: $text-primary;
    flex: 1;
  }
  
  &__quantity {
    font-size: 28rpx;
    color: $text-secondary;
    margin-left: 16rpx;
  }
}
</style>
