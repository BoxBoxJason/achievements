import * as vscode from 'vscode';
import * as path from 'node:path';
import * as os from 'node:os';
import * as fs from 'node:fs';

export const getMockContext = (): vscode.ExtensionContext => {
    // Assuming the tests are running from dist/test
    const extensionPath = path.resolve(__dirname, '../../');
    const storagePath = path.join(os.tmpdir(), 'achievements-test-storage-' + Math.random().toString(36).substring(7));

    if (!fs.existsSync(storagePath)) {
        fs.mkdirSync(storagePath, { recursive: true });
    }

    return {
        subscriptions: [],
        workspaceState: {
            get: () => undefined,
            update: () => Promise.resolve(),
            keys: () => []
        },
        globalState: {
            get: () => undefined,
            update: () => Promise.resolve(),
            keys: () => [],
            setKeysForSync: () => {}
        },
        extensionPath: extensionPath,
        storageUri: vscode.Uri.file(storagePath),
        globalStorageUri: vscode.Uri.file(storagePath),
        logUri: vscode.Uri.file(path.join(storagePath, 'log')),
        extensionUri: vscode.Uri.file(extensionPath),
        environmentVariableCollection: {} as any,
        extensionMode: vscode.ExtensionMode.Test,
        asAbsolutePath: (relativePath: string) => path.join(extensionPath, relativePath),
        storagePath: storagePath,
        globalStoragePath: storagePath,
        logPath: path.join(storagePath, 'log'),
        secrets: {
            get: () => Promise.resolve(undefined),
            store: () => Promise.resolve(),
            delete: () => Promise.resolve(),
            onDidChange: new vscode.EventEmitter<vscode.SecretStorageChangeEvent>().event
        },
        extension: {
            id: 'boxboxjason.achievements',
            extensionUri: vscode.Uri.file(extensionPath),
            extensionPath: extensionPath,
            isActive: true,
            packageJSON: {},
            exports: undefined,
            activate: () => Promise.resolve(),
            extensionKind: vscode.ExtensionKind.UI
        }
    } as unknown as vscode.ExtensionContext;
};

export const cleanupMockContext = (context: vscode.ExtensionContext) => {
    if (context.globalStorageUri && fs.existsSync(context.globalStorageUri.fsPath)) {
        try {
            fs.rmSync(context.globalStorageUri.fsPath, { recursive: true, force: true });
        } catch (err) {
            console.error(`Failed to cleanup mock context: ${err}`);
        }
    }
};
