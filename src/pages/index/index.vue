<template>
  <view class="entry-page">
    <view class="logo-section">
      <view class="logo">
        <text class="logo-text">N</text>
      </view>
      <text class="app-name">Nomur</text>
      <text class="app-desc">微商代理管理系统</text>
    </view>
    
    <view class="role-section">
      <text class="section-title">请选择您的身份</text>
      
      <view class="role-card role-card--super" @tap="selectRole('super')">
        <view class="role-card__icon role-card__icon--super">
          <image src="/static/icons/admin-role.svg" class="role-icon" mode="aspectFit" />
        </view>
        <view class="role-card__info">
          <text class="role-card__title">超级管理员</text>
          <text class="role-card__desc">拥有所有权限，可修改订单、交易记录等数据</text>
        </view>
        <view class="role-card__arrow">›</view>
      </view>
      
      <view class="role-card role-card--admin" @tap="selectRole('admin')">
        <view class="role-card__icon role-card__icon--admin">
          <image src="/static/icons/admin-role.svg" class="role-icon" mode="aspectFit" />
        </view>
        <view class="role-card__info">
          <text class="role-card__title">管理端</text>
          <text class="role-card__desc">创始人/公司 - 商品录入、发货开单、代理管理、财务审核</text>
        </view>
        <view class="role-card__arrow">›</view>
      </view>
      
      <view class="role-card role-card--agent" @tap="selectRole('agent')">
        <view class="role-card__icon role-card__icon--agent">
          <image src="/static/icons/agent-role.svg" class="role-icon" mode="aspectFit" />
        </view>
        <view class="role-card__info">
          <text class="role-card__title">代理端</text>
          <text class="role-card__desc">代理商 - 查看业绩、余额明细、任务进度、素材下载</text>
        </view>
        <view class="role-card__arrow">›</view>
      </view>
    </view>
    
    <view class="footer">
      <text class="footer-text">© 2024 Nomur. All rights reserved.</text>
    </view>
    
    <!-- 代理选择弹窗 -->
    <view v-if="showAgentSelect" class="modal-mask" @tap="showAgentSelect = false">
      <view class="modal-content" @tap.stop>
        <text class="modal-title">选择代理商身份</text>
        <text class="modal-desc">请选择您要登录的代理账号</text>
        
        <view class="agent-list">
          <view 
            v-for="agent in agents" 
            :key="agent.id"
            class="agent-option"
            @tap="enterAgent(agent.id)"
          >
            <image :src="agent.avatar" class="agent-option__avatar" mode="aspectFill" />
            <view class="agent-option__info">
              <text class="agent-option__name">{{ agent.name }}</text>
              <text class="agent-option__phone">{{ agent.phone1 }}</text>
            </view>
            <view class="agent-option__balance" :class="{ 'amount-negative': agent.balance < 0 }">
              ¥{{ agent.balance.toLocaleString() }}
            </view>
          </view>
        </view>
        
        <view class="modal-close" @tap="showAgentSelect = false">取消</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'

const store = useAppStore()

const showAgentSelect = ref(false)

// 代理商列表
const agents = computed(() => store.agents)

onMounted(() => {
  // 确保数据已加载
  if (store.agents.length === 0) {
    store.initData()
  }
})

// 选择角色
const selectRole = async (role: 'super' | 'admin' | 'agent') => {
  if (role === 'super') {
    store.switchRole('admin')
    // 设置超级管理员信息（实际应该从登录流程获取）
    // 这里需要从登录API获取管理员信息
    store.setCurrentAdmin({
      id: 'super-admin-id', // 实际应该从登录API获取
      name: '超级管理员',
      role: 'super_admin'
    })
    uni.reLaunch({ url: '/pages/super/dashboard/index' })
  } else if (role === 'admin') {
    store.switchRole('admin')
    store.setCurrentAdmin(null)
    uni.switchTab({ url: '/pages/admin/dashboard/index' })
  } else {
    // 代理端需要选择代理商
    showAgentSelect.value = true
  }
}

// 进入代理端
const enterAgent = (agentId: string) => {
  store.switchRole('agent')
  store.currentAgentId = agentId
  showAgentSelect.value = false
  uni.reLaunch({ url: '/pages/agent/home/index' })
}
</script>

<style lang="scss" scoped>
.entry-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #2563EB 0%, #1E40AF 100%);
  padding: 80rpx 40rpx;
  display: flex;
  flex-direction: column;
}

.logo-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 80rpx;
}

.logo {
  width: 160rpx;
  height: 160rpx;
  background: #fff;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 32rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.2);
}

.logo-text {
  font-size: 80rpx;
  font-weight: 800;
  color: #2563EB;
}

.app-name {
  font-size: 56rpx;
  font-weight: 700;
  color: #fff;
  margin-bottom: 12rpx;
}

.app-desc {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.8);
}

.role-section {
  flex: 1;
}

.section-title {
  font-size: 32rpx;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 32rpx;
  display: block;
  text-align: center;
}

.role-card {
  display: flex;
  align-items: center;
  padding: 36rpx;
  background: #fff;
  border-radius: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
  
  &:active {
    transform: scale(0.98);
  }
  
  &__icon {
    width: 100rpx;
    height: 100rpx;
    border-radius: 20rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 28rpx;
    
    &--admin {
      background: rgba(37, 99, 235, 0.1);
    }
    
    &--agent {
      background: rgba(16, 185, 129, 0.1);
    }
    
    &--super {
      background: rgba(255, 107, 107, 0.1);
      border: 2rpx solid rgba(255, 107, 107, 0.3);
    }
  }
  
  &__info {
    flex: 1;
  }
  
  &__title {
    font-size: 36rpx;
    font-weight: 600;
    color: $text-primary;
    display: block;
    margin-bottom: 8rpx;
  }
  
  &__desc {
    font-size: 24rpx;
    color: $text-secondary;
    line-height: 1.5;
    display: block;
  }
  
  &__arrow {
    font-size: 48rpx;
    color: $text-placeholder;
  }
}

.role-icon {
  width: 60rpx;
  height: 60rpx;
}

.footer {
  text-align: center;
  padding: 40rpx 0;
}

.footer-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.5);
}

// 弹窗
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
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
}

.modal-title {
  font-size: 36rpx;
  font-weight: 700;
  color: $text-primary;
  text-align: center;
  display: block;
}

.modal-desc {
  font-size: 26rpx;
  color: $text-secondary;
  text-align: center;
  display: block;
  margin: 12rpx 0 32rpx;
}

.agent-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  max-height: 50vh;
  overflow-y: auto;
}

.agent-option {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: $bg-grey;
  border-radius: 16rpx;
  
  &:active {
    background: darken($bg-grey, 5%);
  }
  
  &__avatar {
    width: 88rpx;
    height: 88rpx;
    border-radius: 50%;
    margin-right: 20rpx;
  }
  
  &__info {
    flex: 1;
  }
  
  &__name {
    font-size: 32rpx;
    font-weight: 500;
    color: $text-primary;
    display: block;
  }
  
  &__phone {
    font-size: 26rpx;
    color: $text-secondary;
    margin-top: 4rpx;
    display: block;
  }
  
  &__balance {
    font-size: 32rpx;
    font-weight: 600;
    color: $success-color;
  }
}

.amount-negative {
  color: $danger-color !important;
}

.modal-close {
  margin-top: 24rpx;
  padding: 24rpx;
  background: $bg-grey;
  border-radius: 16rpx;
  text-align: center;
  font-size: 30rpx;
  color: $text-secondary;
}
</style>
