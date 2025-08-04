<script setup>
import { computed } from 'vue'
import { useRoute } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import CustomFooter from './CustomFooter.vue'

const { Layout } = DefaultTheme
const route = useRoute()

// Check if current page is home page
const isHomePage = computed(() => {
  return route.path === '/'
})
</script>

<template>
  <div class="layout-wrapper">
    <Layout />
    <!-- Only show footer on home page -->
    <CustomFooter v-if="isHomePage" />
  </div>
</template>

<style scoped>
.layout-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.layout-wrapper :deep(.Layout) {
  flex: 1;
}
</style>