<template>
  <view class="custom-tabbar" v-if="showTabBar">
    <view 
      v-for="item in tabBarList" 
      :key="item.pagePath"
      class="tabbar-item"
      :class="{ 'tabbar-item--active': isActive(item.pagePath) }"
      @tap="switchTab(item.pagePath)"
    >
      <image 
        :src="isActive(item.pagePath) ? item.selectedIconPath : item.iconPath" 
        class="tabbar-icon" 
        mode="aspectFit" 
      />
      <text class="tabbar-text">{{ item.text }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
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
    iconPath: '/static/icons/credit-card.svg',
    selectedIconPath: '/static/icons/credit-card-active.svg'
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
    iconPath: '/static/icons/credit-card.svg',
    selectedIconPath: '/static/icons/credit-card-active.svg'
  }
]

const currentPath = ref('')

const showTabBar = computed(() => {
  return currentPath.value.startsWith('/pages/admin/') || currentPath.value.startsWith('/pages/super/')
})

const tabBarList = computed(() => {
  if (currentPath.value.startsWith('/pages/super/')) {
    return superTabBar
  }
  return adminTabBar
})

const isActive = (pagePath: string) => {
  return currentPath.value === '/' + pagePath
}

const switchTab = (pagePath: string) => {
  const fullPath = '/' + pagePath
  if (currentPath.value === fullPath) return
  
  if (pagePath.startsWith('pages/super/')) {
    uni.reLaunch({ url: fullPath })
  } else {
    uni.switchTab({ url: fullPath })
  }
}

onMounted(() => {
  const pages = getCurrentPages()
  if (pages.length > 0) {
    currentPath.value = '/' + pages[pages.length - 1].route
  }
})

onShow(() => {
  const pages = getCurrentPages()
  if (pages.length > 0) {
    currentPath.value = '/' + pages[pages.length - 1].route
  }
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
}

.tabbar-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12rpx 0;
  height: 100rpx;
  
  &--active {
    .tabbar-text {
      color: $primary-color;
    }
  }
}

.tabbar-icon {
  width: 48rpx;
  height: 48rpx;
  margin-bottom: 4rpx;
}

.tabbar-text {
  font-size: 22rpx;
  color: #94A3B8;
  line-height: 1.2;
}
</style>

