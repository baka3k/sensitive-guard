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
| `npx sensitive-guard-cli` | Interactive setup wizard |
| `npx sensitive-guard-cli add <term>` | Add a custom sensitive term |
| `npx sensitive-guard-cli list` | Show all rules and custom terms |
| `npx sensitive-guard-cli status` | Check if hook is installed |
| `npx sensitive-guard-cli remove` | Uninstall the hook |

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

Plain terms match whole words and are case-insensitive. For example, `baka3k`
blocks `baka3k` and `BAKA3K`, but does not block `mybaka3kvalue`.

Custom terms support the following search options:

| Syntax | Matching behavior | Example match | Example not matched |
|---|---|---|---|
| `baka3k` | Whole word, case-insensitive | `BAKA3K` | `mybaka3kvalue` |
| `case:BAKA3K` | Whole word, case-sensitive | `BAKA3K` | `baka3k` |
| `baka3k*` | Starts with, case-insensitive | `baka3k_client` | `mybaka3k` |
| `*baka3k` | Ends with, case-insensitive | `mybaka3k` | `baka3k_client` |
| `*baka3k*` | Contains, case-insensitive | `mybaka3kvalue` | — |
| `case:BAKA3K*` | Wildcard, case-sensitive | `BAKA3K_client` | `baka3k_client` |

Only `*` has wildcard behavior. Other regex characters such as `.`, `+`, `[`
and `(` are matched literally.

You can use the same syntax with the CLI. Quote wildcard terms so that your
shell does not expand `*` before the command runs:

```bash
npx sensitive-guard-cli add baka3k
npx sensitive-guard-cli add "case:BAKA3K"
npx sensitive-guard-cli add "baka3k*"
```

This file is automatically added to `.gitignore` — it will never be committed.

If the hook was installed by an older version, run `npx sensitive-guard-cli init`
and confirm reinstallation so `.git/hooks/pre-commit` receives the new matcher.

## Bypass

For cases where the detection fires incorrectly:

```bash
git commit --no-verify
```

## Requirements

- Node.js ≥ 14
- A git repository with `.git/hooks/` directory
