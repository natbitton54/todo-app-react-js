/* ------------------------------------------------------------------
   Google Calendar helper – GIS + gapi wrapper  (session-scoped token)
------------------------------------------------------------------- */

let tokenClient = null;           // GIS token client
let gapiInited = false;          // has gapi.client been loaded?
let refreshTimer = null;           // setTimeout handle

const SCOPES = "https://www.googleapis.com/auth/calendar.events";
const DISCOVERY_DOC = "https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest";
const TOKEN_KEY = "gcal_token_v1";            // sessionStorage slot

/* ───────── token persist / restore – session-scoped ────────────── */
const store = sessionStorage;

function saveToken(tok = {}) {
    if (!tok.access_token) return;
    const expires_at = Date.now() + (tok.expires_in ?? 3600) * 1000;
    store.setItem(TOKEN_KEY, JSON.stringify({ ...tok, expires_at }));
}

function loadToken() {
    try {
        const raw = store.getItem(TOKEN_KEY);
        if (!raw) return null;
        const tok = JSON.parse(raw);
        if (tok.expires_at - Date.now() > 15_000) return tok;   // ≥15 s left
    } catch (_) { }
    return null;
}

export function clearSavedToken() {
    store.removeItem(TOKEN_KEY);
}

/* ───────────────────── gapi bootstrap ──────────────────────────── */
async function initGapi() {
    if (gapiInited) return;
    if (!window.gapi) {
        throw new Error('Missing <script src="https://apis.google.com/js/api.js">');
    }

    await new Promise((resolve, reject) => {
        window.gapi.load("client", async () => {
            try {
                await window.gapi.client.init({
                    apiKey: process.env.REACT_APP_GAPI_KEY,
                    discoveryDocs: [DISCOVERY_DOC],
                });

                const cached = loadToken();
                if (cached) {
                    window.gapi.client.setToken(cached);
                    scheduleRefresh((cached.expires_at - Date.now()) / 1000);
                }

                gapiInited = true;
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    });
}

/* ───────────────────── GIS token client ────────────────────────── */
function initTokenClient() {
    if (tokenClient) return;
    if (!window.google?.accounts?.oauth2) {
        throw new Error(
            'Missing <script src="https://accounts.google.com/gsi/client" defer>'
        );
    }

    tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: process.env.REACT_APP_GAPI_CLIENT_ID,
        scope: SCOPES,
        callback: () => { }, // replaced in ensureToken()
    });
}

/* ─────────────── silent auto-refresh timer ─────────────────────── */
function scheduleRefresh(seconds) {
    clearTimeout(refreshTimer);
    const ms = Math.max(30, seconds - 120) * 1000; // refresh 2 min early
    refreshTimer = setTimeout(() => {
        ensureToken({ interactive: false }).catch(() => {/* ignore */ });
    }, ms);
}

/* ────────────────── main token guarantee helper ────────────────── */
export async function ensureToken({ interactive = false } = {}) {
    await initGapi();
    initTokenClient();

    const cached = window?.gapi?.client?.getToken?.();
    const hasScope = cached?.scope?.split(" ").includes(SCOPES);

    /* A. memory token still valid? */
    if (cached?.access_token && hasScope) {
        if (cached.expires_in) scheduleRefresh(cached.expires_in);
        return cached;
    }

    /* B. fetch new token */
    return new Promise((resolve, reject) => {
        tokenClient.callback = (resp) => {
            if (resp.error) {
                clearSavedToken();
                return reject(resp);
            }
            saveToken(resp);
            if (resp.expires_in) scheduleRefresh(resp.expires_in);
            resolve(resp);
        };

        tokenClient.requestAccessToken({
            prompt: interactive ? "consent" : "",   // silent if !interactive
        });

        if (interactive) {
            setTimeout(() => {
                const tok = window?.gapi?.client?.getToken?.();
                if (!tok?.access_token) reject(new Error("popup_blocked"));
            }, 2000);
        }
    });
}

/* ─────────────── helpers & validators ────────────── */
const VALID_ID = /^[a-v0-9]{5,1024}$/;
const toValidId = (v = "") =>
    v.toString().toLowerCase().replace(/[^a-v0-9]/g, "").slice(0, 1024);

/* ───────────────────────── Public API ──────────────────────────── */
export async function connectGoogleCalendar({ interactive = true } = {}) {
    await ensureToken({ interactive });
}

export async function addEventToGoogleCalendar({
    eventId = "",
    title,
    description,
    date,
    time,
    minutesBefore = 10,
    durationMinutes = 0,
}) {
    await ensureToken({ interactive: false }).catch(() =>
        ensureToken({ interactive: true })
    );

    const padTime = time.length === 5 ? `${time}:00` : time;
    const start = new Date(`${date}T${padTime}`);
    if (isNaN(start)) throw new Error("Invalid date/time");

    const end = new Date(start.getTime() + Math.max(1, durationMinutes) * 60000);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const body = {
        summary: title,
        description,
        start: { dateTime: start.toISOString(), timeZone: tz },
        end: { dateTime: end.toISOString(), timeZone: tz },
        reminders: {
            useDefault: false,
            overrides: [{ method: "popup", minutes: minutesBefore }],
        },
    };

    const id = toValidId(eventId);

    try {
        if (VALID_ID.test(id)) {
            await window.gapi.client.calendar.events.patch({
                calendarId: "primary",
                eventId: id,
                resource: body,
            });
            return id;
        }
    } catch (err) {
        if (err.status !== 404) {
            console.error("gCal patch failed:", err);
            return null;
        }
    }

    try {
        const res = await window.gapi.client.calendar.events.insert({
            calendarId: "primary",
            resource: VALID_ID.test(id) ? { ...body, id } : body,
        });
        return res?.result?.id || null;
    } catch (err) {
        console.error("gCal insert failed:", err);
        return null;
    }
}

export async function deleteCalendarEvent(eventId) {
    if (!eventId) return;
    await ensureToken({ interactive: false }).catch(() =>
        ensureToken({ interactive: true })
    );
    return window.gapi.client.calendar.events.delete({
        calendarId: "primary",
        eventId,
    });
}

export function calendarScopeGranted() {
    const tok = window?.gapi?.client?.getToken?.() || loadToken();
    return !!tok?.scope && tok.scope.split(" ").includes(SCOPES);
}
