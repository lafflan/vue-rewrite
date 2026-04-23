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
  <div :class="[
    'bg-white rounded-2xl p-6 transition-shadow duration-300',
    variantClasses[props.variant],
  ]" data-vr-id="vr-mo9tgst8-1y">
    <h3 class="text-xl font-semibold text-gray-900 mb-3" data-vr-id="vr-mo9tgst8-1z">{{ title }}</h3>
    <div class="text-gray-600" data-vr-id="vr-mo9tgst8-20">
      <slot data-vr-id="vr-mo9tgst8-21"></slot>
    </div>
  </div>
</template>
