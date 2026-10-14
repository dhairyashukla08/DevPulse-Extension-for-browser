const API = {
  // Accepts "octocat", "github.com/octocat" or a full profile URL
  cleanUsername(input) {
    if (!input) return '';
    let clean = input.trim().replace(/\/+$/, '');
    if (clean.includes('github.com/')) clean = clean.split('github.com/').pop().split('/')[0];
    return clean.replace(/^@/, '');
  },

  // Cache results so a new tab never burns GitHub's 60 requests/hour limit.
  // If a fresh request fails, the stale copy is used instead.
  async cached(key, ttlMs, fn) {
    const hit = await Store.get('cache:' + key);
    if (hit && Date.now() - hit.t < ttlMs) return hit.v;
    const v = await fn();
    const empty = v == null || (Array.isArray(v) && v.length === 0);
    if (empty) return hit ? hit.v : v;
    await Store.set('cache:' + key, { t: Date.now(), v });
    return v;
  },

  async json(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    return res.json();
  },

  fetchGitHubProfile(raw) {
    const u = API.cleanUsername(raw);
    if (!u) return Promise.resolve(null);
    return API.cached(`profile:${u}`, 15 * 60e3, () =>
      API.json(`https://api.github.com/users/${encodeURIComponent(u)}`).catch(() => null));
  },

  fetchGitHubActivity(raw) {
    const u = API.cleanUsername(raw);
    if (!u) return Promise.resolve([]);
    return API.cached(`events:${u}`, 5 * 60e3, () =>
      API.json(`https://api.github.com/users/${encodeURIComponent(u)}/events/public`)
        .then((e) => e.slice(0, 7)).catch(() => []));
  },

  fetchTrendingRepos(language = 'javascript') {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    const since = d.toISOString().split('T')[0];
    const lang = language ? `+language:${encodeURIComponent(language)}` : '';
    const url = `https://api.github.com/search/repositories?q=created:>${since}${lang}&sort=stars&order=desc&per_page=8`;
    return API.cached(`trending:${language}`, 30 * 60e3, () =>
      API.json(url).then((d) => d.items || []).catch(() => []));
  },

  fetchHackerNews(feed = 'topstories') {
    return API.cached(`hn:${feed}`, 5 * 60e3, async () => {
      try {
        const ids = await API.json(`https://hacker-news.firebaseio.com/v0/${feed}.json`);
        const items = await Promise.all(ids.slice(0, 10).map((id) =>
          API.json(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).catch(() => null)));
        return items.filter(Boolean);
      } catch { return []; }
    });
  },

  // Atlassian Statuspage format: { status: { indicator, description } }
  async fetchStatus(url) {
    try {
      const d = await API.cached('status:' + url, 3 * 60e3, () => API.json(url).catch(() => null));
      return d?.status || null;
    } catch { return null; }
  }
};