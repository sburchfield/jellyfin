import escapeHtml from 'escape-html';

import { appRouter } from 'components/router/appRouter';
import { playbackManager } from 'components/playback/playbackmanager';

import './billboard.scss';

function getBackdropUrl(apiClient, item) {
    if (item.BackdropImageTags && item.BackdropImageTags.length) {
        return apiClient.getScaledImageUrl(item.Id, {
            type: 'Backdrop',
            maxWidth: 1920,
            tag: item.BackdropImageTags[0]
        });
    }
    return null;
}

function getLogoUrl(apiClient, item) {
    if (item.ImageTags && item.ImageTags.Logo) {
        return apiClient.getScaledImageUrl(item.Id, {
            type: 'Logo',
            maxWidth: 600,
            tag: item.ImageTags.Logo
        });
    }
    return null;
}

function formatRuntime(ticks) {
    if (!ticks) return null;
    const totalMin = Math.round(ticks / 600000000); // 10,000,000 ticks/sec * 60
    if (!totalMin) return null;
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h ? `${h}h ${m}m` : `${m}m`;
}

// Build the year · rating · runtime/seasons meta row from whatever is available.
function buildMetaHtml(item) {
    const pieces = [];

    if (item.ProductionYear) pieces.push(`<span>${item.ProductionYear}</span>`);
    if (item.OfficialRating) pieces.push(`<span class="billboardHero-rating">${escapeHtml(item.OfficialRating)}</span>`);

    if (item.Type === 'Series') {
        if (item.ChildCount) {
            pieces.push(`<span>${item.ChildCount} Season${item.ChildCount > 1 ? 's' : ''}</span>`);
        }
    } else {
        const runtime = formatRuntime(item.RunTimeTicks);
        if (runtime) pieces.push(`<span>${runtime}</span>`);
    }

    if (item.Genres && item.Genres.length) {
        pieces.push(`<span class="billboardHero-genre">${escapeHtml(item.Genres.slice(0, 2).join(', '))}</span>`);
    }

    return pieces.length ? `<div class="billboardHero-meta">${pieces.join('')}</div>` : '';
}

function pickRandom(items) {
    return items[Math.floor(Math.random() * items.length)];
}

// Make the header transparent while at the top of the home billboard, and gain a
// background once scrolled. Uses a dedicated class so it never clashes with the
// detail page's own `semiTransparent` handling.
let headerListenersAttached = false;

function updateBillboardHeader() {
    const skinHeader = document.querySelector('.skinHeader');
    if (!skinHeader) return;

    const hero = document.querySelector('.homePage .billboardHero');
    const onHome = (location.hash || '').indexOf('/home') !== -1;
    const atTop = hero && hero.isConnected && (-hero.getBoundingClientRect().top) <= 60;

    if (onHome && atTop) {
        skinHeader.classList.add('homeBillboardTransparent');
    } else {
        skinHeader.classList.remove('homeBillboardTransparent');
    }
}

function setupBillboardHeader() {
    updateBillboardHeader();
    if (headerListenersAttached) return;
    headerListenersAttached = true;
    // Capture phase so we catch scrolling on whichever element actually scrolls.
    document.addEventListener('scroll', updateBillboardHeader, true);
    window.addEventListener('hashchange', updateBillboardHeader);
    window.addEventListener('resize', updateBillboardHeader);
}

/**
 * Netflix-style "billboard" hero at the top of the home tab. Rotates through a
 * curated pool of the most recently added titles (that have a backdrop), showing
 * the logo/title, year · rating · runtime, a short synopsis, and Play / More Info.
 */
export function loadBillboard(view, apiClient, user) {
    const existing = view.querySelector('.billboardHero');
    if (existing) existing.remove();

    return apiClient.getItems(user.Id, {
        IncludeItemTypes: 'Movie,Series',
        Recursive: true,
        SortBy: 'DateCreated',
        SortOrder: 'Descending',
        Limit: 20,
        ImageTypes: 'Backdrop',
        Fields: 'Overview,Genres,ProductionYear,OfficialRating,RunTimeTicks,ChildCount',
        EnableImageTypes: 'Backdrop,Logo'
    }).then(result => {
        const items = (result.Items || []).filter(i => i.BackdropImageTags && i.BackdropImageTags.length);
        if (!items.length) return;

        // Rotate: a random pick from the recent pool each time Home loads.
        const item = pickRandom(items);

        const backdrop = getBackdropUrl(apiClient, item);
        if (!backdrop) return;

        const logo = getLogoUrl(apiClient, item);
        const titleHtml = logo
            ? `<img class="billboardHero-logo" src="${logo}" alt="${escapeHtml(item.Name)}" />`
            : `<h1 class="billboardHero-title">${escapeHtml(item.Name)}</h1>`;
        const metaHtml = buildMetaHtml(item);
        const overview = item.Overview
            ? `<p class="billboardHero-overview">${escapeHtml(item.Overview)}</p>`
            : '';

        const hero = document.createElement('div');
        hero.className = 'billboardHero';
        hero.style.backgroundImage = `url('${backdrop}')`;
        hero.innerHTML = `
            <div class="billboardHero-shade"></div>
            <div class="billboardHero-content">
                ${titleHtml}
                ${metaHtml}
                ${overview}
                <div class="billboardHero-buttons">
                    <button type="button" class="billboardHero-btn billboardHero-play"><span class="material-icons" aria-hidden="true">play_arrow</span><span>Play</span></button>
                    <button type="button" class="billboardHero-btn billboardHero-info"><span class="material-icons" aria-hidden="true">info</span><span>More Info</span></button>
                </div>
            </div>`;

        const sections = view.querySelector('.sections');
        sections.parentNode.insertBefore(hero, sections);

        hero.querySelector('.billboardHero-play').addEventListener('click', () => {
            playbackManager.play({ items: [item] }).catch(err => console.error('[billboard] play failed', err));
        });
        hero.querySelector('.billboardHero-info').addEventListener('click', () => {
            appRouter.showItem(item);
        });

        // Full-bleed: pull the home content up so the billboard sits behind the
        // (now transparent-at-top) header.
        const pageEl = view.closest('.page');
        if (pageEl) pageEl.classList.add('homeHasBillboard');
        setupBillboardHeader();
    }).catch(err => {
        console.error('[billboard] failed to load', err);
    });
}

export default { loadBillboard };
