<template>
  <view class="agent-edit">
    <view class="card">
      <!-- 头像 -->
      <view class="form-item">
        <text class="form-label">头像</text>
        <view class="avatar-picker" @tap="chooseAvatar">
          <image 
            v-if="form.avatar" 
            :src="form.avatar" 
            class="avatar-picker__preview"
            mode="aspectFill"
          />
          <view v-else class="avatar-picker__placeholder">
            <text class="avatar-picker__icon">👤</text>
            <text class="avatar-picker__text">点击上传头像</text>
          </view>
        </view>
      </view>
      
      <!-- 姓名 -->
      <QuickInput
        v-model="form.name"
        label="姓名"
        placeholder="请输入代理商姓名"
        required
      />
      
      <!-- 手机号1 -->
      <QuickInput
        v-model="form.phone1"
        label="手机号"
        placeholder="请输入手机号"
        type="number"
        required
      />
      
      <!-- 手机号2（可选） -->
      <QuickInput
        v-model="form.phone2"
        label="备用手机号（可选）"
        placeholder="请输入备用手机号"
        type="number"
      />
      
      <!-- 地址 -->
      <view class="form-item">
        <text class="form-label">地址 <text class="required">*</text></text>
        <textarea
          v-model="form.address"
          class="form-textarea"
          placeholder="请输入详细地址"
          maxlength="500"
        />
      </view>
      
      <!-- 年度目标 -->
      <view class="form-item">
        <text class="form-label">年度目标（箱/年）</text>
        <text class="form-desc">可设置单个产品目标，或勾选多个产品设置组合目标</text>
        
        <!-- 单个产品目标 -->
        <view class="product-target-select">
          <view 
            v-for="product in store.products" 
            :key="product.id"
            class="product-target-item"
            :class="{ 'product-target-item--in-group': isProductInGroup(product.id) }"
          >
            <view class="product-target-item__left">
              <view 
                class="product-target-item__checkbox"
                :class="{ 'product-target-item__checkbox--checked': selectedProducts.includes(product.id) }"
                @tap="toggleProductSelection(product.id)"
              >
                <text v-if="selectedProducts.includes(product.id)">✓</text>
              </view>
              <text class="product-target-item__name">{{ product.name }}</text>
            </view>
            <view 
              v-if="!isProductInGroup(product.id)"
              class="product-target-item__target" 
              @tap.stop
            >
              <view class="quantity-control">
                <view class="quantity-btn quantity-btn--small" @tap="changeTargetQuantity(product.id, -10)">-</view>
                <input 
                  type="number" 
                  :value="getProductTarget(product.id)" 
                  class="quantity-input quantity-input--small"
                  @input="(e: any) => setProductTarget(product.id, Number(e.detail?.value ?? (e.target as HTMLInputElement)?.value ?? 0))"
                />
                <view class="quantity-btn quantity-btn--small" @tap="changeTargetQuantity(product.id, 10)">+</view>
              </view>
            </view>
            <text v-else class="product-target-item__group-label">已加入组合</text>
          </view>
        </view>
        
        <!-- 组合目标设置 -->
        <view v-if="selectedProducts.length > 1" class="group-target-section">
          <text class="group-target-label">组合目标（共{{ selectedProducts.length }}个产品）</text>
          <view class="group-target-products">
            <text v-for="(productId, idx) in selectedProducts" :key="productId" class="group-product-tag">
              {{ getProductName(productId) }}<text v-if="idx < selectedProducts.length - 1"> + </text>
            </text>
          </view>
          <view class="group-target-input">
            <text class="group-target-label">总目标：</text>
            <view class="quantity-control">
              <view class="quantity-btn quantity-btn--small" @tap="changeGroupTarget(-1000)">-</view>
              <input 
                type="number" 
                :value="getGroupTarget()" 
                class="quantity-input quantity-input--small"
                @input="(e: any) => setGroupTarget(Number(e.detail?.value ?? (e.target as HTMLInputElement)?.value ?? 0))"
              />
              <view class="quantity-btn quantity-btn--small" @tap="changeGroupTarget(1000)">+</view>
            </view>
            <text class="group-target-unit">箱</text>
          </view>
          <view class="group-target-actions">
            <view class="group-target-btn group-target-btn--cancel" @tap="clearSelection">取消组合</view>
            <view class="group-target-btn group-target-btn--confirm" @tap="saveGroupTarget">保存组合</view>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 保存按钮 -->
    <view class="save-btn" @tap="saveAgent">
      <text class="save-btn__text">{{ isEdit ? '保存修改' : '添加代理' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useAppStore } from '@/stores/app'
import { agentApi, productGroupApi } from '@/api'
import QuickInput from '@/components/QuickInput/index.vue'
import { uploadImage } from '@/utils/upload'
import type { GroupTarget, ProductGroup } from '@/types'

const store = useAppStore()

const agentId = ref<string>('')
const isEdit = computed(() => !!agentId.value)

const form = ref({
  avatar: '',
  name: '',
  phone1: '',
  phone2: '',
  address: '',
  yearlyTargets: {} as { [key: string]: number | GroupTarget }
})

// 产品组合列表
const productGroups = ref<ProductGroup[]>([])

// 选中的产品（用于手动组合目标）
const selectedProducts = ref<string[]>([])
const currentGroupTarget = ref(0)

onLoad((options) => {
  if (options?.id) {
    agentId.value = options.id
    uni.setNavigationBarTitle({
      title: '编辑代理'
    })
    const agent = store.agents.find(a => a.id === options.id)
    if (agent) {
      form.value = {
        avatar: agent.avatar || '',
        name: agent.name,
        phone1: agent.phone1,
        phone2: agent.phone2 || '',
        address: agent.address,
        yearlyTargets: { ...agent.yearlyTargets }
      }
    }
  }
})

// 获取产品名称
const getProductName = (productId: string) => {
  const product = store.products.find(p => p.id === productId)
  return product?.name || productId
}

// 检查产品是否在组合中（包括产品组合和手动组合）
const isProductInGroup = (productId: string) => {
  // 检查是否在产品组合中
  for (const key of Object.keys(form.value.yearlyTargets)) {
    const target = form.value.yearlyTargets[key]
    if (typeof target === 'object' && target !== null && 'products' in target) {
      const group = target as GroupTarget
      if (group.products && group.products.includes(productId)) {
        return true
      }
    }
  }
  return false
}

// 检查产品组合是否被选中
const isGroupSelected = (groupId: string) => {
  for (const key of Object.keys(form.value.yearlyTargets)) {
    const target = form.value.yearlyTargets[key]
    if (typeof target === 'object' && target !== null && 'groupId' in target) {
      const group = target as GroupTarget
      if (group.groupId === groupId) {
        return true
      }
    }
  }
  return false
}

// 选择产品组合
const selectProductGroup = (group: ProductGroup) => {
  if (isGroupSelected(group.id)) {
    // 取消选择
    removeProductGroup(group.id)
  } else {
    // 选择组合
    const groupKey = `group_${group.id}`
    form.value.yearlyTargets[groupKey] = {
      products: [...group.productIds],
      target: 0,
      groupId: group.id
    }
  }
}

// 移除产品组合
const removeProductGroup = (groupId: string) => {
  for (const key of Object.keys(form.value.yearlyTargets)) {
    const target = form.value.yearlyTargets[key]
    if (typeof target === 'object' && target !== null && 'groupId' in target) {
      const group = target as GroupTarget
      if (group.groupId === groupId) {
        delete form.value.yearlyTargets[key]
        break
      }
    }
  }
}

// 获取产品组合的目标值
const getGroupTargetValue = (groupId: string) => {
  for (const key of Object.keys(form.value.yearlyTargets)) {
    const target = form.value.yearlyTargets[key]
    if (typeof target === 'object' && target !== null && 'groupId' in target) {
      const group = target as GroupTarget
      if (group.groupId === groupId) {
        return group.target
      }
    }
  }
  return 0
}

// 设置产品组合的目标值
const setGroupTargetValue = (groupId: string, value: number) => {
  for (const key of Object.keys(form.value.yearlyTargets)) {
    const target = form.value.yearlyTargets[key]
    if (typeof target === 'object' && target !== null && 'groupId' in target) {
      const group = target as GroupTarget
      if (group.groupId === groupId) {
        group.target = Math.max(0, value || 0)
        break
      }
    }
  }
}

// 修改产品组合的目标值
const changeGroupTargetQuantity = (groupId: string, delta: number) => {
  const current = getGroupTargetValue(groupId)
  setGroupTargetValue(groupId, current + delta)
}

// 获取产品所在的组合
const getProductGroup = (productId: string): string | null => {
  for (const key of Object.keys(form.value.yearlyTargets)) {
    if (key.startsWith('_group_')) {
      const group = form.value.yearlyTargets[key] as GroupTarget
      if (group && typeof group === 'object' && 'products' in group && group.products.includes(productId)) {
        return key
      }
    }
  }
  return null
}

// 年度目标相关方法
const getProductTarget = (productId: string) => {
  const target = form.value.yearlyTargets[productId]
  if (typeof target === 'number') {
    return target
  }
  return 0
}

const setProductTarget = (productId: string, value: number) => {
  // 如果产品在组合中，先移除组合
  const groupKey = getProductGroup(productId)
  if (groupKey) {
    removeProductFromGroup(productId)
  }
  
  form.value.yearlyTargets = {
    ...form.value.yearlyTargets,
    [productId]: Math.max(0, value || 0)
  }
}

const changeTargetQuantity = (productId: string, delta: number) => {
  const current = getProductTarget(productId)
  setProductTarget(productId, Math.max(0, current + delta))
}

// 组合目标相关方法
const toggleProductSelection = (productId: string) => {
  const index = selectedProducts.value.indexOf(productId)
  if (index > -1) {
    selectedProducts.value.splice(index, 1)
  } else {
    // 如果产品已经在其他组合中，先移除
    if (isProductInGroup(productId)) {
      removeProductFromGroup(productId)
    }
    selectedProducts.value.push(productId)
    // 加载已有的组合目标
    const groupKey = getProductGroup(productId)
    if (groupKey) {
      const group = form.value.yearlyTargets[groupKey] as GroupTarget
      if (group && typeof group === 'object' && 'target' in group) {
        currentGroupTarget.value = group.target
      }
    }
  }
}

const clearSelection = () => {
  selectedProducts.value = []
  currentGroupTarget.value = 0
}

const getGroupTarget = () => {
  if (selectedProducts.value.length > 1) {
    // 检查是否已有组合
    const existingGroup = findExistingGroup(selectedProducts.value)
    if (existingGroup) {
      const group = form.value.yearlyTargets[existingGroup] as GroupTarget
      return group.target
    }
  }
  return currentGroupTarget.value
}

const setGroupTarget = (value: number) => {
  currentGroupTarget.value = Math.max(0, value || 0)
}

const changeGroupTarget = (delta: number) => {
  currentGroupTarget.value = Math.max(0, currentGroupTarget.value + delta)
}

const findExistingGroup = (productIds: string[]): string | null => {
  for (const key of Object.keys(form.value.yearlyTargets)) {
    if (key.startsWith('_group_')) {
      const group = form.value.yearlyTargets[key] as GroupTarget
      if (group && typeof group === 'object' && 'products' in group) {
        const groupProducts = [...group.products].sort()
        const selectedProductsSorted = [...productIds].sort()
        if (groupProducts.length === selectedProductsSorted.length &&
            groupProducts.every((id, idx) => id === selectedProductsSorted[idx])) {
          return key
        }
      }
    }
  }
  return null
}

const saveGroupTarget = () => {
  if (selectedProducts.value.length < 2) {
    uni.showToast({ title: '请至少选择2个产品', icon: 'none' })
    return
  }
  if (currentGroupTarget.value <= 0) {
    uni.showToast({ title: '请输入组合目标', icon: 'none' })
    return
  }
  
  // 移除这些产品的独立目标
  selectedProducts.value.forEach(productId => {
    if (typeof form.value.yearlyTargets[productId] === 'number') {
      delete form.value.yearlyTargets[productId]
    }
  })
  
  // 移除这些产品已有的组合
  selectedProducts.value.forEach(productId => {
    removeProductFromGroup(productId)
  })
  
  // 创建新组合或更新现有组合
  const existingGroup = findExistingGroup(selectedProducts.value)
  const groupKey = existingGroup || `_group_${Date.now()}`
  
  form.value.yearlyTargets = {
    ...form.value.yearlyTargets,
    [groupKey]: {
      products: [...selectedProducts.value],
      target: currentGroupTarget.value
    } as GroupTarget
  }
  
  uni.showToast({ title: '组合目标已保存', icon: 'success' })
  clearSelection()
}

const removeProductFromGroup = (productId: string) => {
  const groupKey = getProductGroup(productId)
  if (groupKey) {
    const group = form.value.yearlyTargets[groupKey] as GroupTarget
    if (group && typeof group === 'object' && 'products' in group) {
      const remainingProducts = group.products.filter(id => id !== productId)
      if (remainingProducts.length === 0) {
        // 如果组合为空，删除组合
        delete form.value.yearlyTargets[groupKey]
      } else if (remainingProducts.length === 1) {
        // 如果只剩一个产品，转为独立目标
        delete form.value.yearlyTargets[groupKey]
        form.value.yearlyTargets[remainingProducts[0]] = group.target
      } else {
        // 更新组合
        form.value.yearlyTargets[groupKey] = {
          products: remainingProducts,
          target: group.target
        } as GroupTarget
      }
    }
  }
}

const chooseAvatar = async () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      try {
        // 上传头像到服务器
        const imageUrl = await uploadImage(res.tempFilePaths[0])
        form.value.avatar = imageUrl
        uni.showToast({ title: '头像上传成功', icon: 'success' })
      } catch (error: any) {
        uni.showToast({ title: error.message || '头像上传失败', icon: 'none' })
      }
    }
  })
}

const saveAgent = async () => {
  // 验证
  if (!form.value.name) {
    uni.showToast({ title: '请输入代理商姓名', icon: 'none' })
    return
  }
  if (!form.value.phone1) {
    uni.showToast({ title: '请输入手机号', icon: 'none' })
    return
  }
  if (!/^1[3-9]\d{9}$/.test(form.value.phone1)) {
    uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
    return
  }
  if (form.value.phone2 && !/^1[3-9]\d{9}$/.test(form.value.phone2)) {
    uni.showToast({ title: '请输入正确的备用手机号', icon: 'none' })
    return
  }
  if (!form.value.address) {
    uni.showToast({ title: '请输入地址', icon: 'none' })
    return
  }
  
  try {
    if (isEdit.value) {
      // 更新代理
      await agentApi.update(agentId.value, form.value)
      await store.loadAgents()
      uni.showToast({
        title: '修改成功',
        icon: 'success'
      })
    } else {
      // 添加代理
      await store.addAgent(form.value)
      uni.showToast({
        title: '添加成功',
        icon: 'success'
      })
    }
    
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (error: any) {
    uni.showToast({
      title: error.message || (isEdit.value ? '修改失败' : '添加失败'),
      icon: 'none'
    })
  }
}
</script>

<style lang="scss" scoped>
.agent-edit {
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
  display: block;
  margin-bottom: 16rpx;
}

.required {
  color: $danger-color;
}

.avatar-picker {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  overflow: hidden;
  background: $bg-grey;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed $border-color;
  
  &__preview {
    width: 100%;
    height: 100%;
  }
  
  &__placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  
  &__icon {
    font-size: 64rpx;
    margin-bottom: 8rpx;
  }
  
  &__text {
    font-size: 22rpx;
    color: $text-placeholder;
  }
}

.form-textarea {
  width: 100%;
  min-height: 160rpx;
  padding: 20rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  font-size: 28rpx;
  color: $text-primary;
  border: 2rpx solid $border-color;
  box-sizing: border-box;
  
  &:focus {
    border-color: $primary-color;
  }
}

.product-target-select {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.product-target-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 16rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  
  &__name {
    font-size: 28rpx;
    font-weight: 400;
    color: $text-primary;
    flex: 1;
  }
  
  &__target {
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
    width: 44rpx;
    height: 44rpx;
    font-size: 22rpx;
  }
}

.quantity-input {
  width: 100rpx;
  height: 44rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 500;
  background: #fff;
  border: 1rpx solid $border-color;
  border-radius: 6rpx;
  
  &--small {
    width: 100rpx;
    height: 44rpx;
    font-size: 28rpx;
  }
}

.form-desc {
  font-size: 24rpx;
  color: $text-secondary;
  margin-bottom: 16rpx;
  display: block;
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
  
  &__target {
    margin-left: 16rpx;
    flex-shrink: 0;
  }
}

.product-target-item {
  &--in-group {
    background: rgba($primary-color, 0.05);
    border: 1rpx solid rgba($primary-color, 0.2);
  }
  
  &__left {
    display: flex;
    align-items: center;
    flex: 1;
  }
  
  &__checkbox {
    width: 32rpx;
    height: 32rpx;
    border-radius: 6rpx;
    border: 2rpx solid $border-color;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 12rpx;
    font-size: 20rpx;
    color: #fff;
    flex-shrink: 0;
    
    &--checked {
      background: $primary-color;
      border-color: $primary-color;
    }
  }
  
  &__group-label {
    font-size: 24rpx;
    color: $primary-color;
    margin-left: 12rpx;
  }
}

.group-target-section {
  margin-top: 24rpx;
  padding: 20rpx;
  background: rgba($primary-color, 0.05);
  border-radius: $border-radius;
  border: 1rpx solid rgba($primary-color, 0.2);
}

.group-target-label {
  font-size: 26rpx;
  font-weight: 500;
  color: $text-primary;
  display: block;
  margin-bottom: 12rpx;
}

.group-target-products {
  margin-bottom: 16rpx;
  padding: 12rpx;
  background: #fff;
  border-radius: $border-radius;
  font-size: 26rpx;
  color: $text-primary;
}

.group-product-tag {
  font-size: 26rpx;
  color: $primary-color;
  font-weight: 500;
}

.group-target-input {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.group-target-unit {
  font-size: 26rpx;
  color: $text-secondary;
}

.group-target-actions {
  display: flex;
  gap: 12rpx;
}

.group-target-btn {
  flex: 1;
  height: 72rpx;
  border-radius: $border-radius;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  font-weight: 500;
  
  &--cancel {
    background: $bg-grey;
    color: $text-secondary;
  }
  
  &--confirm {
    background: $primary-color;
    color: #fff;
  }
  
  &:active {
    transform: scale(0.98);
  }
}

.save-btn {
  position: fixed;
  bottom: 40rpx;
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
</style>

