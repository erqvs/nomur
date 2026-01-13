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
    
    <!-- 整车计算 -->
    <view class="card">
      <view class="section-header">
        <view class="section-title">整车计算</view>
        <view class="truck-type-btn" @tap="showTruckSelect = true">
          {{ currentTruckType?.name || '选择车型' }} ›
        </view>
      </view>
      
      <!-- 整车计算显示 -->
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
          超载 <text class="highlight">{{ (totalWeight - currentTruckType.maxWeight).toLocaleString() }}kg</text>（仅提醒，可继续开单）
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
        tip="每次上传一张，可重复上传"
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
import { productGroupApi, truckApi, type TruckType } from '@/api'
import TagSelect from '@/components/TagSelect/index.vue'
import QuickInput from '@/components/QuickInput/index.vue'
import ImageUploader from '@/components/ImageUploader/index.vue'
import type { OrderItem, ProductGroup } from '@/types'

const store = useAppStore()

const truckTypes = ref<TruckType[]>([])
const showTruckSelect = ref(false)

// 暂存每个商品的数量（用于取消勾选后恢复）
const productQuantityCache = ref<Record<string, number>>({})

// 产品组合选择模式
const useProductGroupMode = ref(false)

// 产品组合列表
const productGroups = ref<ProductGroup[]>([])

// 选中的组合及其数量
interface SelectedGroup {
  groupId: string
  quantity: number
}
const selectedGroups = ref<SelectedGroup[]>([])

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
    const data = await truckApi.getAll()
    truckTypes.value = data
    // 默认选择默认车型
    const defaultTruck = truckTypes.value.find(t => t.isDefault)
    if (defaultTruck) {
      form.value.truckTypeId = defaultTruck.id
    }
  } catch (e) {
    console.error('加载车型失败', e)
    uni.showToast({ title: '加载车型失败', icon: 'none' })
  }
}

onMounted(async () => {
  loadTrucks()
  await loadProductGroups()
})

// 页面显示时刷新车型列表和组合列表
onShow(async () => {
  loadTrucks()
  await loadProductGroups()
})

// 加载产品组合列表
const loadProductGroups = async () => {
  try {
    productGroups.value = await productGroupApi.getAll()
  } catch (error) {
    console.error('加载产品组合失败:', error)
    uni.showToast({ title: '加载组合失败', icon: 'none' })
  }
}

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
}

const getGroupQuantity = (groupId: string) => {
  const group = selectedGroups.value.find(g => g.groupId === groupId)
  return group?.quantity || 0
}

const setGroupQuantity = (groupId: string, quantity: number) => {
  const group = selectedGroups.value.find(g => g.groupId === groupId)
  if (group) {
    const validQuantity = Math.max(1, quantity || 1)
    group.quantity = validQuantity
    updateItemsFromGroups()
  }
}

const changeGroupQuantity = (groupId: string, delta: number) => {
  const group = selectedGroups.value.find(g => g.groupId === groupId)
  if (group) {
    const newQuantity = Math.max(1, group.quantity + delta)
    group.quantity = newQuantity
    updateItemsFromGroups()
  }
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
}

// 监听组合模式切换
// 注意：切换模式时不清空已选择的内容，允许两种模式的选择叠加
const watchUseProductGroupMode = () => {
  // 切换模式时不清空选择，允许叠加
  // 这样用户可以在"单个"模式选择商品，然后切换到"组合"模式选择组合，两者都会保留
}
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
    const newQuantity = Math.max(1, item.quantity + (delta * step))
    item.quantity = newQuantity
    // 更新暂存数量
    productQuantityCache.value[productId] = newQuantity
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
    // 更新暂存数量
    productQuantityCache.value[productId] = validValue
  }
}

const getItemQuantity = (productId: string) => {
  const item = form.value.items.find(i => i.productId === productId)
  return item?.quantity || 0
}

// 实时计算最终商品列表（包含单个商品和组合商品）
const finalItemsComputed = computed(() => {
  const items: OrderItem[] = [...form.value.items]
  
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
        const existingItem = items.find(item => item.productId === product.id)
        if (existingItem) {
          existingItem.quantity += quantity
        } else {
          items.push({
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
  
  return items
})

// 实时计算
const totalQuantity = computed(() => 
  finalItemsComputed.value.reduce((sum, item) => sum + item.quantity, 0)
)

// 总重量计算：包含单个商品和组合商品
// 组合重量 = 组合中单个产品的重量 * 组合数量（因为组合中所有产品重量相同）
const totalWeight = computed(() => {
  // 计算单个商品的重量
  let weight = form.value.items.reduce((sum, item) => sum + item.quantity * item.weight, 0)
  
  // 加上组合的重量
  selectedGroups.value.forEach(selectedGroup => {
    const group = productGroups.value.find(g => g.id === selectedGroup.groupId)
    if (!group || group.productIds.length === 0) return
    
    const groupProducts = store.products.filter(p => group.productIds.includes(p.id))
    if (groupProducts.length === 0) return
    
    // 组合中所有产品重量相同，取第一个产品的重量
    const productWeight = groupProducts[0].weight
    // 组合重量 = 单个产品重量 * 组合数量
    weight += productWeight * selectedGroup.quantity
  })
  
  return weight
})

// 总金额计算：包含单个商品和组合商品
const totalAmount = computed(() => {
  let amount = form.value.items.reduce((sum, item) => sum + item.quantity * item.price, 0)
  
  // 加上组合商品的金额
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
      amount += quantity * product.price
    })
  })
  
  return amount
})

// 计算促销活动的触发数量（支持条件产品组合）
const getPromotionQuantity = (promotion: any) => {
  const items = finalItemsComputed.value
  
  // 优先使用 conditionDetails（新格式）
  if (promotion.conditionDetails && promotion.conditionDetails.length > 0) {
    // 计算所有条件的总数量（直接返回订单中满足条件的实际数量，不乘以倍数）
    let totalConditionQuantity = 0
    
    promotion.conditionDetails.forEach((condition: any) => {
      if (condition.type === 'product') {
        // 单个产品：查找订单中该产品的数量
        const orderItem = items.find((item: any) => item.productId === condition.productId)
        if (orderItem) {
          // 直接累加订单中该产品的实际数量
          totalConditionQuantity += orderItem.quantity
        }
      } else if (condition.type === 'group') {
        // 组合：查找订单中该组合的所有产品
        const group = productGroups.value.find(g => g.id === condition.groupId)
        if (group) {
          // 计算组合中所有产品的总数量
          const groupTotalQuantity = group.productIds.reduce((sum: number, productId: string) => {
            const orderItem = items.find((item: any) => item.productId === productId)
            return sum + (orderItem?.quantity || 0)
          }, 0)
          // 直接累加组合的总数量
          totalConditionQuantity += groupTotalQuantity
        }
      }
    })
    
    return totalConditionQuantity
  }
  
  // 旧格式：向后兼容
  // 如果没有指定条件产品，使用所有产品的总数量
  if (!promotion.conditionProducts || promotion.conditionProducts.length === 0) {
    return totalQuantity.value
  }
  
  // 计算条件产品组合的总数量
  return items
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
      // 计算最小阈值（用于显示）
      const minThreshold = promotion.conditionDetails && promotion.conditionDetails.length > 0
        ? Math.min(...promotion.conditionDetails.map((c: any) => c.quantity))
        : promotion.threshold
      const times = Math.floor(conditionQuantity / minThreshold)
      if (times > 0) {
        // 合并相同类型的赠品
        const giftMap = new Map<string, number>()
        
        promotion.gifts.forEach(g => {
          let key: string
          // 新格式：按类型合并
          if (g.type) {
            key = `${g.type}（随机分配）`
          } else {
            // 旧格式：按产品名称合并
            key = g.productName || g.productId || ''
          }
          
          const quantity = g.quantity * times
          const existingQuantity = giftMap.get(key) || 0
          giftMap.set(key, existingQuantity + quantity)
        })
        
        // 转换为数组
        const mergedGifts = Array.from(giftMap.entries()).map(([productName, quantity]) => ({
          productName,
          quantity
        }))
        
        promotions.push({
          name: promotion.name,
          gifts: mergedGifts
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
  
  // 检查是否有选择商品或组合
  if (form.value.items.length === 0 && selectedGroups.value.length === 0) {
    uni.showToast({ title: '请选择商品或组合', icon: 'none' })
    return
  }
  
  // 如果选择了组合，跳过整车检查
  if (selectedGroups.value.length === 0) {
    // 整车检查提示（仅单个商品模式）
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
    
    // 超载提醒（仅提醒，允许继续开单）
    if (truckStatus.value === 'overload' && currentTruckType.value) {
      const overloadAmount = totalWeight.value - currentTruckType.value.maxWeight
      const result = await new Promise<boolean>((resolve) => {
        uni.showModal({
          title: '⚠️ 超载提醒',
          content: `当前重量 ${totalWeight.value.toLocaleString()}kg，已超载 ${overloadAmount.toLocaleString()}kg（限制：${currentTruckType.value.maxWeight.toLocaleString()}kg），是否继续开单？`,
          confirmText: '继续开单',
          confirmColor: '#FF4D4F',
          cancelText: '取消',
          success: (res) => resolve(res.confirm)
        })
      })
      if (!result) return
    }
  }
  
  const agent = selectedAgent.value!
  
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
  
  // 计算最终的总重量和总金额
  const finalTotalWeight = finalItems.reduce((sum, item) => sum + item.quantity * item.weight, 0)
  const finalTotalAmount = finalItems.reduce((sum, item) => sum + item.quantity * item.price, 0)
  
  // 计算赠品（支持多个促销活动）
  let giftItems: any[] = []
  const giftMap = new Map<string, number>() // 用于合并相同商品的赠品数量
  
  if (form.value.promotionIds && form.value.promotionIds.length > 0) {
    form.value.promotionIds.forEach(promotionId => {
      const promotion = store.promotions.find(p => p.id === promotionId)
      if (promotion) {
        // 计算条件产品组合的数量（使用 getPromotionQuantity 函数）
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
              // quantity 是组合的总数量（组合内所有商品的总件数）
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
      }
    })
    
    // 转换为数组格式
    giftItems = Array.from(giftMap.entries()).map(([key, quantity]) => {
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
  
  try {
    await store.createOrder({
      agentId: form.value.agentId,
      agentName: agent.name,
      items: finalItems,
      totalWeight: finalTotalWeight,
      totalAmount: finalTotalAmount,
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
  
  &--info {
    background: rgba($primary-color, 0.1);
    color: $primary-color;
  }
  
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

.product-select-section {
  margin-bottom: 32rpx;
}

.product-group-select-section {
  margin-top: 32rpx;
  padding-top: 32rpx;
  border-top: 1rpx solid $border-color;
}

.section-subtitle {
  font-size: 26rpx;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 16rpx;
  display: block;
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
  
  &--disabled {
    opacity: 0.5;
    background: $bg-grey;
    
    .product-select-item__left {
      pointer-events: none;
      cursor: not-allowed;
    }
    
    .product-select-item__check {
      background: $bg-grey;
      border-color: $border-color;
      opacity: 0.5;
    }
    
    .product-select-item__name {
      color: $text-placeholder;
    }
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
  width: 135rpx;
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

