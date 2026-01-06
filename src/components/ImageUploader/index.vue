<template>
  <view class="image-uploader">
    <view class="image-uploader__label" v-if="label">{{ label }}</view>
    <view class="image-uploader__grid">
      <!-- 已上传图片 -->
      <view 
        v-for="(image, index) in modelValue" 
        :key="index"
        class="image-uploader__item"
      >
        <image 
          :src="image" 
          class="image-uploader__image" 
          mode="aspectFill"
          @tap="previewImage(index)"
        />
        <view class="image-uploader__delete" @tap.stop="deleteImage(index)">
          <text class="image-uploader__delete-icon">×</text>
        </view>
      </view>
      
      <!-- 上传按钮 -->
      <view 
        v-if="!maxCount || modelValue.length < maxCount"
        class="image-uploader__add"
        @tap="chooseImage"
      >
        <view class="image-uploader__add-icon">+</view>
        <text class="image-uploader__add-text">{{ addText }}</text>
      </view>
    </view>
    
    <!-- 提示文字 -->
    <view v-if="tip" class="image-uploader__tip">{{ tip }}</view>
  </view>
</template>

<script setup lang="ts">
import { uploadImages } from '@/utils/upload'

const props = withDefaults(defineProps<{
  modelValue: string[]
  label?: string
  maxCount?: number
  addText?: string
  tip?: string
  sizeType?: ('original' | 'compressed')[]
  sourceType?: ('album' | 'camera')[]
}>(), {
  addText: '上传图片',
  sizeType: () => ['compressed'],
  sourceType: () => ['album', 'camera']
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
  (e: 'change', value: string[]): void
}>()

// 选择图片
const chooseImage = async () => {
  const count = props.maxCount 
    ? props.maxCount - props.modelValue.length 
    : 9
    
  uni.chooseImage({
    count,
    sizeType: props.sizeType,
    sourceType: props.sourceType,
    success: async (res) => {
      try {
        // 上传图片到服务器
        const uploadedUrls = await uploadImages(res.tempFilePaths)
        const newImages = [...props.modelValue, ...uploadedUrls]
        emit('update:modelValue', newImages)
        emit('change', newImages)
      } catch (error: any) {
        uni.showToast({ title: error.message || '图片上传失败', icon: 'none' })
      }
    }
  })
}

// 删除图片
const deleteImage = (index: number) => {
  uni.showModal({
    title: '提示',
    content: '确定删除这张图片吗？',
    success: (res) => {
      if (res.confirm) {
        const newImages = props.modelValue.filter((_, i) => i !== index)
        emit('update:modelValue', newImages)
        emit('change', newImages)
      }
    }
  })
}

// 预览图片
const previewImage = (index: number) => {
  uni.previewImage({
    current: props.modelValue[index],
    urls: props.modelValue
  })
}
</script>

<style lang="scss" scoped>
.image-uploader {
  &__label {
    font-size: 28rpx;
    font-weight: 500;
    color: $text-primary;
    margin-bottom: 20rpx;
  }
  
  &__grid {
    display: flex;
    flex-wrap: wrap;
    gap: 20rpx;
  }
  
  &__item {
    position: relative;
    width: 200rpx;
    height: 200rpx;
  }
  
  &__image {
    width: 100%;
    height: 100%;
    border-radius: $border-radius;
    background: $bg-grey;
  }
  
  &__delete {
    position: absolute;
    top: -16rpx;
    right: -16rpx;
    width: 44rpx;
    height: 44rpx;
    background: $danger-color;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: $shadow;
  }
  
  &__delete-icon {
    font-size: 32rpx;
    color: #fff;
    font-weight: bold;
    line-height: 1;
  }
  
  &__add {
    width: 200rpx;
    height: 200rpx;
    border: 2rpx dashed $border-color;
    border-radius: $border-radius;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: $bg-grey;
    transition: all $transition-fast;
    
    &:active {
      background: darken($bg-grey, 3%);
      border-color: $primary-color;
    }
  }
  
  &__add-icon {
    font-size: 60rpx;
    color: $text-placeholder;
    line-height: 1;
    margin-bottom: 8rpx;
  }
  
  &__add-text {
    font-size: 24rpx;
    color: $text-placeholder;
  }
  
  &__tip {
    margin-top: 16rpx;
    font-size: 24rpx;
    color: $text-secondary;
  }
}
</style>

