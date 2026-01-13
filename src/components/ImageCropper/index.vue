<template>
  <view v-if="show" class="image-cropper">
    <view class="image-cropper__container">
      <!-- 头部 -->
      <view class="image-cropper__header">
        <text class="image-cropper__cancel" @tap="handleCancel">取消</text>
        <text class="image-cropper__title">裁剪图片</text>
        <text class="image-cropper__confirm" @tap="handleConfirm">完成</text>
      </view>
      
      <!-- 图片区域 -->
      <view class="image-cropper__content" ref="contentRef">
        <!-- 图片层 -->
        <image 
          :src="imagePath" 
          class="image-cropper__image"
          mode="aspectFit"
          @load="onImageLoad"
          :style="imageStyle"
        />
        
        <!-- 遮罩层 -->
        <view class="image-cropper__overlay">
          <!-- 上遮罩 -->
          <view class="overlay-top" :style="{ height: cropY + 'px' }"></view>
          <!-- 中间行 -->
          <view class="overlay-middle" :style="{ height: cropHeight + 'px' }">
            <!-- 左遮罩 -->
            <view class="overlay-left" :style="{ width: cropX + 'px' }"></view>
            <!-- 裁剪框 -->
            <view 
              class="crop-box" 
              :style="{ width: cropWidth + 'px', height: cropHeight + 'px' }"
              @touchstart="handleTouchStart"
              @touchmove="handleTouchMove"
              @touchend="handleTouchEnd"
            >
              <!-- 四个角 -->
              <view class="corner corner-tl" data-type="top-left"></view>
              <view class="corner corner-tr" data-type="top-right"></view>
              <view class="corner corner-bl" data-type="bottom-left"></view>
              <view class="corner corner-br" data-type="bottom-right"></view>
              <!-- 四条边 -->
              <view class="edge edge-t" data-type="top"></view>
              <view class="edge edge-b" data-type="bottom"></view>
              <view class="edge edge-l" data-type="left"></view>
              <view class="edge edge-r" data-type="right"></view>
              <!-- 中间移动区域 -->
              <view class="crop-center" data-type="move"></view>
              <!-- 网格线 -->
              <view class="grid-line grid-h1"></view>
              <view class="grid-line grid-h2"></view>
              <view class="grid-line grid-v1"></view>
              <view class="grid-line grid-v2"></view>
            </view>
            <!-- 右遮罩 -->
            <view class="overlay-right" :style="{ flex: 1 }"></view>
          </view>
          <!-- 下遮罩 -->
          <view class="overlay-bottom" :style="{ flex: 1 }"></view>
        </view>
      </view>
      
      <!-- 底部 -->
      <view class="image-cropper__footer">
        <!-- 比例选择 -->
        <view class="ratio-selector">
          <view 
            v-for="ratio in ratioOptions" 
            :key="ratio.label"
            class="ratio-item"
            :class="{ active: currentRatio === ratio.label }"
            @tap="selectRatio(ratio)"
          >
            <text>{{ ratio.label }}</text>
          </view>
        </view>
        
        <view class="image-cropper__actions">
          <view class="image-cropper__btn image-cropper__btn--cancel" @tap="handleCancel">
            <text>取消</text>
          </view>
          <view class="image-cropper__btn image-cropper__btn--confirm" @tap="handleConfirm">
            <text>完成</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = withDefaults(defineProps<{
  show: boolean
  imagePath: string
  aspectRatio?: number
  outputWidth?: number
  outputHeight?: number
}>(), {
  aspectRatio: 0,
  outputWidth: 800,
  outputHeight: 800
})

const emit = defineEmits<{
  (e: 'confirm', croppedImagePath: string): void
  (e: 'cancel'): void
}>()

// 系统信息
const systemInfo = uni.getSystemInfoSync()
const screenWidth = systemInfo.windowWidth

// rpx 转 px 的比例
const rpxRatio = screenWidth / 750

// 内容区域尺寸（会在图片加载时动态获取实际高度）
const contentWidth = screenWidth
const contentPaddingX = 10 * rpxRatio // 左右内边距
const actualContentHeight = ref(0)

// 图片信息
const imageNaturalWidth = ref(0)
const imageNaturalHeight = ref(0)
const imageDisplayWidth = ref(0)
const imageDisplayHeight = ref(0)
const imageX = ref(0)
const imageY = ref(0)

// 裁剪框
const cropX = ref(0)
const cropY = ref(0)
const cropWidth = ref(0)
const cropHeight = ref(0)

// 当前选中的比例
const currentRatio = ref('自由')

// 比例选项
const ratioOptions = [
  { label: '自由', value: 0 },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4/3 },
  { label: '3:4', value: 3/4 },
  { label: '16:9', value: 16/9 },
  { label: '9:16', value: 9/16 }
]

// 最小裁剪尺寸
const minCropSize = 50

// 图片样式
const imageStyle = computed(() => ({
  width: imageDisplayWidth.value + 'px',
  height: imageDisplayHeight.value + 'px',
  left: imageX.value + 'px',
  top: imageY.value + 'px'
}))

// 图片加载完成
const onImageLoad = (e: any) => {
  // 获取图片原始尺寸
  const { width, height } = e.detail
  imageNaturalWidth.value = width
  imageNaturalHeight.value = height
  
  // 动态获取 content 区域的实际高度
  const query = uni.createSelectorQuery()
  query.select('.image-cropper__content').boundingClientRect((rect: any) => {
    if (!rect) {
      console.error('无法获取 content 区域尺寸')
      return
    }
    
    const contentHeight = rect.height
    actualContentHeight.value = contentHeight
    
    // 上下间距（可分别调整）
    const topGap = 70 * rpxRatio    // 顶部间距
    const bottomGap = 20 * rpxRatio // 底部间距
    
    // 计算可用区域（减去上下间距）
    const availableWidth = contentWidth - contentPaddingX * 2
    const availableHeight = contentHeight - topGap - bottomGap
    
    // 计算显示尺寸（保持宽高比，填满可用区域）
    const scaleX = availableWidth / width
    const scaleY = availableHeight / height
    const scale = Math.min(scaleX, scaleY)
    
    const displayW = width * scale
    const displayH = height * scale
    
    // 水平居中，垂直居中（带间距）
    const x = (contentWidth - displayW) / 2
    const y = topGap + (availableHeight - displayH) / 2
    
    imageDisplayWidth.value = displayW
    imageDisplayHeight.value = displayH
    imageX.value = x
    imageY.value = y
    
    // 裁剪框初始覆盖整个图片
    cropX.value = x
    cropY.value = y
    cropWidth.value = displayW
    cropHeight.value = displayH
    
    // 重置比例
    currentRatio.value = '自由'
  }).exec()
}

// 选择比例
const selectRatio = (ratio: { label: string, value: number }) => {
  currentRatio.value = ratio.label
  
  if (ratio.value === 0) {
    // 自由比例，恢复到图片大小
    cropX.value = imageX.value
    cropY.value = imageY.value
    cropWidth.value = imageDisplayWidth.value
    cropHeight.value = imageDisplayHeight.value
    return
  }
  
  // 以当前裁剪框顶部为基准，调整尺寸
  const targetRatio = ratio.value
  
  // 图片边界
  const imgLeft = imageX.value
  const imgTop = imageY.value
  const imgRight = imgLeft + imageDisplayWidth.value
  const imgBottom = imgTop + imageDisplayHeight.value
  
  // 保持顶部位置不变
  const fixedTop = cropY.value
  
  // 计算可用的最大宽度和高度
  const maxWidth = imageDisplayWidth.value
  const maxHeight = imgBottom - fixedTop
  
  let newWidth: number
  let newHeight: number
  
  if (targetRatio >= 1) {
    // 横向或正方形比例，以宽度为基准
    newWidth = Math.min(maxWidth, maxHeight * targetRatio)
    newHeight = newWidth / targetRatio
  } else {
    // 纵向比例，以高度为基准
    newHeight = Math.min(maxHeight, maxWidth / targetRatio)
    newWidth = newHeight * targetRatio
  }
  
  // 确保不超过图片范围
  if (newWidth > maxWidth) {
    newWidth = maxWidth
    newHeight = newWidth / targetRatio
  }
  if (newHeight > maxHeight) {
    newHeight = maxHeight
    newWidth = newHeight * targetRatio
  }
  
  // 确保最小尺寸
  if (newWidth < minCropSize) {
    newWidth = minCropSize
    newHeight = newWidth / targetRatio
  }
  if (newHeight < minCropSize) {
    newHeight = minCropSize
    newWidth = newHeight * targetRatio
  }
  
  // 水平居中
  const newX = imgLeft + (maxWidth - newWidth) / 2
  
  cropX.value = newX
  cropY.value = fixedTop
  cropWidth.value = newWidth
  cropHeight.value = newHeight
}

// 触摸信息
const touchInfo = ref<{
  startX: number
  startY: number
  startCropX: number
  startCropY: number
  startCropWidth: number
  startCropHeight: number
  dragType: string
} | null>(null)

// 触摸开始
const handleTouchStart = (e: any) => {
  const touch = e.touches[0]
  const target = e.target
  const dragType = target.dataset?.type || 'move'
  
  touchInfo.value = {
    startX: touch.clientX,
    startY: touch.clientY,
    startCropX: cropX.value,
    startCropY: cropY.value,
    startCropWidth: cropWidth.value,
    startCropHeight: cropHeight.value,
    dragType
  }
}

// 获取当前比例值
const getCurrentRatioValue = () => {
  const found = ratioOptions.find(r => r.label === currentRatio.value)
  return found ? found.value : 0
}

// 触摸移动
const handleTouchMove = (e: any) => {
  if (!touchInfo.value) return
  e.preventDefault && e.preventDefault()
  
  const touch = e.touches[0]
  const deltaX = touch.clientX - touchInfo.value.startX
  const deltaY = touch.clientY - touchInfo.value.startY
  
  // 图片边界
  const imgLeft = imageX.value
  const imgTop = imageY.value
  const imgRight = imgLeft + imageDisplayWidth.value
  const imgBottom = imgTop + imageDisplayHeight.value
  
  let newX = touchInfo.value.startCropX
  let newY = touchInfo.value.startCropY
  let newW = touchInfo.value.startCropWidth
  let newH = touchInfo.value.startCropHeight
  
  const ratioValue = getCurrentRatioValue()
  
  switch (touchInfo.value.dragType) {
    case 'move':
      newX = touchInfo.value.startCropX + deltaX
      newY = touchInfo.value.startCropY + deltaY
      // 限制在图片范围内
      newX = Math.max(imgLeft, Math.min(newX, imgRight - newW))
      newY = Math.max(imgTop, Math.min(newY, imgBottom - newH))
      break
      
    case 'top':
      newY = touchInfo.value.startCropY + deltaY
      newH = touchInfo.value.startCropHeight - deltaY
      if (newY < imgTop) { newH += newY - imgTop; newY = imgTop }
      if (newH < minCropSize) { newH = minCropSize; newY = touchInfo.value.startCropY + touchInfo.value.startCropHeight - minCropSize }
      // 如果有固定比例，调整宽度
      if (ratioValue > 0) {
        newW = newH * ratioValue
        if (newW > imageDisplayWidth.value) {
          newW = imageDisplayWidth.value
          newH = newW / ratioValue
        }
        newX = imgLeft + (imageDisplayWidth.value - newW) / 2
      }
      break
      
    case 'bottom':
      newH = touchInfo.value.startCropHeight + deltaY
      if (newY + newH > imgBottom) newH = imgBottom - newY
      if (newH < minCropSize) newH = minCropSize
      // 如果有固定比例，调整宽度
      if (ratioValue > 0) {
        newW = newH * ratioValue
        if (newW > imageDisplayWidth.value) {
          newW = imageDisplayWidth.value
          newH = newW / ratioValue
        }
        newX = imgLeft + (imageDisplayWidth.value - newW) / 2
      }
      break
      
    case 'left':
      newX = touchInfo.value.startCropX + deltaX
      newW = touchInfo.value.startCropWidth - deltaX
      if (newX < imgLeft) { newW += newX - imgLeft; newX = imgLeft }
      if (newW < minCropSize) { newW = minCropSize; newX = touchInfo.value.startCropX + touchInfo.value.startCropWidth - minCropSize }
      // 如果有固定比例，调整高度
      if (ratioValue > 0) {
        newH = newW / ratioValue
        if (newY + newH > imgBottom) {
          newH = imgBottom - newY
          newW = newH * ratioValue
        }
      }
      break
      
    case 'right':
      newW = touchInfo.value.startCropWidth + deltaX
      if (newX + newW > imgRight) newW = imgRight - newX
      if (newW < minCropSize) newW = minCropSize
      // 如果有固定比例，调整高度
      if (ratioValue > 0) {
        newH = newW / ratioValue
        if (newY + newH > imgBottom) {
          newH = imgBottom - newY
          newW = newH * ratioValue
        }
      }
      break
      
    case 'top-left':
      newX = touchInfo.value.startCropX + deltaX
      newY = touchInfo.value.startCropY + deltaY
      newW = touchInfo.value.startCropWidth - deltaX
      newH = touchInfo.value.startCropHeight - deltaY
      if (newX < imgLeft) { newW += newX - imgLeft; newX = imgLeft }
      if (newY < imgTop) { newH += newY - imgTop; newY = imgTop }
      if (newW < minCropSize) { newW = minCropSize; newX = touchInfo.value.startCropX + touchInfo.value.startCropWidth - minCropSize }
      if (newH < minCropSize) { newH = minCropSize; newY = touchInfo.value.startCropY + touchInfo.value.startCropHeight - minCropSize }
      // 如果有固定比例
      if (ratioValue > 0) {
        const avgDelta = (Math.abs(deltaX) + Math.abs(deltaY)) / 2
        if (deltaX > 0 || deltaY > 0) {
          // 缩小
          newW = touchInfo.value.startCropWidth - avgDelta
          newH = newW / ratioValue
        } else {
          // 放大
          newW = touchInfo.value.startCropWidth + avgDelta
          newH = newW / ratioValue
        }
        if (newW < minCropSize) newW = minCropSize
        if (newH < minCropSize) newH = minCropSize
        newH = newW / ratioValue
        newX = touchInfo.value.startCropX + touchInfo.value.startCropWidth - newW
        newY = touchInfo.value.startCropY + touchInfo.value.startCropHeight - newH
        if (newX < imgLeft) { newX = imgLeft; newW = touchInfo.value.startCropX + touchInfo.value.startCropWidth - imgLeft; newH = newW / ratioValue }
        if (newY < imgTop) { newY = imgTop; newH = touchInfo.value.startCropY + touchInfo.value.startCropHeight - imgTop; newW = newH * ratioValue }
      }
      break
      
    case 'top-right':
      newY = touchInfo.value.startCropY + deltaY
      newW = touchInfo.value.startCropWidth + deltaX
      newH = touchInfo.value.startCropHeight - deltaY
      if (newX + newW > imgRight) newW = imgRight - newX
      if (newY < imgTop) { newH += newY - imgTop; newY = imgTop }
      if (newW < minCropSize) newW = minCropSize
      if (newH < minCropSize) { newH = minCropSize; newY = touchInfo.value.startCropY + touchInfo.value.startCropHeight - minCropSize }
      // 如果有固定比例
      if (ratioValue > 0) {
        const avgDelta = (deltaX - deltaY) / 2
        newW = touchInfo.value.startCropWidth + avgDelta
        newH = newW / ratioValue
        if (newW < minCropSize) newW = minCropSize
        if (newH < minCropSize) newH = minCropSize
        newH = newW / ratioValue
        newY = touchInfo.value.startCropY + touchInfo.value.startCropHeight - newH
        if (newX + newW > imgRight) { newW = imgRight - newX; newH = newW / ratioValue }
        if (newY < imgTop) { newY = imgTop; newH = touchInfo.value.startCropY + touchInfo.value.startCropHeight - imgTop; newW = newH * ratioValue }
      }
      break
      
    case 'bottom-left':
      newX = touchInfo.value.startCropX + deltaX
      newW = touchInfo.value.startCropWidth - deltaX
      newH = touchInfo.value.startCropHeight + deltaY
      if (newX < imgLeft) { newW += newX - imgLeft; newX = imgLeft }
      if (newY + newH > imgBottom) newH = imgBottom - newY
      if (newW < minCropSize) { newW = minCropSize; newX = touchInfo.value.startCropX + touchInfo.value.startCropWidth - minCropSize }
      if (newH < minCropSize) newH = minCropSize
      // 如果有固定比例
      if (ratioValue > 0) {
        const avgDelta = (-deltaX + deltaY) / 2
        newW = touchInfo.value.startCropWidth + avgDelta
        newH = newW / ratioValue
        if (newW < minCropSize) newW = minCropSize
        if (newH < minCropSize) newH = minCropSize
        newH = newW / ratioValue
        newX = touchInfo.value.startCropX + touchInfo.value.startCropWidth - newW
        if (newX < imgLeft) { newX = imgLeft; newW = touchInfo.value.startCropX + touchInfo.value.startCropWidth - imgLeft; newH = newW / ratioValue }
        if (newY + newH > imgBottom) { newH = imgBottom - newY; newW = newH * ratioValue }
      }
      break
      
    case 'bottom-right':
      newW = touchInfo.value.startCropWidth + deltaX
      newH = touchInfo.value.startCropHeight + deltaY
      if (newX + newW > imgRight) newW = imgRight - newX
      if (newY + newH > imgBottom) newH = imgBottom - newY
      if (newW < minCropSize) newW = minCropSize
      if (newH < minCropSize) newH = minCropSize
      // 如果有固定比例
      if (ratioValue > 0) {
        const avgDelta = (deltaX + deltaY) / 2
        newW = touchInfo.value.startCropWidth + avgDelta
        newH = newW / ratioValue
        if (newW < minCropSize) newW = minCropSize
        if (newH < minCropSize) newH = minCropSize
        newH = newW / ratioValue
        if (newX + newW > imgRight) { newW = imgRight - newX; newH = newW / ratioValue }
        if (newY + newH > imgBottom) { newH = imgBottom - newY; newW = newH * ratioValue }
      }
      break
  }
  
  cropX.value = newX
  cropY.value = newY
  cropWidth.value = newW
  cropHeight.value = newH
}

// 触摸结束
const handleTouchEnd = () => {
  touchInfo.value = null
}

// 确认裁剪
const handleConfirm = () => {
  if (!imageNaturalWidth.value || !imageNaturalHeight.value) {
    uni.showToast({ title: '图片未加载完成', icon: 'none' })
    return
  }
  
  uni.showLoading({ title: '处理中...' })
  
  // 计算裁剪区域在原图中的位置
  const scaleRatio = imageNaturalWidth.value / imageDisplayWidth.value
  
  const cropXInImage = Math.round((cropX.value - imageX.value) * scaleRatio)
  const cropYInImage = Math.round((cropY.value - imageY.value) * scaleRatio)
  const cropWInImage = Math.round(cropWidth.value * scaleRatio)
  const cropHInImage = Math.round(cropHeight.value * scaleRatio)
  
  // 确保在图片范围内
  const finalX = Math.max(0, cropXInImage)
  const finalY = Math.max(0, cropYInImage)
  const finalW = Math.min(imageNaturalWidth.value - finalX, cropWInImage)
  const finalH = Math.min(imageNaturalHeight.value - finalY, cropHInImage)
  
  // 计算输出尺寸（保持宽高比）
  const aspectRatio = finalW / finalH
  let outputW = props.outputWidth
  let outputH = props.outputHeight
  if (aspectRatio > 1) {
    outputH = Math.round(outputW / aspectRatio)
  } else {
    outputW = Math.round(outputH * aspectRatio)
  }
  
  // #ifdef H5
  // 使用 Canvas 进行裁剪
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    try {
      const canvas = document.createElement('canvas')
      canvas.width = outputW
      canvas.height = outputH
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        throw new Error('无法创建 Canvas')
      }
      
      ctx.drawImage(img, finalX, finalY, finalW, finalH, 0, 0, outputW, outputH)
      
      const base64 = canvas.toDataURL('image/jpeg', 0.9)
      uni.hideLoading()
      emit('confirm', base64)
    } catch (error: any) {
      uni.hideLoading()
      console.error('裁剪失败', error)
      emit('confirm', props.imagePath)
    }
  }
  img.onerror = () => {
    uni.hideLoading()
    emit('confirm', props.imagePath)
  }
  img.src = props.imagePath
  // #endif
  
  // #ifndef H5
  // 小程序环境
  const ctx = uni.createCanvasContext('cropCanvas', this)
  ctx.drawImage(props.imagePath, finalX, finalY, finalW, finalH, 0, 0, outputW, outputH)
  ctx.draw(false, () => {
    uni.canvasToTempFilePath({
      canvasId: 'cropCanvas',
      width: outputW,
      height: outputH,
      destWidth: outputW,
      destHeight: outputH,
      success: (res) => {
        uni.hideLoading()
        emit('confirm', res.tempFilePath)
      },
      fail: () => {
        uni.hideLoading()
        emit('confirm', props.imagePath)
      }
    }, this)
  })
  // #endif
}

// 取消裁剪
const handleCancel = () => {
  emit('cancel')
}

// 监听显示状态，重置
watch(() => props.show, (newVal) => {
  if (!newVal) {
    // 重置状态
    cropX.value = 0
    cropY.value = 0
    cropWidth.value = 0
    cropHeight.value = 0
    currentRatio.value = '自由'
  }
})
</script>

<style lang="scss" scoped>
.image-cropper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  background: #000;
  
  &__container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24rpx;
    background: rgba(0, 0, 0, 0.9);
    height: 88rpx; // 与 JS 中的 headerHeightRpx 对应
    flex-shrink: 0;
  }
  
  &__cancel,
  &__confirm {
    font-size: 30rpx;
    color: #1890FF;
    padding: 10rpx 20rpx;
  }
  
  &__title {
    font-size: 32rpx;
    font-weight: 500;
    color: #fff;
  }
  
  &__content {
    flex: 1;
    position: relative;
    overflow: hidden;
    background: #000;
  }
  
  &__image {
    position: absolute;
  }
  
  &__overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
    pointer-events: none;
  }
  
  &__footer {
    background: rgba(0, 0, 0, 0.9);
    flex-shrink: 0;
    height: 150rpx; // 固定高度，与 JS 中的 footerHeightRpx 对应
    padding-bottom: constant(safe-area-inset-bottom);
    padding-bottom: env(safe-area-inset-bottom);
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  
  &__actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8rpx 24rpx;
    gap: 16rpx;
  }
  
  &__btn {
    flex: 1;
    height: 64rpx;
    border-radius: 10rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    
    &--cancel {
      background: rgba(255, 255, 255, 0.15);
      color: #fff;
    }
    
    &--confirm {
      background: #1890FF;
      color: #fff;
    }
    
    text {
      font-size: 28rpx;
      font-weight: 500;
    }
  }
}

// 比例选择器
.ratio-selector {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 8rpx 16rpx;
  
  .ratio-item {
    padding: 8rpx 18rpx;
    border-radius: 6rpx;
    background: rgba(255, 255, 255, 0.1);
    transition: all 0.2s;
    
    text {
      font-size: 24rpx;
      color: rgba(255, 255, 255, 0.7);
    }
    
    &.active {
      background: #1890FF;
      
      text {
        color: #fff;
      }
    }
  }
}

// 遮罩层
.overlay-top,
.overlay-bottom,
.overlay-left,
.overlay-right {
  background: rgba(0, 0, 0, 0.6);
}

.overlay-middle {
  display: flex;
  flex-direction: row;
}

// 裁剪框
.crop-box {
  position: relative;
  border: 2px solid #1890FF;
  box-sizing: border-box;
  pointer-events: auto;
}

// 网格线
.grid-line {
  position: absolute;
  background: rgba(255, 255, 255, 0.3);
  pointer-events: none;
  
  &.grid-h1 {
    left: 0;
    right: 0;
    top: 33.33%;
    height: 1px;
  }
  
  &.grid-h2 {
    left: 0;
    right: 0;
    top: 66.66%;
    height: 1px;
  }
  
  &.grid-v1 {
    top: 0;
    bottom: 0;
    left: 33.33%;
    width: 1px;
  }
  
  &.grid-v2 {
    top: 0;
    bottom: 0;
    left: 66.66%;
    width: 1px;
  }
}

// 角落控制点
.corner {
  position: absolute;
  width: 36px;
  height: 36px;
  z-index: 10;
  
  &::before,
  &::after {
    content: '';
    position: absolute;
    background: #1890FF;
  }
  
  &-tl {
    top: -2px;
    left: -2px;
    &::before { top: 0; left: 0; width: 22px; height: 4px; }
    &::after { top: 0; left: 0; width: 4px; height: 22px; }
  }
  
  &-tr {
    top: -2px;
    right: -2px;
    &::before { top: 0; right: 0; width: 22px; height: 4px; }
    &::after { top: 0; right: 0; width: 4px; height: 22px; }
  }
  
  &-bl {
    bottom: -2px;
    left: -2px;
    &::before { bottom: 0; left: 0; width: 22px; height: 4px; }
    &::after { bottom: 0; left: 0; width: 4px; height: 22px; }
  }
  
  &-br {
    bottom: -2px;
    right: -2px;
    &::before { bottom: 0; right: 0; width: 22px; height: 4px; }
    &::after { bottom: 0; right: 0; width: 4px; height: 22px; }
  }
}

// 边缘控制点
.edge {
  position: absolute;
  z-index: 5;
  
  &::before {
    content: '';
    position: absolute;
    background: #1890FF;
    border-radius: 2px;
  }
  
  &-t {
    top: -18px;
    left: 36px;
    right: 36px;
    height: 36px;
    &::before { top: 14px; left: 50%; transform: translateX(-50%); width: 50px; height: 4px; }
  }
  
  &-b {
    bottom: -18px;
    left: 36px;
    right: 36px;
    height: 36px;
    &::before { bottom: 14px; left: 50%; transform: translateX(-50%); width: 50px; height: 4px; }
  }
  
  &-l {
    left: -18px;
    top: 36px;
    bottom: 36px;
    width: 36px;
    &::before { left: 14px; top: 50%; transform: translateY(-50%); width: 4px; height: 50px; }
  }
  
  &-r {
    right: -18px;
    top: 36px;
    bottom: 36px;
    width: 36px;
    &::before { right: 14px; top: 50%; transform: translateY(-50%); width: 4px; height: 50px; }
  }
}

// 中间移动区域
.crop-center {
  position: absolute;
  top: 36px;
  left: 36px;
  right: 36px;
  bottom: 36px;
  z-index: 1;
}
</style>
