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
      
      <!-- 空状态：只在没有素材且没有网盘链接时显示 -->
      <view v-if="currentProduct.materials.length === 0 && !currentProduct.netdiskUrl" class="empty-state">
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
import ImagePreview from '@/components/ImagePreview/index.vue'
import { isWeChatBrowser, isMobile } from '@/utils/browser'

const store = useAppStore()

const products = computed(() => store.products)
const currentProductId = ref(products.value[0]?.id || '')

const currentProduct = computed(() => 
  products.value.find(p => p.id === currentProductId.value)
)

// 图片预览状态
const showImagePreview = ref(false)
const previewImageUrls = ref<string[]>([])
const previewImageIndex = ref(0)

// 预览图片
const previewImage = (current: string, urls: string[]) => {
  previewImageUrls.value = urls
  previewImageIndex.value = urls.indexOf(current)
  if (previewImageIndex.value < 0) previewImageIndex.value = 0
  showImagePreview.value = true
}

// 保存单张图片
const saveImage = async (url: string) => {
  uni.showLoading({ title: '保存中...' })
  
  // #ifdef H5
  // 检测是否在移动端（包括微信浏览器和其他移动浏览器）
  if (isMobile() || isWeChatBrowser()) {
    // 移动端浏览器：先尝试使用 uni API 保存图片到相册，失败则降级为下载
    try {
      // 先下载图片
      const downloadRes = await new Promise<UniApp.DownloadSuccessData>((resolve, reject) => {
        uni.downloadFile({
          url,
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
              // 如果保存失败，降级为下载方式
              reject(err)
            }
          })
        })
      } catch (saveError: any) {
        // 保存到相册失败，降级为下载方式
        console.log('保存到相册失败，降级为下载方式:', saveError)
        // 使用下载方式
        const response = await fetch(url)
        const blob = await response.blob()
        const blobUrl = window.URL.createObjectURL(blob)
        
        const urlParts = url.split('/')
        const fileName = urlParts[urlParts.length - 1] || 'material.jpg'
        
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = fileName
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        window.URL.revokeObjectURL(blobUrl)
        
        uni.hideLoading()
        uni.showToast({ title: '下载成功', icon: 'success' })
      }
    } catch (error) {
      // uni.downloadFile 失败，使用传统下载方式
      console.log('uni API 不可用，使用传统下载方式:', error)
      try {
        const response = await fetch(url)
        const blob = await response.blob()
        const blobUrl = window.URL.createObjectURL(blob)
        
        const urlParts = url.split('/')
        const fileName = urlParts[urlParts.length - 1] || 'material.jpg'
        
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = fileName
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        window.URL.revokeObjectURL(blobUrl)
        
        uni.hideLoading()
        uni.showToast({ title: '下载成功', icon: 'success' })
      } catch (downloadError) {
        uni.hideLoading()
        uni.showToast({ title: '下载失败', icon: 'none' })
        console.error('下载图片失败:', downloadError)
      }
    }
  } else {
    // 桌面浏览器：直接使用下载方式
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      
      // 从 URL 中提取文件名
      const urlParts = url.split('/')
      const fileName = urlParts[urlParts.length - 1] || 'material.jpg'
      
      // 创建下载链接
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = fileName
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // 释放 blob URL
      window.URL.revokeObjectURL(blobUrl)
      
      uni.hideLoading()
      uni.showToast({ title: '下载成功', icon: 'success' })
    } catch (error) {
      uni.hideLoading()
      uni.showToast({ title: '下载失败', icon: 'none' })
      console.error('下载图片失败:', error)
    }
  }
  // #endif
  
  // #ifdef MP-WEIXIN
  // 小程序环境：下载并保存到相册
  uni.downloadFile({
    url,
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
            // 处理权限拒绝的情况
            if (err.errMsg && err.errMsg.includes('auth deny')) {
              uni.showModal({
                title: '需要授权',
                content: '保存图片需要授权访问相册，请在设置中开启',
                showCancel: false,
                confirmText: '知道了'
              })
            } else {
              uni.showToast({ title: '保存失败，请重试', icon: 'none' })
            }
          }
        })
      } else {
        uni.hideLoading()
        uni.showToast({ title: '下载失败', icon: 'none' })
      }
    },
    fail: (err) => {
      uni.hideLoading()
      console.error('下载图片失败:', err)
      uni.showToast({ title: '下载失败，请检查网络', icon: 'none' })
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
  // 检测是否在移动端（包括微信浏览器和其他移动浏览器）
  if (isMobile() || isWeChatBrowser()) {
    // 移动端浏览器：先尝试使用 uni API 批量保存，失败则降级为下载
    uni.showLoading({ title: `保存中 0/${materials.length}` })
    
    let successCount = 0
    let useDownloadFallback = false // 标记是否使用下载降级方案
    
    for (let i = 0; i < materials.length; i++) {
      try {
        // 尝试使用 uni API 下载图片
        let downloadRes: UniApp.DownloadSuccessData
        try {
          downloadRes = await new Promise<UniApp.DownloadSuccessData>((resolve, reject) => {
            uni.downloadFile({
              url: materials[i],
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
        } catch (downloadError) {
          // uni.downloadFile 失败，使用下载方式
          useDownloadFallback = true
          throw downloadError
        }
        
        // 尝试保存到相册
        try {
          await new Promise<void>((resolve, reject) => {
            uni.saveImageToPhotosAlbum({
              filePath: downloadRes.tempFilePath,
              success: () => {
                successCount++
                uni.showLoading({ title: `保存中 ${successCount}/${materials.length}` })
                resolve()
              },
              fail: (err) => {
                // 保存失败，使用下载方式
                reject(err)
              }
            })
          })
        } catch (saveError) {
          // 保存到相册失败，降级为下载方式
          useDownloadFallback = true
          throw saveError
        }
        
        // 延迟一下，避免操作过快
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (error: any) {
        // 如果 uni API 失败，使用传统下载方式
        if (useDownloadFallback || i === 0) {
          // 第一次失败时，切换到下载模式
          if (i === 0) {
            useDownloadFallback = true
            uni.showLoading({ title: `下载中 0/${materials.length}` })
          }
          
          try {
            const response = await fetch(materials[i])
            const blob = await response.blob()
            const blobUrl = window.URL.createObjectURL(blob)
            
            const urlParts = materials[i].split('/')
            const fileName = urlParts[urlParts.length - 1] || `material-${i + 1}.jpg`
            
            const link = document.createElement('a')
            link.href = blobUrl
            link.download = fileName
            link.style.display = 'none'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            
            window.URL.revokeObjectURL(blobUrl)
            
            successCount++
            uni.showLoading({ title: `下载中 ${successCount}/${materials.length}` })
            
            // 延迟一下，避免浏览器阻止多个下载
            await new Promise(resolve => setTimeout(resolve, 300))
          } catch (downloadError) {
            console.error(`下载第 ${i + 1} 张图片失败:`, downloadError)
          }
        } else {
          console.error(`保存第 ${i + 1} 张图片失败:`, error)
        }
      }
    }
    
    uni.hideLoading()
    uni.showToast({
      title: useDownloadFallback 
        ? `成功下载 ${successCount} 张` 
        : `成功保存 ${successCount} 张`,
      icon: successCount === materials.length ? 'success' : 'none',
      duration: successCount === materials.length ? 1500 : 2000
    })
  } else {
    // 普通浏览器：批量下载图片
    uni.showLoading({ title: `下载中 0/${materials.length}` })
    
    let successCount = 0
    for (let i = 0; i < materials.length; i++) {
      try {
        const response = await fetch(materials[i])
        const blob = await response.blob()
        const blobUrl = window.URL.createObjectURL(blob)
        
        // 从 URL 中提取文件名
        const urlParts = materials[i].split('/')
        const fileName = urlParts[urlParts.length - 1] || `material-${i + 1}.jpg`
        
        // 创建下载链接
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = fileName
        link.style.display = 'none'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // 释放 blob URL
        window.URL.revokeObjectURL(blobUrl)
        
        successCount++
        uni.showLoading({ title: `下载中 ${successCount}/${materials.length}` })
        
        // 延迟一下，避免浏览器阻止多个下载
        await new Promise(resolve => setTimeout(resolve, 300))
      } catch (error) {
        console.error(`下载第 ${i + 1} 张图片失败:`, error)
        // 忽略单个失败，继续下载其他图片
      }
    }
    
    uni.hideLoading()
    uni.showToast({
      title: `成功下载 ${successCount} 张`,
      icon: successCount === materials.length ? 'success' : 'none'
    })
  }
  // #endif
  
  // #ifdef MP-WEIXIN
  // 小程序环境：批量下载并保存到相册
  uni.showLoading({ title: `保存中 0/${materials.length}` })
  
  let successCount = 0
  let hasAuthError = false
  
  for (let i = 0; i < materials.length; i++) {
    try {
      // 下载图片
      const res = await new Promise<UniApp.DownloadSuccessData>((resolve, reject) => {
        uni.downloadFile({
          url: materials[i],
          success: (downloadRes) => {
            if (downloadRes.statusCode === 200) {
              resolve(downloadRes)
            } else {
              reject(new Error('下载失败'))
            }
          },
          fail: reject
        })
      })
      
      // 保存到相册
      await new Promise<void>((resolve, reject) => {
        uni.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => resolve(),
          fail: (err) => {
            // 检查是否是权限问题
            if (err.errMsg && err.errMsg.includes('auth deny')) {
              hasAuthError = true
            }
            reject(err)
          }
        })
      })
      
      successCount++
      uni.showLoading({ title: `保存中 ${successCount}/${materials.length}` })
      
      // 延迟一下，避免操作过快
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (error: any) {
      // 如果是权限问题，提示用户并中断
      if (hasAuthError && i === 0) {
        uni.hideLoading()
        uni.showModal({
          title: '需要授权',
          content: '保存图片需要授权访问相册，请在设置中开启相册权限',
          showCancel: false,
          confirmText: '知道了'
        })
        return
      }
      // 其他错误忽略，继续下载下一张
      console.error(`保存第 ${i + 1} 张图片失败:`, error)
    }
  }
  
  uni.hideLoading()
  uni.showToast({
    title: `成功保存 ${successCount} 张`,
    icon: successCount === materials.length ? 'success' : 'none',
    duration: successCount === materials.length ? 1500 : 2000
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
  padding: 0 24rpx;
  word-wrap: break-word;
  word-break: break-all;
  white-space: normal;
  line-height: 1.6;
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
    white-space: normal;
    word-wrap: break-word;
    word-break: break-all;
    text-align: center;
    line-height: 1.4;
    width: 100%;
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
  gap: 16rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-primary;
  flex: 1;
  word-wrap: break-word;
  word-break: break-all;
  white-space: normal;
}

.section-count {
  font-size: 26rpx;
  color: $text-secondary;
  white-space: nowrap;
  flex-shrink: 0;
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
  width: 128rpx;
  height: 128rpx;
  margin-bottom: 16rpx;
  opacity: 0.4;
}

.empty-text {
  font-size: 28rpx;
  color: $text-placeholder;
}
</style>

