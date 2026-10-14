// Thin wrapper over chrome.storage.local (falls back to localStorage so the
// page can also be opened as a plain file while you are developing).
const Store = {
  hasChrome: typeof chrome !== 'undefined' && !!chrome.storage?.local,

  get(key) {
    if (!Store.hasChrome) {
      try { return Promise.resolve(JSON.parse(localStorage.getItem(key))); }
      catch { return Promise.resolve(undefined); }
    }
    return new Promise((resolve) => chrome.storage.local.get([key], (r) => resolve(r[key])));
  },

  set(key, value) {
    return Store.setMany({ [key]: value });
  },

  setMany(obj) {
    if (!Store.hasChrome) {
      Object.entries(obj).forEach(([k, v]) => localStorage.setItem(k, JSON.stringify(v)));
      return Promise.resolve(true);
    }
    return new Promise((resolve) => chrome.storage.local.set(obj, () => resolve(true)));
  },

  all() {
    if (!Store.hasChrome) {
      const out = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        try { out[k] = JSON.parse(localStorage.getItem(k)); } catch { /* skip */ }
      }
      return Promise.resolve(out);
    }
    return new Promise((resolve) => chrome.storage.local.get(null, resolve));
  }
};