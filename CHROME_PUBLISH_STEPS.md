# Chrome Extension Publishing Steps

## Immediate Preparation

1. Replace these placeholders:
   - `homepage_url` in `manifest.json`
   - `YOUR_EMAIL_HERE` in `privacy-policy.html`
   - `YOUR_PRIVACY_POLICY_URL` in `CHROME_STORE_LISTING.md`
2. Prepare required icon files:
   - `icons/icon16.png`
   - `icons/icon48.png`
   - `icons/icon128.png`
3. Add icon fields in `manifest.json` after icons are ready, so the extension does not fail to load.

---

## Official Publishing Flow

### Step 1: Host Your Privacy Policy Page

Recommended: GitHub Pages.

1. Create a public repository (example: `task-assistant-policy`)
2. Upload `privacy-policy.html`
3. Enable GitHub Pages in repository settings
4. Copy the public URL (you will use it in Google Cloud and Chrome Web Store)

### Step 2: Configure Google Cloud OAuth for Production

1. Go to Google Cloud Console -> OAuth consent screen
2. Complete app details, developer contact email, and privacy policy URL
3. Ensure Gmail API and Calendar API are enabled
4. In Credentials, verify OAuth client (Chrome Extension type) is bound to your current extension ID
5. Submit OAuth verification (Gmail scope usually requires review)

### Step 3: Prepare Chrome Web Store Listing

1. Open Chrome Web Store Developer Dashboard
2. Create a new item and prepare:
   - Name, short description, detailed description (you can use `CHROME_STORE_LISTING.md`)
   - Privacy policy URL
   - Screenshots (recommended: 4)
   - Category: `Productivity`

### Step 4: Package Extension as ZIP

Create one zip archive with required runtime files at the root level (no extra top folder):

- `manifest.json`
- `popup.html`
- `popup.js`
- `icons/` (16/48/128)
- any other runtime-required assets

Do not include unrelated files (notes, large source screenshots, temp files, etc.).

### Step 5: Submit for Review

1. Publish as `Unlisted` first for beta testing
2. After validation, switch to `Public`
3. If rejected, address scope/privacy feedback and resubmit

---

## Common Pitfalls

- Gmail scopes are reviewed strictly; privacy policy must be specific and consistent with behavior
- Changing extension ID breaks OAuth binding
- Store listing must clearly explain why each permission is needed
- Release version should not expose debug/testing controls

