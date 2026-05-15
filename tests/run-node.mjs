// Headless test runner: runs the same tests as tests/test.html, in node.
// Useful for quick CLI verification and future CI hooks.
//
// Tests that touch DOM should stay browser-only — engine tests are pure
// and run fine here.

import './engine.test.js';
import { tests } from './assert.js';

let pass = 0, fail = 0;
for (const { name, fn } of tests) {
  try {
    await fn();
    console.log(`[32m✓[0m ${name}`);
    pass++;
  } catch (err) {
    console.log(`[31m✗[0m ${name}\n    ${err.message}`);
    fail++;
  }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
