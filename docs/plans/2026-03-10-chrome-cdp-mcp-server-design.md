# Chrome CDP MCP Server — Design Document

**Date:** 2026-03-10
**Status:** Approved

## Overview

A standalone MCP server (TypeScript, stdio transport) that connects to the user's real Chrome browser via the Chrome DevTools Protocol (CDP) using Playwright's `connectOverCDP`. Replaces the unreliable dev-browser Chrome extension.

## Architecture

```
Claude Code  ←→  MCP Server (stdio)  ←→  Playwright  ←→  Chrome (CDP port 9222)
```

## Chrome Connection Strategy

1. On first tool call, check if Chrome is already listening on port 9222 via `curl localhost:9222/json/version`
2. If yes — connect to it
3. If no — auto-launch Chrome with `--remote-debugging-port=9222`
4. Default: user's normal Chrome profile. Configurable via `CHROME_PROFILE` env var
5. Connection is reused across tool calls within a session
6. If connection drops mid-session, auto-reconnect on next tool call

## WSL2 Considerations

- Chrome binary: `/mnt/c/Program Files/Google/Chrome/Application/chrome.exe`
- Profile paths passed to chrome.exe use Windows format (`C:\Users\...`)
- Windows username auto-detected via `cmd.exe /c "echo %USERNAME%"`
- Chrome running detection uses HTTP check (not `lsof`)
- Screenshots returned as base64 (no cross-filesystem path issues)

## Chrome Binary Detection

Searches in order:
1. `CHROME_PATH` env var
2. `/mnt/c/Program Files/Google/Chrome/Application/chrome.exe`
3. `/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe`
4. `google-chrome` / `chromium` on PATH

## Tools (33)

| Category | Tools |
|----------|-------|
| Navigation (4) | `navigate`, `back`, `forward`, `reload` |
| Interaction (7) | `click`, `type`, `fill_form`, `select_option`, `press_key`, `hover`, `scroll` |
| File/Dialog (2) | `upload_file`, `handle_dialog` |
| Reading (7) | `screenshot`, `snapshot`, `get_text`, `evaluate`, `console_messages`, `network_requests`, `get_page_info` |
| Element inspection (3) | `get_attributes`, `get_computed_styles`, `is_visible` |
| State (4) | `get_cookies`, `set_cookie`, `get_local_storage`, `set_local_storage` |
| Viewport (2) | `resize`, `emulate_device` |
| Tabs (2) | `list_tabs`, `switch_tab` |
| Waiting (3) | `wait_for`, `wait_for_navigation`, `wait_for_network_idle` |
| Export (1) | `save_as_pdf` |

## Project Location

Standalone repo at `/home/rob/dev/chrome-cdp-mcp/`, published to GitHub as `rspeciale0519/chrome-cdp-mcp`.

## Project Structure

```
/home/rob/dev/chrome-cdp-mcp/
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts          # MCP server entry, stdio transport
    ├── chrome.ts         # Chrome detection, launch, CDP connection
    ├── tools/
    │   ├── navigation.ts
    │   ├── interaction.ts
    │   ├── reading.ts
    │   ├── state.ts
    │   ├── viewport.ts
    │   ├── tabs.ts
    │   ├── waiting.ts
    │   └── export.ts
    └── types.ts
```

## Claude Code Registration

Added to `~/.claude/settings.json` under `mcpServers`:

```json
"chrome-browser": {
  "command": "npx",
  "args": ["tsx", "/home/rob/dev/chrome-cdp-mcp/src/index.ts"],
  "env": {
    "CHROME_PROFILE": "Default"
  }
}
```

## Key Design Decisions

- No extension needed — direct CDP connection
- No relay server — MCP server talks directly to Chrome
- Fresh connection per session — no lingering processes
- Auto-reconnect — if Chrome restarts or connection drops, reconnects on next tool call
- WSL2 aware — Windows path translation, chrome.exe detection
- Configurable profile — defaults to normal profile, overridable via env var
