/*
    Rust+ relay token panel (Settings view).

    Lists the registered Steam accounts with the state of their Rust+ auth token and lets the
    user paste a new one. The token is write-only: the server never sends it back. The page is
    built with textContent only, never innerHTML, since guild names come from Discord.
*/

const PANEL_ID = 'relayTokenPanel';
const REFRESH_MS = 60_000;

const STATUS_LABELS = {
    ok: 'Valid',
    expiring: 'Expires soon',
    expired: 'Expired',
    missing: 'No token',
    invalid: 'Invalid token',
    rejected: 'Rejected by the relay'
};

function url(path) {
    return (window.RPP_BASE || '') + path;
}

function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function describe(account) {
    const key = account.rejected ? 'rejected' : account.status;
    let text = STATUS_LABELS[key] || key;
    if (account.expiresAt && key !== 'rejected') {
        const date = new Date(account.expiresAt * 1000);
        text += key === 'expired' ? ` on ${date.toLocaleString()}` : ` until ${date.toLocaleString()}`;
    }
    return { text, problem: account.rejected || ['expired', 'missing', 'invalid'].includes(account.status) };
}

async function saveToken(guildId, steamId, token) {
    const response = await fetch(url(`/api/credentials/${encodeURIComponent(guildId)}/${encodeURIComponent(steamId)}/token`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
    });
    if (response.status === 401) {
        window.location.href = 'login.html';
        throw new Error('Authentication required');
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || response.statusText);
    return body;
}

function buildAccount(guildId, account, refresh) {
    const row = element('div', 'relay-token-account');
    const status = describe(account);

    const head = element('div', 'relay-token-head');
    head.append(
        element('span', 'relay-token-steam', account.steamId + (account.hoster ? ' (hoster)' : '')),
        element('span', status.problem ? 'relay-token-state relay-token-problem' : 'relay-token-state', status.text));

    const input = element('input', 'relay-token-input');
    input.type = 'password';
    input.autocomplete = 'off';
    input.placeholder = 'Paste Rust+ auth token';
    input.setAttribute('aria-label', `Rust+ auth token for ${account.steamId}`);

    const button = element('button', 'relay-token-save', 'Save token');
    button.type = 'button';
    const message = element('div', 'relay-token-message');
    message.setAttribute('role', 'status');

    const submit = async () => {
        if (!input.value.trim()) return;
        button.disabled = true;
        message.className = 'relay-token-message';
        message.textContent = 'Saving...';
        try {
            await saveToken(guildId, account.steamId, input.value);
            input.value = '';
            message.textContent = 'Token saved.';
            await refresh();
        }
        catch (error) {
            message.className = 'relay-token-message relay-token-problem';
            message.textContent = error.message;
        }
        finally {
            button.disabled = false;
        }
    };
    button.addEventListener('click', submit);
    input.addEventListener('keydown', (event) => { if (event.key === 'Enter') submit(); });

    row.append(head, input, button, message);
    return row;
}

async function render(panel) {
    const response = await fetch(url('/api/credentials'));
    if (response.status === 401) return;
    if (!response.ok) throw new Error(response.statusText);
    const guilds = await response.json();

    /* Do not redraw while the user is typing a token. */
    if (panel.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;

    const list = panel.querySelector('.relay-token-list');
    list.replaceChildren();

    if (guilds.length === 0) {
        list.append(element('p', 'relay-token-empty', 'No credentials are registered yet.'));
        return;
    }
    for (const guild of guilds) {
        const section = element('div', 'relay-token-guild');
        if (guilds.length > 1) section.append(element('h4', null, guild.guildName));
        for (const account of guild.accounts) {
            section.append(buildAccount(guild.guildId, account, () => render(panel)));
        }
        list.append(section);
    }
}

function init() {
    const panel = document.getElementById(PANEL_ID);
    if (!panel) return;

    const refresh = () => render(panel).catch(() => { /* panel stays as it was */ });
    refresh();
    setInterval(refresh, REFRESH_MS);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
