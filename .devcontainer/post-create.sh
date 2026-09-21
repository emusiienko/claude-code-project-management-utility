#!/usr/bin/env bash
set -euo pipefail

# --- backend ---
curl -LsSf https://astral.sh/uv/install.sh | sh
cd backend
"$HOME/.local/bin/uv" sync --dev --python 3.12
"$HOME/.local/bin/uv" run alembic upgrade head
cd ..

# --- frontend ---
cd frontend
npm install
cd ..

# --- claude: bypass alias (fallback for a raw shell invocation) ---
echo 'alias claude="claude --dangerously-skip-permissions"' >> ~/.bashrc

# --- claude: bypass permissions + sandboxed, masked GitHub credential ---
# Applies to every way of launching claude in this container — terminal alias
# above AND the VS Code extension's own chat panel — since this is read by the
# claude binary itself, not by the shell.
# `~/.claude` is the `claude_config` named volume — Docker creates a fresh empty
# volume's mount point as root:root regardless of which user runs later, so `mkdir`
# below would otherwise fail under `set -e` and silently skip everything after it.
sudo chown vscode:vscode ~/.claude
mkdir -p ~/.claude
# sandbox.enabled is false below (was true) — bwrap cannot create user namespaces in
# this container (Docker denies it by default; confirmed with a bare
# `bwrap --ro-bind / / true` outside Claude Code too, and that only `--privileged` —
# not `seccomp=unconfined` alone — makes it work). Left `true`, every Bash call
# retries through a dead sandbox and escalates to a `dangerouslyDisableSandbox`
# confirmation that's gated unconditionally, regardless of bypassPermissions — a
# prompt on every single command. The allowedDomains/credentials-masking below were
# never actually enforced for the same reason, so this isn't giving up working
# protection. Re-enable if the container ever gets real unprivileged-userns support.
cat > ~/.claude/settings.json <<'EOF'
{
  "permissions": {
    "defaultMode": "bypassPermissions"
  },
  "sandbox": {
    "enabled": false,
    "network": {
      "tlsTerminate": {},
      "allowedDomains": [
        "*.github.com",
        "github.com",
        "pypi.org",
        "files.pythonhosted.org",
        "*.npmjs.org",
        "registry.npmjs.org",
        "astral.sh"
      ]
    },
    "credentials": {
      "files": [
        {
          "path": "~/.config/gh/hosts.yml",
          "mode": "mask",
          "extract": "oauth_token:\\s*(\\S+)",
          "injectHosts": ["api.github.com"]
        }
      ]
    }
  }
}
EOF

# --- git push / pull: SSH agent forwarded automatically by VS Code from the host
# (host key already in ssh-agent) — nothing to set up here, no ~/.ssh mounted.

# --- gh: authenticate from the compose secret (file, never an env var) ---
# Only runs if the secret was actually filled in — an empty placeholder is fine,
# it just means gh/PR creation isn't usable yet until you add a real token.
if [ -s /run/secrets/gh_token ]; then
  gh auth login --with-token < /run/secrets/gh_token

  # --- github MCP server: token baked directly into the config ---
  # The plugin's own .mcp.json expects GITHUB_PERSONAL_ACCESS_TOKEN in the process
  # env at connect time, but nothing here sources a login shell for that — so
  # instead register the server with the token embedded literally (`|| true`
  # since a rebuild re-runs this and re-adding an existing server errors).
  claude mcp add-json github "{\"type\":\"http\",\"url\":\"https://api.githubcopilot.com/mcp\",\"headers\":{\"Authorization\":\"Bearer $(cat /run/secrets/gh_token)\"}}" --scope local || true
else
  echo "post-create.sh: /run/secrets/gh_token is empty — skipping gh auth login." >&2
fi

# --- plugins: fast-sdlc (mounted read-only from the sibling host repo) + official marketplace ---
# `install --yes` already enables the plugin — no separate `enable` call needed.
# `|| true`: `~/.claude` is now the persistent `claude_config` volume (see docker-compose.yml), so a
# second rebuild finds the plugin already installed and `install` errors "already installed" —
# harmless, but fatal under `set -e` without this.
claude plugin marketplace add /opt/fast-sdlc-plugin
claude plugin marketplace add anthropics/claude-plugins-official
claude plugin install fast-sdlc@fast-sdlc --yes --scope local || true

# --- playwright plugin: run Chromium headless, without its own process sandbox ---
# This container disallows unprivileged user namespaces (the same reason bwrap fails for
# Claude Code's own Bash sandbox above) — Chromium's internal sandbox needs disabling or
# `browser_navigate` crashes with "No usable sandbox!". The CLI's own `--no-sandbox` flag
# is accepted but silently not forwarded to the actual browser launch — a confirmed upstream
# bug (https://github.com/microsoft/playwright-mcp/issues/883) — so this goes through a
# `--config` file's `launchOptions.chromiumSandbox: false` instead, which maps directly onto
# Playwright's own LaunchOptions rather than through the broken CLI-flag path. `headless` is
# set the same way since @playwright/mcp defaults to headed, which needs a DISPLAY this
# container doesn't have. Patching the plugin's own `.mcp.json` (found via
# installed_plugins.json, not a hardcoded path — the version hash in the install path changes
# on plugin updates) so this survives every rebuild.
claude plugin install playwright@claude-plugins-official --yes --scope local || true
cat > ~/.claude/playwright-mcp-config.json <<'EOF'
{
  "browser": {
    "launchOptions": {
      "headless": true,
      "chromiumSandbox": false
    }
  }
}
EOF
PLAYWRIGHT_MCP_DIR="$(python3 -c "
import json
d = json.load(open('$HOME/.claude/plugins/installed_plugins.json'))
for e in d['plugins'].get('playwright@claude-plugins-official', []):
    if e.get('scope') == 'local':
        print(e['installPath'])
        break
" 2>/dev/null || true)"
if [ -n "$PLAYWRIGHT_MCP_DIR" ] && [ -f "$PLAYWRIGHT_MCP_DIR/.mcp.json" ]; then
  cat > "$PLAYWRIGHT_MCP_DIR/.mcp.json" <<EOF
{
  "playwright": {
    "command": "npx",
    "args": ["@playwright/mcp@latest", "--config", "$HOME/.claude/playwright-mcp-config.json"]
  }
}
EOF
else
  echo "post-create.sh: playwright plugin install path not found — skipping sandbox-config patch." >&2
fi
