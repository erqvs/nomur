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
          <view v-for="(gift, idx) in getDisplayGifts(promo.gifts)" :key="idx" class="gift-tag">
            {{ gift.name }} x{{ gift.quantity }}
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
              <view v-if="conditionProductGroups.length === 0" class="empty-groups">
                <text class="empty-text">暂无产品组合，请先在"组合管理"页面创建组合</text>
              </view>
              <view v-else class="group-select">
                <view 
                  v-for="group in conditionProductGroups"
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
            
            <!-- 产品组合选择模式 -->
            <view v-else class="product-group-select">
              <text class="form-desc">选择产品组合作为赠品</text>
              <view v-if="giftProductGroups.length === 0" class="empty-groups">
                <text class="empty-text">暂无产品组合，请先在"组合管理"页面创建组合</text>
              </view>
              <view v-else class="group-select">
                <view 
                  v-for="group in giftProductGroups"
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
                        {{ getGiftGroupProductNames(group.id).join('、') }}
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
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { promotionApi, productGroupApi } from '@/api'
import type { ProductGroup } from '@/types'

const store = useAppStore()

const promotions = computed(() => store.promotions)
const products = computed(() => store.products)

const showAddModal = ref(false)
const isDatePickerOpen = ref(false)

// 触发条件产品选择模式
const useConditionGroupMode = ref(false)

// 赠品选择模式
const useGiftGroupMode = ref(false)

// 产品组合列表（触发条件）
const conditionProductGroups = ref<ProductGroup[]>([])

// 产品组合列表（赠品）
const giftProductGroups = ref<ProductGroup[]>([])

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
  gifts: [] as Array<{ productId: string; quantity: number }>, // 赠品（单个产品模式）
  giftGroups: [] as Array<{ groupId: string; quantity: number }>, // 赠品组合（组合模式）
  startDate: '',
  endDate: ''
})

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

// 加载产品组合列表
const loadConditionProductGroups = async () => {
  try {
    const groups = await productGroupApi.getAll()
    conditionProductGroups.value = groups
    giftProductGroups.value = groups
  } catch (error) {
    console.error('加载产品组合失败:', error)
    uni.showToast({ title: '加载产品组合失败', icon: 'none' })
  }
}

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
  const group = conditionProductGroups.value.find(g => g.id === groupId)
  if (!group) return []
  return group.productIds.map(productId => {
    const product = products.value.find(p => p.id === productId)
    return product?.name || productId
  })
}

// 获取组合中的商品名称（赠品）
const getGiftGroupProductNames = (groupId: string) => {
  const group = giftProductGroups.value.find(g => g.id === groupId)
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

// 处理赠品显示：如果是组合赠品，合并显示；如果是单个产品，正常显示
const getDisplayGifts = (gifts: any[]) => {
  if (!gifts || gifts.length === 0) return []
  
  // 检查是否有组合赠品（有 type 和 productIds 字段）
  const hasGroupGifts = gifts.some(g => g.type && g.productIds && Array.isArray(g.productIds) && g.productIds.length > 0)
  
  if (hasGroupGifts) {
    // 组合赠品：按 type 分组，合并显示
    // 注意：同一个组合的多个产品项有相同的 type 和 quantity，所以只取第一个的数量
    const groupMap = new Map<string, { name: string; quantity: number }>()
    
    gifts.forEach(gift => {
      if (gift.type && gift.productIds && Array.isArray(gift.productIds) && gift.productIds.length > 0) {
        // 这是组合赠品
        if (!groupMap.has(gift.type)) {
          // 第一次遇到这个组合，记录名称和数量
          groupMap.set(gift.type, {
            name: gift.type, // 组合名称
            quantity: gift.quantity || 0
          })
        }
      } else {
        // 这是单个产品赠品
        const key = gift.productId || gift.productName || ''
        if (!groupMap.has(`single_${key}`)) {
          groupMap.set(`single_${key}`, {
            name: gift.productName || gift.productId || '',
            quantity: gift.quantity || 0
          })
        } else {
          // 如果同一个产品出现多次，累加数量
          const existing = groupMap.get(`single_${key}`)!
          existing.quantity += (gift.quantity || 0)
        }
      }
    })
    
    // 转换为数组
    return Array.from(groupMap.values())
  } else {
    // 没有组合赠品，正常显示每个产品
    return gifts.map(gift => ({
      name: gift.productName || gift.productId || '',
      quantity: gift.quantity || 0
    }))
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
      // 重要：quantity 表示组合内所有商品的总数量，而不是每个商品的数量
      selectedGiftGroups.value.forEach(giftGroup => {
        const group = giftProductGroups.value.find(g => g.id === giftGroup.groupId)
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
      // 单个模式：直接使用选中的产品
      gifts = form.value.gifts.map(gift => {
        const product = products.value.find(p => p.id === gift.productId)
        return {
          productId: gift.productId,
          productName: product?.name || '',
          quantity: gift.quantity
        }
      })
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
        const group = conditionProductGroups.value.find(g => g.id === selectedGroup.groupId)
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
    
    await promotionApi.create({
      name: form.value.name,
      description: form.value.description,
      threshold: minThreshold, // 使用最小阈值（向后兼容）
      conditionProducts: finalConditionProducts,
      conditionGroupId,
      conditionDetails, // 新增：条件详情
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
      gifts: [],
      giftGroups: [],
      startDate: '',
      endDate: ''
    }
    selectedConditionProducts.value = []
    selectedConditionGroups.value = []
    selectedGiftGroups.value = []
    useConditionGroupMode.value = false
    useGiftGroupMode.value = false
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

// 页面加载时获取产品组合列表
onMounted(async () => {
  await loadConditionProductGroups()
})
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

