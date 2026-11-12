/*
    The companion userscript for Tampermonkey / Violentmonkey.

    The Facepunch login page reports a successful Steam login by calling
    window.ReactNativeWebView.postMessage('{"SteamId":...,"Token":...}'), a hook that only exists in
    the Rust+ phone app. The script defines that hook (at document-start, on every page load, so the
    Steam redirect cannot wipe it) and forwards the token to this add-on with GM_xmlhttpRequest,
    which is not subject to CORS or mixed-content rules. If the add-on cannot be reached the token
    is shown on the page so it can still be copied by hand.

    The script is generated per account and contains that account's push key. Treat the file as a
    secret: anyone holding it can store a token for that account until the key is replaced.
*/

const LOGIN_MATCH = 'https://companion-rust.facepunch.com/*';

/* The add-on address as the browser should reach it: scheme + host + port, nothing else. Returns
   null for anything that is not a plain http(s) address. */
function normaliseBaseUrl(value) {
    try {
        const url = new URL(`${value}`.trim());
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
        if (url.username || url.password) return null;
        return url.origin;
    }
    catch (e) {
        return null;
    }
}

function buildUserscript({ baseUrl, key, steamId }) {
    const origin = normaliseBaseUrl(baseUrl);
    if (!origin) throw new Error('Invalid WebUI address');
    const host = new URL(origin).hostname;

    return `// ==UserScript==
// @name         Rust++ Rust+ token (${steamId})
// @namespace    rustplusplus
// @description  Sends your Rust+ auth token to Rust++ when you log in, so it never has to be pasted.
// @match        ${LOGIN_MATCH}
// @run-at       document-start
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      ${host}
// ==/UserScript==

(function () {
    'use strict';

    const PUSH_URL = ${JSON.stringify(origin + '/api/relay-token/push')};
    const KEY = ${JSON.stringify(key)};
    const page = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    function banner(text, token, failed) {
        const draw = () => {
            let box = document.getElementById('rustplusplus-token-banner');
            if (!box) {
                box = document.createElement('div');
                box.id = 'rustplusplus-token-banner';
                box.style.cssText = 'position:fixed;z-index:2147483647;top:12px;right:12px;max-width:340px;' +
                    'padding:12px 14px;border-radius:8px;font:14px/1.4 sans-serif;color:#fff;' +
                    'box-shadow:0 4px 16px rgba(0,0,0,.5)';
                document.body.appendChild(box);
            }
            box.style.background = failed ? '#9b2c2c' : '#276749';
            box.replaceChildren();
            box.appendChild(document.createTextNode(text));
            if (failed && token) {
                const field = document.createElement('input');
                field.readOnly = true;
                field.value = token;
                field.style.cssText = 'display:block;width:100%;margin-top:8px;box-sizing:border-box';
                field.addEventListener('focus', () => field.select());
                box.appendChild(field);
            }
        };
        if (document.body) draw();
        else document.addEventListener('DOMContentLoaded', draw);
    }

    function send(token) {
        banner('Sending your Rust+ token to Rust++...', null, false);
        GM_xmlhttpRequest({
            method: 'POST',
            url: PUSH_URL,
            headers: { 'Content-Type': 'application/json' },
            data: JSON.stringify({ key: KEY, token: token }),
            timeout: 15000,
            onload: (response) => {
                let reply = {};
                try { reply = JSON.parse(response.responseText); } catch (e) { /* not JSON */ }
                if (response.status === 200) banner('Rust++ saved your Rust+ token. You can close this tab.', null, false);
                else banner('Rust++ refused the token: ' + (reply.error || response.status) + ' Copy it manually:', token, true);
            },
            onerror: () => banner('Could not reach Rust++. Copy the token manually:', token, true),
            ontimeout: () => banner('Rust++ did not answer. Copy the token manually:', token, true)
        });
    }

    function postMessage(message) {
        let auth = message;
        if (typeof message === 'string') {
            try { auth = JSON.parse(message); } catch (e) { return; }
        }
        const token = auth && (auth.Token || auth.token);
        if (typeof token === 'string' && token.length > 0) send(token);
    }

    try {
        Object.defineProperty(page, 'ReactNativeWebView', {
            value: { postMessage: postMessage },
            configurable: true,
            writable: true
        });
    }
    catch (e) {
        page.ReactNativeWebView = { postMessage: postMessage };
    }
})();
`;
}

module.exports = { buildUserscript, normaliseBaseUrl, LOGIN_MATCH };
