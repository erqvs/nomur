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
          <text 
            class="transaction-card__amount"
            :class="{ 
              'amount-positive': tx.amount > 0,
              'amount-negative': tx.amount < 0
            }"
          >
            {{ tx.amount > 0 ? '+' : '' }}¥{{ Math.abs(tx.amount).toLocaleString() }}
          </text>
        </view>
        
        <view class="transaction-card__footer">
          <view class="transaction-card__time-wrapper">
            <text class="transaction-card__time">{{ formatTime(tx.createdAt) }}</text>
            <view v-if="tx.proof" class="transaction-card__proof-badge" @tap.stop="previewProof(tx.proof)">
              <text class="proof-badge-text">📷 查看凭证</text>
            </view>
          </view>
        </view>
      </view>
      
      <view v-if="filteredTransactions.length === 0" class="empty-state">
        <image src="/static/icons/file-text.svg" class="empty-icon" mode="aspectFit" />
        <text class="empty-text">暂无交易记录</text>
      </view>
    </view>
    
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
              :class="{ 'reason-item--active': rechargeForm.reason === 'other' }"
              @tap="selectRechargeReason('other')"
            >
              其他
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
            <text class="modal-label">{{ rechargeForm.reason === 'other' ? '充值原因' : '备注（可选）' }}</text>
            <input 
              v-model="rechargeForm.remark" 
              class="remark-input-field"
              :placeholder="rechargeForm.reason === 'other' ? '请输入充值原因' : '请输入备注信息'"
            />
          </view>
          
          <QuickInput
            v-model="rechargeForm.amount"
            label="充值金额"
            type="digit"
            prefix="¥"
            :showQuickNumbers="true"
            :quickNumbers="[1000, 5000, 10000, 50000]"
          />
          
          <ImageUploader
            v-model="rechargeForm.proof"
            label="上传凭证"
            :maxCount="1"
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
              :class="{ 'reason-item--active': deductForm.reason === 'other' }"
              @tap="selectDeductReason('other')"
            >
              其他
            </view>
          </view>
          
          <view class="form-item">
            <text class="modal-label">{{ deductForm.reason === 'other' ? '扣款原因' : '备注（可选）' }}</text>
            <input 
              v-model="deductForm.remark" 
              class="remark-input-field"
              :placeholder="deductForm.reason === 'other' ? '请输入扣款原因' : '请输入备注信息'"
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
          
          <text class="modal-label">选择产品</text>
          <view class="product-select">
            <view 
              v-for="product in store.products" 
              :key="product.id"
              class="product-select-item"
              :class="{ 'product-select-item--active': transferForm.productId === product.id }"
            >
              <view class="product-select-item__left" @tap="selectTransferProduct(product.id)">
                <view class="product-select-item__check">
                  <text v-if="transferForm.productId === product.id">✓</text>
                </view>
                <text class="product-select-item__name">{{ product.name }}</text>
              </view>
              <view v-if="transferForm.productId === product.id" class="product-select-item__quantity" @tap.stop="stopPropagation">
                <view class="quantity-control">
                  <view class="quantity-btn quantity-btn--small" @tap="changeTransferQuantity(-1)">-</view>
                  <input 
                    type="number" 
                    :value="transferForm.quantity" 
                    class="quantity-input quantity-input--small"
                    @input="(e: any) => setTransferQuantity(Number(e.detail?.value ?? (e.target as HTMLInputElement)?.value ?? 0))"
                  />
                  <view class="quantity-btn quantity-btn--small" @tap="changeTransferQuantity(1)">+</view>
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
    
    <!-- 客户打款记录弹窗 -->
    <view v-if="showAgentPaymentsModal" class="modal-mask" @tap="showAgentPaymentsModal = false">
      <view class="modal-content modal-content--large" @tap.stop="stopPropagation">
        <text class="modal-title">{{ selectedAgentName }}的打款记录</text>
        <view class="payments-list">
          <view 
            v-for="tx in agentPayments" 
            :key="tx.id"
            class="payment-item"
          >
            <view class="payment-item__header">
              <text class="payment-item__time">{{ formatTime(tx.createdAt) }}</text>
              <text class="payment-item__amount">¥{{ tx.amount.toLocaleString() }}</text>
            </view>
            <text v-if="tx.paymentAccountName" class="payment-item__payee">收款人：{{ tx.paymentAccountName }}</text>
          </view>
          <view v-if="agentPayments.length === 0" class="empty-state">
            <text class="empty-text">暂无打款记录</text>
          </view>
        </view>
        <view class="modal-actions">
          <view class="modal-btn modal-btn--cancel" @tap="showAgentPaymentsModal = false">关闭</view>
        </view>
      </view>
    </view>
    
    <!-- 收款人收款明细弹窗 -->
    <view v-if="showPayeePaymentsModal" class="modal-mask" @tap="showPayeePaymentsModal = false">
      <view class="modal-content modal-content--large" @tap.stop="stopPropagation">
        <text class="modal-title">{{ selectedPayeeName }}的收款明细</text>
        <view class="payments-list">
          <view 
            v-for="tx in payeePayments" 
            :key="tx.id"
            class="payment-item"
          >
            <view class="payment-item__header">
              <text class="payment-item__agent">{{ tx.agentName }}</text>
              <text class="payment-item__amount">¥{{ tx.amount.toLocaleString() }}</text>
            </view>
            <text class="payment-item__time">{{ formatTime(tx.createdAt) }}</text>
          </view>
          <view v-if="payeePayments.length === 0" class="empty-state">
            <text class="empty-text">暂无收款记录</text>
          </view>
        </view>
        <view class="modal-actions">
          <view class="modal-btn modal-btn--cancel" @tap="showPayeePaymentsModal = false">关闭</view>
        </view>
      </view>
    </view>
    
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import TagSelect from '@/components/TagSelect/index.vue'
import QuickInput from '@/components/QuickInput/index.vue'
import ImageUploader from '@/components/ImageUploader/index.vue'
import { paymentAccountApi } from '@/api'
import { uploadImage } from '@/utils/upload'
import type { Transaction, TransactionReason } from '@/types'

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
    // 调货：筛选 reason 为 transfer_in 或 transfer_out 的交易
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
  reason: 'payment' as 'payment' | 'freight' | 'other',
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
      balance: 0 // 充值表单不需要显示余额，设为0即可
    }))
  } catch (error) {
    console.error('加载收款账户失败:', error)
    paymentAccounts.value = []
  }
}

onMounted(() => {
  loadPaymentAccounts()
})

// 选择充值原因
const selectRechargeReason = (reason: 'payment' | 'freight' | 'other') => {
  rechargeForm.value.reason = reason
}

// 扣款表单
const deductForm = ref({
  agentId: null as string | null,
  reason: 'shipping' as 'shipping' | 'other',
  amount: 0,
  remark: ''
})

// 选择扣款原因
const selectDeductReason = (reason: 'shipping' | 'other') => {
  deductForm.value.reason = reason
  if (reason !== 'other') {
    deductForm.value.remark = ''
  }
}

// 调货表单
const transferForm = ref({
  fromAgentId: null as string | null,
  toAgentId: null as string | null,
  productId: null as string | null,
  quantity: 0,
  discount: 0,
  remark: ''
})

// 选择调货产品
const selectTransferProduct = (productId: string) => {
  uni.vibrateShort({ type: 'light' })
  if (transferForm.value.productId === productId) {
    transferForm.value.productId = null
    transferForm.value.quantity = 0
  } else {
    transferForm.value.productId = productId
    transferForm.value.quantity = transferForm.value.quantity || 10
  }
}

// 修改调货数量
const changeTransferQuantity = (delta: number) => {
  transferForm.value.quantity = Math.max(1, transferForm.value.quantity + delta)
}

// 设置调货数量
const setTransferQuantity = (value: number) => {
  transferForm.value.quantity = Math.max(1, value || 1)
}

// 选中产品的单价
const selectedProductPrice = computed(() => {
  if (!transferForm.value.productId) return 0
  const product = store.products.find(p => p.id === transferForm.value.productId)
  return product?.price || 0
})

// 调货小计
const transferSubtotal = computed(() => {
  return selectedProductPrice.value * transferForm.value.quantity
})

// 调货总额（减去优惠）
const transferTotal = computed(() => {
  const total = transferSubtotal.value - (transferForm.value.discount || 0)
  return Math.max(0, total)
})

// 获取图标
const getIcon = (reason: TransactionReason) => {
  const icons: Record<TransactionReason, string> = {
    gift: '/static/icons/gift.svg',
    payment: '/static/icons/credit-card.svg',
    freight: '/static/icons/truck.svg',
    shipping: '/static/icons/box.svg',
    fine: '/static/icons/warning.svg',
    transfer_in: '/static/icons/arrow-down-circle.svg',
    transfer_out: '/static/icons/arrow-up-circle.svg',
    marketing: '/static/icons/target.svg'
  }
  return icons[reason]
}

// 获取标签
const getLabel = (reason: TransactionReason) => {
  const labels: Record<TransactionReason, string> = {
    gift: '赠送',
    payment: '打款充值',
    freight: '运费',
    shipping: '发货扣款',
    fine: '罚款',
    transfer_in: '调货收入',
    transfer_out: '调货支出',
    marketing: '营销退款'
  }
  return labels[reason]
}

// 格式化时间
const formatTime = (time: string | Date) => {
  const d = new Date(time)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const recordDate = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const diffDays = Math.floor((today.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24))
  
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  
  if (diffDays === 0) {
    // 今天：只显示时间
    return `${hour}:${min}`
  } else if (diffDays === 1) {
    // 昨天
    return `昨天 ${hour}:${min}`
  } else if (diffDays < 7) {
    // 一周内：显示月-日 时:分
    return `${month}-${day} ${hour}:${min}`
  } else if (d.getFullYear() === now.getFullYear()) {
    // 今年：显示月-日 时:分
    return `${month}-${day} ${hour}:${min}`
  } else {
    // 去年或更早：显示年-月-日 时:分
    const year = d.getFullYear()
    return `${year}-${month}-${day} ${hour}:${min}`
  }
}

// 预览凭证
const previewProof = (url: string) => {
  uni.previewImage({ urls: [url] })
}

// 客户打款记录弹窗
const showAgentPaymentsModal = ref(false)
const selectedAgentId = ref<string>('')
const selectedAgentName = ref<string>('')
const agentPayments = ref<Transaction[]>([])

// 跳转到代理详情页
const goToAgentDetail = (agentId: string) => {
  uni.navigateTo({
    url: `/pages/admin/agents/detail?id=${agentId}`
  })
}


const viewAgentPayments = async (agentId: string, agentName: string) => {
  try {
    selectedAgentId.value = agentId
    selectedAgentName.value = agentName
    showAgentPaymentsModal.value = true
    
    // 获取该客户的所有充值记录（只显示reason为payment的记录，即打款记录）
    const allTransactions = store.transactions.filter(t => 
      t.agentId === agentId && 
      t.type === 'recharge' && 
      t.reason === 'payment'
    )
    agentPayments.value = allTransactions
  } catch (error) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

// 收款人收款明细弹窗
const showPayeePaymentsModal = ref(false)
const selectedPayeeId = ref<string>('')
const selectedPayeeName = ref<string>('')
const payeePayments = ref<Transaction[]>([])

// 跳转到收款人详情页（跳转到收款人页面）
const goToPayeeDetail = async (payeeId: string, payeeName: string) => {
  // 跳转到收款人页面，由收款人页面处理详情展示
  uni.switchTab({
    url: '/pages/admin/payees/index'
  })
}

const viewPayeePayments = async (payeeId: string, payeeName: string) => {
  try {
    selectedPayeeId.value = payeeId
    selectedPayeeName.value = payeeName
    showPayeePaymentsModal.value = true
    
    // 调用API获取该收款人的收款明细
    const res = await paymentAccountApi.getTransactions(payeeId)
    payeePayments.value = res.transactions
  } catch (error) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

// 确认充值
const confirmRecharge = async () => {
  if (!rechargeForm.value.agentId) {
    uni.showToast({ title: '请选择代理', icon: 'none' })
    return
  }
  if (!rechargeForm.value.amount) {
    uni.showToast({ title: '请输入金额', icon: 'none' })
    return
  }
  if (rechargeForm.value.reason === 'payment' && !rechargeForm.value.paymentAccountId) {
    uni.showToast({ title: '请选择收款账户', icon: 'none' })
    return
  }
  
  try {
    const finalReason = rechargeForm.value.reason === 'other' ? 'gift' : rechargeForm.value.reason
    
    await store.recharge(
      rechargeForm.value.agentId,
      rechargeForm.value.amount,
      finalReason,
      rechargeForm.value.proof[0],
      rechargeForm.value.remark || undefined,
      rechargeForm.value.paymentAccountId || undefined
    )
    
    uni.showToast({ title: '充值成功', icon: 'success' })
    showRechargeModal.value = false
    rechargeForm.value = { agentId: null, reason: 'payment', amount: 0, proof: [], remark: '', paymentAccountId: null }
  } catch (error: any) {
    uni.showToast({ title: error.message || '充值失败', icon: 'none' })
  }
}

// 确认扣款
const confirmDeduct = async () => {
  if (!deductForm.value.agentId) {
    uni.showToast({ title: '请选择代理', icon: 'none' })
    return
  }
  if (!deductForm.value.amount) {
    uni.showToast({ title: '请输入金额', icon: 'none' })
    return
  }
  if (deductForm.value.reason === 'other' && !deductForm.value.remark) {
    uni.showToast({ title: '请输入扣款原因', icon: 'none' })
    return
  }
  
  try {
    const reason = deductForm.value.reason === 'other' ? 'shipping' : deductForm.value.reason
    const remark = deductForm.value.reason === 'other' 
      ? deductForm.value.remark 
      : (deductForm.value.remark || undefined)
    
    await store.deduct(
      deductForm.value.agentId,
      deductForm.value.amount,
      reason,
      remark
    )
    
    uni.showToast({ title: '扣款成功', icon: 'success' })
    showDeductModal.value = false
    deductForm.value = { agentId: null, reason: 'shipping', amount: 0, remark: '' }
  } catch (error: any) {
    uni.showToast({ title: error.message || '扣款失败', icon: 'none' })
  }
}

// 阻止事件冒泡（用于模态框）
const stopPropagation = () => {}

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
  if (!transferForm.value.productId) {
    uni.showToast({ title: '请选择产品', icon: 'none' })
    return
  }
  if (!transferForm.value.quantity || transferForm.value.quantity <= 0) {
    uni.showToast({ title: '请输入数量', icon: 'none' })
    return
  }
  if (transferTotal.value <= 0) {
    uni.showToast({ title: '调货金额必须大于0', icon: 'none' })
    return
  }
  
  try {
    await store.transfer(
      transferForm.value.fromAgentId,
      transferForm.value.toAgentId,
      transferTotal.value,
      transferForm.value.productId || undefined,
      transferForm.value.quantity || undefined,
      transferForm.value.remark || undefined
    )
    
    uni.showToast({ title: '调货成功', icon: 'success' })
    showTransferModal.value = false
    transferForm.value = { fromAgentId: null, toAgentId: null, productId: null, quantity: 0, discount: 0, remark: '' }
  } catch (error: any) {
    uni.showToast({ title: error.message || '调货失败', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.finance-page {
  padding: 24rpx;
  padding-bottom: 120rpx;
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
    background: #0D9488;
  }
  
  &--purple {
    background: #8B5CF6;
  }
  
  &__text {
    font-size: 28rpx;
    font-weight: 500;
    color: #fff;
  }
}

.quick-action-icon {
  width: 48rpx;
  height: 48rpx;
  margin-bottom: 8rpx;
  filter: brightness(0) invert(1);
}

.filter-bar {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.filter-item {
  padding: 16rpx 32rpx;
  background: $bg-grey;
  border-radius: 100rpx;
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
  gap: 16rpx;
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
  
  &__amount {
    font-size: 36rpx;
    font-weight: 700;
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
}

.proof-badge-text {
  font-size: 20rpx;
  color: $primary-color;
  line-height: 1.4;
}

.order-item-tag {
  font-size: 20rpx;
  color: $text-secondary;
  padding: 2rpx 8rpx;
  background: rgba($text-secondary, 0.1);
  border-radius: 4rpx;
  
  &__footer {
    display: flex;
    justify-content: space-between;
    margin-top: 16rpx;
    padding-top: 16rpx;
    border-top: 1rpx solid $border-color;
  }
  
  &__time {
    font-size: 24rpx;
    color: $text-placeholder;
  }
  
  &__remark {
    font-size: 24rpx;
    color: $text-secondary;
  }
  
}

.tx-icon {
  width: 32rpx;
  height: 32rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
}

.empty-icon {
  width: 80rpx;
  height: 80rpx;
  opacity: 0.5;
  margin-bottom: 16rpx;
}

.empty-text {
  font-size: 28rpx;
  color: $text-placeholder;
}

.amount-positive {
  color: $success-color;
}

.amount-negative {
  color: $danger-color;
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

.modal-form {
  margin-bottom: 32rpx;
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

.remark-input {
  margin-top: 16rpx;
  margin-bottom: 16rpx;
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
  
  &--danger {
    background: $danger-color;
  }
}

.payments-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  max-height: 60vh;
  overflow-y: auto;
  margin-top: 24rpx;
}

.payment-item {
  padding: 20rpx;
  background: $bg-grey;
  border-radius: 12rpx;
  
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8rpx;
  }
  
  &__agent {
    font-size: 28rpx;
    font-weight: 500;
    color: $text-primary;
  }
  
  &__time {
    font-size: 26rpx;
    color: $text-secondary;
  }
  
  &__amount {
    font-size: 30rpx;
    font-weight: 600;
    color: $primary-color;
  }
  
  &__payee {
    font-size: 24rpx;
    color: $text-secondary;
    display: block;
    margin-top: 4rpx;
  }
}

// 产品选择样式（与开单页面一致）
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

.payment-account-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 24rpx;
}

.payment-account-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  
  &__main {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    
    &:active {
      opacity: 0.7;
    }
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
  
  &__balance {
    font-size: 26rpx;
    color: $success-color;
    margin-top: 4rpx;
    display: block;
  }
  
  &__arrow {
    font-size: 36rpx;
    color: $text-placeholder;
    margin-left: 16rpx;
  }
  
  &__delete {
    margin-left: 16rpx;
    padding: 12rpx;
    
    &:active {
      opacity: 0.7;
    }
  }
}

.delete-icon {
  width: 40rpx;
  height: 40rpx;
  opacity: 0.6;
}

.balance-card {
  padding: 32rpx;
  background: linear-gradient(135deg, $primary-color 0%, #3B82F6 100%);
  border-radius: $border-radius-lg;
  color: #fff;
  margin-bottom: 24rpx;
  
  &__label {
    font-size: 26rpx;
    opacity: 0.9;
    display: block;
    margin-bottom: 8rpx;
  }
  
  &__value {
    font-size: 48rpx;
    font-weight: 700;
    display: block;
  }
}

.deduct-btn {
  margin-top: 24rpx;
  padding: 24rpx;
  background: $danger-color;
  border-radius: $border-radius;
  text-align: center;
  
  &:active {
    opacity: 0.8;
  }
  
  &__text {
    font-size: 32rpx;
    font-weight: 600;
    color: #fff;
  }
}

.selected-account {
  padding: 20rpx 24rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  font-size: 28rpx;
  color: $text-primary;
}

.qr-code-upload {
  margin-top: 12rpx;
}

.qr-code-preview {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  border-radius: $border-radius;
  overflow: hidden;
  background: $bg-grey;
}

.qr-code-image {
  width: 100%;
  height: 100%;
}

.qr-code-delete {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  width: 44rpx;
  height: 44rpx;
  background: $danger-color;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 32rpx;
  font-weight: bold;
  box-shadow: $shadow;
}

.qr-code-upload-btn {
  width: 200rpx;
  height: 200rpx;
  border: 2rpx dashed $border-color;
  border-radius: $border-radius;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $bg-grey;
}

.qr-code-upload-text {
  font-size: 24rpx;
  color: $text-placeholder;
}

.form-item {
  margin-bottom: 24rpx;
}
</style>

