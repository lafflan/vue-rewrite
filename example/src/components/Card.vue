<script setup lang="ts">
interface Props {
  title: string;
  variant?: 'default' | 'elevated';
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
});

const variantClasses: Record<string, string> = {
  default: 'border border-gray-200',
  elevated: 'shadow-xl',
};
</script>

<template>
  <div
    :class="[
      'bg-white rounded-2xl p-6 transition-shadow duration-300',
      variantClasses[props.variant],
    ]"
  >
    <h3 class="text-xl font-semibold text-gray-900 mb-3">{{ title }}</h3>
    <div class="text-gray-600">
      <slot />
    </div>
  </div>
</template>
