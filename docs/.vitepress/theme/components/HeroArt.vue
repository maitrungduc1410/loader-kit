<script setup lang="ts">
import LoaderKitPreview from './LoaderKitPreview.vue';

const satellites = [
  { indicator: 'BallPulse', class: 'top-left', colors: null },
  { indicator: 'LineScale', class: 'top-right', colors: ['#06b6d4', '#7c3aed'] },
  { indicator: 'SquareSpin', class: 'bottom-left', colors: null },
  { indicator: 'BallGridPulse', class: 'bottom-right', colors: ['#7c3aed', '#06b6d4', '#a855f7'] },
] as const;
</script>

<template>
  <div class="hero-art" aria-hidden="true">
    <div class="card center">
      <LoaderKitPreview indicator="BallSpinFadeLoader" :colors="['#7c3aed', '#8b5cf6', '#06b6d4', '#22d3ee']" :size="132" />
    </div>
    <div v-for="(item, index) in satellites" :key="item.indicator" class="card satellite" :class="item.class" :style="{ animationDelay: `${index * -1.5}s` }">
      <LoaderKitPreview :indicator="item.indicator" :colors="item.colors" :size="40" />
    </div>
  </div>
</template>

<style scoped>
.hero-art {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 280px;
  height: 280px;
  transform: translate(-50%, -50%);
}

@media (min-width: 640px) {
  .hero-art {
    width: 340px;
    height: 340px;
  }
}

@media (min-width: 960px) {
  .hero-art {
    width: 380px;
    height: 380px;
  }
}

.card {
  position: absolute;
  display: grid;
  place-items: center;
  border: 1px solid var(--vp-c-divider);
  background: color-mix(in srgb, var(--vp-c-bg) 78%, transparent);
  box-shadow: var(--vp-shadow-2);
  backdrop-filter: blur(6px);
  color: var(--lk-indicator);
}

.center {
  top: 50%;
  left: 50%;
  width: 52%;
  height: 52%;
  border-radius: 28%;
  transform: translate(-50%, -50%);
}

.center :deep(.lk-preview) {
  width: 70% !important;
  height: 70% !important;
}

.satellite {
  width: 22%;
  height: 22%;
  border-radius: 26%;
  animation: float 6s ease-in-out infinite;
}

.satellite :deep(.lk-preview) {
  width: 56% !important;
  height: 56% !important;
}

.top-left {
  top: 4%;
  left: 4%;
}

.top-right {
  top: 8%;
  right: 2%;
}

.bottom-left {
  bottom: 6%;
  left: 0;
}

.bottom-right {
  bottom: 2%;
  right: 6%;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .satellite {
    animation: none;
  }
}
</style>
