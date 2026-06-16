import type { ApiClient } from 'jellyfin-apiclient';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto';
import type { UserDto } from '@jellyfin/sdk/lib/generated-client/models/user-dto';
import { CollectionType } from '@jellyfin/sdk/lib/generated-client/models/collection-type';
import type { RecommendationDto } from '@jellyfin/sdk/lib/generated-client/models/recommendation-dto';

import cardBuilder from 'components/cardbuilder/cardBuilder';
import { getPortraitShape } from 'utils/card';

import { appendCardRow } from './cardRow';
import type { SectionOptions } from './section';

function getCategoryTitle(category: RecommendationDto): string {
    const name = category.BaselineItemName;
    switch (category.RecommendationType) {
        case 'SimilarToRecentlyPlayed':
        case 'SimilarToLikedItem':
            return name ? 'Because you watched ' + name : 'Because you watched';
        case 'HasDirectorFromRecentlyPlayed':
        case 'HasLikedDirector':
            return name ? 'Directed by ' + name : 'From directors you like';
        case 'HasActorFromRecentlyPlayed':
        case 'HasLikedActor':
            return name ? 'Starring ' + name : 'With actors you like';
        default:
            return 'Recommended for you';
    }
}

/* Jellyfin's native movie recommendation engine ("Because you watched X", director/
 * actor based picks). It only covers movie libraries — series have no native recs,
 * so they are surfaced through the genre rows instead. Fails closed: if there is no
 * movie library or the call errors, no rows are added. */
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
            ItemLimit: 20
        });
    } catch {
        return;
    }

    for (const category of categories || []) {
        const items = category.Items || [];
        if (!items.length) continue;
        appendCardRow(elem, {
            title: getCategoryTitle(category),
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
}
