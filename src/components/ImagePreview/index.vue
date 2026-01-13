<template>
  <view v-if="show" class="image-preview-modal" @tap="close">
    <!-- 关闭按钮 -->
    <view class="image-preview-close" @tap.stop="close">
      <text class="close-icon">×</text>
    </view>
    
    <!-- 图片显示区域（阻止冒泡，点击图片不关闭） -->
    <view class="image-preview-content" @tap.stop>
      <swiper 
        class="image-preview-swiper"
        :current="currentIndex"
        @change="onSwiperChange"
        :indicator-dots="urls.length > 1"
        indicator-color="rgba(255, 255, 255, 0.5)"
        indicator-active-color="#fff"
      >
        <swiper-item v-for="(url, index) in urls" :key="index">
          <image 
            :src="url" 
            class="image-preview-image"
            mode="aspectFit"
            :lazy-load="false"
          />
        </swiper-item>
      </swiper>
    </view>
    
    <!-- 底部操作栏（阻止冒泡，点击按钮不关闭） -->
    <view class="image-preview-footer" @tap.stop>
      <view class="image-preview-info">
        <text class="image-preview-count">{{ currentIndex + 1 }} / {{ urls.length }}</text>
      </view>
      <view class="image-preview-actions">
        <view class="close-btn" @tap.stop="close">
          <text class="close-btn-text">关闭</text>
        </view>
        <view class="download-btn" @tap.stop="downloadImage">
          <image src="/static/icons/download.svg" class="download-icon" mode="aspectFit" />
          <text class="download-text">下载图片</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { isWeChatBrowser, isMobile } from '@/utils/browser'

const props = withDefaults(defineProps<{
  show: boolean
  urls: string[]
  current?: number
}>(), {
  current: 0
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const currentIndex = ref(props.current)

watch(() => props.current, (newVal) => {
  currentIndex.value = newVal
})

watch(() => props.show, (newVal) => {
  if (newVal) {
    currentIndex.value = props.current
  }
})

const onSwiperChange = (e: any) => {
  currentIndex.value = e.detail.current
}

const close = () => {
  emit('close')
}

const downloadImage = async () => {
  const url = props.urls[currentIndex.value]
  if (!url) return
  
  uni.showLoading({ title: '保存中...' })
  
  // 处理 URL
  const fullUrl = url.startsWith('http') 
    ? url 
    : (url.startsWith('/') 
      ? (typeof window !== 'undefined' ? window.location.origin : 'https://100nomur.net') + url 
      : url)
  
  // #ifdef H5
  // 检测是否在移动端（包括微信浏览器和其他移动浏览器）
  if (isMobile() || isWeChatBrowser()) {
    // 移动端浏览器：先尝试使用 uni API 保存图片到相册，失败则降级为下载
    try {
      // 先尝试下载图片
      const downloadRes = await new Promise<UniApp.DownloadSuccessData>((resolve, reject) => {
        uni.downloadFile({
          url: fullUrl,
          success: (res) => {
            if (res.statusCode === 200) {
              resolve(res)
            } else {
              reject(new Error('下载失败'))
            }
          },
          fail: reject
        })
      })
      
      // 尝试保存到相册
      try {
        await new Promise<void>((resolve, reject) => {
          uni.saveImageToPhotosAlbum({
            filePath: downloadRes.tempFilePath,
            success: () => {
              uni.hideLoading()
              uni.showToast({ title: '保存成功', icon: 'success' })
              resolve()
            },
            fail: (err) => {
              // 保存失败，降级为下载方式
              reject(err)
            }
          })
        })
      } catch (saveError) {
        // 保存到相册失败，降级为下载方式
        console.log('保存到相册失败，降级为下载方式:', saveError)
        const response = await fetch(fullUrl)
        const blob = await response.blob()
        const blobUrl = window.URL.createObjectURL(blob)
        
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = `image_${Date.now()}.jpg`
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        window.URL.revokeObjectURL(blobUrl)
        uni.hideLoading()
        uni.showToast({ title: '下载已开始', icon: 'success' })
      }
    } catch (error) {
      // uni.downloadFile 失败，使用传统下载方式
      console.log('uni API 不可用，使用传统下载方式:', error)
      try {
        const response = await fetch(fullUrl)
        const blob = await response.blob()
        const blobUrl = window.URL.createObjectURL(blob)
        
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = `image_${Date.now()}.jpg`
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        window.URL.revokeObjectURL(blobUrl)
        uni.hideLoading()
        uni.showToast({ title: '下载已开始', icon: 'success' })
      } catch (downloadError) {
        uni.hideLoading()
        uni.showToast({ title: '下载失败', icon: 'none' })
        console.error('下载图片失败:', downloadError)
      }
    }
  } else {
    // 普通浏览器：创建下载链接
    try {
      const link = document.createElement('a')
      link.href = fullUrl
      link.download = `image_${Date.now()}.jpg`
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      uni.hideLoading()
      uni.showToast({ title: '下载已开始', icon: 'success' })
    } catch (error) {
      uni.hideLoading()
      uni.showToast({ title: '下载失败', icon: 'none' })
      console.error('下载图片失败:', error)
    }
  }
  // #endif
  
  // #ifdef MP-WEIXIN
  // 微信小程序：下载并保存到相册
  uni.downloadFile({
    url: fullUrl,
    success: (res) => {
      if (res.statusCode === 200) {
        uni.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => {
            uni.hideLoading()
            uni.showToast({ title: '保存成功', icon: 'success' })
          },
          fail: (err) => {
            uni.hideLoading()
            if (err.errMsg && err.errMsg.includes('auth deny')) {
              uni.showModal({
                title: '需要授权',
                content: '请允许访问相册权限',
                showCancel: false
              })
            } else {
              uni.showToast({ title: '保存失败', icon: 'none' })
            }
          }
        })
      } else {
        uni.hideLoading()
        uni.showToast({ title: '下载失败', icon: 'none' })
      }
    },
    fail: () => {
      uni.hideLoading()
      uni.showToast({ title: '下载失败', icon: 'none' })
    }
  })
  // #endif
}
</script>

<style lang="scss" scoped>
.image-preview-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 99999;
}

.image-preview-close {
  position: absolute;
  top: calc(env(safe-area-inset-top) + 24rpx);
  right: 24rpx;
  width: 80rpx;
  height: 80rpx;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  
  &:active {
    background: rgba(0, 0, 0, 0.7);
  }
}

.close-icon {
  font-size: 60rpx;
  color: #fff;
  font-weight: 300;
  line-height: 1;
}

.image-preview-content {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120rpx 24rpx 200rpx;
}

.image-preview-swiper {
  width: 100%;
  height: 100%;
}

.image-preview-image {
  width: 100%;
  height: 100%;
}

.image-preview-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 32rpx 24rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.image-preview-info {
  flex: 1;
}

.image-preview-count {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.image-preview-actions {
  display: flex;
  gap: 16rpx;
  align-items: center;
}

.close-btn {
  padding: 20rpx 32rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50rpx;
  
  &:active {
    background: rgba(255, 255, 255, 0.3);
  }
}

.close-btn-text {
  font-size: 28rpx;
  color: #fff;
  font-weight: 500;
}

.download-btn {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 32rpx;
  background: $primary-color;
  border-radius: 50rpx;
  
  &:active {
    background: darken($primary-color, 10%);
  }
}

.download-icon {
  width: 32rpx;
  height: 32rpx;
  filter: brightness(0) invert(1);
}

.download-text {
  font-size: 28rpx;
  color: #fff;
  font-weight: 500;
}
</style>
