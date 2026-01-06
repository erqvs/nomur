<template>
  <view class="products-page">
    <!-- 商品列表 -->
    <view class="product-list">
      <view 
        v-for="product in products" 
        :key="product.id"
        class="product-item"
        @tap="editProduct(product.id)"
      >
        <image 
          :src="product.image || '/static/images/product-placeholder.svg'" 
          class="product-item__image" 
          mode="aspectFill"
        />
        <view class="product-item__info">
          <text class="product-item__name">{{ product.name }}</text>
          <view class="product-item__meta">
            <text class="product-item__price">¥{{ product.price }}</text>
            <text class="product-item__weight">{{ product.weight }}kg/箱</text>
          </view>
          <view class="product-item__materials">
            <text class="product-item__materials-label">素材：</text>
            <text class="product-item__materials-count">{{ product.materials.length }}张</text>
          </view>
        </view>
        <view class="product-item__arrow">›</view>
      </view>
    </view>
    
    <!-- 空状态 -->
    <view v-if="products.length === 0" class="empty-state">
      <image src="/static/icons/box.svg" class="empty-icon" mode="aspectFit" />
      <text class="empty-text">暂无商品，点击下方按钮添加</text>
    </view>
    
    <!-- 添加按钮 -->
    <view class="add-btn" @tap="addProduct">
      <text class="add-btn__icon">+</text>
      <text class="add-btn__text">添加商品</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from '@/stores/app'

const store = useAppStore()
const products = computed(() => store.products)

const addProduct = () => {
  uni.navigateTo({
    url: '/pages/admin/products/edit'
  })
}

const editProduct = (id: string) => {
  uni.navigateTo({
    url: `/pages/admin/products/edit?id=${id}`
  })
}
</script>

<style lang="scss" scoped>
.products-page {
  padding: 24rpx;
  padding-bottom: 280rpx;
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.product-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: #fff;
  border-radius: $border-radius;
  box-shadow: $shadow-sm;
  
  &:active {
    background: $bg-hover;
  }
  
  &__image {
    width: 140rpx;
    height: 140rpx;
    border-radius: $border-radius;
    background: $bg-grey;
    margin-right: 24rpx;
  }
  
  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }
  
  &__name {
    font-size: 32rpx;
    font-weight: 600;
    color: $text-primary;
  }
  
  &__meta {
    display: flex;
    align-items: center;
    gap: 16rpx;
  }
  
  &__price {
    font-size: 32rpx;
    font-weight: 600;
    color: $danger-color;
  }
  
  &__weight {
    font-size: 24rpx;
    color: $text-secondary;
    padding: 4rpx 12rpx;
    background: $bg-grey;
    border-radius: 4rpx;
  }
  
  &__materials {
    display: flex;
    align-items: center;
  }
  
  &__materials-label {
    font-size: 24rpx;
    color: $text-secondary;
  }
  
  &__materials-count {
    font-size: 24rpx;
    color: $primary-color;
  }
  
  &__arrow {
    font-size: 40rpx;
    color: $text-placeholder;
  }
}

.add-btn {
  position: fixed;
  bottom: 140rpx;
  left: 24rpx;
  right: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100rpx;
  background: $primary-color;
  border-radius: $border-radius-lg;
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

