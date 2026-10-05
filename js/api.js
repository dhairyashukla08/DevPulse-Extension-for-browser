const API = {
  // Extract pure username if a full GitHub URL was pasted
  cleanUsername: (input) => {
    if (!input) return '';
    let clean = input.trim().replace(/\/$/, ''); // strip trailing slash
    if (clean.includes('github.com/')) {
      clean = clean.split('github.com/').pop();
    }
    return clean;
  },

  fetchGitHubProfile: async (rawInput) => {
    const username = API.cleanUsername(rawInput);
    if (!username) return null;
    try {
      const response = await fetch(`https://api.github.com/users/${username}`);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  },

  fetchGitHubActivity: async (rawInput) => {
    const username = API.cleanUsername(rawInput);
    if (!username) return [];
    try {
      const response = await fetch(`https://api.github.com/users/${username}/events/public`);
      if (!response.ok) return [];
      const events = await response.json();
      return events.slice(0, 7); // top 7 events
    } catch {
      return [];
    }
  },

  fetchTrendingRepos: async (language = 'javascript') => {
    const date = new Date();
    date.setDate(date.getDate() - 7);
    const dateStr = date.toISOString().split('T')[0];
    const langQuery = language ? `+language:${encodeURIComponent(language)}` : '';
    const url = `https://api.github.com/search/repositories?q=created:>${dateStr}${langQuery}&sort=stars&order=desc&per_page=8`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      return data.items || [];
    } catch {
      return [];
    }
  },

  fetchHackerNews: async () => {
    try {
      const idsRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
      const ids = await idsRes.json();
      const promises = ids.slice(0, 8).map(id => fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r => r.json()));
      return await Promise.all(promises);
    } catch {
      return [];
    }
  }
};