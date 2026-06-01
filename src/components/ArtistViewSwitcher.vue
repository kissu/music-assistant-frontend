<template>
  <Tabs
    v-if="scopes.length > 1"
    :model-value="activeKey"
    class="artist-view-switcher"
    @update:model-value="onSelect"
  >
    <TabsList
      class="h-auto w-full justify-start gap-2 rounded-none bg-transparent p-0"
    >
      <TabsTrigger
        v-for="scope in scopes"
        :key="scope.key"
        :value="scope.key"
        class="h-auto flex-none rounded-md border-0 bg-transparent px-3 py-1 text-muted-foreground shadow-none data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none dark:data-[state=active]:bg-primary dark:data-[state=active]:text-primary-foreground"
      >
        {{ scope.label }}
      </TabsTrigger>
    </TabsList>
  </Tabs>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ArtistScope } from "@/composables/useArtistScopes";

interface Props {
  scopes: ArtistScope[];
  activeKey: string;
}
const props = defineProps<Props>();
const router = useRouter();

const onSelect = (value: string | number) => {
  const key = String(value);
  if (key === props.activeKey) return;
  const scope = props.scopes.find((s) => s.key === key);
  if (scope) router.push(scope.to);
};
</script>

<style scoped>
.artist-view-switcher {
  margin: 12px 16px;
}

.artist-view-switcher :deep([data-slot="tabs-trigger"]) {
  font-family: "JetBrains Mono Medium";
}
</style>
