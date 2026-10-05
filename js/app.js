// ==========================================
// 1. LIVE CLOCK & DATE
// ==========================================
function updateClock() {
  const clockEl = document.getElementById('clock');
  const dateEl = document.getElementById('date');
  if (!clockEl || !dateEl) return;

  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  dateEl.textContent = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
setInterval(updateClock, 1000);
updateClock();

// ==========================================
// 2. POMODORO FOCUS TIMER
// ==========================================
class FocusTimer {
  constructor() {
    this.timer = null;
    this.timeLeft = 25 * 60;
    this.isRunning = false;
    this.display = document.getElementById('pomo-display');
    this.toggleBtn = document.getElementById('pomo-toggle-btn');

    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.toggleTimer());
    }
  }

  toggleTimer() {
    if (this.isRunning) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  }

  startTimer() {
    this.isRunning = true;
    this.timer = setInterval(() => {
      this.timeLeft--;
      this.updateDisplay();

      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        this.isRunning = false;
        alert('⏱️ Focus session finished! Time for a short break.');
        this.resetTimer();
      }
    }, 1000);
  }

  pauseTimer() {
    this.isRunning = false;
    clearInterval(this.timer);
  }

  resetTimer() {
    this.timeLeft = 25 * 60;
    this.updateDisplay();
  }

  updateDisplay() {
    const mins = Math.floor(this.timeLeft / 60).toString().padStart(2, '0');
    const secs = (this.timeLeft % 60).toString().padStart(2, '0');
    if (this.display) {
      this.display.textContent = `${mins}:${secs}`;
    }
  }
}

// ==========================================
// 3. AUTO-SAVING SCRATCHPAD
// ==========================================
class Scratchpad {
  constructor() {
    this.textarea = document.getElementById('scratchpad-input');
    this.STORAGE_KEY = 'devpulse_scratchpad_content';

    if (this.textarea) {
      this.init();
    }
  }

  init() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    if (saved) {
      this.textarea.value = saved;
    }

    let timeout;
    this.textarea.addEventListener('input', () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        localStorage.setItem(this.STORAGE_KEY, this.textarea.value);
      }, 300);
    });
  }
}

// ==========================================
// 4. COMMAND PALETTE (⌘K / Ctrl+K)
// ==========================================
class CommandPalette {
  constructor() {
    this.modal = document.getElementById('cmd-palette');
    this.input = document.getElementById('cmd-input');
    this.results = document.getElementById('cmd-results');

    if (this.modal && this.input) {
      this.init();
    }
  }

  init() {
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggleModal();
      } else if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
        this.closeModal();
      }
    });

    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.closeModal();
    });

    if (this.results) {
      this.results.addEventListener('click', (e) => {
        const item = e.target.closest('.cmd-item');
        if (item) {
          const action = item.dataset.action;
          this.executeAction(action);
        }
      });
    }
  }

  toggleModal() {
    this.modal.classList.toggle('hidden');
    if (!this.modal.classList.contains('hidden')) {
      this.input.value = '';
      this.input.focus();
    }
  }

  closeModal() {
    this.modal.classList.add('hidden');
  }

  executeAction(action) {
    this.closeModal();
    if (action === 'tools') {
      document.getElementById('tools-modal')?.classList.remove('hidden');
    } else if (action === 'profile') {
      document.getElementById('token-modal')?.classList.remove('hidden');
    } else if (action === 'scratchpad') {
      document.getElementById('scratchpad-input')?.focus();
    }
  }
}

// ==========================================
// 5. DEVELOPER TOOLBOX MODAL (JSON / BASE64 / EPOCH)
// ==========================================
class DevToolbox {
  constructor() {
    this.modal = document.getElementById('tools-modal');
    this.openBtn = document.getElementById('tools-btn');
    this.closeBtn = document.getElementById('close-tools-btn');

    if (this.modal) {
      this.init();
    }
  }

  init() {
    this.openBtn?.addEventListener('click', () => this.modal.classList.remove('hidden'));
    this.closeBtn?.addEventListener('click', () => this.modal.classList.add('hidden'));

    // Tab Switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));

        e.target.classList.add('active');
        const targetTab = e.target.dataset.tab;
        document.getElementById(targetTab)?.classList.remove('hidden');
      });
    });

    // JSON Formatter Logic
    document.getElementById('format-json-btn')?.addEventListener('click', () => {
      const input = document.getElementById('json-input');
      try {
        const parsed = JSON.parse(input.value);
        input.value = JSON.stringify(parsed, null, 2);
      } catch (err) {
        alert('Invalid JSON input');
      }
    });

    document.getElementById('clear-json-btn')?.addEventListener('click', () => {
      document.getElementById('json-input').value = '';
    });

    // Base64 Decoder Logic
    document.getElementById('decode-b64-btn')?.addEventListener('click', () => {
      const input = document.getElementById('b64-input').value;
      const output = document.getElementById('b64-output');
      try {
        output.textContent = atob(input);
      } catch (e) {
        output.textContent = '// Error decoding Base64 string';
      }
    });

    // Epoch Timer Display
    const epochDisplay = document.getElementById('current-epoch');
    if (epochDisplay) {
      setInterval(() => {
        epochDisplay.textContent = Math.floor(Date.now() / 1000);
      }, 1000);
    }
  }
}

// ==========================================
// 6. GITHUB, NEWS, & DOM INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Initialize Utility Classes
  new FocusTimer();
  new Scratchpad();
  new CommandPalette();
  new DevToolbox();

  // 2. Default New Tab Button Setup
  const defaultTabBtn = document.getElementById('default-newtab-btn');
  if (defaultTabBtn) {
    defaultTabBtn.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.update({ url: 'chrome://new-tab-page' });
      }
    });
  }

  // 3. Load GitHub Profile & Activity from Storage
  const userGhLink = document.getElementById('user-gh-link');
  const savedUser = (typeof Storage !== 'undefined' && await Storage.get('gh_user')) || '';

  if (savedUser) {
    const cleanUser = API.cleanUsername(savedUser);
    if (userGhLink) userGhLink.href = `https://github.com/${cleanUser}`;
    loadProfile(cleanUser);
    loadActivity(cleanUser);
  }

  async function loadProfile(username) {
    const container = document.getElementById('profile-container');
    if (!container) return;
    
    const profile = await API.fetchGitHubProfile(username);
    if (!profile) {
      container.innerHTML = '<div class="empty-state">Profile not found. Check the URL/Username.</div>';
      return;
    }
    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 14px;">
        <img src="${profile.avatar_url}" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid var(--accent);" alt="Avatar">
        <div>
          <h3 style="font-size: 1rem;">${profile.name || profile.login}</h3>
          <p style="font-size: 0.8rem; color: var(--text-muted);">📦 ${profile.public_repos} repos • 👥 ${profile.followers} followers</p>
        </div>
      </div>
    `;
  }

  async function loadActivity(username) {
    const container = document.getElementById('activity-container');
    if (!container) return;

    const events = await API.fetchGitHubActivity(username);
    if (!events || events.length === 0) {
      container.innerHTML = '<div class="empty-state">No recent public activity.</div>';
      return;
    }
    container.innerHTML = events.map(e => `
      <div style="padding: 8px 0; border-bottom: 1px solid var(--glass-border); font-size: 0.82rem;">
        <span style="color: var(--accent); font-weight: 500;">${e.type.replace('Event', '')}</span> in 
        <strong style="color: var(--text-main);">${e.repo.name}</strong>
      </div>
    `).join('');
  }

  // 4. Render Repos & Hacker News
  async function renderRepos() {
    const langSelect = document.getElementById('lang-select');
    const container = document.getElementById('repos-container');
    if (!langSelect || !container) return;

    const lang = langSelect.value;
    const repos = await API.fetchTrendingRepos(lang);
    container.innerHTML = repos.map(r => `
      <div style="padding: 10px 0; border-bottom: 1px solid var(--glass-border);">
        <a href="${r.html_url}" target="_blank" style="color: var(--accent); text-decoration: none; font-weight: 600; font-size: 0.9rem;">${r.full_name}</a>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">${r.description || 'No description'}</p>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">⭐ ${r.stargazers_count}</div>
      </div>
    `).join('');
  }

  async function renderNews() {
    const container = document.getElementById('news-container');
    if (!container) return;

    const stories = await API.fetchHackerNews();
    container.innerHTML = stories.map(s => `
      <div style="padding: 10px 0; border-bottom: 1px solid var(--glass-border);">
        <a href="${s.url}" target="_blank" style="color: var(--text-main); text-decoration: none; font-weight: 500; font-size: 0.85rem;">${s.title}</a>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">👍 ${s.score} points • 💬 ${s.descendants || 0} comments</div>
      </div>
    `).join('');
  }

  // 5. Settings Modal Controls
  const tokenModal = document.getElementById('token-modal');
  const configBtn = document.getElementById('config-btn');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const saveSettingsBtn = document.getElementById('save-settings-btn');
  const ghUserInput = document.getElementById('gh-user-input');

  configBtn?.addEventListener('click', async () => {
    if (ghUserInput && typeof Storage !== 'undefined') {
      ghUserInput.value = await Storage.get('gh_user') || '';
    }
    tokenModal?.classList.remove('hidden');
  });

  closeModalBtn?.addEventListener('click', () => {
    tokenModal?.classList.add('hidden');
  });

  tokenModal?.addEventListener('click', (e) => {
    if (e.target === tokenModal) tokenModal.classList.add('hidden');
  });

  saveSettingsBtn?.addEventListener('click', async () => {
    if (ghUserInput) {
      const input = ghUserInput.value.trim();
      if (input) {
        if (typeof Storage !== 'undefined') await Storage.set('gh_user', input);
        const clean = API.cleanUsername(input);
        if (userGhLink) userGhLink.href = `https://github.com/${clean}`;
        loadProfile(clean);
        loadActivity(clean);
      }
    }
    tokenModal?.classList.add('hidden');
  });

  // Event Listeners for Filters/Refresh
  document.getElementById('lang-select')?.addEventListener('change', renderRepos);
  document.getElementById('refresh-news')?.addEventListener('click', renderNews);

  // Initial Fetches
  renderRepos();
  renderNews();
});