<template>
  <view class="finance-page">
    <!-- 快捷操作 -->
    <view class="quick-actions">
      <view class="quick-action-btn" @tap="showRechargeModal = true">
        <image src="/static/icons/arrow-down-circle.svg" class="quick-action-icon" mode="aspectFit" />
        <text class="quick-action-btn__text">充值</text>
      </view>
      <view class="quick-action-btn quick-action-btn--danger" @tap="showDeductModal = true">
        <image src="/static/icons/arrow-up-circle.svg" class="quick-action-icon" mode="aspectFit" />
        <text class="quick-action-btn__text">扣款</text>
      </view>
      <view class="quick-action-btn quick-action-btn--teal" @tap="showTransferModal = true">
        <image src="/static/icons/refresh-cw.svg" class="quick-action-icon" mode="aspectFit" />
        <text class="quick-action-btn__text">调货</text>
      </view>
    </view>
    
    <!-- 筛选 -->
    <view class="filter-bar">
      <view 
        v-for="type in filterTypes" 
        :key="type.value"
        class="filter-item"
        :class="{ 'filter-item--active': currentFilter === type.value }"
        @tap="currentFilter = type.value"
      >
        {{ type.label }}
      </view>
    </view>
    
    <!-- 交易列表 -->
    <view class="transaction-list">
      <view 
        v-for="tx in filteredTransactions" 
        :key="tx.id"
        class="transaction-card"
      >
        <view class="transaction-card__header">
          <view class="transaction-card__icon">
            <image :src="getIcon(tx.reason)" class="tx-icon" mode="aspectFit" />
          </view>
          <view class="transaction-card__info">
            <text class="transaction-card__agent" @tap.stop="goToAgentDetail(tx.agentId)">{{ tx.agentName }}</text>
            <text class="transaction-card__reason">{{ getLabel(tx.reason) }}</text>
            <text v-if="tx.type === 'recharge' && tx.reason === 'payment' && tx.paymentAccountName" 
                  class="transaction-card__payee" 
                  @tap.stop="goToPayeeDetail(tx.paymentAccountId!, tx.paymentAccountName!)">
              收款人：{{ tx.paymentAccountName }}
            </text>
            <view v-if="tx.reason === 'shipping' && tx.orderItems && tx.orderItems.length > 0" class="transaction-card__order-items">
              <text v-for="(item, idx) in tx.orderItems" :key="idx" class="order-item-tag">
                {{ item.productName }} x{{ item.quantity }}
              </text>
            </view>
          </view>
          <view class="transaction-card__right">
            <text 
              class="transaction-card__amount"
              :class="{ 
                'amount-positive': tx.amount > 0,
                'amount-negative': tx.amount < 0
              }"
            >
              {{ tx.amount > 0 ? '+' : '' }}¥{{ Math.abs(tx.amount).toLocaleString() }}
            </text>
            <!-- 凭证缩略图（支持多张） -->
            <view v-if="getProofImages(tx.proof).length > 0" class="transaction-card__proof-thumbnails">
              <view 
                v-for="(proofUrl, index) in getProofImages(tx.proof).slice(0, 3)" 
                :key="index"
                class="transaction-card__proof-thumbnail"
                @tap.stop="previewProof(getProofImages(tx.proof), index)"
              >
                <image :src="proofUrl" class="proof-thumbnail-img" mode="aspectFill" />
                <view class="proof-thumbnail-badge">
                  <image src="/static/icons/eye.svg" class="proof-badge-icon" mode="aspectFit" />
                </view>
              </view>
              <view v-if="getProofImages(tx.proof).length > 3" class="proof-more-badge">
                <text>+{{ getProofImages(tx.proof).length - 3 }}</text>
              </view>
            </view>
          </view>
        </view>
        
        <view class="transaction-card__footer">
          <view class="transaction-card__time-wrapper">
            <text class="transaction-card__time">{{ formatTime(tx.createdAt) }}</text>
          </view>
          <view class="transaction-card__actions">
            <view class="transaction-card__edit-btn" @tap.stop="editTransaction(tx)">
              <text class="edit-btn-text">✏️ 修改</text>
            </view>
            <view class="transaction-card__delete-btn" @tap.stop="deleteTransaction(tx)">
              <text class="delete-btn-text">🗑️ 删除</text>
            </view>
          </view>
        </view>
      </view>
      
      <view v-if="filteredTransactions.length === 0" class="empty-state">
        <image src="/static/icons/file-text.svg" class="empty-icon" mode="aspectFit" />
        <text class="empty-text">暂无交易记录</text>
      </view>
    </view>
    
    <!-- 自定义TabBar -->
    <CustomTabBar />
    
    <!-- 充值弹窗 -->
    <view v-if="showRechargeModal" class="modal-mask" @tap="showRechargeModal = false">
      <view class="modal-content" @tap.stop="stopPropagation">
        <text class="modal-title">充值</text>
        
        <view class="modal-form">
          <text class="modal-label">选择代理</text>
          <TagSelect
            v-model="rechargeForm.agentId"
            :options="agentOptions"
            :compact="true"
          />
          
          <text class="modal-label">充值原因</text>
          <view class="reason-grid">
            <view 
              class="reason-item"
              :class="{ 'reason-item--active': rechargeForm.reason === 'payment' }"
              @tap="selectRechargeReason('payment')"
            >
              代理打款
            </view>
            <view 
              class="reason-item"
              :class="{ 'reason-item--active': rechargeForm.reason === 'freight' }"
              @tap="selectRechargeReason('freight')"
            >
              运费
            </view>
            <view 
              class="reason-item"
              :class="{ 'reason-item--active': rechargeForm.reason === 'gift' }"
              @tap="selectRechargeReason('gift')"
            >
              赠送
            </view>
          </view>
          
          <view v-if="rechargeForm.reason === 'payment'" class="payment-account-select">
            <text class="modal-label">选择收款账户</text>
            <TagSelect
              v-model="rechargeForm.paymentAccountId"
              :options="paymentAccountOptions"
              :compact="true"
            />
          </view>
          
          <view class="form-item">
            <text class="modal-label">备注（可选）</text>
            <input 
              v-model="rechargeForm.remark" 
              class="remark-input-field"
              placeholder="请输入备注信息"
            />
          </view>
          
          <QuickInput
            v-model="rechargeForm.amount"
            label="充值金额"
            type="digit"
            prefix="¥"
            :showQuickNumbers="true"
            :quickNumbers="[1000, 5000, 10000, 50000]"
            :allowDecimal="false"
          />
          
          <ImageUploader
            v-model="rechargeForm.proof"
            label="上传凭证"
            tip="每次上传一张，可重复上传"
            addText="上传凭证"
          />
        </view>
        
        <view class="modal-actions">
          <view class="modal-btn modal-btn--cancel" @tap="showRechargeModal = false">取消</view>
          <view class="modal-btn modal-btn--confirm" @tap="confirmRecharge">确认充值</view>
        </view>
      </view>
    </view>
    
    <!-- 扣款弹窗 -->
    <view v-if="showDeductModal" class="modal-mask" @tap="showDeductModal = false">
      <view class="modal-content" @tap.stop="stopPropagation">
        <text class="modal-title">扣款</text>
        
        <view class="modal-form">
          <text class="modal-label">选择代理</text>
          <TagSelect
            v-model="deductForm.agentId"
            :options="agentOptions"
            :compact="true"
          />
          
          <text class="modal-label">扣款原因</text>
          <view class="reason-grid">
            <view 
              class="reason-item"
              :class="{ 'reason-item--active': deductForm.reason === 'shipping' }"
              @tap="selectDeductReason('shipping')"
            >
              发货扣款
            </view>
            <view 
              class="reason-item"
              :class="{ 'reason-item--active': deductForm.reason === 'fine' }"
              @tap="selectDeductReason('fine')"
            >
              罚款
            </view>
          </view>
          
          <view class="form-item">
            <text class="modal-label">备注（可选）</text>
            <input 
              v-model="deductForm.remark" 
              class="remark-input-field"
              placeholder="请输入备注信息"
            />
          </view>
          
          <QuickInput
            v-model="deductForm.amount"
            label="扣款金额"
            type="digit"
            prefix="¥"
            :showQuickNumbers="true"
            :quickNumbers="[100, 500, 1000, 5000]"
          />
        </view>
        
        <view class="modal-actions">
          <view class="modal-btn modal-btn--cancel" @tap="showDeductModal = false">取消</view>
          <view class="modal-btn modal-btn--confirm modal-btn--danger" @tap="confirmDeduct">确认扣款</view>
        </view>
      </view>
    </view>
    
    <!-- 调货弹窗 -->
    <view v-if="showTransferModal" class="modal-mask" @tap="showTransferModal = false">
      <view class="modal-content modal-content--large" @tap.stop="stopPropagation">
        <text class="modal-title">调货</text>
        <text class="modal-desc">A代理发货给B代理，公司退款给A，从B账户扣款</text>
        
        <view class="modal-form">
          <text class="modal-label">发货方（收款）</text>
          <TagSelect
            v-model="transferForm.fromAgentId"
            :options="agentOptions"
            :compact="true"
          />
          
          <text class="modal-label">收货方（付款）</text>
          <TagSelect
            v-model="transferForm.toAgentId"
            :options="agentOptions"
            :compact="true"
          />
          
          <text class="modal-label">选择产品（可多选）</text>
          <view class="product-select">
            <view 
              v-for="product in store.products" 
              :key="product.id"
              class="product-select-item"
              :class="{ 'product-select-item--active': isTransferProductSelected(product.id) }"
            >
              <view class="product-select-item__left" @tap="selectTransferProduct(product.id)">
                <view class="product-select-item__check">
                  <text v-if="isTransferProductSelected(product.id)">✓</text>
                </view>
                <text class="product-select-item__name">{{ product.name }}</text>
              </view>
              <view v-if="isTransferProductSelected(product.id)" class="product-select-item__quantity" @tap.stop="stopPropagation">
                <view class="quantity-control">
                  <view class="quantity-btn quantity-btn--small" @tap="changeTransferQuantity(product.id, -1)">-</view>
                  <input 
                    type="number" 
                    :value="getTransferProductQuantity(product.id)" 
                    class="quantity-input quantity-input--small"
                    @input="(e: any) => setTransferQuantity(product.id, Number(e.detail?.value ?? (e.target as HTMLInputElement)?.value ?? 0))"
                  />
                  <view class="quantity-btn quantity-btn--small" @tap="changeTransferQuantity(product.id, 1)">+</view>
                </view>
              </view>
            </view>
          </view>
          
          <QuickInput
            v-model="transferForm.discount"
            label="优惠金额（可选）"
            type="digit"
            prefix="¥"
            placeholder="0"
          />
          
          <view class="transfer-calc">
            <view class="calc-row calc-row--total">
              <text class="calc-label">发货人收入金额</text>
              <text class="calc-value calc-value--primary">¥{{ transferTotal.toLocaleString() }}</text>
            </view>
            <view class="calc-row calc-row--total">
              <text class="calc-label">收货人扣除金额</text>
              <text class="calc-value calc-value--primary">¥{{ transferTotal.toLocaleString() }}</text>
            </view>
          </view>
          
          <view class="form-item">
            <text class="modal-label">备注（可选）</text>
            <input 
              v-model="transferForm.remark" 
              class="remark-input-field"
              placeholder="请输入备注信息"
            />
          </view>
        </view>
        
        <view class="modal-actions">
          <view class="modal-btn modal-btn--cancel" @tap="showTransferModal = false">取消</view>
          <view class="modal-btn modal-btn--confirm" @tap="confirmTransfer">确认调货</view>
        </view>
      </view>
    </view>
    
    <!-- 图片预览 -->
    <ImagePreview 
      :show="showImagePreview"
      :urls="previewImageUrls"
      :current="previewImageIndex"
      @close="showImagePreview = false"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/stores/app'
import { transactionApi, paymentAccountApi } from '@/api'
import { uploadImage } from '@/utils/upload'
import type { Transaction, TransactionReason } from '@/types'
import CustomTabBar from '@/components/CustomTabBar/index.vue'
import ImagePreview from '@/components/ImagePreview/index.vue'
import TagSelect from '@/components/TagSelect/index.vue'
import QuickInput from '@/components/QuickInput/index.vue'
import ImageUploader from '@/components/ImageUploader/index.vue'

const store = useAppStore()

// 筛选
const filterTypes = [
  { label: '全部', value: 'all' },
  { label: '充值', value: 'recharge' },
  { label: '扣款', value: 'deduct' },
  { label: '调货', value: 'transfer' }
]
const currentFilter = ref('all')

const filteredTransactions = computed(() => {
  if (currentFilter.value === 'all') return store.transactions
  if (currentFilter.value === 'transfer') {
    return store.transactions.filter(t => t.reason === 'transfer_in' || t.reason === 'transfer_out')
  }
  return store.transactions.filter(t => t.type === currentFilter.value)
})

// 代理选项
const agentOptions = computed(() =>
  store.agents.map(a => ({
    label: a.name,
    value: a.id,
    subLabel: `¥${a.balance.toLocaleString()}`
  }))
)

// 弹窗控制
const showRechargeModal = ref(false)
const showDeductModal = ref(false)
const showTransferModal = ref(false)

// 充值表单
const rechargeForm = ref({
  agentId: null as string | null,
  reason: 'payment' as 'payment' | 'freight' | 'gift',
  amount: 0,
  proof: [] as string[],
  remark: '',
  paymentAccountId: null as string | null
})

// 收款账户列表（用于充值表单选择）
const paymentAccounts = ref<Array<{ id: string; name: string; balance?: number }>>([])

// 收款账户选项（用于充值表单）
const paymentAccountOptions = computed(() => {
  if (!Array.isArray(paymentAccounts.value)) {
    return []
  }
  return paymentAccounts.value.map(pa => ({
    label: pa.name,
    value: pa.id
  }))
})

// 加载收款账户（用于充值表单）
const loadPaymentAccounts = async () => {
  try {
    const accounts = await paymentAccountApi.getAll()
    if (!Array.isArray(accounts)) {
      paymentAccounts.value = []
      return
    }
    paymentAccounts.value = accounts.map((account: any) => ({
      id: account.id,
      name: account.name,
      balance: 0
    }))
  } catch (error) {
    console.error('加载收款账户失败:', error)
    paymentAccounts.value = []
  }
}

// 选择充值原因
const selectRechargeReason = (reason: 'payment' | 'freight' | 'gift') => {
  rechargeForm.value.reason = reason
}

// 扣款表单
const deductForm = ref({
  agentId: null as string | null,
  reason: 'shipping' as 'shipping' | 'fine',
  amount: 0,
  remark: ''
})

// 选择扣款原因
const selectDeductReason = (reason: 'shipping' | 'fine') => {
  deductForm.value.reason = reason
}

// 调货表单
const transferForm = ref({
  fromAgentId: null as string | null,
  toAgentId: null as string | null,
  items: [] as Array<{ productId: string; quantity: number }>,
  discount: 0,
  remark: ''
})

// 选择调货产品（支持多选）
const selectTransferProduct = (productId: string) => {
  uni.vibrateShort({ type: 'light' })
  const index = transferForm.value.items.findIndex(item => item.productId === productId)
  if (index > -1) {
    transferForm.value.items.splice(index, 1)
  } else {
    transferForm.value.items.push({
      productId,
      quantity: 10
    })
  }
}

// 判断产品是否已选中
const isTransferProductSelected = (productId: string) => {
  return transferForm.value.items.some(item => item.productId === productId)
}

// 获取产品的数量
const getTransferProductQuantity = (productId: string) => {
  const item = transferForm.value.items.find(item => item.productId === productId)
  return item?.quantity || 0
}

// 修改调货数量
const changeTransferQuantity = (productId: string, delta: number) => {
  const item = transferForm.value.items.find(item => item.productId === productId)
  if (item) {
    item.quantity = Math.max(1, item.quantity + delta)
  }
}

// 设置调货数量
const setTransferQuantity = (productId: string, value: number) => {
  const item = transferForm.value.items.find(item => item.productId === productId)
  if (item) {
    item.quantity = Math.max(1, value || 1)
  }
}

// 调货小计（所有产品的总金额）
const transferSubtotal = computed(() => {
  return transferForm.value.items.reduce((total, item) => {
    const product = store.products.find(p => p.id === item.productId)
    if (product) {
      return total + (product.price * item.quantity)
    }
    return total
  }, 0)
})

// 调货总额（减去优惠）
const transferTotal = computed(() => {
  const total = transferSubtotal.value - (transferForm.value.discount || 0)
  return Math.max(0, total)
})


// 更新 tabbar 路径
const updateTabBarPath = () => {
  try {
    const pages = getCurrentPages()
    if (pages.length > 0) {
      const route = '/' + pages[pages.length - 1].route
      uni.$emit('update-tabbar-path', route)
    }
  } catch (error) {
    console.error('更新 tabbar 路径失败:', error)
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

const getIcon = (reason: TransactionReason) => {
  const iconMap: Record<TransactionReason, string> = {
    gift: '/static/icons/gift.svg',
    payment: '/static/icons/credit-card.svg',
    shipping: '/static/icons/package.svg',
    fine: '/static/icons/alert-circle.svg',
    transfer_in: '/static/icons/arrow-down.svg',
    transfer_out: '/static/icons/arrow-up.svg',
    freight: '/static/icons/truck.svg',
    marketing: '/static/icons/trending-up.svg',
    withdraw: '/static/icons/file-text.svg',
    fee: '/static/icons/file-text.svg',
    other: '/static/icons/file-text.svg'
  }
  return iconMap[reason] || '/static/icons/file-text.svg'
}

const getLabel = (reason: TransactionReason) => {
  const labelMap: Record<TransactionReason, string> = {
    gift: '赠送',
    payment: '充值到账',
    shipping: '发货扣款',
    fine: '罚款',
    transfer_in: '调货收入',
    transfer_out: '调货支出',
    freight: '运费',
    marketing: '营销退款',
    withdraw: '提现',
    fee: '手续费',
    other: '其他'
  }
  return labelMap[reason] || reason
}

const goToAgentDetail = (agentId: string) => {
  uni.navigateTo({
    url: `/pages/super/agents/detail?id=${agentId}`
  })
}

const goToPayeeDetail = (payeeId: string, payeeName: string) => {
  uni.navigateTo({
    url: `/pages/super/payees/detail?id=${payeeId}&name=${encodeURIComponent(payeeName)}`
  })
}

// 图片预览状态
const showImagePreview = ref(false)
const previewImageUrls = ref<string[]>([])
const previewImageIndex = ref(0)

// 解析凭证图片（支持字符串或数组）
const getProofImages = (proof: string | string[] | undefined): string[] => {
  if (!proof) return []
  if (Array.isArray(proof)) return proof
  // 尝试解析 JSON 字符串
  try {
    const parsed = JSON.parse(proof)
    if (Array.isArray(parsed)) return parsed
    return [proof] // 如果不是数组，返回原字符串作为单元素数组
  } catch {
    return [proof] // 解析失败，返回原字符串作为单元素数组
  }
}

const previewProof = (urls: string | string[], index: number = 0) => {
  const images = Array.isArray(urls) ? urls : [urls]
  previewImageUrls.value = images
  previewImageIndex.value = index
  showImagePreview.value = true
}

const editTransaction = (tx: Transaction) => {
  uni.navigateTo({
    url: `/pages/super/transactions/edit?id=${tx.id}`
  })
}

const deleteTransaction = (tx: Transaction) => {
  // 检查是否为管理员
  if (!store.currentAdmin || (store.currentAdmin.role !== 'super_admin' && store.currentAdmin.role !== 'admin')) {
    uni.showToast({ title: '需要管理员权限', icon: 'none' })
    return
  }
  
  // 检查是否为订单相关的交易记录
  if (tx.relatedOrderId) {
    uni.showToast({ title: '订单相关的交易记录不能删除，请先删除订单', icon: 'none' })
    return
  }
  
  // 确认删除
  // 根据交易类型判断余额调整方向
  // recharge（充值）：删除时扣除余额（因为原来充值增加了余额）
  // deduct（扣款）：删除时退回余额（因为原来扣款减少了余额）
  const isRecharge = tx.type === 'recharge'
  const balanceAction = isRecharge ? '扣除' : '退回'
  const balanceAmount = Math.abs(tx.amount)
  
  uni.showModal({
    title: '确认删除',
    content: `确定要删除这条交易记录吗？\n删除后将${balanceAction}代理商余额 ¥${balanceAmount.toLocaleString()}。\n此操作不可恢复。`,
    confirmText: '删除',
    confirmColor: '#FF4D4F',
    cancelText: '取消',
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '删除中...' })
          
          await transactionApi.delete(
            tx.id,
            store.currentAdmin!.id,
            store.currentAdmin!.role
          )
          
          uni.hideLoading()
          uni.showToast({ title: '删除成功', icon: 'success' })
          
          // 刷新数据
          await store.loadAgents()
          await store.loadTransactions()
        } catch (error: any) {
          uni.hideLoading()
          uni.showToast({ title: error.message || '删除失败', icon: 'none' })
        }
      }
    }
  })
}

// 阻止事件冒泡（用于模态框）
const stopPropagation = () => {}

// 确认充值
const confirmRecharge = async () => {
  if (!rechargeForm.value.agentId) {
    uni.showToast({ title: '请选择代理', icon: 'none' })
    return
  }
  if (!rechargeForm.value.amount || rechargeForm.value.amount <= 0) {
    uni.showToast({ title: '请输入金额', icon: 'none' })
    return
  }
  if (rechargeForm.value.reason === 'payment' && !rechargeForm.value.paymentAccountId) {
    uni.showToast({ title: '请选择收款账户', icon: 'none' })
    return
  }
  
  try {
    uni.showLoading({ title: '处理中...' })
    
    // 凭证图片（多张，已通过 ImageUploader 上传到服务器）
    // proof 已经是服务器 URL 数组，直接使用
    const proofValue = rechargeForm.value.proof.length > 0 
      ? (rechargeForm.value.proof.length === 1 ? rechargeForm.value.proof[0] : JSON.stringify(rechargeForm.value.proof))
      : undefined
    
    await transactionApi.recharge({
      agentId: rechargeForm.value.agentId,
      amount: rechargeForm.value.amount,
      reason: rechargeForm.value.reason,
      proof: proofValue,
      remark: rechargeForm.value.remark || undefined,
      paymentAccountId: rechargeForm.value.paymentAccountId || undefined
    })
    
    uni.hideLoading()
    uni.showToast({ title: '充值成功', icon: 'success' })
    showRechargeModal.value = false
    rechargeForm.value = { agentId: null, reason: 'payment', amount: 0, proof: [], remark: '', paymentAccountId: null }
    
    // 刷新数据
    await store.loadAgents()
    await store.loadTransactions()
  } catch (error: any) {
    uni.hideLoading()
    uni.showToast({ title: error.message || '充值失败', icon: 'none' })
  }
}

// 确认扣款
const confirmDeduct = async () => {
  if (!deductForm.value.agentId) {
    uni.showToast({ title: '请选择代理', icon: 'none' })
    return
  }
  if (!deductForm.value.amount || deductForm.value.amount <= 0) {
    uni.showToast({ title: '请输入金额', icon: 'none' })
    return
  }
  
  try {
    uni.showLoading({ title: '处理中...' })
    
    await transactionApi.deduct({
      agentId: deductForm.value.agentId,
      amount: deductForm.value.amount,
      reason: deductForm.value.reason,
      remark: deductForm.value.remark || undefined
    })
    
    uni.hideLoading()
    uni.showToast({ title: '扣款成功', icon: 'success' })
    showDeductModal.value = false
    deductForm.value = { agentId: null, reason: 'shipping', amount: 0, remark: '' }
    
    // 刷新数据
    await store.loadAgents()
    await store.loadTransactions()
  } catch (error: any) {
    uni.hideLoading()
    uni.showToast({ title: error.message || '扣款失败', icon: 'none' })
  }
}

// 确认调货
const confirmTransfer = async () => {
  if (!transferForm.value.fromAgentId || !transferForm.value.toAgentId) {
    uni.showToast({ title: '请选择双方代理', icon: 'none' })
    return
  }
  if (transferForm.value.fromAgentId === transferForm.value.toAgentId) {
    uni.showToast({ title: '发货方和收货方不能相同', icon: 'none' })
    return
  }
  if (transferForm.value.items.length === 0) {
    uni.showToast({ title: '请至少选择一个产品', icon: 'none' })
    return
  }
  // 验证每个产品的数量
  for (const item of transferForm.value.items) {
    if (!item.quantity || item.quantity <= 0) {
      uni.showToast({ title: '请设置所有产品的数量', icon: 'none' })
      return
    }
  }
  if (transferTotal.value <= 0) {
    uni.showToast({ title: '调货金额必须大于0', icon: 'none' })
    return
  }
  
  try {
    uni.showLoading({ title: '处理中...' })
    
    // 构建订单项数组
    const orderItems = transferForm.value.items.map(item => {
      const product = store.products.find(p => p.id === item.productId)
      return {
        productId: item.productId,
        productName: product?.name || '',
        quantity: item.quantity,
        price: product?.price || 0,
        weight: product?.weight || 0
      }
    })
    
    await transactionApi.transfer({
      fromAgentId: transferForm.value.fromAgentId,
      toAgentId: transferForm.value.toAgentId,
      amount: transferTotal.value,
      orderItems,
      remark: transferForm.value.remark || undefined
    })
    
    uni.hideLoading()
    uni.showToast({ title: '调货成功', icon: 'success' })
    showTransferModal.value = false
    transferForm.value = { fromAgentId: null, toAgentId: null, items: [], discount: 0, remark: '' }
    
    // 刷新数据
    await store.loadAgents()
    await store.loadTransactions()
  } catch (error: any) {
    uni.hideLoading()
    uni.showToast({ title: error.message || '调货失败', icon: 'none' })
  }
}

onMounted(async () => {
  updateTabBarPath()
  await loadPaymentAccounts()
  await store.loadTransactions()
})

onShow(async () => {
  updateTabBarPath()
  // 刷新交易记录和代理商数据（因为编辑交易记录后余额可能变化）
  await Promise.all([
    store.loadTransactions(),
    store.loadAgents()
  ])
})
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.finance-page {
  padding: 24rpx;
  padding-bottom: calc(140rpx + env(safe-area-inset-bottom));
}

.quick-actions {
  display: flex;
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.quick-action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 28rpx;
  background: $success-color;
  border-radius: $border-radius-lg;
  
  &:active {
    transform: scale(0.96);
  }
  
  &--danger {
    background: $danger-color;
  }
  
  &--teal {
    background: #14B8A6;
  }
}

.quick-action-icon {
  width: 48rpx;
  height: 48rpx;
  margin-bottom: 8rpx;
  filter: brightness(0) invert(1);
}

.quick-action-btn__text {
  font-size: 26rpx;
  color: #fff;
  font-weight: 500;
}

.filter-bar {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.filter-item {
  flex: 1;
  padding: 16rpx;
  background: #fff;
  border-radius: $border-radius;
  text-align: center;
  font-size: 28rpx;
  color: $text-secondary;
  
  &--active {
    background: $primary-color;
    color: #fff;
  }
}

.transaction-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.transaction-card {
  background: #fff;
  border-radius: $border-radius;
  padding: 24rpx;
  box-shadow: $shadow-sm;
  
  &__header {
    display: flex;
    align-items: center;
  }
  
  &__icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    background: $bg-grey;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16rpx;
  }
  
  &__info {
    flex: 1;
  }
  
  &__agent {
    font-size: 30rpx;
    font-weight: 500;
    color: $primary-color;
    display: block;
  }
  
  &__reason {
    font-size: 24rpx;
    color: $text-secondary;
    display: block;
    margin-top: 4rpx;
  }
  
  &__payee {
    font-size: 24rpx;
    color: $primary-color;
    display: block;
    margin-top: 4rpx;
  }
  
  &__order-items {
    display: flex;
    flex-wrap: wrap;
    gap: 6rpx;
    margin-top: 8rpx;
  }
  
  &__right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 12rpx;
  }
  
  &__amount {
    font-size: 36rpx;
    font-weight: 700;
    text-align: right;
  }
  
  &__proof-thumbnails {
    display: flex;
    align-items: center;
    gap: 8rpx;
    flex-wrap: wrap;
  }
  
  &__proof-thumbnail {
    position: relative;
    width: 100rpx;
    height: 100rpx;
    border-radius: 12rpx;
    overflow: hidden;
    border: 2rpx solid rgba($primary-color, 0.2);
    background: $bg-grey;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
    transition: all 0.2s ease;
    
    &:active {
      transform: scale(0.95);
      box-shadow: 0 1rpx 4rpx rgba(0, 0, 0, 0.12);
    }
  }
  
  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 16rpx;
    padding-top: 16rpx;
    border-top: 1rpx solid rgba($border-color, 0.5);
    gap: 16rpx;
  }
  
  &__time-wrapper {
    display: flex;
    align-items: center;
    gap: 12rpx;
    flex: 1;
  }
  
  &__time {
    font-size: 24rpx;
    color: $text-placeholder;
    font-weight: 400;
    line-height: 1.4;
  }
  
  &__proof-badge {
    display: flex;
    align-items: center;
    padding: 4rpx 12rpx;
    background: rgba($primary-color, 0.1);
    border-radius: 4rpx;
    border: 1rpx solid rgba($primary-color, 0.2);
    
    &:active {
      opacity: 0.8;
      transform: scale(0.95);
    }
  }
  
  &__actions {
    display: flex;
    gap: 12rpx;
    align-items: center;
  }
  
  &__edit-btn {
    padding: 8rpx 16rpx;
    background: rgba($warning-color, 0.1);
    border-radius: 8rpx;
    border: 1rpx solid rgba($warning-color, 0.3);
    
    &:active {
      opacity: 0.8;
    }
  }
  
  &__delete-btn {
    padding: 8rpx 16rpx;
    background: rgba($danger-color, 0.1);
    border-radius: 8rpx;
    border: 1rpx solid rgba($danger-color, 0.3);
    
    &:active {
      opacity: 0.8;
    }
  }
}

.edit-btn-text {
  font-size: 24rpx;
  color: $warning-color;
  font-weight: 500;
}

.delete-btn-text {
  font-size: 24rpx;
  color: $danger-color;
  font-weight: 500;
}

.proof-thumbnail-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.proof-thumbnail-badge {
  position: absolute;
  top: 4rpx;
  right: 4rpx;
  width: 32rpx;
  height: 32rpx;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4rpx);
}

.proof-badge-icon {
  width: 18rpx;
  height: 18rpx;
  filter: brightness(0) invert(1);
}

.order-item-tag {
  font-size: 20rpx;
  color: $text-secondary;
  padding: 2rpx 8rpx;
  background: rgba($text-secondary, 0.1);
  border-radius: 4rpx;
}

.amount-positive {
  color: $success-color;
}

.amount-negative {
  color: $danger-color;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100rpx 0;
}

.empty-icon {
  width: 120rpx;
  height: 120rpx;
  opacity: 0.3;
  margin-bottom: 24rpx;
}

.empty-text {
  font-size: 28rpx;
  color: $text-placeholder;
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
  
  &--large {
    max-height: 90vh;
  }
}

.modal-title {
  font-size: 36rpx;
  font-weight: 700;
  color: $text-primary;
  text-align: center;
  display: block;
  margin-bottom: 16rpx;
}

.modal-desc {
  font-size: 26rpx;
  color: $text-secondary;
  text-align: center;
  display: block;
  margin-bottom: 24rpx;
}

.modal-label {
  font-size: 28rpx;
  font-weight: 500;
  color: $text-primary;
  margin: 24rpx 0 16rpx;
  display: block;
}

.reason-grid {
  display: flex;
  gap: 16rpx;
}

.reason-item {
  flex: 1;
  padding: 24rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  text-align: center;
  font-size: 28rpx;
  color: $text-secondary;
  border: 2rpx solid transparent;
  
  &--active {
    background: rgba($primary-color, 0.1);
    border-color: $primary-color;
    color: $primary-color;
  }
}

.remark-input-field {
  width: 100%;
  min-height: 88rpx;
  padding: 20rpx 24rpx;
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

.payment-account-select {
  margin-top: 16rpx;
}

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

.transfer-calc {
  margin-top: 24rpx;
  padding: 20rpx;
  background: $bg-grey;
  border-radius: $border-radius;
}

.calc-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
  
  &--discount {
    .calc-value {
      color: $success-color;
    }
  }
  
  &--total {
    border-top: 1rpx solid $border-color;
    margin-top: 8rpx;
    padding-top: 16rpx;
  }
}

.calc-label {
  font-size: 26rpx;
  color: $text-secondary;
}

.calc-value {
  font-size: 28rpx;
  color: $text-primary;
  font-weight: 500;
  
  &--primary {
    font-size: 32rpx;
    color: $primary-color;
    font-weight: 700;
  }
}

.modal-form {
  margin-bottom: 32rpx;
}

.form-item {
  margin-bottom: 32rpx;
  
  &__label {
    font-size: 28rpx;
    font-weight: 500;
    color: $text-primary;
    margin-bottom: 16rpx;
    display: block;
  }
  
  &__input {
    width: 100%;
    padding: 24rpx;
    background: $bg-grey;
    border-radius: $border-radius;
    font-size: 28rpx;
    color: $text-primary;
  }
  
  &__textarea {
    width: 100%;
    min-height: 200rpx;
    padding: 24rpx;
    background: $bg-grey;
    border-radius: $border-radius;
    font-size: 28rpx;
    color: $text-primary;
  }
}

.required {
  color: $danger-color;
}

.modal-actions {
  display: flex;
  gap: 24rpx;
}

.modal-btn {
  flex: 1;
  padding: 28rpx;
  border-radius: $border-radius-lg;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  
  &--cancel {
    background: $bg-grey;
    color: $text-secondary;
  }
  
  &--confirm {
    background: $primary-color;
    color: #fff;
  }
  
  &--danger {
    background: $danger-color;
  }
  
  &:active {
    opacity: 0.8;
  }
}
</style>

