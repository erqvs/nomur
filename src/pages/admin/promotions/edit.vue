<template>
  <view class="promotion-edit">
    <view class="card">
      <!-- 活动名称 -->
      <view class="form-item">
        <text class="form-label">活动名称</text>
        <input 
          v-model="form.name" 
          class="form-input" 
          placeholder="如：年终大促"
        />
      </view>
      
      <!-- 活动说明 -->
      <view class="form-item">
        <text class="form-label">活动说明</text>
        <input 
          v-model="form.description" 
          class="form-input" 
          placeholder="如：每满100件赠送5件"
        />
      </view>
      
      <!-- 满足条件 -->
      <view class="form-item">
        <text class="form-label">满足条件（件）</text>
        <input 
          v-model.number="form.threshold" 
          class="form-input" 
          type="number"
          placeholder="如：100"
        />
      </view>
      
      <!-- 触发条件产品选择（支持组合） -->
      <view class="form-item">
        <text class="form-label">触发条件产品</text>
        <text class="form-desc">可选择单个产品，或使用产品组合</text>
        
        <!-- 产品组合选择 -->
        <view class="group-select-section">
          <text class="group-select-label">使用产品组合：</text>
          <view class="group-select-list">
            <view 
              v-for="group in productGroups" 
              :key="group.id"
              class="group-select-item"
              :class="{ 'group-select-item--active': form.conditionGroupId === group.id }"
              @tap="selectConditionGroup(group)"
            >
              <view class="group-select-item__check">
                <text v-if="form.conditionGroupId === group.id">✓</text>
              </view>
              <view class="group-select-item__info">
                <text class="group-select-item__name">{{ group.name }}</text>
                <text class="group-select-item__products">
                  {{ group.productIds.map(pid => getProductName(pid)).join(' + ') }}
                </text>
              </view>
            </view>
          </view>
          <view v-if="form.conditionGroupId" class="group-select-actions">
            <view class="group-select-btn" @tap="clearConditionGroup">取消选择组合</view>
          </view>
        </view>
        
        <!-- 或选择单个产品 -->
        <view class="product-select">
          <text class="product-select-label">或选择单个产品：</text>
          <view 
            v-for="product in products" 
            :key="product.id"
            class="product-select-item"
            :class="{ 
              'product-select-item--active': isConditionProductSelected(product.id),
              'product-select-item--in-group': isConditionProductInGroup(product.id)
            }"
          >
            <view class="product-select-item__left" @tap="toggleConditionProductSelection(product.id)">
              <view class="product-select-item__check">
                <text v-if="isConditionProductSelected(product.id)">✓</text>
              </view>
              <text class="product-select-item__name">{{ product.name }}</text>
            </view>
            <view v-if="isConditionProductInGroup(product.id)" class="product-select-item__group-badge">
              <text>组合</text>
            </view>
          </view>
        </view>
        
        <!-- 组合设置 -->
        <view v-if="selectedConditionProducts.length > 1" class="group-target-section">
          <view class="group-target-header">
            <text class="group-target-label">组合产品：{{ getSelectedProductsNames() }}</text>
            <view class="group-target-actions">
              <view class="group-target-btn group-target-btn--cancel" @tap="clearConditionSelection">取消组合</view>
              <view class="group-target-btn group-target-btn--save" @tap="saveConditionGroup">保存组合</view>
            </view>
          </view>
          <view class="group-target-tip">
            <text>当这些产品的总数量达到 {{ form.threshold }} 件时，触发促销</text>
          </view>
        </view>
      </view>
      
      <!-- 赠品选择 -->
      <view class="form-item">
        <text class="form-label">赠品选择（可多选）</text>
        <text class="form-desc">选择产品类型，系统将从该类型下的产品中随机分配</text>
        <view class="gift-type-select">
          <view 
            v-for="type in giftTypes" 
            :key="type.name"
            class="gift-type-item"
            :class="{ 'gift-type-item--active': isGiftTypeSelected(type.name) }"
          >
            <view class="gift-type-item__left" @tap="toggleGiftTypeSelection(type.name)">
              <view class="gift-type-item__check">
                <text v-if="isGiftTypeSelected(type.name)">✓</text>
              </view>
              <view class="gift-type-item__info">
                <text class="gift-type-item__name">{{ type.name }}</text>
                <text class="gift-type-item__products">{{ type.products.map(p => p.name).join('、') }}</text>
              </view>
            </view>
            <view v-if="isGiftTypeSelected(type.name)" class="gift-type-item__quantity" @tap.stop>
              <view class="quantity-control">
                <view class="quantity-btn quantity-btn--small" @tap="changeGiftTypeQuantity(type.name, -1)">-</view>
                <input 
                  type="number" 
                  :value="getGiftTypeQuantity(type.name)" 
                  class="quantity-input quantity-input--small"
                  @input="(e: any) => setGiftTypeQuantity(type.name, Number(e.detail?.value ?? (e.target as HTMLInputElement)?.value ?? 0))"
                />
                <text class="quantity-unit">箱</text>
                <view class="quantity-btn quantity-btn--small" @tap="changeGiftTypeQuantity(type.name, 1)">+</view>
              </view>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 开始日期 -->
      <view class="form-item">
        <text class="form-label">开始日期</text>
        <picker mode="date" :value="form.startDate" @change="(e: any) => form.startDate = e.detail.value">
          <view class="form-picker">{{ form.startDate || '选择开始日期' }}</view>
        </picker>
      </view>
      
      <!-- 结束日期 -->
      <view class="form-item">
        <text class="form-label">结束日期</text>
        <picker mode="date" :value="form.endDate" @change="(e: any) => form.endDate = e.detail.value">
          <view class="form-picker">{{ form.endDate || '选择结束日期' }}</view>
        </picker>
      </view>
    </view>
    
    <!-- 保存按钮 -->
    <view class="save-btn" @tap="savePromotion">
      <text class="save-btn__text">保存修改</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useAppStore } from '@/stores/app'
import { promotionApi, productGroupApi } from '@/api'
import type { ProductGroup } from '@/types'

const store = useAppStore()

const promotionId = ref('')
const products = computed(() => store.products)

const form = ref({
  name: '',
  description: '',
  threshold: 100,
  conditionProducts: [] as string[], // 触发条件的产品ID列表（支持组合）
  conditionGroupId: '' as string | undefined, // 触发条件的组合ID
  gifts: [] as Array<{ type: string; quantity: number; productIds: string[] }>, // 赠品：类型、数量、该类型下的产品ID列表
  startDate: '',
  endDate: ''
})

// 产品组合列表
const productGroups = ref<ProductGroup[]>([])

// 加载产品组合列表
const loadProductGroups = async () => {
  try {
    productGroups.value = await productGroupApi.getAll()
  } catch (error) {
    console.error('加载产品组合失败:', error)
    uni.showToast({ title: '加载产品组合失败', icon: 'none' })
  }
}

// 选中的触发条件产品（用于组合选择）
const selectedConditionProducts = ref<string[]>([])

// 根据产品名称提取类型
const extractProductType = (productName: string): string => {
  if (productName.includes('芒果')) return '芒果'
  if (productName.includes('茶')) return '茶'
  if (productName.includes('龙眼') || productName.includes('水果')) return '水果'
  // 默认返回产品名称的第一个词作为类型
  return productName.split(/[茶果汁]/)[0] || productName
}

// 产品类型列表（自动从产品中提取）
const giftTypes = computed(() => {
  const typeMap = new Map<string, Array<{ id: string; name: string }>>()
  
  products.value.forEach(product => {
    const type = extractProductType(product.name)
    if (!typeMap.has(type)) {
      typeMap.set(type, [])
    }
    typeMap.get(type)!.push({ id: product.id, name: product.name })
  })
  
  return Array.from(typeMap.entries()).map(([name, products]) => ({
    name,
    products
  }))
})

// 触发条件产品相关方法
const isConditionProductSelected = (productId: string) => {
  return selectedConditionProducts.value.includes(productId) || form.value.conditionProducts.includes(productId)
}

const isConditionProductInGroup = (productId: string) => {
  return form.value.conditionProducts.includes(productId)
}

const toggleConditionProductSelection = (productId: string) => {
  uni.vibrateShort({ type: 'light' })
  const index = selectedConditionProducts.value.indexOf(productId)
  if (index > -1) {
    selectedConditionProducts.value.splice(index, 1)
  } else {
    // 如果产品已经在条件产品列表中，先移除
    const conditionIndex = form.value.conditionProducts.indexOf(productId)
    if (conditionIndex > -1) {
      form.value.conditionProducts.splice(conditionIndex, 1)
    }
    selectedConditionProducts.value.push(productId)
  }
}

const clearConditionSelection = () => {
  selectedConditionProducts.value = []
}

// 选择产品组合作为触发条件
const selectConditionGroup = (group: ProductGroup) => {
  uni.vibrateShort({ type: 'light' })
  form.value.conditionGroupId = group.id
  // 将组合中的产品添加到条件产品列表
  form.value.conditionProducts = [...group.productIds]
  // 清空临时选择的产品
  selectedConditionProducts.value = []
}

// 清除产品组合选择
const clearConditionGroup = () => {
  form.value.conditionGroupId = ''
  form.value.conditionProducts = []
  selectedConditionProducts.value = []
}

const getSelectedProductsNames = () => {
  return selectedConditionProducts.value
    .map(id => products.value.find(p => p.id === id)?.name || id)
    .join(' + ')
}

const saveConditionGroup = () => {
  if (selectedConditionProducts.value.length < 2) {
    uni.showToast({ title: '请至少选择2个产品', icon: 'none' })
    return
  }
  
  // 移除已选产品在条件产品列表中的单独存在
  selectedConditionProducts.value.forEach(productId => {
    const index = form.value.conditionProducts.indexOf(productId)
    if (index > -1) {
      form.value.conditionProducts.splice(index, 1)
    }
  })
  
  // 添加组合产品到条件产品列表
  selectedConditionProducts.value.forEach(productId => {
    if (!form.value.conditionProducts.includes(productId)) {
      form.value.conditionProducts.push(productId)
    }
  })
  
  uni.showToast({ title: '组合已保存', icon: 'success' })
  clearConditionSelection()
}

// 判断产品类型是否被选中
const isGiftTypeSelected = (typeName: string) => {
  return form.value.gifts.some(g => g.type === typeName)
}

// 切换赠品类型选择
const toggleGiftTypeSelection = (typeName: string) => {
  const index = form.value.gifts.findIndex(g => g.type === typeName)
  if (index > -1) {
    // 已选中，取消选择
    form.value.gifts.splice(index, 1)
  } else {
    // 未选中，添加选择
    const type = giftTypes.value.find(t => t.name === typeName)
    if (type) {
      form.value.gifts.push({
        type: typeName,
        quantity: 1,
        productIds: type.products.map(p => p.id)
      })
    }
  }
}

// 获取赠品类型在数组中的索引
const getGiftTypeIndex = (typeName: string) => {
  return form.value.gifts.findIndex(g => g.type === typeName)
}

// 获取赠品类型数量
const getGiftTypeQuantity = (typeName: string) => {
  const gift = form.value.gifts.find(g => g.type === typeName)
  return gift?.quantity || 1
}

// 设置赠品类型数量
const setGiftTypeQuantity = (typeName: string, quantity: number) => {
  const index = getGiftTypeIndex(typeName)
  if (index > -1) {
    form.value.gifts[index].quantity = Math.max(1, quantity || 1)
  }
}

// 改变赠品类型数量（增加或减少）
const changeGiftTypeQuantity = (typeName: string, delta: number) => {
  const index = getGiftTypeIndex(typeName)
  if (index > -1) {
    const newQuantity = form.value.gifts[index].quantity + delta
    form.value.gifts[index].quantity = Math.max(1, newQuantity)
  }
}

// 获取产品名称
const getProductName = (productId: string) => {
  const product = products.value.find(p => p.id === productId)
  return product?.name || ''
}

// 格式化日期为 YYYY-MM-DD 格式（用于 picker 组件）
const formatDateForPicker = (dateString: string) => {
  if (!dateString) return ''
  try {
    // 如果已经是 YYYY-MM-DD 格式，直接返回
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString
    }
    // 如果是 ISO 8601 格式，转换为 YYYY-MM-DD
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return dateString // 无效日期，返回原字符串
    }
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch (error) {
    return dateString
  }
}

onMounted(async () => {
  await loadProductGroups()
  if (store.products.length === 0) {
    await store.loadProducts()
  }
})

onLoad(async (options) => {
  // 确保产品数据已加载
  if (store.products.length === 0) {
    await store.loadProducts()
  }
  
  if (options?.id) {
    promotionId.value = options.id
    uni.setNavigationBarTitle({
      title: '编辑促销活动'
    })
    
    // 加载促销活动数据
    try {
      const promotions = await promotionApi.getAll()
      const promo = promotions.find(p => p.id === options.id)
      if (promo) {
        // 转换赠品格式：兼容旧格式（productId）和新格式（type）
        const convertedGifts = promo.gifts.map((g: any) => {
          // 如果是新格式（有type字段）
          if (g.type) {
            return {
              type: g.type,
              quantity: g.quantity,
              productIds: g.productIds || []
            }
          }
          // 旧格式：根据productId找到对应的类型
          const product = products.value.find(p => p.id === g.productId)
          if (product) {
            const type = extractProductType(product.name)
            const typeInfo = giftTypes.value.find(t => t.name === type)
            return {
              type: type,
              quantity: g.quantity,
              productIds: typeInfo ? typeInfo.products.map(p => p.id) : [g.productId]
            }
          }
          return null
        }).filter((g: any) => g !== null)
        
        form.value = {
          name: promo.name,
          description: promo.description || '',
          threshold: promo.threshold,
          conditionProducts: (promo.conditionProducts as string[]) || [],
          conditionGroupId: (promo as any).conditionGroupId || '',
          gifts: convertedGifts,
          startDate: formatDateForPicker(promo.startDate),
          endDate: formatDateForPicker(promo.endDate)
        }
      }
    } catch (error) {
      uni.showToast({ title: '加载失败', icon: 'none' })
      setTimeout(() => {
        uni.navigateBack()
      }, 1500)
    }
  }
})

const savePromotion = async () => {
  if (!form.value.name) {
    uni.showToast({ title: '请输入活动名称', icon: 'none' })
    return
  }
  if (form.value.gifts.length === 0) {
    uni.showToast({ title: '请至少选择一个赠品', icon: 'none' })
    return
  }
  
  // 验证每个赠品的数量
  for (const gift of form.value.gifts) {
    if (!gift.quantity || gift.quantity <= 0) {
      uni.showToast({ title: '请设置所有赠品的数量', icon: 'none' })
      return
    }
  }
  
  try {
    // 构造gifts数组，新格式：包含类型、数量、产品ID列表
    const gifts = form.value.gifts.map(gift => ({
      type: gift.type,
      quantity: gift.quantity,
      productIds: gift.productIds,
      // 兼容字段：保留第一个产品ID和名称（用于向后兼容）
      productId: gift.productIds[0] || '',
      productName: gift.productIds.length > 0 
        ? products.value.find(p => p.id === gift.productIds[0])?.name || gift.type
        : gift.type
    }))
    
    await promotionApi.update(promotionId.value, {
      name: form.value.name,
      description: form.value.description,
      threshold: form.value.threshold,
      conditionProducts: form.value.conditionProducts,
      conditionGroupId: form.value.conditionGroupId,
      gifts,
      startDate: form.value.startDate,
      endDate: form.value.endDate
    })
    
    await store.loadPromotions()
    
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (error: any) {
    uni.showToast({ title: error.message || '保存失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.promotion-edit {
  padding: 24rpx;
  padding-bottom: 160rpx;
}

.card {
  background: #fff;
  border-radius: $border-radius-lg;
  padding: 32rpx;
  box-shadow: $shadow-sm;
  margin-bottom: 24rpx;
}

.form-item {
  margin-bottom: 32rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.form-label {
  font-size: 28rpx;
  font-weight: 500;
  color: $text-primary;
  margin-bottom: 12rpx;
  display: block;
}

.form-input {
  width: 100%;
  min-height: 96rpx;
  padding: 0 32rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  font-size: 36rpx;
  box-sizing: border-box;
  line-height: 1.5;
}

.form-picker {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  color: $text-secondary;
  box-sizing: border-box;
}

// 使用与极速开单相同的商品选择样式
.product-select {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.product-select-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 16rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  border: 2rpx solid transparent;
  transition: all $transition-fast;
  
  &--active {
    background: rgba($primary-color, 0.08);
    border-color: $primary-color;
  }
  
  &__left {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
  }
  
  &__check {
    width: 32rpx;
    height: 32rpx;
    border-radius: 50%;
    border: 2rpx solid $border-color;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12rpx;
    font-size: 18rpx;
    color: #fff;
    flex-shrink: 0;
    
    .product-select-item--active & {
      background: $primary-color;
      border-color: $primary-color;
    }
  }
  
  &__name {
    font-size: 24rpx;
    font-weight: 400;
    color: $text-primary;
    flex: 1;
  }
  
  &__quantity {
    margin-left: 12rpx;
    flex-shrink: 0;
  }
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.quantity-btn {
  width: 60rpx;
  height: 60rpx;
  background: #fff;
  border: 1rpx solid $border-color;
  border-radius: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 500;
  color: $text-primary;
  
  &:active {
    background: $bg-grey;
  }
  
  &--small {
    width: 60rpx;
    height: 60rpx;
    font-size: 32rpx;
  }
}

.quantity-input {
  width: 90rpx;
  height: 60rpx;
  text-align: center;
  font-size: 32rpx;
  font-weight: 500;
  background: #fff;
  border: 1rpx solid $border-color;
  border-radius: 6rpx;
  
  &--small {
    width: 90rpx;
    height: 60rpx;
    font-size: 32rpx;
  }
}

.quantity-unit {
  font-size: 24rpx;
  color: $text-secondary;
  margin: 0 4rpx;
}

// 赠品类型选择样式
.gift-type-select {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.gift-type-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  border: 2rpx solid transparent;
  transition: all $transition-fast;
  
  &--active {
    background: rgba($primary-color, 0.08);
    border-color: $primary-color;
  }
  
  &__left {
    display: flex;
    align-items: center;
    flex: 1;
    min-width: 0;
  }
  
  &__check {
    width: 36rpx;
    height: 36rpx;
    border-radius: 50%;
    border: 2rpx solid $border-color;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16rpx;
    font-size: 20rpx;
    color: #fff;
    flex-shrink: 0;
    
    .gift-type-item--active & {
      background: $primary-color;
      border-color: $primary-color;
    }
  }
  
  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }
  
  &__name {
    font-size: 28rpx;
    font-weight: 500;
    color: $text-primary;
  }
  
  &__products {
    font-size: 24rpx;
    color: $text-secondary;
  }
  
  &__quantity {
    margin-left: 16rpx;
    flex-shrink: 0;
  }
}

.product-select-label {
  font-size: 26rpx;
  font-weight: 500;
  color: $text-primary;
  margin-bottom: 12rpx;
  display: block;
}

.product-select-item--in-group {
  border-color: $success-color;
  background: rgba($success-color, 0.08);
}

.product-select-item__group-badge {
  padding: 4rpx 12rpx;
  background: $success-color;
  color: #fff;
  border-radius: 4rpx;
  font-size: 20rpx;
  margin-left: 12rpx;
}

.group-select-section {
  margin-bottom: 32rpx;
  padding: 20rpx;
  background: rgba($primary-color, 0.03);
  border-radius: $border-radius;
  border: 1rpx solid rgba($primary-color, 0.1);
}

.group-select-label {
  font-size: 26rpx;
  font-weight: 500;
  color: $text-primary;
  margin-bottom: 16rpx;
  display: block;
}

.group-select-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.group-select-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background: #fff;
  border-radius: $border-radius;
  border: 2rpx solid $border-color;
  
  &--active {
    background: rgba($primary-color, 0.05);
    border-color: $primary-color;
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
    flex-shrink: 0;
    
    text {
      font-size: 28rpx;
      color: $primary-color;
      font-weight: 700;
    }
  }
  
  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }
  
  &__name {
    font-size: 28rpx;
    font-weight: 500;
    color: $text-primary;
  }
  
  &__products {
    font-size: 24rpx;
    color: $text-secondary;
  }
}

.group-select-actions {
  margin-top: 16rpx;
}

.group-select-btn {
  padding: 12rpx 24rpx;
  background: $bg-grey;
  color: $text-secondary;
  border-radius: $border-radius;
  text-align: center;
  font-size: 26rpx;
  
  &:active {
    opacity: 0.8;
  }
}

.group-target-section {
  margin-top: 16rpx;
  padding: 20rpx;
  background: rgba($primary-color, 0.05);
  border-radius: $border-radius;
  border: 1rpx solid rgba($primary-color, 0.2);
}

.group-target-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.group-target-label {
  font-size: 26rpx;
  font-weight: 500;
  color: $text-primary;
}

.group-target-actions {
  display: flex;
  gap: 12rpx;
}

.group-target-btn {
  padding: 8rpx 16rpx;
  border-radius: 6rpx;
  font-size: 24rpx;
  
  &--cancel {
    background: $bg-grey;
    color: $text-secondary;
  }
  
  &--save {
    background: $primary-color;
    color: #fff;
  }
  
  &:active {
    opacity: 0.8;
  }
}

.group-target-tip {
  font-size: 24rpx;
  color: $text-secondary;
  line-height: 1.5;
}

.save-btn {
  position: fixed;
  bottom: 40rpx;
  left: 24rpx;
  right: 24rpx;
  height: 96rpx;
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
</style>

