<template>
  <view class="tag-select">
    <view class="tag-select__label" v-if="label">{{ label }}</view>
    <view class="tag-select__grid" :class="{ 'tag-select__grid--compact': compact }">
      <view
        v-for="item in options"
        :key="getItemValue(item)"
        class="tag-select__item"
        :class="{ 
          'tag-select__item--active': isSelected(item),
          'tag-select__item--disabled': item.disabled,
          'tag-select__item--compact': compact
        }"
        @tap="handleSelect(item)"
      >
        <image 
          v-if="item.image" 
          :src="item.image" 
          class="tag-select__image" 
          mode="aspectFill"
        />
        <view class="tag-select__content">
          <text class="tag-select__text">{{ getItemLabel(item) }}</text>
          <text v-if="item.subLabel" class="tag-select__subtext">{{ item.subLabel }}</text>
        </view>
        <view v-if="isSelected(item)" class="tag-select__check">
          <text class="tag-select__check-icon">✓</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface TagOption {
  label: string
  value: string | number
  subLabel?: string
  image?: string
  disabled?: boolean
  [key: string]: unknown
}

const props = withDefaults(defineProps<{
  modelValue: (string | number)[] | string | number | null
  options: TagOption[]
  multiple?: boolean
  label?: string
  valueKey?: string
  labelKey?: string
  compact?: boolean
}>(), {
  multiple: false,
  valueKey: 'value',
  labelKey: 'label',
  compact: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: (string | number)[] | string | number | null): void
  (e: 'change', value: (string | number)[] | string | number | null): void
}>()

const getItemValue = (item: TagOption) => {
  return item[props.valueKey] as string | number
}

const getItemLabel = (item: TagOption) => {
  return item[props.labelKey] as string
}

const selectedValues = computed(() => {
  if (props.modelValue === null) return []
  if (Array.isArray(props.modelValue)) return props.modelValue
  return [props.modelValue]
})

const isSelected = (item: TagOption) => {
  return selectedValues.value.includes(getItemValue(item))
}

const handleSelect = (item: TagOption) => {
  if (item.disabled) return
  
  const value = getItemValue(item)
  
  // 触发震动反馈
  uni.vibrateShort({ type: 'light' })
  
  if (props.multiple) {
    const newValue = isSelected(item)
      ? selectedValues.value.filter(v => v !== value)
      : [...selectedValues.value, value]
    emit('update:modelValue', newValue)
    emit('change', newValue)
  } else {
    const newValue = isSelected(item) ? null : value
    emit('update:modelValue', newValue)
    emit('change', newValue)
  }
}
</script>

<style lang="scss" scoped>
.tag-select {
  &__label {
    font-size: 28rpx;
    font-weight: 500;
    color: $text-primary;
    margin-bottom: 20rpx;
  }
  
  &__grid {
    display: flex;
    flex-wrap: wrap;
    gap: 20rpx;
    
    &--compact {
      gap: 12rpx;
    }
  }
  
  &__item {
    position: relative;
    display: flex;
    align-items: center;
    padding: 20rpx 28rpx;
    background: $bg-grey;
    border-radius: $border-radius;
    border: 2rpx solid transparent;
    transition: all $transition-fast;
    min-width: 140rpx;
    
    &--compact {
      padding: 14rpx 20rpx;
      min-width: auto;
    }
    
    &:active {
      transform: scale(0.96);
    }
    
    &--active {
      background: rgba($primary-color, 0.08);
      border-color: $primary-color;
      
      .tag-select__text {
        color: $primary-color;
      }
    }
    
    &--disabled {
      opacity: 0.5;
      pointer-events: none;
    }
  }
  
  &__image {
    width: 64rpx;
    height: 64rpx;
    border-radius: 8rpx;
    margin-right: 16rpx;
  }
  
  &__content {
    display: flex;
    flex-direction: column;
  }
  
  &__text {
    font-size: 28rpx;
    color: $text-primary;
    font-weight: 500;
    word-break: break-all;
    line-height: 1.4;
    max-height: 4em;
    overflow: hidden;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
  }
  
  &__subtext {
    font-size: 22rpx;
    color: $text-secondary;
    margin-top: 4rpx;
  }
  
  &__check {
    position: absolute;
    top: -4rpx;
    right: -4rpx;
    width: 36rpx;
    height: 36rpx;
    background: $primary-color;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  &__check-icon {
    font-size: 20rpx;
    color: #fff;
    font-weight: bold;
  }
}
</style>

