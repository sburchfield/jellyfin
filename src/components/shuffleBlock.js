import { ServerConnections } from 'lib/jellyfin-apiclient';

import { playbackManager } from './playback/playbackmanager';
import toast from './toast/toast';

/* "Shuffle Block": programme a collection like a TV network block.
 * Episodes play IN ORDER within each show, in blocks of BLOCK_SIZE, with shows
 * chosen in random order (never the same show twice in a row when avoidable).
 *
 * Progress-aware: each show starts at its first UNWATCHED episode (Next-Up), so
 * finishing some episodes and restarting the block never replays them. A show that
 * is fully watched restarts from the beginning so it still joins the block.
 *
 * Resume-honoring: the queue mechanism only applies startPositionTicks to the very
 * first item (advanced items get fresh play options with no resume fallback), so we
 * lead the block with the single most-recently-played in-progress episode and pass
 * its resume tick. That one episode resumes exactly where you left off; any other
 * partially-watched episodes deeper in the shuffle restart from their beginning.
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

    // Build an in-order episode list per show, starting at the first unwatched
    // episode. UserData (Played, PlaybackPositionTicks, LastPlayedDate) is returned
    // by default and is what makes the block progress-aware.
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
            if (!eps.length) continue;

            // Next-Up: first episode that is not fully played. If every episode is
            // watched the show is finished, so restart it from the beginning (0).
            let start = eps.findIndex(ep => !(ep.UserData && ep.UserData.Played));
            if (start === -1) start = 0;
            shows.push({ items: eps, pos: start });
        } else if (member.MediaType === 'Video' || member.Type === 'Movie') {
            shows.push({ items: [member], pos: 0 });
        }
    }

    // Resume-honoring: only the queue's first item gets startPositionTicks, so pick
    // the single most-recently-played in-progress episode (not played, has a resume
    // point) to lead the block. Ties broken by LastPlayedDate (ISO strings compare).
    let resumeShow = null;
    let resumeTicks = 0;
    let resumeLastPlayed = '';
    for (const show of shows) {
        const ep = show.items[show.pos];
        const ud = ep && ep.UserData;
        if (ud && !ud.Played && ud.PlaybackPositionTicks > 0) {
            const lastPlayed = ud.LastPlayedDate || '';
            if (!resumeShow || lastPlayed > resumeLastPlayed) {
                resumeShow = show;
                resumeTicks = ud.PlaybackPositionTicks;
                resumeLastPlayed = lastPlayed;
            }
        }
    }

    // Programme blocks: each turn, take the next BLOCK_SIZE in-order episodes from a
    // randomly chosen show (avoiding an immediate repeat), until every show is
    // exhausted. The resume show is forced first so its in-progress episode is the
    // queue head that startPositionTicks applies to.
    const queue = [];
    let lastShow = null;
    let first = true;
    let remaining = shows.filter(s => s.pos < s.items.length);
    while (remaining.length) {
        let show;
        if (first && resumeShow && remaining.includes(resumeShow)) {
            show = resumeShow;
        } else {
            let pool = remaining;
            if (lastShow && remaining.length > 1) {
                pool = remaining.filter(s => s !== lastShow);
            }
            show = pool[Math.floor(Math.random() * pool.length)];
        }
        first = false;

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

    // Pass full items (not ids) so the 300-item cap in getItemsForPlayback never
    // applies. startPositionTicks resumes the lead (in-progress) episode.
    return playbackManager.play({
        items: queue,
        serverId: item.ServerId,
        startPositionTicks: resumeShow ? resumeTicks : undefined
    });
}

export default { playShuffledBlock };
