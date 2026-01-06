<template>
  <view class="promotions-page">
    <!-- 促销列表 -->
    <view class="promotion-list">
      <view 
        v-for="promo in promotions" 
        :key="promo.id"
        class="promotion-card"
        @tap="goToEdit(promo.id)"
      >
        <view class="promotion-card__header">
          <view class="promotion-card__status" :class="{ 'promotion-card__status--active': promo.isActive }">
            {{ promo.isActive ? '进行中' : '已结束' }}
          </view>
          <view class="promotion-card__actions" @tap.stop>
            <view class="action-btn" @tap="toggleStatus(promo, $event)">
              {{ promo.isActive ? '停用' : '启用' }}
            </view>
            <view class="action-btn action-btn--danger" @tap="deletePromo(promo.id, $event)">删除</view>
          </view>
        </view>
        
        <text class="promotion-card__name">{{ promo.name }}</text>
        <text class="promotion-card__desc">{{ promo.description }}</text>
        
        <view class="promotion-card__rule">
          <text class="rule-label">规则：</text>
          <text class="rule-text">每满 {{ promo.threshold }} 件，赠送：</text>
        </view>
        
        <view class="promotion-card__gifts">
          <view v-for="gift in promo.gifts" :key="gift.productId" class="gift-tag">
            {{ gift.productName }} x{{ gift.quantity }}
          </view>
        </view>
        
        <view class="promotion-card__date">
          <text>活动时间：{{ formatDate(promo.startDate) }} ~ {{ formatDate(promo.endDate) }}</text>
        </view>
      </view>
      
      <view v-if="promotions.length === 0" class="empty-state">
        <image src="/static/icons/gift.svg" class="empty-icon" mode="aspectFit" />
        <text class="empty-text">暂无促销活动</text>
      </view>
    </view>
    
    <!-- 添加按钮 -->
    <view class="add-btn" @tap="showAddModal = true">
      <text class="add-btn__icon">+</text>
      <text class="add-btn__text">添加促销活动</text>
    </view>
    
    <!-- 添加弹窗 -->
    <view v-if="showAddModal" :class="['modal-mask', { 'modal-mask--hidden': isDatePickerOpen }]" @tap="showAddModal = false">
      <view class="modal-content" @tap.stop>
        <text class="modal-title">添加促销活动</text>
        
        <view class="modal-form">
          <view class="form-item">
            <text class="form-label">活动名称</text>
            <input 
              v-model="form.name" 
              class="form-input" 
              placeholder="如：年终大促"
            />
          </view>
          
          <view class="form-item">
            <text class="form-label">活动说明</text>
            <input 
              v-model="form.description" 
              class="form-input" 
              placeholder="如：每满100件赠送5件"
            />
          </view>
          
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
            <text class="form-label">触发条件产品（可组合选择）</text>
            <view class="product-select">
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
          
          <view class="form-item">
            <text class="form-label">赠品选择（可多选）</text>
            <view class="product-select">
              <view 
                v-for="product in products" 
                :key="product.id"
                class="product-select-item"
                :class="{ 'product-select-item--active': isGiftSelected(product.id) }"
              >
                <view class="product-select-item__left" @tap="toggleGiftSelection(product.id)">
                  <view class="product-select-item__check">
                    <text v-if="isGiftSelected(product.id)">✓</text>
              </view>
                  <text class="product-select-item__name">{{ product.name }}</text>
                </view>
                <view v-if="isGiftSelected(product.id)" class="product-select-item__quantity" @tap.stop>
                  <view class="quantity-control">
                    <view class="quantity-btn quantity-btn--small" @tap="changeGiftQuantity(getGiftIndex(product.id), -1)">-</view>
                  <input 
                    type="number"
                      :value="getGiftQuantity(product.id)" 
                      class="quantity-input quantity-input--small"
                      @input="(e: any) => setGiftQuantity(product.id, Number(e.detail?.value ?? (e.target as HTMLInputElement)?.value ?? 0))"
                  />
                    <view class="quantity-btn quantity-btn--small" @tap="changeGiftQuantity(getGiftIndex(product.id), 1)">+</view>
                  </view>
                </view>
              </view>
            </view>
          </view>
          
          <view class="form-item">
            <text class="form-label">开始日期</text>
            <picker mode="date" :value="form.startDate" @change="(e: any) => { form.startDate = e.detail.value; handleDatePickerChange() }">
              <view class="form-picker" @tap="handleDatePickerOpen">{{ form.startDate || '选择开始日期' }}</view>
            </picker>
          </view>
          
          <view class="form-item">
            <text class="form-label">结束日期</text>
            <picker mode="date" :value="form.endDate" @change="(e: any) => { form.endDate = e.detail.value; handleDatePickerChange() }">
              <view class="form-picker" @tap="handleDatePickerOpen">{{ form.endDate || '选择结束日期' }}</view>
            </picker>
          </view>
        </view>
        
        <view class="modal-actions">
          <view class="modal-btn modal-btn--cancel" @tap="showAddModal = false">取消</view>
          <view class="modal-btn modal-btn--confirm" @tap="addPromotion">确认添加</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '@/stores/app'
import { promotionApi } from '@/api'

const store = useAppStore()

const promotions = computed(() => store.promotions)
const products = computed(() => store.products)

const showAddModal = ref(false)
const isDatePickerOpen = ref(false)

const form = ref({
  name: '',
  description: '',
  threshold: 100,
  conditionProducts: [] as string[], // 触发条件的产品ID列表（支持组合）
  gifts: [] as Array<{ productId: string; quantity: number }>,
  startDate: '',
  endDate: ''
})

// 选中的触发条件产品（用于组合选择）
const selectedConditionProducts = ref<string[]>([])

// 处理日期选择器的打开
const handleDatePickerOpen = () => {
  isDatePickerOpen.value = true
}

// 处理日期选择器的关闭
const handleDatePickerChange = () => {
  // 延迟重置状态，确保 picker 完全关闭
  setTimeout(() => {
    isDatePickerOpen.value = false
  }, 300)
}

// 已选中的赠品产品ID列表
const selectedGifts = computed(() => form.value.gifts.map(g => g.productId))

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

// 判断产品是否被选中
const isGiftSelected = (productId: string) => {
  return selectedGifts.value.includes(productId)
}

// 切换赠品选择
const toggleGiftSelection = (productId: string) => {
  const index = form.value.gifts.findIndex(g => g.productId === productId)
  if (index > -1) {
    // 已选中，取消选择
    form.value.gifts.splice(index, 1)
  } else {
    // 未选中，添加选择
    form.value.gifts.push({
      productId,
      quantity: 1
    })
  }
}

// 获取产品图片
const getProductImage = (productId: string) => {
  const product = products.value.find(p => p.id === productId)
  return product?.image || ''
}

// 获取产品名称
const getProductName = (productId: string) => {
  const product = products.value.find(p => p.id === productId)
  return product?.name || ''
}

// 格式化日期显示（将 ISO 8601 格式转换为 YYYY-MM-DD）
const formatDate = (dateString: string) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch (error) {
    // 如果已经是 YYYY-MM-DD 格式，直接返回
    if (dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
      return dateString.split('T')[0]
    }
    return dateString
  }
}

// 获取赠品在数组中的索引
const getGiftIndex = (productId: string) => {
  return form.value.gifts.findIndex(g => g.productId === productId)
}

// 获取赠品数量
const getGiftQuantity = (productId: string) => {
  const gift = form.value.gifts.find(g => g.productId === productId)
  return gift?.quantity || 1
}

// 设置赠品数量
const setGiftQuantity = (productId: string, quantity: number) => {
  const index = getGiftIndex(productId)
  if (index > -1) {
    form.value.gifts[index].quantity = Math.max(1, quantity || 1)
  }
}

// 改变赠品数量（增加或减少）
const changeGiftQuantity = (index: number, delta: number) => {
  if (index > -1 && index < form.value.gifts.length) {
    const newQuantity = form.value.gifts[index].quantity + delta
    form.value.gifts[index].quantity = Math.max(1, newQuantity)
  }
}

// 确保数量为正整数
const ensureGiftQuantity = (index: number) => {
  if (form.value.gifts[index].quantity <= 0) {
    form.value.gifts[index].quantity = 1
  }
}

const addPromotion = async () => {
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
    // 构造gifts数组，包含产品ID、产品名称和数量
    const gifts = form.value.gifts.map(gift => {
      const product = products.value.find(p => p.id === gift.productId)
      return {
        productId: gift.productId,
        productName: product?.name || '',
        quantity: gift.quantity
      }
    })
    
    await promotionApi.create({
      name: form.value.name,
      description: form.value.description,
      threshold: form.value.threshold,
      conditionProducts: form.value.conditionProducts,
      gifts,
      isActive: true,
      startDate: form.value.startDate,
      endDate: form.value.endDate
    })
    
    await store.loadPromotions()
    
    uni.showToast({ title: '添加成功', icon: 'success' })
    showAddModal.value = false
    
    // 重置表单
    form.value = {
      name: '',
      description: '',
      threshold: 100,
      conditionProducts: [],
      gifts: [],
      startDate: '',
      endDate: ''
    }
    selectedConditionProducts.value = []
  } catch (error) {
    uni.showToast({ title: '添加失败', icon: 'none' })
  }
}

const goToEdit = (id: string) => {
  uni.navigateTo({
    url: `/pages/admin/promotions/edit?id=${id}`
  })
}

const toggleStatus = async (promo: any, e: any) => {
  e.stopPropagation() // 阻止事件冒泡到卡片
  try {
    await promotionApi.update(promo.id, { isActive: !promo.isActive })
    await store.loadPromotions()
  uni.showToast({ title: promo.isActive ? '已停用' : '已启用', icon: 'success' })
  } catch (error: any) {
    uni.showToast({ title: error.message || '操作失败', icon: 'none' })
  }
}

const deletePromo = (id: string, e: any) => {
  e.stopPropagation() // 阻止事件冒泡到卡片
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这个促销活动吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          await promotionApi.delete(id)
          await store.loadPromotions()
          uni.showToast({ title: '删除成功', icon: 'success' })
        } catch (error: any) {
          uni.showToast({ title: error.message || '删除失败', icon: 'none' })
        }
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.promotions-page {
  padding: 24rpx;
  padding-bottom: 200rpx;
}

.promotion-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.promotion-card {
  background: #fff;
  border-radius: $border-radius-lg;
  padding: 28rpx;
  box-shadow: $shadow-sm;
  
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;
  }
  
  &__status {
    font-size: 24rpx;
    padding: 6rpx 16rpx;
    border-radius: 8rpx;
    background: rgba($text-secondary, 0.1);
    color: $text-secondary;
    
    &--active {
      background: rgba($success-color, 0.1);
      color: $success-color;
    }
  }
  
  &__actions {
    display: flex;
    gap: 16rpx;
  }
  
  &__name {
    font-size: 36rpx;
    font-weight: 600;
    color: $text-primary;
    display: block;
    margin-bottom: 8rpx;
  }
  
  &__desc {
    font-size: 28rpx;
    color: $text-secondary;
    display: block;
    margin-bottom: 20rpx;
  }
  
  &__rule {
    font-size: 28rpx;
    color: $text-primary;
    margin-bottom: 12rpx;
  }
  
  &__gifts {
    display: flex;
    flex-wrap: wrap;
    gap: 12rpx;
    margin-bottom: 16rpx;
  }
  
  &__date {
    font-size: 24rpx;
    color: $text-placeholder;
    padding-top: 16rpx;
    border-top: 1rpx solid $border-color;
  }
}

.rule-label {
  color: $text-secondary;
}

.gift-tag {
  padding: 8rpx 20rpx;
  background: rgba($success-color, 0.1);
  color: $success-color;
  border-radius: 8rpx;
  font-size: 26rpx;
}

.action-btn {
  font-size: 24rpx;
  padding: 8rpx 20rpx;
  background: $bg-grey;
  border-radius: 8rpx;
  color: $text-secondary;
  
  &--danger {
    color: $danger-color;
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
  transition: opacity 0.2s;
  
  &--hidden {
    opacity: 0;
    pointer-events: none;
    z-index: -1;
  }
}

.modal-content {
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 40rpx;
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
  max-height: 85vh;
  overflow-y: auto;
  position: relative;
  z-index: 1001;
  // 不创建新的堆叠上下文，让picker弹出层可以突破限制
  // isolation: isolate; // 移除这行
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
  margin-bottom: 24rpx;
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
  height: 88rpx;
  padding: 0 24rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  font-size: 28rpx;
  box-sizing: border-box;
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
  width: 44rpx;
  height: 44rpx;
  background: #fff;
  border: 1rpx solid $border-color;
  border-radius: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 500;
  color: $text-primary;
  
  &:active {
    background: $bg-grey;
  }
  
  &--small {
    width: 40rpx;
    height: 40rpx;
    font-size: 20rpx;
  }
}

.quantity-input {
  width: 70rpx;
  height: 44rpx;
  text-align: center;
  font-size: 24rpx;
  font-weight: 500;
  background: #fff;
  border: 1rpx solid $border-color;
  border-radius: 6rpx;
  
  &--small {
    width: 60rpx;
    height: 40rpx;
    font-size: 22rpx;
  }
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
  flex: 1;
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

.modal-actions {
  display: flex;
  gap: 24rpx;
}

.modal-btn {
  flex: 1;
  height: 96rpx;
  border-radius: $border-radius;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  font-weight: 500;
  
  &--cancel {
    background: $bg-grey;
    color: $text-secondary;
  }
  
  &--confirm {
    background: $primary-color;
    color: #fff;
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: $text-placeholder;
}
</style>

