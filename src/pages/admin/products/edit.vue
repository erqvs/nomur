<template>
  <view class="product-edit">
    <view class="card">
      <!-- 商品图片 -->
      <view class="form-item">
        <text class="form-label">商品图片 <text class="required">*</text></text>
        <view class="image-picker" @tap="chooseMainImage">
          <image 
            v-if="form.image" 
            :src="form.image" 
            class="image-picker__preview"
            mode="aspectFill"
          />
          <view v-else class="image-picker__placeholder">
            <text class="image-picker__icon">📷</text>
            <text class="image-picker__text">点击上传</text>
          </view>
        </view>
      </view>
      
      <!-- 商品名称 -->
      <QuickInput
        v-model="form.name"
        label="商品名称"
        placeholder="请输入商品名称"
        required
      />
      
      <!-- 商品价格 -->
      <QuickInput
        v-model="form.price"
        label="商品价格"
        placeholder="请输入价格"
        type="digit"
        prefix="¥"
        suffix="元/箱"
        required
      />
      
      <!-- 商品重量 -->
      <QuickInput
        v-model="form.weight"
        label="商品重量"
        placeholder="请输入重量"
        type="digit"
        suffix="kg/箱"
        required
        :showQuickNumbers="true"
        :quickNumbers="[1.5, 2, 2.5, 3, 3.5, 4]"
      />
    </view>
    
    <!-- 素材库 -->
    <view class="card">
      <view class="section-title">素材库</view>
      <text class="section-desc">上传高清海报/源文件供代理商下载使用</text>
      <ImageUploader
        v-model="form.materials"
        addText="添加素材"
        tip="支持多张图片上传"
      />
    </view>
    
    <!-- 保存按钮 -->
    <view class="save-btn" @tap="saveProduct">
      <text class="save-btn__text">{{ isEdit ? '保存修改' : '添加商品' }}</text>
    </view>
    
    <!-- 删除按钮（仅在编辑模式下显示） -->
    <view v-if="isEdit" class="delete-btn" @tap="deleteProduct">
      <text class="delete-btn__text">删除商品</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useAppStore } from '@/stores/app'
import QuickInput from '@/components/QuickInput/index.vue'
import ImageUploader from '@/components/ImageUploader/index.vue'
import { uploadImage } from '@/utils/upload'

const store = useAppStore()

const productId = ref<string>('')
const isEdit = computed(() => !!productId.value)

const form = ref({
  name: '',
  image: '',
  price: 0,
  weight: 0,
  materials: [] as string[]
})

onLoad((options) => {
  if (options?.id) {
    productId.value = options.id
    const product = store.products.find(p => p.id === options.id)
    if (product) {
      form.value = {
        name: product.name,
        image: product.image,
        price: product.price,
        weight: product.weight,
        materials: [...product.materials]
      }
    }
  }
})

const chooseMainImage = async () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      try {
        // 上传图片到服务器
        const imageUrl = await uploadImage(res.tempFilePaths[0])
        form.value.image = imageUrl
        uni.showToast({ title: '图片上传成功', icon: 'success' })
      } catch (error: any) {
        uni.showToast({ title: error.message || '图片上传失败', icon: 'none' })
      }
    }
  })
}

const saveProduct = async () => {
  // 验证
  if (!form.value.name || form.value.name.trim() === '') {
    uni.showToast({ title: '请输入商品名称', icon: 'none' })
    return
  }
  if (form.value.price === undefined || form.value.price === null || form.value.price <= 0) {
    uni.showToast({ title: '请输入商品价格', icon: 'none' })
    return
  }
  if (form.value.weight === undefined || form.value.weight === null || form.value.weight <= 0) {
    uni.showToast({ title: '请输入商品重量', icon: 'none' })
    return
  }
  
  try {
    if (isEdit.value) {
      // 更新商品
      await store.updateProduct(productId.value, form.value)
    } else {
      // 添加商品
      await store.addProduct(form.value)
    }
    
    uni.showToast({
      title: isEdit.value ? '修改成功' : '添加成功',
      icon: 'success'
    })
    
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (error: any) {
    uni.showToast({ title: error.message || '保存失败', icon: 'none' })
  }
}

const deleteProduct = () => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除商品"${form.value.name}"吗？删除后无法恢复。`,
    confirmText: '删除',
    confirmColor: '#FF4D4F',
    success: async (res) => {
      if (res.confirm) {
        try {
          await store.deleteProduct(productId.value)
          uni.showToast({
            title: '删除成功',
            icon: 'success'
          })
          
          setTimeout(() => {
            uni.navigateBack()
          }, 1500)
        } catch (error: any) {
          uni.showToast({ 
            title: error.message || '删除失败', 
            icon: 'none' 
          })
        }
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.product-edit {
  padding: 24rpx;
  padding-bottom: 180rpx;
}

.form-item {
  margin-bottom: 32rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: $text-primary;
  margin-bottom: 16rpx;
}

.required {
  color: $danger-color;
}

.image-picker {
  width: 240rpx;
  height: 240rpx;
  border-radius: $border-radius;
  overflow: hidden;
  background: $bg-grey;
  
  &__preview {
    width: 100%;
    height: 100%;
  }
  
  &__placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 2rpx dashed $border-color;
    border-radius: $border-radius;
  }
  
  &__icon {
    font-size: 60rpx;
    margin-bottom: 12rpx;
  }
  
  &__text {
    font-size: 26rpx;
    color: $text-placeholder;
  }
}

.section-desc {
  font-size: 24rpx;
  color: $text-secondary;
  margin-bottom: 20rpx;
  display: block;
}

.save-btn {
  position: fixed;
  bottom: 40rpx;
  left: 24rpx;
  right: 24rpx;
  height: 100rpx;
  background: $success-color;
  border-radius: $border-radius-lg;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba($success-color, 0.4);
  
  &:active {
    transform: scale(0.98);
  }
  
  &__text {
    font-size: 32rpx;
    font-weight: 600;
    color: #fff;
  }
}

.delete-btn {
  position: fixed;
  bottom: 160rpx;
  left: 24rpx;
  right: 24rpx;
  height: 100rpx;
  background: $danger-color;
  border-radius: $border-radius-lg;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba($danger-color, 0.4);
  
  &:active {
    transform: scale(0.98);
  }
  
  &__text {
    font-size: 32rpx;
    font-weight: 600;
    color: #fff;
  }
}
</style>

