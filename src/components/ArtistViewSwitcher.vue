<template>
  <div v-if="scopes.length > 1" class="artist-view-switcher">
    <!-- hidden row used only to measure natural tab widths -->
    <div
      ref="measureRef"
      aria-hidden="true"
      class="artist-view-switcher__measure"
    >
      <span v-for="scope in scopes" :key="scope.key">{{ scope.label }}</span>
      <span>{{ moreLabel }}</span>
    </div>

    <Tabs :model-value="activeKey" @update:model-value="onSelect">
      <TabsList
        class="h-auto w-full justify-start gap-2 rounded-none bg-transparent p-0"
      >
        <TabsTrigger
          v-for="scope in visible"
          :key="scope.key"
          :value="scope.key"
          class="h-auto flex-none bg-transparent px-3 py-1 text-muted-foreground shadow-none data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-foreground"
        >
          {{ scope.label }}
        </TabsTrigger>

        <DropdownMenu v-if="overflow.length">
          <DropdownMenuTrigger as-child>
            <button
              type="button"
              class="artist-view-switcher__more inline-flex h-auto flex-none items-center gap-1 rounded-md px-3 py-1 text-sm font-medium whitespace-nowrap text-muted-foreground outline-none transition-colors hover:text-foreground"
            >
              {{ moreLabel }}
              <ChevronDown class="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              v-for="scope in overflow"
              :key="scope.key"
              @select="onSelect(scope.key)"
            >
              {{ scope.label }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TabsList>
    </Tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useResizeObserver, useWindowSize } from "@vueuse/core";
import { useI18n } from "vue-i18n";
import { ChevronDown } from "lucide-vue-next";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ArtistScope } from "@/composables/useArtistScopes";

interface Props {
  scopes: ArtistScope[];
  activeKey: string;
}
const props = defineProps<Props>();
const router = useRouter();
const { t } = useI18n();

const moreLabel = computed(() => t("more"));

const onSelect = (value: string | number) => {
  const key = String(value);
  if (key === props.activeKey) return;
  const scope = props.scopes.find((s) => s.key === key);
  if (scope) router.push(scope.to);
};

// --- responsive overflow ---------------------------------------------------
// Layout: Library is pinned first, then provider tabs (the active/selected
// provider is always shown), then a "More" dropdown for the rest.
const LIBRARY_KEY = "library";
const measureRef = ref<HTMLElement>();
const { width: windowWidth } = useWindowSize();
const providerVisibleCount = ref(props.scopes.length);

const GAP = 8; // gap-2 between items
const SIDE_MARGIN = 32; // 16px margin each side
const MORE_ICON = 22; // chevron + gap allowance for the More button

const hasLibrary = computed(() =>
  props.scopes.some((s) => s.key === LIBRARY_KEY),
);
const providers = computed(() =>
  props.scopes.filter((s) => s.key !== LIBRARY_KEY),
);

const recompute = () => {
  const all = props.scopes;
  const row = measureRef.value;
  if (!row) {
    providerVisibleCount.value = providers.value.length;
    return;
  }
  const spans = Array.from(row.children) as HTMLElement[];
  const widthByKey = new Map<string, number>();
  all.forEach((s, i) => widthByKey.set(s.key, spans[i]?.offsetWidth ?? 0));
  const moreWidth = (spans[all.length]?.offsetWidth ?? 60) + MORE_ICON;

  const libWidth = hasLibrary.value ? (widthByKey.get(LIBRARY_KEY) ?? 0) : 0;
  const avail = windowWidth.value - SIDE_MARGIN;

  // do all tabs fit with no More button?
  const gapCount = (hasLibrary.value ? 1 : 0) + providers.value.length - 1;
  const fullWidth =
    libWidth +
    providers.value.reduce((sum, p) => sum + (widthByKey.get(p.key) ?? 0), 0) +
    Math.max(0, gapCount) * GAP;
  if (fullWidth <= avail) {
    providerVisibleCount.value = providers.value.length;
    return;
  }

  // doesn't fit: keep the pinned Library tab + a More button, then fit as
  // many provider tabs as possible alongside them.
  let used = libWidth + (hasLibrary.value ? GAP : 0) + moreWidth + GAP;
  let fit = 0;
  for (const p of providers.value) {
    const w = (widthByKey.get(p.key) ?? 0) + GAP;
    if (used + w <= avail) {
      used += w;
      fit++;
    } else break;
  }

  const activeIsProvider =
    props.activeKey !== LIBRARY_KEY &&
    providers.value.some((p) => p.key === props.activeKey);
  const minProviders = activeIsProvider ? 1 : 0;
  providerVisibleCount.value = Math.max(minProviders, fit);
};

useResizeObserver(measureRef, recompute);
watch(windowWidth, recompute);
watch(
  () => props.scopes.map((s) => s.key).join("|"),
  () => nextTick(recompute),
);
watch(() => props.activeKey, recompute);
onMounted(() => nextTick(recompute));

const partition = computed(() => {
  const lib = hasLibrary.value
    ? props.scopes.find((s) => s.key === LIBRARY_KEY)
    : undefined;
  const all = providers.value;
  const n = Math.min(providerVisibleCount.value, all.length);

  let visibleProviders = all.slice(0, n);
  const overflow = all.slice(n);

  // keep the selected provider visible: hoist it into the last provider slot
  if (props.activeKey !== LIBRARY_KEY && n >= 1) {
    const aIdx = overflow.findIndex((p) => p.key === props.activeKey);
    if (aIdx >= 0) {
      const active = overflow[aIdx];
      overflow[aIdx] = visibleProviders[n - 1];
      visibleProviders = [...visibleProviders.slice(0, n - 1), active];
    }
  }

  const visible = lib ? [lib, ...visibleProviders] : visibleProviders;
  return { visible, overflow };
});
const visible = computed(() => partition.value.visible);
const overflow = computed(() => partition.value.overflow);
</script>

<style scoped>
.artist-view-switcher {
  margin: 12px 16px;
}

.artist-view-switcher :deep([data-slot="tabs-trigger"]),
.artist-view-switcher__more,
.artist-view-switcher__measure {
  font-family: "JetBrains Mono Medium";
}

/* active tab: thick MA-blue underline (override base shadcn trigger styling) */
.artist-view-switcher :deep([data-slot="tabs-trigger"]),
.artist-view-switcher__more {
  border: 0 !important;
  border-bottom: 3px solid transparent !important;
  border-radius: 0 !important;
  background-color: transparent !important;
  box-shadow: none !important;
}

.artist-view-switcher :deep([data-slot="tabs-trigger"][data-state="active"]) {
  border-bottom-color: var(--primary) !important;
}

/* vertical separators sitting in the gap between tabs */
.artist-view-switcher :deep([data-slot="tabs-list"]) > *:not(:first-child) {
  position: relative;
}

.artist-view-switcher
  :deep([data-slot="tabs-list"])
  > *:not(:first-child)::before {
  content: "";
  position: absolute;
  left: -4px;
  top: 50%;
  height: 1em;
  width: 1px;
  transform: translateY(-50%);
  background: var(--border);
}

/* off-screen measuring row mirrors the trigger sizing */
.artist-view-switcher__measure {
  position: absolute;
  visibility: hidden;
  pointer-events: none;
  top: 0;
  left: 0;
  display: flex;
  white-space: nowrap;
}

.artist-view-switcher__measure span {
  padding: 4px 12px; /* py-1 px-3 */
  font-size: 0.875rem; /* text-sm */
  font-weight: 500;
}
</style>
