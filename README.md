# DevPulse

**A noir-styled developer dashboard for your new tab — case files, a stakeout focus timer, GitHub intel, tech news, service status and a pocket dev toolbox, all in one dark, atmospheric command center.**

🔗 **[Try the live demo](https://devpulse-extension-noir.netlify.app)** — runs entirely in your browser, no install needed.
📥 **[Install it as your real new tab](#installation)** — free, 2-minute setup, no Chrome Web Store required.

DevPulse turns every new tab into a dark, atmospheric command center: a focus timer, a task list, GitHub activity, tech news, service status and a pocket toolbox, all behind a film-noir interface with venetian-blind light, rain and film grain.

Built with plain HTML, CSS and JavaScript (Manifest V3). No frameworks, no build step, no tracking.

<!-- Add a screenshot here: ![DevPulse screenshot](docs/screenshot.png) -->

---

## Live demo vs. the real extension

The live demo is the exact same code, running as an ordinary website instead of an installed extension — a quick way to see and try everything before committing to an install. Two things work differently there:

- It can't actually become your new tab page. Only a real installed extension can override that; a website never can.
- A couple of the live sections (GitHub activity, trending repos, Hacker News, service status) depend on the target API allowing cross-origin requests from a plain webpage. The real extension's `host_permissions` bypass this entirely, so those sections are guaranteed to work once installed, even on the rare chance one of them doesn't load on the demo.

Everything else — the timer, tasks, scratchpad, command palette, toolbox and atmosphere effects — behaves identically in both.

---

## Features

Every section has a plain name with a noir alias in muted text, for example **Tasks / Open cases**.

### Productivity
- **Tasks / Open cases:** add, complete, star and delete tasks. Important tasks float to the top.
- **Focus timer / Stakeout:** a Pomodoro timer with configurable focus and break lengths. It keeps running if you close the tab, counts your sessions per day and beeps when one ends.
- **Daily streak / Shift ledger:** one-click daily check-in with a streak counter and a 21-day grid.
- **Scratchpad / Evidence board:** an auto-saving notepad for API responses, env vars and snippets.
- **Quick links:** add your own links, and right-click one to remove it.
- **Focus mode:** hides everything except the clock and timer.

### Developer intel
- **GitHub / The informant:** your profile stats and recent public activity, described in plain language.
- **Trending repos / Rising repos:** the most-starred new repositories of the past week, filterable by language.
- **Hacker News / The wire:** Top, New, Best and Ask feeds with domain, score and a link to the comments.
- **Service status / City lights:** live status for GitHub, Vercel, Cloudflare and Discord.

### Dev toolbox
JSON format and minify, Base64 encode and decode, epoch converter, UUID generator, JWT decoder (without signature verification), SHA-1, SHA-256 and SHA-512 hashing, and URL encode and decode. All tools run locally in the browser.

### Command palette
Press `Ctrl+K` or `Cmd+K` and type:

| Input | Action |
|---|---|
| `task: fix login bug` | Add a task |
| `g react hooks` | Search Google |
| `gh user/repo` | Open a GitHub page |
| `example.com` | Open a URL |
| any command name | Run it (toolbox, settings, timer, focus mode, check-in and more) |

### Atmosphere
Venetian blind light, rain, film grain and an optional cursor flashlight, each of which can be switched off. There are four accent colors: crimson, amber, ice and monochrome.

---

## Keyboard shortcuts

| Key | Action |
|---|---|
| `Ctrl/Cmd + K` | Command palette |
| `/` | Focus the search bar |
| `F` | Toggle focus mode |
| `T` | Open the dev toolbox |
| `Esc` | Close any dialog |

---

## Installation

DevPulse is not on the Chrome Web Store, so you load it as an unpacked extension — this is a completely normal, free part of Chrome's developer tools, not a workaround:

1. Clone or download this repository.
   ```bash
   git clone https://github.com/<your-username>/devpulse-extension.git
   ```
2. Open `chrome://extensions` in Chrome (or any Chromium browser).
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the project folder.
5. Open a new tab.

Chrome may show an "unpacked extensions" warning banner the first few times you open the browser. This is normal for any extension loaded this way and not a sign anything is wrong — it's Chrome letting you know the extension didn't come from the Web Store.

Click the gear icon (**Settings**) to add your name, your GitHub username, your accent color and your timer lengths.

---

## Privacy and data

- All your data (tasks, notes, links, streaks and settings) is stored locally with `chrome.storage.local`. Nothing is sent to any server of mine.
- **Export data** and **Import data** in Settings let you back up or move your data as a JSON file.
- The extension talks only to these services, and only to read public information:
  - `api.github.com` (profile, activity and trending repos)
  - `hacker-news.firebaseio.com` (stories)
  - the public status pages of GitHub, Vercel, Cloudflare and Discord
- Fonts are loaded from Google Fonts.
- Responses are cached for a few minutes. This avoids GitHub's unauthenticated rate limit of 60 requests per hour, and stale data is shown if a request fails.

### Permissions
| Permission | Why |
|---|---|
| `storage` | Save your tasks, notes, links and settings locally |
| Host permissions | Read the public APIs listed above |

---

## Project structure

```
devpulse-extension/
├── manifest.json
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── storage.js    # chrome.storage wrapper (falls back to localStorage)
│   ├── api.js        # GitHub, Hacker News and status fetches, with caching
│   └── app.js        # UI logic: timer, tasks, palette, toolbox, settings
└── icons/
    ├── icons16.png
    ├── icon48.png
    └── icon128.png
```

---

## Customization

- **Accent colors:** edit the `[data-accent=...]` rules at the top of `css/style.css`.
- **Quotes:** edit the `QUOTES` array in `js/app.js`.
- **Default links:** edit `DEFAULT_LINKS` in `js/app.js`.
- **Status services:** edit `SERVICES` in `js/app.js`. Any Atlassian Statuspage `/api/v2/status.json` URL works, but you also need to add its domain to `host_permissions` in `manifest.json`.
- **New toolbox tools:** add an entry to the `TOOLS` array in `js/app.js`.

---

## Contributing

Issues and pull requests are welcome. Ideas worth exploring: weather, a link launcher with keyboard shortcuts, a GitHub token option for higher rate limits, and more toolbox utilities.

---

## Author

Built by **Dhairya Shukla**.

## License

Add a license of your choice, for example MIT, by creating a `LICENSE` file in the repository root.
