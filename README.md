# Task Assistant (Chrome Extension)

Task Assistant helps users quickly spot email deadlines, prioritize urgent items, and take action fast.

## Purpose

- Extract deadline-related tasks from Gmail emails
- Highlight urgency (Overdue / Due <24h / Due <3d / Upcoming)
- Provide a deadline-first feed (Overdue, Today, Tomorrow, This Week)
- Enable one-click actions: Open in Gmail, Add to Calendar, Done
- Generate short AI summaries (1-2 sentences) with deadline + next action

## Core Features

- Google OAuth login in Chrome extension
- Gmail deadline extraction (rule-based)
- Risk labels and high-risk-only filter
- Google Calendar event creation
- Gemini-powered concise summary with selected date range

## Tech Stack

- Chrome Extension (Manifest V3)
- JavaScript (popup UI and logic)
- Google Gmail API / Google Calendar API
- Gemini API (optional)

## Project Structure

- `manifest.json` - extension config, permissions, OAuth scopes
- `popup.html` - extension popup UI
- `popup.js` - extension logic (auth, extraction, rendering, calendar, AI summary)
- `privacy-policy.html` - public privacy policy page template
- `CHROME_STORE_LISTING.md` - Chrome Web Store listing draft
- `RELEASE_CHECKLIST.md` - release readiness checklist
- `CHROME_PUBLISH_STEPS.md` - publishing guide

## Local Setup

1. Clone this repository.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this project folder.
5. Open the extension popup and click **Connect Google**.

## Required Configuration

### Google Cloud

1. Create a Google Cloud project.
2. Enable:
   - Gmail API
   - Google Calendar API
3. Create an OAuth Client ID (Chrome Extension type).
4. Set the Chrome Extension ID in OAuth client settings.
5. Replace `oauth2.client_id` in `manifest.json`.

### Gemini (Optional)

1. Create a Gemini API key in Google AI Studio.
2. Paste it in the extension popup.
3. Click **Save Key**.

## How to Use

1. Click **Connect Google**.
2. Choose a date range (7 / 14 / 30 / custom days).
3. Click **Extract Tasks** to generate the deadline feed.
4. Use:
   - **Open in Gmail**
   - **Add to Calendar**
   - **Done**
5. (Optional) Click **AI Summarize Emails** for a concise summary.

## Publish to Chrome Web Store

Use the step-by-step guide in:

- `CHROME_PUBLISH_STEPS.md`
- `RELEASE_CHECKLIST.md`

## Privacy

See:

- `privacy-policy.html`
- `PRIVACY_POLICY.md`

