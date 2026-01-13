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
      
      <!-- 触发条件产品选择（支持组合） -->
      <view class="form-item">
        <view class="section-header">
          <text class="form-label">触发条件产品</text>
          <view class="mode-switch">
            <view 
              class="mode-switch__item"
              :class="{ 'mode-switch__item--active': !useConditionGroupMode }"
              @tap="useConditionGroupMode = false"
            >
              单个
            </view>
            <view 
              class="mode-switch__item"
              :class="{ 'mode-switch__item--active': useConditionGroupMode }"
              @tap="useConditionGroupMode = true"
            >
              组合
            </view>
          </view>
        </view>
        
        <!-- 单个产品选择模式 -->
        <view v-if="!useConditionGroupMode" class="product-select">
          <view 
            v-for="product in products" 
            :key="product.id"
            class="product-select-item"
            :class="{ 'product-select-item--active': isConditionProductSelected(product.id) }"
          >
            <view class="product-select-item__left" @tap="toggleConditionProductSelection(product.id)">
              <view class="product-select-item__check">
                <text v-if="isConditionProductSelected(product.id)">✓</text>
              </view>
              <text class="product-select-item__name">{{ product.name }}</text>
            </view>
            <view v-if="isConditionProductSelected(product.id)" class="product-select-item__quantity" @tap.stop>
              <view class="quantity-control">
                <view class="quantity-btn quantity-btn--small" @tap="changeConditionProductQuantity(product.id, -1)">-</view>
                <input 
                  type="number" 
                  :value="getConditionProductQuantity(product.id)" 
                  class="quantity-input quantity-input--small"
                  @input="(e: any) => setConditionProductQuantity(product.id, Number(e.detail?.value ?? (e.target as HTMLInputElement)?.value ?? 0))"
                />
                <view class="quantity-btn quantity-btn--small" @tap="changeConditionProductQuantity(product.id, 1)">+</view>
              </view>
            </view>
          </view>
        </view>
        
        <!-- 产品组合选择模式 -->
        <view v-else class="product-group-select">
          <text class="form-desc">选择产品组合作为触发条件</text>
          <view v-if="productGroups.length === 0" class="empty-groups">
            <text class="empty-text">暂无产品组合，请先在"组合管理"页面创建组合</text>
          </view>
          <view v-else class="group-select">
            <view 
              v-for="group in productGroups"
              :key="group.id"
              class="group-select-item"
              :class="{ 'group-select-item--active': isConditionGroupSelected(group.id) }"
            >
              <view class="group-select-item__left" @tap="toggleConditionGroupSelection(group.id)">
                <view class="group-select-item__check">
                  <text v-if="isConditionGroupSelected(group.id)">✓</text>
                </view>
                <view class="group-select-item__info">
                  <text class="group-select-item__name">{{ group.name }}</text>
                  <text class="group-select-item__products">
                    {{ getGroupProductNames(group.id).join('、') }}
                  </text>
                </view>
              </view>
              <view v-if="isConditionGroupSelected(group.id)" class="group-select-item__quantity" @tap.stop>
                <view class="quantity-control">
                  <view class="quantity-btn quantity-btn--small" @tap="changeConditionGroupQuantity(group.id, -1)">-</view>
                  <input 
                    type="number" 
                    :value="getConditionGroupQuantity(group.id)" 
                    class="quantity-input quantity-input--small"
                    @input="(e: any) => setConditionGroupQuantity(group.id, Number(e.detail?.value ?? (e.target as HTMLInputElement)?.value ?? 0))"
                  />
                  <view class="quantity-btn quantity-btn--small" @tap="changeConditionGroupQuantity(group.id, 1)">+</view>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 赠品选择 -->
      <view class="form-item">
        <view class="section-header">
          <text class="form-label">赠品选择</text>
          <view class="mode-switch">
            <view 
              class="mode-switch__item"
              :class="{ 'mode-switch__item--active': !useGiftGroupMode }"
              @tap="useGiftGroupMode = false"
            >
              单个
            </view>
            <view 
              class="mode-switch__item"
              :class="{ 'mode-switch__item--active': useGiftGroupMode }"
              @tap="useGiftGroupMode = true"
            >
              组合
            </view>
          </view>
        </view>
        
        <!-- 单个产品选择模式 -->
        <view v-if="!useGiftGroupMode" class="product-select">
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
        
        <!-- 产品组合选择模式 -->
        <view v-else class="product-group-select">
          <text class="form-desc">选择产品组合作为赠品</text>
          <view v-if="productGroups.length === 0" class="empty-groups">
            <text class="empty-text">暂无产品组合，请先在"组合管理"页面创建组合</text>
          </view>
          <view v-else class="group-select">
            <view 
              v-for="group in productGroups"
              :key="group.id"
              class="group-select-item"
              :class="{ 'group-select-item--active': isGiftGroupSelected(group.id) }"
            >
              <view class="group-select-item__left" @tap="toggleGiftGroupSelection(group.id)">
                <view class="group-select-item__check">
                  <text v-if="isGiftGroupSelected(group.id)">✓</text>
                </view>
                <view class="group-select-item__info">
                  <text class="group-select-item__name">{{ group.name }}</text>
                  <text class="group-select-item__products">
                    {{ getGroupProductNames(group.id).join('、') }}
                  </text>
                </view>
              </view>
              <view v-if="isGiftGroupSelected(group.id)" class="group-select-item__quantity" @tap.stop>
                <view class="quantity-control">
                  <view class="quantity-btn quantity-btn--small" @tap="changeGiftGroupQuantity(group.id, -1)">-</view>
                  <input 
                    type="number" 
                    :value="getGiftGroupQuantity(group.id)" 
                    class="quantity-input quantity-input--small"
                    @input="(e: any) => setGiftGroupQuantity(group.id, Number(e.detail?.value ?? (e.target as HTMLInputElement)?.value ?? 0))"
                  />
                  <view class="quantity-btn quantity-btn--small" @tap="changeGiftGroupQuantity(group.id, 1)">+</view>
                </view>
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

// 触发条件产品选择模式
const useConditionGroupMode = ref(false)

// 赠品选择模式
const useGiftGroupMode = ref(false)

// 选中的触发条件组合
interface SelectedConditionGroup {
  groupId: string
  quantity: number
}
const selectedConditionGroups = ref<SelectedConditionGroup[]>([])

// 选中的触发条件单个产品（带数量）
interface SelectedConditionProduct {
  productId: string
  quantity: number
}
const selectedConditionProducts = ref<SelectedConditionProduct[]>([])

// 选中的赠品组合
interface SelectedGiftGroup {
  groupId: string
  quantity: number
}
const selectedGiftGroups = ref<SelectedGiftGroup[]>([])

const form = ref({
  name: '',
  description: '',
  conditionGroupId: '' as string | undefined, // 触发条件的组合ID（向后兼容）
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

// 触发条件产品相关方法（单个模式）
const isConditionProductSelected = (productId: string) => {
  return selectedConditionProducts.value.some(p => p.productId === productId)
}

const toggleConditionProductSelection = (productId: string) => {
  uni.vibrateShort({ type: 'light' })
  const index = selectedConditionProducts.value.findIndex(p => p.productId === productId)
  if (index > -1) {
    selectedConditionProducts.value.splice(index, 1)
  } else {
    selectedConditionProducts.value.push({
      productId,
      quantity: 100 // 默认100件
    })
  }
}

const getConditionProductQuantity = (productId: string) => {
  const product = selectedConditionProducts.value.find(p => p.productId === productId)
  return product?.quantity || 100
}

const setConditionProductQuantity = (productId: string, quantity: number) => {
  const product = selectedConditionProducts.value.find(p => p.productId === productId)
  if (product) {
    product.quantity = Math.max(1, quantity || 1)
  }
}

const changeConditionProductQuantity = (productId: string, delta: number) => {
  const product = selectedConditionProducts.value.find(p => p.productId === productId)
  if (product) {
    product.quantity = Math.max(1, product.quantity + delta)
  }
}

// 触发条件组合相关方法（组合模式）
const isConditionGroupSelected = (groupId: string) => {
  return selectedConditionGroups.value.some(g => g.groupId === groupId)
}

const toggleConditionGroupSelection = (groupId: string) => {
  uni.vibrateShort({ type: 'light' })
  const index = selectedConditionGroups.value.findIndex(g => g.groupId === groupId)
  if (index > -1) {
    selectedConditionGroups.value.splice(index, 1)
  } else {
    selectedConditionGroups.value.push({
      groupId,
      quantity: 100 // 默认100件
    })
  }
}

const getConditionGroupQuantity = (groupId: string) => {
  const group = selectedConditionGroups.value.find(g => g.groupId === groupId)
  return group?.quantity || 100
}

const setConditionGroupQuantity = (groupId: string, quantity: number) => {
  const group = selectedConditionGroups.value.find(g => g.groupId === groupId)
  if (group) {
    group.quantity = Math.max(1, quantity || 1)
  }
}

const changeConditionGroupQuantity = (groupId: string, delta: number) => {
  const group = selectedConditionGroups.value.find(g => g.groupId === groupId)
  if (group) {
    group.quantity = Math.max(1, group.quantity + delta)
  }
}

// 获取组合中的商品名称（触发条件）
const getGroupProductNames = (groupId: string) => {
  const group = productGroups.value.find(g => g.id === groupId)
  if (!group) return []
  return group.productIds.map(productId => {
    const product = products.value.find(p => p.id === productId)
    return product?.name || productId
  })
}

// 获取组合中的商品名称（赠品）
const getGiftGroupProductNames = (groupId: string) => {
  const group = productGroups.value.find(g => g.id === groupId)
  if (!group) return []
  return group.productIds.map(productId => {
    const product = products.value.find(p => p.id === productId)
    return product?.name || productId
  })
}

// 赠品组合相关方法
const isGiftGroupSelected = (groupId: string) => {
  return selectedGiftGroups.value.some(g => g.groupId === groupId)
}

const toggleGiftGroupSelection = (groupId: string) => {
  uni.vibrateShort({ type: 'light' })
  const index = selectedGiftGroups.value.findIndex(g => g.groupId === groupId)
  if (index > -1) {
    selectedGiftGroups.value.splice(index, 1)
  } else {
    selectedGiftGroups.value.push({
      groupId,
      quantity: 1 // 默认1箱
    })
  }
}

const getGiftGroupQuantity = (groupId: string) => {
  const group = selectedGiftGroups.value.find(g => g.groupId === groupId)
  return group?.quantity || 1
}

const setGiftGroupQuantity = (groupId: string, quantity: number) => {
  const group = selectedGiftGroups.value.find(g => g.groupId === groupId)
  if (group) {
    group.quantity = Math.max(1, quantity || 1)
  }
}

const changeGiftGroupQuantity = (groupId: string, delta: number) => {
  const group = selectedGiftGroups.value.find(g => g.groupId === groupId)
  if (group) {
    group.quantity = Math.max(1, group.quantity + delta)
  }
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
  
  // 确保产品组合已加载
  await loadProductGroups()
  
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
        // 注意：需要等待 giftTypes 计算完成
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
            // 确保 giftTypes 已经计算
            const typeInfo = giftTypes.value.find(t => t.name === type)
            return {
              type: type,
              quantity: g.quantity,
              productIds: typeInfo ? typeInfo.products.map(p => p.id) : [g.productId]
            }
          }
          return null
        }).filter((g: any) => g !== null)
        
        const conditionGroupId = (promo as any).conditionGroupId || ''
        
        form.value = {
          name: promo.name,
          description: promo.description || '',
          conditionGroupId,
          gifts: convertedGifts,
          startDate: formatDateForPicker(promo.startDate),
          endDate: formatDateForPicker(promo.endDate)
        }
        
        // 优先使用 conditionDetails，如果没有则使用旧格式
        const conditionDetails = (promo as any).conditionDetails || []
        
        if (conditionDetails && conditionDetails.length > 0) {
          // 新格式：使用 conditionDetails
          const hasGroup = conditionDetails.some((d: any) => d.type === 'group')
          useConditionGroupMode.value = hasGroup
          
          if (hasGroup) {
            // 组合模式
            selectedConditionGroups.value = conditionDetails
              .filter((d: any) => d.type === 'group')
              .map((d: any) => ({
                groupId: d.groupId,
                quantity: d.quantity || promo.threshold || 100
              }))
          } else {
            // 单个模式
            selectedConditionProducts.value = conditionDetails
              .filter((d: any) => d.type === 'product')
              .map((d: any) => ({
                productId: d.productId,
                quantity: d.quantity || promo.threshold || 100
              }))
          }
        } else {
          // 旧格式：向后兼容
          if (conditionGroupId) {
            useConditionGroupMode.value = true
            const group = productGroups.value.find(g => g.id === conditionGroupId)
            if (group) {
              selectedConditionGroups.value = [{
                groupId: conditionGroupId,
                quantity: promo.threshold || 100
              }]
            }
          } else {
            useConditionGroupMode.value = false
            const conditionProducts = (promo.conditionProducts as string[]) || []
            selectedConditionProducts.value = conditionProducts.map(productId => ({
              productId,
              quantity: promo.threshold || 100
            }))
          }
        }
        
        // 判断赠品是否来自组合
        // 方法1：检查是否有groupId字段（新保存的组合赠品会有这个字段）
        // 方法2：检查type是否匹配某个产品组合的名称，且productIds匹配组合的产品列表
        const hasGiftGroup = convertedGifts.some((g: any) => g.groupId)
        
        if (hasGiftGroup) {
          // 方法1：有groupId字段，直接使用
          useGiftGroupMode.value = true
          const giftGroupMap = new Map<string, number>()
          convertedGifts.forEach((g: any) => {
            if (g.groupId) {
              const existing = giftGroupMap.get(g.groupId)
              if (existing) {
                giftGroupMap.set(g.groupId, existing + g.quantity)
              } else {
                giftGroupMap.set(g.groupId, g.quantity)
              }
            }
          })
          selectedGiftGroups.value = Array.from(giftGroupMap.entries()).map(([groupId, quantity]) => ({
            groupId,
            quantity
          }))
        } else {
          // 方法2：检查type是否匹配产品组合名称
          // 等待产品组合列表加载完成
          await loadProductGroups()
          
          // 检查赠品的type是否匹配某个产品组合的名称
          const matchedGroups: Array<{ groupId: string; quantity: number }> = []
          const processedTypes = new Set<string>()
          
          convertedGifts.forEach((g: any) => {
            if (g.type && !processedTypes.has(g.type)) {
              // 查找名称匹配的组合
              const matchedGroup = productGroups.value.find(group => group.name === g.type)
              if (matchedGroup) {
                // 检查productIds是否匹配
                const giftProductIds = (g.productIds || []).sort()
                const groupProductIds = matchedGroup.productIds.sort()
                if (giftProductIds.length === groupProductIds.length && 
                    giftProductIds.every((id: string, idx: number) => id === groupProductIds[idx])) {
                  // 匹配成功，这是组合赠品
                  matchedGroups.push({
                    groupId: matchedGroup.id,
                    quantity: g.quantity || 1
                  })
                  processedTypes.add(g.type)
                }
              }
            }
          })
          
          if (matchedGroups.length > 0) {
            // 找到匹配的组合，使用组合模式
            useGiftGroupMode.value = true
            selectedGiftGroups.value = matchedGroups
          } else {
            // 没有匹配的组合，使用单个模式（类型选择）
            useGiftGroupMode.value = false
            // form.value.gifts 已经在上面填充了，不需要额外操作
          }
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
  // 检查是否选择了触发条件
  if (!useConditionGroupMode.value && selectedConditionProducts.value.length === 0) {
    uni.showToast({ title: '请选择触发条件产品', icon: 'none' })
    return
  }
  if (useConditionGroupMode.value && selectedConditionGroups.value.length === 0) {
    uni.showToast({ title: '请选择触发条件组合', icon: 'none' })
    return
  }
  
  // 验证触发条件数量
  if (!useConditionGroupMode.value) {
    for (const product of selectedConditionProducts.value) {
      if (!product.quantity || product.quantity <= 0) {
        uni.showToast({ title: '请设置所有触发条件产品的数量', icon: 'none' })
        return
      }
    }
  } else {
    for (const group of selectedConditionGroups.value) {
      if (!group.quantity || group.quantity <= 0) {
        uni.showToast({ title: '请设置所有触发条件组合的数量', icon: 'none' })
        return
      }
    }
  }
  
  // 检查是否选择了赠品
  if (!useGiftGroupMode.value && form.value.gifts.length === 0) {
    uni.showToast({ title: '请至少选择一个赠品', icon: 'none' })
    return
  }
  if (useGiftGroupMode.value && selectedGiftGroups.value.length === 0) {
    uni.showToast({ title: '请至少选择一个赠品组合', icon: 'none' })
    return
  }
  
  // 验证每个赠品的数量
  if (!useGiftGroupMode.value) {
    for (const gift of form.value.gifts) {
      if (!gift.quantity || gift.quantity <= 0) {
        uni.showToast({ title: '请设置所有赠品的数量', icon: 'none' })
        return
      }
    }
  } else {
    for (const giftGroup of selectedGiftGroups.value) {
      if (!giftGroup.quantity || giftGroup.quantity <= 0) {
        uni.showToast({ title: '请设置所有赠品组合的数量', icon: 'none' })
        return
      }
    }
  }
  
  try {
    // 构造gifts数组
    let gifts: any[] = []
    
    if (useGiftGroupMode.value) {
      // 组合模式：每个组合只创建一条赠品记录，数量为组合总数量
      selectedGiftGroups.value.forEach(giftGroup => {
        const group = productGroups.value.find(g => g.id === giftGroup.groupId)
        if (group) {
          // 组合赠品：只创建一条记录，quantity 是组合的总数量，需要分配给组合中的所有产品
          gifts.push({
            type: group.name, // 使用组合名称作为类型
            quantity: giftGroup.quantity, // 组合总数量（需要分配给组合中的所有产品）
            productIds: group.productIds, // 组合中的所有产品ID
            groupId: giftGroup.groupId, // 标记来自组合
            // 兼容字段：保留第一个产品ID和名称（用于向后兼容）
            productId: group.productIds[0] || '',
            productName: group.productIds.length > 0 
              ? products.value.find(p => p.id === group.productIds[0])?.name || group.name
              : group.name
          })
        }
      })
    } else {
      // 单个模式：使用产品类型
      gifts = form.value.gifts.map(gift => ({
        type: gift.type,
        quantity: gift.quantity,
        productIds: gift.productIds,
        // 兼容字段：保留第一个产品ID和名称（用于向后兼容）
        productId: gift.productIds[0] || '',
        productName: gift.productIds.length > 0 
          ? products.value.find(p => p.id === gift.productIds[0])?.name || gift.type
          : gift.type
      }))
    }
    
    // 根据模式设置触发条件
    // 计算最小阈值（取所有条件中的最小值）
    let minThreshold = 100
    let finalConditionProducts: string[] = []
    let conditionGroupId: string | undefined = undefined
    let conditionDetails: Array<{ type: 'product' | 'group'; productId?: string; groupId?: string; quantity: number }> = []
    
    if (useConditionGroupMode.value) {
      // 组合模式：将选中的组合中的所有产品ID合并
      selectedConditionGroups.value.forEach(selectedGroup => {
        const group = productGroups.value.find(g => g.id === selectedGroup.groupId)
        if (group) {
          finalConditionProducts = [...finalConditionProducts, ...group.productIds]
          minThreshold = Math.min(minThreshold, selectedGroup.quantity)
          conditionDetails.push({
            type: 'group',
            groupId: selectedGroup.groupId,
            quantity: selectedGroup.quantity
          })
        }
      })
      // 如果有多个组合，使用第一个组合的ID（向后兼容）
      if (selectedConditionGroups.value.length > 0) {
        conditionGroupId = selectedConditionGroups.value[0].groupId
      }
    } else {
      // 单个模式：直接使用选中的产品ID
      selectedConditionProducts.value.forEach(product => {
        finalConditionProducts.push(product.productId)
        minThreshold = Math.min(minThreshold, product.quantity)
        conditionDetails.push({
          type: 'product',
          productId: product.productId,
          quantity: product.quantity
        })
      })
    }
    
    await promotionApi.update(promotionId.value, {
      name: form.value.name,
      description: form.value.description,
      threshold: minThreshold, // 使用最小阈值（向后兼容）
      conditionProducts: finalConditionProducts,
      conditionGroupId,
      conditionDetails, // 新增：条件详情
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

// 切换按钮样式
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.mode-switch {
  display: flex;
  background: $bg-grey;
  border-radius: 8rpx;
  padding: 4rpx;
  gap: 4rpx;
  
  &__item {
    padding: 8rpx 20rpx;
    border-radius: 6rpx;
    font-size: 24rpx;
    color: $text-secondary;
    transition: all 0.2s ease;
    
    &--active {
      background: $primary-color;
      color: #fff;
    }
  }
}

// 组合选择样式
.product-group-select {
  margin-top: 16rpx;
}

.group-select {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
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
    flex-shrink: 0;
    
    .group-select-item--active & {
      background: $primary-color;
      border-color: $primary-color;
      color: #fff;
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

.empty-groups {
  padding: 40rpx 20rpx;
  text-align: center;
  
  .empty-text {
    font-size: 26rpx;
    color: $text-placeholder;
  }
}

.form-desc {
  font-size: 24rpx;
  color: $text-secondary;
  margin-bottom: 16rpx;
  line-height: 1.5;
}
</style>

