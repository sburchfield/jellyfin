import type { ApiClient } from 'jellyfin-apiclient';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto';
import type { UserDto } from '@jellyfin/sdk/lib/generated-client/models/user-dto';
import { CollectionType } from '@jellyfin/sdk/lib/generated-client/models/collection-type';
import type { RecommendationDto } from '@jellyfin/sdk/lib/generated-client/models/recommendation-dto';

import cardBuilder from 'components/cardbuilder/cardBuilder';
import { getPortraitShape } from 'utils/card';

import { appendCardRow } from './cardRow';
import type { SectionOptions } from './section';

const MAX_ROW_ITEMS = 20;

function isBecauseYouWatchedCategory(category: RecommendationDto): boolean {
    return category.RecommendationType === 'SimilarToRecentlyPlayed'
        || category.RecommendationType === 'SimilarToLikedItem';
}

function getItemDedupeKey(item: BaseItemDto): string {
    return item.Id || `${item.Name || ''}-${item.ProductionYear || ''}`;
}

function getUniqueRecommendationItems(categories: RecommendationDto[]): BaseItemDto[] {
    const items: BaseItemDto[] = [];
    const seen = new Set<string>();

    for (const category of categories) {
        for (const item of category.Items || []) {
            const key = getItemDedupeKey(item);
            if (!key || seen.has(key)) continue;

            seen.add(key);
            items.push(item);
            if (items.length >= MAX_ROW_ITEMS) return items;
        }
    }

    return items;
}

/* Jellyfin's native movie recommendation engine can return several near-identical
 * "Because you watched X" buckets. Home only needs one high-signal row, so we merge
 * the watched/liked buckets first, dedupe them, and fall back to the broader buckets
 * only if the server did not return watched-based recommendations. */
export async function loadRecommendations(
    elem: HTMLElement,
    apiClient: ApiClient,
    user: UserDto,
    userViews: BaseItemDto[],
    options: SectionOptions
): Promise<void> {
    const userId = user.Id || apiClient.getCurrentUserId();
    const moviesView = userViews.find(view => view.CollectionType === CollectionType.Movies);
    if (!moviesView) return;

    let categories: RecommendationDto[];
    try {
        categories = await apiClient.getMovieRecommendations({
            UserId: userId,
            ParentId: moviesView.Id,
            Fields: 'PrimaryImageAspectRatio',
            ImageTypeLimit: 1,
            CategoryLimit: 6,
            ItemLimit: 8
        });
    } catch {
        return;
    }

    const watchedCategories = (categories || []).filter(isBecauseYouWatchedCategory);
    const sourceCategories = watchedCategories.length ? watchedCategories : categories || [];
    const items = getUniqueRecommendationItems(sourceCategories);
    if (!items.length) return;

    appendCardRow(elem, {
        title: 'Because you watched',
        fetchData: function () {
            return Promise.resolve(items);
        },
        getItemsHtml: function (rowItems: BaseItemDto[]) {
            return cardBuilder.getCardsHtml({
                items: rowItems,
                shape: getPortraitShape(options.enableOverflow),
                context: 'home',
                showTitle: true,
                showYear: true,
                centerText: true,
                overlayPlayButton: true,
                lines: 2
            });
        }
    }, options);
}
