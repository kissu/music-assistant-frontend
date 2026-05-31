<template>
  <v-alert
    v-if="links.length"
    :icon="icon"
    variant="tonal"
    border="start"
    density="comfortable"
    class="provider-link-hint"
  >
    <div class="provider-link-hint__content">
      <span v-if="text" class="provider-link-hint__text">{{ text }}</span>
      <div class="provider-link-hint__links">
        <v-btn
          v-for="(link, idx) in links"
          :key="idx"
          :to="link.to"
          variant="flat"
          color="primary"
          size="small"
          rounded
        >
          {{ link.text }}
        </v-btn>
      </div>
    </div>
  </v-alert>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

export interface ProviderLink {
  text: string;
  to: RouteLocationRaw;
}

interface Props {
  links: ProviderLink[];
  text?: string;
  icon?: string;
}
withDefaults(defineProps<Props>(), {
  text: undefined,
  icon: undefined,
});
</script>

<style scoped>
.provider-link-hint {
  margin: 12px 16px;
}

.provider-link-hint__content {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
}

.provider-link-hint__text {
  font-size: 0.9rem;
}

.provider-link-hint__links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
