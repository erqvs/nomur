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
    
    <!-- 按钮排序模式提示 -->
    <view v-if="isButtonSortMode" class="sort-tip">
      <text class="sort-tip__text">点击方向按钮调整卡片位置</text>
      <view class="sort-tip__btn" @tap="saveButtonSortOrder">
        <text>完成排序</text>
      </view>
      <view class="sort-tip__btn-cancel" @tap="cancelButtonSortMode">
        <text>取消</text>
      </view>
    </view>
    
    <!-- 拖拽模式提示（废案，保留） -->
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
    <view class="agent-list" :class="{ 'agent-list--sort-mode': isButtonSortMode, 'agent-list--drag-mode': isDragMode }">
      <view 
        v-for="(agent, index) in displayAgents" 
        :key="agent.id"
        class="agent-card"
        :class="{
          'agent-card--placeholder': draggingIndex === index,
          'agent-card--drag-mode': isDragMode,
          'agent-card--sort-mode': isButtonSortMode,
          'agent-card--selected': isButtonSortMode && selectedCardIndex === index
        }"
        @touchstart="onTouchStart($event, index)"
        @touchmove="onTouchMove($event, index)"
        @touchend="onTouchEnd($event, index)"
        @touchcancel="onTouchEnd($event, index)"
        @tap="handleCardTap(agent.id, index)"
        @longpress="enterButtonSortMode(index)"
      >
        <text class="agent-card__name">{{ agent.name }}</text>
        <text 
          class="agent-card__balance"
          :class="{ 'agent-card__balance--negative': agent.balance < 0 }"
        >
          ¥{{ formatBalance(agent.balance) }}
        </text>
        <!-- 方向按钮 -->
        <view v-if="isButtonSortMode && selectedCardIndex === index" class="agent-card__direction-buttons">
          <view class="direction-buttons-grid">
            <view class="direction-buttons-row">
              <view 
                class="direction-btn direction-btn--up" 
                :class="{ 'direction-btn--disabled': !canMoveUp(index) }"
                @tap.stop="moveCard(index, 'up')"
              >
                <image src="/static/icons/arrow-up-circle.svg" class="direction-btn__icon" mode="aspectFit" />
              </view>
            </view>
            <view class="direction-buttons-row">
              <view 
                class="direction-btn direction-btn--left" 
                :class="{ 'direction-btn--disabled': !canMoveLeft(index) }"
                @tap.stop="moveCard(index, 'left')"
              >
                <image src="/static/icons/arrow-left.svg" class="direction-btn__icon" mode="aspectFit" />
              </view>
              <view 
                class="direction-btn direction-btn--right" 
                :class="{ 'direction-btn--disabled': !canMoveRight(index) }"
                @tap.stop="moveCard(index, 'right')"
              >
                <image src="/static/icons/arrow-right.svg" class="direction-btn__icon" mode="aspectFit" />
              </view>
            </view>
            <view class="direction-buttons-row">
              <view 
                class="direction-btn direction-btn--down" 
                :class="{ 'direction-btn--disabled': !canMoveDown(index) }"
                @tap.stop="moveCard(index, 'down')"
              >
                <image src="/static/icons/arrow-down-circle.svg" class="direction-btn__icon" mode="aspectFit" />
              </view>
            </view>
          </view>
        </view>
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

// 按钮排序模式相关状态
const isButtonSortMode = ref(false)
const selectedCardIndex = ref(-1)
const buttonSortAgents = ref<Agent[]>([])

// 拖拽相关状态（废案，保留）
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

// 显示用的代理列表（支持拖拽排序和按钮排序）
const displayAgents = computed(() => {
  if (isButtonSortMode.value) return buttonSortAgents.value
  if (isDragMode.value) return originalAgents.value
  return filteredAgents.value
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

const handleCardTap = (id: string, index: number) => {
  if (isButtonSortMode.value) {
    // 在按钮排序模式下，点击卡片切换选中状态
    if (selectedCardIndex.value === index) {
      selectedCardIndex.value = -1
    } else {
      selectedCardIndex.value = index
    }
    return
  }
  if (isDragMode.value) return
  goToDetail(id)
}

const goToDetail = (id: string) => {
  if (isDragMode.value) return
  uni.navigateTo({
    url: `/pages/super/agents/detail?id=${id}`
  })
}

const addAgent = () => {
  uni.navigateTo({
    url: '/pages/super/agents/edit'
  })
}

// 进入按钮排序模式
const enterButtonSortMode = (index: number) => {
  if (searchKey.value) {
    uni.showToast({ title: '请先清除搜索条件', icon: 'none' })
    return
  }
  if (filteredAgents.value.length === 0) {
    return
  }
  isButtonSortMode.value = true
  buttonSortAgents.value = [...filteredAgents.value]
  selectedCardIndex.value = index
  uni.vibrateShort() // 震动反馈
}

// 取消按钮排序模式
const cancelButtonSortMode = () => {
  isButtonSortMode.value = false
  selectedCardIndex.value = -1
  buttonSortAgents.value = []
}

// 判断是否可以向上移动
const canMoveUp = (index: number) => {
  return index >= 2 // 至少要在第二行才能向上移动
}

// 判断是否可以向下移动
const canMoveDown = (index: number) => {
  return index < buttonSortAgents.value.length - 2 // 至少要在倒数第二行才能向下移动
}

// 判断是否可以向左移动
const canMoveLeft = (index: number) => {
  return index % 2 === 1 // 只有在右侧（奇数索引）才能向左移动
}

// 判断是否可以向右移动
const canMoveRight = (index: number) => {
  return index % 2 === 0 && index < buttonSortAgents.value.length - 1 // 只有在左侧（偶数索引）且不是最后一个才能向右移动
}

// 移动卡片
const moveCard = (index: number, direction: 'up' | 'down' | 'left' | 'right') => {
  if (index < 0 || index >= buttonSortAgents.value.length) return
  
  let newIndex = index
  
  switch (direction) {
    case 'up':
      if (!canMoveUp(index)) return
      newIndex = index - 2 // 向上移动一行（2列布局）
      break
    case 'down':
      if (!canMoveDown(index)) return
      newIndex = index + 2 // 向下移动一行
      break
    case 'left':
      if (!canMoveLeft(index)) return
      newIndex = index - 1 // 向左移动一列
      break
    case 'right':
      if (!canMoveRight(index)) return
      newIndex = index + 1 // 向右移动一列
      break
  }
  
  if (newIndex < 0 || newIndex >= buttonSortAgents.value.length) return
  
  // 交换位置
  const agents = [...buttonSortAgents.value]
  const [moved] = agents.splice(index, 1)
  agents.splice(newIndex, 0, moved)
  buttonSortAgents.value = agents
  
  // 更新选中索引
  selectedCardIndex.value = newIndex
  
  uni.vibrateShort() // 震动反馈
}

// 保存按钮排序
const saveButtonSortOrder = async () => {
  try {
    uni.showLoading({ title: '保存中...' })
    
    // 构建排序列表
    const sortList = buttonSortAgents.value.map((agent, index) => ({
      id: agent.id,
      sortOrder: index + 1
    }))
    
    // 调用API更新排序
    await agentApi.updateSort(sortList)
    
    // 刷新数据
    await store.loadAgents()
    
    // 退出按钮排序模式
    isButtonSortMode.value = false
    selectedCardIndex.value = -1
    buttonSortAgents.value = []
    
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

// 进入拖拽模式（废案，保留）
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

// 取消拖拽模式（废案，保留）
const cancelDragMode = () => {
  isDragMode.value = false
  originalAgents.value = []
  draggingIndex.value = -1
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
  // 如果正在排序模式，退出
  if (isButtonSortMode.value) {
    isButtonSortMode.value = false
    selectedCardIndex.value = -1
    buttonSortAgents.value = []
  }
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

// 按钮排序模式提示
.sort-tip {
  background: rgba($primary-color, 0.1);
  border: 2rpx solid $primary-color;
  border-radius: $border-radius;
  padding: 20rpx 24rpx;
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  
  &__text {
    font-size: 28rpx;
    color: $primary-color;
    flex: 1;
    font-weight: 500;
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

// 拖拽模式提示（废案，保留）
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
  
  &--sort-mode {
    position: relative;
  }
  
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
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  
  &:active {
    background: $bg-hover;
  }
  
  &--sort-mode {
    position: relative;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    
    &:active {
      background: #fff;
    }
  }
  
  &--selected {
    border: 3rpx solid $primary-color;
    box-shadow: 0 4rpx 16rpx rgba($primary-color, 0.3);
    transform: scale(1.02);
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
  
  &__direction-buttons {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.95);
    border-radius: $border-radius-lg;
    backdrop-filter: blur(4rpx);
    z-index: 10;
  }
}

// 方向按钮网格布局
.direction-buttons-grid {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.direction-buttons-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

// 方向按钮样式
.direction-btn {
  width: 72rpx;
  height: 72rpx;
  background: $primary-color;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 12rpx rgba($primary-color, 0.4);
  transition: all 0.2s ease;
  
  &:active {
    transform: scale(0.9);
    opacity: 0.8;
  }
  
  &--disabled {
    background: $bg-grey;
    opacity: 0.3;
    pointer-events: none;
    box-shadow: none;
  }
  
  &__icon {
    width: 36rpx;
    height: 36rpx;
    filter: brightness(0) invert(1);
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
