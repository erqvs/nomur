<template>
  <view class="custom-tabbar" v-show="showTabBar">
    <view 
      v-for="item in tabBarList" 
      :key="item.pagePath"
      class="tabbar-item"
      :class="{ 'tabbar-item--active': isActive(item.pagePath) }"
      @tap="switchTab(item.pagePath)"
    >
      <view class="tabbar-icon-wrapper">
        <image 
          :src="item.iconPath" 
          class="tabbar-icon"
          :class="{ 'tabbar-icon--hidden': isActive(item.pagePath) }"
          mode="aspectFit" 
        />
        <image 
          :src="item.selectedIconPath" 
          class="tabbar-icon tabbar-icon--selected"
          :class="{ 'tabbar-icon--visible': isActive(item.pagePath) }"
          mode="aspectFit" 
        />
      </view>
      <text class="tabbar-text">{{ item.text }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useAppStore } from '@/stores/app'

const store = useAppStore()

// 管理端tabbar配置
const adminTabBar = [
  {
    pagePath: 'pages/admin/dashboard/index',
    text: '驾驶舱',
    iconPath: '/static/icons/dashboard.svg',
    selectedIconPath: '/static/icons/dashboard-active.svg'
  },
  {
    pagePath: 'pages/admin/orders/index',
    text: '开单',
    iconPath: '/static/icons/order.svg',
    selectedIconPath: '/static/icons/order-active.svg'
  },
  {
    pagePath: 'pages/admin/agents/index',
    text: '客户',
    iconPath: '/static/icons/product.svg',
    selectedIconPath: '/static/icons/product-active.svg'
  },
  {
    pagePath: 'pages/admin/finance/index',
    text: '财务',
    iconPath: '/static/icons/finance.svg',
    selectedIconPath: '/static/icons/finance-active.svg'
  },
  {
    pagePath: 'pages/admin/payees/index',
    text: '收款人',
    iconPath: '/static/icons/users.svg',
    selectedIconPath: '/static/icons/users-active.svg'
  }
]

// 超级管理员端tabbar配置
const superTabBar = [
  {
    pagePath: 'pages/super/dashboard/index',
    text: '驾驶舱',
    iconPath: '/static/icons/dashboard.svg',
    selectedIconPath: '/static/icons/dashboard-active.svg'
  },
  {
    pagePath: 'pages/super/orders/index',
    text: '订单',
    iconPath: '/static/icons/order.svg',
    selectedIconPath: '/static/icons/order-active.svg'
  },
  {
    pagePath: 'pages/super/agents/index',
    text: '客户',
    iconPath: '/static/icons/product.svg',
    selectedIconPath: '/static/icons/product-active.svg'
  },
  {
    pagePath: 'pages/super/finance/index',
    text: '财务',
    iconPath: '/static/icons/finance.svg',
    selectedIconPath: '/static/icons/finance-active.svg'
  },
  {
    pagePath: 'pages/super/payees/index',
    text: '收款人',
    iconPath: '/static/icons/users.svg',
    selectedIconPath: '/static/icons/users-active.svg'
  }
]

// 使用 store 中的全局路径状态
const currentPath = computed(() => store.tabBarCurrentPath)

// 检查路径是否匹配管理端或超级管理员端
const checkPath = (path: string): boolean => {
  if (!path) return false
  const normalizedPath = path.startsWith('/') ? path : '/' + path
  return normalizedPath.startsWith('/pages/admin/') || normalizedPath.startsWith('/pages/super/')
}

const showTabBar = computed(() => {
  return checkPath(currentPath.value)
})

const tabBarList = computed(() => {
  const path = currentPath.value
  const normalizedPath = path.startsWith('/') ? path : '/' + path
  if (normalizedPath.startsWith('/pages/super/')) {
    return superTabBar
  }
  return adminTabBar
})

const isActive = (pagePath: string) => {
  const current = currentPath.value
  const normalizedCurrent = current.startsWith('/') ? current : '/' + current
  const target = '/' + pagePath
  return normalizedCurrent === target
}

const switchTab = (pagePath: string) => {
  const fullPath = '/' + pagePath
  if (currentPath.value === fullPath) return
  
  // 先更新 store 中的路径，确保切换时 tabbar 状态正确
  store.setTabBarPath(fullPath)
  
  if (pagePath.startsWith('pages/super/')) {
    uni.reLaunch({ url: fullPath })
  } else {
    uni.switchTab({ url: fullPath })
  }
}

// 从页面栈更新路径
const updateFromPageStack = () => {
  try {
    const pages = getCurrentPages()
    if (pages.length > 0) {
      const lastPage = pages[pages.length - 1]
      let route = lastPage.route || ''
      if (route && !route.startsWith('/')) {
        route = '/' + route
      }
      if (route) {
        store.setTabBarPath(route)
      }
    }
  } catch (error) {
    console.error('[TabBar] 更新路径失败:', error)
  }
}

// 监听全局事件
const handlePathUpdate = (path: string) => {
  if (path) {
    store.setTabBarPath(path)
  }
}

onMounted(() => {
  // 监听全局路径更新事件
  uni.$on('update-tabbar-path', handlePathUpdate)
  
  // 立即从页面栈更新路径
  updateFromPageStack()
  
  // 监听页面路由变化（某些平台支持）
  if (typeof uni.onAppRoute !== 'undefined') {
    uni.onAppRoute((res: any) => {
      if (res.path) {
        store.setTabBarPath(res.path)
    }
    })
  }
})

onUnmounted(() => {
  uni.$off('update-tabbar-path', handlePathUpdate)
})
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.custom-tabbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(100rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid $border-color;
  display: flex;
  align-items: flex-start;
  justify-content: space-around;
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 1000;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.08);
  will-change: transform;
  transform: translateZ(0);
  backface-visibility: hidden;
}

.tabbar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12rpx 0;
  height: 100rpx;
  min-width: 0;
  
  &--active {
    .tabbar-text {
      color: $primary-color;
    }
  }
}

.tabbar-icon-wrapper {
  position: relative;
  width: 48rpx;
  height: 48rpx;
  margin-bottom: 4rpx;
  flex-shrink: 0;
}

.tabbar-icon {
  position: absolute;
  top: 0;
  left: 0;
  width: 48rpx;
  height: 48rpx;
  transition: opacity 0.15s ease;
  will-change: opacity;
  
  &--hidden {
    opacity: 0;
    pointer-events: none;
  }
  
  &--selected {
    opacity: 0;
    pointer-events: none;
  }
  
  &--visible {
    opacity: 1;
  }
}

.tabbar-text {
  font-size: 22rpx;
  color: #94A3B8;
  line-height: 1.2;
  text-align: center;
  white-space: nowrap;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  writing-mode: horizontal-tb;
  text-orientation: mixed;
  display: block;
}
</style>
