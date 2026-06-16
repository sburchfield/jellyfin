import type { ApiClient } from 'jellyfin-apiclient';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto';
import type { UserDto } from '@jellyfin/sdk/lib/generated-client/models/user-dto';

import cardBuilder from 'components/cardbuilder/cardBuilder';
import { appRouter } from 'components/router/appRouter';
import { ServerConnections } from 'lib/jellyfin-apiclient';
import { getPortraitShape } from 'utils/card';

import { appendCardRow } from './cardRow';
import type { SectionOptions } from './section';

const GENRE_ROW_COUNT = 8;
const ITEMS_PER_ROW = 20;

function shuffle<T>(items: T[]): T[] {
    const result = items.slice();
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = result[i];
        result[i] = result[j];
        result[j] = tmp;
    }
    return result;
}

/* "Surf by genre": a rotating handful of genres (shuffled each visit, items within
 * each row randomised) so the home page feels fresh like Netflix discovery rather
 * than a fixed alphabetical list. The row header links to the full genre page. */
export async function loadGenreRows(
    elem: HTMLElement,
    apiClient: ApiClient,
    user: UserDto,
    options: SectionOptions
): Promise<void> {
    const userId = user.Id || apiClient.getCurrentUserId();

    const genresResult = await apiClient.getGenres(userId, {
        IncludeItemTypes: 'Movie,Series',
        Recursive: true,
        EnableTotalRecordCount: false,
        SortBy: 'SortName'
    });
    const genres: BaseItemDto[] = genresResult.Items || [];
    if (!genres.length) return;

    for (const genre of shuffle(genres).slice(0, GENRE_ROW_COUNT)) {
        const genreId = genre.Id;
        appendCardRow(elem, {
            title: genre.Name || '',
            href: appRouter.getRouteUrl(genre),
            fetchData: function () {
                return ServerConnections.getApiClient(apiClient.serverId()).getItems(userId, {
                    GenreIds: genreId,
                    IncludeItemTypes: 'Movie,Series',
                    Recursive: true,
                    SortBy: 'Random',
                    Limit: ITEMS_PER_ROW,
                    Fields: 'PrimaryImageAspectRatio',
                    ImageTypeLimit: 1,
                    EnableImageTypes: 'Primary,Backdrop,Thumb'
                });
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
}
