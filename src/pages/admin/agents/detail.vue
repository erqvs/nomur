<template>
  <view class="agent-detail" v-if="agent">
    <!-- 代理信息卡片 -->
    <view class="profile-card">
      <view class="profile-card__delete" @tap="confirmDeleteAgent">
        <image src="/static/icons/x-circle.svg" class="delete-icon" mode="aspectFit" />
      </view>
      <image 
        :src="agent.avatar || '/static/images/default-avatar.svg'" 
        class="profile-card__avatar" 
        mode="aspectFill"
      />
      <text class="profile-card__name">{{ agent.name }}</text>
      <view class="profile-card__phones">
        <view class="profile-card__phone" @tap="callPhone(agent.phone1)">
          <image src="/static/icons/phone.svg" class="phone-icon" mode="aspectFit" />
          <text>{{ agent.phone1 }}</text>
        </view>
        <view v-if="agent.phone2" class="profile-card__phone" @tap="callPhone(agent.phone2)">
          <image src="/static/icons/phone.svg" class="phone-icon" mode="aspectFit" />
          <text>{{ agent.phone2 }}</text>
        </view>
      </view>
      <view class="profile-card__address">
        <image src="/static/icons/location.svg" class="address-icon" mode="aspectFit" />
        <text>{{ agent.address }}</text>
      </view>
    </view>
    
    <!-- 余额卡片 -->
    <BalanceCard
      :balance="agent.balance"
      :subInfo="`更新于 ${agent.updatedAt.slice(0, 10)}`"
    />
    
    <!-- 年度目标完成情况 -->
    <view class="card">
      <view class="section-title">年度目标完成率</view>
      <view v-if="performance && performance.yearlyStats" class="targets">
        <view 
          v-for="(stats, key) in performance.yearlyStats" 
          :key="key"
          class="target-progress"
        >
          <view class="target-progress__header">
            <text class="target-progress__label">
              {{ getTargetLabel(key, stats) }}
            </text>
            <text class="target-progress__value">
              {{ stats.completed }}/{{ stats.target }}箱
            </text>
          </view>
          <view class="progress-bar progress-bar--lg">
            <view 
              class="progress-inner" 
              :style="{ width: stats.percentage + '%' }"
            ></view>
          </view>
          <text class="target-progress__percent">{{ stats.percentage }}%</text>
        </view>
        <view v-if="Object.keys(performance.yearlyStats).length === 0" class="empty-targets">
          <text class="empty-text">暂未设置年度目标</text>
        </view>
      </view>
    </view>
    
    <!-- 操作按钮 -->
    <view class="action-grid">
      <view class="action-item" @tap="goToRecharge">
        <view class="action-item__icon action-item__icon--success"><image src="/static/icons/money.svg" class="action-icon" mode="aspectFit" /></view>
        <text class="action-item__text">充值</text>
      </view>
      <view class="action-item" @tap="goToDeduct">
        <view class="action-item__icon action-item__icon--danger">
          <image src="/static/icons/arrow-up-circle.svg" class="action-icon" mode="aspectFit" />
        </view>
        <text class="action-item__text">扣款</text>
      </view>
      <view class="action-item" @tap="goToTransfer">
        <view class="action-item__icon action-item__icon--primary">
          <image src="/static/icons/refresh-cw.svg" class="action-icon" mode="aspectFit" />
        </view>
        <text class="action-item__text">调货</text>
      </view>
      <view class="action-item" @tap="goToEdit">
        <view class="action-item__icon action-item__icon--teal">
          <image src="/static/icons/file-text.svg" class="action-icon" mode="aspectFit" />
        </view>
        <text class="action-item__text">编辑</text>
      </view>
      <view class="action-item" @tap="goToOrders">
        <view class="action-item__icon action-item__icon--warning"><image src="/static/icons/box.svg" class="action-icon" mode="aspectFit" /></view>
        <text class="action-item__text">订单</text>
      </view>
    </view>
    
    <!-- 最近交易记录 -->
    <view class="card">
      <view class="section-title">最近交易记录</view>
      <view class="transaction-list">
        <view 
          v-for="item in recentRecords" 
          :key="item.type === 'order' ? `order-${item.id}` : `tx-${item.id}`"
          class="transaction-item"
        >
          <view class="transaction-item__icon">
            <image 
              :src="item.type === 'order' ? '/static/icons/box.svg' : getTransactionIcon(item.reason)" 
              class="tx-icon" 
              mode="aspectFit" 
            />
          </view>
          <view class="transaction-item__info">
            <text class="transaction-item__reason">
              {{ item.type === 'order' ? '订单' : getTransactionLabel(item.reason) }}
            </text>
            <text v-if="item.type === 'transaction' && item.reason === 'payment' && item.paymentAccountName" 
                  class="transaction-item__payee">
              收款人：{{ item.paymentAccountName }}
            </text>
            <view v-if="item.type === 'order' && item.items && item.items.length > 0" class="transaction-item__details">
              <text v-for="(orderItem, idx) in item.items" :key="idx" class="detail-item">
                {{ orderItem.productName }} x{{ orderItem.quantity }}
              </text>
            </view>
            <text class="transaction-item__time">{{ formatRecordTime(item.createdAt) }}</text>
            <text v-if="item.remark" class="transaction-item__remark">{{ item.remark }}</text>
          </view>
          <text 
            v-if="item.type === 'transaction'"
            class="transaction-item__amount"
            :class="{ 
              'amount-positive': item.amount > 0, 
              'amount-negative': item.amount < 0 
            }"
          >
            {{ item.amount > 0 ? '+' : '' }}{{ item.amount.toLocaleString() }}
          </text>
          <text 
            v-else
            class="transaction-item__amount amount-negative"
          >
            -{{ item.totalAmount.toLocaleString() }}
          </text>
        </view>
        
        <view v-if="recentRecords.length === 0" class="empty-state">
          <text class="empty-text">暂无记录</text>
        </view>
      </view>
    </view>
    
    <!-- 充值弹窗 -->
    <view v-if="showRechargeModal" class="modal-mask" @tap="showRechargeModal = false">
      <view class="modal-content" @tap.stop>
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
          
          <view class="remark-input">
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
      <view class="modal-content" @tap.stop>
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
          
          <view v-if="deductForm.reason === 'other'" class="other-reason-input">
            <input 
              v-model="deductForm.otherReason" 
              class="other-input"
              placeholder="请输入扣款原因"
            />
          </view>
          
          <text class="modal-label">选择货物（可选）</text>
          <view class="product-select">
            <view 
              v-for="product in store.products" 
              :key="product.id"
              class="product-select-item"
              :class="{ 'product-select-item--active': deductForm.productId === product.id }"
            >
              <view class="product-select-item__left" @tap="selectDeductProduct(product.id)">
                <view class="product-select-item__check">
                  <text v-if="deductForm.productId === product.id">✓</text>
                </view>
                <text class="product-select-item__name">{{ product.name }}</text>
              </view>
              <view v-if="deductForm.productId === product.id" class="product-select-item__quantity" @tap.stop>
                <view class="quantity-control">
                  <view class="quantity-btn quantity-btn--small" @tap="changeDeductQuantity(-1)">-</view>
                  <input 
                    type="number" 
                    :value="deductForm.quantity" 
                    class="quantity-input quantity-input--small"
                    @input="(e: any) => setDeductQuantity(Number(e.detail?.value ?? (e.target as HTMLInputElement)?.value ?? 0))"
                  />
                  <view class="quantity-btn quantity-btn--small" @tap="changeDeductQuantity(1)">+</view>
                </view>
              </view>
            </view>
          </view>
          
          <view class="remark-input">
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
      <view class="modal-content modal-content--large" @tap.stop>
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
              <view v-if="transferForm.productId === product.id" class="product-select-item__quantity" @tap.stop>
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
        </view>
        
        <view class="modal-actions">
          <view class="modal-btn modal-btn--cancel" @tap="showTransferModal = false">取消</view>
          <view class="modal-btn modal-btn--confirm" @tap="confirmTransfer">确认调货</view>
        </view>
      </view>
    </view>
    
    <!-- 补充数据弹窗 -->
    <view v-if="showSupplementModal" class="modal-mask" @tap="showSupplementModal = false">
      <view class="modal-content" @tap.stop>
        <text class="modal-title">补充销售数据</text>
        <text class="modal-desc">此操作仅更新任务完成率统计，不影响代理商余额</text>
        
        <view class="modal-form">
          <text class="modal-label">产品类型</text>
          <view class="product-type-grid">
            <view 
              class="product-type-item"
              :class="{ 'product-type-item--active': supplementForm.productType === 'productA' }"
              @tap="supplementForm.productType = 'productA'"
            >
              <text>A产品</text>
            </view>
            <view 
              class="product-type-item"
              :class="{ 'product-type-item--active': supplementForm.productType === 'mixed' }"
              @tap="supplementForm.productType = 'mixed'"
            >
              <text>混合产品 (B+C+D)</text>
            </view>
          </view>
          
          <QuickInput
            v-model="supplementForm.quantity"
            label="数量（箱）"
            type="number"
            placeholder="请输入数量"
            required
          />
          
          <view class="form-item">
            <text class="modal-label">销售日期</text>
            <input 
              type="date" 
              v-model="supplementForm.saleDate" 
              class="form-picker"
              placeholder="选择日期（默认今天）"
            />
          </view>
          
          <view class="form-item">
            <text class="modal-label">备注（可选）</text>
            <input 
              v-model="supplementForm.remark" 
              class="remark-input-field"
              placeholder="如：补录历史数据"
            />
          </view>
        </view>
        
        <view class="modal-actions">
          <view class="modal-btn modal-btn--cancel" @tap="showSupplementModal = false">取消</view>
          <view class="modal-btn modal-btn--confirm" @tap="confirmSupplement">确认补充</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShow, onMounted } from '@dcloudio/uni-app'
import { useAppStore } from '@/stores/app'
import BalanceCard from '@/components/BalanceCard/index.vue'
import TagSelect from '@/components/TagSelect/index.vue'
import QuickInput from '@/components/QuickInput/index.vue'
import ImageUploader from '@/components/ImageUploader/index.vue'
import { paymentAccountApi, supplementApi, agentApi } from '@/api'
import type { TransactionReason } from '@/types'

const store = useAppStore()
const agentId = ref('')

const agent = computed(() => store.agents.find(a => a.id === agentId.value))
const performance = ref<{ yearlyStats: { [productId: string]: { target: number; completed: number; percentage: number } } } | null>(null)

// 合并订单和交易记录
const recentRecords = computed(() => {
  if (!agentId.value) return []
  
  const transactions = store.getAgentTransactions(agentId.value).map(tx => ({
    type: 'transaction' as const,
    id: tx.id,
    reason: tx.reason,
    amount: tx.amount,
    paymentAccountName: tx.paymentAccountName,
    remark: tx.remark,
    createdAt: tx.createdAt
  }))
  
  const orders = store.getAgentOrders(agentId.value).map(order => ({
    type: 'order' as const,
    id: order.id,
    items: order.items,
    totalAmount: order.totalAmount,
    remark: order.remark,
    createdAt: order.createdAt
  }))
  
  // 合并并按时间倒序排序
  const allRecords = [...transactions, ...orders].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
  
  // 只取前10条
  return allRecords.slice(0, 10)
})

// 获取商品名称
const getProductName = (productId: string) => {
  const product = store.products.find(p => p.id === productId)
  return product?.name || productId
}

// 获取目标标签（支持组合目标和单个目标）
const getTargetLabel = (key: string, stats: any) => {
  // 如果是组合目标
  if (stats.isGroup) {
    // 优先使用 productNames（后端已经处理了组合名称）
    if (stats.productNames) {
      return stats.productNames
    }
    // 如果没有 productNames，尝试从 products 数组生成
    if (stats.products && Array.isArray(stats.products)) {
      return stats.products.map((pid: string) => getProductName(pid)).join(' + ')
    }
    // 如果都没有，检查 key 是否是组合 key
    if (key.startsWith('_group_') || key.startsWith('group_')) {
      // 尝试从 yearlyTargets 中获取组合信息
      const agent = store.agents.find(a => a.id === agentId.value)
      if (agent && agent.yearlyTargets) {
        const groupTarget = agent.yearlyTargets[key]
        if (groupTarget && typeof groupTarget === 'object' && 'products' in groupTarget) {
          const products = (groupTarget as any).products
          if (Array.isArray(products)) {
            return products.map((pid: string) => getProductName(pid)).join(' + ')
          }
        }
      }
    }
    // 最后的后备方案：返回 key（不应该到这里）
    return key
  }
  // 单个产品目标
  return getProductName(key)
}

// 弹窗控制
const showRechargeModal = ref(false)
const showDeductModal = ref(false)
const showTransferModal = ref(false)
const showSupplementModal = ref(false)

// 充值表单
const rechargeForm = ref({
  agentId: null as string | null,
  reason: 'payment' as 'payment' | 'freight' | 'other',
  amount: 0,
  proof: [] as string[],
  remark: '',
  paymentAccountId: null as string | null
})

// 收款账户列表
const paymentAccounts = ref<Array<{ id: string; name: string }>>([])

// 收款账户选项
const paymentAccountOptions = computed(() =>
  paymentAccounts.value.map(pa => ({
    label: pa.name,
    value: pa.id
  }))
)

// 加载收款账户
const loadPaymentAccounts = async () => {
  try {
    const accounts = await paymentAccountApi.getAll()
    // 确保 accounts 是数组
    if (!Array.isArray(accounts)) {
      console.error('收款账户数据格式错误:', accounts)
      paymentAccounts.value = []
      return
    }
    paymentAccounts.value = accounts
  } catch (error) {
    console.error('加载收款账户失败:', error)
    paymentAccounts.value = []
  }
}


// 扣款表单
const deductForm = ref({
  agentId: null as string | null,
  reason: 'shipping' as 'shipping' | 'other',
  amount: 0,
  otherReason: '',
  productId: null as string | null,
  quantity: 0,
  remark: ''
})

// 调货表单
const transferForm = ref({
  fromAgentId: null as string | null,
  toAgentId: null as string | null,
  productId: null as string | null,
  quantity: 0,
  discount: 0
})

// 补充数据表单
const supplementForm = ref({
  productType: 'productA' as 'productA' | 'mixed',
  quantity: 0,
  saleDate: '',
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

// 选择充值原因
const selectRechargeReason = (reason: 'payment' | 'freight' | 'other') => {
  rechargeForm.value.reason = reason
}

// 选择扣款原因
const selectDeductReason = (reason: 'shipping' | 'other') => {
  deductForm.value.reason = reason
  if (reason !== 'other') {
    deductForm.value.otherReason = ''
  }
}

// 选择扣款商品
const selectDeductProduct = (productId: string) => {
  uni.vibrateShort({ type: 'light' })
  if (deductForm.value.productId === productId) {
    deductForm.value.productId = null
    deductForm.value.quantity = 0
  } else {
    deductForm.value.productId = productId
    deductForm.value.quantity = deductForm.value.quantity || 1
  }
}

// 修改扣款商品数量
const changeDeductQuantity = (delta: number) => {
  deductForm.value.quantity = Math.max(1, deductForm.value.quantity + delta)
}

// 设置扣款商品数量
const setDeductQuantity = (value: number) => {
  deductForm.value.quantity = Math.max(1, value || 1)
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
      rechargeForm.value.agentId!,
      rechargeForm.value.amount,
      finalReason,
      rechargeForm.value.proof.length > 0 ? rechargeForm.value.proof[0] : undefined,
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
  if (deductForm.value.reason === 'other' && !deductForm.value.otherReason) {
    uni.showToast({ title: '请输入扣款原因', icon: 'none' })
    return
  }
  
  try {
    const reason = deductForm.value.reason === 'other' ? 'fine' : deductForm.value.reason
    // 组合备注：扣款原因 + 用户备注（商品信息单独存储）
    let remark = ''
    if (deductForm.value.reason === 'other' && deductForm.value.otherReason) {
      remark = deductForm.value.otherReason
    }
    if (deductForm.value.remark) {
      remark = remark ? `${remark}；${deductForm.value.remark}` : deductForm.value.remark
    }
    
    await store.deduct(
      deductForm.value.agentId,
      deductForm.value.amount,
      reason,
      remark || undefined,
      deductForm.value.productId || undefined,
      deductForm.value.quantity || undefined
    )
    
    uni.showToast({ title: '扣款成功', icon: 'success' })
    showDeductModal.value = false
    deductForm.value = { agentId: null, reason: 'shipping', amount: 0, otherReason: '', productId: null, quantity: 0, remark: '' }
  } catch (error: any) {
    uni.showToast({ title: error.message || '扣款失败', icon: 'none' })
  }
}

// 确认补充数据
const confirmSupplement = async () => {
  if (!supplementForm.value.quantity || supplementForm.value.quantity <= 0) {
    uni.showToast({ title: '请输入数量', icon: 'none' })
    return
  }
  
  if (!agentId.value) {
    uni.showToast({ title: '代理信息错误', icon: 'none' })
    return
  }
  
  try {
    await supplementApi.create(agentId.value, {
      productType: supplementForm.value.productType,
      quantity: supplementForm.value.quantity,
      saleDate: supplementForm.value.saleDate || undefined,
      remark: supplementForm.value.remark || undefined
    })
    
    uni.showToast({ title: '补充数据成功', icon: 'success' })
    showSupplementModal.value = false
    supplementForm.value = { productType: 'productA', quantity: 0, saleDate: '', remark: '' }
    
    // 刷新数据
    await Promise.all([store.loadAgents(), store.loadOrders()])
  } catch (error: any) {
    uni.showToast({ title: error.message || '补充数据失败', icon: 'none' })
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
      transferForm.value.quantity || undefined
    )
    
    uni.showToast({ title: '调货成功', icon: 'success' })
    showTransferModal.value = false
    transferForm.value = { fromAgentId: null, toAgentId: null, productId: null, quantity: 0, discount: 0 }
  } catch (error: any) {
    uni.showToast({ title: error.message || '调货失败', icon: 'none' })
  }
}

// 加载统计数据
const loadPerformance = async () => {
  if (!agentId.value) return
  try {
    const data = await agentApi.getStatistics(agentId.value)
    performance.value = {
      yearlyStats: data.yearlyStats || {}
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

onLoad(async (options) => {
  if (options?.id) {
    agentId.value = options.id
    uni.setNavigationBarTitle({
      title: agent.value?.name || '代理详情'
    })
    // 加载订单和交易记录
    await Promise.all([
      store.loadOrders(),
      store.loadTransactions()
    ])
    await loadPerformance()
  }
})

// 页面显示时刷新数据（从编辑页面返回时）
onShow(async () => {
  if (agentId.value) {
    // 刷新代理列表、订单和交易记录
    await Promise.all([
      store.loadAgents(),
      store.loadOrders(),
      store.loadTransactions()
    ])
    // 刷新统计数据
    await loadPerformance()
    // 更新导航栏标题（名称可能已修改）
    uni.setNavigationBarTitle({
      title: agent.value?.name || '代理详情'
    })
  }
})

const callPhone = (phone: string) => {
  uni.makePhoneCall({ phoneNumber: phone })
}

const getTransactionIcon = (reason: TransactionReason) => {
  const icons: Record<TransactionReason, string> = {
    gift: '/static/icons/gift.svg',
    payment: '/static/icons/credit-card.svg',
    shipping: '/static/icons/box.svg',
    fine: '/static/icons/warning.svg',
    transfer_in: '/static/icons/arrow-down-circle.svg',
    transfer_out: '/static/icons/arrow-up-circle.svg',
    marketing: '/static/icons/target.svg'
  }
  return icons[reason] || '/static/icons/money.svg'
}

const getTransactionLabel = (reason: TransactionReason) => {
  const labels: Record<TransactionReason, string> = {
    gift: '赠送',
    payment: '打款充值',
    shipping: '发货扣款',
    fine: '罚款',
    transfer_in: '调货收入',
    transfer_out: '调货支出',
    marketing: '营销退款'
  }
  return labels[reason] || '其他'
}

// 格式化记录时间
const formatRecordTime = (time: string | Date) => {
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

const goToRecharge = async () => {
  rechargeForm.value.agentId = agentId.value
  await loadPaymentAccounts()
  showRechargeModal.value = true
}

const goToDeduct = () => {
  deductForm.value.agentId = agentId.value
  showDeductModal.value = true
}

const goToTransfer = () => {
  transferForm.value.fromAgentId = agentId.value
  showTransferModal.value = true
}

const goToEdit = () => {
  uni.navigateTo({
    url: `/pages/admin/agents/edit?id=${agentId.value}`
  })
}

const goToOrders = () => {
  uni.navigateTo({
    url: `/pages/admin/orders/list?agentId=${agentId.value}`
  })
}

// 确认删除代理
const confirmDeleteAgent = () => {
  if (!agent.value) return
  uni.showModal({
    title: '删除代理',
    content: `确定要删除代理"${agent.value.name}"吗？\n\n注意：如果该代理存在订单或交易记录，将无法删除。`,
    confirmText: '删除',
    confirmColor: '#FF4D4F',
    success: async (res) => {
      if (res.confirm) {
        try {
          await agentApi.delete(agentId.value)
          // 刷新代理列表
          await store.loadAgents()
          uni.showToast({ title: '删除成功', icon: 'success' })
          setTimeout(() => {
            uni.navigateBack()
          }, 1500)
        } catch (error: any) {
          uni.showToast({ title: error.message || '删除失败', icon: 'none' })
        }
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.agent-detail {
  padding: 24rpx;
}

.profile-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx;
  background: #fff;
  border-radius: $border-radius-lg;
  margin-bottom: 24rpx;
  box-shadow: $shadow-sm;
  
  &__delete {
    position: absolute;
    top: 24rpx;
    right: 24rpx;
    width: 64rpx;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba($danger-color, 0.1);
    border-radius: 50%;
    
    &:active {
      transform: scale(0.9);
      background: rgba($danger-color, 0.2);
    }
  }
  
  &__avatar {
    width: 160rpx;
    height: 160rpx;
    border-radius: 50%;
    background: $bg-grey;
    margin-bottom: 20rpx;
  }
  
  &__name {
    font-size: 40rpx;
    font-weight: 700;
    color: $text-primary;
    margin-bottom: 16rpx;
  }
  
  &__phones {
    display: flex;
    gap: 24rpx;
    margin-bottom: 12rpx;
  }
  
  &__phone {
    font-size: 28rpx;
    color: $primary-color;
    padding: 8rpx 16rpx;
    background: rgba($primary-color, 0.1);
    border-radius: 8rpx;
  }
  
  &__address {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26rpx;
    color: $text-secondary;
    text-align: center;
  }
}

.delete-icon {
  width: 36rpx;
  height: 36rpx;
}

.address-icon {
  width: 32rpx;
  height: 32rpx;
  margin-right: 8rpx;
}

.phone-icon {
  width: 28rpx;
  height: 28rpx;
  margin-right: 8rpx;
}

.action-icon {
  width: 40rpx;
  height: 40rpx;
}

.tx-icon {
  width: 36rpx;
  height: 36rpx;
}

.targets {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.target-progress {
  &__header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12rpx;
  }
  
  &__label {
    font-size: 28rpx;
    color: $text-primary;
  }
  
  &__value {
    font-size: 26rpx;
    color: $text-secondary;
  }
  
  &__percent {
    display: block;
    text-align: right;
    font-size: 24rpx;
    color: $primary-color;
    font-weight: 600;
    margin-top: 8rpx;
  }
}

.empty-targets {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 0;
  
  .empty-text {
    font-size: 28rpx;
    color: $text-placeholder;
  }
}

.progress-bar--lg {
  height: 20rpx;
}

.progress-inner--green {
  background: linear-gradient(90deg, #10B981 0%, #059669 100%);
}

.action-grid {
  display: flex;
  gap: 20rpx;
  margin-bottom: 24rpx;
}

.action-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx;
  background: #fff;
  border-radius: $border-radius;
  box-shadow: $shadow-sm;
  
  &:active {
    transform: scale(0.96);
  }
  
  &__icon {
    width: 80rpx;
    height: 80rpx;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40rpx;
    margin-bottom: 12rpx;
    
    &--success { background: rgba($success-color, 0.1); }
    &--danger { background: rgba($danger-color, 0.1); }
    &--primary { background: rgba($primary-color, 0.1); }
    &--warning { background: rgba($warning-color, 0.1); }
    &--teal { background: rgba(#0D9488, 0.1); }
  }
  
  &__text {
    font-size: 26rpx;
    color: $text-secondary;
  }
}

.transaction-list {
  display: flex;
  flex-direction: column;
}

.transaction-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid $border-color;
  
  &:last-child {
    border-bottom: none;
  }
  
  &__icon {
    width: 64rpx;
    height: 64rpx;
    border-radius: 50%;
    background: $bg-grey;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32rpx;
    margin-right: 16rpx;
  }
  
  &__info {
    flex: 1;
  }
  
  &__reason {
    font-size: 28rpx;
    color: $text-primary;
    display: block;
  }
  
  &__time {
    font-size: 24rpx;
    color: $text-placeholder;
    display: block;
    margin-top: 8rpx;
    font-weight: 400;
    margin-top: 4rpx;
  }
  
  &__payee {
    font-size: 24rpx;
    color: $primary-color;
    display: block;
    margin-top: 4rpx;
  }
  
  &__remark {
    font-size: 24rpx;
    color: $text-secondary;
    display: block;
    margin-top: 4rpx;
  }
  
  &__details {
    display: flex;
    flex-wrap: wrap;
    gap: 8rpx;
    margin-top: 8rpx;
  }
  
  &__amount {
    font-size: 32rpx;
    font-weight: 600;
  }
}

.detail-item {
  font-size: 22rpx;
  color: $text-secondary;
  padding: 4rpx 10rpx;
  background: $bg-grey;
  border-radius: 4rpx;
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
  touch-action: none;
}

.modal-content {
  width: 100%;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 40rpx;
  padding-bottom: calc(40rpx + env(safe-area-inset-bottom));
  max-height: 80vh;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  overscroll-behavior: contain;
  
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

.other-reason-input {
  margin-top: 16rpx;
  margin-bottom: 16rpx;
}

.other-input {
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
    background: #fff;
  }
}

.product-type-grid {
  display: flex;
  gap: 16rpx;
}

.product-type-item {
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

.form-item {
  margin-bottom: 24rpx;
}

.form-picker {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  font-size: 28rpx;
  color: $text-primary;
  border: 2rpx solid transparent;
  box-sizing: border-box;
  
  &:focus {
    border-color: $primary-color;
    background: #fff;
    outline: none;
  }
  
  &::-webkit-calendar-picker-indicator {
    opacity: 0.6;
    cursor: pointer;
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
</style>

