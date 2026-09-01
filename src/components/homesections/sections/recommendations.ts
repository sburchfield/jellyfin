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
    const maxItemsPerCategory = Math.max(0, ...categories.map(category => category.Items?.length || 0));

    for (let itemIndex = 0; itemIndex < maxItemsPerCategory; itemIndex++) {
        for (const category of categories) {
            const item = category.Items?.[itemIndex];
            if (!item) continue;

            const key = getItemDedupeKey(item);
            if (!key || seen.has(key)) continue;

            seen.add(key);
            items.push(item);
            if (items.length >= MAX_ROW_ITEMS) return items;
        }
    }

    return items;
}

async function getRecommendationItems(
    apiClient: ApiClient,
    userId: string,
    parentId: string
): Promise<BaseItemDto[]> {
    try {
        const categories = await apiClient.getMovieRecommendations({
            UserId: userId,
            ParentId: parentId,
            Fields: 'PrimaryImageAspectRatio',
            ImageTypeLimit: 1,
            CategoryLimit: 6,
            ItemLimit: 8
        });

        const watchedCategories = (categories || []).filter(isBecauseYouWatchedCategory);
        return getUniqueRecommendationItems(watchedCategories.length ? watchedCategories : categories || []);
    } catch {
        return [];
    }
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
    const moviesViewId = moviesView?.Id;
    if (!moviesViewId) return;

    appendCardRow(elem, {
        title: 'Because you watched',
        dataMonitor: 'videoplayback,markplayed',
        dataRefreshInterval: 5 * 60 * 1000,
        fetchData: function () {
            return getRecommendationItems(apiClient, userId, moviesViewId);
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
