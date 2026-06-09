# Booking Grabber

A Chrome / Edge (Manifest V3) browser extension that automates an online exam-booking
flow: it grabs the live "select modules" link the moment booking opens, navigates the
booking pages, fills your login and payment details, and clicks **Pay**.

> ⚠️ **Disclaimer**
> This tool automates interaction with a third-party booking website and polls its
> server to obtain the booking link as soon as it goes live. Automated booking and
> queue-bypassing are very likely against the target site's Terms of Service and can
> disadvantage other applicants. Use it only for your **own** booking and entirely at
> your own risk. The authors take no responsibility for blocked accounts, failed
> bookings, or any other consequences. Your login and card details are stored
> **unencrypted** in `chrome.storage.local` on your own machine.

---

## Features

- **Live link grabber** — cache-busted fetch of the booking page; scrapes the booking
  link and jumps straight to module selection the instant booking opens (no waiting for
  the page button to render).
- **Second-precise scheduler** — schedule the bot to engage at an exact time, down to
  the second (keep the booking tab open).
- **Full booking automation** — handles login, module selection (with optional partial
  booking), selection / voucher / summary steps, the payment credit-card iframe, and the
  final Pay click.
- **Queue handling** — on a queue ("waiting room") hit it waits out a randomized
  penalty, then reuses the already-saved booking link to return to module selection.

## Project structure

```
g-plugin/
├── README.md
└── Gth-plugin/            <- load THIS folder as the unpacked extension
    ├── manifest.json      Extension manifest (MV3)
    ├── popup.html         Popup UI (config form + scheduler)
    ├── popup.js           Saves config to storage, starts/stops the bot
    └── content.js         The automation engine (injected into the booking pages)
```

---

## Setup in the browser

The extension is unpacked (not from the Web Store), so you load it in developer mode.

### Google Chrome

1. Download / clone this repository (see **Git** below).
2. Open `chrome://extensions` in the address bar.
3. Toggle **Developer mode** on (top-right).
4. Click **Load unpacked**.
5. Select the **`Gth-plugin`** folder (the one containing `manifest.json`).
6. Pin the extension from the puzzle-piece toolbar menu for quick access.

### Microsoft Edge

1. Open `edge://extensions`.
2. Enable **Developer mode** (left sidebar).
3. Click **Load unpacked** and select the **`Gth-plugin`** folder.

### Brave / other Chromium browsers

Same steps — open the browser's extensions page, enable developer mode, and
**Load unpacked** the `Gth-plugin` folder.

> After editing any source file, return to the extensions page and click the **reload**
> (↻) icon on the extension card to apply changes.

---

## Usage

1. Log in to your booking account in the browser.
2. Open your **booking page** in a tab and keep it open.
3. Click the extension's toolbar icon to open the popup and fill in:
   - **Exam Link (URL)** — paste the booking page URL.
   - **Login Details** — email + password.
   - **Credit Card Details** — name, number, expiry (MM/YY), CVV.
   - **Modules** — tick the modules you want; toggle **Allow Partial Booking** if you
     want to proceed even when some modules are full.
   - **Schedule (optional)** — tick *Start at an exact time* and pick a date/time
     (seconds included) to have the bot engage at that precise moment.
4. Click **▶️ Start Bot**. The status badge shows *Bot is Running* (or *Scheduled · …*).
5. Click **⏹️ Stop Bot** at any time to halt it.

Open DevTools (**F12**) → **Console** on the booking tab to watch the engine logs
(`⏰ [Scheduler]`, `🏠 [State: Exam Page]`, queue/penalty messages, etc.).

---

## Git

Initialize and push the repository:

```bash
cd "g-plugin"
git init
git add .
git commit -m "Initial commit: Booking Grabber extension"

# point at your remote (replace with your own repo URL)
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```

### Recommended `.gitignore`

This repo includes a `graphify-out/` folder (a generated knowledge-graph of the code).
You usually do **not** want to commit it:

```gitignore
graphify-out/
node_modules/
*.log
```

---

## How it works (brief)

`popup.js` writes your configuration to `chrome.storage.local` and messages the active
tab to start. `content.js` is injected into the booking site's pages and runs a
self-scheduling loop (`runAutomationCycle`) that branches on the current URL: it fetches
the live booking link, selects modules, logs in, walks the checkout, fills the card
iframe, and clicks Pay — recovering from queue / waiting-room pages along the way.

## Requirements

- A Chromium-based browser (Chrome, Edge, Brave) with developer mode.
- A valid account on the booking site.
- *(Optional, for the standalone link tester)* Node.js 18+.
