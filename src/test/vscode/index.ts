import { readdir } from 'node:fs/promises';
import * as path from 'node:path';
import Mocha from 'mocha';

export async function run(): Promise<void> {
    // Create the mocha test
    const mocha = new Mocha({
        ui: 'tdd',
        color: true,
    });

    const testsRoot = path.resolve(__dirname);
    const files = (await readdir(testsRoot, { recursive: true })).filter((f) =>
        f.endsWith('.test.js')
    );

    // Add files to the test suite
    files.forEach((f) => {
        mocha.addFile(path.resolve(testsRoot, f));
    });

    try {
        return new Promise<void>((c, e) => {
            // Run the mocha test
            mocha.run((failures) => {
                if (failures > 0) {
                    e(new Error(`${failures} tests failed.`));
                } else {
                    c();
                }
            });
        });
    } catch (err) {
        console.error(err);
    }
}
