import { ServerConnections } from 'lib/jellyfin-apiclient';

import { playbackManager } from './playback/playbackmanager';
import toast from './toast/toast';

/* "Shuffle Block": programme a collection like a TV network block.
 * Episodes play IN ORDER within each show, in blocks of BLOCK_SIZE, with shows
 * chosen in random order (never the same show twice in a row when avoidable). */
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
                SortOrder: 'Ascending'
            })).Items || [];
            if (eps.length) shows.push({ ids: eps.map(e => e.Id), pos: 0 });
        } else if (member.MediaType === 'Video' || member.Type === 'Movie') {
            shows.push({ ids: [member.Id], pos: 0 });
        }
    }

    // Programme blocks: each turn, take the next BLOCK_SIZE in-order episodes from a
    // randomly chosen show (avoiding an immediate repeat), until every show is exhausted.
    const queue = [];
    let lastShow = null;
    let remaining = shows.filter(s => s.pos < s.ids.length);
    while (remaining.length) {
        let pool = remaining;
        if (lastShow && remaining.length > 1) {
            pool = remaining.filter(s => s !== lastShow);
        }
        const show = pool[Math.floor(Math.random() * pool.length)];
        const end = Math.min(show.pos + BLOCK_SIZE, show.ids.length);
        for (let i = show.pos; i < end; i++) {
            queue.push(show.ids[i]);
        }
        show.pos = end;
        lastShow = show;
        remaining = shows.filter(s => s.pos < s.ids.length);
    }

    if (!queue.length) {
        toast('No episodes found in this block');
        return;
    }

    return playbackManager.play({ ids: queue, serverId: item.ServerId });
}

export default { playShuffledBlock };
