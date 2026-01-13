<template>
  <view class="groups-page">
    <!-- 组合列表 -->
    <view class="group-list">
      <view 
        v-for="group in groups" 
        :key="group.id"
        class="group-card"
        @tap="editGroup(group)"
      >
        <view class="group-card__header">
          <text class="group-card__name">{{ group.name }}</text>
          <view class="group-card__actions" @tap.stop>
            <view class="action-btn" @tap="editGroup(group, $event)">编辑</view>
            <view class="action-btn action-btn--danger" @tap="deleteGroup(group.id, $event)">删除</view>
          </view>
        </view>
        
        <text v-if="group.description" class="group-card__desc">{{ group.description }}</text>
        
        <view class="group-card__products">
          <text class="products-label">包含产品：</text>
          <view class="products-tags">
            <view v-for="productId in group.productIds" :key="productId" class="product-tag">
              {{ getProductName(productId) }}
            </view>
          </view>
        </view>
      </view>
      
      <view v-if="groups.length === 0" class="empty-state">
        <image src="/static/icons/package.svg" class="empty-icon" mode="aspectFit" />
        <text class="empty-text">暂无产品组合</text>
      </view>
    </view>
    
    <!-- 添加按钮 -->
    <view class="add-btn" @tap="showAddModal = true">
      <text class="add-btn__icon">+</text>
      <text class="add-btn__text">添加产品组合</text>
    </view>
    
    <!-- 添加/编辑弹窗 -->
    <view v-if="showAddModal || showEditModal" class="modal-mask" @tap="closeModal">
      <view class="modal-content modal-content--large" @tap.stop>
        <text class="modal-title">{{ editingGroup ? '编辑产品组合' : '添加产品组合' }}</text>
        
        <view class="modal-form">
          <view class="form-item">
            <text class="form-label">组合名称 <text class="required">*</text></text>
            <input 
              v-model="form.name" 
              class="form-input" 
              placeholder="如：茶类产品组合"
              maxlength="50"
            />
          </view>
          
          <view class="form-item">
            <text class="form-label">组合描述</text>
            <textarea 
              v-model="form.description" 
              class="form-textarea" 
              placeholder="如：包含茉莉茶、龙井茶、金桂龙眼三种茶类产品"
              maxlength="200"
            />
          </view>
          
          <view class="form-item">
            <text class="form-label">选择产品 <text class="required">*</text></text>
            <view class="product-select">
              <view 
                v-for="product in products" 
                :key="product.id"
                class="product-select-item"
                :class="{ 
                  'product-select-item--active': isProductSelected(product.id),
                  'product-select-item--disabled': isProductDisabled(product.id)
                }"
              >
                <view class="product-select-item__left" @tap="toggleProductSelection(product.id)">
                  <view class="product-select-item__check">
                    <text v-if="isProductSelected(product.id)">✓</text>
                  </view>
                  <view class="product-select-item__info">
                    <text class="product-select-item__name">{{ product.name }}</text>
                    <text class="product-select-item__weight">重量：{{ product.weight }}kg</text>
                  </view>
                </view>
              </view>
            </view>
            <view v-if="form.productIds.length === 0" class="form-tip">
              <text class="tip-text">请至少选择一个产品</text>
            </view>
            <view v-else-if="weightError" class="form-tip form-tip--error">
              <text class="tip-text tip-text--error">{{ weightError }}</text>
            </view>
            <view v-else class="form-tip form-tip--success">
              <text class="tip-text tip-text--success">已选择 {{ form.productIds.length }} 个产品（重量：{{ selectedWeight }}kg）</text>
            </view>
          </view>
        </view>
        
        <view class="modal-actions">
          <view class="modal-btn modal-btn--cancel" @tap="closeModal">取消</view>
          <view class="modal-btn modal-btn--confirm" @tap="confirmSave">确认</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/stores/app'
import { productGroupApi } from '@/api'
import type { ProductGroup } from '@/types'

const store = useAppStore()

const groups = ref<ProductGroup[]>([])
const products = computed(() => store.products)

const showAddModal = ref(false)
const showEditModal = ref(false)
const editingGroup = ref<ProductGroup | null>(null)

const form = ref({
  name: '',
  description: '',
  productIds: [] as string[]
})

onMounted(async () => {
  await loadGroups()
  if (store.products.length === 0) {
    await store.loadProducts()
  }
})

onShow(async () => {
  await loadGroups()
})

const loadGroups = async () => {
  try {
    groups.value = await productGroupApi.getAll()
  } catch (error) {
    console.error('加载产品组合失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

const getProductName = (productId: string) => {
  const product = products.value.find(p => p.id === productId)
  return product?.name || productId
}

const isProductSelected = (productId: string) => {
  return form.value.productIds.includes(productId)
}

// 获取已选择产品的重量（如果已选择产品，返回第一个产品的重量）
const getSelectedWeight = () => {
  if (form.value.productIds.length === 0) return null
  const firstProduct = products.value.find(p => p.id === form.value.productIds[0])
  return firstProduct?.weight || null
}

// 检查产品是否应该被禁用（如果已选择产品，且该产品重量与已选择产品不同，则禁用）
const isProductDisabled = (productId: string) => {
  if (form.value.productIds.length === 0) return false
  const selectedWeight = getSelectedWeight()
  if (selectedWeight === null) return false
  const product = products.value.find(p => p.id === productId)
  if (!product) return false
  // 如果该产品已被选中，不禁用
  if (form.value.productIds.includes(productId)) return false
  // 如果该产品重量与已选择产品不同，禁用
  return product.weight !== selectedWeight
}

const toggleProductSelection = (productId: string) => {
  // 如果产品被禁用，不允许选择
  if (isProductDisabled(productId)) {
    uni.showToast({ 
      title: '只能选择重量相同的产品', 
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  const index = form.value.productIds.indexOf(productId)
  if (index > -1) {
    form.value.productIds.splice(index, 1)
  } else {
    form.value.productIds.push(productId)
  }
}

// 计算已选择产品的重量（用于显示）
const selectedWeight = computed(() => {
  if (form.value.productIds.length === 0) return null
  const firstProduct = products.value.find(p => p.id === form.value.productIds[0])
  return firstProduct?.weight || null
})

// 检查重量是否一致
const weightError = computed(() => {
  if (form.value.productIds.length === 0) return null
  if (form.value.productIds.length === 1) return null
  
  const selectedWeight = getSelectedWeight()
  if (selectedWeight === null) return null
  
  // 检查所有已选择产品的重量是否相同
  const allSameWeight = form.value.productIds.every(productId => {
    const product = products.value.find(p => p.id === productId)
    return product && product.weight === selectedWeight
  })
  
  if (!allSameWeight) {
    return '组合中的产品重量必须相同，请重新选择'
  }
  
  return null
})

const editGroup = (group: ProductGroup, event?: Event) => {
  if (event) {
    event.stopPropagation()
  }
  editingGroup.value = group
  form.value = {
    name: group.name,
    description: group.description || '',
    productIds: [...group.productIds]
  }
  showEditModal.value = true
}

const deleteGroup = async (id: string, event: Event) => {
  event.stopPropagation()
  
  uni.showModal({
    title: '确认删除',
    content: '删除后，使用该组合的年度目标和促销活动将受影响，确定要删除吗？',
    confirmText: '删除',
    confirmColor: '#FF4D4F',
    success: async (res) => {
      if (res.confirm) {
        try {
          await productGroupApi.delete(id)
          uni.showToast({ title: '删除成功', icon: 'success' })
          await loadGroups()
        } catch (error: any) {
          uni.showToast({ title: error.message || '删除失败', icon: 'none' })
        }
      }
    }
  })
}

const closeModal = () => {
  showAddModal.value = false
  showEditModal.value = false
  editingGroup.value = null
  form.value = {
    name: '',
    description: '',
    productIds: []
  }
}

const confirmSave = async () => {
  if (!form.value.name || form.value.name.trim() === '') {
    uni.showToast({ title: '请输入组合名称', icon: 'none' })
    return
  }
  
  if (form.value.productIds.length === 0) {
    uni.showToast({ title: '请至少选择一个产品', icon: 'none' })
    return
  }
  
  // 验证重量是否一致
  if (weightError.value) {
    uni.showToast({ title: weightError.value, icon: 'none' })
    return
  }
  
  // 再次检查所有产品的重量是否相同
  if (form.value.productIds.length > 1) {
    const firstProduct = products.value.find(p => p.id === form.value.productIds[0])
    if (firstProduct) {
      const firstWeight = firstProduct.weight
      const allSameWeight = form.value.productIds.every(productId => {
        const product = products.value.find(p => p.id === productId)
        return product && product.weight === firstWeight
      })
      if (!allSameWeight) {
        uni.showToast({ title: '组合中的产品重量必须相同', icon: 'none' })
        return
      }
    }
  }
  
  try {
    if (editingGroup.value) {
      await productGroupApi.update(editingGroup.value.id, {
        name: form.value.name.trim(),
        description: form.value.description.trim(),
        productIds: form.value.productIds
      })
      uni.showToast({ title: '更新成功', icon: 'success' })
    } else {
      await productGroupApi.create({
        name: form.value.name.trim(),
        description: form.value.description.trim(),
        productIds: form.value.productIds
      })
      uni.showToast({ title: '创建成功', icon: 'success' })
    }
    closeModal()
    await loadGroups()
  } catch (error: any) {
    uni.showToast({ title: error.message || '保存失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.groups-page {
  padding: 24rpx;
  padding-bottom: calc(100rpx + 40rpx + env(safe-area-inset-bottom));
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.group-card {
  background: #fff;
  border-radius: $border-radius;
  padding: 24rpx;
  box-shadow: $shadow-sm;
  
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12rpx;
  }
  
  &__name {
    font-size: 32rpx;
    font-weight: 600;
    color: $text-primary;
  }
  
  &__actions {
    display: flex;
    gap: 16rpx;
  }
  
  &__desc {
    font-size: 26rpx;
    color: $text-secondary;
    margin-bottom: 16rpx;
    display: block;
  }
  
  &__products {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8rpx;
  }
}

.products-label {
  font-size: 26rpx;
  color: $text-secondary;
}

.products-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.product-tag {
  padding: 8rpx 16rpx;
  background: rgba($primary-color, 0.1);
  border-radius: 8rpx;
  font-size: 24rpx;
  color: $primary-color;
}

.action-btn {
  padding: 8rpx 16rpx;
  background: $bg-grey;
  border-radius: 8rpx;
  font-size: 24rpx;
  color: $text-secondary;
  
  &--danger {
    background: rgba($danger-color, 0.1);
    color: $danger-color;
  }
  
  &:active {
    opacity: 0.8;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 0;
}

.empty-icon {
  width: 120rpx;
  height: 120rpx;
  opacity: 0.3;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: $text-placeholder;
}

.add-btn {
  position: fixed;
  bottom: calc(100rpx + 40rpx + env(safe-area-inset-bottom));
  left: 24rpx;
  right: 24rpx;
  height: 100rpx;
  background: $primary-color;
  border-radius: $border-radius-lg;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba($primary-color, 0.4);
  z-index: 100;
  
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

// 弹窗样式
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 1000;
}

.modal-content {
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 40rpx;
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
  max-height: 80vh;
  overflow-y: auto;
  
  &--large {
    max-height: 90vh;
  }
}

.modal-title {
  font-size: 36rpx;
  font-weight: 700;
  color: $text-primary;
  text-align: center;
  display: block;
  margin-bottom: 32rpx;
}

.modal-form {
  margin-bottom: 32rpx;
}

.form-item {
  margin-bottom: 32rpx;
}

.form-label {
  font-size: 28rpx;
  font-weight: 500;
  color: $text-primary;
  margin-bottom: 16rpx;
  display: block;
}

.required {
  color: $danger-color;
}

.form-input {
  width: 100%;
  padding: 32rpx;
  min-height: 96rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  font-size: 36rpx;
  color: $text-primary;
  line-height: 1.5;
  box-sizing: border-box;
}

.form-textarea {
  width: 100%;
  min-height: 200rpx;
  padding: 32rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  font-size: 36rpx;
  color: $text-primary;
  line-height: 1.5;
  box-sizing: border-box;
}

.product-select {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-top: 16rpx;
}

.product-select-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  border: 2rpx solid transparent;
  
  &--active {
    background: rgba($primary-color, 0.1);
    border-color: $primary-color;
  }
  
  &__left {
    display: flex;
    align-items: center;
    flex: 1;
  }
  
  &__check {
    width: 40rpx;
    height: 40rpx;
    border-radius: 8rpx;
    border: 2rpx solid $border-color;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16rpx;
    background: #fff;
    
    text {
      font-size: 28rpx;
      color: $primary-color;
      font-weight: 700;
    }
  }
  
  &__info {
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }
  
  &__name {
    font-size: 28rpx;
    color: $text-primary;
  }
  
  &__weight {
    font-size: 24rpx;
    color: $text-secondary;
  }
  
  &--disabled {
    opacity: 0.5;
    pointer-events: none;
  }
}

.form-tip {
  margin-top: 12rpx;
  padding: 12rpx 16rpx;
  background: rgba($primary-color, 0.05);
  border-radius: 8rpx;
  
  &--error {
    background: rgba($danger-color, 0.1);
  }
  
  &--success {
    background: rgba($success-color, 0.1);
  }
}

.tip-text {
  font-size: 24rpx;
  color: $text-secondary;
  
  &--error {
    color: $danger-color;
  }
  
  &--success {
    color: $success-color;
  }
}

.form-tip {
  margin-top: 12rpx;
  padding: 12rpx 16rpx;
  background: rgba($primary-color, 0.05);
  border-radius: 8rpx;
  
  &--error {
    background: rgba($danger-color, 0.1);
  }
  
  &--success {
    background: rgba($success-color, 0.1);
  }
}

.tip-text {
  font-size: 24rpx;
  color: $text-secondary;
  
  &--error {
    color: $danger-color;
  }
  
  &--success {
    color: $success-color;
  }
}

.modal-actions {
  display: flex;
  gap: 24rpx;
}

.modal-btn {
  flex: 1;
  padding: 28rpx;
  border-radius: $border-radius-lg;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  
  &--cancel {
    background: $bg-grey;
    color: $text-secondary;
  }
  
  &--confirm {
    background: $primary-color;
    color: #fff;
  }
  
  &:active {
    opacity: 0.8;
  }
}
</style>

