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
          'agent-card--dragging': draggingIndex === index,
          'agent-card--drag-mode': isDragMode
        }"
        :style="draggingIndex === index ? dragStyle : ''"
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
  </view>
  
  <!-- 自定义TabBar -->
  <CustomTabBar />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
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
const dragStartY = ref(0)
const dragCurrentY = ref(0)
const dragOffset = ref(0)
const originalAgents = ref<Agent[]>([])

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

// 拖拽样式
const dragStyle = computed(() => {
  if (draggingIndex.value === -1) return ''
  return {
    transform: `translateY(${dragOffset.value}px)`,
    zIndex: '999',
    opacity: '0.8'
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
  dragOffset.value = 0
}

// 触摸开始
const onTouchStart = (e: any, index: number) => {
  if (!isDragMode.value) return
  e.stopPropagation()
  draggingIndex.value = index
  dragStartY.value = e.touches[0].clientY
  dragCurrentY.value = e.touches[0].clientY
  dragOffset.value = 0
}

// 触摸移动
const onTouchMove = (e: any, index: number) => {
  if (!isDragMode.value || draggingIndex.value !== index) return
  e.stopPropagation()
  e.preventDefault()
  
  dragCurrentY.value = e.touches[0].clientY
  dragOffset.value = dragCurrentY.value - dragStartY.value
  
  // 计算应该交换的位置（考虑网格布局，每行2个）
  // 卡片高度约160rpx，转换为px约80px，加上gap约100px
  const cardHeight = 100
  const moveRows = Math.round(dragOffset.value / cardHeight)
  
  if (moveRows !== 0) {
    // 计算新位置（考虑2列布局）
    const currentRow = Math.floor(index / 2)
    const currentCol = index % 2
    const newRow = currentRow + moveRows
    const newIndex = newRow * 2 + currentCol
    
    if (newIndex >= 0 && newIndex < originalAgents.value.length && newIndex !== index) {
      // 交换位置
      const agents = [...originalAgents.value]
      const [moved] = agents.splice(index, 1)
      agents.splice(newIndex, 0, moved)
      originalAgents.value = agents
      draggingIndex.value = newIndex
      dragStartY.value = dragCurrentY.value
      dragOffset.value = 0
      uni.vibrateShort() // 震动反馈
    }
  }
}

// 触摸结束
const onTouchEnd = (e: any, index: number) => {
  if (!isDragMode.value) return
  e.stopPropagation()
  draggingIndex.value = -1
  dragOffset.value = 0
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

// 页面显示时刷新数据（从详情页返回时）
onShow(async () => {
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
    
    &:active {
      background: #fff;
    }
  }
  
  &--dragging {
    box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.2);
    transform: scale(1.05);
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
