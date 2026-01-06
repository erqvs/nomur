<template>
  <view class="materials-page">
    <text class="page-desc">点击图片可预览大图，长按保存到相册</text>
    
    <!-- 产品选择 -->
    <view class="product-tabs">
      <view 
        v-for="product in products" 
        :key="product.id"
        class="product-tab"
        :class="{ 'product-tab--active': currentProductId === product.id }"
        @tap="currentProductId = product.id"
      >
        <image :src="product.image" class="product-tab__image" mode="aspectFill" />
        <text class="product-tab__name">{{ product.name.replace(/产品-/, '') }}</text>
      </view>
    </view>
    
    <!-- 素材列表 -->
    <view v-if="currentProduct" class="materials-section">
      <view class="section-header">
        <text class="section-title">{{ currentProduct.name }} 宣传素材</text>
        <text class="section-count">共 {{ currentProduct.materials.length }} 张</text>
      </view>
      
      <view v-if="currentProduct.materials.length > 0" class="materials-grid">
        <view 
          v-for="(url, index) in currentProduct.materials" 
          :key="index"
          class="material-item"
        >
          <image 
            :src="url" 
            class="material-item__image" 
            mode="aspectFill" 
            @tap="previewImage(url, currentProduct.materials)"
            @longpress="saveImage(url)"
          />
          <view class="material-item__actions">
            <view class="action-btn" @tap="saveImage(url)">
              <image src="/static/icons/download.svg" class="action-icon" mode="aspectFit" />
              <text class="action-text">保存</text>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 大文件提示 -->
      <view v-if="currentProduct.netdiskUrl" class="netdisk-link" @tap="openNetdisk(currentProduct.netdiskUrl)">
        <image src="/static/icons/cloud.svg" class="netdisk-icon" mode="aspectFit" />
        <view class="netdisk-info">
          <text class="netdisk-title">高清大图/视频素材</text>
          <text class="netdisk-desc">点击跳转百度网盘下载</text>
        </view>
        <image src="/static/icons/arrow-right.svg" class="netdisk-arrow" mode="aspectFit" />
      </view>
      
      <view v-else class="empty-state">
        <image src="/static/icons/folder.svg" class="empty-icon" mode="aspectFit" />
        <text class="empty-text">该产品暂无宣传素材</text>
      </view>
    </view>
    
    <!-- 下载全部按钮 -->
    <view v-if="currentProduct && currentProduct.materials.length > 0" class="download-all-btn" @tap="downloadAll">
      <text class="download-all-btn__text">保存全部素材到相册</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '@/stores/app'

const store = useAppStore()

const products = computed(() => store.products)
const currentProductId = ref(products.value[0]?.id || '')

const currentProduct = computed(() => 
  products.value.find(p => p.id === currentProductId.value)
)

// 预览图片
const previewImage = (current: string, urls: string[]) => {
  uni.previewImage({
    current,
    urls
  })
}

// 保存单张图片
const saveImage = (url: string) => {
  uni.showLoading({ title: '保存中...' })
  
  // #ifdef H5
  // H5 环境提示
  uni.hideLoading()
  uni.showModal({
    title: '提示',
    content: '请长按图片选择"保存图片"',
    showCancel: false
  })
  // #endif
  
  // #ifdef MP-WEIXIN
  uni.downloadFile({
    url,
    success: (res) => {
      uni.saveImageToPhotosAlbum({
        filePath: res.tempFilePath,
        success: () => {
          uni.hideLoading()
          uni.showToast({ title: '保存成功', icon: 'success' })
        },
        fail: () => {
          uni.hideLoading()
          uni.showToast({ title: '保存失败', icon: 'none' })
        }
      })
    },
    fail: () => {
      uni.hideLoading()
      uni.showToast({ title: '下载失败', icon: 'none' })
    }
  })
  // #endif
}

// 打开网盘链接
const openNetdisk = (url: string) => {
  // #ifdef H5
  window.open(url, '_blank')
  // #endif
  
  // #ifdef MP-WEIXIN
  uni.setClipboardData({
    data: url,
    success: () => {
      uni.showModal({
        title: '链接已复制',
        content: '请在浏览器中打开链接下载',
        showCancel: false
      })
    }
  })
  // #endif
}

// 下载全部
const downloadAll = async () => {
  if (!currentProduct.value) return
  
  const materials = currentProduct.value.materials
  if (materials.length === 0) return
  
  // #ifdef H5
  uni.showModal({
    title: '提示',
    content: `请逐个长按保存 ${materials.length} 张图片`,
    showCancel: false
  })
  // #endif
  
  // #ifdef MP-WEIXIN
  uni.showLoading({ title: `保存中 0/${materials.length}` })
  
  let successCount = 0
  for (let i = 0; i < materials.length; i++) {
    try {
      const res = await new Promise<UniApp.DownloadSuccessData>((resolve, reject) => {
        uni.downloadFile({
          url: materials[i],
          success: resolve,
          fail: reject
        })
      })
      
      await new Promise<void>((resolve, reject) => {
        uni.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => resolve(),
          fail: () => reject()
        })
      })
      
      successCount++
      uni.showLoading({ title: `保存中 ${successCount}/${materials.length}` })
    } catch {
      // 忽略单个失败
    }
  }
  
  uni.hideLoading()
  uni.showToast({
    title: `成功保存 ${successCount} 张`,
    icon: successCount === materials.length ? 'success' : 'none'
  })
  // #endif
}
</script>

<style lang="scss" scoped>
.materials-page {
  padding: 24rpx;
  padding-bottom: 200rpx;
}

.page-desc {
  display: block;
  text-align: center;
  font-size: 26rpx;
  color: $text-secondary;
  margin-bottom: 24rpx;
}

.product-tabs {
  display: flex;
  gap: 16rpx;
  overflow-x: auto;
  padding-bottom: 16rpx;
  margin-bottom: 24rpx;
  
  &::-webkit-scrollbar {
    display: none;
  }
}

.product-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16rpx;
  background: $bg-grey;
  border-radius: 16rpx;
  min-width: 140rpx;
  border: 2rpx solid transparent;
  
  &--active {
    background: rgba($primary-color, 0.1);
    border-color: $primary-color;
  }
  
  &__image {
    width: 80rpx;
    height: 80rpx;
    border-radius: 12rpx;
    margin-bottom: 8rpx;
  }
  
  &__name {
    font-size: 24rpx;
    color: $text-primary;
    white-space: nowrap;
  }
  
  &--active &__name {
    color: $primary-color;
    font-weight: 500;
  }
}

.materials-section {
  background: #fff;
  border-radius: $border-radius-lg;
  padding: 24rpx;
  box-shadow: $shadow-sm;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-primary;
}

.section-count {
  font-size: 26rpx;
  color: $text-secondary;
}

.materials-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.material-item {
  position: relative;
  border-radius: 12rpx;
  overflow: hidden;
  background: $bg-grey;
  
  &__image {
    width: 100%;
    aspect-ratio: 1;
    display: block;
  }
  
  &__actions {
    display: flex;
    justify-content: center;
    padding: 12rpx;
    background: #fff;
  }
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6rpx;
  padding: 8rpx 20rpx;
  background: $primary-color;
  border-radius: 24rpx;
  
  &:active {
    opacity: 0.8;
  }
}

.action-icon {
  width: 28rpx;
  height: 28rpx;
  filter: brightness(0) invert(1);
}

.action-text {
  font-size: 22rpx;
  color: #fff;
}

.netdisk-link {
  display: flex;
  align-items: center;
  margin-top: 24rpx;
  padding: 24rpx;
  background: #E8F5FF;
  border-radius: $border-radius;
  
  &:active {
    opacity: 0.8;
  }
}

.netdisk-icon {
  width: 56rpx;
  height: 56rpx;
  margin-right: 16rpx;
}

.netdisk-info {
  flex: 1;
}

.netdisk-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-primary;
  display: block;
}

.netdisk-desc {
  font-size: 24rpx;
  color: $text-secondary;
  margin-top: 4rpx;
  display: block;
}

.netdisk-arrow {
  width: 32rpx;
  height: 32rpx;
  opacity: 0.5;
}

.download-all-btn {
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
  box-shadow: 0 8rpx 24rpx rgba($primary-color, 0.4);
  
  &:active {
    transform: scale(0.98);
  }
  
  &__text {
    font-size: 32rpx;
    font-weight: 600;
    color: #fff;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0;
}

.empty-icon {
  font-size: 64rpx;
  margin-bottom: 16rpx;
}

.empty-text {
  font-size: 28rpx;
  color: $text-placeholder;
}
</style>

