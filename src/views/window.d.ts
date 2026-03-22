declare global {
  interface Window {
    vscode: {
      postMessage: (message: string) => void;
    };
    imageUris?: Record<string, string>;
  }
}

export {};