<template>
  <view class="order-edit-page">
    <view v-if="loading" class="loading">加载中...</view>
    <view v-else-if="order" class="order-edit-content">
      <!-- 订单基本信息 -->
      <view class="card">
        <view class="section-title">订单信息</view>
        
        <view class="form-item">
          <text class="form-label">订单号</text>
          <text class="form-readonly">{{ order.id.slice(-8).toUpperCase() }}</text>
        </view>
        
        <view class="form-item">
          <text class="form-label">代理商 <text class="required">*</text></text>
          <TagSelect
            v-model="form.agentId"
            :options="agentOptions"
            label=""
          />
        </view>
        
        <view class="form-item">
          <text class="form-label">创建时间</text>
          <text class="form-readonly">{{ formatTime(order.createdAt) }}</text>
        </view>
      </view>
      
      <!-- 商品列表 -->
      <view class="card">
        <view class="section-title">商品明细</view>
        <view class="product-select">
          <view 
            v-for="product in store.products" 
            :key="product.id"
            class="product-select-item"
            :class="{ 'product-select-item--active': isProductSelected(product.id) }"
          >
            <view class="product-select-item__left" @tap="toggleProduct(product.id)">
              <view class="product-select-item__check">
                <text v-if="isProductSelected(product.id)">✓</text>
              </view>
              <text class="product-select-item__name">{{ product.name }}</text>
            </view>
            <view v-if="isProductSelected(product.id)" class="product-select-item__quantity" @tap.stop>
              <view class="quantity-control">
                <view class="quantity-btn quantity-btn--small" @tap="changeQuantity(product.id, -1)">-</view>
                <input 
                  type="number" 
                  :value="getItemQuantity(product.id)" 
                  class="quantity-input quantity-input--small"
                  @input="(e: any) => setQuantity(product.id, Number(e.detail?.value ?? (e.target as HTMLInputElement)?.value ?? 0))"
                />
                <view class="quantity-btn quantity-btn--small" @tap="changeQuantity(product.id, 1)">+</view>
              </view>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 订单汇总 -->
      <view class="card">
        <view class="section-title">订单汇总</view>
        
        <view class="form-item">
          <text class="form-label">总重量 (kg) <text class="required">*</text></text>
          <QuickInput
            v-model="form.totalWeight"
            type="digit"
            placeholder="请输入总重量"
          />
        </view>
        
        <view class="form-item">
          <text class="form-label">总金额 (¥) <text class="required">*</text></text>
          <QuickInput
            v-model="form.totalAmount"
            type="digit"
            prefix="¥"
            placeholder="请输入总金额"
          />
        </view>
        
        <view class="form-item">
          <text class="form-label">司机手机号</text>
          <QuickInput
            v-model="form.driverPhone"
            type="number"
            placeholder="请输入司机手机号"
          />
        </view>
      </view>
      
      <!-- 促销活动 -->
      <view class="card">
        <view class="section-title">促销活动</view>
        <TagSelect
          v-model="form.promotionIds"
          :options="promotionOptions"
          :multiple="true"
          label=""
        />
      </view>
      
      <!-- 赠品信息（只读显示） -->
      <view v-if="giftItems.length > 0" class="card">
        <view class="section-title">赠品信息</view>
        <view class="gift-list">
          <view 
            v-for="gift in giftItems" 
            :key="gift.productId"
            class="gift-item"
          >
            <image src="/static/icons/gift.svg" class="gift-icon" mode="aspectFit" />
            <text class="gift-name">{{ gift.productName }}</text>
            <text class="gift-quantity">x{{ gift.quantity }}</text>
          </view>
        </view>
      </view>
      
      <!-- 订单图片 -->
      <view class="card">
        <view class="section-title">订单图片</view>
        <ImageUploader
          v-model="form.images"
          label=""
          tip="可上传订单相关图片"
        />
      </view>
      
      <!-- 备注 -->
      <view class="card">
        <view class="section-title">备注</view>
        <textarea
          v-model="form.remark"
          class="form-textarea"
          placeholder="请输入备注信息"
          maxlength="500"
        />
      </view>
      
      <!-- 保存按钮 -->
      <view class="save-btn" @tap="saveOrder">
        <text class="save-btn__text">保存修改</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useAppStore } from '@/stores/app'
import { orderApi } from '@/api'
import TagSelect from '@/components/TagSelect/index.vue'
import QuickInput from '@/components/QuickInput/index.vue'
import ImageUploader from '@/components/ImageUploader/index.vue'
import type { Order, OrderItem, GiftItem } from '@/types'

const store = useAppStore()
const orderId = ref('')
const loading = ref(true)
const order = ref<Order | null>(null)

const form = ref({
  agentId: null as string | null,
  items: [] as OrderItem[],
  totalWeight: 0,
  totalAmount: 0,
  driverPhone: '',
  promotionIds: [] as string[],
  images: [] as string[],
  remark: ''
})

// 代理选项
const agentOptions = computed(() =>
  store.agents.map(a => ({
    label: a.name,
    value: a.id,
    subLabel: `¥${a.balance.toLocaleString()}`
  }))
)

// 促销活动选项
const promotionOptions = computed(() =>
  store.promotions.filter(p => p.isActive).map(p => ({
    label: p.name,
    value: p.id,
    subLabel: p.description
  }))
)

// 赠品列表（只读显示）
const giftItems = computed(() => {
  if (!order.value?.giftItems) return []
  return order.value.giftItems
})

// 产品选择相关
const products = computed(() => store.products)

const isProductSelected = (productId: string) => {
  return form.value.items.some(item => item.productId === productId)
}

const toggleProduct = (productId: string) => {
  uni.vibrateShort({ type: 'light' })
  
  if (isProductSelected(productId)) {
    // 取消选择
    form.value.items = form.value.items.filter(item => item.productId !== productId)
  } else {
    // 添加选择
    const product = products.value.find(p => p.id === productId)
    if (product) {
      form.value.items.push({
        productId: product.id,
        productName: product.name,
        quantity: 10,
        price: product.price,
        weight: product.weight
      })
    }
  }
}

const getItemQuantity = (productId: string) => {
  const item = form.value.items.find(i => i.productId === productId)
  return item?.quantity || 0
}

const changeQuantity = (productId: string, delta: number) => {
  const item = form.value.items.find(i => i.productId === productId)
  if (item) {
    const step = delta > 0 ? 10 : 1
    item.quantity = Math.max(1, item.quantity + (delta * step))
    // 更新价格和重量
    const product = products.value.find(p => p.id === productId)
    if (product) {
      item.price = product.price
      item.weight = product.weight
    }
  }
}

const setQuantity = (productId: string, value: number) => {
  const item = form.value.items.find(i => i.productId === productId)
  if (item) {
    item.quantity = Math.max(1, value || 1)
    // 更新价格和重量
    const product = products.value.find(p => p.id === productId)
    if (product) {
      item.price = product.price
      item.weight = product.weight
    }
  }
}

// 格式化时间
const formatTime = (time: string | Date) => {
  const d = new Date(time)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${min}`
}

// 加载订单数据
const loadOrder = async () => {
  try {
    loading.value = true
    const orderData = await orderApi.getById(orderId.value)
    order.value = orderData
    
    // 填充表单
    form.value = {
      agentId: orderData.agentId,
      items: orderData.items.map(item => ({ ...item })),
      totalWeight: orderData.totalWeight,
      totalAmount: orderData.totalAmount,
      driverPhone: orderData.driverPhone || '',
      promotionIds: Array.isArray(orderData.promotionId) 
        ? orderData.promotionId 
        : (orderData.promotionId ? [orderData.promotionId] : []),
      images: orderData.images || [],
      remark: orderData.remark || ''
    }
  } catch (error) {
    uni.showToast({ title: '加载订单失败', icon: 'none' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } finally {
    loading.value = false
  }
}

// 保存订单
const saveOrder = async () => {
  if (!form.value.agentId) {
    uni.showToast({ title: '请选择代理商', icon: 'none' })
    return
  }
  if (form.value.items.length === 0) {
    uni.showToast({ title: '请至少选择一个商品', icon: 'none' })
    return
  }
  if (!form.value.totalWeight || form.value.totalWeight <= 0) {
    uni.showToast({ title: '请输入有效的总重量', icon: 'none' })
    return
  }
  if (!form.value.totalAmount || form.value.totalAmount <= 0) {
    uni.showToast({ title: '请输入有效的总金额', icon: 'none' })
    return
  }
  
  if (!store.currentAdmin || store.currentAdmin.role !== 'super_admin') {
    uni.showToast({ title: '需要超级管理员权限', icon: 'none' })
    return
  }
  
  try {
    uni.showLoading({ title: '保存中...' })
    
    // 处理促销ID（支持多个）
    const promotionId = form.value.promotionIds.length > 0 
      ? (form.value.promotionIds.length === 1 ? form.value.promotionIds[0] : JSON.stringify(form.value.promotionIds))
      : undefined
    
    // 赠品信息保持原样（从原订单中获取）
    const giftItems = order.value?.giftItems || []
    
    await orderApi.update(
      orderId.value,
      {
        agentId: form.value.agentId,
        items: form.value.items,
        totalWeight: form.value.totalWeight,
        totalAmount: form.value.totalAmount,
        driverPhone: form.value.driverPhone || undefined,
        promotionId: promotionId,
        giftItems: giftItems.length > 0 ? giftItems : undefined,
        images: form.value.images,
        remark: form.value.remark || undefined
      },
      store.currentAdmin.id,
      store.currentAdmin.role
    )
    
    uni.hideLoading()
    uni.showToast({ title: '修改成功', icon: 'success' })
    
    // 刷新数据
    await store.loadOrders()
    await store.loadAgents() // 刷新代理商余额
    
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (error: any) {
    uni.hideLoading()
    uni.showToast({ title: error.message || '修改失败', icon: 'none' })
  }
}

onLoad(async (options) => {
  if (options?.id) {
    orderId.value = options.id
    uni.setNavigationBarTitle({
      title: '修改订单'
    })
    
    // 确保数据已加载
    if (store.products.length === 0) {
      await store.loadProducts()
    }
    if (store.agents.length === 0) {
      await store.loadAgents()
    }
    if (store.promotions.length === 0) {
      await store.loadPromotions()
    }
    
    await loadOrder()
  } else {
    uni.showToast({ title: '订单ID不存在', icon: 'none' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  }
})
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.order-edit-page {
  padding: 24rpx;
  padding-bottom: 160rpx;
  min-height: 100vh;
  background: $bg-grey;
}

.loading {
  padding: 100rpx 0;
  text-align: center;
  font-size: 28rpx;
  color: $text-secondary;
}

.order-edit-content {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.card {
  background: #fff;
  border-radius: $border-radius-lg;
  padding: 32rpx;
  box-shadow: $shadow-sm;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 24rpx;
  padding-left: 12rpx;
  border-left: 4rpx solid $primary-color;
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
  margin-bottom: 16rpx;
  display: block;
}

.form-readonly {
  font-size: 28rpx;
  color: $text-secondary;
  padding: 24rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  display: block;
}

.required {
  color: $danger-color;
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

// 产品选择样式
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

// 赠品列表
.gift-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.gift-item {
  display: flex;
  align-items: center;
  padding: 16rpx;
  background: rgba($success-color, 0.1);
  border-radius: $border-radius;
}

.gift-icon {
  width: 32rpx;
  height: 32rpx;
  margin-right: 12rpx;
}

.gift-name {
  flex: 1;
  font-size: 28rpx;
  color: $text-primary;
}

.gift-quantity {
  font-size: 28rpx;
  color: $text-secondary;
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
    font-size: 34rpx;
    font-weight: 600;
    color: #fff;
  }
}
</style>

