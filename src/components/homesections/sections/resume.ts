import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto';
import type { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models/base-item-kind';
import type { ApiClient } from 'jellyfin-apiclient';

import cardBuilder from 'components/cardbuilder/cardBuilder';
import globalize from 'lib/globalize';
import { ServerConnections } from 'lib/jellyfin-apiclient';
import type { UserSettings } from 'scripts/settings/userSettings';
import { getBackdropShape, getPortraitShape } from 'utils/card';

import type { SectionContainerElement, SectionOptions } from './section';

const dataMonitorHints: Record<string, string> = {
    Audio: 'audioplayback,markplayed',
    Video: 'videoplayback,markplayed'
};

function getItemsToResumeFn(
    mediaType: BaseItemKind,
    serverId: string,
    { enableOverflow }: SectionOptions
) {
    return function () {
        const apiClient = ServerConnections.getApiClient(serverId);

        const limit = enableOverflow ? 12 : 5;

        const options = {
            Limit: limit,
            Recursive: true,
            Fields: 'PrimaryImageAspectRatio',
            ImageTypeLimit: 1,
            EnableImageTypes: 'Primary,Backdrop,Thumb',
            EnableTotalRecordCount: false,
            MediaTypes: mediaType
        };

        return apiClient.getResumableItems(apiClient.getCurrentUserId(), options);
    };
}

function mergeContinueWatchingItems(
    resumableItems: BaseItemDto[],
    nextUpItems: BaseItemDto[],
    limit: number
): BaseItemDto[] {
    const items: BaseItemDto[] = [];
    const seen = new Set<string>();
    const maxLength = Math.max(resumableItems.length, nextUpItems.length);

    for (let index = 0; index < maxLength && items.length < limit; index++) {
        for (const item of [resumableItems[index], nextUpItems[index]]) {
            if (!item?.Id || seen.has(item.Id)) continue;

            seen.add(item.Id);
            items.push(item);
            if (items.length >= limit) break;
        }
    }

    return items;
}

function getItemsToContinueWatchingFn(
    serverId: string,
    userSettings: UserSettings,
    { enableOverflow }: SectionOptions
) {
    return async function () {
        const apiClient = ServerConnections.getApiClient(serverId);
        const userId = apiClient.getCurrentUserId();
        const limit = enableOverflow ? 12 : 5;
        const oldestDateForNextUp = new Date();
        oldestDateForNextUp.setDate(oldestDateForNextUp.getDate() - userSettings.maxDaysForNextUp());

        const [resumableResult, nextUpResult] = await Promise.all([
            apiClient.getResumableItems(userId, {
                Limit: limit,
                Recursive: true,
                Fields: 'PrimaryImageAspectRatio',
                ImageTypeLimit: 1,
                EnableImageTypes: 'Primary,Backdrop,Thumb',
                EnableTotalRecordCount: false,
                MediaTypes: 'Video'
            }),
            apiClient.getNextUpEpisodes({
                Limit: limit,
                Fields: 'PrimaryImageAspectRatio',
                UserId: userId,
                ImageTypeLimit: 1,
                EnableImageTypes: 'Primary,Backdrop,Thumb',
                EnableTotalRecordCount: false,
                DisableFirstEpisode: false,
                NextUpDateCutoff: oldestDateForNextUp.toISOString(),
                EnableResumable: false,
                EnableRewatching: userSettings.enableRewatchingInNextUp()
            })
        ]);

        return mergeContinueWatchingItems(resumableResult.Items || [], nextUpResult.Items || [], limit);
    };
}

function getItemsToResumeHtmlFn(
    useEpisodeImages: boolean,
    mediaType: BaseItemKind,
    { enableOverflow }: SectionOptions
) {
    return function (items: BaseItemDto[]) {
        const cardLayout = false;
        return cardBuilder.getCardsHtml({
            items: items,
            preferThumb: true,
            inheritThumb: !useEpisodeImages,
            shape: (mediaType === 'Book') ?
                getPortraitShape(enableOverflow) :
                getBackdropShape(enableOverflow),
            overlayText: false,
            showTitle: true,
            showParentTitle: true,
            lazy: true,
            showDetailsMenu: true,
            overlayPlayButton: true,
            context: 'home',
            centerText: !cardLayout,
            allowBottomPadding: false,
            cardLayout: cardLayout,
            showYear: true,
            lines: 2
        });
    };
}

export function loadResume(
    elem: HTMLElement,
    apiClient: ApiClient,
    titleLabel: string,
    mediaType: BaseItemKind,
    userSettings: UserSettings,
    options: SectionOptions
) {
    let html = '';

    const dataMonitor = dataMonitorHints[mediaType] ?? 'markplayed';

    html += '<h2 class="sectionTitle sectionTitle-cards padded-left">' + globalize.translate(titleLabel) + '</h2>';
    if (options.enableOverflow) {
        html += '<div is="emby-scroller" class="padded-top-focusscale padded-bottom-focusscale" data-centerfocus="true">';
        html += `<div is="emby-itemscontainer" class="itemsContainer scrollSlider focuscontainer-x" data-monitor="${dataMonitor}">`;
    } else {
        html += `<div is="emby-itemscontainer" class="itemsContainer padded-left padded-right vertical-wrap focuscontainer-x" data-monitor="${dataMonitor}">`;
    }

    if (options.enableOverflow) {
        html += '</div>';
    }
    html += '</div>';

    elem.classList.add('hide');
    elem.innerHTML = html;

    const itemsContainer: SectionContainerElement | null = elem.querySelector('.itemsContainer');
    if (!itemsContainer) return;
    itemsContainer.fetchData = mediaType === 'Video' ?
        getItemsToContinueWatchingFn(apiClient.serverId(), userSettings, options) :
        getItemsToResumeFn(mediaType, apiClient.serverId(), options);
    itemsContainer.getItemsHtml = getItemsToResumeHtmlFn(userSettings.useEpisodeImagesInNextUpAndResume(), mediaType, options);
    itemsContainer.parentContainer = elem;
}
