<template>
  <section>
    <InfoHeader :item="itemDetails" />
    <ProviderLinkHint
      :text="$t('discover_more_on')"
      icon="mdi-compass-outline"
      :links="streamingLinks"
    />
    <ItemsListing
      v-if="itemDetails && !loading"
      itemtype="libraryartistalbums"
      :parent-item="itemDetails"
      :show-favorites-only-filter="true"
      :show-album-type-filter="true"
      :show-refresh-button="false"
      :load-items="loadArtistAlbums"
      :sort-keys="[
        'sort_name',
        'name',
        'year',
        'name_desc',
        'sort_name_desc',
        'year_desc',
      ]"
      :title="$t('albums')"
      :subtitle="$t('in_library')"
      :allow-collapse="true"
    />
    <ItemsListing
      v-if="itemDetails && !loading"
      itemtype="libraryartisttracks"
      :parent-item="itemDetails"
      :show-favorites-only-filter="true"
      :show-refresh-button="false"
      :show-track-number="false"
      :load-items="loadArtistTracks"
      :sort-keys="[
        'sort_name',
        'name',
        'album',
        'album_sort_name',
        'duration',
        'name_desc',
        'sort_name_desc',
        'duration_desc',
        'playcount',
        'playcount_desc',
      ]"
      :title="$t('tracks')"
      :subtitle="$t('in_library')"
      :allow-collapse="true"
    />
    <!-- top albums -->
    <ItemsListing
      v-if="itemDetails && !loading"
      itemtype="artistalbums"
      path="artisttopalbums"
      :parent-item="itemDetails"
      :show-provider="true"
      :show-favorites-only-filter="false"
      :show-library-only-filter="false"
      :show-refresh-button="false"
      :load-items="loadArtistTopAlbums"
      :sort-keys="['original', 'name', 'year', 'year_desc']"
      :title="$t('artist_topalbums')"
      :allow-collapse="true"
      :hide-on-empty="true"
    />
    <!-- top tracks -->
    <ItemsListing
      v-if="itemDetails && !loading"
      itemtype="artisttracks"
      path="artisttoptracks"
      :parent-item="itemDetails"
      :show-provider="true"
      :show-favorites-only-filter="false"
      :show-library-only-filter="false"
      :show-refresh-button="false"
      :show-track-number="false"
      :load-items="loadArtistTopTracks"
      :sort-keys="['original', 'name', 'duration', 'duration_desc']"
      :title="$t('artist_toptracks')"
      :allow-collapse="true"
      :hide-on-empty="true"
    />
    <!-- similar artists -->
    <ItemsListing
      v-if="itemDetails && !loading"
      itemtype="similarartists"
      :parent-item="itemDetails"
      :show-provider="false"
      :show-favorites-only-filter="false"
      :show-library-only-filter="false"
      :show-refresh-button="false"
      :load-items="loadSimilarArtists"
      :title="$t('similar_artists')"
      :allow-collapse="true"
      :hide-on-empty="true"
    />
    <!-- media images -->
    <MediaItemImages
      v-if="
        itemDetails?.provider == 'library' &&
        itemDetails?.metadata?.images &&
        authManager.isAdmin()
      "
      v-model="itemDetails.metadata.images"
      @update:model-value="UpdateItemInDb"
    />
    <!-- provider mapping details -->
    <ProviderDetails v-if="itemDetails" :item-details="itemDetails" />
  </section>
</template>

<script setup lang="ts">
import InfoHeader from "@/components/InfoHeader.vue";
import ItemsListing, { LoadDataParams } from "@/components/ItemsListing.vue";
import MediaItemImages from "@/components/MediaItemImages.vue";
import ProviderDetails from "@/components/ProviderDetails.vue";
import ProviderLinkHint, {
  ProviderLink,
} from "@/components/ProviderLinkHint.vue";
import { api } from "@/plugins/api";
import { authManager } from "@/plugins/auth";
import {
  EventMessage,
  EventType,
  MediaItemType,
  type Artist,
} from "@/plugins/api/interfaces";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

export interface Props {
  itemId: string;
}
const props = defineProps<Props>();
const itemDetails = ref<Artist>();
const loading = ref(false);

const loadItemDetails = async function () {
  loading.value = true;
  itemDetails.value = await api.getArtist(props.itemId, "library");
  loading.value = false;
};

watch(
  () => props.itemId,
  (val) => {
    if (val) loadItemDetails();
  },
  { immediate: true },
);

onMounted(() => {
  //signal if/when item updates
  const unsub = api.subscribe(
    EventType.MEDIA_ITEM_UPDATED,
    (evt: EventMessage) => {
      const updatedItem = evt.data as MediaItemType;
      // check if the updated item is the current item
      if (itemDetails.value?.uri == updatedItem.uri) {
        // update UI with the updated item
        loading.value = true;
        itemDetails.value = updatedItem as Artist;
        loading.value = false;
      }
    },
  );
  onBeforeUnmount(unsub);
});

const streamingLinks = computed<ProviderLink[]>(() => {
  if (!itemDetails.value) return [];
  const seen = new Set<string>();
  const links: ProviderLink[] = [];
  for (const mapping of itemDetails.value.provider_mappings) {
    if (!mapping.available) continue;
    if (seen.has(mapping.provider_instance)) continue;
    const provider = api.getProvider(mapping.provider_instance);
    if (!provider?.is_streaming_provider) continue;
    seen.add(mapping.provider_instance);
    links.push({
      text: provider.name,
      to: {
        name: "artist",
        params: {
          itemId: mapping.item_id,
          provider: mapping.provider_instance,
        },
      },
    });
  }
  return links;
});

const loadArtistAlbums = async function (_params: LoadDataParams) {
  return await api.getArtistAlbums(props.itemId, "library");
};

const loadArtistTopAlbums = async function (_params: LoadDataParams) {
  return await api.getArtistTopAlbums(props.itemId, "library");
};

const loadArtistTopTracks = async function (_params: LoadDataParams) {
  return await api.getArtistTopTracks(props.itemId, "library");
};

const loadSimilarArtists = async function (_params: LoadDataParams) {
  if (!itemDetails.value) return [];
  return await api.getSimilarArtists(props.itemId, "library");
};

const loadArtistTracks = async function (params: LoadDataParams) {
  return await api.getArtistTracks(props.itemId, "library");
};

const UpdateItemInDb = async function () {
  if (!itemDetails.value) return;
  itemDetails.value = await api.sendCommand("music/artists/update", {
    item_id: itemDetails.value.item_id,
    update: itemDetails.value,
    overwrite: true,
  });
};
</script>
