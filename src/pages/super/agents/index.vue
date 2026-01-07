<template>
  <view class="agents-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input">
        <image src="/static/icons/search.svg" class="search-icon" mode="aspectFit" />
        <input 
          v-model="searchKey" 
          placeholder="搜索代理商名称/手机号" 
          class="search-input__inner"
        />
      </view>
    </view>
    
    <!-- 拖拽模式提示 -->
    <view v-if="isDragMode" class="drag-tip">
      <text class="drag-tip__text">长按任意卡片进入排序模式，上下拖拽调整顺序</text>
      <view class="drag-tip__btn" @tap="saveSortOrder">
        <text>完成排序</text>
      </view>
      <view class="drag-tip__btn-cancel" @tap="cancelDragMode">
        <text>取消</text>
      </view>
    </view>
    
    <!-- 代理列表 -->
    <view class="agent-list" :class="{ 'agent-list--drag-mode': isDragMode }">
      <view 
        v-for="(agent, index) in displayAgents" 
        :key="agent.id"
        class="agent-card"
        :class="{
          'agent-card--placeholder': draggingIndex === index,
          'agent-card--drag-mode': isDragMode
        }"
        @touchstart="onTouchStart($event, index)"
        @touchmove="onTouchMove($event, index)"
        @touchend="onTouchEnd($event, index)"
        @touchcancel="onTouchEnd($event, index)"
        @tap="!isDragMode && goToDetail(agent.id)"
        @longpress="enterDragMode"
      >
        <text class="agent-card__name">{{ agent.name }}</text>
        <text 
          class="agent-card__balance"
          :class="{ 'agent-card__balance--negative': agent.balance < 0 }"
        >
          ¥{{ formatBalance(agent.balance) }}
        </text>
        <view v-if="isDragMode" class="agent-card__drag-handle">
          <text>⋮⋮</text>
        </view>
      </view>
    </view>
    
    <!-- 拖拽浮层 - 显示被拖拽的卡片 -->
    <view 
      v-if="draggingIndex !== -1 && draggingAgent"
      class="agent-card agent-card--floating"
      :style="dragStyle"
    >
      <text class="agent-card__name">{{ draggingAgent.name }}</text>
      <text 
        class="agent-card__balance"
        :class="{ 'agent-card__balance--negative': draggingAgent.balance < 0 }"
      >
        ¥{{ formatBalance(draggingAgent.balance) }}
      </text>
      <view class="agent-card__drag-handle">
        <text>⋮⋮</text>
      </view>
    </view>
    
    <!-- 空状态 -->
    <view v-if="filteredAgents.length === 0" class="empty-state">
      <image src="/static/icons/users.svg" class="empty-icon" mode="aspectFit" />
      <text class="empty-text">{{ searchKey ? '未找到匹配的代理商' : '暂无代理商' }}</text>
    </view>
    
    <!-- 添加按钮 -->
    <view class="add-btn" @tap="addAgent">
      <text class="add-btn__icon">+</text>
      <text class="add-btn__text">添加代理</text>
    </view>
    
    <!-- 自定义TabBar -->
    <CustomTabBar />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/stores/app'
import { agentApi } from '@/api'
import type { Agent } from '@/types'
import CustomTabBar from '@/components/CustomTabBar/index.vue'

const store = useAppStore()
const searchKey = ref('')

// 拖拽相关状态
const isDragMode = ref(false)
const draggingIndex = ref(-1)
const dragStartX = ref(0)
const dragStartY = ref(0)
const dragCurrentX = ref(0)
const dragCurrentY = ref(0)
// 使用 fixed 定位时的卡片位置
const dragFixedX = ref(0)
const dragFixedY = ref(0)
// 卡片初始位置
const cardInitialX = ref(0)
const cardInitialY = ref(0)
// 卡片尺寸
const cardWidth = ref(0)
const cardHeight = ref(0)
const originalAgents = ref<Agent[]>([])
const lastSwappedIndex = ref(-1) // 记录上次交换的位置，防止闪烁

const filteredAgents = computed(() => {
  if (!searchKey.value) return store.agents
  const key = searchKey.value.toLowerCase()
  return store.agents.filter(a => 
    a.name.toLowerCase().includes(key) || 
    a.phone1.includes(key) ||
    (a.phone2 && a.phone2.includes(key))
  )
})

// 显示用的代理列表（支持拖拽排序）
const displayAgents = computed(() => {
  if (!isDragMode.value) return filteredAgents.value
  return originalAgents.value
})

// 当前被拖拽的代理
const draggingAgent = computed(() => {
  if (draggingIndex.value === -1) return null
  return originalAgents.value[draggingIndex.value]
})

// 拖拽样式 - 使用 fixed 定位实现跟手效果
const dragStyle = computed(() => {
  if (draggingIndex.value === -1) return ''
  return {
    position: 'fixed',
    left: `${dragFixedX.value}px`,
    top: `${dragFixedY.value}px`,
    width: `${cardWidth.value}px`,
    height: `${cardHeight.value}px`,
    zIndex: '999',
    opacity: '0.9',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)',
    transform: 'scale(1.05)',
    transition: 'none',
    pointerEvents: 'none'
  }
})

const formatBalance = (balance: number) => {
  const abs = Math.abs(balance)
  const formatted = abs.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
  return balance < 0 ? `-${formatted}` : formatted
}

const goToDetail = (id: string) => {
  if (isDragMode.value) return
  uni.navigateTo({
    url: `/pages/admin/agents/detail?id=${id}`
  })
}

const addAgent = () => {
  uni.navigateTo({
    url: '/pages/admin/agents/edit'
  })
}

// 进入拖拽模式
const enterDragMode = () => {
  // TODO: 拖拽排序功能暂时禁用，保留代码待后续启用
  return
  
  if (searchKey.value) {
    uni.showToast({ title: '请先清除搜索条件', icon: 'none' })
    return
  }
  if (filteredAgents.value.length === 0) {
    return
  }
  isDragMode.value = true
  originalAgents.value = [...filteredAgents.value]
  uni.vibrateShort() // 震动反馈
}

// 取消拖拽模式
const cancelDragMode = () => {
  isDragMode.value = false
  originalAgents.value = []
  draggingIndex.value = -1
  dragOffsetX.value = 0
  dragOffsetY.value = 0
  lastSwappedIndex.value = -1
}

// 触摸开始
const onTouchStart = (e: any, index: number) => {
  if (!isDragMode.value) return
  e.stopPropagation()
  
  // 获取被触摸卡片的位置和尺寸信息
  const touch = e.touches[0]
  dragStartX.value = touch.clientX
  dragStartY.value = touch.clientY
  dragCurrentX.value = touch.clientX
  dragCurrentY.value = touch.clientY
  
  // 计算卡片尺寸
  const screenWidth = uni.getSystemInfoSync().windowWidth
  const padding = screenWidth * 24 / 375 // rpx 转 px (按375设计稿)
  const gap = screenWidth * 20 / 375
  cardWidth.value = (screenWidth - padding * 2 - gap) / 2
  cardHeight.value = screenWidth * 120 / 375 // 120rpx 转 px
  
  // 计算卡片初始位置
  const row = Math.floor(index / 2)
  const col = index % 2
  cardInitialX.value = padding + col * (cardWidth.value + gap)
  // 搜索栏高度约 60rpx，拖拽提示高度约 80rpx，需要估算
  const searchBarHeight = screenWidth * 76 / 375 // 搜索栏高度
  const dragTipHeight = screenWidth * 80 / 375 // 拖拽提示高度
  const listMarginTop = searchBarHeight + dragTipHeight + padding
  cardInitialY.value = listMarginTop + row * (cardHeight.value + gap)
  
  // 设置 fixed 定位的初始位置
  dragFixedX.value = cardInitialX.value
  dragFixedY.value = cardInitialY.value
  
  draggingIndex.value = index
  lastSwappedIndex.value = -1
}

// 触摸移动
const onTouchMove = (e: any, index: number) => {
  if (!isDragMode.value || draggingIndex.value === -1) return
  e.stopPropagation()
  e.preventDefault()
  
  const touch = e.touches[0]
  dragCurrentX.value = touch.clientX
  dragCurrentY.value = touch.clientY
  
  // 计算偏移量，直接更新 fixed 位置实现跟手
  const offsetX = dragCurrentX.value - dragStartX.value
  const offsetY = dragCurrentY.value - dragStartY.value
  dragFixedX.value = cardInitialX.value + offsetX
  dragFixedY.value = cardInitialY.value + offsetY
  
  // 计算当前中心点所在的目标位置
  const centerX = dragFixedX.value + cardWidth.value / 2
  const centerY = dragFixedY.value + cardHeight.value / 2
  
  // 计算网格布局参数
  const screenWidth = uni.getSystemInfoSync().windowWidth
  const padding = screenWidth * 24 / 375
  const gap = screenWidth * 20 / 375
  const searchBarHeight = screenWidth * 76 / 375
  const dragTipHeight = screenWidth * 80 / 375
  const listTop = searchBarHeight + dragTipHeight + padding
  
  // 计算目标行列
  const targetCol = Math.floor((centerX - padding) / (cardWidth.value + gap))
  const targetRow = Math.floor((centerY - listTop) / (cardHeight.value + gap))
  
  // 限制范围
  const clampedCol = Math.max(0, Math.min(1, targetCol))
  const clampedRow = Math.max(0, targetRow)
  
  // 计算新索引
  const newIndex = clampedRow * 2 + clampedCol
  const currentIndex = draggingIndex.value
  
  // 只在位置真正改变且在有效范围内时才交换
  if (newIndex >= 0 && 
      newIndex < originalAgents.value.length && 
      newIndex !== currentIndex && 
      newIndex !== lastSwappedIndex.value) {
    // 交换位置
    const agents = [...originalAgents.value]
    const [moved] = agents.splice(currentIndex, 1)
    agents.splice(newIndex, 0, moved)
    originalAgents.value = agents
    
    // 更新索引和位置
    draggingIndex.value = newIndex
    lastSwappedIndex.value = currentIndex // 记录上次位置，防止来回抖动
    
    // 更新初始位置和触摸起点（保持手指和卡片的相对位置）
    const newRow = Math.floor(newIndex / 2)
    const newCol = newIndex % 2
    cardInitialX.value = padding + newCol * (cardWidth.value + gap)
    cardInitialY.value = listTop + newRow * (cardHeight.value + gap)
    dragStartX.value = dragCurrentX.value
    dragStartY.value = dragCurrentY.value
    
    uni.vibrateShort() // 震动反馈
  }
}

// 触摸结束
const onTouchEnd = (e: any, index: number) => {
  if (!isDragMode.value) return
  e.stopPropagation()
  draggingIndex.value = -1
  lastSwappedIndex.value = -1
}

// 保存排序
const saveSortOrder = async () => {
  try {
    uni.showLoading({ title: '保存中...' })
    
    // 构建排序列表
    const sortList = originalAgents.value.map((agent, index) => ({
      id: agent.id,
      sortOrder: index + 1
    }))
    
    // 调用API更新排序
    await agentApi.updateSort(sortList)
    
    // 刷新数据
    await store.loadAgents()
    
    // 退出拖拽模式
    isDragMode.value = false
    originalAgents.value = []
    
    uni.hideLoading()
    uni.showToast({ title: '排序已保存', icon: 'success' })
  } catch (error) {
    uni.hideLoading()
    uni.showToast({ 
      title: error instanceof Error ? error.message : '保存失败', 
      icon: 'none' 
    })
  }
}

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

// 页面显示时刷新数据（从详情页返回时）
onShow(async () => {
  updateTabBarPath()
  await store.loadAgents()
  // 如果正在拖拽模式，退出
  if (isDragMode.value) {
    isDragMode.value = false
    originalAgents.value = []
  }
})
</script>

<style lang="scss" scoped>
.agents-page {
  padding: 24rpx;
  padding-bottom: 160rpx;
}

.search-bar {
  margin-bottom: 24rpx;
}

.search-input {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  background: #fff;
  border-radius: $border-radius;
  box-shadow: $shadow-sm;
}

.search-icon {
  width: 36rpx;
  height: 36rpx;
  margin-right: 16rpx;
  opacity: 0.5;
}

.search-input__inner {
  flex: 1;
  font-size: 28rpx;
}

.drag-tip {
  background: #fff3cd;
  border: 2rpx solid #ffc107;
  border-radius: $border-radius;
  padding: 20rpx 24rpx;
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  
  &__text {
    font-size: 28rpx;
    color: #856404;
    flex: 1;
  }
  
  &__btn {
    background: $primary-color;
    color: #fff;
    padding: 12rpx 24rpx;
    border-radius: $border-radius;
    font-size: 28rpx;
    
    &:active {
      opacity: 0.8;
    }
  }
  
  &__btn-cancel {
    background: #999;
    color: #fff;
    padding: 12rpx 24rpx;
    border-radius: $border-radius;
    font-size: 28rpx;
    
    &:active {
      opacity: 0.8;
    }
  }
}

.agent-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  
  &--drag-mode {
    position: relative;
  }
}

.agent-card {
  background: #fff;
  border-radius: $border-radius-lg;
  padding: 24rpx;
  box-shadow: $shadow-sm;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 120rpx;
  position: relative;
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:active {
    background: $bg-hover;
  }
  
  &--drag-mode {
    cursor: move;
    user-select: none;
    // 在拖拽模式下，非拖拽卡片有位置过渡动画
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), 
                box-shadow 0.25s ease,
                opacity 0.25s ease;
    
    &:active {
      background: #fff;
    }
  }
  
  &--placeholder {
    // 被拖拽卡片的占位样式 - 半透明显示原位置
    opacity: 0.3;
    background: #e0e0e0;
    box-shadow: none;
  }
  
  &--floating {
    // 浮层拖拽卡片样式
    position: fixed;
    box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.3);
    background: #fff;
    pointer-events: none;
    z-index: 999;
  }
  
  &__name {
    font-size: 32rpx;
    font-weight: 600;
    color: $text-primary;
    margin-bottom: 12rpx;
  }
  
  &__balance {
    font-size: 36rpx;
    font-weight: 600;
    color: $success-color;
  }
  
  &__balance--negative {
    color: $danger-color;
  }
  
  &__drag-handle {
    position: absolute;
    top: 12rpx;
    right: 12rpx;
    color: #999;
    font-size: 24rpx;
    line-height: 1;
    transform: rotate(90deg);
  }
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
  opacity: 0.4;
}

.empty-text {
  font-size: 28rpx;
  color: $text-placeholder;
}

.add-btn {
  position: fixed;
  bottom: 120rpx;
  left: 24rpx;
  right: 24rpx;
  height: 100rpx;
  background: $primary-color;
  border-radius: $border-radius-lg;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba($primary-color, 0.4);
  
  &:active {
    transform: scale(0.98);
  }
  
  &__icon {
    font-size: 48rpx;
    color: #fff;
    margin-right: 12rpx;
  }
  
  &__text {
    font-size: 32rpx;
    font-weight: 600;
    color: #fff;
  }
}
</style>
