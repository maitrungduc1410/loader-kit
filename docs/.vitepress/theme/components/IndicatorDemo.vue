<script setup lang="ts">
import IndicatorControls from './IndicatorControls.vue';

withDefaults(defineProps<{ indicator?: string }>(), { indicator: 'BallPulse' });
</script>

<template>
  <div class="lk-card">
    <IndicatorControls :indicator="indicator" />
  </div>
</template>
