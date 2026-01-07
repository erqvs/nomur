<template>
  <view class="transaction-edit">
    <view v-if="loading" class="loading">加载中...</view>
    <view v-else-if="originalTx" class="edit-content">
      <!-- 原交易信息 -->
      <view class="info-section">
        <view class="section-title">原交易信息</view>
        <view class="info-card">
          <view class="info-row">
            <text class="info-label">代理商：</text>
            <text class="info-value">{{ originalTx.agentName }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">类型：</text>
            <text class="info-value">{{ getTypeLabel(originalTx.type) }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">原因：</text>
            <text class="info-value">{{ getReasonLabel(originalTx.reason) }}</text>
          </view>
          <view class="info-row">
            <text class="info-label">原金额：</text>
            <text class="info-value" :class="{
              'amount-positive': originalTx.amount > 0,
              'amount-negative': originalTx.amount < 0
            }">
              {{ originalTx.amount > 0 ? '+' : '' }}¥{{ Math.abs(originalTx.amount).toLocaleString() }}
            </text>
          </view>
          <view class="info-row">
            <text class="info-label">原余额：</text>
            <text class="info-value">{{ formatBalance(originalAgentBalance) }}</text>
          </view>
        </view>
      </view>

      <!-- 修改表单 -->
      <view class="form-section">
        <view class="section-title">修改信息</view>
        
        <!-- 代理商选择 -->
        <view class="form-item">
          <text class="form-item__label">代理商 <text class="required">*</text></text>
          <view class="agent-select" @tap="showAgentPicker = true">
            <text :class="['agent-select__text', { 'placeholder': !form.agentId }]">
              {{ form.agentId ? getAgentName(form.agentId) : '请选择代理商' }}
            </text>
            <text class="agent-select__arrow">›</text>
          </view>
        </view>

        <!-- 交易类型 -->
        <view class="form-item">
          <text class="form-item__label">交易类型 <text class="required">*</text></text>
          <view class="type-select">
            <view 
              v-for="type in transactionTypes" 
              :key="type.value"
              class="type-option"
              :class="{ 'type-option--active': form.type === type.value }"
              @tap="form.type = type.value"
            >
              <text>{{ type.label }}</text>
            </view>
          </view>
        </view>

        <!-- 原因选择 -->
        <view class="form-item">
          <text class="form-item__label">原因 <text class="required">*</text></text>
          <view class="reason-select">
            <view 
              v-for="reason in availableReasons" 
              :key="reason.value"
              class="reason-option"
              :class="{ 'reason-option--active': form.reason === reason.value }"
              @tap="form.reason = reason.value"
            >
              <text>{{ reason.label }}</text>
            </view>
          </view>
        </view>

        <!-- 金额 -->
        <view class="form-item">
          <text class="form-item__label">金额 <text class="required">*</text></text>
          <QuickInput
            v-model.number="form.amount"
            type="number"
            placeholder="请输入金额（正数为充值，负数为扣款）"
          />
        </view>

        <!-- 收款账户（仅充值-打款时显示） -->
        <view v-if="form.type === 'recharge' && form.reason === 'payment'" class="form-item">
          <text class="form-item__label">收款账户</text>
          <view class="payee-select" @tap="showPayeePicker = true">
            <text :class="['payee-select__text', { 'placeholder': !form.paymentAccountId }]">
              {{ form.paymentAccountId ? getPayeeName(form.paymentAccountId) : '请选择收款账户（可选）' }}
            </text>
            <text class="payee-select__arrow">›</text>
          </view>
        </view>

        <!-- 备注 -->
        <view class="form-item">
          <text class="form-item__label">备注</text>
          <textarea
            v-model="form.remark"
            class="form-textarea"
            placeholder="请输入备注"
            maxlength="200"
          />
        </view>
      </view>

      <!-- 余额变化预览 -->
      <view class="impact-section">
        <view class="section-title">余额变化预览</view>
        <view class="impact-card">
          <view class="impact-row">
            <text class="impact-label">原代理商余额：</text>
            <text class="impact-value">{{ formatBalance(originalAgentBalance) }}</text>
          </view>
          <view class="impact-row">
            <text class="impact-label">原交易影响：</text>
            <text class="impact-value" :class="{
              'amount-positive': originalTx.amount > 0,
              'amount-negative': originalTx.amount < 0
            }">
              {{ originalTx.amount > 0 ? '+' : '' }}¥{{ Math.abs(originalTx.amount).toLocaleString() }}
            </text>
          </view>
          <view class="impact-divider"></view>
          <view class="impact-row">
            <text class="impact-label">新代理商余额：</text>
            <text class="impact-value">{{ formatBalance(newAgentBalance) }}</text>
          </view>
          <view class="impact-row">
            <text class="impact-label">新交易影响：</text>
            <text class="impact-value" :class="{
              'amount-positive': form.amount > 0,
              'amount-negative': form.amount < 0
            }">
              {{ form.amount > 0 ? '+' : '' }}¥{{ Math.abs(form.amount).toLocaleString() }}
            </text>
          </view>
          <view class="impact-divider"></view>
          <view class="impact-row impact-row--highlight">
            <text class="impact-label">余额变化：</text>
            <text class="impact-value" :class="{
              'amount-positive': balanceChange > 0,
              'amount-negative': balanceChange < 0
            }">
              {{ balanceChange > 0 ? '+' : '' }}¥{{ Math.abs(balanceChange).toLocaleString() }}
            </text>
          </view>
          <view class="impact-note">
            <text>说明：{{ balanceChangeNote }}</text>
          </view>
        </view>
      </view>

      <!-- 保存按钮 -->
      <view class="save-btn" @tap="saveTransaction">
        <text class="save-btn__text">保存修改</text>
      </view>
    </view>

    <!-- 代理商选择器 -->
    <view v-if="showAgentPicker" class="picker-mask" @tap="showAgentPicker = false">
      <view class="picker-content" @tap.stop>
        <view class="picker-header">
          <text class="picker-title">选择代理商</text>
          <text class="picker-close" @tap="showAgentPicker = false">✕</text>
        </view>
        <scroll-view class="picker-list" scroll-y>
          <view 
            v-for="agent in store.agents" 
            :key="agent.id"
            class="picker-item"
            :class="{ 'picker-item--active': form.agentId === agent.id }"
            @tap="selectAgent(agent.id)"
          >
            <text class="picker-item__name">{{ agent.name }}</text>
            <text class="picker-item__balance">{{ formatBalance(agent.balance) }}</text>
          </view>
        </scroll-view>
      </view>
    </view>

    <!-- 收款账户选择器 -->
    <view v-if="showPayeePicker" class="picker-mask" @tap="showPayeePicker = false">
      <view class="picker-content" @tap.stop>
        <view class="picker-header">
          <text class="picker-title">选择收款账户</text>
          <text class="picker-close" @tap="showPayeePicker = false">✕</text>
        </view>
        <scroll-view class="picker-list" scroll-y>
          <view 
            class="picker-item"
            :class="{ 'picker-item--active': !form.paymentAccountId }"
            @tap="selectPayee('')"
          >
            <text class="picker-item__name">不选择</text>
          </view>
          <view 
            v-for="payee in paymentAccounts" 
            :key="payee.id"
            class="picker-item"
            :class="{ 'picker-item--active': form.paymentAccountId === payee.id }"
            @tap="selectPayee(payee.id)"
          >
            <text class="picker-item__name">{{ payee.name }}</text>
            <text v-if="payee.accountNo" class="picker-item__balance">{{ payee.accountNo }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useAppStore } from '@/stores/app'
import { transactionApi, paymentAccountApi } from '@/api'
import type { Transaction, TransactionReason, Agent } from '@/types'
import QuickInput from '@/components/QuickInput/index.vue'

const store = useAppStore()

const transactionId = ref('')
const loading = ref(true)
const originalTx = ref<Transaction | null>(null)
const originalAgentBalance = ref(0)
const paymentAccounts = ref<Array<{ id: string; name: string; accountNo?: string }>>([])

const showAgentPicker = ref(false)
const showPayeePicker = ref(false)

const transactionTypes = [
  { label: '充值', value: 'recharge' },
  { label: '扣款', value: 'deduct' }
]

const form = ref({
  agentId: '',
  type: 'recharge' as 'recharge' | 'deduct',
  reason: 'payment' as TransactionReason,
  amount: 0,
  remark: '',
  paymentAccountId: ''
})

// 根据交易类型获取可用原因
const availableReasons = computed(() => {
  if (form.value.type === 'recharge') {
    return [
      { label: '赠送', value: 'gift' },
      { label: '代理打款', value: 'payment' },
      { label: '运费', value: 'freight' },
      { label: '调货收入', value: 'transfer_in' },
      { label: '营销送礼退款', value: 'marketing' }
    ]
  } else {
    return [
      { label: '发货扣款', value: 'shipping' },
      { label: '罚款', value: 'fine' },
      { label: '调货支出', value: 'transfer_out' }
    ]
  }
})

// 新代理商余额
const newAgentBalance = computed(() => {
  if (!form.value.agentId) return 0
  const agent = store.agents.find(a => a.id === form.value.agentId)
  if (!agent) return 0
  
  // 如果代理商没变，需要先恢复原交易的影响
  if (form.value.agentId === originalTx.value?.agentId) {
    const restoredBalance = originalAgentBalance.value
    // 然后应用新交易的影响
    if (form.value.amount > 0) {
      return restoredBalance + form.value.amount
    } else {
      return restoredBalance - Math.abs(form.value.amount)
    }
  } else {
    // 如果换了代理商，直接应用新交易的影响
    if (form.value.amount > 0) {
      return agent.balance + form.value.amount
    } else {
      return agent.balance - Math.abs(form.value.amount)
    }
  }
})

// 余额变化
const balanceChange = computed(() => {
  if (!form.value.agentId) return 0
  
  // 如果代理商没变
  if (form.value.agentId === originalTx.value?.agentId) {
    // 余额变化 = 新金额 - 原金额
    return form.value.amount - originalTx.value.amount
  } else {
    // 如果换了代理商
    const newAgent = store.agents.find(a => a.id === form.value.agentId)
    if (!newAgent) return 0
    
    // 原代理商：恢复原交易（+原金额）
    // 新代理商：应用新交易（+新金额）
    // 这里只显示新代理商的变化
    return form.value.amount
  }
})

// 余额变化说明
const balanceChangeNote = computed(() => {
  if (!form.value.agentId) return '请选择代理商'
  
  if (form.value.agentId === originalTx.value?.agentId) {
    // 同一代理商
    if (balanceChange.value > 0) {
      return `余额将增加 ¥${Math.abs(balanceChange.value).toLocaleString()}`
    } else if (balanceChange.value < 0) {
      return `余额将减少 ¥${Math.abs(balanceChange.value).toLocaleString()}`
    } else {
      return '余额不变'
    }
  } else {
    // 不同代理商
    const newAgent = store.agents.find(a => a.id === form.value.agentId)
    const oldAgent = store.agents.find(a => a.id === originalTx.value?.agentId)
    if (!newAgent || !oldAgent) return ''
    
    return `原代理商"${oldAgent.name}"余额将恢复 ¥${Math.abs(originalTx.value.amount).toLocaleString()}，新代理商"${newAgent.name}"余额将${form.value.amount > 0 ? '增加' : '减少'} ¥${Math.abs(form.value.amount).toLocaleString()}`
  }
})

const getTypeLabel = (type: string) => {
  return type === 'recharge' ? '充值' : '扣款'
}

const getReasonLabel = (reason: TransactionReason) => {
  const labels: Record<TransactionReason, string> = {
    gift: '赠送',
    payment: '代理打款',
    freight: '运费',
    shipping: '发货扣款',
    fine: '罚款',
    transfer_in: '调货收入',
    transfer_out: '调货支出',
    marketing: '营销送礼退款'
  }
  return labels[reason] || reason
}

const getAgentName = (agentId: string) => {
  const agent = store.agents.find(a => a.id === agentId)
  return agent?.name || ''
}

const getPayeeName = (payeeId: string) => {
  const payee = paymentAccounts.value.find(p => p.id === payeeId)
  return payee?.name || ''
}

const formatBalance = (balance: number) => {
  const formatted = Math.abs(balance).toLocaleString()
  return balance < 0 ? `-¥${formatted}` : `¥${formatted}`
}

const selectAgent = (agentId: string) => {
  form.value.agentId = agentId
  showAgentPicker.value = false
  uni.vibrateShort({ type: 'light' })
}

const selectPayee = (payeeId: string) => {
  form.value.paymentAccountId = payeeId
  showPayeePicker.value = false
  uni.vibrateShort({ type: 'light' })
}

const saveTransaction = async () => {
  if (!form.value.agentId) {
    uni.showToast({ title: '请选择代理商', icon: 'none' })
    return
  }
  
  if (!form.value.amount || form.value.amount === 0) {
    uni.showToast({ title: '请输入有效的金额', icon: 'none' })
    return
  }
  
  if (!store.currentAdmin || store.currentAdmin.role !== 'super_admin') {
    uni.showToast({ title: '需要超级管理员权限', icon: 'none' })
    return
  }
  
  try {
    uni.showLoading({ title: '保存中...' })
    
    await transactionApi.update(
      transactionId.value,
      {
        agentId: form.value.agentId,
        amount: form.value.amount,
        reason: form.value.reason,
        remark: form.value.remark,
        paymentAccountId: form.value.paymentAccountId || undefined
      },
      store.currentAdmin.id,
      store.currentAdmin.role
    )
    
    uni.hideLoading()
    uni.showToast({ title: '修改成功', icon: 'success' })
    
    // 刷新数据
    await Promise.all([
      store.loadTransactions(),
      store.loadAgents()
    ])
    
    // 返回上一页
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (error: any) {
    uni.hideLoading()
    uni.showToast({ title: error.message || '修改失败', icon: 'none' })
  }
}

onLoad(async (options) => {
  if (!options?.id) {
    uni.showToast({ title: '缺少交易记录ID', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }
  
  transactionId.value = options.id
  
  try {
    loading.value = true
    
    // 加载数据
    await Promise.all([
      store.loadTransactions(),
      store.loadAgents()
    ])
    
    // 加载收款账户
    try {
      paymentAccounts.value = await paymentAccountApi.getAll()
    } catch (error) {
      console.error('加载收款账户失败:', error)
    }
    
    // 查找交易记录
    originalTx.value = store.transactions.find(t => t.id === transactionId.value) || null
    
    if (!originalTx.value) {
      uni.showToast({ title: '交易记录不存在', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 1500)
      return
    }
    
    // 获取原代理商余额
    const originalAgent = store.agents.find(a => a.id === originalTx.value!.agentId)
    if (originalAgent) {
      // 计算原余额（需要恢复原交易的影响）
      if (originalTx.value.amount > 0) {
        originalAgentBalance.value = originalAgent.balance - originalTx.value.amount
      } else {
        originalAgentBalance.value = originalAgent.balance + Math.abs(originalTx.value.amount)
      }
    }
    
    // 初始化表单
    form.value = {
      agentId: originalTx.value.agentId,
      type: originalTx.value.type,
      reason: originalTx.value.reason,
      amount: originalTx.value.amount,
      remark: originalTx.value.remark || '',
      paymentAccountId: originalTx.value.paymentAccountId || ''
    }
    
    loading.value = false
  } catch (error: any) {
    loading.value = false
    uni.showToast({ title: error.message || '加载失败', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
  }
})
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.transaction-edit {
  min-height: 100vh;
  background: $bg-grey;
  padding: 24rpx;
  padding-bottom: 40rpx;
}

.loading {
  text-align: center;
  padding: 100rpx 0;
  color: $text-secondary;
  font-size: 28rpx;
}

.edit-content {
  max-width: 750rpx;
  margin: 0 auto;
}

.info-section,
.form-section,
.impact-section {
  margin-bottom: 32rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-primary;
  margin-bottom: 16rpx;
  padding-left: 8rpx;
}

.info-card,
.impact-card {
  background: #fff;
  border-radius: $border-radius;
  padding: 32rpx;
  box-shadow: $shadow-sm;
}

.info-row {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid $border-color;
  
  &:last-child {
    border-bottom: none;
  }
}

.info-label {
  font-size: 28rpx;
  color: $text-secondary;
  width: 160rpx;
  flex-shrink: 0;
}

.info-value {
  font-size: 28rpx;
  color: $text-primary;
  flex: 1;
  
  &.amount-positive {
    color: $success-color;
  }
  
  &.amount-negative {
    color: $danger-color;
  }
}

.form-item {
  margin-bottom: 32rpx;
  
  &__label {
    display: block;
    font-size: 28rpx;
    color: $text-primary;
    margin-bottom: 12rpx;
    
    .required {
      color: $danger-color;
    }
  }
}

.agent-select,
.payee-select {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: $border-radius;
  padding: 32rpx;
  min-height: 96rpx;
  box-shadow: $shadow-sm;
  
  &__text {
    font-size: 36rpx;
    color: $text-primary;
    flex: 1;
    
    &.placeholder {
      color: $text-placeholder;
    }
  }
  
  &__arrow {
    font-size: 36rpx;
    color: $text-secondary;
    margin-left: 16rpx;
  }
}

.type-select,
.reason-select {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.type-option,
.reason-option {
  flex: 1;
  min-width: 140rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: $border-radius;
  text-align: center;
  font-size: 28rpx;
  color: $text-primary;
  box-shadow: $shadow-sm;
  transition: all 0.2s;
  
  &--active {
    background: $primary-color;
    color: #fff;
  }
  
  &:active {
    transform: scale(0.98);
  }
}

.form-textarea {
  width: 100%;
  min-height: 200rpx;
  padding: 32rpx;
  background: #fff;
  border-radius: $border-radius;
  font-size: 36rpx;
  line-height: 1.5;
  color: $text-primary;
  box-shadow: $shadow-sm;
}

.impact-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 0;
  
  &--highlight {
    padding: 24rpx 0;
    border-top: 2rpx solid $border-color;
    border-bottom: 2rpx solid $border-color;
    margin: 16rpx 0;
  }
}

.impact-label {
  font-size: 28rpx;
  color: $text-secondary;
}

.impact-value {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-primary;
  
  &.amount-positive {
    color: $success-color;
  }
  
  &.amount-negative {
    color: $danger-color;
  }
}

.impact-divider {
  height: 1rpx;
  background: $border-color;
  margin: 8rpx 0;
}

.impact-note {
  margin-top: 16rpx;
  padding: 16rpx;
  background: $bg-grey;
  border-radius: $border-radius;
  font-size: 24rpx;
  color: $text-secondary;
  line-height: 1.5;
}

.save-btn {
  margin-top: 48rpx;
  background: $primary-color;
  border-radius: $border-radius;
  padding: 32rpx;
  text-align: center;
  box-shadow: $shadow-sm;
  
  &__text {
    font-size: 36rpx;
    font-weight: 600;
    color: #fff;
  }
  
  &:active {
    opacity: 0.8;
  }
}

.picker-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 2000;
  display: flex;
  align-items: flex-end;
}

.picker-content {
  width: 100%;
  max-height: 70vh;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 1rpx solid $border-color;
}

.picker-title {
  font-size: 36rpx;
  font-weight: 600;
  color: $text-primary;
}

.picker-close {
  font-size: 48rpx;
  color: $text-secondary;
  line-height: 1;
}

.picker-list {
  flex: 1;
  max-height: calc(70vh - 120rpx);
}

.picker-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 1rpx solid $border-color;
  
  &--active {
    background: $bg-hover;
    
    .picker-item__name {
      color: $primary-color;
      font-weight: 600;
    }
  }
  
  &:active {
    background: $bg-hover;
  }
}

.picker-item__name {
  font-size: 32rpx;
  color: $text-primary;
}

.picker-item__balance {
  font-size: 28rpx;
  color: $text-secondary;
}
</style>

