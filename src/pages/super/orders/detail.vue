<template>
  <view class="order-detail">
    <view v-if="loading" class="loading">加载中...</view>
    <view v-else-if="order" class="order-content">
      <!-- 订单头部信息 -->
      <view class="card">
        <view class="order-header">
          <view class="order-header__info">
            <text class="order-id">订单号：{{ order.id.slice(-8).toUpperCase() }}</text>
          </view>
          <view class="order-header__meta">
            <text class="order-agent">代理商：{{ order.agentName }}</text>
            <text class="order-time">创建时间：{{ formatTime(order.createdAt) }}</text>
          </view>
        </view>
      </view>

      <!-- 商品列表 -->
      <view class="card">
        <view class="section-title">商品明细</view>
        <view class="product-list">
          <view 
            v-for="item in displayItems" 
            :key="item.key"
            class="product-item"
          >
            <text class="product-name">{{ item.name }}</text>
            <text class="product-quantity">x{{ item.quantity }}</text>
            <text class="product-price">¥{{ item.totalPrice.toLocaleString() }}</text>
          </view>
        </view>
      </view>

      <!-- 赠品信息 -->
      <view v-if="order.giftItems && order.giftItems.length > 0" class="card">
        <view class="section-title">搭赠情况</view>
        <view v-if="order.promotionNames && order.promotionNames.length > 0" class="promotion-info">
          <text class="promotion-label">参与活动：</text>
          <text v-for="(name, idx) in order.promotionNames" :key="idx" class="promotion-name">
            {{ name }}<text v-if="idx < order.promotionNames.length - 1">、</text>
          </text>
        </view>
        
        <!-- 组合赠品 -->
        <view v-if="order.groupGiftInfo" class="group-gift-section">
          <view class="group-gift-header">
            <text class="group-gift-name">{{ order.groupGiftInfo.groupName }}</text>
            <view class="group-gift-summary">
              <text class="summary-text">要求：{{ order.groupGiftInfo.totalRequirement }}箱</text>
              <text class="summary-text">已送达：{{ order.groupGiftInfo.deliveredTotal }}箱</text>
              <text class="summary-text summary-text--highlight">剩余：{{ order.groupGiftInfo.remainingQuantity }}箱</text>
            </view>
            <view v-if="order.groupGiftInfo.isCompleted" class="completed-badge">已完成</view>
          </view>
          
          <view class="group-products-list">
            <view 
              v-for="product in order.groupGiftInfo.products" 
              :key="product.productId"
              class="group-product-item"
            >
              <view class="group-product-info">
                <text class="group-product-name">{{ product.productName }}</text>
                <text class="group-product-delivered">已送达：{{ product.deliveredQuantity }}箱</text>
              </view>
              <view class="group-product-actions">
                <view 
                  class="deliver-btn"
                  :class="{ 'deliver-btn--disabled': order.groupGiftInfo.isCompleted }"
                  @tap="showDeliverModal(product)"
                >
                  送达
                </view>
              </view>
            </view>
          </view>
        </view>
        
        <!-- 单个产品赠品 -->
        <view v-else-if="giftStatusList.length > 0" class="gift-list">
          <view 
            v-for="giftStatus in giftStatusList" 
            :key="giftStatus.productId"
            class="gift-item"
          >
            <view class="gift-item__header">
              <image src="/static/icons/gift.svg" class="gift-icon" mode="aspectFit" />
              <text class="gift-name">{{ order.groupGiftInfo ? order.groupGiftInfo.groupName : giftStatus.productName }}</text>
              <text v-if="giftStatus.deliveredQuantity < giftStatus.totalQuantity" class="gift-total">总计：{{ giftStatus.totalQuantity }}</text>
              <view v-if="giftStatus.deliveredQuantity >= giftStatus.totalQuantity" class="completed-badge">已完成</view>
            </view>
            <view class="gift-item__stats">
              <view class="gift-stat gift-stat--delivered">
                <text class="gift-stat__label">已送达</text>
                <view class="gift-stat__value">
                  <!-- 如果全部送达，显示只读状态 -->
                  <view v-if="giftStatus.deliveredQuantity >= giftStatus.totalQuantity" class="gift-stat__value--readonly">
                    <text class="gift-stat__number">{{ giftStatus.deliveredQuantity }}</text>
                    <text class="gift-stat__unit">箱</text>
                  </view>
                  <!-- 如果未全部送达，显示输入框 -->
                  <view v-else class="gift-stat__control">
                    <view class="quantity-control">
                      <view 
                        class="quantity-btn" 
                        :class="{ 'quantity-btn--disabled': getPendingDeliveredQuantity(giftStatus) <= 0 }"
                        @tap="changeGiftDeliveredQuantity(giftStatus, -1)"
                      >-</view>
                      <input 
                        type="number" 
                        :value="getPendingDeliveredQuantity(giftStatus)" 
                        :max="getMaxInputValue(giftStatus)"
                        class="quantity-input"
                        @input="(e: any) => setGiftDeliveredQuantity(giftStatus, Number(e.detail?.value ?? (e.target as HTMLInputElement)?.value ?? 0))"
                      />
                      <view 
                        class="quantity-btn" 
                        :class="{ 'quantity-btn--disabled': getOriginalUndeliveredQuantity(giftStatus) <= 0 || getPendingDeliveredQuantity(giftStatus) >= getMaxInputValue(giftStatus) }"
                        @tap="changeGiftDeliveredQuantity(giftStatus, 1)"
                      >+</view>
                    </view>
                    <view 
                      class="deliver-btn"
                      :class="{ 'deliver-btn--disabled': getOriginalUndeliveredQuantity(giftStatus) <= 0 || getPendingDeliveredQuantity(giftStatus) <= 0 }"
                      @tap.stop="saveSingleGift(giftStatus)"
                    >
                      送达
                    </view>
                  </view>
                </view>
              </view>
              <view class="gift-stat gift-stat--undelivered">
                <text class="gift-stat__label">未送达</text>
                <view class="gift-stat__value gift-stat__value--readonly">
                  <text class="gift-stat__number gift-stat__number--highlight">{{ giftStatus.undeliveredQuantity }}</text>
                  <text class="gift-stat__unit">箱</text>
                </view>
              </view>
            </view>
          </view>
        </view>
        <!-- 全部已送达按钮：只在有未送达的赠品时显示 -->
        <view v-if="giftStatusList.length > 0 && !order.groupGiftInfo && hasUndeliveredGifts" class="gifts-actions">
          <view class="gifts-action-btn" @tap="setAllDelivered">全部已送达</view>
        </view>
      </view>
      
      <!-- 送达记录历史 -->
      <view v-if="order.giftItems && order.giftItems.length > 0 && deliveryRecords.length > 0" class="card">
        <view class="section-title">送达记录</view>
        <view class="delivery-records-list">
          <view 
            v-for="record in deliveryRecords" 
            :key="record.id"
            class="delivery-record-item"
          >
            <view class="delivery-record-header">
              <view class="delivery-record-info">
                <text class="delivery-record-name">
                  {{ record.groupName || record.productName || '赠品' }}
                </text>
                <text class="delivery-record-quantity">+{{ record.quantity }}箱</text>
              </view>
              <text class="delivery-record-time">{{ formatTime(record.createdAt) }}</text>
            </view>
            <view v-if="record.deliveredByName" class="delivery-record-operator">
              <text class="delivery-record-operator-label">操作人：</text>
              <text class="delivery-record-operator-name">{{ record.deliveredByName }}</text>
            </view>
            <view v-if="record.remark" class="delivery-record-remark">
              <text class="delivery-record-remark-label">备注：</text>
              <text class="delivery-record-remark-text">{{ record.remark }}</text>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 送达数量输入弹窗 -->
      <view v-if="showDeliverInputModal" class="modal-mask" @tap="showDeliverInputModal = false">
        <view class="modal-content" @tap.stop>
          <text class="modal-title">送达数量</text>
          <view class="modal-form">
            <text class="modal-label">产品：{{ deliveringProduct?.productName }}</text>
            <text class="modal-label">组合剩余：{{ order?.groupGiftInfo?.remainingQuantity || 0 }}箱</text>
            <text class="modal-label modal-label--hint">最多可送达：{{ maxDeliverQuantity }}箱</text>
            <input 
              type="number" 
              v-model="deliverQuantity"
              class="quantity-input-full"
              placeholder="请输入送达数量"
              :max="maxDeliverQuantity"
            />
          </view>
          <view class="modal-actions">
            <view class="modal-btn modal-btn--cancel" @tap="showDeliverInputModal = false">取消</view>
            <view class="modal-btn modal-btn--confirm" @tap="confirmDeliver">确定</view>
          </view>
        </view>
      </view>

      <!-- 订单汇总 -->
      <view class="card">
        <view class="section-title">订单汇总</view>
        <view class="summary-list">
          <view class="summary-item">
            <text class="summary-label">总重量</text>
            <text class="summary-value">{{ order.totalWeight.toFixed(1) }}kg</text>
          </view>
          <view class="summary-item">
            <text class="summary-label">总金额</text>
            <text class="summary-value summary-value--highlight">¥{{ order.totalAmount.toLocaleString() }}</text>
          </view>
          <view class="summary-item">
            <text class="summary-label">司机手机号</text>
            <text class="summary-value">{{ order.driverPhone || '未填写' }}</text>
          </view>
          <view v-if="order.remark" class="summary-item">
            <text class="summary-label">备注</text>
            <text class="summary-value">{{ order.remark }}</text>
          </view>
        </view>
      </view>

      <!-- 订单图片 -->
      <view v-if="order.images && order.images.length > 0" class="card">
        <view class="section-title">订单图片</view>
        <view class="image-list">
          <image 
            v-for="(img, index) in order.images" 
            :key="index"
            :src="img" 
            class="order-image"
            mode="aspectFill"
            @tap="previewImage(index)"
          />
        </view>
      </view>

      <!-- 分享按钮 -->
      <view class="share-btn" @tap="shareOrder">
        <image src="/static/icons/arrow-right.svg" class="share-icon" mode="aspectFit" />
        <text class="share-btn__text">分享订单</text>
      </view>
    </view>
    
    <!-- 图片预览 -->
    <ImagePreview 
      v-if="order?.images"
      :show="showImagePreview"
      :urls="order.images"
      :current="previewImageIndex"
      @close="showImagePreview = false"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { orderApi } from '@/api'
import type { Order, GiftStatus, GroupGiftInfo, GiftDeliveryRecord } from '@/types'
import ImagePreview from '@/components/ImagePreview/index.vue'

const orderId = ref('')
const order = ref<Order | null>(null)
const loading = ref(true)
const giftsForm = ref<Map<string, number>>(new Map()) // productId -> 本次要送达的数量（从0开始）
const originalGifts = ref<Map<string, { deliveredQuantity: number; undeliveredQuantity: number }>>(new Map()) // productId -> 原始值
const showDeliverInputModal = ref(false)
const deliveringProduct = ref<{ productId: string; productName: string } | null>(null)
const deliverQuantity = ref(0)
const deliveryRecords = ref<GiftDeliveryRecord[]>([])

// 处理订单商品显示：按组合分组，如果item有groupId，只显示一次组合名称和组合数量
const displayItems = computed(() => {
  if (!order.value || !order.value.items) return []
  
  const items = order.value.items
  const displayMap = new Map<string, { key: string; name: string; quantity: number; totalPrice: number }>()
  
  items.forEach(item => {
    if (item.groupId && item.groupName && item.groupQuantity) {
      // 组合商品：按groupId分组，只显示一次组合名称和组合数量
      const key = `group-${item.groupId}`
      if (!displayMap.has(key)) {
        // 计算组合的总价格（组合中所有商品的价格总和）
        const groupItems = items.filter(i => i.groupId === item.groupId)
        const totalPrice = groupItems.reduce((sum, i) => sum + i.quantity * i.price, 0)
        displayMap.set(key, {
          key,
          name: item.groupName,
          quantity: item.groupQuantity,
          totalPrice
        })
      }
    } else {
      // 单个商品：正常显示
      const key = `product-${item.productId}`
      displayMap.set(key, {
        key,
        name: item.productName,
        quantity: item.quantity,
        totalPrice: item.quantity * item.price
      })
    }
  })
  
  return Array.from(displayMap.values())
})

onLoad((options) => {
  if (options?.id) {
    orderId.value = options.id
    loadOrder()
  }
})

const loadOrder = async () => {
  try {
    loading.value = true
    order.value = await orderApi.getById(orderId.value)
    // 更新搭赠状态列表
    updateGiftStatusList()
    // 初始化表单数据和原始值
    if (giftStatusList.value.length > 0) {
      giftsForm.value = new Map()
      originalGifts.value = new Map()
      giftStatusList.value.forEach(gift => {
        // giftsForm 存储本次要送达的数量，初始化为0
        giftsForm.value.set(gift.productId, 0)
        originalGifts.value.set(gift.productId, {
          deliveredQuantity: gift.deliveredQuantity,
          undeliveredQuantity: gift.undeliveredQuantity
        })
      })
    }
    // 加载送达记录
    await loadDeliveryRecords()
  } catch (error) {
    uni.showToast({ title: '加载订单失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const loadDeliveryRecords = async () => {
  try {
    if (order.value?.giftItems && order.value.giftItems.length > 0) {
      deliveryRecords.value = await orderApi.getGiftDeliveryRecords(orderId.value)
    }
  } catch (error) {
    // 静默处理错误
  }
}

// 搭赠状态列表（使用 ref 以便可以修改）
const giftStatusList = ref<GiftStatus[]>([])

// 更新搭赠状态列表
const updateGiftStatusList = () => {
  if (!order.value?.giftStatusList) {
    // 如果没有送达状态数据，从 giftItems 生成
    if (order.value?.giftItems) {
      giftStatusList.value = order.value.giftItems.map(gift => {
        const deliveredQuantity = gift.deliveredQuantity || 0
        const totalQuantity = gift.quantity || 0
        return {
          productId: gift.productId || gift.groupId || '',
          productName: gift.productName || gift.groupName || '赠品',
          totalQuantity: totalQuantity,
          deliveredQuantity: deliveredQuantity,
          undeliveredQuantity: totalQuantity - deliveredQuantity
        }
      })
    } else {
      giftStatusList.value = []
    }
  } else {
    giftStatusList.value = [...order.value.giftStatusList]
  }
}

// 检查是否有未送达的赠品
const hasUndeliveredGifts = computed(() => {
  return giftStatusList.value.some(gift => gift.undeliveredQuantity > 0)
})

// 修改本次要送达的数量（只更新本地状态，不保存）
const changeGiftDeliveredQuantity = (gift: GiftStatus, delta: number) => {
  const current = giftsForm.value.get(gift.productId) ?? 0 // 本次要送达的数量，从0开始
  // 使用原始值作为基准
  const original = originalGifts.value.get(gift.productId)
  if (!original) return
  
  const originalUndelivered = original.undeliveredQuantity // 原始未送达数量（剩余可送达数量）
  
  // 限制：不能小于0，不能超过剩余未送达数量
  let newValue: number
  if (delta > 0) {
    // 增加：不能超过剩余未送达数量
    newValue = Math.min(originalUndelivered, current + delta)
  } else {
    // 减少：不能小于0
    newValue = Math.max(0, current + delta)
  }
  
  giftsForm.value.set(gift.productId, newValue)
}

// 设置本次要送达的数量（只更新本地状态，不保存）
const setGiftDeliveredQuantity = (gift: GiftStatus, value: number) => {
  const inputValue = value || 0
  // 使用原始值作为基准
  const original = originalGifts.value.get(gift.productId)
  if (!original) return
  
  const originalUndelivered = original.undeliveredQuantity // 原始未送达数量（剩余可送达数量）
  
  // 限制：不能小于0，不能超过剩余未送达数量
  const newValue = Math.max(0, Math.min(originalUndelivered, inputValue))
  
  giftsForm.value.set(gift.productId, newValue)
}

// 获取本次要送达的数量（输入框显示的值，从0开始）
const getPendingDeliveredQuantity = (gift: GiftStatus): number => {
  return giftsForm.value.get(gift.productId) ?? 0
}

// 获取原始已送达数量（从服务器获取的最新值，页面加载时保存）
const getOriginalDeliveredQuantity = (gift: GiftStatus): number => {
  return originalGifts.value.get(gift.productId)?.deliveredQuantity ?? gift.deliveredQuantity
}

// 获取原始未送达数量（从服务器获取的最新值，页面加载时保存）
const getOriginalUndeliveredQuantity = (gift: GiftStatus): number => {
  return originalGifts.value.get(gift.productId)?.undeliveredQuantity ?? gift.undeliveredQuantity
}

// 获取最大可输入值（剩余未送达数量）
const getMaxInputValue = (gift: GiftStatus): number => {
  // 使用原始值，这是从服务器获取的最新状态（页面加载时保存）
  const original = originalGifts.value.get(gift.productId)
  if (!original) return gift.undeliveredQuantity
  return original.undeliveredQuantity // 最大可输入值为剩余未送达数量
}

// 保存单个赠品的送达情况
const saveSingleGift = async (gift: GiftStatus) => {
  if (!order.value) {
    return
  }
  
  const pendingQuantity = getPendingDeliveredQuantity(gift)
  // 使用原始值作为基准
  const original = originalGifts.value.get(gift.productId)
  if (!original) {
    uni.showToast({ title: '数据错误，请刷新页面重试', icon: 'none' })
    return
  }
  
  const originalDelivered = original.deliveredQuantity // 原始已送达数量
  const originalUndelivered = original.undeliveredQuantity // 原始未送达数量
  
  // 如果本次送达数量为0，不保存
  if (pendingQuantity <= 0) {
    uni.showToast({ title: '请输入送达数量', icon: 'none' })
    return
  }
  
  // 检查是否超过剩余未送达数量
  if (pendingQuantity > originalUndelivered) {
    uni.showToast({ title: `送达数量不能超过剩余未送达数量（最多${originalUndelivered}箱）`, icon: 'none' })
    return
  }
  
  // 计算新的已送达总数（原始已送达 + 本次送达）
  const newDeliveredQuantity = originalDelivered + pendingQuantity
  
  // 显示加载提示
  uni.showLoading({ title: '保存中...', mask: true })
  
  try {
    const gifts = [{
      productId: gift.productId,
      productName: gift.productName,
      deliveredQuantity: newDeliveredQuantity // 发送新的已送达总数（原始已送达 + 本次送达）
    }]
    
    await orderApi.updateGifts(order.value.id, gifts)
    
    uni.hideLoading()
    uni.showToast({ title: '保存成功', icon: 'success' })
    
    // 重置本次送达数量为0
    giftsForm.value.set(gift.productId, 0)
    
    await loadOrder() // 重新加载，获取最新状态
  } catch (error: any) {
    uni.hideLoading()
    uni.showToast({ title: error.message || '保存失败', icon: 'none', duration: 2000 })
  }
}

// 全部已送达（立即保存）
const setAllDelivered = async () => {
  if (!order.value) return
  
  // 为每个赠品设置本次送达数量为剩余未送达数量
  const gifts = giftStatusList.value.map(gift => {
    const original = originalGifts.value.get(gift.productId)
    if (!original) return null
    
    const originalUndelivered = original.undeliveredQuantity // 剩余未送达数量
    // 计算新的已送达总数（原始已送达 + 剩余未送达）
    const newDeliveredQuantity = original.deliveredQuantity + originalUndelivered
    
    return {
      productId: gift.productId,
      productName: gift.productName,
      deliveredQuantity: newDeliveredQuantity
    }
  }).filter(g => g !== null) as Array<{ productId: string; productName: string; deliveredQuantity: number }>
  
  if (gifts.length === 0) return
  
  uni.showLoading({ title: '保存中...', mask: true })
  
  try {
    await orderApi.updateGifts(order.value.id, gifts)
    uni.hideLoading()
    uni.showToast({ title: '全部已送达', icon: 'success' })
    await loadOrder() // 重新加载，获取最新状态
  } catch (error: any) {
    uni.hideLoading()
    uni.showToast({ title: error.message || '保存失败', icon: 'none' })
  }
}

// 保存搭赠情况（批量保存，已废弃，现在使用 saveSingleGift）
const saveGifts = async () => {
  if (!order.value) return
  
  try {
    const gifts = giftStatusList.value.map(gift => {
      const original = originalGifts.value.get(gift.productId)
      if (!original) return null
      
      const pendingQuantity = giftsForm.value.get(gift.productId) ?? 0 // 本次要送达的数量
      // 计算新的已送达总数（原始已送达 + 本次送达）
      const newDeliveredQuantity = original.deliveredQuantity + pendingQuantity
      
      return {
        productId: gift.productId,
        productName: gift.productName,
        deliveredQuantity: newDeliveredQuantity
      }
    }).filter(g => g !== null) as Array<{ productId: string; productName: string; deliveredQuantity: number }>
    
    await orderApi.updateGifts(order.value.id, gifts)
    
    uni.showToast({ title: '保存成功', icon: 'success' })
    await loadOrder() // 重新加载
  } catch (error: any) {
    uni.showToast({ title: error.message || '保存失败', icon: 'none' })
  }
}

// 显示送达弹窗
const showDeliverModal = (product: { productId: string; productName: string; quantity: number; deliveredQuantity: number }) => {
  if (!order.value?.groupGiftInfo || order.value.groupGiftInfo.isCompleted) return
  
  deliveringProduct.value = product
  const remaining = order.value.groupGiftInfo.remainingQuantity
  
  // 如果组合剩余数量为0，不显示弹窗
  if (remaining <= 0) {
    return
  }
  
  // 组合赠品中，各个产品的数量是随机的，所以直接显示输入框
  // 默认填入组合剩余数量（用户可以根据实际情况修改）
  deliverQuantity.value = remaining
  showDeliverInputModal.value = true
}

// 计算该产品的剩余需要数量（仅用于显示，不作为限制）
const remainingForProduct = computed(() => {
  if (!order.value?.groupGiftInfo || !deliveringProduct.value) return 0
  const product = order.value.groupGiftInfo.products.find(p => p.productId === deliveringProduct.value!.productId)
  if (!product) return 0
  return product.quantity - product.deliveredQuantity
})

// 计算最大可送达数量（只限制为组合剩余数量，因为组合中产品数量是随机的）
const maxDeliverQuantity = computed(() => {
  if (!order.value?.groupGiftInfo || !deliveringProduct.value) return 0
  // 组合赠品中，各个产品的数量是随机的，所以只限制为组合的剩余数量
  return order.value.groupGiftInfo.remainingQuantity
})

// 确认送达（直接保存到数据库）
const confirmDeliver = async () => {
  if (!order.value?.groupGiftInfo || !deliveringProduct.value) return
  
  const quantity = Number(deliverQuantity.value) || 0
  if (quantity <= 0) {
    uni.showToast({ title: '请输入有效的送达数量', icon: 'none' })
    return
  }
  
  // 检查最大可送达数量
  const maxQuantity = maxDeliverQuantity.value
  if (quantity > maxQuantity) {
    uni.showToast({ title: `送达数量不能超过最大可送达数量（${maxQuantity}箱）`, icon: 'none' })
    return
  }
  
  // 更新本地数据
  const product = order.value.groupGiftInfo.products.find(p => p.productId === deliveringProduct.value!.productId)
  if (!product) return
  
  const oldDeliveredQuantity = product.deliveredQuantity
  product.deliveredQuantity += quantity
  order.value.groupGiftInfo.deliveredTotal += quantity
  order.value.groupGiftInfo.remainingQuantity = Math.max(0, order.value.groupGiftInfo.remainingQuantity - quantity)
  order.value.groupGiftInfo.isCompleted = order.value.groupGiftInfo.remainingQuantity === 0
  
  showDeliverInputModal.value = false
  const currentProduct = deliveringProduct.value
  deliveringProduct.value = null
  deliverQuantity.value = 0
  
  // 立即保存到数据库
  try {
    const gifts = order.value.groupGiftInfo.products.map(p => ({
      productId: p.productId,
      productName: p.productName,
      deliveredQuantity: p.deliveredQuantity
    }))
    
    await orderApi.updateGifts(order.value.id, gifts)
    uni.showToast({ title: '保存成功', icon: 'success' })
    
    // 重新加载订单数据，确保数据同步
    await loadOrder()
  } catch (error: any) {
    // 保存失败，回滚本地数据
    product.deliveredQuantity = oldDeliveredQuantity
    order.value.groupGiftInfo.deliveredTotal -= quantity
    order.value.groupGiftInfo.remainingQuantity += quantity
    order.value.groupGiftInfo.isCompleted = order.value.groupGiftInfo.remainingQuantity === 0
    
    uni.showToast({ title: error.message || '保存失败', icon: 'none' })
  }
}

// 保存组合赠品
const saveGroupGifts = async () => {
  if (!order.value?.groupGiftInfo) return
  
  try {
    const gifts = order.value.groupGiftInfo.products.map(product => ({
      productId: product.productId,
      productName: product.productName,
      deliveredQuantity: product.deliveredQuantity
    }))
    
    await orderApi.updateGifts(order.value.id, gifts)
    
    uni.showToast({ title: '保存成功', icon: 'success' })
    await loadOrder() // 重新加载
  } catch (error: any) {
    uni.showToast({ title: error.message || '保存失败', icon: 'none' })
  }
}

const formatTime = (time: string | Date) => {
  const d = new Date(time)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${min}`
}

const showImagePreview = ref(false)
const previewImageIndex = ref(0)

const previewImage = (index: number) => {
  if (!order.value?.images) return
  previewImageIndex.value = index
  showImagePreview.value = true
}

const shareOrder = () => {
  if (!order.value) return
  
  const shareUrl = `https://nomur.linkmate.site/#/pages/super/orders/detail?id=${order.value.id}`
  
  // #ifdef H5
  // H5端：复制链接到剪贴板
  if (navigator.clipboard) {
    navigator.clipboard.writeText(shareUrl).then(() => {
      uni.showToast({ title: '链接已复制', icon: 'success' })
    }).catch(() => {
      // 降级方案：使用输入框选择
      copyTextFallback(shareUrl)
    })
  } else {
    copyTextFallback(shareUrl)
  }
  // #endif
  
  // #ifdef MP-WEIXIN
  // 微信小程序：使用分享功能
  uni.showShareMenu({
    withShareTicket: true,
    menus: ['shareAppMessage', 'shareTimeline']
  })
  // #endif
}

const copyTextFallback = (text: string) => {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  try {
    document.execCommand('copy')
    uni.showToast({ title: '链接已复制', icon: 'success' })
  } catch (err) {
    uni.showToast({ title: '复制失败', icon: 'none' })
  }
  document.body.removeChild(textarea)
}
</script>

<style lang="scss" scoped>
.order-detail {
  min-height: 100vh;
  background: $bg-grey;
  padding: 24rpx;
  padding-bottom: 200rpx;
}

.loading {
  text-align: center;
  padding: 100rpx 0;
  color: $text-secondary;
}

.order-content {
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
  display: block;
}

.order-header {
  &__info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }
}

.order-id {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-primary;
}

.order-agent,
.order-time {
  font-size: 26rpx;
  color: $text-secondary;
}

.product-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.product-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid $border-color;
  
  &:last-child {
    border-bottom: none;
  }
}

.product-name {
  flex: 1;
  font-size: 28rpx;
  color: $text-primary;
}

.product-quantity {
  font-size: 28rpx;
  color: $text-secondary;
  margin: 0 24rpx;
}

.product-price {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-primary;
}

.promotion-info {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4rpx;
  margin-bottom: 16rpx;
  padding: 12rpx 16rpx;
  background: rgba($primary-color, 0.08);
  border-radius: 8rpx;
  font-size: 26rpx;
}

.promotion-label {
  font-weight: 500;
  color: $text-secondary;
}

.promotion-name {
  color: $primary-color;
  font-weight: 500;
}

.gift-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-top: 16rpx;
}

.gift-item {
  padding: 28rpx;
  background: #fff;
  border: 1rpx solid $border-color;
  border-radius: $border-radius-lg;
  position: relative;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  
  &__header {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 24rpx;
    position: relative;
    padding-bottom: 20rpx;
    border-bottom: 1rpx solid rgba($border-color, 0.5);
  }
  
  &__stats {
    display: flex;
    gap: 32rpx;
  }
}

.gift-icon {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
}

.gift-name {
  flex: 1;
  font-size: 30rpx;
  font-weight: 600;
  color: $text-primary;
}

.gift-total {
  font-size: 26rpx;
  color: $text-secondary;
  background: rgba($primary-color, 0.08);
  padding: 6rpx 12rpx;
  border-radius: 12rpx;
  font-weight: 500;
}

.gift-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  
  &--delivered {
    flex: 1.2;
  }
  
  &--undelivered {
    flex: 1;
  }
  
  &__label {
    font-size: 26rpx;
    color: $text-secondary;
    font-weight: 500;
  }
  
  &__value {
    display: flex;
    align-items: center;
    min-height: 80rpx;
    
    &--readonly {
      display: flex;
      align-items: baseline;
      gap: 4rpx;
    }
  }
  
  &__control {
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    width: 100%;
  }
  
  &__number {
    font-size: 36rpx;
    font-weight: 700;
    color: $primary-color;
    
    &--highlight {
      color: $primary-color;
    }
  }
  
  &__unit {
    font-size: 24rpx;
    color: $text-secondary;
    margin-left: 4rpx;
  }
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: $bg-grey;
  padding: 8rpx;
  border-radius: 12rpx;
  width: fit-content;
}

.quantity-btn {
  width: 56rpx;
  height: 56rpx;
  background: #fff;
  border: 1rpx solid $border-color;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
  color: $text-primary;
  transition: all 0.2s;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.05);
  
  &:active:not(&--disabled) {
    background: $bg-grey;
    transform: scale(0.95);
  }
  
  &--disabled {
    background: $bg-grey;
    color: $text-disabled;
    border-color: $border-color;
    opacity: 0.4;
    pointer-events: none;
    box-shadow: none;
  }
}

.quantity-input {
  width: 120rpx;
  height: 56rpx;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  background: #fff;
  border: 1rpx solid $border-color;
  border-radius: 8rpx;
  color: $text-primary;
  box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.05);
  
  &:focus {
    border-color: $primary-color;
    box-shadow: 0 0 0 2rpx rgba($primary-color, 0.1);
  }
}

.deliver-btn {
  padding: 16rpx 32rpx;
  background: $primary-color;
  color: #fff;
  border-radius: 8rpx;
  font-size: 28rpx;
  font-weight: 600;
  text-align: center;
  transition: all 0.2s;
  box-shadow: 0 4rpx 12rpx rgba($primary-color, 0.3);
  width: 100%;
  
  &:active:not(&--disabled) {
    background: darken($primary-color, 10%);
    transform: translateY(1rpx);
    box-shadow: 0 2rpx 8rpx rgba($primary-color, 0.3);
  }
  
  &--disabled {
    background: $text-disabled;
    color: $text-secondary;
    opacity: 0.5;
    pointer-events: none;
    box-shadow: none;
  }
}

.gifts-actions {
  margin-top: 24rpx;
  margin-bottom: 16rpx;
}

.gifts-action-btn {
  width: 100%;
  padding: 24rpx;
  background: $success-color;
  color: #fff;
  text-align: center;
  border-radius: $border-radius;
  font-size: 28rpx;
  font-weight: 500;
  box-sizing: border-box;
  
  &:active {
    background: darken($success-color, 10%);
  }
}

.gifts-save-actions {
  margin-top: 16rpx;
}

.gifts-save-btn {
  width: 100%;
  padding: 24rpx;
  background: $primary-color;
  color: #fff;
  text-align: center;
  border-radius: $border-radius;
  font-size: 32rpx;
  font-weight: 600;
  box-sizing: border-box;
  
  &:active {
    background: darken($primary-color, 10%);
  }
}

// 组合赠品样式
.group-gift-section {
  margin-top: 16rpx;
}

.group-gift-header {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  padding: 20rpx;
  background: rgba($primary-color, 0.08);
  border-radius: $border-radius;
  margin-bottom: 16rpx;
  position: relative;
}

.group-gift-name {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-primary;
}

.group-gift-summary {
  display: flex;
  gap: 24rpx;
  flex-wrap: wrap;
}

.summary-text {
  font-size: 26rpx;
  color: $text-secondary;
  
  &--highlight {
    color: $primary-color;
    font-weight: 600;
  }
}

.completed-badge {
  position: absolute;
  top: 0;
  right: 0;
  padding: 8rpx 32rpx;
  min-width: 120rpx;
  text-align: center;
  background: linear-gradient(135deg, $success-color 0%, darken($success-color, 5%) 100%);
  color: #fff;
  border-radius: 0 $border-radius-lg 0 $border-radius;
  font-size: 24rpx;
  font-weight: 600;
  box-shadow: 0 2rpx 8rpx rgba($success-color, 0.3);
  z-index: 1;
}

.group-products-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.group-product-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  background: $bg-grey;
  border-radius: $border-radius;
}

.group-product-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.group-product-name {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-primary;
}

.group-product-quantity,
.group-product-delivered {
  font-size: 24rpx;
  color: $text-secondary;
}

.group-product-actions {
  flex-shrink: 0;
}

.deliver-btn {
  padding: 16rpx 32rpx;
  background: $primary-color;
  color: #fff;
  border-radius: $border-radius;
  font-size: 28rpx;
  font-weight: 500;
  
  &:active {
    background: darken($primary-color, 10%);
  }
  
  &--disabled {
    background: $text-disabled;
    color: $text-secondary;
  }
}

.quantity-input-full {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  font-size: 32rpx;
  font-weight: 500;
  color: $text-primary;
  border: 2rpx solid $border-color;
  box-sizing: border-box;
  margin-top: 16rpx;
  
  &:focus {
    border-color: $primary-color;
    background: #fff;
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
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-bottom: 24rpx;
}

.modal-label {
  font-size: 26rpx;
  color: $text-secondary;
  
  &--hint {
    color: $primary-color;
    font-weight: 500;
    font-size: 28rpx;
  }
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

.summary-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-label {
  font-size: 28rpx;
  color: $text-secondary;
}

.summary-value {
  font-size: 28rpx;
  color: $text-primary;
  font-weight: 500;
  
  &--highlight {
    font-size: 32rpx;
    font-weight: 700;
    color: $primary-color;
  }
}

.image-list {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.order-image {
  width: 100%;
  height: 200rpx;
  border-radius: 8rpx;
}

.share-btn {
  margin: 24rpx;
  height: 100rpx;
  background: $primary-color;
  border-radius: $border-radius-lg;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 8rpx 24rpx rgba($primary-color, 0.4);
  
  &:active {
    transform: scale(0.98);
  }
}

.share-icon {
  width: 40rpx;
  height: 40rpx;
  filter: brightness(0) invert(1);
}

.share-btn__text {
  font-size: 34rpx;
  font-weight: 600;
  color: #fff;
}

// 送达记录样式
.delivery-records-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 16rpx;
}

.delivery-record-item {
  padding: 20rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  border-left: 4rpx solid $primary-color;
}

.delivery-record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.delivery-record-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
  flex: 1;
}

.delivery-record-name {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-primary;
}

.delivery-record-quantity {
  font-size: 26rpx;
  font-weight: 600;
  color: $success-color;
}

.delivery-record-time {
  font-size: 24rpx;
  color: $text-secondary;
}

.delivery-record-operator {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 8rpx;
  font-size: 24rpx;
}

.delivery-record-operator-label {
  color: $text-secondary;
}

.delivery-record-operator-name {
  color: $text-primary;
  font-weight: 500;
}

.delivery-record-remark {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  margin-top: 8rpx;
  font-size: 24rpx;
}

.delivery-record-remark-label {
  color: $text-secondary;
  flex-shrink: 0;
}

.delivery-record-remark-text {
  color: $text-primary;
  flex: 1;
  word-break: break-all;
}
</style>

