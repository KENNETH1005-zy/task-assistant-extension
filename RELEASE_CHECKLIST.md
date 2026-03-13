# Task Assistant Release Checklist

## 1) Product readiness

- [ ] Remove debug/test UI elements.
- [ ] Confirm core flow: Connect Google -> Extract Tasks -> Add to Calendar.
- [ ] Confirm "Open in Gmail" links open correct message.
- [ ] Confirm risk labels and grouping are correct.

## 2) Manifest and assets

- [ ] Update extension version in `manifest.json`.
- [ ] Add icons (16x16, 48x48, 128x128) and reference them in `manifest.json`.
- [ ] Validate extension loads with no runtime errors.

## 3) OAuth and Google Cloud

- [ ] OAuth consent screen completed (app name, support email, developer contact).
- [ ] Privacy policy URL configured.
- [ ] Test users configured during testing.
- [ ] Production verification submitted (especially for Gmail scope).
- [ ] OAuth client bound to final extension ID.

## 4) Compliance documents

- [ ] Publish privacy policy page online.
- [ ] Add contact email in privacy policy.
- [ ] Ensure data usage in policy matches extension behavior.

## 5) Chrome Web Store listing

- [ ] Extension name and short description finalized.
- [ ] Detailed description finalized.
- [ ] Upload screenshots.
- [ ] Set category to Productivity.
- [ ] Fill "single purpose" and permission justification clearly.

## 6) Pre-submit QA

- [ ] Fresh install test on a clean Chrome profile.
- [ ] Auth flow test with non-developer Google account.
- [ ] Error path test (no Gmail data, no deadlines found, revoked token).
- [ ] Manual regression pass on all buttons.

## 7) Submit strategy

- [ ] First publish as Unlisted for beta feedback.
- [ ] Fix critical feedback.
- [ ] Switch to Public after stability check.

