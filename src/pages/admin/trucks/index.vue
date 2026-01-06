<template>
  <view class="trucks-page">
    <!-- 车型列表 -->
    <view class="truck-list">
      <view 
        v-for="truck in truckTypes" 
        :key="truck.id"
        class="truck-item"
        @tap="editTruck(truck.id)"
      >
        <view class="truck-item__info">
          <view class="truck-item__header">
            <text class="truck-item__name">{{ truck.name }}</text>
            <view v-if="truck.isDefault" class="truck-item__default">默认</view>
          </view>
          <text class="truck-item__weight">
            {{ truck.minWeight.toLocaleString() }} - {{ truck.maxWeight.toLocaleString() }}kg
          </text>
        </view>
        <view class="truck-item__actions">
          <view class="truck-item__edit" @tap.stop="editTruck(truck.id)">
            <image src="/static/icons/file-text.svg" class="action-icon" mode="aspectFit" />
          </view>
          <view class="truck-item__delete" @tap.stop="confirmDelete(truck.id, truck.name)">
            <image src="/static/icons/x-circle.svg" class="action-icon" mode="aspectFit" />
          </view>
        </view>
      </view>
    </view>
    
    <!-- 空状态 -->
    <view v-if="truckTypes.length === 0" class="empty-state">
      <image src="/static/icons/truck.svg" class="empty-icon" mode="aspectFit" />
      <text class="empty-text">暂无车型，点击下方按钮添加</text>
    </view>
    
    <!-- 添加按钮 -->
    <view class="add-btn" @tap="addTruck">
      <text class="add-btn__icon">+</text>
      <text class="add-btn__text">添加车型</text>
    </view>
    
    <!-- 编辑/添加弹窗 -->
    <view v-if="showEditModal" class="modal-mask" @tap="showEditModal = false">
      <view class="modal-content" @tap.stop>
        <text class="modal-title">{{ editingTruck ? '编辑车型' : '添加车型' }}</text>
        
        <view class="modal-form">
          <view class="form-item">
            <text class="form-item__label">车型名称 <text class="required">*</text></text>
            <input 
              v-model="truckForm.name" 
              class="form-item__input"
              placeholder="请输入车型名称"
              maxlength="50"
            />
          </view>
          
          <view class="form-item">
            <text class="form-item__label">最小载重 (kg) <text class="required">*</text></text>
            <input 
              v-model.number="truckForm.minWeight" 
              type="number" 
              class="form-item__input"
              placeholder="请输入最小载重"
            />
          </view>
          
          <view class="form-item">
            <text class="form-item__label">最大载重 (kg) <text class="required">*</text></text>
            <input 
              v-model.number="truckForm.maxWeight" 
              type="number" 
              class="form-item__input"
              placeholder="请输入最大载重"
            />
          </view>
          
          <view class="form-item">
            <view class="checkbox-item" @tap="truckForm.isDefault = !truckForm.isDefault">
              <view class="checkbox" :class="{ 'checkbox--checked': truckForm.isDefault }">
                <text v-if="truckForm.isDefault" class="checkbox__check">✓</text>
              </view>
              <text class="checkbox__label">设为默认车型</text>
            </view>
          </view>
        </view>
        
        <view class="modal-actions">
          <view class="modal-btn modal-btn--cancel" @tap="showEditModal = false">取消</view>
          <view class="modal-btn modal-btn--confirm" @tap="saveTruck">确认</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface TruckType {
  id: string
  name: string
  minWeight: number
  maxWeight: number
  isDefault: boolean
}

const truckTypes = ref<TruckType[]>([])
const showEditModal = ref(false)
const editingTruck = ref<TruckType | null>(null)
const truckForm = ref({
  name: '',
  minWeight: 0,
  maxWeight: 0,
  isDefault: false
})

// 加载车型列表
const loadTrucks = async () => {
  try {
    const res = await uni.request({
      url: 'https://nomur.linkmate.site/api/truck-types',
      method: 'GET'
    })
    const data = res.data as any
    if (data.code === 0) {
      truckTypes.value = data.data
    }
  } catch (e) {
    console.error('加载车型失败', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

// 添加车型
const addTruck = () => {
  editingTruck.value = null
  truckForm.value = {
    name: '',
    minWeight: 0,
    maxWeight: 0,
    isDefault: false
  }
  showEditModal.value = true
}

// 编辑车型
const editTruck = (id: string) => {
  const truck = truckTypes.value.find(t => t.id === id)
  if (truck) {
    editingTruck.value = truck
    truckForm.value = {
      name: truck.name,
      minWeight: truck.minWeight,
      maxWeight: truck.maxWeight,
      isDefault: truck.isDefault
    }
    showEditModal.value = true
  }
}

// 保存车型
const saveTruck = async () => {
  // 验证
  if (!truckForm.value.name || truckForm.value.name.trim() === '') {
    uni.showToast({ title: '请输入车型名称', icon: 'none' })
    return
  }
  
  if (!truckForm.value.minWeight || truckForm.value.minWeight <= 0) {
    uni.showToast({ title: '请输入最小载重', icon: 'none' })
    return
  }
  
  if (!truckForm.value.maxWeight || truckForm.value.maxWeight <= 0) {
    uni.showToast({ title: '请输入最大载重', icon: 'none' })
    return
  }
  
  if (truckForm.value.minWeight >= truckForm.value.maxWeight) {
    uni.showToast({ title: '最小载重必须小于最大载重', icon: 'none' })
    return
  }
  
  try {
    if (editingTruck.value) {
      // 更新
      const res = await uni.request({
        url: `https://nomur.linkmate.site/api/truck-types/${editingTruck.value.id}`,
        method: 'PUT',
        data: {
          name: truckForm.value.name.trim(),
          minWeight: truckForm.value.minWeight,
          maxWeight: truckForm.value.maxWeight,
          isDefault: truckForm.value.isDefault
        }
      })
      
      const data = res.data as any
      if (data.code === 0) {
        uni.showToast({ title: '更新成功', icon: 'success' })
        showEditModal.value = false
        await loadTrucks()
      } else {
        uni.showToast({ title: data.message || '更新失败', icon: 'none' })
      }
    } else {
      // 创建
      const res = await uni.request({
        url: 'https://nomur.linkmate.site/api/truck-types',
        method: 'POST',
        data: {
          name: truckForm.value.name.trim(),
          minWeight: truckForm.value.minWeight,
          maxWeight: truckForm.value.maxWeight,
          isDefault: truckForm.value.isDefault
        }
      })
      
      const data = res.data as any
      if (data.code === 0) {
        uni.showToast({ title: '添加成功', icon: 'success' })
        showEditModal.value = false
        await loadTrucks()
      } else {
        uni.showToast({ title: data.message || '添加失败', icon: 'none' })
      }
    }
  } catch (e) {
    console.error('保存车型失败', e)
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

// 确认删除
const confirmDelete = (id: string, name: string) => {
  uni.showModal({
    title: '删除车型',
    content: `确定要删除车型"${name}"吗？`,
    confirmText: '删除',
    confirmColor: '#FF4D4F',
    success: async (res) => {
      if (res.confirm) {
        try {
          const result = await uni.request({
            url: `https://nomur.linkmate.site/api/truck-types/${id}`,
            method: 'DELETE'
          })
          
          const data = result.data as any
          if (data.code === 0) {
            uni.showToast({ title: '删除成功', icon: 'success' })
            await loadTrucks()
          } else {
            uni.showToast({ title: data.message || '删除失败', icon: 'none' })
          }
        } catch (e) {
          console.error('删除车型失败', e)
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

onMounted(() => {
  loadTrucks()
})
</script>

<style lang="scss" scoped>
@import "@/styles/variables.scss";

.trucks-page {
  padding: 24rpx;
  padding-bottom: 280rpx;
}

.truck-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.truck-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: #fff;
  border-radius: $border-radius-lg;
  box-shadow: $shadow-sm;
  
  &:active {
    background: $bg-hover;
  }
  
  &__info {
    flex: 1;
  }
  
  &__header {
    display: flex;
    align-items: center;
    gap: 12rpx;
    margin-bottom: 8rpx;
  }
  
  &__name {
    font-size: 32rpx;
    font-weight: 600;
    color: $text-primary;
  }
  
  &__default {
    padding: 4rpx 12rpx;
    background: $primary-color;
    color: #fff;
    border-radius: 8rpx;
    font-size: 22rpx;
  }
  
  &__weight {
    font-size: 28rpx;
    color: $text-secondary;
  }
  
  &__actions {
    display: flex;
    gap: 16rpx;
    align-items: center;
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
    .action-icon {
      opacity: 0.6;
    }
  }
}

.action-icon {
  width: 32rpx;
  height: 32rpx;
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
  bottom: 40rpx;
  left: 24rpx;
  right: 24rpx;
  height: 100rpx;
  background: $primary-color;
  border-radius: $border-radius-lg;
  display: flex;
  align-items: center;
  justify-content: center;
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

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  
  &:active {
    opacity: 0.7;
  }
}

.checkbox {
  width: 40rpx;
  height: 40rpx;
  border: 2rpx solid $border-color;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  
  &--checked {
    background: $primary-color;
    border-color: $primary-color;
  }
  
  &__check {
    font-size: 24rpx;
    color: #fff;
    font-weight: bold;
  }
  
  &__label {
    font-size: 28rpx;
    color: $text-primary;
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
}
</style>

