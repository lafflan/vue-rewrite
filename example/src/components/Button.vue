<script setup lang="ts">

interface Props {
  variant?: 'primary' | 'secondary' | 'danger';
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
});

const baseClasses = 'px-6 py-3 rounded-xl font-semibold transition-all duration-200 cursor-pointer';

const variantClasses: Record<string, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg',
  secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 shadow-sm hover:shadow',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg',
};

</script>
<template>
  <button :class="[baseClasses, variantClasses[props.variant]]" data-vr-id="vr-mo9tgsti-22">
    <slot data-vr-id="vr-mo9tgsti-23"></slot>
  </button>
</template>
