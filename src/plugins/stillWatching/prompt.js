import dialogHelper from 'components/dialogHelper/dialogHelper';
import layoutManager from 'components/layoutManager';
import 'elements/emby-button/emby-button';
import 'components/formdialog.scss';
import 'styles/flexstyles.scss';
import './prompt.scss';

/* Self-contained "Are you still watching?" prompt.
 *
 * Deliberately does NOT reuse components/confirm + components/dialog. That path
 * dismisses via a browser-history round-trip (history.back()) and waits on a CSS
 * animationend event, both of which are unreliable when the prompt is shown over
 * the fullscreen player during auto-advance: the player owns history navigation,
 * and animationend on the covered dialog can fail to fire, leaving the prompt
 * stuck on screen even though playback resumes.
 *
 * Using dialogHelper directly lets us keep TV-remote focus navigation
 * (focusManager scope) while:
 *   - enableHistory:false   -> dismissal is synchronous, immune to player nav
 *   - exitAnimation:'none'  -> removal never waits on animationend
 *   - autofocusing the safe default (Continue) instead of Stop
 *   - giving both buttons a clear, input-agnostic focus indicator (prompt.scss).
 *
 * Resolves when the user chooses to continue; rejects when they choose to stop
 * (matching the old confirm() contract the plugin relied on).
 */
export default function showStillWatchingPrompt({ title, text, confirmText, cancelText }) {
    const dlg = dialogHelper.createDialog({
        size: layoutManager.tv ? 'fullscreen' : undefined,
        removeOnClose: true,
        scrollY: false,
        enableHistory: false,
        exitAnimation: 'none'
    });

    dlg.classList.add(
        'formDialog',
        'stillWatchingDialog',
        'align-items-center',
        'justify-content-center'
    );

    dlg.innerHTML = `
        <div class="formDialogHeader formDialogHeader-clear justify-content-center">
            <h1 class="formDialogHeaderTitle" style="margin-top:.5em;padding:0 1em;"></h1>
        </div>
        <div class="formDialogContent smoothScrollY">
            <div class="dialogContentInner dialog-content-centered" style="padding:1em 0;text-align:center;">
                <div class="text"></div>
            </div>
        </div>
        <div class="formDialogFooter formDialogFooter-clear formDialogFooter-flex" style="margin:1em">
            <button is="emby-button" type="button" class="btnOption raised formDialogFooterItem formDialogFooterItem-autosize button-submit" data-id="ok" autofocus></button>
            <button is="emby-button" type="button" class="btnOption raised formDialogFooterItem formDialogFooterItem-autosize button-cancel" data-id="cancel"></button>
        </div>`;

    dlg.querySelector('.formDialogHeaderTitle').textContent = title;
    dlg.querySelector('.text').textContent = text;
    dlg.querySelector('[data-id="ok"]').textContent = confirmText;
    dlg.querySelector('[data-id="cancel"]').textContent = cancelText;

    const formDialogContent = dlg.querySelector('.formDialogContent');
    formDialogContent.classList.add('no-grow');
    if (layoutManager.tv) {
        formDialogContent.style['max-width'] = '50%';
        formDialogContent.style['max-height'] = '60%';
    } else {
        formDialogContent.style.maxWidth = '420px';
        dlg.classList.add('dialog-fullscreen-lowres');
    }

    let dialogResult;
    const buttons = dlg.querySelectorAll('.btnOption');
    for (const btn of buttons) {
        btn.addEventListener('click', function () {
            dialogResult = this.getAttribute('data-id');
            dialogHelper.close(dlg);
        });
        // Make focus the single source of truth so the highlight tracks the
        // pointer too (the user moving the mouse onto a button selects it).
        btn.addEventListener('mouseenter', function () {
            this.focus();
        });
    }

    return dialogHelper.open(dlg).then(() => {
        if (dialogResult === 'ok') {
            return Promise.resolve();
        }
        return Promise.reject(new Error('Still Watching prompt dismissed'));
    });
}
