<template>
  <view class="quick-order">
    <!-- 选择代理 -->
    <view class="card">
      <view class="section-title">选择代理商</view>
      <TagSelect
        v-model="form.agentId"
        :options="agentOptions"
        label=""
      />
    </view>
    
    <!-- 选择商品 -->
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
          v-for="product in products" 
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
      
      <!-- 产品组合选择模式 -->
      <view v-else class="product-group-select">
        <text class="form-desc">选择产品类型，系统将从该类型下的产品中自动分配</text>
        <view class="gift-type-select">
          <view 
            v-for="category in categorizedProducts"
            :key="category.type"
            class="gift-type-item"
            :class="{ 'gift-type-item--active': isProductTypeSelected(category.type) }"
          >
            <view class="gift-type-item__left" @tap="toggleProductTypeSelection(category.type)">
              <view class="gift-type-item__check">
                <text v-if="isProductTypeSelected(category.type)">✓</text>
              </view>
              <view class="gift-type-item__info">
                <text class="gift-type-item__name">{{ category.type }}</text>
                <text class="gift-type-item__products">{{ category.products.map(p => p.name).join('、') }}</text>
              </view>
            </view>
            <view v-if="isProductTypeSelected(category.type)" class="gift-type-item__quantity" @tap.stop>
              <view class="quantity-control">
                <view class="quantity-btn quantity-btn--small" @tap="changeProductTypeQuantity(category.type, -10)">-10</view>
                <view class="quantity-btn quantity-btn--small" @tap="changeProductTypeQuantity(category.type, -1)">-</view>
                <input 
                  type="number" 
                  :value="getProductTypeQuantity(category.type)" 
                  class="quantity-input quantity-input--small"
                  @input="(e: any) => setProductTypeQuantity(category.type, Number(e.detail?.value ?? (e.target as HTMLInputElement)?.value ?? 0))"
                />
                <view class="quantity-btn quantity-btn--small" @tap="changeProductTypeQuantity(category.type, 1)">+</view>
                <view class="quantity-btn quantity-btn--small" @tap="changeProductTypeQuantity(category.type, 10)">+10</view>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 整车计算 -->
    <view class="card">
      <view class="section-header">
        <view class="section-title">整车计算</view>
        <view class="truck-type-btn" @tap="showTruckSelect = true">
          {{ currentTruckType?.name || '选择车型' }} ›
        </view>
      </view>
      
      <view v-if="currentTruckType" class="truck-calc">
        <view class="truck-progress">
          <view class="truck-progress__bar">
            <view 
              class="truck-progress__fill"
              :class="truckStatus"
              :style="{ width: Math.min(truckPercentage, 100) + '%' }"
            ></view>
            <view class="truck-progress__markers">
              <view class="marker marker--min" :style="{ left: minMarkerPosition + '%' }"></view>
              <view class="marker marker--max" :style="{ left: '100%' }"></view>
            </view>
          </view>
          <view class="truck-progress__labels">
            <text>0kg</text>
            <text>{{ currentTruckType.minWeight.toLocaleString() }}kg</text>
            <text>{{ currentTruckType.maxWeight.toLocaleString() }}kg</text>
          </view>
        </view>
        
        <view class="truck-status" :class="'truck-status--' + truckStatus">
          <image :src="truckStatusIcon" class="truck-status__icon" mode="aspectFit" />
          <text class="truck-status__text">{{ truckStatusText }}</text>
          <text class="truck-status__detail">
            当前 {{ totalWeight.toLocaleString() }}kg / 目标 {{ currentTruckType.minWeight.toLocaleString() }}-{{ currentTruckType.maxWeight.toLocaleString() }}kg
          </text>
        </view>
        
        <view v-if="truckStatus === 'insufficient'" class="truck-tip">
          还差 <text class="highlight">{{ (currentTruckType.minWeight - totalWeight).toLocaleString() }}kg</text> 达到整车
        </view>
        <view v-else-if="truckStatus === 'overload'" class="truck-tip truck-tip--warning">
          超载 <text class="highlight">{{ (totalWeight - currentTruckType.maxWeight).toLocaleString() }}kg</text>，请减少商品
        </view>
      </view>
    </view>
    
    <!-- 选择司机 -->
    <view class="card">
      <view class="section-title">选择司机</view>
      <QuickInput
        v-model="form.driverPhone"
        label="司机手机号（可选）"
        placeholder="请输入司机手机号"
        type="number"
      />
    </view>
    
    <!-- 选择促销活动 -->
    <view class="card">
      <view class="section-title">参与促销</view>
      <TagSelect
        v-model="form.promotionIds"
        :options="promotionOptions"
        :multiple="true"
        label=""
      />
    </view>
    
    <!-- 上传图片 -->
    <view class="card">
      <ImageUploader
        v-model="form.images"
        label="订单图片（可选）"
        tip="可上传订单相关图片"
      />
    </view>
    
    <!-- 实时计算结果 -->
    <view class="calc-result">
      <view class="calc-item">
        <text class="calc-item__label">总数量</text>
        <text class="calc-item__value">{{ totalQuantity }}箱</text>
      </view>
      <view class="calc-item">
        <text class="calc-item__label">总重量</text>
        <text class="calc-item__value">{{ totalWeight.toFixed(1) }}kg</text>
      </view>
      <view class="calc-item calc-item--highlight">
        <text class="calc-item__label">总金额</text>
        <text class="calc-item__value">¥{{ totalAmount.toLocaleString() }}</text>
      </view>
    </view>
    
    <!-- 赠品信息 -->
    <view v-if="giftPromotions.length > 0" class="gift-section">
      <view class="gift-section__header">
        <image src="/static/icons/gift.svg" class="gift-section__icon" mode="aspectFit" />
        <text class="gift-section__title">促销赠品</text>
      </view>
      <view class="gift-list">
        <view 
          v-for="(promo, idx) in giftPromotions" 
          :key="idx"
          class="gift-promo"
        >
          <text class="gift-promo__name">{{ promo.name }}</text>
          <view class="gift-promo__items">
            <text 
              v-for="(gift, gIdx) in promo.gifts" 
              :key="gIdx"
              class="gift-item"
            >
              {{ gift.productName }} x{{ gift.quantity }}
            </text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 代理余额提示 -->
    <view v-if="selectedAgent" class="balance-tip" :class="{ 'balance-tip--warning': !hasEnoughBalance }">
      <text>{{ selectedAgent.name }}当前余额：</text>
      <text class="balance-tip__value" :class="{ 'amount-negative': selectedAgent.balance < 0 }">
        ¥{{ selectedAgent.balance.toLocaleString() }}
      </text>
      <text v-if="!hasEnoughBalance" class="balance-tip__warning">
        （余额不足，将产生欠款）
      </text>
    </view>
    
    <!-- 提交按钮 -->
    <view class="submit-btn" @tap="submitOrder">
      <text class="submit-btn__text">确认开单</text>
    </view>
    
    <!-- 车型选择弹窗 -->
    <view v-if="showTruckSelect" class="modal-mask" @tap="showTruckSelect = false">
      <view class="modal-content" @tap.stop>
        <text class="modal-title">选择车型</text>
        <view class="truck-list">
          <view 
            v-for="truck in truckTypes" 
            :key="truck.id"
            class="truck-option"
            :class="{ 'truck-option--active': form.truckTypeId === truck.id }"
            @tap="selectTruck(truck.id)"
          >
            <view class="truck-option__info">
              <text class="truck-option__name">{{ truck.name }}</text>
              <text class="truck-option__weight">{{ truck.minWeight.toLocaleString() }} - {{ truck.maxWeight.toLocaleString() }}kg</text>
            </view>
            <view v-if="truck.isDefault" class="truck-option__default">默认</view>
            <view v-if="form.truckTypeId === truck.id" class="truck-option__check">✓</view>
          </view>
        </view>
        <view class="modal-manage-trucks" @tap.stop="goToTruckManage">
          <text class="modal-manage-trucks__text">管理车型</text>
        </view>
        <view class="modal-close" @tap="showTruckSelect = false">关闭</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/stores/app'
import TagSelect from '@/components/TagSelect/index.vue'
import QuickInput from '@/components/QuickInput/index.vue'
import ImageUploader from '@/components/ImageUploader/index.vue'
import type { OrderItem } from '@/types'

const store = useAppStore()

interface TruckType {
  id: string
  name: string
  minWeight: number
  maxWeight: number
  isDefault: boolean
}

const truckTypes = ref<TruckType[]>([])
const showTruckSelect = ref(false)

// 暂存每个商品的数量（用于取消勾选后恢复）
const productQuantityCache = ref<Record<string, number>>({})

// 产品组合选择模式
const useProductGroupMode = ref(false)

// 产品类型组合（用于组合选择模式）
interface ProductTypeGroup {
  type: string
  quantity: number
  productIds: string[]
}
const productTypeGroups = ref<ProductTypeGroup[]>([])

const form = ref({
  agentId: null as string | null,
  items: [] as OrderItem[],
  driverPhone: '' as string,
  promotionIds: [] as string[],
  truckTypeId: null as string | null,
  images: [] as string[]
})

// 加载车型
const loadTrucks = async () => {
  try {
    const res = await uni.request({
      url: 'https://nomur.linkmate.site/api/truck-types',
      method: 'GET'
    })
    const data = res.data as any
    if (data.code === 0) {
      truckTypes.value = data.data
      // 默认选择默认车型
      const defaultTruck = truckTypes.value.find(t => t.isDefault)
      if (defaultTruck) {
        form.value.truckTypeId = defaultTruck.id
      }
    }
  } catch (e) {
    console.error('加载车型失败', e)
  }
}

onMounted(() => {
  loadTrucks()
})

// 页面显示时刷新车型列表（从车型管理页面返回时）
onShow(() => {
  loadTrucks()
})

// 当前选中的车型
const currentTruckType = computed(() => 
  truckTypes.value.find(t => t.id === form.value.truckTypeId)
)

// 选择车型
const selectTruck = (id: string) => {
  form.value.truckTypeId = id
  showTruckSelect.value = false
}

// 跳转到车型管理页面
const goToTruckManage = () => {
  showTruckSelect.value = false
  uni.navigateTo({
    url: '/pages/admin/trucks/index'
  })
}

// 整车状态计算
const truckPercentage = computed(() => {
  if (!currentTruckType.value) return 0
  return (totalWeight.value / currentTruckType.value.maxWeight) * 100
})

const minMarkerPosition = computed(() => {
  if (!currentTruckType.value) return 0
  return (currentTruckType.value.minWeight / currentTruckType.value.maxWeight) * 100
})

const truckStatus = computed(() => {
  if (!currentTruckType.value || totalWeight.value === 0) return 'empty'
  if (totalWeight.value < currentTruckType.value.minWeight) return 'insufficient'
  if (totalWeight.value > currentTruckType.value.maxWeight) return 'overload'
  return 'success'
})

const truckStatusIcon = computed(() => {
  const icons: Record<string, string> = {
    empty: '/static/icons/truck.svg',
    insufficient: '/static/icons/warning.svg',
    success: '/static/icons/check-circle.svg',
    overload: '/static/icons/x-circle.svg'
  }
  return icons[truckStatus.value]
})

const truckStatusText = computed(() => {
  const texts: Record<string, string> = {
    empty: '请添加商品',
    insufficient: '重量不足',
    success: '整车达标！',
    overload: '超载'
  }
  return texts[truckStatus.value]
})

// 选项列表
const agentOptions = computed(() => 
  store.agents.map(a => ({
    label: a.name,
    value: a.id,
    subLabel: `¥${a.balance.toLocaleString()}`
  }))
)

const products = computed(() => store.products)

// 产品分类（用于组合选择）
const categorizedProducts = computed(() => {
  const categories: { [key: string]: { type: string; products: any[] } } = {}
  store.products.forEach(p => {
    let type = '其他'
    if (p.name.includes('芒果')) {
      type = '芒果类'
    } else if (p.name.includes('茶')) {
      type = '茶类'
    } else if (p.name.includes('龙眼') || p.name.includes('水果')) {
      type = '水果类'
    }

    if (!categories[type]) {
      categories[type] = { type, products: [] }
    }
    categories[type].products.push(p)
  })
  return Object.values(categories)
})

// 产品类型选择相关方法
const isProductTypeSelected = (type: string) => {
  return productTypeGroups.value.some(g => g.type === type)
}

const toggleProductTypeSelection = (type: string) => {
  uni.vibrateShort({ type: 'light' })
  const index = productTypeGroups.value.findIndex(g => g.type === type)
  if (index > -1) {
    productTypeGroups.value.splice(index, 1)
    // 清除该类型对应的items
    updateItemsFromProductGroups()
  } else {
    const category = categorizedProducts.value.find(c => c.type === type)
    if (category) {
      productTypeGroups.value.push({
        type,
        quantity: 10, // 默认10箱
        productIds: category.products.map(p => p.id)
      })
      updateItemsFromProductGroups()
    }
  }
}

const getProductTypeQuantity = (type: string) => {
  const group = productTypeGroups.value.find(g => g.type === type)
  return group?.quantity || 0
}

const setProductTypeQuantity = (type: string, quantity: number) => {
  const group = productTypeGroups.value.find(g => g.type === type)
  if (group) {
    group.quantity = Math.max(1, quantity || 1)
    updateItemsFromProductGroups()
  }
}

const changeProductTypeQuantity = (type: string, delta: number) => {
  const group = productTypeGroups.value.find(g => g.type === type)
  if (group) {
    const step = Math.abs(delta) === 10 ? 10 : 1
    group.quantity = Math.max(1, group.quantity + (delta > 0 ? step : -step))
    updateItemsFromProductGroups()
  }
}

// 根据产品类型组合更新items
const updateItemsFromProductGroups = () => {
  // 清空现有items
  form.value.items = []
  
  // 根据类型组合生成items（随机分配）
  productTypeGroups.value.forEach(group => {
    if (group.productIds.length === 0) return
    
    const availableProducts = store.products.filter(p => group.productIds.includes(p.id))
    if (availableProducts.length === 0) return
    
    // 随机分配到类型下的产品
    let remainingQuantity = group.quantity
    const distribution: Record<string, number> = {}
    
    while (remainingQuantity > 0) {
      const randomProduct = availableProducts[Math.floor(Math.random() * availableProducts.length)]
      const qtyToAdd = Math.min(remainingQuantity, Math.floor(Math.random() * remainingQuantity) + 1)
      
      distribution[randomProduct.id] = (distribution[randomProduct.id] || 0) + qtyToAdd
      remainingQuantity -= qtyToAdd
    }
    
    // 添加到items
    Object.entries(distribution).forEach(([productId, quantity]) => {
      const product = store.products.find(p => p.id === productId)
      if (product) {
        const existingItem = form.value.items.find(item => item.productId === productId)
        if (existingItem) {
          existingItem.quantity += quantity
        } else {
          form.value.items.push({
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
}

// 监听组合模式切换
const watchUseProductGroupMode = () => {
  if (useProductGroupMode.value) {
    // 切换到组合模式时，清空items
    form.value.items = []
  } else {
    // 切换到单个模式时，清空类型组合
    productTypeGroups.value = []
  }
}

// 使用watch监听useProductGroupMode变化
watch(useProductGroupMode, watchUseProductGroupMode)

const promotionOptions = computed(() => 
  store.promotions.filter(p => p.isActive).map(p => ({
    label: p.name,
    value: p.id,
    subLabel: p.description
  }))
)

// 已选商品
const selectedProducts = computed(() => form.value.items)

const isProductSelected = (productId: string) => {
  return form.value.items.some(item => item.productId === productId)
}

const toggleProduct = (productId: string) => {
  uni.vibrateShort({ type: 'light' })
  
  if (isProductSelected(productId)) {
    // 取消勾选时，保存当前数量到暂存
    const item = form.value.items.find(i => i.productId === productId)
    if (item) {
      productQuantityCache.value[productId] = item.quantity
    }
    form.value.items = form.value.items.filter(item => item.productId !== productId)
  } else {
    // 再次勾选时，从暂存恢复数量，如果没有暂存则使用默认值 10
    const product = products.value.find(p => p.id === productId)
    if (product) {
      const cachedQuantity = productQuantityCache.value[productId]
      form.value.items.push({
        productId: product.id,
        productName: product.name,
        quantity: cachedQuantity || 10, // 优先使用暂存的数量
        price: product.price,
        weight: product.weight
      })
    }
  }
}

const changeQuantity = (productId: string, delta: number) => {
  const item = form.value.items.find(i => i.productId === productId)
  if (item) {
    // 增加时步长为 10，减少时步长为 1
    const step = delta > 0 ? 10 : 1
    item.quantity = Math.max(1, item.quantity + (delta * step))
    // 更新暂存数量
    productQuantityCache.value[productId] = item.quantity
  }
}

const setQuantity = (productId: string, value: number) => {
  const item = form.value.items.find(i => i.productId === productId)
  if (item) {
    item.quantity = Math.max(1, value || 1)
    // 更新暂存数量
    productQuantityCache.value[productId] = item.quantity
  }
}

const getItemQuantity = (productId: string) => {
  const item = form.value.items.find(i => i.productId === productId)
  return item?.quantity || 0
}

// 实时计算
const totalQuantity = computed(() => 
  form.value.items.reduce((sum, item) => sum + item.quantity, 0)
)

const totalWeight = computed(() =>
  form.value.items.reduce((sum, item) => sum + item.quantity * item.weight, 0)
)

const totalAmount = computed(() =>
  form.value.items.reduce((sum, item) => sum + item.quantity * item.price, 0)
)

// 计算促销活动的触发数量（支持条件产品组合）
const getPromotionQuantity = (promotion: any) => {
  // 如果没有指定条件产品，使用所有产品的总数量
  if (!promotion.conditionProducts || promotion.conditionProducts.length === 0) {
    return totalQuantity.value
  }
  
  // 计算条件产品组合的总数量
  return form.value.items
    .filter(item => promotion.conditionProducts.includes(item.productId))
    .reduce((sum, item) => sum + item.quantity, 0)
}

// 赠品信息（用于显示）
const giftPromotions = computed(() => {
  if (!form.value.promotionIds || form.value.promotionIds.length === 0) return []
  
  const promotions: Array<{ name: string; gifts: Array<{ productName: string; quantity: number }> }> = []
  form.value.promotionIds.forEach(promotionId => {
    const promotion = store.promotions.find(p => p.id === promotionId)
    if (promotion) {
      const conditionQuantity = getPromotionQuantity(promotion)
      const times = Math.floor(conditionQuantity / promotion.threshold)
      if (times > 0) {
        promotions.push({
          name: promotion.name,
          gifts: promotion.gifts.map(g => {
            // 新格式：显示类型
            if (g.type) {
              return {
                productName: `${g.type}（随机分配）`,
                quantity: g.quantity * times
              }
            }
            // 旧格式：显示具体产品
            return {
              productName: g.productName,
              quantity: g.quantity * times
            }
          })
        })
      }
    }
  })
  
  return promotions
})

// 选中的代理
const selectedAgent = computed(() => 
  store.agents.find(a => a.id === form.value.agentId)
)

// 余额是否足够
const hasEnoughBalance = computed(() => {
  if (!selectedAgent.value) return true
  return selectedAgent.value.balance >= totalAmount.value
})

// 提交订单
const submitOrder = async () => {
  if (!form.value.agentId) {
    uni.showToast({ title: '请选择代理商', icon: 'none' })
    return
  }
  if (form.value.items.length === 0) {
    uni.showToast({ title: '请选择商品', icon: 'none' })
    return
  }
  
  // 整车检查提示
  if (truckStatus.value === 'insufficient') {
    const result = await new Promise<boolean>((resolve) => {
      uni.showModal({
        title: '整车重量不足',
        content: `当前重量 ${totalWeight.value.toLocaleString()}kg，未达到整车标准 ${currentTruckType.value?.minWeight.toLocaleString()}kg，是否继续开单？`,
        success: (res) => resolve(res.confirm)
      })
    })
    if (!result) return
  }
  
  if (truckStatus.value === 'overload') {
    uni.showToast({ title: '超载，请减少商品', icon: 'none' })
    return
  }
  
  const agent = selectedAgent.value!
  
  // 计算赠品（支持多个促销活动）
  let giftItems: any[] = []
  const giftMap = new Map<string, number>() // 用于合并相同商品的赠品数量
  
  if (form.value.promotionIds && form.value.promotionIds.length > 0) {
    form.value.promotionIds.forEach(promotionId => {
      const promotion = store.promotions.find(p => p.id === promotionId)
      if (promotion) {
        // 计算条件产品组合的数量
        const conditionQuantity = promotion.conditionProducts && promotion.conditionProducts.length > 0
          ? form.value.items
              .filter(item => promotion.conditionProducts.includes(item.productId))
              .reduce((sum, item) => sum + item.quantity, 0)
          : totalQuantity.value
        
        const times = Math.floor(conditionQuantity / promotion.threshold)
        if (times > 0) {
          promotion.gifts.forEach(g => {
            // 新格式：按类型随机分配
            if (g.type && g.productIds && g.productIds.length > 0) {
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
      }
    })
    
    // 转换为数组格式
    giftItems = Array.from(giftMap.entries()).map(([productId, quantity]) => {
      const product = store.products.find(p => p.id === productId)
      return {
        productId,
        productName: product?.name || productId,
        quantity
      }
    })
  }
  
  try {
    await store.createOrder({
      agentId: form.value.agentId,
      agentName: agent.name,
      items: form.value.items,
      totalWeight: totalWeight.value,
      totalAmount: totalAmount.value,
      driverPhone: form.value.driverPhone || undefined,
      promotionId: form.value.promotionIds && form.value.promotionIds.length > 0 ? JSON.stringify(form.value.promotionIds) : undefined, // 传递多个促销ID（JSON格式）
      giftItems: giftItems.length > 0 ? giftItems : undefined,
      images: form.value.images
    })
    
    uni.showToast({
      title: '开单成功',
      icon: 'success'
    })
    
    // 重置表单
    setTimeout(() => {
      form.value = {
        agentId: null,
        items: [],
        driverPhone: '',
        promotionIds: [],
        truckTypeId: truckTypes.value.find(t => t.isDefault)?.id || null,
        images: []
      }
    }, 1500)
  } catch (error) {
    uni.showToast({ title: '开单失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.quick-order {
  padding: 16rpx;
  padding-bottom: 40rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.truck-type-btn {
  font-size: 26rpx;
  color: $primary-color;
  padding: 8rpx 16rpx;
  background: rgba($primary-color, 0.1);
  border-radius: 8rpx;
}

.truck-calc {
  margin-top: 16rpx;
}

.truck-progress {
  margin-bottom: 20rpx;
  
  &__bar {
    position: relative;
    height: 24rpx;
    background: $bg-grey;
    border-radius: 12rpx;
    overflow: visible;
  }
  
  &__fill {
    height: 100%;
    border-radius: 12rpx;
    transition: width 0.3s ease;
    
    &.empty { background: $bg-grey; }
    &.insufficient { background: linear-gradient(90deg, #FFA726, #FF7043); }
    &.success { background: linear-gradient(90deg, #66BB6A, #43A047); }
    &.overload { background: linear-gradient(90deg, #EF5350, #D32F2F); }
  }
  
  &__markers {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }
  
  &__labels {
    display: flex;
    justify-content: space-between;
    margin-top: 8rpx;
    font-size: 22rpx;
    color: $text-secondary;
  }
}

.marker {
  position: absolute;
  width: 4rpx;
  height: 32rpx;
  top: -4rpx;
  transform: translateX(-50%);
  
  &--min {
    background: #66BB6A;
  }
  
  &--max {
    background: #EF5350;
  }
}

.truck-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx;
  border-radius: 12rpx;
  text-align: center;
  
  &--empty { background: $bg-grey; }
  &--insufficient { background: rgba(#FFA726, 0.1); }
  &--success { background: rgba($success-color, 0.1); }
  &--overload { background: rgba($danger-color, 0.1); }
  
  &__icon {
    width: 56rpx;
    height: 56rpx;
    margin-bottom: 8rpx;
  }
  
  &__text {
    font-size: 32rpx;
    font-weight: 600;
    color: $text-primary;
  }
  
  &__detail-wrapper {
    display: flex;
    align-items: center;
    gap: 16rpx;
    margin-top: 8rpx;
  }
  
  &__detail {
    font-size: 24rpx;
    color: $text-secondary;
  }
}

.truck-tip {
  margin-top: 16rpx;
  padding: 16rpx;
  background: rgba(#FFA726, 0.1);
  border-radius: 8rpx;
  font-size: 26rpx;
  color: $text-primary;
  text-align: center;
  
  &--warning {
    background: rgba($danger-color, 0.1);
  }
  
  .highlight {
    font-weight: 700;
    color: $primary-color;
  }
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
    line-height: 1.4;
  }
  
  &__quantity {
    margin-left: 16rpx;
    flex-shrink: 0;
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
    width: 50rpx;
    height: 50rpx;
    font-size: 22rpx;
    min-width: 50rpx;
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
}

.calc-result {
  margin: 24rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 20rpx;
  background: #fff;
  border-radius: $border-radius;
  box-shadow: $shadow-lg;
}

.calc-item {
  flex: 1;
  min-width: 45%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 16rpx;
  background: $bg-grey;
  border-radius: 8rpx;
  
  &__label {
    font-size: 24rpx;
    color: $text-secondary;
  }
  
  &__value {
    font-size: 28rpx;
    font-weight: 600;
    color: $text-primary;
  }
  
  &--highlight {
    background: rgba($primary-color, 0.1);
    
    .calc-item__value {
      color: $primary-color;
      font-size: 32rpx;
    }
  }
  
  &--gift {
    width: 100%;
    background: rgba($success-color, 0.1);
    
    .calc-item__value {
      color: $success-color;
    }
  }
}

.calc-gift-icon {
  width: 32rpx;
  height: 32rpx;
  margin-right: 8rpx;
}

.gift-section {
  margin: 0 24rpx;
  margin-top: 16rpx;
  padding: 20rpx;
  background: rgba($success-color, 0.08);
  border-radius: $border-radius;
  border: 1rpx solid rgba($success-color, 0.2);
  
  &__header {
    display: flex;
    align-items: center;
    margin-bottom: 16rpx;
  }
  
  &__icon {
    width: 32rpx;
    height: 32rpx;
    margin-right: 8rpx;
  }
  
  &__title {
    font-size: 28rpx;
    font-weight: 600;
    color: $success-color;
  }
}

.gift-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.gift-promo {
  padding: 12rpx 16rpx;
  background: rgba(#fff, 0.6);
  border-radius: 8rpx;
  
  &__name {
    font-size: 24rpx;
    font-weight: 500;
    color: $text-primary;
    display: block;
    margin-bottom: 8rpx;
  }
  
  &__items {
    display: flex;
    flex-wrap: wrap;
    gap: 8rpx;
  }
}

.gift-item {
  font-size: 22rpx;
  color: $text-secondary;
  padding: 4rpx 12rpx;
  background: rgba($success-color, 0.1);
  border-radius: 4rpx;
  border: 1rpx solid rgba($success-color, 0.2);
}

.balance-tip {
  margin-top: 16rpx;
  padding: 16rpx 20rpx;
  background: rgba($success-color, 0.1);
  border-radius: 8rpx;
  font-size: 26rpx;
  color: $text-secondary;
  
  &--warning {
    background: rgba($warning-color, 0.1);
  }
  
  &__value {
    font-weight: 600;
    color: $success-color;
  }
  
  &__warning {
    color: $warning-color;
  }
}

.amount-negative {
  color: $danger-color !important;
}

.submit-btn {
  margin: 24rpx;
  margin-top: 32rpx;
  margin-bottom: 40rpx;
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

// 弹窗
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
}

.modal-title {
  font-size: 36rpx;
  font-weight: 700;
  color: $text-primary;
  text-align: center;
  display: block;
  margin-bottom: 32rpx;
}

.truck-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.truck-option {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: $bg-grey;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  
  &--active {
    background: rgba($primary-color, 0.1);
    border-color: $primary-color;
  }
  
  &__info {
    flex: 1;
  }
  
  &__name {
    font-size: 30rpx;
    font-weight: 500;
    color: $text-primary;
    display: block;
  }
  
  &__weight {
    font-size: 26rpx;
    color: $text-secondary;
    margin-top: 4rpx;
    display: block;
  }
  
  &__default {
    font-size: 22rpx;
    padding: 4rpx 12rpx;
    background: $primary-color;
    color: #fff;
    border-radius: 8rpx;
    margin-right: 16rpx;
  }
  
  &__check {
    width: 44rpx;
    height: 44rpx;
    background: $primary-color;
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24rpx;
  }
}

.modal-manage-trucks {
  margin-top: 24rpx;
  padding: 24rpx;
  background: $primary-color;
  border-radius: 12rpx;
  text-align: center;
  
  &:active {
    opacity: 0.9;
  }
  
  &__text {
    font-size: 28rpx;
    font-weight: 500;
    color: #fff;
  }
}

.modal-close {
  margin-top: 24rpx;
  padding: 24rpx;
  background: $bg-grey;
  border-radius: 12rpx;
  text-align: center;
  font-size: 30rpx;
  color: $text-secondary;
}
</style>
