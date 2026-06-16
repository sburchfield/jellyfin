import { ServerConnections } from 'lib/jellyfin-apiclient';

import { playbackManager } from './playback/playbackmanager';
import toast from './toast/toast';

/* "Shuffle Block": programme a collection like a TV network block.
 * Episodes play IN ORDER within each show, in blocks of BLOCK_SIZE, with shows
 * chosen in random order (never the same show twice in a row when avoidable).
 *
 * The queue is built from full item objects and handed to playbackManager.play()
 * as `items` rather than `ids`. The `ids` path routes through getItemsForPlayback(),
 * which caps the queue at 300 items (query.Limit ||= 300) — that silently dropped
 * episodes from large blocks (a few long series easily exceed 300). Passing `items`
 * skips that fetch entirely, so there is no cap, no URL-length splitting, and no
 * re-sort: our exact block order is preserved. */
const BLOCK_SIZE = 4;

export async function playShuffledBlock(item) {
    const apiClient = ServerConnections.getApiClient(item.ServerId);
    const userId = apiClient.getCurrentUserId();

    // Direct members of the collection (series, movies, folders).
    const members = (await apiClient.getItems(userId, {
        ParentId: item.Id,
        Recursive: false
    })).Items || [];

    // Build an in-order episode list per show.
    const shows = [];
    for (const member of members) {
        if (member.Type === 'Series' || member.IsFolder) {
            const eps = (await apiClient.getItems(userId, {
                ParentId: member.Id,
                IncludeItemTypes: 'Episode',
                Recursive: true,
                SortBy: 'ParentIndexNumber,IndexNumber',
                SortOrder: 'Ascending',
                // Match the fields the player's own id-fetch requests so chapters
                // and trickplay scrubbing keep working for queued episodes.
                Fields: 'Chapters,Trickplay'
            })).Items || [];
            if (eps.length) shows.push({ items: eps, pos: 0 });
        } else if (member.MediaType === 'Video' || member.Type === 'Movie') {
            shows.push({ items: [member], pos: 0 });
        }
    }

    // Programme blocks: each turn, take the next BLOCK_SIZE in-order episodes from a
    // randomly chosen show (avoiding an immediate repeat), until every show is exhausted.
    const queue = [];
    let lastShow = null;
    let remaining = shows.filter(s => s.pos < s.items.length);
    while (remaining.length) {
        let pool = remaining;
        if (lastShow && remaining.length > 1) {
            pool = remaining.filter(s => s !== lastShow);
        }
        const show = pool[Math.floor(Math.random() * pool.length)];
        const end = Math.min(show.pos + BLOCK_SIZE, show.items.length);
        for (let i = show.pos; i < end; i++) {
            queue.push(show.items[i]);
        }
        show.pos = end;
        lastShow = show;
        remaining = shows.filter(s => s.pos < s.items.length);
    }

    if (!queue.length) {
        toast('No episodes found in this block');
        return;
    }

    // Pass full items (not ids) so the 300-item cap in getItemsForPlayback never applies.
    return playbackManager.play({ items: queue, serverId: item.ServerId });
}

export default { playShuffledBlock };
