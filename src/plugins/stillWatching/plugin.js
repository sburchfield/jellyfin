import confirm from 'components/confirm/confirm';
import inputManager from 'scripts/inputManager';
import { PluginType } from 'types/plugin.ts';

/* Netflix/Hulu-style "Are you still watching?" prompt.
 * Backported to the 10.11 PreplayIntercept plugin API: the player runs intercept()
 * before every item (including auto-advance to the next episode). Resolving lets
 * playback continue; rejecting stops it. */

// Prompt once this many episodes have auto-played in a sitting...
const EPISODE_COUNT = 3;
// ...or once the user has been idle (no input) for this long (likely asleep).
const IDLE_MS = 90 * 60 * 1000;

class StillWatching {
    constructor() {
        this.name = 'Still Watching';
        this.type = PluginType.PreplayIntercept;
        this.id = 'stillwatching';
        this.order = 10; // run after playback access validation (order -2)

        this.playedItems = new Set();
        this.sessionStart = Date.now();
    }

    resetSession() {
        this.sessionStart = Date.now();
        this.playedItems.clear();
    }

    intercept(options) {
        const item = options.item;

        // A brand new play session resets the counter.
        if (options.isFirstItem) {
            this.resetSession();
        }

        // Only gate TV episodes; movies/music/etc. play through untouched.
        if (!item || item.Type !== 'Episode' || !item.Id) {
            return Promise.resolve();
        }

        const idleTime = (typeof inputManager.idleTime === 'function') ? inputManager.idleTime() : 0;
        const shouldPrompt = this.playedItems.size >= EPISODE_COUNT || idleTime >= IDLE_MS;

        if (shouldPrompt) {
            return confirm({
                title: 'Are you still watching?',
                text: 'You’ve been watching for a while — continue playing?',
                cancelText: 'Stop',
                confirmText: 'Continue Watching'
            }).then(() => {
                // Confirmed: clear the count and keep going.
                this.resetSession();
                this.playedItems.add(item.Id);
            });
            // Cancelled: confirm() rejects, the intercept rejects, and playback stops.
        }

        this.playedItems.add(item.Id);
        return Promise.resolve();
    }
}

export default StillWatching;
