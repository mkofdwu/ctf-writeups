<script setup lang="ts">
import MaterialIcon from '../MaterialIcon.vue'

defineProps<{ modelValue: string }>()
defineEmits(['update:modelValue', 'focusIn', 'focusOut'])
</script>

<template>
  <div>
    <div class="h-16 px-6 flex items-center">
      <material-icon name="search" class="opacity-60 mr-5" />
      <input
        type="text"
        placeholder="Search..."
        class="flex-1 h-16 text-lg placeholder-white/60"
        :value="modelValue"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @focusin="$emit('focusIn')"
        @focusout="$emit('focusOut')"
      />
    </div>
    <div class="dotted-line-hori"></div>
  </div>
</template>
