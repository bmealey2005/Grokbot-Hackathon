# Session export

Scrubbed Grok Bot transcripts for the submission repo. No export is committed yet. Every teammate exports their session (the organizers explain how at kickoff). A second teammate checks the files before they are committed.

## Scrub checklist

Run this from the repo root after the exports are in this folder and before `git add`.

```bash
# Emails and at-handles
grep -RInE '[[:alnum:]._%+-]+@[[:alnum:].-]+\.[A-Za-z]{2,}' docs/session-export \
  --exclude=README.md || true

# API keys and GitHub tokens
grep -RInE 'xai-|sk-|ghp_|gho_|github_pat_|Bearer ' docs/session-export \
  --exclude=README.md || true

# Phone numbers (US-style, plus a loose international form)
grep -RInE '(\+?[0-9][0-9 .()-]{8,}[0-9])' docs/session-export \
  --exclude=README.md || true
```

Also search the exports by hand for:

- Real names of teammates, students, and judges
- School ids, addresses, and social handles
- Note content a student did not agree to publish
- Cookies, session ids, and anything that looks like a credential

Replace each hit with `[REDACTED]`. Do not leave the original in a commit and then delete it in a follow-up. If a secret already landed on the remote, rotate it. Deleting the file later does not remove it from git history.

## Before commit

- [ ] Every teammate's export is in this folder
- [ ] The greps above return no hits, other than this README
- [ ] A second teammate has opened the files and repeated the search
- [ ] The README at the repo root links the export from "How Grok Bot helped build it"

Keep secrets in the host dashboard, not in these files. `XAI_API_KEY` stays in `.env.local` or in the deploy host's environment variables.
