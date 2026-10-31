---
title: How it works
weight: 30
description: "How the Achievements VS Code extension tracks your activity: local SQLite storage, no server, read-only mode, devcontainers and network access."
---

- The extension activates on `onStartupFinished` and listens to VS Code and Git events (based on your settings).
- Progress and achievement state are stored locally in a SQLite database powered by `sql.js` (no server).
- The UI is a VS Code webview (React) opened via **Achievements: Show**.

## Local data and read-only mode

- Data is stored under VS Code's global storage as `achievements.sqlite`.
- A lock prevents multiple VS Code instances from writing the database at the same time.
  - If another instance is using the DB, the extension runs in **read-only** mode: listeners are disabled and a status bar item indicates the state.

## Sharing progress across devcontainers

When VS Code connects to a devcontainer, `achievements.sqlite` is stored inside the container's filesystem, at a path determined by the extension ID: `~/.vscode-server/data/User/globalStorage/boxboxjason.achievements/achievements.sqlite`

That path is deterministic across every devcontainer you connect to, so you can persist and share progress between containers (and across rebuilds) by mounting a host directory or named Docker volume at that exact location in `.devcontainer/devcontainer.json`:

```jsonc
{
  "mounts": [
    "source=${localEnv:HOME}/.achievements-data,target=/home/vscode/.vscode-server/data/User/globalStorage/boxboxjason.achievements,type=bind"
  ]
}
```

Adjust the remote user's home directory in `target` to match your container image (e.g. `/root` instead of `/home/vscode`), and use the same `source` across devcontainer configs to share one database between all of them.

{{< callout type="warning" >}}
Only open one devcontainer at a time against a shared database. The write lock file lives under the container's own temp directory rather than next to the database, so two containers open simultaneously against the same mounted database won't see each other's lock and could both attempt to write at once.
{{< /callout >}}

## Network access

By default, this extension makes **no network requests** and works fully offline.

The only exception is the optional `achievements.checkOutdatedExtensions` [setting]({{< relref "settings" >}}) (disabled by default). When enabled, it periodically sends the IDs of your installed (non-builtin) extensions to the VS Marketplace (`marketplace.visualstudio.com`) to check for outdated versions and award related achievements. Enable it only if you're comfortable sharing your installed-extension list with the Marketplace.
