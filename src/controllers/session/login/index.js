import DOMPurify from 'dompurify';
import escapeHtml from 'escape-html';
import markdownIt from 'markdown-it';

import { AppFeature } from 'constants/appFeature';
import { ServerConnections } from 'lib/jellyfin-apiclient';

import { appHost } from '../../../components/apphost';
import appSettings from '../../../scripts/settings/appSettings';
import dom from '../../../utils/dom';
import loading from '../../../components/loading/loading';
import layoutManager from '../../../components/layoutManager';
import libraryMenu from '../../../scripts/libraryMenu';
import browser from '../../../scripts/browser';
import globalize from '../../../lib/globalize';
import '../../../components/cardbuilder/card.scss';
import '../../../elements/emby-checkbox/emby-checkbox';
import Dashboard from '../../../utils/dashboard';
import toast from '../../../components/toast/toast';
import dialogHelper from '../../../components/dialogHelper/dialogHelper';
import baseAlert from '../../../components/alert';

import './login.scss';

const enableFocusTransform = !browser.slow && !browser.edge;

function authenticateUserByName(page, apiClient, url, username, password) {
    loading.show();
    apiClient.authenticateUserByName(username, password).then(function (result) {
        const user = result.User;
        loading.hide();

        onLoginSuccessful(user.Id, result.AccessToken, apiClient, url);
    }, function (response) {
        page.querySelector('#txtManualPassword').value = '';
        loading.hide();

        const UnauthorizedOrForbidden = [401, 403];
        if (UnauthorizedOrForbidden.includes(response.status)) {
            const messageKey = response.status === 401 ? 'MessageInvalidUser' : 'MessageUnauthorizedUser';
            toast(globalize.translate(messageKey));
        } else {
            Dashboard.alert({
                message: globalize.translate('MessageUnableToConnectToServer'),
                title: globalize.translate('HeaderConnectionFailure')
            });
        }
    });
}

function authenticateQuickConnect(apiClient, targetUrl) {
    const url = apiClient.getUrl('/QuickConnect/Initiate');
    apiClient.ajax({ type: 'POST', url }, true).then(res => res.json()).then(function (json) {
        if (!json.Secret || !json.Code) {
            console.error('Malformed quick connect response', json);
            return false;
        }

        baseAlert({
            dialogOptions: {
                id: 'quickConnectAlert'
            },
            title: globalize.translate('QuickConnect'),
            text: globalize.translate('QuickConnectAuthorizeCode', json.Code)
        });

        const connectUrl = apiClient.getUrl('/QuickConnect/Connect?Secret=' + json.Secret);

        const interval = setInterval(function() {
            apiClient.getJSON(connectUrl).then(async function(data) {
                if (!data.Authenticated) {
                    return;
                }

                clearInterval(interval);

                // Close the QuickConnect dialog
                const dlg = document.getElementById('quickConnectAlert');
                if (dlg) {
                    dialogHelper.close(dlg);
                }

                const result = await apiClient.quickConnect(data.Secret);
                onLoginSuccessful(result.User.Id, result.AccessToken, apiClient, targetUrl);
            }, function (e) {
                clearInterval(interval);

                // Close the QuickConnect dialog
                const dlg = document.getElementById('quickConnectAlert');
                if (dlg) {
                    dialogHelper.close(dlg);
                }

                Dashboard.alert({
                    message: globalize.translate('QuickConnectDeactivated'),
                    title: globalize.translate('HeaderError')
                });

                console.error('Unable to login with quick connect', e);
            });
        }, 5000, connectUrl);

        return true;
    }, function(e) {
        Dashboard.alert({
            message: globalize.translate('QuickConnectNotActive'),
            title: globalize.translate('HeaderError')
        });

        console.error('Quick connect error: ', e);
        return false;
    });
}

function onLoginSuccessful(id, accessToken, apiClient, url) {
    Dashboard.onServerChanged(id, accessToken, apiClient);
    Dashboard.navigate(url || 'home');
}

function showManualForm(context, showCancel, focusPassword) {
    context.querySelector('.chkRememberLogin').checked = appSettings.enableAutoLogin();
    context.querySelector('.manualLoginForm').classList.remove('hide');
    context.querySelector('.visualLoginForm').classList.add('hide');
    context.querySelector('.btnManual').classList.add('hide');

    if (focusPassword) {
        context.querySelector('#txtManualPassword').focus();
    } else {
        context.querySelector('#txtManualName').focus();
    }

    if (showCancel) {
        context.querySelector('.btnCancel').classList.remove('hide');
    } else {
        context.querySelector('.btnCancel').classList.add('hide');
    }
}

// Deterministic accent color for a profile (used for the default
// no-photo avatar) so each person gets a stable, distinct tile color.
function profileColor(name) {
    const palette = ['#3fa7c4', '#5b56c4', '#c4543f', '#3fa76b', '#a73f8e', '#c49a3f'];
    let hash = 0;
    for (const ch of (name || '')) {
        hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    }
    return palette[hash % palette.length];
}

function loadUserList(context, apiClient, users) {
    let html = '';

    for (const user of users) {
        // Netflix-style profile tile. The data-* attributes live on the
        // button itself; the click handler reads them from .netflixProfileCard.
        // We intentionally do NOT use the `cardContent` class here (it is
        // position:absolute in card.scss and collapses this layout).
        let cssClass = 'netflixProfileCard';

        if (layoutManager.tv) {
            cssClass += ' show-focus';

            if (enableFocusTransform) {
                cssClass += ' show-animation';
            }
        }

        const name = escapeHtml(user.Name);
        html += `<button type="button" class="${cssClass}" data-haspw="${user.HasPassword}" data-username="${name}" data-userid="${user.Id}">`;
        html += '<div class="netflixProfileAvatar">';

        if (user.PrimaryImageTag) {
            const imgUrl = apiClient.getUserImageUrl(user.Id, {
                width: 300,
                tag: user.PrimaryImageTag,
                type: 'Primary'
            });

            html += '<div class="netflixProfileAvatarImage coveredImage" style="background-image:url(\'' + imgUrl + "');\"></div>";
        } else {
            const initial = escapeHtml((user.Name || '?').trim().charAt(0).toUpperCase() || '?');
            html += `<div class="netflixProfileAvatarImage netflixProfileAvatarDefault" style="background-color:${profileColor(user.Name)};">`;
            html += `<span class="netflixProfileInitial">${initial}</span>`;
            html += '</div>';
        }

        html += '</div>';
        html += '<div class="netflixProfileName">' + name + '</div>';
        html += '</button>';
    }

    context.querySelector('#divUsers').innerHTML = html;
}

export default function (view, params) {
    function getApiClient() {
        const serverId = params.serverid;

        if (serverId) {
            return ServerConnections.getOrCreateApiClient(serverId);
        }

        return ApiClient;
    }

    function getTargetUrl() {
        if (params.url) {
            try {
                return decodeURIComponent(params.url);
            } catch (err) {
                console.warn('[LoginPage] unable to decode url param', params.url, err);
            }
        }

        return '/home';
    }

    function showVisualForm() {
        view.querySelector('.visualLoginForm').classList.remove('hide');
        view.querySelector('.manualLoginForm').classList.add('hide');
        view.querySelector('.btnManual').classList.remove('hide');

        import('../../../components/autoFocuser').then(({ default: autoFocuser }) => {
            autoFocuser.autoFocus(view);
        });
    }

    view.querySelector('#divUsers').addEventListener('click', function (e) {
        const card = dom.parentWithClass(e.target, 'netflixProfileCard');

        if (card) {
            const context = view;
            const id = card.getAttribute('data-userid');
            const name = card.getAttribute('data-username');
            const haspw = card.getAttribute('data-haspw');

            if (id === 'manual') {
                context.querySelector('#txtManualName').value = '';
                showManualForm(context, true);
            } else if (haspw == 'false') {
                authenticateUserByName(context, getApiClient(), getTargetUrl(), name, '');
            } else {
                context.querySelector('#txtManualName').value = name;
                context.querySelector('#txtManualPassword').value = '';
                showManualForm(context, true, true);
            }
        }
    });
    view.querySelector('.manualLoginForm').addEventListener('submit', function (e) {
        appSettings.enableAutoLogin(view.querySelector('.chkRememberLogin').checked);
        authenticateUserByName(view, getApiClient(), getTargetUrl(), view.querySelector('#txtManualName').value, view.querySelector('#txtManualPassword').value);
        e.preventDefault();
        return false;
    });
    view.querySelector('.btnForgotPassword').addEventListener('click', function () {
        Dashboard.navigate('forgotpassword');
    });
    view.querySelector('.btnCancel').addEventListener('click', showVisualForm);
    view.querySelector('.btnQuick').addEventListener('click', function () {
        authenticateQuickConnect(getApiClient(), getTargetUrl());
        return false;
    });
    view.querySelector('.btnManual').addEventListener('click', function () {
        view.querySelector('#txtManualName').value = '';
        showManualForm(view, true);
    });
    view.querySelector('.btnSelectServer').addEventListener('click', function () {
        Dashboard.selectServer();
    });

    view.addEventListener('viewshow', function () {
        loading.show();
        libraryMenu.setTransparentMenu(true);

        if (!appHost.supports(AppFeature.MultiServer)) {
            view.querySelector('.btnSelectServer').classList.add('hide');
        }

        const apiClient = getApiClient();

        apiClient.getQuickConnect('Enabled')
            .then(enabled => {
                if (enabled === true) {
                    view.querySelector('.btnQuick').classList.remove('hide');
                }
            })
            .catch(() => {
                console.debug('Failed to get QuickConnect status');
            });

        apiClient.getPublicUsers().then(function (users) {
            if (users.length) {
                showVisualForm();
                loadUserList(view, apiClient, users);
            } else {
                view.querySelector('#txtManualName').value = '';
                showManualForm(view, false, false);
            }
        }).catch().then(function () {
            loading.hide();
        });
        apiClient.getJSON(apiClient.getUrl('Branding/Configuration')).then(function (options) {
            const loginDisclaimer = view.querySelector('.loginDisclaimer');

            // eslint-disable-next-line sonarjs/disabled-auto-escaping
            loginDisclaimer.innerHTML = DOMPurify.sanitize(markdownIt({ html: true }).render(options.LoginDisclaimer || ''));

            for (const elem of loginDisclaimer.querySelectorAll('a')) {
                elem.rel = 'noopener noreferrer';
                elem.target = '_blank';
                elem.classList.add('button-link');
                elem.setAttribute('is', 'emby-linkbutton');

                if (layoutManager.tv) {
                    // Disable links navigation on TV
                    elem.tabIndex = -1;
                }
            }
        });
    });
    view.addEventListener('viewhide', function () {
        libraryMenu.setTransparentMenu(false);
    });
}

