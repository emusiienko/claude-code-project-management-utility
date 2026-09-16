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
cat > ~/.claude/settings.json <<'EOF'
{
  "permissions": {
    "defaultMode": "bypassPermissions"
  },
  "sandbox": {
    "enabled": true,
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
claude plugin marketplace add /opt/fast-sdlc-plugin
claude plugin marketplace add anthropics/claude-plugins-official
claude plugin install fast-sdlc@fast-sdlc --yes --scope local
