<template>
  <view class="payees-page">
    <!-- 收款账户列表 -->
    <view class="account-list">
      <view 
        v-for="account in paymentAccounts" 
        :key="account.id"
        class="account-item"
      >
        <view class="account-item__main" @tap="viewAccountDetail(account.id, account.name)">
          <view class="account-item__info">
            <text class="account-item__name">{{ account.name }}</text>
            <text class="account-item__balance" :class="{ 'amount-negative': (account.balance || 0) < 0 }">
              余额：¥{{ (account.balance || 0).toLocaleString() }}
            </text>
            <text v-if="account.accountNo" class="account-item__account-no">{{ account.accountNo }}</text>
            <text v-if="account.bankName" class="account-item__bank-name">{{ account.bankName }}</text>
          </view>
          <text class="account-item__arrow">›</text>
        </view>
        <view class="account-item__actions">
          <view class="account-item__edit" @tap.stop="editAccount(account)">
            <image src="/static/icons/file-text.svg" class="action-icon" mode="aspectFit" />
          </view>
          <view class="account-item__delete" @tap.stop="confirmDeleteAccount(account.id, account.name)">
            <image src="/static/icons/x-circle.svg" class="delete-icon" mode="aspectFit" />
          </view>
        </view>
      </view>
    </view>
    
    <!-- 空状态 -->
    <view v-if="paymentAccounts.length === 0" class="empty-state">
      <image src="/static/icons/credit-card.svg" class="empty-icon" mode="aspectFit" />
      <text class="empty-text">暂无收款账户，点击下方按钮添加</text>
    </view>
    
    <!-- 添加按钮 -->
    <view class="add-btn" @tap="showAddModal = true">
      <text class="add-btn__icon">+</text>
      <text class="add-btn__text">添加收款账户</text>
    </view>
    
    <!-- 添加/编辑收款账户弹窗 -->
    <view v-if="showAddModal || showEditModal" class="modal-mask" @tap="closeFormModal">
      <view class="modal-content" @tap.stop>
        <text class="modal-title">{{ editingAccount ? '编辑收款账户' : '添加收款账户' }}</text>
        
        <view class="modal-form">
          <view class="form-item">
            <text class="form-item__label">账户名称 <text class="required">*</text></text>
            <input
              v-model="formData.name"
              class="form-item__input"
              placeholder="请输入账户名称，如：支付宝账户"
              maxlength="50"
            />
          </view>
          
          <view class="form-item">
            <text class="form-item__label">账号（可选）</text>
            <input
              v-model="formData.accountNo"
              class="form-item__input"
              placeholder="请输入账号"
              maxlength="100"
            />
          </view>
          
          <view class="form-item">
            <text class="form-item__label">开户银行（可选）</text>
            <input
              v-model="formData.bankName"
              class="form-item__input"
              placeholder="请输入开户银行"
              maxlength="100"
            />
          </view>
          
          <view class="form-item">
            <text class="form-item__label">收款二维码（可选）</text>
            <ImageUploader
              v-model="formData.qrCode"
              :maxCount="1"
              addText="上传二维码"
            />
          </view>
        </view>
        
        <view class="modal-actions">
          <view class="modal-btn modal-btn--cancel" @tap="closeFormModal">取消</view>
          <view class="modal-btn modal-btn--confirm" @tap="confirmSave">确认{{ editingAccount ? '保存' : '添加' }}</view>
        </view>
      </view>
    </view>
    
    <!-- 收款账户详情弹窗 -->
    <view v-if="showDetailModal" class="modal-mask" @tap="showDetailModal = false">
      <view class="modal-content modal-content--large" @tap.stop>
        <text class="modal-title">{{ selectedAccountName }}</text>
        
        <!-- 余额卡片 -->
        <view class="balance-card" v-if="accountDetail">
          <text class="balance-card__label">当前余额</text>
          <text class="balance-card__value" :class="{ 'amount-negative': accountDetail.account.balance < 0 }">
            ¥{{ accountDetail.account.balance.toLocaleString() }}
          </text>
        </view>
        
        <!-- 账户信息 -->
        <view v-if="selectedAccountInfo" class="account-info">
          <view v-if="selectedAccountInfo.accountNo" class="account-info__item">
            <text class="account-info__label">账号：</text>
            <text class="account-info__value">{{ selectedAccountInfo.accountNo }}</text>
          </view>
          <view v-if="selectedAccountInfo.bankName" class="account-info__item">
            <text class="account-info__label">开户银行：</text>
            <text class="account-info__value">{{ selectedAccountInfo.bankName }}</text>
          </view>
          <view v-if="selectedAccountInfo.qrCode" class="account-info__item">
            <text class="account-info__label">收款二维码：</text>
            <image 
              :src="selectedAccountInfo.qrCode" 
              class="account-info__qr-code" 
              mode="aspectFit"
              @tap="previewImage(selectedAccountInfo.qrCode)"
            />
          </view>
        </view>
        
        <!-- 筛选 -->
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
              </view>
              <text v-if="tx.remark" class="transaction-card__remark">{{ tx.remark }}</text>
            </view>
          </view>
          <view v-if="filteredTransactions.length === 0" class="empty-state">
            <text class="empty-text">暂无交易记录</text>
          </view>
        </view>
        
        <!-- 扣费按钮 -->
        <view class="deduct-btn" @tap="showDeductModal = true">
          <text class="deduct-btn__text">扣费</text>
        </view>
        
        <view class="modal-actions">
          <view class="modal-btn modal-btn--cancel" @tap="showDetailModal = false">关闭</view>
        </view>
      </view>
    </view>
    
    <!-- 收款账户扣费弹窗 -->
    <view v-if="showDeductModal" class="modal-mask" @tap="showDeductModal = false">
      <view class="modal-content" @tap.stop>
        <text class="modal-title">收款账户扣费</text>
        
        <view class="modal-form">
          <text class="modal-label">收款账户</text>
          <view class="selected-account">
            <text>{{ selectedAccountName }}</text>
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
          />
        </view>
        
        <view class="modal-actions">
          <view class="modal-btn modal-btn--cancel" @tap="showDeductModal = false">取消</view>
          <view class="modal-btn modal-btn--confirm modal-btn--danger" @tap="confirmDeduct">确认扣费</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { paymentAccountApi } from '@/api'
import ImageUploader from '@/components/ImageUploader/index.vue'
import QuickInput from '@/components/QuickInput/index.vue'
import type { Transaction, TransactionReason } from '@/types'

interface PaymentAccount {
  id: string
  name: string
  accountNo?: string
  bankName?: string
  qrCode?: string
  balance?: number
}

const paymentAccounts = ref<PaymentAccount[]>([])
const showAddModal = ref(false)
const showEditModal = ref(false)
const showDetailModal = ref(false)
const showDeductModal = ref(false)

const selectedAccountId = ref<string>('')
const selectedAccountName = ref<string>('')
const accountDetail = ref<{
  account: { id: string; name: string; balance: number }
  transactions: Transaction[]
} | null>(null)

const selectedAccountInfo = ref<PaymentAccount | null>(null)

// 编辑状态
const editingAccount = ref<PaymentAccount | null>(null)

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

// 表单数据（统一用于添加和编辑）
const formData = ref({
  name: '',
  accountNo: '',
  bankName: '',
  qrCode: [] as string[]
})

// 扣费表单
const deductForm = ref({
  reason: 'withdraw' as 'withdraw' | 'fee' | 'other',
  amount: 0,
  remark: ''
})

// 加载收款账户列表
const loadAccounts = async () => {
  try {
    const accounts = await paymentAccountApi.getAll()
    if (!Array.isArray(accounts)) {
      paymentAccounts.value = []
      return
    }
    // 为每个账户加载余额
    paymentAccounts.value = await Promise.all(
      accounts.map(async (account: any) => {
        if (!account || !account.id) {
          return null
        }
        try {
          const detail = await paymentAccountApi.getBalanceDetails(account.id)
          return { 
            ...account, 
            balance: detail.account.balance,
            accountNo: account.accountNo || account.account_no,
            bankName: account.bankName || account.bank_name,
            qrCode: account.qrCode || account.qr_code
          }
        } catch {
          return { ...account, balance: 0 }
        }
      })
    ).then(results => results.filter((r): r is PaymentAccount => r !== null))
  } catch (error) {
    console.error('加载收款账户失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
    paymentAccounts.value = []
  }
}

// 查看账户详情
const viewAccountDetail = async (id: string, name: string) => {
  try {
    selectedAccountId.value = id
    selectedAccountName.value = name
    
    // 获取账户信息
    const account = paymentAccounts.value.find(a => a.id === id)
    selectedAccountInfo.value = account || null
    
    // 获取余额明细
    const detail = await paymentAccountApi.getBalanceDetails(id)
    accountDetail.value = detail
    currentFilter.value = 'all'
    
    showDetailModal.value = true
  } catch (error) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

// 编辑账户
const editAccount = (account: PaymentAccount) => {
  editingAccount.value = account
  formData.value = {
    name: account.name || '',
    accountNo: account.accountNo || '',
    bankName: account.bankName || '',
    qrCode: account.qrCode ? [account.qrCode] : []
  }
  showEditModal.value = true
}

// 关闭表单弹窗
const closeFormModal = () => {
  showAddModal.value = false
  showEditModal.value = false
  editingAccount.value = null
  formData.value = { name: '', accountNo: '', bankName: '', qrCode: [] }
}

// 确认保存（添加或编辑）
const confirmSave = async () => {
  if (!formData.value.name || formData.value.name.trim() === '') {
    uni.showToast({ title: '请输入账户名称', icon: 'none' })
    return
  }
  
  try {
    const qrCode = formData.value.qrCode.length > 0 
      ? formData.value.qrCode[0] 
      : undefined
    
    if (editingAccount.value) {
      // 编辑
      await paymentAccountApi.update(editingAccount.value.id, {
        name: formData.value.name.trim(),
        accountNo: formData.value.accountNo.trim() || undefined,
        bankName: formData.value.bankName.trim() || undefined,
        qrCode: qrCode
      })
      uni.showToast({ title: '更新成功', icon: 'success' })
    } else {
      // 添加
      await paymentAccountApi.create({
        name: formData.value.name.trim(),
        accountNo: formData.value.accountNo.trim() || undefined,
        bankName: formData.value.bankName.trim() || undefined,
        qrCode: qrCode
      })
      uni.showToast({ title: '添加成功', icon: 'success' })
    }
    
    closeFormModal()
    
    // 刷新列表
    await loadAccounts()
  } catch (error: any) {
    uni.showToast({ title: error.message || (editingAccount.value ? '更新失败' : '添加失败'), icon: 'none' })
  }
}

// 确认删除
const confirmDeleteAccount = (id: string, name: string) => {
  uni.showModal({
    title: '删除收款账户',
    content: `确定要删除收款账户"${name}"吗？\n\n注意：如果该账户已有交易记录，将无法删除。`,
    confirmText: '删除',
    confirmColor: '#FF4D4F',
    success: async (res) => {
      if (res.confirm) {
        try {
          await paymentAccountApi.delete(id)
          uni.showToast({ title: '删除成功', icon: 'success' })
          await loadAccounts()
        } catch (error: any) {
          uni.showToast({ title: error.message || '删除失败', icon: 'none' })
        }
      }
    }
  })
}

// 确认扣费
const confirmDeduct = async () => {
  if (!selectedAccountId.value) {
    uni.showToast({ title: '请选择收款账户', icon: 'none' })
    return
  }
  if (!deductForm.value.amount || deductForm.value.amount <= 0) {
    uni.showToast({ title: '请输入扣费金额', icon: 'none' })
    return
  }
  if (deductForm.value.reason === 'other' && !deductForm.value.remark) {
    uni.showToast({ title: '请输入扣费原因', icon: 'none' })
    return
  }
  
  try {
    const reason = deductForm.value.reason === 'other' 
      ? deductForm.value.remark 
      : deductForm.value.reason
    
    await paymentAccountApi.deduct(selectedAccountId.value, {
      amount: deductForm.value.amount,
      reason: reason,
      remark: deductForm.value.remark || undefined
    })
    
    uni.showToast({ title: '扣费成功', icon: 'success' })
    showDeductModal.value = false
    deductForm.value = { reason: 'withdraw', amount: 0, remark: '' }
    
    // 刷新详情
    if (selectedAccountId.value) {
      const detail = await paymentAccountApi.getBalanceDetails(selectedAccountId.value)
      accountDetail.value = detail
    }
    
    // 刷新列表
    await loadAccounts()
  } catch (error: any) {
    uni.showToast({ title: error.message || '扣费失败', icon: 'none' })
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
    marketing: '/static/icons/target.svg'
  }
  return icons[reason] || '/static/icons/credit-card.svg'
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
  return labels[reason] || reason
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
    return `${hour}:${min}`
  } else if (diffDays === 1) {
    return `昨天 ${hour}:${min}`
  } else if (diffDays < 7) {
    return `${month}-${day} ${hour}:${min}`
  } else if (d.getFullYear() === now.getFullYear()) {
    return `${month}-${day} ${hour}:${min}`
  } else {
    const year = d.getFullYear()
    return `${year}-${month}-${day} ${hour}:${min}`
  }
}

// 预览图片
const previewImage = (url: string) => {
  uni.previewImage({ urls: [url] })
}

// 跳转到代理详情
const goToAgentDetail = (agentId: string) => {
  uni.navigateTo({
    url: `/pages/admin/agents/detail?id=${agentId}`
  })
}

onMounted(() => {
  loadAccounts()
})

onShow(() => {
  loadAccounts()
})
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.payees-page {
  padding: 24rpx;
  padding-bottom: calc(100rpx + 100rpx + 40rpx + 40rpx + env(safe-area-inset-bottom));
}

.account-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.account-item {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: $border-radius-lg;
  box-shadow: $shadow-sm;
  overflow: hidden;
  
  &__main {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 24rpx;
    
    &:active {
      background: $bg-hover;
    }
  }
  
  &__info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8rpx;
  }
  
  &__name {
    font-size: 32rpx;
    font-weight: 600;
    color: $text-primary;
  }
  
  &__balance {
    font-size: 28rpx;
    color: $success-color;
    font-weight: 500;
  }
  
  &__account-no,
  &__bank-name {
    font-size: 24rpx;
    color: $text-secondary;
  }
  
  &__arrow {
    font-size: 36rpx;
    color: $text-placeholder;
    margin-left: 16rpx;
  }
  
  &__actions {
    display: flex;
    align-items: center;
    gap: 8rpx;
    padding-right: 24rpx;
  }
  
  &__edit,
  &__delete {
    width: 64rpx;
    height: 64rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 8rpx;
    
    &:active {
      background: $bg-grey;
    }
  }
  
  &__delete {
    .delete-icon {
      opacity: 0.6;
    }
  }
}

.action-icon {
  width: 32rpx;
  height: 32rpx;
}

.delete-icon {
  width: 32rpx;
  height: 32rpx;
  opacity: 0.6;
}

.amount-negative {
  color: $danger-color !important;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
  
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
}

.add-btn {
  position: fixed;
  bottom: calc(100rpx + 40rpx + env(safe-area-inset-bottom));
  left: 24rpx;
  right: 24rpx;
  height: 100rpx;
  background: $primary-color;
  border-radius: $border-radius-lg;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba($primary-color, 0.4);
  z-index: 100;
  
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
  margin-bottom: 32rpx;
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

.required {
  color: $danger-color;
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
  }
}

.account-info {
  padding: 24rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  margin-bottom: 24rpx;
  
  &__item {
    display: flex;
    align-items: center;
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
  }
}

.filter-bar {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
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
  max-height: 50vh;
  overflow-y: auto;
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
  
  &__amount {
    font-size: 32rpx;
    font-weight: 600;
  }
  
  .amount-positive {
    color: $success-color;
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
}

.deduct-btn {
  width: 100%;
  height: 88rpx;
  background: $danger-color;
  border-radius: $border-radius;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
  
  &:active {
    opacity: 0.8;
  }
  
  &__text {
    font-size: 32rpx;
    font-weight: 600;
    color: #fff;
  }
}
</style>
