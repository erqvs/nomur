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
              addText="上传二维码"
              tip="每次上传一张，可重复上传"
            />
          </view>
        </view>
        
        <view class="modal-actions">
          <view class="modal-btn modal-btn--cancel" @tap="closeFormModal">取消</view>
          <view class="modal-btn modal-btn--confirm" @tap="confirmSave">确认{{ editingAccount ? '保存' : '添加' }}</view>
        </view>
      </view>
    </view>
    
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { paymentAccountApi } from '@/api'
import ImageUploader from '@/components/ImageUploader/index.vue'

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

// 编辑状态
const editingAccount = ref<PaymentAccount | null>(null)


// 表单数据（统一用于添加和编辑）
const formData = ref({
  name: '',
  accountNo: '',
  bankName: '',
  qrCode: [] as string[]
})

// 扣费表单（已移除，扣费功能在详情页面）

// 加载收款账户列表
const loadAccounts = async () => {
  try {
    const accounts = await paymentAccountApi.getAll()
    if (!Array.isArray(accounts)) {
      paymentAccounts.value = []
      return
    }
    // 直接使用接口返回的余额（接口已经计算好了）
    paymentAccounts.value = accounts.map((account: any) => {
      if (!account || !account.id) {
        return null
      }
      // 解析二维码（可能是字符串或 JSON 数组）
      let qrCode = account.qrCode || account.qr_code
      if (qrCode && typeof qrCode === 'string') {
        try {
          const parsed = JSON.parse(qrCode)
          qrCode = Array.isArray(parsed) ? parsed : qrCode
        } catch {
          // 不是 JSON，保持原样
        }
      }
      return { 
        ...account, 
        balance: Number(account.balance || 0), // 直接使用接口返回的余额
        accountNo: account.accountNo || account.account_no,
        bankName: account.bankName || account.bank_name,
        qrCode: qrCode
      }
    }).filter((r): r is PaymentAccount => r !== null)
  } catch (error) {
    console.error('加载收款账户失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
    paymentAccounts.value = []
  }
}

// 查看账户详情
const viewAccountDetail = (id: string, name: string) => {
  uni.navigateTo({
    url: `/pages/admin/payees/detail?id=${id}&name=${encodeURIComponent(name)}`
  })
}

// 编辑账户
const editAccount = (account: PaymentAccount) => {
  editingAccount.value = account
  // 解析二维码（可能是字符串或 JSON 数组）
  let qrCodes: string[] = []
  if (account.qrCode) {
    if (typeof account.qrCode === 'string') {
      try {
        // 尝试解析为 JSON 数组
        const parsed = JSON.parse(account.qrCode)
        qrCodes = Array.isArray(parsed) ? parsed : [account.qrCode]
      } catch {
        // 如果不是 JSON，当作单个字符串处理
        qrCodes = [account.qrCode]
      }
    } else if (Array.isArray(account.qrCode)) {
      qrCodes = account.qrCode
    }
  }
  formData.value = {
    name: account.name || '',
    accountNo: account.accountNo || '',
    bankName: account.bankName || '',
    qrCode: qrCodes
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
    // 将二维码数组转为 JSON 字符串（如果有多个）或单个字符串（如果只有一个）
    const qrCode = formData.value.qrCode.length > 0 
      ? (formData.value.qrCode.length === 1 
          ? formData.value.qrCode[0] 
          : JSON.stringify(formData.value.qrCode))
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
