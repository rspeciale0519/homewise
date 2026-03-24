# Chrome CDP MCP Server — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a standalone MCP server that connects Claude Code to the user's real Chrome browser via CDP, replacing the unreliable dev-browser extension.

**Architecture:** TypeScript MCP server using stdio transport. Connects to Chrome via Playwright's `connectOverCDP`. Auto-detects or auto-launches Chrome with `--remote-debugging-port=9222`. WSL2-aware with Windows path translation.

**Tech Stack:** `@modelcontextprotocol/server`, `playwright`, `zod/v4`, TypeScript, tsx

---

### Task 1: Scaffold project and install dependencies

**Files:**
- Create: `/home/rob/dev/chrome-cdp-mcp/package.json`
- Create: `/home/rob/dev/chrome-cdp-mcp/tsconfig.json`
- Create: `/home/rob/dev/chrome-cdp-mcp/src/types.ts`

**Step 1: Create project directory and initialize**

```bash
mkdir -p /home/rob/dev/chrome-cdp-mcp/src/tools
cd /home/rob/dev/chrome-cdp-mcp
git init
```

**Step 2: Create package.json**

```json
{
  "name": "chrome-cdp-mcp",
  "version": "1.0.0",
  "description": "MCP server that connects to Chrome via CDP for browser automation",
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "start": "npx tsx src/index.ts",
    "dev": "npx tsx --watch src/index.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "type-check": "tsc --noEmit"
  },
  "keywords": ["mcp", "chrome", "cdp", "browser", "automation"],
  "license": "MIT"
}
```

**Step 3: Install dependencies**

```bash
cd /home/rob/dev/chrome-cdp-mcp
npm install @anthropic-ai/sdk @modelcontextprotocol/sdk playwright zod --legacy-peer-deps
npm install -D typescript tsx vitest @types/node --legacy-peer-deps
```

**Step 4: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "sourceMap": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 5: Create types.ts**

```typescript
// /home/rob/dev/chrome-cdp-mcp/src/types.ts
import type { Page, Browser, BrowserContext } from 'playwright';

export interface ChromeConnection {
  browser: Browser;
  context: BrowserContext;
  getActivePage(): Promise<Page>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

export interface ChromeConfig {
  port: number;
  chromePath?: string;
  profileName: string;
  windowsUsername?: string;
}

export interface ConsoleEntry {
  type: string;
  text: string;
  timestamp: number;
  url?: string;
  lineNumber?: number;
}

export interface NetworkEntry {
  url: string;
  method: string;
  status: number;
  resourceType: string;
  duration: number;
  size: number;
}

export interface PageInfo {
  url: string;
  title: string;
  meta: Record<string, string>;
}
```

**Step 6: Create .gitignore**

```
node_modules/
dist/
*.js
*.d.ts
*.js.map
```

**Step 7: Verify setup**

Run: `cd /home/rob/dev/chrome-cdp-mcp && npx tsc --noEmit`
Expected: No errors (types.ts compiles cleanly)

**Step 8: Commit**

```bash
cd /home/rob/dev/chrome-cdp-mcp
git add -A
git commit -m "feat: scaffold project with dependencies and types"
```

---

### Task 2: Build Chrome connection manager

**Files:**
- Create: `/home/rob/dev/chrome-cdp-mcp/src/chrome.ts`

This is the core module. It handles detecting running Chrome, launching Chrome if needed, connecting via CDP, and auto-reconnecting.

**Step 1: Create chrome.ts**

```typescript
// /home/rob/dev/chrome-cdp-mcp/src/chrome.ts
import { chromium, type Browser, type Page } from 'playwright';
import { execSync, spawn } from 'child_process';
import type { ChromeConnection, ChromeConfig, ConsoleEntry, NetworkEntry } from './types.js';

const DEFAULT_CONFIG: ChromeConfig = {
  port: 9222,
  profileName: process.env.CHROME_PROFILE || 'Default',
};

// Console and network logs stored per-page
const consoleLogs: ConsoleEntry[] = [];
const networkLogs: NetworkEntry[] = [];
let activePageUrl: string | null = null;

export function getConsoleLogs(): ConsoleEntry[] {
  return consoleLogs;
}

export function getNetworkLogs(): NetworkEntry[] {
  return networkLogs;
}

export function clearConsoleLogs(): void {
  consoleLogs.length = 0;
}

export function clearNetworkLogs(): void {
  networkLogs.length = 0;
}

function detectWindowsUsername(): string {
  try {
    const result = execSync('cmd.exe /c "echo %USERNAME%"', { encoding: 'utf-8' });
    return result.trim();
  } catch {
    return 'User';
  }
}

function isWSL(): boolean {
  try {
    const release = execSync('uname -r', { encoding: 'utf-8' });
    return release.toLowerCase().includes('wsl') || release.toLowerCase().includes('microsoft');
  } catch {
    return false;
  }
}

function findChromeBinary(): string {
  // 1. Environment variable
  if (process.env.CHROME_PATH) {
    return process.env.CHROME_PATH;
  }

  // 2. WSL2 — look for Windows Chrome
  if (isWSL()) {
    const windowsPaths = [
      '/mnt/c/Program Files/Google/Chrome/Application/chrome.exe',
      '/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    ];
    for (const p of windowsPaths) {
      try {
        execSync(`test -f "${p}"`, { stdio: 'ignore' });
        return p;
      } catch {
        continue;
      }
    }
  }

  // 3. Linux — look for native Chrome
  const linuxBinaries = ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser'];
  for (const bin of linuxBinaries) {
    try {
      execSync(`which ${bin}`, { stdio: 'ignore' });
      return bin;
    } catch {
      continue;
    }
  }

  throw new Error(
    'Chrome not found. Set CHROME_PATH env var or install Chrome.'
  );
}

function buildProfilePath(config: ChromeConfig): string {
  if (isWSL()) {
    const username = config.windowsUsername || detectWindowsUsername();
    // Return Windows-format path (chrome.exe expects Windows paths)
    return `C:\\Users\\${username}\\AppData\\Local\\Google\\Chrome\\User Data`;
  }
  const home = process.env.HOME || '/home/user';
  return `${home}/.config/google-chrome`;
}

async function isChromeRunningWithDebugging(port: number): Promise<boolean> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`);
    return response.ok;
  } catch {
    return false;
  }
}

async function launchChrome(config: ChromeConfig): Promise<void> {
  const binary = findChromeBinary();
  const profilePath = buildProfilePath(config);

  const args = [
    `--remote-debugging-port=${config.port}`,
    `--user-data-dir=${profilePath}`,
    `--profile-directory=${config.profileName}`,
    '--no-first-run',
    '--no-default-browser-check',
  ];

  // Spawn detached so Chrome survives if MCP server exits
  const child = spawn(binary, args, {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();

  // Wait for Chrome to be ready (up to 15 seconds)
  const maxWait = 15000;
  const pollInterval = 500;
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    if (await isChromeRunningWithDebugging(config.port)) {
      return;
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }
  throw new Error(`Chrome did not start within ${maxWait / 1000}s on port ${config.port}`);
}

function setupPageListeners(page: Page): void {
  page.on('console', (msg) => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      timestamp: Date.now(),
      url: page.url(),
    });
  });

  page.on('requestfinished', async (request) => {
    try {
      const response = request.response ? await request.response() : null;
      const timing = request.timing();
      networkLogs.push({
        url: request.url(),
        method: request.method(),
        status: response?.status() ?? 0,
        resourceType: request.resourceType(),
        duration: timing?.responseEnd ?? 0,
        size: (await response?.body().catch(() => null))?.length ?? 0,
      });
    } catch {
      // Ignore errors from detached pages
    }
  });
}

let connection: { browser: Browser; config: ChromeConfig } | null = null;

export async function getConnection(
  overrides?: Partial<ChromeConfig>
): Promise<ChromeConnection> {
  const config: ChromeConfig = { ...DEFAULT_CONFIG, ...overrides };

  // Check if existing connection is still alive
  if (connection?.browser?.isConnected()) {
    return buildConnection(connection.browser, config);
  }

  // Check if Chrome is running with debugging
  const isRunning = await isChromeRunningWithDebugging(config.port);
  if (!isRunning) {
    await launchChrome(config);
  }

  // Connect via CDP
  const cdpUrl = `http://127.0.0.1:${config.port}`;
  const browser = await chromium.connectOverCDP(cdpUrl);
  connection = { browser, config };

  return buildConnection(browser, config);
}

function buildConnection(browser: Browser, config: ChromeConfig): ChromeConnection {
  return {
    browser,
    context: browser.contexts()[0] || browser.contexts()[0]!,

    async getActivePage(): Promise<Page> {
      const contexts = browser.contexts();
      if (contexts.length === 0) {
        throw new Error('No browser contexts available');
      }

      const ctx = contexts[0]!;
      const pages = ctx.pages();

      if (pages.length === 0) {
        const page = await ctx.newPage();
        setupPageListeners(page);
        return page;
      }

      // Return the last active page, or first page
      const page = pages[pages.length - 1]!;

      // Set up listeners if this is a new page we haven't seen
      if (page.url() !== activePageUrl) {
        activePageUrl = page.url();
        setupPageListeners(page);
      }

      return page;
    },

    async disconnect(): Promise<void> {
      if (browser.isConnected()) {
        await browser.close();
      }
      connection = null;
    },

    isConnected(): boolean {
      return browser.isConnected();
    },
  };
}
```

**Step 2: Verify it compiles**

Run: `cd /home/rob/dev/chrome-cdp-mcp && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
cd /home/rob/dev/chrome-cdp-mcp
git add src/chrome.ts
git commit -m "feat: add Chrome connection manager with WSL2 support"
```

---

### Task 3: Build MCP server entry point with navigation tools

**Files:**
- Create: `/home/rob/dev/chrome-cdp-mcp/src/tools/navigation.ts`
- Create: `/home/rob/dev/chrome-cdp-mcp/src/index.ts`

**Step 1: Create navigation tools**

```typescript
// /home/rob/dev/chrome-cdp-mcp/src/tools/navigation.ts
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getConnection } from '../chrome.js';

export function registerNavigationTools(server: McpServer): void {
  server.tool(
    'navigate',
    'Navigate to a URL in Chrome',
    { url: z.string().describe('The URL to navigate to') },
    async ({ url }) => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      return {
        content: [{ type: 'text', text: `Navigated to ${page.url()} — "${await page.title()}"` }],
      };
    }
  );

  server.tool(
    'back',
    'Go back in browser history',
    {},
    async () => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      await page.goBack({ waitUntil: 'domcontentloaded' });
      return {
        content: [{ type: 'text', text: `Navigated back to ${page.url()}` }],
      };
    }
  );

  server.tool(
    'forward',
    'Go forward in browser history',
    {},
    async () => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      await page.goForward({ waitUntil: 'domcontentloaded' });
      return {
        content: [{ type: 'text', text: `Navigated forward to ${page.url()}` }],
      };
    }
  );

  server.tool(
    'reload',
    'Reload the current page',
    {},
    async () => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      await page.reload({ waitUntil: 'domcontentloaded' });
      return {
        content: [{ type: 'text', text: `Reloaded ${page.url()}` }],
      };
    }
  );
}
```

**Step 2: Create MCP server entry point**

```typescript
// /home/rob/dev/chrome-cdp-mcp/src/index.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerNavigationTools } from './tools/navigation.js';

const server = new McpServer({
  name: 'chrome-cdp-mcp',
  version: '1.0.0',
});

// Register all tool groups
registerNavigationTools(server);

// Connect via stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
```

**Step 3: Verify it compiles**

Run: `cd /home/rob/dev/chrome-cdp-mcp && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
cd /home/rob/dev/chrome-cdp-mcp
git add src/index.ts src/tools/navigation.ts
git commit -m "feat: add MCP server entry point and navigation tools"
```

---

### Task 4: Build interaction tools

**Files:**
- Create: `/home/rob/dev/chrome-cdp-mcp/src/tools/interaction.ts`
- Modify: `/home/rob/dev/chrome-cdp-mcp/src/index.ts` (add import + register call)

**Step 1: Create interaction tools**

```typescript
// /home/rob/dev/chrome-cdp-mcp/src/tools/interaction.ts
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getConnection } from '../chrome.js';

export function registerInteractionTools(server: McpServer): void {
  server.tool(
    'click',
    'Click an element on the page',
    { selector: z.string().describe('CSS selector or text content to click') },
    async ({ selector }) => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      // Try CSS selector first, fall back to text selector
      try {
        await page.click(selector, { timeout: 5000 });
      } catch {
        await page.getByText(selector, { exact: false }).click({ timeout: 5000 });
      }
      return { content: [{ type: 'text', text: `Clicked "${selector}"` }] };
    }
  );

  server.tool(
    'type',
    'Type text into an input element',
    {
      selector: z.string().describe('CSS selector of the input'),
      text: z.string().describe('Text to type'),
      clear: z.boolean().optional().describe('Clear the field first (default: true)'),
    },
    async ({ selector, text, clear }) => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      if (clear !== false) {
        await page.fill(selector, text);
      } else {
        await page.type(selector, text);
      }
      return { content: [{ type: 'text', text: `Typed "${text}" into "${selector}"` }] };
    }
  );

  server.tool(
    'fill_form',
    'Fill multiple form fields at once',
    {
      fields: z.array(z.object({
        selector: z.string().describe('CSS selector of the field'),
        value: z.string().describe('Value to fill'),
      })).describe('Array of {selector, value} pairs'),
    },
    async ({ fields }) => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      for (const { selector, value } of fields) {
        await page.fill(selector, value);
      }
      return {
        content: [{ type: 'text', text: `Filled ${fields.length} form fields` }],
      };
    }
  );

  server.tool(
    'select_option',
    'Select an option from a dropdown',
    {
      selector: z.string().describe('CSS selector of the <select> element'),
      value: z.string().describe('Value or label to select'),
    },
    async ({ selector, value }) => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      await page.selectOption(selector, value);
      return { content: [{ type: 'text', text: `Selected "${value}" in "${selector}"` }] };
    }
  );

  server.tool(
    'press_key',
    'Press a keyboard key or shortcut',
    {
      key: z.string().describe('Key to press (e.g., "Enter", "Tab", "Control+a")'),
      selector: z.string().optional().describe('Optional element to focus first'),
    },
    async ({ key, selector }) => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      if (selector) {
        await page.press(selector, key);
      } else {
        await page.keyboard.press(key);
      }
      return { content: [{ type: 'text', text: `Pressed "${key}"` }] };
    }
  );

  server.tool(
    'hover',
    'Hover over an element',
    { selector: z.string().describe('CSS selector of the element to hover') },
    async ({ selector }) => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      await page.hover(selector);
      return { content: [{ type: 'text', text: `Hovered over "${selector}"` }] };
    }
  );

  server.tool(
    'scroll',
    'Scroll the page or to an element',
    {
      selector: z.string().optional().describe('CSS selector to scroll to (if omitted, scrolls page)'),
      direction: z.enum(['up', 'down']).optional().describe('Scroll direction (default: down)'),
      pixels: z.number().optional().describe('Pixels to scroll (default: 500)'),
    },
    async ({ selector, direction, pixels }) => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      if (selector) {
        await page.locator(selector).scrollIntoViewIfNeeded();
        return { content: [{ type: 'text', text: `Scrolled to "${selector}"` }] };
      }
      const amount = pixels ?? 500;
      const dy = direction === 'up' ? -amount : amount;
      await page.mouse.wheel(0, dy);
      return { content: [{ type: 'text', text: `Scrolled ${direction ?? 'down'} ${amount}px` }] };
    }
  );

  server.tool(
    'upload_file',
    'Upload a file to a file input',
    {
      selector: z.string().describe('CSS selector of the file input'),
      filePath: z.string().describe('Absolute path to the file to upload'),
    },
    async ({ selector, filePath }) => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      await page.setInputFiles(selector, filePath);
      return { content: [{ type: 'text', text: `Uploaded "${filePath}" to "${selector}"` }] };
    }
  );

  server.tool(
    'handle_dialog',
    'Handle a browser dialog (alert, confirm, prompt)',
    {
      action: z.enum(['accept', 'dismiss']).describe('Accept or dismiss the dialog'),
      promptText: z.string().optional().describe('Text to enter for prompt dialogs'),
    },
    async ({ action, promptText }) => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      page.once('dialog', async (dialog) => {
        if (action === 'accept') {
          await dialog.accept(promptText);
        } else {
          await dialog.dismiss();
        }
      });
      return {
        content: [{ type: 'text', text: `Dialog handler set to ${action}. It will handle the next dialog that appears.` }],
      };
    }
  );
}
```

**Step 2: Add import to index.ts**

Add to `/home/rob/dev/chrome-cdp-mcp/src/index.ts` after the navigation import:

```typescript
import { registerInteractionTools } from './tools/interaction.js';
```

Add after `registerNavigationTools(server);`:

```typescript
registerInteractionTools(server);
```

**Step 3: Verify it compiles**

Run: `cd /home/rob/dev/chrome-cdp-mcp && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
cd /home/rob/dev/chrome-cdp-mcp
git add src/tools/interaction.ts src/index.ts
git commit -m "feat: add interaction tools (click, type, fill, select, keys, hover, scroll, upload, dialog)"
```

---

### Task 5: Build reading tools

**Files:**
- Create: `/home/rob/dev/chrome-cdp-mcp/src/tools/reading.ts`
- Modify: `/home/rob/dev/chrome-cdp-mcp/src/index.ts`

**Step 1: Create reading tools**

```typescript
// /home/rob/dev/chrome-cdp-mcp/src/tools/reading.ts
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getConnection, getConsoleLogs, getNetworkLogs, clearConsoleLogs, clearNetworkLogs } from '../chrome.js';
import type { PageInfo } from '../types.js';

export function registerReadingTools(server: McpServer): void {
  server.tool(
    'screenshot',
    'Take a screenshot of the current page or a specific element',
    {
      selector: z.string().optional().describe('CSS selector to screenshot (omit for full page)'),
      fullPage: z.boolean().optional().describe('Capture the full scrollable page (default: false)'),
    },
    async ({ selector, fullPage }) => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      let buffer: Buffer;
      if (selector) {
        buffer = await page.locator(selector).screenshot();
      } else {
        buffer = await page.screenshot({ fullPage: fullPage ?? false });
      }
      return {
        content: [{
          type: 'image',
          data: buffer.toString('base64'),
          mimeType: 'image/png',
        }],
      };
    }
  );

  server.tool(
    'snapshot',
    'Get an accessibility/ARIA snapshot of the page (structured text representation)',
    {},
    async () => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      const snapshot = await page.accessibility.snapshot();
      return {
        content: [{ type: 'text', text: JSON.stringify(snapshot, null, 2) }],
      };
    }
  );

  server.tool(
    'get_text',
    'Get the text content of an element',
    { selector: z.string().describe('CSS selector of the element') },
    async ({ selector }) => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      const text = await page.locator(selector).textContent();
      return { content: [{ type: 'text', text: text ?? '' }] };
    }
  );

  server.tool(
    'evaluate',
    'Execute JavaScript in the browser and return the result',
    { script: z.string().describe('JavaScript code to execute in the browser context') },
    async ({ script }) => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      const result = await page.evaluate(script);
      return {
        content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'console_messages',
    'Get browser console messages (logs, warnings, errors)',
    {
      clear: z.boolean().optional().describe('Clear the log after reading (default: false)'),
    },
    async ({ clear }) => {
      const logs = getConsoleLogs();
      const result = logs.map((l) => `[${l.type}] ${l.text}`).join('\n');
      if (clear) clearConsoleLogs();
      return {
        content: [{ type: 'text', text: result || 'No console messages captured.' }],
      };
    }
  );

  server.tool(
    'network_requests',
    'Get captured network requests',
    {
      clear: z.boolean().optional().describe('Clear the log after reading (default: false)'),
    },
    async ({ clear }) => {
      const logs = getNetworkLogs();
      const result = logs
        .map((l) => `${l.method} ${l.status} ${l.url} (${l.resourceType}, ${l.duration}ms, ${l.size}b)`)
        .join('\n');
      if (clear) clearNetworkLogs();
      return {
        content: [{ type: 'text', text: result || 'No network requests captured.' }],
      };
    }
  );

  server.tool(
    'get_page_info',
    'Get current page URL, title, and meta tags',
    {},
    async () => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      const info: PageInfo = await page.evaluate(() => {
        const metaTags: Record<string, string> = {};
        document.querySelectorAll('meta').forEach((el) => {
          const name = el.getAttribute('name') || el.getAttribute('property') || '';
          const content = el.getAttribute('content') || '';
          if (name && content) metaTags[name] = content;
        });
        return {
          url: window.location.href,
          title: document.title,
          meta: metaTags,
        };
      });
      return { content: [{ type: 'text', text: JSON.stringify(info, null, 2) }] };
    }
  );

  server.tool(
    'get_attributes',
    'Get all attributes of an element',
    { selector: z.string().describe('CSS selector of the element') },
    async ({ selector }) => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      const attrs = await page.locator(selector).first().evaluate((el) => {
        const result: Record<string, string> = {};
        for (const attr of el.attributes) {
          result[attr.name] = attr.value;
        }
        return result;
      });
      return { content: [{ type: 'text', text: JSON.stringify(attrs, null, 2) }] };
    }
  );

  server.tool(
    'get_computed_styles',
    'Get computed CSS styles of an element',
    {
      selector: z.string().describe('CSS selector of the element'),
      properties: z.array(z.string()).optional().describe('Specific CSS properties to get (omit for all)'),
    },
    async ({ selector, properties }) => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      const styles = await page.locator(selector).first().evaluate(
        (el, props) => {
          const computed = window.getComputedStyle(el);
          if (props && props.length > 0) {
            const result: Record<string, string> = {};
            for (const p of props) {
              result[p] = computed.getPropertyValue(p);
            }
            return result;
          }
          const result: Record<string, string> = {};
          for (let i = 0; i < computed.length; i++) {
            const prop = computed[i]!;
            result[prop] = computed.getPropertyValue(prop);
          }
          return result;
        },
        properties
      );
      return { content: [{ type: 'text', text: JSON.stringify(styles, null, 2) }] };
    }
  );

  server.tool(
    'is_visible',
    'Check if an element is visible on the page',
    { selector: z.string().describe('CSS selector of the element') },
    async ({ selector }) => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      const visible = await page.locator(selector).first().isVisible();
      return { content: [{ type: 'text', text: String(visible) }] };
    }
  );
}
```

**Step 2: Add import to index.ts**

Add import and register call for `registerReadingTools`.

**Step 3: Verify it compiles**

Run: `cd /home/rob/dev/chrome-cdp-mcp && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
cd /home/rob/dev/chrome-cdp-mcp
git add src/tools/reading.ts src/index.ts
git commit -m "feat: add reading tools (screenshot, snapshot, text, evaluate, console, network, page info, attrs, styles, visibility)"
```

---

### Task 6: Build state tools

**Files:**
- Create: `/home/rob/dev/chrome-cdp-mcp/src/tools/state.ts`
- Modify: `/home/rob/dev/chrome-cdp-mcp/src/index.ts`

**Step 1: Create state tools**

```typescript
// /home/rob/dev/chrome-cdp-mcp/src/tools/state.ts
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getConnection } from '../chrome.js';

export function registerStateTools(server: McpServer): void {
  server.tool(
    'get_cookies',
    'Get browser cookies for the current page',
    {
      name: z.string().optional().describe('Filter by cookie name'),
    },
    async ({ name }) => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      const cookies = await page.context().cookies();
      const filtered = name ? cookies.filter((c) => c.name === name) : cookies;
      return { content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }] };
    }
  );

  server.tool(
    'set_cookie',
    'Set a browser cookie',
    {
      name: z.string().describe('Cookie name'),
      value: z.string().describe('Cookie value'),
      domain: z.string().optional().describe('Cookie domain'),
      path: z.string().optional().describe('Cookie path (default: /)'),
    },
    async ({ name, value, domain, path }) => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      const url = page.url();
      const cookieDomain = domain || new URL(url).hostname;
      await page.context().addCookies([{
        name,
        value,
        domain: cookieDomain,
        path: path || '/',
      }]);
      return { content: [{ type: 'text', text: `Set cookie "${name}" = "${value}"` }] };
    }
  );

  server.tool(
    'get_local_storage',
    'Get a value from localStorage',
    {
      key: z.string().optional().describe('Key to get (omit for all keys)'),
    },
    async ({ key }) => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      if (key) {
        const value = await page.evaluate((k) => localStorage.getItem(k), key);
        return { content: [{ type: 'text', text: value ?? 'null' }] };
      }
      const all = await page.evaluate(() => {
        const result: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k) result[k] = localStorage.getItem(k) ?? '';
        }
        return result;
      });
      return { content: [{ type: 'text', text: JSON.stringify(all, null, 2) }] };
    }
  );

  server.tool(
    'set_local_storage',
    'Set a value in localStorage',
    {
      key: z.string().describe('Key to set'),
      value: z.string().describe('Value to set'),
    },
    async ({ key, value }) => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value] as const);
      return { content: [{ type: 'text', text: `Set localStorage "${key}" = "${value}"` }] };
    }
  );
}
```

**Step 2: Add import to index.ts**

Add import and register call for `registerStateTools`.

**Step 3: Verify and commit**

Run: `cd /home/rob/dev/chrome-cdp-mcp && npx tsc --noEmit`

```bash
cd /home/rob/dev/chrome-cdp-mcp
git add src/tools/state.ts src/index.ts
git commit -m "feat: add state tools (cookies, localStorage)"
```

---

### Task 7: Build viewport tools

**Files:**
- Create: `/home/rob/dev/chrome-cdp-mcp/src/tools/viewport.ts`
- Modify: `/home/rob/dev/chrome-cdp-mcp/src/index.ts`

**Step 1: Create viewport tools**

```typescript
// /home/rob/dev/chrome-cdp-mcp/src/tools/viewport.ts
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getConnection } from '../chrome.js';

const DEVICES: Record<string, { width: number; height: number; userAgent?: string; deviceScaleFactor?: number }> = {
  'iphone-12': { width: 390, height: 844, deviceScaleFactor: 3 },
  'iphone-14': { width: 393, height: 852, deviceScaleFactor: 3 },
  'iphone-14-pro-max': { width: 430, height: 932, deviceScaleFactor: 3 },
  'ipad': { width: 768, height: 1024, deviceScaleFactor: 2 },
  'ipad-pro': { width: 1024, height: 1366, deviceScaleFactor: 2 },
  'pixel-7': { width: 412, height: 915, deviceScaleFactor: 2.625 },
  'galaxy-s21': { width: 360, height: 800, deviceScaleFactor: 3 },
  'desktop-hd': { width: 1920, height: 1080 },
  'desktop-4k': { width: 3840, height: 2160 },
  'laptop': { width: 1366, height: 768 },
};

export function registerViewportTools(server: McpServer): void {
  server.tool(
    'resize',
    'Resize the browser viewport',
    {
      width: z.number().describe('Viewport width in pixels'),
      height: z.number().describe('Viewport height in pixels'),
    },
    async ({ width, height }) => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      await page.setViewportSize({ width, height });
      return { content: [{ type: 'text', text: `Resized viewport to ${width}x${height}` }] };
    }
  );

  server.tool(
    'emulate_device',
    'Emulate a mobile device viewport',
    {
      device: z.string().describe(
        `Device name: ${Object.keys(DEVICES).join(', ')}`
      ),
    },
    async ({ device }) => {
      const deviceConfig = DEVICES[device.toLowerCase()];
      if (!deviceConfig) {
        return {
          content: [{ type: 'text', text: `Unknown device "${device}". Available: ${Object.keys(DEVICES).join(', ')}` }],
          isError: true,
        };
      }
      const conn = await getConnection();
      const page = await conn.getActivePage();
      await page.setViewportSize({ width: deviceConfig.width, height: deviceConfig.height });
      return {
        content: [{ type: 'text', text: `Emulating ${device} (${deviceConfig.width}x${deviceConfig.height})` }],
      };
    }
  );
}
```

**Step 2: Add import to index.ts, verify, commit**

```bash
cd /home/rob/dev/chrome-cdp-mcp && npx tsc --noEmit
git add src/tools/viewport.ts src/index.ts
git commit -m "feat: add viewport tools (resize, emulate device)"
```

---

### Task 8: Build tabs tools

**Files:**
- Create: `/home/rob/dev/chrome-cdp-mcp/src/tools/tabs.ts`
- Modify: `/home/rob/dev/chrome-cdp-mcp/src/index.ts`

**Step 1: Create tabs tools**

```typescript
// /home/rob/dev/chrome-cdp-mcp/src/tools/tabs.ts
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getConnection } from '../chrome.js';

export function registerTabsTools(server: McpServer): void {
  server.tool(
    'list_tabs',
    'List all open browser tabs',
    {},
    async () => {
      const conn = await getConnection();
      const contexts = conn.browser.contexts();
      const tabs: { index: number; url: string; title: string }[] = [];
      let index = 0;
      for (const ctx of contexts) {
        for (const page of ctx.pages()) {
          tabs.push({
            index,
            url: page.url(),
            title: await page.title(),
          });
          index++;
        }
      }
      return { content: [{ type: 'text', text: JSON.stringify(tabs, null, 2) }] };
    }
  );

  server.tool(
    'switch_tab',
    'Switch to a tab by index',
    { index: z.number().describe('Tab index (from list_tabs)') },
    async ({ index }) => {
      const conn = await getConnection();
      const pages = conn.browser.contexts().flatMap((ctx) => ctx.pages());
      if (index < 0 || index >= pages.length) {
        return {
          content: [{ type: 'text', text: `Invalid tab index ${index}. ${pages.length} tabs open.` }],
          isError: true,
        };
      }
      const page = pages[index]!;
      await page.bringToFront();
      return { content: [{ type: 'text', text: `Switched to tab ${index}: ${page.url()}` }] };
    }
  );
}
```

**Step 2: Add import to index.ts, verify, commit**

```bash
cd /home/rob/dev/chrome-cdp-mcp && npx tsc --noEmit
git add src/tools/tabs.ts src/index.ts
git commit -m "feat: add tab management tools (list, switch)"
```

---

### Task 9: Build waiting tools

**Files:**
- Create: `/home/rob/dev/chrome-cdp-mcp/src/tools/waiting.ts`
- Modify: `/home/rob/dev/chrome-cdp-mcp/src/index.ts`

**Step 1: Create waiting tools**

```typescript
// /home/rob/dev/chrome-cdp-mcp/src/tools/waiting.ts
import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getConnection } from '../chrome.js';

export function registerWaitingTools(server: McpServer): void {
  server.tool(
    'wait_for',
    'Wait for an element to appear or a condition to be met',
    {
      selector: z.string().optional().describe('CSS selector to wait for'),
      state: z.enum(['visible', 'hidden', 'attached', 'detached']).optional().describe('Element state to wait for (default: visible)'),
      timeout: z.number().optional().describe('Max wait time in ms (default: 10000)'),
    },
    async ({ selector, state, timeout }) => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      if (selector) {
        await page.locator(selector).waitFor({
          state: state ?? 'visible',
          timeout: timeout ?? 10000,
        });
        return { content: [{ type: 'text', text: `Element "${selector}" is ${state ?? 'visible'}` }] };
      }
      return { content: [{ type: 'text', text: 'No selector provided' }], isError: true };
    }
  );

  server.tool(
    'wait_for_navigation',
    'Wait for a page navigation to complete',
    {
      timeout: z.number().optional().describe('Max wait time in ms (default: 30000)'),
    },
    async ({ timeout }) => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      await page.waitForLoadState('domcontentloaded', { timeout: timeout ?? 30000 });
      return { content: [{ type: 'text', text: `Navigation complete: ${page.url()}` }] };
    }
  );

  server.tool(
    'wait_for_network_idle',
    'Wait until no network requests are pending',
    {
      timeout: z.number().optional().describe('Max wait time in ms (default: 10000)'),
    },
    async ({ timeout }) => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      await page.waitForLoadState('networkidle', { timeout: timeout ?? 10000 });
      return { content: [{ type: 'text', text: 'Network is idle' }] };
    }
  );
}
```

**Step 2: Add import to index.ts, verify, commit**

```bash
cd /home/rob/dev/chrome-cdp-mcp && npx tsc --noEmit
git add src/tools/waiting.ts src/index.ts
git commit -m "feat: add waiting tools (wait for element, navigation, network idle)"
```

---

### Task 10: Build export tools

**Files:**
- Create: `/home/rob/dev/chrome-cdp-mcp/src/tools/export.ts`
- Modify: `/home/rob/dev/chrome-cdp-mcp/src/index.ts`

**Step 1: Create export tools**

```typescript
// /home/rob/dev/chrome-cdp-mcp/src/tools/export.ts
import { z } from 'zod';
import { writeFileSync } from 'fs';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getConnection } from '../chrome.js';

export function registerExportTools(server: McpServer): void {
  server.tool(
    'save_as_pdf',
    'Save the current page as a PDF file',
    {
      path: z.string().describe('Absolute file path to save the PDF'),
      format: z.enum(['Letter', 'A4', 'Legal', 'Tabloid']).optional().describe('Paper format (default: Letter)'),
    },
    async ({ path, format }) => {
      const conn = await getConnection();
      const page = await conn.getActivePage();
      const pdf = await page.pdf({
        format: format ?? 'Letter',
        printBackground: true,
      });
      writeFileSync(path, pdf);
      return { content: [{ type: 'text', text: `Saved PDF to ${path}` }] };
    }
  );
}
```

**Step 2: Add import to index.ts, verify, commit**

```bash
cd /home/rob/dev/chrome-cdp-mcp && npx tsc --noEmit
git add src/tools/export.ts src/index.ts
git commit -m "feat: add export tools (save as PDF)"
```

---

### Task 11: Create README and finalize index.ts

**Files:**
- Create: `/home/rob/dev/chrome-cdp-mcp/README.md`
- Verify: `/home/rob/dev/chrome-cdp-mcp/src/index.ts` has all imports

**Step 1: Verify final index.ts looks correct**

The final `src/index.ts` should have all 8 tool group imports and register calls:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerNavigationTools } from './tools/navigation.js';
import { registerInteractionTools } from './tools/interaction.js';
import { registerReadingTools } from './tools/reading.js';
import { registerStateTools } from './tools/state.js';
import { registerViewportTools } from './tools/viewport.js';
import { registerTabsTools } from './tools/tabs.js';
import { registerWaitingTools } from './tools/waiting.js';
import { registerExportTools } from './tools/export.js';

const server = new McpServer({
  name: 'chrome-cdp-mcp',
  version: '1.0.0',
});

registerNavigationTools(server);
registerInteractionTools(server);
registerReadingTools(server);
registerStateTools(server);
registerViewportTools(server);
registerTabsTools(server);
registerWaitingTools(server);
registerExportTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Step 2: Create README.md**

Write a comprehensive README with:
- Project description
- Installation instructions
- Claude Code configuration
- Tool reference table
- WSL2 setup notes
- Environment variables

**Step 3: Commit**

```bash
cd /home/rob/dev/chrome-cdp-mcp
git add README.md src/index.ts
git commit -m "docs: add README and finalize server entry point"
```

---

### Task 12: Register MCP server with Claude Code

**Step 1: Add MCP server to Claude Code settings**

Run:
```bash
claude mcp add chrome-browser -- npx tsx /home/rob/dev/chrome-cdp-mcp/src/index.ts
```

Or manually add to `~/.claude/settings.json` under `mcpServers`:

```json
"chrome-browser": {
  "command": "npx",
  "args": ["tsx", "/home/rob/dev/chrome-cdp-mcp/src/index.ts"],
  "env": {
    "CHROME_PROFILE": "Default"
  }
}
```

**Step 2: Verify MCP server starts**

Restart Claude Code and verify the chrome-browser tools appear in the tool list.

**Step 3: Integration test**

Test the following sequence in Claude Code:
1. `navigate` to `http://localhost:3000` (or any URL)
2. `screenshot` — verify image comes back
3. `get_page_info` — verify title and URL
4. `console_messages` — verify console log capture
5. `list_tabs` — verify tab listing

---

### Task 13: Create GitHub repository and push

**Step 1: Create GitHub repo**

```bash
cd /home/rob/dev/chrome-cdp-mcp
gh repo create rspeciale0519/chrome-cdp-mcp --public --description "MCP server that connects Claude Code to your real Chrome browser via CDP" --source=. --remote=origin
```

**Step 2: Push**

```bash
git push -u origin main
```

---
