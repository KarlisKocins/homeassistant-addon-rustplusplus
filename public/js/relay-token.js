/*
    Rust+ relay token panel (Settings view).

    Lists the registered Steam accounts with the state of their Rust+ auth token, links to the
    Facepunch login where a token comes from, lets the user paste one, and offers a per-account
    userscript that saves the token automatically after every login. The token is write-only: the server never sends it back. The page is
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

async function downloadUserscript(guildId, steamId, baseUrl) {
    const response = await fetch(url(`/api/credentials/${encodeURIComponent(guildId)}/${encodeURIComponent(steamId)}/userscript`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl })
    });
    if (response.status === 401) {
        window.location.href = 'login.html';
        throw new Error('Authentication required');
    }
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || response.statusText);

    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([body.script], { type: 'text/javascript' }));
    link.download = body.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
}

function buildAccount(guildId, account, refresh, webuiPort) {
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

    /* Automatic saving: a userscript with this account's push key. It talks to the add-on's own
       port directly, since the Facepunch page cannot reach Home Assistant ingress. */
    const auto = element('details', 'relay-token-auto');
    auto.append(element('summary', null, account.autoPush ? 'Automatic saving (installed)' : 'Automatic saving'));
    auto.append(element('p', 'relay-token-help',
        'Install Tampermonkey or Violentmonkey, then download and open this script. After that, logging in ' +
        'at the link above saves the token here by itself. Downloading a new script replaces the old one.'));
    const address = element('input', 'relay-token-input');
    address.type = 'url';
    address.value = `http://${location.hostname}:${webuiPort}`;
    address.setAttribute('aria-label', 'Address of Rust++ as reachable from your browser');
    const download = element('button', 'relay-token-save', 'Download userscript');
    download.type = 'button';
    const autoMessage = element('div', 'relay-token-message');
    autoMessage.setAttribute('role', 'status');
    download.addEventListener('click', async () => {
        download.disabled = true;
        autoMessage.className = 'relay-token-message';
        autoMessage.textContent = '';
        try {
            await downloadUserscript(guildId, account.steamId, address.value);
            autoMessage.textContent = 'Downloaded. Open the file with your userscript manager to install it.';
            await refresh();
        }
        catch (error) {
            autoMessage.className = 'relay-token-message relay-token-problem';
            autoMessage.textContent = error.message;
        }
        finally {
            download.disabled = false;
        }
    });
    auto.append(address, download, autoMessage);

    row.append(head, input, button, message, auto);
    return row;
}

async function render(panel) {
    const response = await fetch(url('/api/credentials'));
    if (response.status === 401) return;
    if (!response.ok) throw new Error(response.statusText);
    const data = await response.json();
    const guilds = data.guilds;

    /* Do not redraw while the user is typing a token. */
    if (panel.contains(document.activeElement) && document.activeElement.tagName === 'INPUT') return;
    if (panel.querySelector('details[open]')) return;

    const login = panel.querySelector('.relay-token-login');
    login.href = data.loginUrl;

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
            section.append(buildAccount(guild.guildId, account, () => render(panel), data.webuiPort));
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
