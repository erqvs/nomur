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
        <view class="section-header">
          <view class="section-title">选择商品</view>
          <view class="mode-switch">
            <view 
              class="mode-switch__item"
              :class="{ 'mode-switch__item--active': !useProductGroupMode }"
              @tap="useProductGroupMode = false"
            >
              单个
            </view>
            <view 
              class="mode-switch__item"
              :class="{ 'mode-switch__item--active': useProductGroupMode }"
              @tap="useProductGroupMode = true"
            >
              组合
            </view>
          </view>
        </view>
        
        <!-- 单个产品选择模式 -->
        <view v-if="!useProductGroupMode" class="product-select">
          <view 
            v-for="product in store.products" 
            :key="product.id"
            class="product-select-item"
            :class="{ 
              'product-select-item--active': isProductSelected(product.id),
              'product-select-item--disabled': isProductDisabled(product.id)
            }"
          >
            <view class="product-select-item__left" @tap="toggleProduct(product.id)">
              <view class="product-select-item__check">
                <text v-if="isProductSelected(product.id)">✓</text>
              </view>
              <text class="product-select-item__name">{{ product.name }}</text>
            </view>
            <view v-if="isProductSelected(product.id)" class="product-select-item__quantity" @tap.prevent.stop>
              <view class="quantity-control">
                <view class="quantity-btn quantity-btn--small" @tap="changeQuantity(product.id, -1)">-</view>
                <input 
                  type="number" 
                  :value="getItemQuantity(product.id)" 
                  class="quantity-input quantity-input--small"
                  @input="handleQuantityInput(product.id, $event)"
                  @blur="handleQuantityBlur(product.id, $event)"
                />
                <view class="quantity-btn quantity-btn--small" @tap="changeQuantity(product.id, 1)">+</view>
              </view>
            </view>
          </view>
        </view>
        
        <!-- 产品组合选择模式 -->
        <view v-else class="product-group-select">
          <text class="form-desc">选择产品组合，设置组合数量（组合数量 = 组合中所有商品数量之和）</text>
          <view v-if="productGroups.length === 0" class="empty-groups">
            <text class="empty-text">暂无产品组合，请先在"组合管理"页面创建组合</text>
          </view>
          <view v-else class="group-select">
            <view 
              v-for="group in productGroups"
              :key="group.id"
              class="group-select-item"
              :class="{ 'group-select-item--active': isGroupSelected(group.id) }"
            >
              <view class="group-select-item__left" @tap="toggleGroupSelection(group.id)">
                <view class="group-select-item__check">
                  <text v-if="isGroupSelected(group.id)">✓</text>
                </view>
                <view class="group-select-item__info">
                  <text class="group-select-item__name">{{ group.name }}</text>
                  <text class="group-select-item__products">
                    {{ getGroupProductNames(group.id).join('、') }}
                  </text>
                </view>
              </view>
              <view v-if="isGroupSelected(group.id)" class="group-select-item__quantity" @tap.prevent.stop>
                <view class="quantity-control">
                  <view class="quantity-btn quantity-btn--small" @tap="changeGroupQuantity(group.id, -1)">-</view>
                  <input 
                    type="number" 
                    :value="getGroupQuantity(group.id)" 
                    class="quantity-input quantity-input--small"
                    @input="handleGroupQuantityInput(group.id, $event)"
                    @blur="handleGroupQuantityBlur(group.id, $event)"
                  />
                  <view class="quantity-btn quantity-btn--small" @tap="changeGroupQuantity(group.id, 1)">+</view>
                </view>
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
            v-model.number="form.totalAmount"
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
      
      <!-- 赠品信息（实时计算显示） -->
      <view v-if="giftItems.length > 0" class="card">
        <view class="section-title">赠品信息</view>
        <view class="gift-list">
          <view 
            v-for="(gift, index) in giftItems" 
            :key="gift.productId || gift.groupId || index"
            class="gift-item"
          >
            <image src="/static/icons/gift.svg" class="gift-icon" mode="aspectFit" />
            <text class="gift-name">
              <template v-if="gift.isGroup && gift.groupId">
                {{ gift.groupName }}
              </template>
              <template v-else>
                {{ gift.productName }}
              </template>
            </text>
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
          tip="每次上传一张，可重复上传"
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
import { ref, computed, onMounted, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useAppStore } from '@/stores/app'
import { orderApi, productGroupApi } from '@/api'
import TagSelect from '@/components/TagSelect/index.vue'
import QuickInput from '@/components/QuickInput/index.vue'
import ImageUploader from '@/components/ImageUploader/index.vue'
import type { Order, OrderItem, GiftItem, ProductGroup } from '@/types'

const store = useAppStore()
const orderId = ref('')
const loading = ref(true)
const order = ref<Order | null>(null)

// 产品组合列表
const productGroups = ref<ProductGroup[]>([])

// 产品组合选择模式
const useProductGroupMode = ref(false)

// 暂存每个商品的数量（用于取消勾选后恢复）
const productQuantityCache = ref<Record<string, number>>({})

// 选中的组合及其数量
interface SelectedGroup {
  groupId: string
  quantity: number
}
const selectedGroups = ref<SelectedGroup[]>([])

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

// 计算后的赠品列表（实时计算）
const calculatedGiftItems = ref<Array<GiftItem | { isGroup: boolean; groupId: string; groupName: string; productIds: string[]; quantity: number }>>([])

// 赠品列表（显示用）
const giftItems = computed(() => {
  return calculatedGiftItems.value
})

// 产品选择相关
const products = computed(() => store.products)

// 检查产品是否属于已选择的组合
const isProductInSelectedGroups = (productId: string) => {
  return selectedGroups.value.some(selectedGroup => {
    const group = productGroups.value.find(g => g.id === selectedGroup.groupId)
    return group && group.productIds.includes(productId)
  })
}

// 检查单个商品是否被选中（不包含组合中的商品）
const isProductSelected = (productId: string) => {
  // 只检查单个商品选择，不检查组合
  return form.value.items.some(item => item.productId === productId)
}

// 检查产品是否被禁用（如果属于已选择的组合）
const isProductDisabled = (productId: string) => {
  return isProductInSelectedGroups(productId)
}

const toggleProduct = (productId: string) => {
  // 如果产品属于已选择的组合，阻止选择
  if (isProductInSelectedGroups(productId)) {
    uni.showToast({ 
      title: '该商品已包含在已选择的组合中，请先取消组合选择', 
      icon: 'none',
      duration: 2000
    })
    return
  }
  
  uni.vibrateShort({ type: 'light' })
  
  if (isProductSelected(productId)) {
    // 取消勾选时，保存当前数量到暂存
    const item = form.value.items.find(i => i.productId === productId)
    if (item) {
      productQuantityCache.value[productId] = item.quantity
    }
    // 取消选择
    form.value.items = form.value.items.filter(item => item.productId !== productId)
  } else {
    // 添加选择时，如果有暂存的数量，使用暂存的数量，否则使用默认值
    const cachedQuantity = productQuantityCache.value[productId]
    const product = products.value.find(p => p.id === productId)
    if (product) {
      form.value.items.push({
        productId: product.id,
        productName: product.name,
        quantity: cachedQuantity || 10,
        price: product.price,
        weight: product.weight
      })
    }
  }
  // 重新计算赠品
  calculateGifts()
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
    // 更新暂存数量
    productQuantityCache.value[productId] = item.quantity
    // 重新计算赠品
    calculateGifts()
  }
}

// 处理数量输入事件
const handleQuantityInput = (productId: string, e: any) => {
  // uni-app 中 input 事件使用 e.detail.value
  let inputValue = ''
  if (e.detail && e.detail.value !== undefined) {
    inputValue = String(e.detail.value)
  } else if (e.target && (e.target as HTMLInputElement).value !== undefined) {
    inputValue = String((e.target as HTMLInputElement).value)
  }
  
  // 只允许数字，移除所有非数字字符
  inputValue = inputValue.replace(/[^0-9]/g, '')
  
  const value = inputValue === '' ? 1 : Math.max(1, Number(inputValue) || 1)
  setQuantity(productId, value)
}

// 处理数量失焦事件（确保最终值有效）
const handleQuantityBlur = (productId: string, e: any) => {
  const item = form.value.items.find(i => i.productId === productId)
  if (item && item.quantity < 1) {
    item.quantity = 1
    productQuantityCache.value[productId] = 1
  }
}

const setQuantity = (productId: string, value: number) => {
  const item = form.value.items.find(i => i.productId === productId)
  if (item) {
    const validValue = Math.max(1, value || 1)
    item.quantity = validValue
    // 更新价格和重量
    const product = products.value.find(p => p.id === productId)
    if (product) {
      item.price = product.price
      item.weight = product.weight
    }
    // 更新暂存数量
    productQuantityCache.value[productId] = validValue
    // 重新计算赠品
    calculateGifts()
  }
}

// 产品组合选择相关方法
const isGroupSelected = (groupId: string) => {
  return selectedGroups.value.some(g => g.groupId === groupId)
}

const toggleGroupSelection = (groupId: string) => {
  uni.vibrateShort({ type: 'light' })
  const index = selectedGroups.value.findIndex(g => g.groupId === groupId)
  if (index > -1) {
    // 取消选择组合
    selectedGroups.value.splice(index, 1)
    updateItemsFromGroups()
  } else {
    // 选择组合前，先检查该组合中的产品是否已被单独选择
    const group = productGroups.value.find(g => g.id === groupId)
    if (group && group.productIds.length > 0) {
      // 找出该组合中已被单独选择的产品
      const productsToRemove: string[] = []
      group.productIds.forEach(productId => {
        if (isProductSelected(productId)) {
          productsToRemove.push(productId)
        }
      })
      
      // 如果组合中的某些产品已被单独选择，先取消这些产品的选择
      if (productsToRemove.length > 0) {
        productsToRemove.forEach(productId => {
          const item = form.value.items.find(i => i.productId === productId)
          if (item) {
            // 保存数量到暂存
            productQuantityCache.value[productId] = item.quantity
          }
        })
        // 从items中移除这些产品
        form.value.items = form.value.items.filter(item => !productsToRemove.includes(item.productId))
      }
    }
    
    // 选择组合
    selectedGroups.value.push({
      groupId,
      quantity: 10 // 默认10箱
    })
    updateItemsFromGroups()
  }
  // updateItemsFromGroups 内部已经会调用 calculateGifts()
}

const getGroupQuantity = (groupId: string) => {
  const group = selectedGroups.value.find(g => g.groupId === groupId)
  return group?.quantity || 0
}

// 处理组合数量输入事件
const handleGroupQuantityInput = (groupId: string, e: any) => {
  // uni-app 中 input 事件使用 e.detail.value
  let inputValue = ''
  if (e.detail && e.detail.value !== undefined) {
    inputValue = String(e.detail.value)
  } else if (e.target && (e.target as HTMLInputElement).value !== undefined) {
    inputValue = String((e.target as HTMLInputElement).value)
  }
  
  // 只允许数字，移除所有非数字字符
  inputValue = inputValue.replace(/[^0-9]/g, '')
  
  const value = inputValue === '' ? 1 : Math.max(1, Number(inputValue) || 1)
  setGroupQuantity(groupId, value)
}

// 处理组合数量失焦事件（确保最终值有效）
const handleGroupQuantityBlur = (groupId: string, e: any) => {
  const group = selectedGroups.value.find(g => g.groupId === groupId)
  if (group && group.quantity < 1) {
    group.quantity = 1
    updateItemsFromGroups()
  }
}

const setGroupQuantity = (groupId: string, quantity: number) => {
  const group = selectedGroups.value.find(g => g.groupId === groupId)
  if (group) {
    const validQuantity = Math.max(1, quantity || 1)
    group.quantity = validQuantity
    updateItemsFromGroups()
    // updateItemsFromGroups 内部已经会调用 calculateGifts()
  }
}

const changeGroupQuantity = (groupId: string, delta: number) => {
  const group = selectedGroups.value.find(g => g.groupId === groupId)
  if (group) {
    const newQuantity = Math.max(1, group.quantity + delta)
    group.quantity = newQuantity
    updateItemsFromGroups()
    // updateItemsFromGroups 内部已经会调用 calculateGifts()
  }
}

// 获取组合中的商品名称
const getGroupProductNames = (groupId: string) => {
  const group = productGroups.value.find(g => g.id === groupId)
  if (!group) return []
  return group.productIds.map(productId => {
    const product = store.products.find(p => p.id === productId)
    return product?.name || productId
  })
}

// 根据选中的组合更新items
// 注意：组合和单个商品是分开的，不应该互相影响
// form.value.items 只存储单个商品选择，组合单独存储在 selectedGroups 中
const updateItemsFromGroups = () => {
  // 组合选择不影响 form.value.items
  // 组合的商品只在提交订单时合并
  // 重新计算赠品
  calculateGifts()
}

// 计算促销活动的触发数量（支持条件产品组合）
// 需要合并单个商品和组合商品来计算
const getPromotionQuantity = (promotion: any) => {
  // 合并单个商品和组合商品
  const finalItems: OrderItem[] = [...form.value.items]
  
  // 将组合商品添加到 items 中
  selectedGroups.value.forEach(selectedGroup => {
    const group = productGroups.value.find(g => g.id === selectedGroup.groupId)
    if (!group || group.productIds.length === 0) return
    
    const groupProducts = store.products.filter(p => group.productIds.includes(p.id))
    if (groupProducts.length === 0) return
    
    // 平均分配组合数量到每个商品
    const totalQuantity = selectedGroup.quantity
    const productCount = groupProducts.length
    const baseQuantity = Math.floor(totalQuantity / productCount)
    const remainder = totalQuantity % productCount
    
    groupProducts.forEach((product, index) => {
      const quantity = baseQuantity + (index < remainder ? 1 : 0)
      
      if (quantity > 0) {
        const existingItem = finalItems.find(item => item.productId === product.id)
        if (existingItem) {
          // 如果同一个商品既单独选择又在组合中，累加数量
          existingItem.quantity += quantity
        } else {
          finalItems.push({
            productId: product.id,
            productName: product.name,
            quantity,
            price: product.price,
            weight: product.weight
          })
        }
      }
    })
  })
  
  // 优先使用 conditionDetails（新格式）
  if (promotion.conditionDetails && promotion.conditionDetails.length > 0) {
    // 计算所有条件的总数量
    let totalConditionQuantity = 0
    
    promotion.conditionDetails.forEach((condition: any) => {
      if (condition.type === 'product') {
        // 单个产品：查找订单中该产品的数量
        const orderItem = finalItems.find((item: any) => item.productId === condition.productId)
        if (orderItem) {
          totalConditionQuantity += orderItem.quantity
        }
      } else if (condition.type === 'group') {
        // 组合：查找订单中该组合的所有产品
        const group = productGroups.value.find(g => g.id === condition.groupId)
        if (group) {
          // 计算组合中所有产品的总数量
          const groupTotalQuantity = group.productIds.reduce((sum: number, productId: string) => {
            const orderItem = finalItems.find((item: any) => item.productId === productId)
            return sum + (orderItem?.quantity || 0)
          }, 0)
          totalConditionQuantity += groupTotalQuantity
        }
      }
    })
    
    return totalConditionQuantity
  }
  
  // 旧格式：向后兼容
  // 如果没有指定条件产品，使用所有产品的总数量
  if (!promotion.conditionProducts || promotion.conditionProducts.length === 0) {
    return finalItems.reduce((sum, item) => sum + item.quantity, 0)
  }
  
  // 计算条件产品组合的总数量
  return finalItems
    .filter(item => promotion.conditionProducts.includes(item.productId))
    .reduce((sum, item) => sum + item.quantity, 0)
}

// 计算赠品（支持多个促销活动）
const calculateGifts = () => {
  if (!form.value.promotionIds || form.value.promotionIds.length === 0) {
    calculatedGiftItems.value = []
    return
  }
  
  const giftMap = new Map<string, number>() // 用于合并相同商品的赠品数量
  
  form.value.promotionIds.forEach(promotionId => {
    const promotion = store.promotions.find(p => p.id === promotionId)
    if (!promotion) return
    
    // 计算条件产品组合的数量
    const conditionQuantity = getPromotionQuantity(promotion)
    
    // 计算最小阈值（用于计算倍数）
    let minThreshold = promotion.threshold
    if (promotion.conditionDetails && promotion.conditionDetails.length > 0) {
      minThreshold = Math.min(...promotion.conditionDetails.map((c: any) => c.quantity))
    }
    
    const times = Math.floor(conditionQuantity / minThreshold)
    if (times > 0) {
      promotion.gifts.forEach(g => {
        // 优先处理组合赠品（有 groupId 字段）
        if (g.groupId && g.productIds && g.productIds.length > 0) {
          // 组合赠品：保存为组合形式，不拆分成单个商品
          const totalQuantity = g.quantity * times
          const groupKey = `group:${g.groupId}`
          const existingQty = giftMap.get(groupKey) || 0
          giftMap.set(groupKey, existingQty + totalQuantity)
        } else if (g.type && g.productIds && g.productIds.length > 0) {
          // 类型赠品：按类型随机分配
          const totalQuantity = g.quantity * times
          // 从该类型下的产品中随机分配
          for (let i = 0; i < totalQuantity; i++) {
            const randomIndex = Math.floor(Math.random() * g.productIds.length)
            const randomProductId = g.productIds[randomIndex]
            const existingQty = giftMap.get(randomProductId) || 0
            giftMap.set(randomProductId, existingQty + 1)
          }
        } else {
          // 旧格式：直接使用 productId
          const key = g.productId
          const existingQty = giftMap.get(key) || 0
          giftMap.set(key, existingQty + (g.quantity * times))
        }
      })
    }
  })
  
  // 转换为数组格式
  calculatedGiftItems.value = Array.from(giftMap.entries()).map(([key, quantity]) => {
    // 检查是否是组合赠品
    if (key.startsWith('group:')) {
      const groupId = key.replace('group:', '')
      const group = productGroups.value.find(g => g.id === groupId)
      return {
        isGroup: true,
        groupId: groupId,
        groupName: group?.name || '组合赠品',
        productIds: group?.productIds || [],
        quantity
      }
    }
    // 单个商品赠品
    const product = store.products.find(p => p.id === key)
    return {
      productId: key,
      productName: product?.name || key,
      quantity
    }
  })
}

// 监听商品数量和促销活动变化，自动重新计算赠品
watch(() => form.value.items, () => {
  calculateGifts()
}, { deep: true })

watch(() => form.value.promotionIds, () => {
  calculateGifts()
}, { deep: true })

watch(() => selectedGroups.value, () => {
  calculateGifts()
}, { deep: true })

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
    
    // 初始化后计算一次赠品
    calculateGifts()
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
  // 检查是否有选择商品或组合
  if (form.value.items.length === 0 && selectedGroups.value.length === 0) {
    uni.showToast({ title: '请选择商品或组合', icon: 'none' })
    return
  }
  if (!form.value.totalWeight || form.value.totalWeight <= 0) {
    uni.showToast({ title: '请输入有效的总重量', icon: 'none' })
    return
  }
  if (!form.value.totalAmount || form.value.totalAmount <= 0) {
    uni.showToast({ title: '请输入有效的总金额（必须大于0）', icon: 'none' })
    return
  }
  // 确保总金额为正数
  if (form.value.totalAmount < 0) {
    uni.showToast({ title: '总金额不能为负数', icon: 'none' })
    form.value.totalAmount = Math.abs(form.value.totalAmount)
    return
  }
  
  if (!store.currentAdmin || (store.currentAdmin.role !== 'super_admin' && store.currentAdmin.role !== 'admin')) {
    uni.showToast({ title: '需要管理员权限', icon: 'none' })
    return
  }
  
  try {
    uni.showLoading({ title: '保存中...' })
    
    // 合并单个商品和组合商品到最终 items
    const finalItems: OrderItem[] = [...form.value.items]
    
    // 将组合商品添加到 items 中
    selectedGroups.value.forEach(selectedGroup => {
      const group = productGroups.value.find(g => g.id === selectedGroup.groupId)
      if (!group || group.productIds.length === 0) return
      
      const groupProducts = store.products.filter(p => group.productIds.includes(p.id))
      if (groupProducts.length === 0) return
      
      // 平均分配组合数量到每个商品
      const totalQuantity = selectedGroup.quantity
      const productCount = groupProducts.length
      const baseQuantity = Math.floor(totalQuantity / productCount)
      const remainder = totalQuantity % productCount
      
      groupProducts.forEach((product, index) => {
        const quantity = baseQuantity + (index < remainder ? 1 : 0)
        
        if (quantity > 0) {
          const existingItem = finalItems.find(item => item.productId === product.id)
          if (existingItem) {
            // 如果同一个商品既单独选择又在组合中，累加数量
            existingItem.quantity += quantity
            // 如果该商品已经在组合中，保留组合信息
            if (existingItem.groupId && existingItem.groupId === selectedGroup.groupId) {
              // 已经属于同一个组合，不需要更新
            } else if (!existingItem.groupId) {
              // 如果该商品之前不是组合商品，现在添加到组合中，需要标记为组合商品
              existingItem.groupId = selectedGroup.groupId
              existingItem.groupName = group.name
              existingItem.groupQuantity = totalQuantity
            }
          } else {
            finalItems.push({
              productId: product.id,
              productName: product.name,
              quantity,
              price: product.price,
              weight: product.weight,
              // 标记为组合商品
              groupId: selectedGroup.groupId,
              groupName: group.name,
              groupQuantity: totalQuantity
            })
          }
        }
      })
    })
    
    // 处理促销ID（支持多个）
    const promotionId = form.value.promotionIds.length > 0 
      ? (form.value.promotionIds.length === 1 ? form.value.promotionIds[0] : JSON.stringify(form.value.promotionIds))
      : undefined
    
    // 使用重新计算后的赠品信息
    const giftItems = calculatedGiftItems.value.length > 0 ? calculatedGiftItems.value : []
    
    await orderApi.update(
      orderId.value,
      {
        agentId: form.value.agentId,
        items: finalItems,
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
  // 加载产品组合列表
  try {
    productGroups.value = await productGroupApi.getAll()
  } catch (error) {
    console.error('加载产品组合失败:', error)
  }
  
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

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-primary;
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

// 模式切换按钮
.mode-switch {
  display: flex;
  align-items: center;
  background: $bg-grey;
  border-radius: 8rpx;
  padding: 4rpx;
  gap: 4rpx;
  
  &__item {
    flex: 1;
    padding: 8rpx 16rpx;
    text-align: center;
    font-size: 24rpx;
    color: $text-secondary;
    border-radius: 6rpx;
    transition: all $transition-fast;
    
    &--active {
      background: #fff;
      color: $primary-color;
      font-weight: 500;
    }
  }
}

// 表单描述文字
.form-desc {
  font-size: 24rpx;
  color: $text-secondary;
  margin-bottom: 16rpx;
  line-height: 1.5;
}

// 产品选择样式
.product-select {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.product-group-select {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.empty-groups {
  padding: 40rpx 20rpx;
  text-align: center;
  
  .empty-text {
    font-size: 26rpx;
    color: $text-placeholder;
  }
}

.group-select {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 16rpx;
}

.group-select-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  border: 2rpx solid transparent;
  transition: all 0.2s ease;
  
  &--active {
    background: rgba($primary-color, 0.08);
    border-color: $primary-color;
  }
  
  &__left {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 16rpx;
  }
  
  &__check {
    width: 40rpx;
    height: 40rpx;
    border: 2rpx solid $border-color;
    border-radius: 8rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    font-size: 24rpx;
    color: $primary-color;
    font-weight: 600;
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
    display: flex;
    align-items: center;
    gap: 12rpx;
  }
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
  
  &--disabled {
    opacity: 0.5;
    pointer-events: none;
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
  width: 135rpx;
  height: 60rpx;
  text-align: center;
  font-size: 32rpx;
  font-weight: 500;
  background: #fff;
  border: 1rpx solid $border-color;
  border-radius: 6rpx;
  
  &--small {
    width: 135rpx;
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

