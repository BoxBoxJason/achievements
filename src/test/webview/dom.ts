import { act, ReactNode } from "react";
import type { Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import { createRequire } from "node:module";
import { PostMessage } from "../../views/icons";

/**
 * Minimal browser environment for the React webview tests
 *
 * The tests run inside the VS Code extension host, which has no DOM. The
 * jsdom globals are only installed for the duration of a suite (suiteSetup /
 * suiteTeardown): other suites of the same process rely on there being no
 * window or document.
 */

// Globals React DOM and the webview components read
const GLOBAL_KEYS = ["window", "document", "navigator"] as const;

export interface WebviewDom {
  dom: JSDOM;
  // Messages posted by the webview through window.vscode.postMessage, parsed
  posted: PostMessage[];
  // Listeners currently registered for "message" events on window
  messageListeners: Set<EventListenerOrEventListenerObject>;
}

let current: WebviewDom | undefined;
let savedGlobals = new Map<string, PropertyDescriptor | undefined>();
let createRoot: typeof import("react-dom/client").createRoot | undefined;

const globals = globalThis as unknown as Record<string, unknown>;

export function installDom(): WebviewDom {
  if (current) {
    throw new Error("The webview DOM is already installed");
  }
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });
  const posted: PostMessage[] = [];
  const messageListeners = new Set<EventListenerOrEventListenerObject>();
  const window = dom.window;

  window.vscode = {
    postMessage: (message: string) => {
      posted.push(JSON.parse(message) as PostMessage);
    },
  };
  window.imageUris = {
    PUSHEEN_ERROR: "error.png",
    TEST_ICON: "test-icon.png",
  };

  // Track the "message" listeners to catch leaked or duplicated ones
  const addEventListener = window.addEventListener.bind(window);
  const removeEventListener = window.removeEventListener.bind(window);
  window.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
    if (type === "message") {
      messageListeners.add(listener);
    }
    addEventListener(type, listener, options);
  }) as typeof window.addEventListener;
  window.removeEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) => {
    if (type === "message") {
      messageListeners.delete(listener);
    }
    removeEventListener(type, listener, options);
  }) as typeof window.removeEventListener;

  savedGlobals = new Map();
  for (const key of GLOBAL_KEYS) {
    savedGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: window[key],
    });
  }
  savedGlobals.set(
    "IS_REACT_ACT_ENVIRONMENT",
    Object.getOwnPropertyDescriptor(globalThis, "IS_REACT_ACT_ENVIRONMENT"),
  );
  globals.IS_REACT_ACT_ENVIRONMENT = true;

  current = { dom, posted, messageListeners };
  // React DOM checks for a DOM when its module is first evaluated, so it is
  // only loaded once the globals exist
  createRoot ??= requireWithDom<typeof import("react-dom/client")>("react-dom/client").createRoot;
  return current;
}

export function uninstallDom(): void {
  for (const [key, descriptor] of savedGlobals) {
    if (descriptor) {
      Object.defineProperty(globalThis, key, descriptor);
    } else {
      delete globals[key];
    }
  }
  savedGlobals = new Map();
  current?.dom.window.close();
  current = undefined;
}

/**
 * Loads a module that needs the DOM when it is evaluated (React DOM, the
 * webview entry point), once installDom has been called. A static import
 * would load it with the other test files, before any suite runs.
 *
 * @param id - Module id, relative paths are resolved from this directory
 */
export function requireWithDom<T>(id: string): T {
  if (!current) {
    throw new Error("The webview DOM is not installed");
  }
  return createRequire(__filename)(id) as T;
}

function getDom(): WebviewDom {
  if (!current) {
    throw new Error("The webview DOM is not installed");
  }
  return current;
}

/**
 * A React root rendered in a fresh container of the document
 */
export class Rendered {
  readonly container: HTMLElement;
  private readonly root: Root;

  constructor() {
    if (!createRoot) {
      throw new Error("The webview DOM is not installed");
    }
    this.container = getDom().dom.window.document.createElement("div");
    getDom().dom.window.document.body.appendChild(this.container);
    this.root = createRoot(this.container);
  }

  render(element: ReactNode): void {
    act(() => {
      this.root.render(element);
    });
  }

  unmount(): void {
    act(() => {
      this.root.unmount();
    });
    this.container.remove();
  }

  get text(): string {
    return this.container.textContent ?? "";
  }

  query<T extends Element = HTMLElement>(selector: string): T | null {
    return this.container.querySelector<T>(selector) as T | null;
  }

  queryAll<T extends Element = HTMLElement>(selector: string): T[] {
    return Array.from(this.container.querySelectorAll<T>(selector)) as T[];
  }

  // Button whose text content or aria-label is exactly the given one
  button(name: string): HTMLButtonElement {
    const button = this.queryAll<HTMLButtonElement>("button").find(
      (candidate) =>
        candidate.textContent?.trim() === name ||
        candidate.getAttribute("aria-label") === name,
    );
    if (!button) {
      throw new Error(`No button named "${name}"`);
    }
    return button;
  }
}

export function render(element: ReactNode): Rendered {
  const rendered = new Rendered();
  rendered.render(element);
  return rendered;
}

/**
 * Sends a message from the extension to the webview, like
 * panel.webview.postMessage does
 */
export function receive(command: string, data: unknown): void {
  const window = getDom().dom.window;
  act(() => {
    window.dispatchEvent(new window.MessageEvent("message", { data: { command, data } }));
  });
}

export function click(element: HTMLElement): void {
  const window = getDom().dom.window;
  act(() => {
    element.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
  });
}

/**
 * Changes the value of an input or select like a user would, so that React
 * sees it (its value tracker ignores direct assignments of the value prop)
 */
export function changeValue(element: HTMLInputElement | HTMLSelectElement, value: string): void {
  const window = getDom().dom.window;
  const prototype =
    element instanceof window.HTMLSelectElement
      ? window.HTMLSelectElement.prototype
      : window.HTMLInputElement.prototype;
  const setValue = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  act(() => {
    setValue?.call(element, value);
    element.dispatchEvent(
      new window.Event(element instanceof window.HTMLSelectElement ? "change" : "input", {
        bubbles: true,
      }),
    );
  });
}

/**
 * Lets real time pass (debounces) and flushes the resulting React updates
 */
export async function wait(ms: number): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

/**
 * Messages posted by the webview for the given command, oldest first
 */
export function postedFor(command: string): PostMessage[] {
  return getDom().posted.filter((message) => message.command === command);
}

export function lastPostedFor<T = Record<string, unknown>>(command: string): T {
  const messages = postedFor(command);
  if (messages.length === 0) {
    throw new Error(`Nothing was posted for ${command}`);
  }
  return messages[messages.length - 1].data as T;
}
