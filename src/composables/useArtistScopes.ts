import { computed, type MaybeRefOrGetter, toValue } from "vue";
import type { RouteLocationRaw } from "vue-router";
import { useI18n } from "vue-i18n";
import { api } from "@/plugins/api";
import type { Artist } from "@/plugins/api/interfaces";

export interface ArtistScope {
  key: string;
  label: string;
  to: RouteLocationRaw;
}

/**
 * Build the ordered list of selectable views ("scopes") for an artist.
 *
 * :param itemDetails: The loaded artist whose provider mappings drive the scopes.
 * :param currentProvider: The provider of the view currently shown ("library" or a provider instance id).
 */
export function useArtistScopes(
  itemDetails: MaybeRefOrGetter<Artist | undefined>,
  currentProvider: MaybeRefOrGetter<string>,
) {
  const { t } = useI18n();

  const scopes = computed<ArtistScope[]>(() => {
    const item = toValue(itemDetails);
    if (!item) return [];
    const result: ArtistScope[] = [];
    // the backend auto-resolves in-library artists to the library version
    if (item.provider === "library") {
      result.push({
        key: "library",
        label: t("library"),
        to: { name: "libraryartist", params: { itemId: item.item_id } },
      });
    }
    const seen = new Set<string>();
    for (const mapping of item.provider_mappings) {
      if (!mapping.available) continue;
      if (seen.has(mapping.provider_instance)) continue;
      const provider = api.getProvider(mapping.provider_instance);
      if (!provider?.is_streaming_provider) continue;
      seen.add(mapping.provider_instance);
      result.push({
        key: mapping.provider_instance,
        label: provider.name,
        to: {
          name: "artist",
          params: {
            itemId: mapping.item_id,
            provider: mapping.provider_instance,
          },
        },
      });
    }
    return result;
  });

  const activeKey = computed(() => toValue(currentProvider));

  return { scopes, activeKey };
}
