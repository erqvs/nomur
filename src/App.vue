<template>
  <CustomTabBar />
</template>

<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { useAppStore } from '@/stores/app'
import CustomTabBar from '@/components/CustomTabBar/index.vue'

onLaunch(() => {
  console.log('App Launch')
  // 初始化加载数据
  const store = useAppStore()
  store.initData()
})

onShow(() => {
  console.log('App Show')
  // 触发 CustomTabBar 更新路径
  // 通过事件总线或直接调用组件方法
  setTimeout(() => {
    try {
      const pages = getCurrentPages()
      if (pages.length > 0) {
        // 触发 CustomTabBar 更新
        uni.$emit('update-tabbar-path', '/' + pages[pages.length - 1].route)
      }
    } catch (error) {
      console.error('更新 tabbar 路径失败:', error)
    }
  }, 100)
})

onHide(() => {
  console.log('App Hide')
})
</script>

<style lang="scss">
@import '@/styles/global.scss';
</style>

