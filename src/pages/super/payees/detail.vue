<template>
  <view class="payee-detail-page">
    <!-- 余额卡片 -->
    <view class="balance-card" v-if="accountDetail">
      <text class="balance-card__label">当前余额</text>
      <text class="balance-card__value" :class="{ 'amount-negative': accountDetail.account.balance < 0 }">
        ¥{{ accountDetail.account.balance.toLocaleString() }}
      </text>
    </view>
    
    <!-- 账户信息 -->
    <view v-if="accountInfo" class="card account-info">
      <view v-if="accountInfo.accountNo" class="account-info__item">
        <text class="account-info__label">账号：</text>
        <text class="account-info__value">{{ accountInfo.accountNo }}</text>
      </view>
      <view v-if="accountInfo.bankName" class="account-info__item">
        <text class="account-info__label">开户银行：</text>
        <text class="account-info__value">{{ accountInfo.bankName }}</text>
      </view>
      <view v-if="qrCodes.length > 0" class="account-info__item">
        <text class="account-info__label">收款二维码：</text>
        <view class="qr-codes-grid">
          <image 
            v-for="(qrCode, index) in qrCodes" 
            :key="index"
            :src="qrCode" 
            class="account-info__qr-code" 
            mode="aspectFit"
            @tap="previewImage(qrCode, qrCodes)"
          />
        </view>
      </view>
    </view>
    
    <!-- 筛选 -->
    <view class="card filter-section">
      <view class="filter-bar">
        <view 
          v-for="filter in filters" 
          :key="filter.value"
          class="filter-item"
          :class="{ 'filter-item--active': currentFilter === filter.value }"
          @tap="currentFilter = filter.value"
        >
          {{ filter.label }}
        </view>
      </view>
    </view>
    
    <!-- 余额明细 -->
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
            <text v-if="tx.agentName" class="transaction-card__agent" @tap.stop="goToAgentDetail(tx.agentId)">
              {{ tx.agentName }}
            </text>
            <text class="transaction-card__reason">{{ getLabel(tx.reason) }}</text>
          </view>
          <view class="transaction-card__right">
            <text 
              class="transaction-card__amount"
              :class="{ 
                'amount-positive': tx.amount > 0,
                'amount-negative': tx.amount < 0 && !['withdraw', 'fee', 'other'].includes(tx.reason),
                'amount-neutral': tx.amount < 0 && ['withdraw', 'fee', 'other'].includes(tx.reason)
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
          <text v-if="tx.remark" class="transaction-card__remark">{{ tx.remark }}</text>
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
        <text class="empty-text">暂无交易记录</text>
      </view>
    </view>
    
    <!-- 扣费按钮 -->
    <view class="deduct-btn" @tap="openDeductModal">
      <text class="deduct-btn__text">扣费</text>
    </view>
    
    <!-- 收款账户扣费弹窗 -->
    <view v-if="showDeductModal" class="modal-mask" @tap="showDeductModal = false">
      <view class="modal-content" @tap.stop>
        <text class="modal-title">收款账户扣费</text>
        
        <!-- 错误提示 -->
        <view v-if="deductError" class="modal-error">
          <text class="modal-error__text">{{ deductError }}</text>
        </view>
        
        <view class="modal-form">
          <text class="modal-label">收款账户</text>
          <view class="selected-account">
            <text>{{ accountName }}</text>
          </view>
          
          <text class="modal-label">扣费原因</text>
          <view class="reason-grid">
            <view 
              class="reason-item"
              :class="{ 'reason-item--active': deductForm.reason === 'withdraw' }"
              @tap="deductForm.reason = 'withdraw'"
            >
              提现
            </view>
            <view 
              class="reason-item"
              :class="{ 'reason-item--active': deductForm.reason === 'fee' }"
              @tap="deductForm.reason = 'fee'"
            >
              手续费
            </view>
            <view 
              class="reason-item"
              :class="{ 'reason-item--active': deductForm.reason === 'other' }"
              @tap="deductForm.reason = 'other'"
            >
              其他
            </view>
          </view>
          
          <view class="form-item">
            <text class="modal-label">{{ deductForm.reason === 'other' ? '扣费原因' : '备注（可选）' }}</text>
            <input 
              v-model="deductForm.remark" 
              class="form-item__input"
              :placeholder="deductForm.reason === 'other' ? '请输入扣费原因' : '请输入备注信息'"
            />
          </view>
          
          <QuickInput
            v-model="deductForm.amount"
            label="扣费金额"
            type="digit"
            prefix="¥"
            :showQuickNumbers="true"
            :quickNumbers="[100, 500, 1000, 5000]"
            :allowDecimal="false"
          />
        </view>
        
        <view class="modal-actions">
          <view class="modal-btn modal-btn--cancel" @tap="showDeductModal = false">取消</view>
          <view class="modal-btn modal-btn--confirm modal-btn--danger" @tap="confirmDeduct">确认扣费</view>
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
import { onLoad, onShow } from '@dcloudio/uni-app'
import { paymentAccountApi, transactionApi } from '@/api'
import { useAppStore } from '@/stores/app'
import QuickInput from '@/components/QuickInput/index.vue'
import type { Transaction, TransactionReason } from '@/types'

const store = useAppStore()

interface PaymentAccount {
  id: string
  name: string
  accountNo?: string
  bankName?: string
  qrCode?: string
  balance?: number
}

const accountId = ref<string>('')
const accountName = ref<string>('')
const accountInfo = ref<PaymentAccount | null>(null)
const accountDetail = ref<{
  account: { id: string; name: string; balance: number }
  transactions: Transaction[]
} | null>(null)

const showDeductModal = ref(false)
const deductError = ref('')

// 筛选
const filters = [
  { label: '全部', value: 'all' },
  { label: '收款', value: 'recharge' },
  { label: '扣费', value: 'deduct' }
]
const currentFilter = ref('all')

const filteredTransactions = computed(() => {
  if (!accountDetail.value) return []
  if (currentFilter.value === 'all') return accountDetail.value.transactions
  return accountDetail.value.transactions.filter(t => t.type === currentFilter.value)
})

// 解析二维码数组
const qrCodes = computed(() => {
  if (!accountInfo.value || !accountInfo.value.qrCode) return []
  const qrCode = accountInfo.value.qrCode
  if (typeof qrCode === 'string') {
    try {
      const parsed = JSON.parse(qrCode)
      return Array.isArray(parsed) ? parsed : [qrCode]
    } catch {
      return [qrCode]
    }
  } else if (Array.isArray(qrCode)) {
    return qrCode
  }
  return []
})

// 扣费表单
const deductForm = ref({
  reason: 'withdraw' as 'withdraw' | 'fee' | 'other',
  amount: 0,
  remark: ''
})

// 加载账户详情
const loadAccountDetail = async () => {
  if (!accountId.value) return
  
  try {
    // 获取账户信息
    const accounts = await paymentAccountApi.getAll()
    const account = accounts.find((a: any) => a.id === accountId.value)
    if (account) {
      accountInfo.value = {
        id: account.id,
        name: account.name || '',
        accountNo: account.accountNo || account.account_no,
        bankName: account.bankName || account.bank_name,
        qrCode: account.qrCode || account.qr_code
      }
    }
    
    // 获取余额明细
    const detail = await paymentAccountApi.getBalanceDetails(accountId.value)
    accountDetail.value = detail
    currentFilter.value = 'all'
  } catch (error) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

// 打开扣费弹窗
const openDeductModal = () => {
  deductError.value = ''
  showDeductModal.value = true
}

// 确认扣费
const confirmDeduct = async () => {
  // 清除之前的错误
  deductError.value = ''
  
  if (!accountId.value) {
    deductError.value = '请选择收款账户'
    return
  }
  if (deductForm.value.amount === undefined || deductForm.value.amount === null || deductForm.value.amount <= 0) {
    deductError.value = '请输入扣费金额（必须大于0）'
    return
  }
  if (deductForm.value.reason === 'other' && !deductForm.value.remark) {
    deductError.value = '请输入扣费原因'
    return
  }
  
  try {
    const reason = deductForm.value.reason === 'other' 
      ? deductForm.value.remark 
      : deductForm.value.reason
    
    await paymentAccountApi.deduct(accountId.value, {
      amount: deductForm.value.amount,
      reason: reason,
      remark: deductForm.value.remark || undefined
    })
    
    uni.showToast({ title: '扣费成功', icon: 'success' })
    showDeductModal.value = false
    deductForm.value = { reason: 'withdraw', amount: 0, remark: '' }
    deductError.value = ''
    
    // 刷新详情
    await loadAccountDetail()
  } catch (error: any) {
    deductError.value = error.message || '扣费失败'
  }
}

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
    marketing: '/static/icons/target.svg',
    withdraw: '/static/icons/file-text.svg',
    fee: '/static/icons/file-text.svg',
    other: '/static/icons/file-text.svg'
  }
  return icons[reason] || '/static/icons/credit-card.svg'
}

// 获取标签
const getLabel = (reason: TransactionReason | string) => {
  const labels: Record<string, string> = {
    gift: '赠送',
    payment: '打款充值',
    freight: '运费',
    shipping: '发货扣款',
    fine: '罚款',
    transfer_in: '调货收入',
    transfer_out: '调货支出',
    marketing: '营销退款',
    // 收款账户扣费原因
    withdraw: '提现',
    fee: '手续费',
    other: '其他'
  }
  return labels[reason] || reason
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

// 图片预览状态
const showImagePreview = ref(false)
const previewImageUrls = ref<string[]>([])
const previewImageIndex = ref(0)

// 预览图片
const previewImage = (url: string, urls?: string[]) => {
  previewImageUrls.value = urls && urls.length > 0 ? urls : [url]
  previewImageIndex.value = previewImageUrls.value.indexOf(url)
  if (previewImageIndex.value < 0) previewImageIndex.value = 0
  showImagePreview.value = true
}

// 预览凭证
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

// 跳转到代理详情
const goToAgentDetail = (agentId: string) => {
  uni.navigateTo({
    url: `/pages/super/agents/detail?id=${agentId}`
  })
}

// 编辑交易记录
const editTransaction = (tx: Transaction) => {
  uni.navigateTo({
    url: `/pages/super/transactions/edit?id=${tx.id}`
  })
}

// 删除交易记录
const deleteTransaction = (tx: Transaction) => {
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
          await loadAccountDetail()
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

onLoad(async (options) => {
  if (options?.id) {
    accountId.value = options.id
    accountName.value = options.name || '收款账户'
    uni.setNavigationBarTitle({
      title: accountName.value
    })
    await loadAccountDetail()
  } else {
    uni.showToast({ title: '参数错误', icon: 'none' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  }
})

onShow(async () => {
  // 当从编辑页面返回时，刷新账户详情和交易记录
  if (accountId.value) {
    await loadAccountDetail()
    // 同时刷新全局交易记录和代理商数据（因为编辑交易记录后余额可能变化）
    await Promise.all([
      store.loadTransactions(),
      store.loadAgents()
    ])
  }
})
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.payee-detail-page {
  padding: 24rpx;
  padding-bottom: calc(100rpx + 40rpx + env(safe-area-inset-bottom));
}

.card {
  background: #fff;
  border-radius: $border-radius-lg;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: $shadow-sm;
}

.balance-card {
  padding: 32rpx;
  background: linear-gradient(135deg, $primary-color 0%, lighten($primary-color, 10%) 100%);
  border-radius: $border-radius-lg;
  color: #fff;
  margin-bottom: 24rpx;
  
  &__label {
    font-size: 24rpx;
    opacity: 0.9;
    display: block;
    margin-bottom: 12rpx;
  }
  
  &__value {
    font-size: 56rpx;
    font-weight: 700;
    display: block;
    color: #fff;
  }
}

.amount-negative {
  color: rgba(255, 255, 255, 0.8) !important;
}

.account-info {
  &__item {
    display: flex;
    align-items: flex-start;
    margin-bottom: 16rpx;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  &__label {
    font-size: 26rpx;
    color: $text-secondary;
    margin-right: 12rpx;
  }
  
  &__value {
    font-size: 26rpx;
    color: $text-primary;
  }
  
  &__qr-code {
    width: 200rpx;
    height: 200rpx;
    border-radius: $border-radius;
    border: 2rpx solid $border-color;
    
    &:active {
      opacity: 0.8;
    }
  }
}

.qr-codes-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 8rpx;
}

.filter-section {
  padding: 20rpx 24rpx;
}

.filter-bar {
  display: flex;
  gap: 16rpx;
}

.filter-item {
  flex: 1;
  padding: 16rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  text-align: center;
  font-size: 26rpx;
  color: $text-secondary;
  
  &:active {
    opacity: 0.7;
  }
  
  &--active {
    background: $primary-color;
    color: #fff;
  }
}

.transaction-list {
  margin-bottom: 24rpx;
}

.transaction-card {
  padding: 24rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  margin-bottom: 16rpx;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &__header {
    display: flex;
    align-items: center;
    margin-bottom: 12rpx;
  }
  
  &__icon {
    width: 48rpx;
    height: 48rpx;
    margin-right: 16rpx;
  }
  
  .tx-icon {
    width: 48rpx;
    height: 48rpx;
  }
  
  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4rpx;
  }
  
  &__agent {
    font-size: 28rpx;
    font-weight: 500;
    color: $text-primary;
    
    &:active {
      color: $primary-color;
    }
  }
  
  &__reason {
    font-size: 24rpx;
    color: $text-secondary;
  }
  
  &__right {
    display: flex;
    align-items: center;
    gap: 12rpx;
  }
  
  &__amount {
    font-size: 32rpx;
    font-weight: 600;
  }
  
  .amount-positive {
    color: $success-color;
  }
  
  .amount-negative {
    color: $danger-color;
  }
  
  .amount-neutral {
    color: $text-secondary;
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
    justify-content: space-between;
    align-items: center;
  }
  
  &__time-wrapper {
    display: flex;
    align-items: center;
  }
  
  &__time {
    font-size: 22rpx;
    color: $text-placeholder;
  }
  
  &__remark {
    font-size: 22rpx;
    color: $text-secondary;
    max-width: 60%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  &__actions {
    display: flex;
    gap: 16rpx;
    margin-top: 12rpx;
    padding-top: 12rpx;
    border-top: 1rpx solid rgba(0, 0, 0, 0.05);
  }
  
  &__edit-btn {
    flex: 1;
    padding: 12rpx;
    background: rgba($warning-color, 0.1);
    border-radius: 8rpx;
    text-align: center;
    
    &:active {
      background: rgba($warning-color, 0.2);
    }
  }
  
  &__delete-btn {
    flex: 1;
    padding: 12rpx;
    background: rgba($danger-color, 0.1);
    border-radius: 8rpx;
    text-align: center;
    
    &:active {
      background: rgba($danger-color, 0.2);
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

.proof-more-badge {
  width: 100rpx;
  height: 100rpx;
  border-radius: 12rpx;
  background: rgba($primary-color, 0.1);
  border: 2rpx solid rgba($primary-color, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  
  text {
    font-size: 24rpx;
    color: $primary-color;
    font-weight: 600;
  }
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

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
  
  .empty-text {
    font-size: 28rpx;
    color: $text-placeholder;
  }
}

.deduct-btn {
  position: fixed;
  bottom: calc(40rpx + env(safe-area-inset-bottom));
  left: 24rpx;
  right: 24rpx;
  height: 88rpx;
  background: $danger-color;
  border-radius: $border-radius;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba($danger-color, 0.4);
  z-index: 100;
  
  &:active {
    opacity: 0.8;
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

.modal-error {
  margin-bottom: 24rpx;
  padding: 20rpx 24rpx;
  background: rgba($danger-color, 0.1);
  border: 2rpx solid rgba($danger-color, 0.3);
  border-radius: $border-radius;
  
  &__text {
    font-size: 28rpx;
    color: $danger-color;
    line-height: 1.5;
  }
}

.modal-form {
  margin-bottom: 32rpx;
}

.form-item {
  margin-bottom: 32rpx;
  
  &__input {
    width: 100%;
    min-height: 88rpx;
    padding: 20rpx 24rpx;
    background: $bg-grey;
    border-radius: $border-radius;
    font-size: 30rpx;
    color: $text-primary;
    border: 2rpx solid $border-color;
    box-sizing: border-box;
    
    &:focus {
      border-color: $primary-color;
      background: #fff;
    }
  }
}

.modal-label {
  font-size: 28rpx;
  font-weight: 500;
  color: $text-primary;
  margin-bottom: 16rpx;
  display: block;
}

.selected-account {
  padding: 20rpx 24rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  font-size: 30rpx;
  color: $text-primary;
  margin-bottom: 32rpx;
}

.reason-grid {
  display: flex;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.reason-item {
  flex: 1;
  padding: 20rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  text-align: center;
  font-size: 28rpx;
  color: $text-primary;
  border: 2rpx solid transparent;
  
  &:active {
    opacity: 0.7;
  }
  
  &--active {
    background: rgba($primary-color, 0.1);
    border-color: $primary-color;
    color: $primary-color;
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
  
  &:active {
    opacity: 0.8;
  }
  
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
</style>
