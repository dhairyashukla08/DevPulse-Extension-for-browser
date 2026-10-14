(() => {
'use strict';

/* =========================================================
   Helpers
   ========================================================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s = '') => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = (u) => (/^https?:\/\//i.test(u) ? u : '#');
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const isTyping = () => /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);

function timeAgo(input) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(input).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.id);
  toast.id = setTimeout(() => t.classList.remove('show'), 2400);
}

function beep() {
  try {
    const ctx = new AudioContext();
    [0, 0.25, 0.5].forEach((delay) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 660; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
      g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + delay + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.2);
      o.start(ctx.currentTime + delay); o.stop(ctx.currentTime + delay + 0.22);
    });
  } catch { /* audio not available */ }
}

const openModal = (id) => $('#' + id).classList.remove('hidden');
const closeModals = () => $$('.overlay').forEach((o) => o.classList.add('hidden'));

/* =========================================================
   State
   ========================================================= */
const DEFAULTS = {
  name: '', ghUser: '', accent: 'crimson',
  rain: true, grain: true, blinds: true, flashlight: false,
  focusMin: 25, breakMin: 5
};
const DEFAULT_LINKS = [
  { n: 'GitHub', u: 'https://github.com' },
  { n: 'Hacker News', u: 'https://news.ycombinator.com' },
  { n: 'DEV', u: 'https://dev.to' },
  { n: 'Stack Overflow', u: 'https://stackoverflow.com' },
  { n: 'localhost:3000', u: 'http://localhost:3000' }
];
let S = { ...DEFAULTS };
let links = [], cases = [], ledger = [], sessions = {};
let hnFeed = 'topstories';

/* =========================================================
   Atmosphere: rain, flashlight, settings application
   ========================================================= */
const Rain = (() => {
  const c = $('#rain'), ctx = c.getContext('2d');
  let drops = [], raf = 0, on = false;
  const spawn = (anywhere) => ({
    x: Math.random() * c.width, y: anywhere ? Math.random() * c.height : -20,
    l: 10 + Math.random() * 18, v: 9 + Math.random() * 9
  });
  const resize = () => {
    c.width = innerWidth; c.height = innerHeight;
    drops = Array.from({ length: Math.floor(innerWidth / 9) }, () => spawn(true));
  };
  const frame = () => {
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.strokeStyle = 'rgba(190,200,215,.2)';
    ctx.beginPath();
    for (const d of drops) {
      ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * 0.18, d.y + d.l);
      d.y += d.v; d.x -= d.v * 0.18;
      if (d.y > c.height) Object.assign(d, spawn(false));
      if (d.x < 0) d.x = c.width;
    }
    ctx.stroke();
    raf = requestAnimationFrame(frame);
  };
  return {
    set(v) {
      on = v; cancelAnimationFrame(raf);
      c.style.display = v ? 'block' : 'none';
      if (v) { resize(); frame(); }
    },
    resize() { if (on) resize(); }
  };
})();
addEventListener('resize', () => Rain.resize());

addEventListener('mousemove', (e) => {
  if (!document.body.classList.contains('flashlight')) return;
  document.documentElement.style.setProperty('--mx', e.clientX + 'px');
  document.documentElement.style.setProperty('--my', e.clientY + 'px');
});

function applySettings() {
  const b = document.body;
  b.dataset.accent = S.accent;
  b.classList.toggle('no-grain', !S.grain);
  b.classList.toggle('no-blinds', !S.blinds);
  b.classList.toggle('flashlight', S.flashlight);
  Rain.set(S.rain);
  updateGreeting();
  Timer.render();
}
const saveSettings = () => Store.set('settings', S);

/* =========================================================
   Clock, greeting, quotes
   ========================================================= */
const QUOTES = [
  'Every bug has an alibi. Find the one that does not hold up.',
  'The logs never lie. The people reading them sometimes do.',
  'It was a clean deploy. Too clean.',
  'In this town everyone has a stack trace and nobody wants to explain it.',
  'She walked in with a merge conflict and a look that said trouble.',
  'Production sleeps at 3 a.m. Detectives do not.',
  'One missing semicolon. That is how a whole city goes dark.',
  'Trust the tests. Doubt the green checkmark.',
  'Coffee black, commits small, secrets in the vault.',
  'Some bugs are just bad luck. The good ones have a motive.'
];
let quoteIdx = Math.floor(Date.now() / 864e5) % QUOTES.length;
function showQuote() { $('#quote').textContent = QUOTES[quoteIdx]; }
$('#quote').addEventListener('click', () => { quoteIdx = (quoteIdx + 1) % QUOTES.length; showQuote(); });

function updateGreeting() {
  const h = new Date().getHours();
  const lead = h < 5 ? 'Still up' : h < 12 ? 'Morning shift' : h < 18 ? 'Afternoon patrol' : 'Night falls';
  $('#greeting').textContent = `${lead}, Detective${S.name ? ' ' + S.name : ''}.`;
}

function tickClock() {
  const now = new Date();
  $('#clock').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  $('#date').textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const start = new Date(now.getFullYear(), 0, 0);
  const doy = Math.floor((now - start) / 864e5);
  $('#case-no').textContent = `${String(doy).padStart(4, '0')}-${String(now.getFullYear()).slice(2)}`;
}

/* =========================================================
   Stakeout timer (survives closing the tab)
   ========================================================= */
const Timer = (() => {
  const C = 326.73;
  let st = { mode: 'focus', running: false, endAt: 0, left: 25 * 60 };
  const dur = (m) => (m === 'focus' ? S.focusMin : S.breakMin) * 60;
  const persist = () => Store.set('timer', st);

  function render() {
    const mm = pad(Math.floor(st.left / 60)), ss = pad(st.left % 60);
    $('#pomo-time').textContent = `${mm}:${ss}`;
    $('#pomo-mode').textContent = st.mode === 'focus' ? 'Focus' : 'Break';
    $('#pomo-toggle').textContent = st.running ? 'Pause' : 'Start';
    $('.stakeout').classList.toggle('on-break', st.mode === 'break');
    $('#ring').style.strokeDashoffset = C * (1 - st.left / dur(st.mode));
    const n = sessions[dayKey()] || 0;
    $('#pomo-count').textContent = `${n} focus session${n === 1 ? '' : 's'} today`;
    document.title = st.running ? `${mm}:${ss} - DevPulse` : 'DevPulse';
  }

  function complete(silent) {
    st.running = false;
    if (st.mode === 'focus') {
      sessions[dayKey()] = (sessions[dayKey()] || 0) + 1;
      Store.set('sessions', sessions);
      renderLedger();
    }
    st.mode = st.mode === 'focus' ? 'break' : 'focus';
    st.left = dur(st.mode);
    persist(); render();
    if (!silent) { beep(); toast(st.mode === 'break' ? 'Focus session complete. Take a break.' : 'Break over. Back to work.'); }
  }

  function tick() {
    if (!st.running) return;
    st.left = Math.max(0, Math.round((st.endAt - Date.now()) / 1000));
    if (st.left === 0) complete(); else render();
  }

  return {
    async load() {
      const saved = await Store.get('timer');
      if (saved) st = saved;
      if (st.running && Date.now() >= st.endAt) complete(true);
      else if (!st.running && !saved) st.left = dur('focus');
      else tick();
      render();
      setInterval(tick, 250);
    },
    toggle() {
      if (st.running) { st.left = Math.max(0, Math.round((st.endAt - Date.now()) / 1000)); st.running = false; }
      else { st.running = true; st.endAt = Date.now() + st.left * 1000; }
      persist(); render();
    },
    reset() { st.running = false; st.left = dur(st.mode); persist(); render(); },
    skip() { st.running = false; st.mode = st.mode === 'focus' ? 'break' : 'focus'; st.left = dur(st.mode); persist(); render(); },
    isRunning: () => st.running,
    render
  };
})();

/* =========================================================
   Quick links
   ========================================================= */
function renderLinks() {
  $('#links').innerHTML = links.map((l, i) =>
    `<a class="chip" href="${esc(safeUrl(l.u))}" data-i="${i}" title="Right-click to remove">${esc(l.n)}</a>`).join('');
}
$('#links').addEventListener('contextmenu', async (e) => {
  const a = e.target.closest('a[data-i]');
  if (!a) return;
  e.preventDefault();
  const l = links[+a.dataset.i];
  if (confirm(`Remove "${l.n}"?`)) { links.splice(+a.dataset.i, 1); await Store.set('links', links); renderLinks(); }
});
$('#add-link-btn').addEventListener('click', () => { $('#link-form').classList.toggle('hidden'); $('#link-name').focus(); });
$('#link-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  let u = $('#link-url').value.trim();
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  links.push({ n: $('#link-name').value.trim(), u });
  await Store.set('links', links);
  e.target.reset(); e.target.classList.add('hidden'); renderLinks();
});

/* =========================================================
   Cases (to-dos) and evidence board (scratchpad)
   ========================================================= */
function renderCases() {
  const sorted = [...cases].sort((a, b) => (a.done - b.done) || (!!b.hot - !!a.hot));
  $('#cases-list').innerHTML = sorted.length ? sorted.map((c) => `
    <li class="case ${c.done ? 'done' : ''}" data-id="${c.id}">
      <button class="chk" data-act="done" aria-label="Toggle done">${c.done ? '&#10003;' : ''}</button>
      <span class="case-t">${esc(c.t)}</span>
      <button class="mini ${c.hot ? 'on' : ''}" data-act="hot" title="Mark important">&#9733;</button>
      <button class="mini" data-act="del" title="Delete task">&#10005;</button>
    </li>`).join('') : '<li class="empty">No tasks yet. Add one above.</li>';
  const open = cases.filter((c) => !c.done).length;
  $('#cases-count').textContent = cases.length ? `${open} open, ${cases.length - open} done` : '';
}
async function saveCases() { await Store.set('cases', cases); renderCases(); }
function addCase(text) {
  const t = text.trim();
  if (!t) return;
  cases.push({ id: uid(), t, done: false, hot: false });
  saveCases();
}
$('#case-form').addEventListener('submit', (e) => { e.preventDefault(); addCase($('#case-input').value); $('#case-input').value = ''; });
$('#cases-list').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  const li = e.target.closest('.case');
  if (!btn || !li) return;
  const c = cases.find((x) => x.id === li.dataset.id);
  if (!c) return;
  if (btn.dataset.act === 'done') c.done = !c.done;
  if (btn.dataset.act === 'hot') c.hot = !c.hot;
  if (btn.dataset.act === 'del') cases = cases.filter((x) => x !== c);
  saveCases();
});

let scratchTimer;
$('#scratch').addEventListener('input', () => {
  clearTimeout(scratchTimer);
  scratchTimer = setTimeout(() => {
    Store.set('scratch', $('#scratch').value);
    $('#scratch-meta').textContent = `Saved, ${$('#scratch').value.length} chars`;
  }, 300);
});

/* =========================================================
   Shift ledger (daily streak)
   ========================================================= */
function streak() {
  const set = new Set(ledger);
  const d = new Date();
  if (!set.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function renderLedger() {
  const set = new Set(ledger);
  const cells = [];
  for (let i = 20; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = dayKey(d);
    cells.push(`<span class="${set.has(k) ? 'on' : ''} ${i === 0 ? 'today' : ''}" title="${k}"></span>`);
  }
  $('#ledger').innerHTML = cells.join('');
  const s = streak();
  $('#streak-text').textContent = s ? `${s}-day streak` : 'No streak yet';
  $('#checkin-btn').textContent = set.has(dayKey()) ? "Checked in today (click to undo)" : "Check in today";
}
async function toggleCheckin() {
  const k = dayKey();
  ledger = ledger.includes(k) ? ledger.filter((x) => x !== k) : [...ledger, k];
  await Store.set('ledger', ledger);
  renderLedger();
  toast(ledger.includes(k) ? 'Checked in.' : 'Check-in removed.');
}
$('#checkin-btn').addEventListener('click', toggleCheckin);

/* =========================================================
   GitHub informant, trending, Hacker News, status
   ========================================================= */
function describeEvent(e) {
  const p = e.payload || {};
  switch (e.type) {
    case 'PushEvent': { const n = p.size ?? p.commits?.length; return typeof n === 'number' ? `pushed ${n} commit${n === 1 ? '' : 's'} to` : 'pushed to'; }
    case 'PullRequestEvent': return `${p.action || 'updated'} a pull request in`;
    case 'IssuesEvent': return `${p.action || 'updated'} an issue in`;
    case 'IssueCommentEvent': return 'commented in';
    case 'WatchEvent': return 'starred';
    case 'ForkEvent': return 'forked';
    case 'CreateEvent': return `created a ${p.ref_type || 'ref'} in`;
    case 'DeleteEvent': return `deleted a ${p.ref_type || 'ref'} in`;
    case 'ReleaseEvent': return 'released in';
    default: return e.type.replace('Event', '') + ' in';
  }
}

async function loadGitHub() {
  const raw = S.ghUser;
  const user = API.cleanUsername(raw);
  const profileEl = $('#profile'), actEl = $('#activity');
  const link = $$('#links a').find((a) => a.textContent === 'GitHub');
  if (!user) {
    profileEl.innerHTML = '<p class="empty">Add your GitHub username in Settings to see your profile and activity.</p>';
    actEl.innerHTML = ''; $('#gh-meta').textContent = '';
    return;
  }
  if (link) link.href = `https://github.com/${encodeURIComponent(user)}`;
  profileEl.innerHTML = '<p class="empty">Loading GitHub profile...</p>';
  const [p, events] = await Promise.all([API.fetchGitHubProfile(raw), API.fetchGitHubActivity(raw)]);
  if (!p) {
    profileEl.innerHTML = '<p class="empty">No profile found. Check the username in Settings, or GitHub may be rate limiting you. Try again in a few minutes.</p>';
    actEl.innerHTML = '';
    return;
  }
  $('#gh-meta').textContent = `@${p.login}`;
  profileEl.innerHTML = `
    <a class="profile" href="${esc(safeUrl(p.html_url))}">
      <img class="avatar" src="${esc(safeUrl(p.avatar_url))}" alt="">
      <div>
        <h3>${esc(p.name || p.login)}</h3>
        <div class="bio">${p.public_repos} repos, ${p.followers} followers, ${p.following} following</div>
        ${p.bio ? `<div class="bio">${esc(p.bio)}</div>` : ''}
      </div>
    </a>`;
  actEl.innerHTML = events.length ? events.map((e) => `
    <div class="row-item">
      <div class="t">${esc(describeEvent(e))} <a href="https://github.com/${esc(e.repo.name)}">${esc(e.repo.name)}</a></div>
      <div class="m">${timeAgo(e.created_at)}</div>
    </div>`).join('') : '<p class="empty">No recent public activity.</p>';
}

async function renderRepos() {
  const el = $('#repos');
  el.innerHTML = '<p class="empty">Loading repos...</p>';
  const repos = await API.fetchTrendingRepos($('#lang-select').value);
  el.innerHTML = repos.length ? repos.map((r) => `
    <div class="row-item">
      <div class="t"><a href="${esc(safeUrl(r.html_url))}">${esc(r.full_name)}</a></div>
      <div class="m">${esc(r.description || 'No description')}</div>
      <div class="m">&#9733; ${r.stargazers_count.toLocaleString()}${r.language ? ', ' + esc(r.language) : ''}${r.forks_count ? `, ${r.forks_count} forks` : ''}</div>
    </div>`).join('') : '<p class="empty">No repos came back. GitHub search may be rate limiting you; try again in a minute.</p>';
}

async function renderNews() {
  const el = $('#news');
  el.innerHTML = '<p class="empty">Loading stories...</p>';
  const stories = await API.fetchHackerNews(hnFeed);
  el.innerHTML = stories.length ? stories.map((s) => {
    const href = s.url || `https://news.ycombinator.com/item?id=${s.id}`;
    let host = 'news.ycombinator.com';
    try { host = new URL(href).hostname.replace(/^www\./, ''); } catch { /* keep default */ }
    return `
      <div class="row-item">
        <div class="t"><a href="${esc(safeUrl(href))}">${esc(s.title)}</a></div>
        <div class="m">${esc(host)}, ${s.score} points, <a href="https://news.ycombinator.com/item?id=${s.id}">${s.descendants || 0} comments</a>, ${timeAgo(s.time * 1000)}</div>
      </div>`;
  }).join('') : '<p class="empty">Could not load stories. Check your connection and refresh.</p>';
}
$('#hn-tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-feed]');
  if (!b) return;
  hnFeed = b.dataset.feed;
  $$('#hn-tabs .tab').forEach((t) => t.classList.toggle('active', t === b));
  renderNews();
});
$('#lang-select').addEventListener('change', renderRepos);

const SERVICES = [
  { n: 'GitHub', u: 'https://www.githubstatus.com/api/v2/status.json' },
  { n: 'Vercel', u: 'https://www.vercel-status.com/api/v2/status.json' },
  { n: 'Cloudflare', u: 'https://www.cloudflarestatus.com/api/v2/status.json' },
  { n: 'Discord', u: 'https://discordstatus.com/api/v2/status.json' }
];
async function renderStatus() {
  const el = $('#status');
  el.innerHTML = SERVICES.map((s) => `<div class="status-item"><span class="dot" id="dot-${s.n}"></span>${s.n}</div>`).join('');
  await Promise.all(SERVICES.map(async (s) => {
    const st = await API.fetchStatus(s.u);
    const dot = $(`[id="dot-${s.n}"]`);
    if (!dot) return;
    const cls = !st ? '' : st.indicator === 'none' ? 'ok' : st.indicator === 'minor' ? 'warn' : 'bad';
    dot.className = 'dot ' + cls;
    dot.parentElement.title = st ? st.description : 'Status unavailable';
  }));
}

/* =========================================================
   Toolbox
   ========================================================= */
const b64enc = (s) => { let bin = ''; new TextEncoder().encode(s).forEach((x) => (bin += String.fromCharCode(x))); return btoa(bin); };
const b64dec = (s) => {
  const bin = atob(s.trim().replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};
const digest = async (algo, s) =>
  [...new Uint8Array(await crypto.subtle.digest(algo, new TextEncoder().encode(s)))]
    .map((b) => b.toString(16).padStart(2, '0')).join('');

const TOOLS = [
  { label: 'JSON', ph: 'Paste messy JSON...', actions: [
    { label: 'Format', fn: (s) => JSON.stringify(JSON.parse(s), null, 2) },
    { label: 'Minify', fn: (s) => JSON.stringify(JSON.parse(s)) }
  ] },
  { label: 'Base64', ph: 'Text or Base64 string...', actions: [
    { label: 'Encode', fn: (s) => b64enc(s) },
    { label: 'Decode', fn: (s) => b64dec(s) }
  ] },
  { label: 'Epoch', ph: 'A timestamp (seconds or ms) or a date like 2026-10-14 09:30', actions: [
    { label: 'Now', fn: () => { const n = Date.now(); return `seconds: ${Math.floor(n / 1000)}\nmillis:  ${n}\niso:     ${new Date(n).toISOString()}`; } },
    { label: 'To date', fn: (s) => {
      const n = Number(s.trim());
      if (!s.trim() || Number.isNaN(n)) throw new Error('Enter a numeric timestamp');
      const d = new Date(n < 1e12 ? n * 1000 : n);
      return `iso:   ${d.toISOString()}\nlocal: ${d.toString()}`;
    } },
    { label: 'To epoch', fn: (s) => {
      const d = new Date(s.trim());
      if (Number.isNaN(d.getTime())) throw new Error('Could not parse that date');
      return `seconds: ${Math.floor(d / 1000)}\nmillis:  ${d.getTime()}`;
    } }
  ] },
  { label: 'UUID', ph: 'No input needed', actions: [
    { label: 'Generate 1', fn: () => crypto.randomUUID() },
    { label: 'Generate 5', fn: () => Array.from({ length: 5 }, () => crypto.randomUUID()).join('\n') }
  ] },
  { label: 'JWT', ph: 'Paste a JWT (header.payload.signature)...', actions: [
    { label: 'Decode', fn: (s) => {
      const parts = s.trim().split('.');
      if (parts.length < 2) throw new Error('That does not look like a JWT');
      const header = JSON.parse(b64dec(parts[0])), payload = JSON.parse(b64dec(parts[1]));
      let extra = '';
      ['iat', 'nbf', 'exp'].forEach((k) => { if (payload[k]) extra += `\n${k}: ${new Date(payload[k] * 1000).toISOString()}`; });
      return `header:\n${JSON.stringify(header, null, 2)}\n\npayload:\n${JSON.stringify(payload, null, 2)}${extra ? '\n' + extra : ''}\n\nSignature is not verified.`;
    } }
  ] },
  { label: 'Hash', ph: 'Text to hash...', actions: [
    { label: 'SHA-256', fn: (s) => digest('SHA-256', s) },
    { label: 'SHA-1', fn: (s) => digest('SHA-1', s) },
    { label: 'SHA-512', fn: (s) => digest('SHA-512', s) }
  ] },
  { label: 'URL', ph: 'Text or encoded URL...', actions: [
    { label: 'Encode', fn: (s) => encodeURIComponent(s) },
    { label: 'Decode', fn: (s) => decodeURIComponent(s) }
  ] }
];

let toolIdx = 0;
function showTool(i) {
  toolIdx = i;
  const t = TOOLS[i];
  $$('#tool-tabs .tab').forEach((b, j) => b.classList.toggle('active', j === i));
  $('#tool-body').innerHTML = `
    <textarea id="tool-in" class="code" spellcheck="false" placeholder="${esc(t.ph)}"></textarea>
    <div class="row">
      ${t.actions.map((a, j) => `<button class="btn ${j ? '' : 'primary'}" data-j="${j}">${esc(a.label)}</button>`).join('')}
      <span class="grow"></span>
      <button class="btn ghost" id="tool-copy">Copy output</button>
    </div>
    <pre id="tool-out" class="code-out">Output appears here.</pre>`;
}
function buildToolbox() {
  $('#tool-tabs').innerHTML = TOOLS.map((t, i) => `<button class="tab" data-i="${i}">${esc(t.label)}</button>`).join('');
  showTool(0);
}
$('#tool-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) showTool(+b.dataset.i); });
$('#tool-body').addEventListener('click', async (e) => {
  const out = $('#tool-out');
  if (e.target.id === 'tool-copy') {
    try { await navigator.clipboard.writeText(out.textContent); toast('Copied.'); } catch { toast('Copy failed.'); }
    return;
  }
  const b = e.target.closest('[data-j]');
  if (!b) return;
  try {
    out.textContent = await TOOLS[toolIdx].actions[+b.dataset.j].fn($('#tool-in').value);
    out.classList.remove('err');
  } catch (err) {
    out.textContent = 'Error: ' + (err.message || 'could not process that input');
    out.classList.add('err');
  }
});
const openTools = () => { openModal('tools-modal'); $('#tool-in')?.focus(); };

/* =========================================================
   Focus mode and search
   ========================================================= */
const toggleFocusMode = () => document.body.classList.toggle('focus-mode');

function go(urlOrQuery) {
  const q = urlOrQuery.trim();
  if (!q) return;
  if (/^https?:\/\//i.test(q)) location.href = q;
  else if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(q) && !/\s/.test(q)) location.href = 'https://' + q;
  else location.href = 'https://www.google.com/search?q=' + encodeURIComponent(q);
}
$('#search-form').addEventListener('submit', (e) => { e.preventDefault(); go($('#search-input').value); });

/* =========================================================
   Command palette
   ========================================================= */
const COMMANDS = [
  { t: 'Open dev toolbox', k: 'tools json base64 jwt hash uuid epoch url', h: 'T', run: openTools },
  { t: 'Open settings', k: 'settings profile github name theme', run: () => openSettings() },
  { t: 'Start or pause focus timer', k: 'timer pomodoro stakeout start pause', run: () => Timer.toggle() },
  { t: 'Toggle focus mode', k: 'focus mode zen hide', h: 'F', run: toggleFocusMode },
  { t: 'Check in today', k: 'streak ledger shift checkin', run: toggleCheckin },
  { t: 'Go to scratchpad', k: 'scratchpad evidence notes', run: () => $('#scratch').focus() },
  { t: 'Toggle rain', k: 'rain effect', run: () => { S.rain = !S.rain; saveSettings(); applySettings(); } },
  { t: 'Toggle flashlight', k: 'flashlight light cursor', run: () => { S.flashlight = !S.flashlight; saveSettings(); applySettings(); } },
  { t: 'Refresh news, repos and status', k: 'refresh reload news', run: refreshAll }
];
let palItems = [], palIdx = 0;

function buildPalette(q) {
  const raw = q.trim(), low = raw.toLowerCase();
  const items = [];
  let m;
  if ((m = raw.match(/^(?:task|case):\s*(.+)/i))) items.push({ t: `Add task: ${m[1]}`, run: () => { addCase(m[1]); toast('Task added.'); } });
  if ((m = raw.match(/^(?:g|google)\s+(.+)/i))) items.push({ t: `Search Google for "${m[1]}"`, run: () => go(m[1]) });
  if ((m = raw.match(/^gh\s+(\S+)/i))) items.push({ t: `Open github.com/${m[1]}`, run: () => { location.href = 'https://github.com/' + m[1]; } });
  if (raw && !items.length && /^(https?:\/\/)?[\w-]+(\.[\w-]+)+/.test(raw) && !/\s/.test(raw)) items.push({ t: `Open ${raw}`, run: () => go(raw) });
  links.filter((l) => low && l.n.toLowerCase().includes(low)).forEach((l) => items.push({ t: `Open ${l.n}`, h: 'link', run: () => { location.href = l.u; } }));
  COMMANDS.filter((c) => !low || (c.t + ' ' + c.k).toLowerCase().includes(low)).forEach((c) => items.push(c));
  if (raw && !items.some((i) => i.t.startsWith('Search Google'))) items.push({ t: `Search the web for "${raw}"`, run: () => go(raw) });
  return items;
}
function renderPalette() {
  palItems = buildPalette($('#palette-input').value);
  palIdx = Math.min(palIdx, Math.max(palItems.length - 1, 0));
  $('#palette-list').innerHTML = palItems.map((it, i) =>
    `<div class="pal-item ${i === palIdx ? 'active' : ''}" data-i="${i}">${esc(it.t)}${it.h ? `<span class="hint">${esc(it.h)}</span>` : ''}</div>`).join('');
  $('.pal-item.active')?.scrollIntoView({ block: 'nearest' });
}
function openPalette() { palIdx = 0; $('#palette-input').value = ''; renderPalette(); openModal('palette'); $('#palette-input').focus(); }
function runPalette(i) { const it = palItems[i]; if (!it) return; closeModals(); it.run(); }
$('#palette-input').addEventListener('input', () => { palIdx = 0; renderPalette(); });
$('#palette-input').addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown') { e.preventDefault(); palIdx = (palIdx + 1) % palItems.length; renderPalette(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); palIdx = (palIdx - 1 + palItems.length) % palItems.length; renderPalette(); }
  else if (e.key === 'Enter') { e.preventDefault(); runPalette(palIdx); }
});
$('#palette-list').addEventListener('click', (e) => { const el = e.target.closest('[data-i]'); if (el) runPalette(+el.dataset.i); });

/* =========================================================
   Settings (with export / import)
   ========================================================= */
let pendingAccent = 'crimson';
function markAccent(a) { $$('#set-accent button').forEach((b) => b.classList.toggle('sel', b.dataset.accent === a)); }
function openSettings() {
  $('#set-name').value = S.name; $('#set-gh').value = S.ghUser;
  $('#set-rain').checked = S.rain; $('#set-blinds').checked = S.blinds;
  $('#set-grain').checked = S.grain; $('#set-flash').checked = S.flashlight;
  $('#set-focus').value = S.focusMin; $('#set-break').value = S.breakMin;
  pendingAccent = S.accent; markAccent(pendingAccent);
  openModal('settings-modal');
}
$('#set-accent').addEventListener('click', (e) => {
  const b = e.target.closest('[data-accent]');
  if (!b) return;
  pendingAccent = b.dataset.accent; markAccent(pendingAccent);
  document.body.dataset.accent = pendingAccent; // live preview
});
$('#save-settings').addEventListener('click', async () => {
  const clamp = (v, lo, hi, d) => { const n = parseInt(v, 10); return Number.isNaN(n) ? d : Math.min(hi, Math.max(lo, n)); };
  S = {
    name: $('#set-name').value.trim(), ghUser: $('#set-gh').value.trim(), accent: pendingAccent,
    rain: $('#set-rain').checked, blinds: $('#set-blinds').checked,
    grain: $('#set-grain').checked, flashlight: $('#set-flash').checked,
    focusMin: clamp($('#set-focus').value, 1, 180, 25), breakMin: clamp($('#set-break').value, 1, 60, 5)
  };
  await saveSettings();
  if (!Timer.isRunning()) Timer.reset();
  applySettings(); loadGitHub(); closeModals(); toast('Settings saved.');
});
$('#export-btn').addEventListener('click', async () => {
  const all = await Store.all();
  Object.keys(all).forEach((k) => k.startsWith('cache:') && delete all[k]);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' }));
  a.download = `devpulse-backup-${dayKey()}.json`;
  a.click(); URL.revokeObjectURL(a.href);
});
$('#import-btn').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (typeof data !== 'object' || Array.isArray(data)) throw new Error('bad shape');
    await Store.setMany(data);
    location.reload();
  } catch { toast('That file is not a DevPulse backup.'); }
});

/* =========================================================
   Wiring, shortcuts, startup
   ========================================================= */
function refreshAll() {
  Promise.all(['trending:' + $('#lang-select').value, 'hn:' + hnFeed].map((k) => Store.set('cache:' + k, null)))
    .then(() => { renderRepos(); renderNews(); renderStatus(); loadGitHub(); toast('Refreshing.'); });
}

$('#palette-btn').addEventListener('click', openPalette);
$('#tools-btn').addEventListener('click', openTools);
$('#focus-btn').addEventListener('click', toggleFocusMode);
$('#settings-btn').addEventListener('click', openSettings);
$('#pomo-toggle').addEventListener('click', () => Timer.toggle());
$('#pomo-reset').addEventListener('click', () => Timer.reset());
$('#pomo-skip').addEventListener('click', () => Timer.skip());

$$('.overlay').forEach((o) => o.addEventListener('mousedown', (e) => { if (e.target === o) closeModals(); }));
$$('[data-close]').forEach((b) => b.addEventListener('click', closeModals));

addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    $('#palette').classList.contains('hidden') ? openPalette() : closeModals();
  } else if (e.key === 'Escape') {
    closeModals();
  } else if (!isTyping() && !e.metaKey && !e.ctrlKey && !e.altKey) {
    if (e.key === '/') { e.preventDefault(); $('#search-input').focus(); }
    else if (e.key.toLowerCase() === 'f') toggleFocusMode();
    else if (e.key.toLowerCase() === 't') { e.preventDefault(); openTools(); }
  }
});

(async function init() {
  const [s, l, c, led, ses, pad_] = await Promise.all([
    Store.get('settings'), Store.get('links'), Store.get('cases'),
    Store.get('ledger'), Store.get('sessions'), Store.get('scratch')
  ]);
  S = { ...DEFAULTS, ...(s || {}) };
  links = Array.isArray(l) && l.length ? l : DEFAULT_LINKS;
  cases = Array.isArray(c) ? c : [];
  ledger = Array.isArray(led) ? led : [];
  sessions = ses || {};
  if (pad_) $('#scratch').value = pad_;

  tickClock(); setInterval(tickClock, 1000);
  setInterval(updateGreeting, 60e3);
  showQuote(); buildToolbox();
  renderLinks(); renderCases(); renderLedger();
  await Timer.load();
  applySettings();

  loadGitHub(); renderRepos(); renderNews(); renderStatus();
})();

})();