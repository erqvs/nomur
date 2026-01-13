<template>
  <view class="promotions-page">
    <!-- 当前促销 -->
    <view class="card">
      <view class="section-title">进行中的促销</view>
      
      <view 
        v-for="promo in activePromotions" 
        :key="promo.id"
        class="promotion-card"
      >
        <view class="promotion-card__header">
          <image src="/static/icons/party-popper.svg" class="promotion-card__icon" mode="aspectFit" />
          <view class="promotion-card__title-wrap">
            <text class="promotion-card__name">{{ promo.name }}</text>
            <text class="promotion-card__period">
              {{ formatDate(promo.startDate) }} ~ {{ formatDate(promo.endDate) }}
            </text>
          </view>
          <view class="promotion-card__badge">进行中</view>
        </view>
        
        <view class="promotion-card__rule">
          <image src="/static/icons/scroll.svg" class="promotion-card__rule-icon" mode="aspectFit" />
          <text class="promotion-card__rule-text">{{ promo.description }}</text>
        </view>
        
        <view class="promotion-card__gifts">
          <text class="promotion-card__gifts-label">赠品：</text>
          <view class="promotion-card__gifts-list">
            <text 
              v-for="(gift, idx) in getDisplayGifts(promo.gifts)" 
              :key="gift.key"
              class="promotion-card__gift-item"
            >
              {{ gift.name }} x{{ gift.quantity }}<text v-if="idx < getDisplayGifts(promo.gifts).length - 1">、</text>
            </text>
          </view>
        </view>
        
        <!-- 我的进度 -->
        <view class="my-progress">
          <view class="my-progress__header">
            <text class="my-progress__title">我的进度</text>
          </view>
          <view class="my-progress__stats">
            <view class="stat-box">
              <text class="stat-box__value">{{ getMyPurchased(promo.id) }}</text>
              <text class="stat-box__label">已购买（件）</text>
            </view>
            <view class="stat-box stat-box--highlight">
              <text class="stat-box__value">{{ getMyGifts(promo.id) }}</text>
              <text class="stat-box__label">已获赠品（件）</text>
            </view>
            <view class="stat-box">
              <text class="stat-box__value">{{ getRemaining(promo.id, getPromotionThreshold(promo)) }}</text>
              <text class="stat-box__label">距下次（件）</text>
            </view>
          </view>
          <view class="my-progress__bar">
            <view 
              class="my-progress__bar-inner"
              :style="{ width: getProgress(promo.id, getPromotionThreshold(promo)) + '%' }"
            ></view>
          </view>
          <text class="my-progress__tip">
            每满{{ getPromotionThreshold(promo) }}件可获得赠品，继续加油！
          </text>
        </view>
      </view>
      
      <view v-if="activePromotions.length === 0" class="empty-state">
        <image src="/static/icons/gift.svg" class="empty-icon" mode="aspectFit" />
        <text class="empty-text">暂无进行中的促销活动</text>
      </view>
    </view>
    
    <!-- 历史促销 -->
    <view class="card">
      <view class="section-title">历史促销</view>
      
      <view class="history-list">
        <view 
          v-for="promo in inactivePromotions" 
          :key="promo.id"
          class="history-item"
        >
          <view class="history-item__info">
            <text class="history-item__name">{{ promo.name }}</text>
            <text class="history-item__period">{{ promo.startDate }} ~ {{ promo.endDate }}</text>
          </view>
          <view class="history-item__badge">已结束</view>
        </view>
        
        <view v-if="inactivePromotions.length === 0" class="empty-state">
          <text class="empty-text">暂无历史促销</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { agentApi } from '@/api'

const store = useAppStore()

const activePromotions = computed(() => 
  store.promotions.filter(p => p.isActive)
)

const inactivePromotions = computed(() => 
  store.promotions.filter(p => !p.isActive)
)

// 促销活动进度数据
const promotionProgress = ref<Map<string, { purchased: number; giftsReceived: number }>>(new Map())
const loadingProgress = ref(false)

// 加载促销活动进度
const loadPromotionProgress = async () => {
  if (!store.currentAgentId) return
  
  try {
    loadingProgress.value = true
    const progressList = await agentApi.getPromotionProgress(store.currentAgentId)
    const progressMap = new Map()
    progressList.forEach(item => {
      progressMap.set(item.promotionId, {
        purchased: item.purchased,
        giftsReceived: item.giftsReceived
      })
    })
    promotionProgress.value = progressMap
  } catch (error) {
    console.error('加载促销活动进度失败:', error)
  } finally {
    loadingProgress.value = false
  }
}

onMounted(() => {
  loadPromotionProgress()
})

// 获取用户在某促销活动中的购买数量
const getMyPurchased = (promoId: string) => {
  const progress = promotionProgress.value.get(promoId)
  return progress?.purchased || 0
}

// 获取已获得赠品数量
const getMyGifts = (promoId: string) => {
  const progress = promotionProgress.value.get(promoId)
  return progress?.giftsReceived || 0
}

// 获取促销活动的阈值（优先使用 conditionDetails 中的 quantity）
const getPromotionThreshold = (promo: any) => {
  // 如果有 conditionDetails，使用第一个条件的 quantity
  if (promo.conditionDetails && Array.isArray(promo.conditionDetails) && promo.conditionDetails.length > 0) {
    return promo.conditionDetails[0].quantity || promo.threshold
  }
  // 否则使用 threshold
  return promo.threshold
}

// 获取距离下次赠品还差多少
const getRemaining = (promoId: string, threshold: number) => {
  const purchased = getMyPurchased(promoId)
  if (threshold <= 0) return 0
  const remainder = purchased % threshold
  return remainder === 0 ? threshold : threshold - remainder
}

// 获取进度百分比
const getProgress = (promoId: string, threshold: number) => {
  const purchased = getMyPurchased(promoId)
  if (threshold <= 0) return 0
  return Math.round((purchased % threshold) / threshold * 100)
}

// 格式化日期
const formatDate = (dateStr: string | Date) => {
  const d = new Date(dateStr)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 获取显示用的赠品列表（合并组合赠品）
const getDisplayGifts = (gifts: any[]) => {
  if (!gifts || gifts.length === 0) return []
  
  // 检查是否有组合赠品（有 groupId 或 type 字段，且有 productIds 数组）
  const hasGroupGifts = gifts.some(g => 
    (g.groupId || g.type) && g.productIds && Array.isArray(g.productIds) && g.productIds.length > 0
  )
  
  if (hasGroupGifts) {
    // 组合赠品：按 type 或 groupId 分组，合并显示
    const groupMap = new Map<string, { name: string; quantity: number; key: string }>()
    
    gifts.forEach(gift => {
      if ((gift.groupId || gift.type) && gift.productIds && Array.isArray(gift.productIds) && gift.productIds.length > 0) {
        // 这是组合赠品
        const key = gift.groupId || gift.type
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            name: gift.type || gift.groupName || '组合赠品',
            quantity: gift.quantity || 0,
            key: key
          })
        }
        // 注意：同一个组合可能有多条记录（旧格式），但 quantity 应该相同，不需要累加
      } else {
        // 单个产品赠品
        const key = gift.productId || gift.productName || ''
        if (!groupMap.has(key)) {
          groupMap.set(key, {
            name: gift.productName || gift.productId || '',
            quantity: gift.quantity || 0,
            key: key
          })
        }
      }
    })
    
    return Array.from(groupMap.values())
  } else {
    // 没有组合赠品，正常显示每个产品
    return gifts.map((gift, idx) => ({
      name: gift.productName || gift.productId || '',
      quantity: gift.quantity || 0,
      key: gift.productId || idx.toString()
    }))
  }
}
</script>

<style lang="scss" scoped>
.promotions-page {
  padding: 24rpx;
}

.promotion-card {
  background: #FFF7ED;
  border-radius: $border-radius-lg;
  padding: 28rpx;
  margin-bottom: 24rpx;
  border: 2rpx solid #ffe0b2;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &__header {
    display: flex;
    align-items: flex-start;
    margin-bottom: 20rpx;
  }
  
  &__icon {
    width: 48rpx;
    height: 48rpx;
    margin-right: 16rpx;
  }
  
  &__title-wrap {
    flex: 1;
  }
  
  &__name {
    font-size: 32rpx;
    font-weight: 600;
    color: #bf360c;
    display: block;
  }
  
  &__period {
    font-size: 24rpx;
    color: #e65100;
    margin-top: 4rpx;
    display: block;
  }
  
  &__badge {
    padding: 6rpx 16rpx;
    background: #F97316;
    color: #fff;
    font-size: 22rpx;
    border-radius: 100rpx;
    font-weight: 500;
  }
  
  &__rule {
    display: flex;
    align-items: flex-start;
    padding: 16rpx 20rpx;
    background: rgba(255, 255, 255, 0.6);
    border-radius: 12rpx;
    margin-bottom: 20rpx;
  }
  
  &__rule-icon {
    width: 32rpx;
    height: 32rpx;
    margin-right: 12rpx;
  }
  
  &__rule-text {
    flex: 1;
    font-size: 28rpx;
    color: #5d4037;
    line-height: 1.5;
  }
  
  &__gifts {
    display: flex;
    align-items: flex-start;
    flex-wrap: wrap;
    margin-bottom: 24rpx;
    gap: 8rpx;
  }
  
  &__gifts-label {
    font-size: 26rpx;
    color: #8d6e63;
    margin-right: 8rpx;
    flex-shrink: 0;
  }
  
  &__gifts-list {
    flex: 1;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4rpx;
  }
  
  &__gift-item {
    font-size: 26rpx;
    color: $success-color;
    font-weight: 500;
  }
}

.my-progress {
  padding: 24rpx;
  background: #fff;
  border-radius: 12rpx;
  
  &__header {
    margin-bottom: 16rpx;
  }
  
  &__title {
    font-size: 28rpx;
    font-weight: 600;
    color: $text-primary;
  }
  
  &__stats {
    display: flex;
    gap: 16rpx;
    margin-bottom: 20rpx;
  }
  
  &__bar {
    height: 16rpx;
    background: #f5f5f5;
    border-radius: 8rpx;
    overflow: hidden;
    margin-bottom: 12rpx;
  }
  
  &__bar-inner {
    height: 100%;
    background: linear-gradient(90deg, #ff6d00 0%, #ff8f00 100%);
    border-radius: 8rpx;
    transition: width $transition;
  }
  
  &__tip {
    font-size: 24rpx;
    color: $text-secondary;
    text-align: center;
    display: block;
  }
}

.stat-box {
  flex: 1;
  padding: 16rpx;
  background: $bg-grey;
  border-radius: 12rpx;
  text-align: center;
  
  &--highlight {
    background: rgba($success-color, 0.1);
  }
  
  &__value {
    font-size: 36rpx;
    font-weight: 700;
    color: $text-primary;
    display: block;
  }
  
  &--highlight &__value {
    color: $success-color;
  }
  
  &__label {
    font-size: 22rpx;
    color: $text-secondary;
    margin-top: 4rpx;
    display: block;
  }
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  
  &__info {
    flex: 1;
  }
  
  &__name {
    font-size: 28rpx;
    color: $text-primary;
    display: block;
  }
  
  &__period {
    font-size: 24rpx;
    color: $text-placeholder;
    margin-top: 4rpx;
    display: block;
  }
  
  &__badge {
    padding: 6rpx 16rpx;
    background: $bg-grey;
    color: $text-placeholder;
    font-size: 22rpx;
    border-radius: 100rpx;
    border: 1rpx solid $border-color;
  }
}
</style>

