import escapeHtml from 'escape-html';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto';
import type { BaseItemDtoQueryResult } from '@jellyfin/sdk/lib/generated-client/models/base-item-dto-query-result';

import layoutManager from 'components/layoutManager';

import type { SectionContainerElement, SectionOptions } from './section';

export interface CardRowConfig {
    title: string;
    href?: string;
    dataMonitor?: string;
    dataRefreshInterval?: number;
    fetchData: () => Promise<BaseItemDtoQueryResult | BaseItemDto[]>;
    getItemsHtml: (items: BaseItemDto[]) => string;
}

/* Build a horizontal card row that matches the native home sections and append it
 * to `parent`. The row starts hidden; the shared resume() sweep calls fetchData and
 * unhides it only if items come back (see emby-itemscontainer onDataFetched). This
 * is the same wiring loadRecentlyAdded uses, factored out so genre and
 * recommendation rows stay consistent with the stock rows. */
export function appendCardRow(parent: HTMLElement, config: CardRowConfig, options: SectionOptions): void {
    const section = document.createElement('div');
    section.classList.add('verticalSection');
    section.classList.add('hide');

    let html = '<div class="sectionTitleContainer sectionTitleContainer-cards padded-left">';
    const dataMonitor = config.dataMonitor ? ` data-monitor="${escapeHtml(config.dataMonitor)}"` : '';
    const dataRefreshInterval = config.dataRefreshInterval ? ` data-refreshinterval="${config.dataRefreshInterval}"` : '';
    if (config.href && !layoutManager.tv) {
        html += '<a is="emby-linkbutton" href="' + config.href + '" class="more button-flat button-flat-mini sectionTitleTextButton">';
        html += '<h2 class="sectionTitle sectionTitle-cards">' + escapeHtml(config.title) + '</h2>';
        html += '<span class="material-icons chevron_right" aria-hidden="true"></span>';
        html += '</a>';
    } else {
        html += '<h2 class="sectionTitle sectionTitle-cards">' + escapeHtml(config.title) + '</h2>';
    }
    html += '</div>';

    if (options.enableOverflow) {
        html += '<div is="emby-scroller" class="padded-top-focusscale padded-bottom-focusscale" data-centerfocus="true">';
        html += '<div is="emby-itemscontainer" class="itemsContainer scrollSlider focuscontainer-x"' + dataMonitor + dataRefreshInterval + '>';
        html += '</div>';
        html += '</div>';
    } else {
        html += '<div is="emby-itemscontainer" class="itemsContainer focuscontainer-x padded-left padded-right vertical-wrap"' + dataMonitor + dataRefreshInterval + '></div>';
    }

    section.innerHTML = html;
    parent.appendChild(section);

    const itemsContainer = section.querySelector('.itemsContainer') as SectionContainerElement | null;
    if (!itemsContainer) return;
    itemsContainer.fetchData = config.fetchData;
    itemsContainer.getItemsHtml = config.getItemsHtml;
    itemsContainer.parentContainer = section;
}
