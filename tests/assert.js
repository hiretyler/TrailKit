// Tiny assertion helpers for the in-browser test runner.
// No dependencies. Tests register themselves with `test(name, fn)`,
// then `runAll(rootEl)` runs them and renders pass/fail rows.

export const tests = [];

export function test(name, fn) {
  tests.push({ name, fn });
}

export function assert(cond, msg = 'assertion failed') {
  if (!cond) throw new Error(msg);
}

export function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'expected equal'}: got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
  }
}

export function assertDeepEqual(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${msg || 'expected deep-equal'}:\n  got  ${a}\n  want ${b}`);
}

export function assertThrows(fn, msg = 'expected throw') {
  let threw = false;
  try { fn(); } catch (e) { threw = true; }
  if (!threw) throw new Error(msg);
}

export async function runAll(rootEl) {
  let pass = 0, fail = 0;
  rootEl.innerHTML = '';

  for (const { name, fn } of tests) {
    const row = document.createElement('div');
    row.className = 'row';
    try {
      await fn();
      row.classList.add('pass');
      row.textContent = `✓ ${name}`;
      pass++;
    } catch (err) {
      row.classList.add('fail');
      row.innerHTML = `✗ <strong>${name}</strong><br><span class="err">${err.message}</span>`;
      console.error(name, err);
      fail++;
    }
    rootEl.appendChild(row);
  }

  const summary = document.createElement('div');
  summary.className = 'summary';
  summary.textContent = `${pass} passed, ${fail} failed`;
  if (fail > 0) summary.classList.add('fail');
  else summary.classList.add('pass');
  rootEl.appendChild(summary);
}
