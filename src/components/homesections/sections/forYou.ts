import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto';
import type { UserDto } from '@jellyfin/sdk/lib/generated-client/models/user-dto';
import type { ApiClient } from 'jellyfin-apiclient';

import cardBuilder from 'components/cardbuilder/cardBuilder';
import { getPortraitShape } from 'utils/card';

import { appendCardRow } from './cardRow';
import type { SectionOptions } from './section';

const MAX_ROW_ITEMS = 20;
const RECENTLY_WATCHED_LIMIT = 30;
const MAX_SEEDS = 6;
const RELATED_ITEMS_PER_SEED = 12;

function getDedupeKey(item: BaseItemDto): string {
    return item.Type === 'Episode' ? item.SeriesId || item.Id || '' : item.Id || '';
}

function getSimilarItemSeedId(item: BaseItemDto): string | null {
    if (item.Type === 'Episode') return item.SeriesId || null;
    return item.Id || null;
}

function isDiscoverable(item: BaseItemDto, seedIds: Set<string>): boolean {
    return (item.Type === 'Movie' || item.Type === 'Series')
        && !item.UserData?.Played
        && !seedIds.has(getDedupeKey(item));
}

function getRecentSeedIds(items: BaseItemDto[]): string[] {
    const seeds: string[] = [];
    const seedIds = new Set<string>();

    for (const item of items) {
        const itemId = getSimilarItemSeedId(item);
        if (!itemId || seedIds.has(itemId)) continue;

        seedIds.add(itemId);
        seeds.push(itemId);
        if (seeds.length >= MAX_SEEDS) break;
    }

    return seeds;
}

async function getSimilarItemsForSeeds(apiClient: ApiClient, userId: string, seeds: string[]): Promise<BaseItemDto[][]> {
    return Promise.all(seeds.map(async itemId => {
        try {
            const result = await apiClient.getSimilarItems(itemId, {
                userId: userId,
                limit: RELATED_ITEMS_PER_SEED,
                fields: 'PrimaryImageAspectRatio'
            });
            return result.Items || [];
        } catch {
            return [];
        }
    }));
}

async function getForYouItems(apiClient: ApiClient, userId: string): Promise<BaseItemDto[]> {
    try {
        const recentlyWatched = await apiClient.getItems(userId, {
            IncludeItemTypes: 'Movie,Episode',
            Filters: 'IsPlayed',
            Recursive: true,
            SortBy: 'DatePlayed',
            SortOrder: 'Descending',
            Limit: RECENTLY_WATCHED_LIMIT,
            Fields: 'PrimaryImageAspectRatio,SeriesId',
            ImageTypeLimit: 1,
            EnableTotalRecordCount: false
        });
        const seeds = getRecentSeedIds(recentlyWatched.Items || []);

        if (!seeds.length) return [];

        const similarItemsBySeed = await getSimilarItemsForSeeds(apiClient, userId, seeds);

        const items: BaseItemDto[] = [];
        const seen = new Set<string>();
        const seedIds = new Set(seeds);
        const maxItemsPerSeed = Math.max(0, ...similarItemsBySeed.map(seedItems => seedItems.length));

        for (let itemIndex = 0; itemIndex < maxItemsPerSeed; itemIndex++) {
            for (const similarItems of similarItemsBySeed) {
                const item = similarItems[itemIndex];
                const key = item && getDedupeKey(item);
                if (!item || !key || seen.has(key) || !isDiscoverable(item, seedIds)) continue;

                seen.add(key);
                items.push(item);
                if (items.length >= MAX_ROW_ITEMS) return items;
            }
        }

        return items;
    } catch {
        return [];
    }
}

export function loadForYou(
    elem: HTMLElement,
    apiClient: ApiClient,
    user: UserDto,
    options: SectionOptions
): void {
    const userId = user.Id || apiClient.getCurrentUserId();

    appendCardRow(elem, {
        title: 'For You',
        dataMonitor: 'videoplayback,markplayed',
        dataRefreshInterval: 5 * 60 * 1000,
        fetchData: function () {
            return getForYouItems(apiClient, userId);
        },
        getItemsHtml: function (items: BaseItemDto[]) {
            return cardBuilder.getCardsHtml({
                items: items,
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
