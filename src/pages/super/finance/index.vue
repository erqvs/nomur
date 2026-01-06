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
          <view class="transaction-card__edit-btn" @tap.stop="editTransaction(tx)">
            <text class="edit-btn-text">✏️ 修改</text>
          </view>
        </view>
      </view>
      
      <view v-if="filteredTransactions.length === 0" class="empty-state">
        <image src="/static/icons/file-text.svg" class="empty-icon" mode="aspectFit" />
        <text class="empty-text">暂无交易记录</text>
      </view>
    </view>
    
    <!-- 修改交易记录弹窗 -->
    <view v-if="showEditModal" class="modal-mask" @tap="closeEditModal">
      <view class="modal-content" @tap.stop>
        <text class="modal-title">修改交易记录</text>
        <view class="modal-form">
          <view class="form-item">
            <text class="form-item__label">金额 <text class="required">*</text></text>
            <input
              v-model.number="editForm.amount"
              type="number"
              class="form-item__input"
              placeholder="请输入金额（正数为充值，负数为扣款）"
            />
          </view>
          <view class="form-item">
            <text class="form-item__label">备注</text>
            <textarea
              v-model="editForm.remark"
              class="form-item__textarea"
              placeholder="请输入备注"
              maxlength="200"
            />
          </view>
        </view>
        <view class="modal-actions">
          <view class="modal-btn modal-btn--cancel" @tap="closeEditModal">取消</view>
          <view class="modal-btn modal-btn--confirm" @tap="confirmEdit">确认修改</view>
        </view>
      </view>
    </view>
  </view>
  
  <!-- 自定义TabBar -->
  <CustomTabBar />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useAppStore } from '@/stores/app'
import { transactionApi } from '@/api'
import type { Transaction, TransactionReason } from '@/types'
import CustomTabBar from '@/components/CustomTabBar/index.vue'

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

// 修改相关
const showEditModal = ref(false)
const editingTransaction = ref<Transaction | null>(null)
const editForm = ref({
  amount: 0,
  remark: ''
})

onMounted(async () => {
  await store.loadTransactions()
})

onShow(async () => {
  await store.loadTransactions()
})

const formatTime = (time: string | Date) => {
  const d = new Date(time)
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hour}:${min}`
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
    marketing: '/static/icons/trending-up.svg'
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
    marketing: '营销退款'
  }
  return labelMap[reason] || reason
}

const goToAgentDetail = (agentId: string) => {
  uni.navigateTo({
    url: `/pages/admin/agents/detail?id=${agentId}`
  })
}

const goToPayeeDetail = (payeeId: string, payeeName: string) => {
  uni.navigateTo({
    url: `/pages/admin/payees/index`
  })
}

const previewProof = (url: string) => {
  uni.previewImage({ urls: [url] })
}

const editTransaction = (tx: Transaction) => {
  editingTransaction.value = tx
  editForm.value = {
    amount: tx.amount,
    remark: tx.remark || ''
  }
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editingTransaction.value = null
  editForm.value = { amount: 0, remark: '' }
}

const confirmEdit = async () => {
  if (!editingTransaction.value) return
  
  if (!editForm.value.amount || editForm.value.amount === 0) {
    uni.showToast({ title: '请输入有效的金额', icon: 'none' })
    return
  }
  
  if (!store.currentAdmin || store.currentAdmin.role !== 'super_admin') {
    uni.showToast({ title: '需要超级管理员权限', icon: 'none' })
    return
  }
  
  try {
    await transactionApi.update(
      editingTransaction.value.id,
      {
        agentId: editingTransaction.value.agentId,
        amount: editForm.value.amount,
        reason: editingTransaction.value.reason,
        remark: editForm.value.remark,
        paymentAccountId: editingTransaction.value.paymentAccountId
      },
      store.currentAdmin.id,
      store.currentAdmin.role
    )
    
    uni.showToast({ title: '修改成功', icon: 'success' })
    closeEditModal()
    await store.loadTransactions()
    await store.loadAgents() // 刷新代理商余额
  } catch (error: any) {
    uni.showToast({ title: error.message || '修改失败', icon: 'none' })
  }
}

// 这些功能暂时不实现，直接跳转到管理端
const showRechargeModal = ref(false)
const showDeductModal = ref(false)
const showTransferModal = ref(false)
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

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
  
  &__edit-btn {
    padding: 8rpx 16rpx;
    background: rgba($warning-color, 0.1);
    border-radius: 8rpx;
    border: 1rpx solid rgba($warning-color, 0.3);
    
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
  
  &:active {
    opacity: 0.8;
  }
}
</style>

