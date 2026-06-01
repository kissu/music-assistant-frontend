<template>
  <section>
    <InfoHeader :item="itemDetails" />
    <ArtistViewSwitcher :scopes="scopes" :active-key="activeKey" />
    <ItemsListing
      v-if="itemDetails && !loading && hasAlbums"
      itemtype="artistalbums"
      :parent-item="itemDetails"
      :show-provider="false"
      :show-favorites-only-filter="false"
      :show-album-type-filter="true"
      :show-refresh-button="false"
      :load-items="loadArtistAlbums"
      :sort-keys="[
        'name',
        'sort_name',
        'year',
        'name_desc',
        'sort_name_desc',
        'year_desc',
      ]"
      :title="$t('albums')"
      :subtitle="$t('on_provider', [providerName])"
      :allow-collapse="true"
    />
    <ItemsListing
      v-if="itemDetails && !loading && hasTracks"
      itemtype="artisttracks"
      :parent-item="itemDetails"
      :show-provider="false"
      :show-favorites-only-filter="false"
      :show-provider-filter="false"
      :show-refresh-button="false"
      :show-track-number="false"
      :load-items="loadArtistTracks"
      :sort-keys="[
        'original',
        'name',
        'sort_name',
        'album',
        'album_sort_name',
        'duration',
        'name_desc',
        'sort_name_desc',
        'duration_desc',
      ]"
      :title="$t('tracks')"
      :subtitle="$t('on_provider', [providerName])"
      :allow-collapse="true"
    />
    <!-- top albums -->
    <ItemsListing
      v-if="itemDetails && !loading && hasTopAlbums"
      itemtype="artistalbums"
      path="artisttopalbums"
      :parent-item="itemDetails"
      :show-provider="false"
      :show-favorites-only-filter="false"
      :show-library-only-filter="false"
      :show-refresh-button="false"
      :load-items="loadArtistTopAlbums"
      :sort-keys="['original', 'name', 'year', 'year_desc']"
      :title="$t('artist_topalbums')"
      :subtitle="$t('on_provider', [providerName])"
      :allow-collapse="true"
      :hide-on-empty="true"
    />
    <!-- top tracks -->
    <ItemsListing
      v-if="itemDetails && !loading && hasTopTracks"
      itemtype="artisttracks"
      path="artisttoptracks"
      :parent-item="itemDetails"
      :show-provider="false"
      :show-favorites-only-filter="false"
      :show-library-only-filter="false"
      :show-refresh-button="false"
      :show-track-number="false"
      :load-items="loadArtistTopTracks"
      :sort-keys="['original', 'name', 'duration', 'duration_desc']"
      :title="$t('artist_toptracks')"
      :subtitle="$t('on_provider', [providerName])"
      :allow-collapse="true"
      :hide-on-empty="true"
    />
    <!-- similar artists -->
    <ItemsListing
      v-if="itemDetails && !loading && hasSimilarArtists"
      itemtype="similarartists"
      :parent-item="itemDetails"
      :show-provider="false"
      :show-favorites-only-filter="false"
      :show-library-only-filter="false"
      :show-refresh-button="false"
      :load-items="loadSimilarArtists"
      :title="$t('similar_artists')"
      :allow-collapse="true"
    />
  </section>
</template>

<script setup lang="ts">
import ArtistViewSwitcher from "@/components/ArtistViewSwitcher.vue";
import InfoHeader from "@/components/InfoHeader.vue";
import ItemsListing, { LoadDataParams } from "@/components/ItemsListing.vue";
import { useArtistScopes } from "@/composables/useArtistScopes";
import { api } from "@/plugins/api";
import {
  EventMessage,
  EventType,
  MediaItemType,
  ProviderFeature,
  type Artist,
} from "@/plugins/api/interfaces";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

export interface Props {
  itemId: string;
  provider: string;
}
const props = defineProps<Props>();
const itemDetails = ref<Artist>();
const loading = ref(false);

const loadItemDetails = async function () {
  loading.value = true;
  itemDetails.value = await api.getArtist(props.itemId, props.provider);
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
      } else if ("provider_mappings" in updatedItem) {
        for (const provMap of updatedItem.provider_mappings) {
          if (
            provMap.item_id == props.itemId &&
            [provMap.provider_instance, provMap.provider_domain].includes(
              props.provider,
            )
          ) {
            loading.value = true;
            itemDetails.value = updatedItem as Artist;
            loading.value = false;
            break;
          }
        }
      }
    },
  );
  onBeforeUnmount(unsub);
});

const { scopes, activeKey } = useArtistScopes(
  itemDetails,
  () => props.provider,
);

const itemProvider = computed(() => api.getProvider(props.provider));

const providerName = computed(() => itemProvider.value?.name || props.provider);

const hasFeature = (feature: ProviderFeature) =>
  computed(
    () => itemProvider.value?.supported_features.includes(feature) === true,
  );

const hasAlbums = hasFeature(ProviderFeature.ARTIST_ALBUMS);
const hasTracks = hasFeature(ProviderFeature.ARTIST_TRACKS);
const hasSimilarArtists = hasFeature(ProviderFeature.SIMILAR_ARTISTS);
const hasTopTracks = hasFeature(ProviderFeature.ARTIST_TOPTRACKS);
const hasTopAlbums = hasFeature(ProviderFeature.ARTIST_TOPALBUMS);

const loadArtistAlbums = async function (_params: LoadDataParams) {
  return await api.getArtistAlbums(props.itemId, props.provider);
};

const loadArtistTopAlbums = async function (_params: LoadDataParams) {
  return await api.getArtistTopAlbums(props.itemId, props.provider);
};

const loadSimilarArtists = async function (_params: LoadDataParams) {
  if (!itemDetails.value) return [];
  return await api.getSimilarArtists(props.itemId, props.provider);
};

const loadArtistTracks = async function (_params: LoadDataParams) {
  return await api.getArtistTracks(props.itemId, props.provider);
};

const loadArtistTopTracks = async function (_params: LoadDataParams) {
  return await api.getArtistTopTracks(props.itemId, props.provider);
};
</script>
