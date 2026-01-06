<template>
  <view class="quick-input">
    <view class="quick-input__label" v-if="label">
      {{ label }}
      <text v-if="required" class="quick-input__required">*</text>
    </view>
    <view class="quick-input__wrapper" :class="{ 'quick-input__wrapper--focus': isFocused }">
      <text v-if="prefix" class="quick-input__prefix">{{ prefix }}</text>
      <input
        class="quick-input__input"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        @input="handleInput"
        @focus="isFocused = true"
        @blur="isFocused = false"
      />
      <text v-if="suffix" class="quick-input__suffix">{{ suffix }}</text>
      <view v-if="clearable && modelValue" class="quick-input__clear" @tap="handleClear">
        <text class="quick-input__clear-icon">×</text>
      </view>
    </view>
    
    <!-- 快捷数量按钮 -->
    <view v-if="showQuickNumbers" class="quick-input__quick">
      <view 
        v-for="num in quickNumbers" 
        :key="num"
        class="quick-input__quick-btn"
        @tap="setQuickValue(num)"
      >
        {{ num }}
      </view>
    </view>
    
    <!-- 计算结果展示 -->
    <view v-if="calcResult" class="quick-input__calc">
      <text class="quick-input__calc-label">{{ calcLabel }}</text>
      <text class="quick-input__calc-value">{{ calcResult }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string | number
  label?: string
  placeholder?: string
  type?: 'text' | 'number' | 'digit'
  prefix?: string
  suffix?: string
  disabled?: boolean
  required?: boolean
  clearable?: boolean
  showQuickNumbers?: boolean
  quickNumbers?: number[]
  calcLabel?: string
  calcResult?: string | number
}>(), {
  type: 'text',
  clearable: true,
  showQuickNumbers: false,
  quickNumbers: () => [10, 20, 50, 100]
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
  (e: 'change', value: string | number): void
}>()

const isFocused = ref(false)

const handleInput = (e: any) => {
  // uni-app 中 input 事件使用 e.detail.value，而不是 e.target.value
  // 优先使用 e.detail.value（uni-app标准），兼容 e.target.value（降级方案）
  let inputValue = ''
  if (e.detail && e.detail.value !== undefined) {
    inputValue = String(e.detail.value)
  } else if (e.target && (e.target as HTMLInputElement).value !== undefined) {
    inputValue = String((e.target as HTMLInputElement).value)
  }
  
  const value = props.type === 'number' || props.type === 'digit' 
    ? (inputValue === '' ? 0 : Number(inputValue) || 0)
    : inputValue
  
  emit('update:modelValue', value)
  emit('change', value)
}

const handleClear = () => {
  emit('update:modelValue', props.type === 'number' || props.type === 'digit' ? 0 : '')
  emit('change', props.type === 'number' || props.type === 'digit' ? 0 : '')
}

const setQuickValue = (num: number) => {
  uni.vibrateShort({ type: 'light' })
  emit('update:modelValue', num)
  emit('change', num)
}
</script>

<style lang="scss" scoped>
.quick-input {
  margin-bottom: 24rpx;
  
  &__label {
    font-size: 28rpx;
    font-weight: 500;
    color: $text-primary;
    margin-bottom: 16rpx;
  }
  
  &__required {
    color: $danger-color;
    margin-left: 4rpx;
  }
  
  &__wrapper {
    display: flex;
    align-items: center;
    padding: 24rpx;
    background: $bg-grey;
    border-radius: $border-radius;
    border: 2rpx solid transparent;
    transition: all $transition-fast;
    
    &--focus {
      border-color: $primary-color;
      background: #fff;
    }
  }
  
  &__prefix {
    color: $text-secondary;
    font-size: 28rpx;
    margin-right: 12rpx;
  }
  
  &__input {
    flex: 1;
    font-size: 32rpx;
    color: $text-primary;
  }
  
  &__suffix {
    color: $text-secondary;
    font-size: 28rpx;
    margin-left: 12rpx;
  }
  
  &__clear {
    width: 40rpx;
    height: 40rpx;
    border-radius: 50%;
    background: $text-placeholder;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: 12rpx;
  }
  
  &__clear-icon {
    color: #fff;
    font-size: 24rpx;
    line-height: 1;
  }
  
  &__quick {
    display: flex;
    gap: 16rpx;
    margin-top: 16rpx;
  }
  
  &__quick-btn {
    flex: 1;
    padding: 16rpx;
    background: rgba($primary-color, 0.1);
    color: $primary-color;
    border-radius: 8rpx;
    text-align: center;
    font-size: 28rpx;
    font-weight: 500;
    
    &:active {
      background: rgba($primary-color, 0.2);
    }
  }
  
  &__calc {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 16rpx;
    padding: 16rpx 20rpx;
    background: rgba($success-color, 0.1);
    border-radius: 8rpx;
  }
  
  &__calc-label {
    font-size: 26rpx;
    color: $text-secondary;
  }
  
  &__calc-value {
    font-size: 32rpx;
    font-weight: 600;
    color: $success-color;
  }
}
</style>

