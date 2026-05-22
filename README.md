# sensitive-guard

Prevent API keys, passwords, and secrets from being committed to git.

## Quick start

```bash
# Run setup wizard in any git repo
npx sensitive-guard-cli
```

The wizard will:
1. Show all 14 built-in detection rules
2. Ask if you want to add custom terms (project names, usernames…)
3. Install a `pre-commit` hook that runs on every `git commit`

## Commands

| Command | Description |
|---|---|
| `npx sensitive-guard` | Interactive setup wizard |
| `npx sensitive-guard add <term>` | Add a custom sensitive term |
| `npx sensitive-guard list` | Show all rules and custom terms |
| `npx sensitive-guard status` | Check if hook is installed |
| `npx sensitive-guard remove` | Uninstall the hook |

## What it blocks

| Rule | Pattern |
|---|---|
| Private Key | `-----BEGIN RSA PRIVATE KEY-----` |
| AWS Access Key | `AKIA...` (16-char) |
| AWS Secret Key | `aws_secret_key = "..."` |
| Anthropic Key | `sk-ant-...` |
| OpenAI Key | `sk-...` (32+ chars) |
| Google API Key | `AIza...` |
| GitHub Token | `ghp_...`, `gho_...`, `ghs_...` |
| Slack Token | `xoxb-...`, `xoxa-...` |
| JWT Token | `eyJ....eyJ....` |
| Generic API Key | `api_key = "..."` |
| Generic Token | `access_token = "..."` |
| Password | `password = "..."` |
| Secret | `client_secret = "..."` |
| Connection String | `mongodb://user:pass@host` |

## Custom terms

Add project-specific terms to `.sensitive-terms` at your repo root:

```
# .sensitive-terms
my-internal-project
baka3k
internal-hostname.corp
```

This file is automatically added to `.gitignore` — it will never be committed.

## Bypass

For cases where the detection fires incorrectly:

```bash
git commit --no-verify
```

## Requirements

- Node.js ≥ 14
- A git repository with `.git/hooks/` directory
