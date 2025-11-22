import * as path from 'node:path';
import Mocha = require('mocha');
import * as fs from 'node:fs';

 
declare let global: any;

export async function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
        timeout: 10000 // Increase timeout for DB operations
    });

    const testsRoot = __dirname;

    return new Promise((resolve, reject) => {
        const testFiles: string[] = [];

        function findTests(dir: string) {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (stat.isDirectory()) {
                    findTests(filePath);
                } else if (file.endsWith('.test.js')) {
                    testFiles.push(filePath);
                }
            }
        }

        findTests(testsRoot);

        if (testFiles.length === 0) {
            reject(new Error('No test files found in ' + testsRoot));
            return;
        }

        for (const f of testFiles) {
            mocha.addFile(f);
        }

        try {
            // Run the mocha test
            mocha.run(async failures => {
                try {
                    // Coverage generation
                    if (global.__coverage__) {
                        // We need to find the project root.
                        // __dirname is dist/test
                        // projectRoot should be the workspace root
                        const projectRoot = path.resolve(__dirname, '..', '..');

                        const coverageDir = path.join(projectRoot, '.nyc_output');
                        if (!fs.existsSync(coverageDir)) {
                            fs.mkdirSync(coverageDir);
                        }
                        fs.writeFileSync(
                            path.join(coverageDir, 'coverage.json'),
                            JSON.stringify(global.__coverage__)
                        );
                        console.log('Coverage data written to ' + path.join(coverageDir, 'coverage.json'));
                    } else {
                        console.warn('No coverage data found in global scope.');
                    }
                } catch (err) {
                    console.error('Failed to generate coverage:', err);
                }

                if (failures > 0) {
                    reject(new Error(`${failures} tests failed.`));
                } else {
                    resolve();
                }
            });
        } catch (err) {
            console.error(err);
            reject(err);
        }
    });
}
