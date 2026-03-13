# Task Assistant Privacy Policy

Last updated: 2026-03-10

Task Assistant helps users detect email deadlines and optionally create calendar reminders.

## Data We Access

- Google account basic authorization via OAuth.
- Gmail read-only data (`gmail.readonly`) to extract deadline-related information from emails.
- Google Calendar events permission (`calendar.events`) to create reminders when requested by the user.
- Local extension storage (`chrome.storage`) for user settings and extracted task state.

## How We Use Data

- Identify deadlines and action items from email content.
- Show deadlines inside the extension UI.
- Create calendar events only when the user clicks "Add to Calendar" or enables related workflow.
- Generate optional AI summaries if the user provides a Gemini API key.

## What We Do Not Do

- We do not sell user data.
- We do not use Gmail/Calendar data for advertising.
- We do not share personal data with third parties except Google APIs required for core features.

## Data Storage

- Data is primarily stored locally in the user's browser extension storage.
- OAuth tokens are managed by Google Chrome identity APIs.
- If backend sync is added in future versions, this policy will be updated before release.

## User Control

- Users can disconnect Google access from extension settings and Google account permissions.
- Users can clear extracted tasks using the "Clear Tasks" action.
- Users can uninstall the extension at any time.

## Security

- We use OAuth 2.0 for Google authentication.
- We request only minimum scopes required for the described features.

## Contact

For privacy questions, contact: YOUR_EMAIL_HERE

