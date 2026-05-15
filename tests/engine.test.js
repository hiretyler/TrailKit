// Tests for the Planner Engine modules (src/engine/*).
// These are the most reusable parts of the codebase and the highest-value
// surface to lock down before refactoring TrailKit domain code.

import { test, assert, assertEqual, assertDeepEqual } from './assert.js';

import { PlannerStore } from '../src/engine/store.js';
import { RulesEngine }  from '../src/engine/rules.js';
import { StatsEngine }  from '../src/engine/stats.js';

// ── PlannerStore ────────────────────────────────────────────────
test('PlannerStore: initial state is preserved', () => {
  const s = new PlannerStore({ count: 0, name: 'x' });
  assertEqual(s.getState().count, 0);
  assertEqual(s.getState().name, 'x');
});

test('PlannerStore: getState returns a shallow copy', () => {
  const s = new PlannerStore({ items: [1, 2] });
  const got = s.getState();
  got.items.push(99);  // mutate the copy
  // Internal state's array reference is the same — that's intentional, only
  // top-level keys are copied. Locking this contract in writing.
  assertEqual(s.getState().items.length, 3, 'top-level shallow copy: nested arrays share refs');
});

test('PlannerStore: dispatch runs registered reducer', () => {
  const s = new PlannerStore({ n: 0 });
  s.on('INC', (state, action) => ({ n: state.n + (action.by || 1) }));
  s.dispatch({ type: 'INC' });
  assertEqual(s.getState().n, 1);
  s.dispatch({ type: 'INC', by: 5 });
  assertEqual(s.getState().n, 6);
});

test('PlannerStore: unknown action types are no-ops', () => {
  const s = new PlannerStore({ n: 0 });
  s.on('INC', (state) => ({ n: state.n + 1 }));
  s.dispatch({ type: 'NOPE' });
  assertEqual(s.getState().n, 0);
});

test('PlannerStore: subscribers receive new state after each dispatch', () => {
  const s = new PlannerStore({ n: 0 });
  s.on('INC', (state) => ({ n: state.n + 1 }));
  const seen = [];
  s.subscribe((state, action) => seen.push({ n: state.n, type: action.type }));
  s.dispatch({ type: 'INC' });
  s.dispatch({ type: 'INC' });
  assertDeepEqual(seen, [{ n: 1, type: 'INC' }, { n: 2, type: 'INC' }]);
});

test('PlannerStore: unsubscribe stops further notifications', () => {
  const s = new PlannerStore({ n: 0 });
  s.on('INC', (state) => ({ n: state.n + 1 }));
  let calls = 0;
  const unsub = s.subscribe(() => calls++);
  s.dispatch({ type: 'INC' });
  unsub();
  s.dispatch({ type: 'INC' });
  assertEqual(calls, 1);
});

test('PlannerStore: middleware can observe actions before reducer runs', () => {
  const s = new PlannerStore({ n: 0 });
  s.on('INC', (state) => ({ n: state.n + 1 }));
  const log = [];
  s.use((action, getState, next) => {
    log.push({ before: getState().n, type: action.type });
    next(action);
    log.push({ after: getState().n });
  });
  s.dispatch({ type: 'INC' });
  assertDeepEqual(log, [{ before: 0, type: 'INC' }, { after: 1 }]);
});

test('PlannerStore: _patch bypasses reducers (for restore)', () => {
  const s = new PlannerStore({ a: 1, b: 2 });
  s._patch({ a: 99 });
  assertEqual(s.getState().a, 99);
  assertEqual(s.getState().b, 2);
});

test('PlannerStore: reducer returning falsy leaves state unchanged', () => {
  const s = new PlannerStore({ n: 0 });
  s.on('TOUCH', () => null);
  s.dispatch({ type: 'TOUCH' });
  assertEqual(s.getState().n, 0);
});

// ── RulesEngine ─────────────────────────────────────────────────
// Each test creates a fresh rules registry — RulesEngine is a singleton in
// the original code, but we treat _rules as test-replaceable.
function freshRules() {
  return { ...RulesEngine, _rules: [] };
}

test('RulesEngine: empty registry passes everything', () => {
  const re = freshRules();
  const result = re.validate({}, 'main', {});
  assertEqual(result.valid, true);
  assertEqual(result.reason, null);
});

test('RulesEngine: first failing rule short-circuits', () => {
  const re = freshRules();
  let secondRan = false;
  re.register(() => ({ valid: false, reason: 'first says no' }));
  re.register(() => { secondRan = true; return { valid: true }; });
  const result = re.validate({}, 'main', {});
  assertEqual(result.valid, false);
  assertEqual(result.reason, 'first says no');
  assert(!secondRan, 'second rule must not run after first fails');
});

test('RulesEngine: all-pass returns valid:true', () => {
  const re = freshRules();
  re.register(() => ({ valid: true }));
  re.register(() => ({ valid: true }));
  assertEqual(re.validate({}, 'main', {}).valid, true);
});

test('RulesEngine: rule receives item, zone, and state', () => {
  const re = freshRules();
  let received = null;
  re.register((item, zone, state) => { received = { item, zone, state }; return { valid: true }; });
  re.validate({ id: 'x' }, 'worn', { foo: 1 });
  assertDeepEqual(received, { item: { id: 'x' }, zone: 'worn', state: { foo: 1 } });
});

// ── StatsEngine ─────────────────────────────────────────────────
test('StatsEngine.sumBy: sums numeric property', () => {
  assertEqual(StatsEngine.sumBy([{w:1}, {w:2}, {w:3}], 'w'), 6);
});

test('StatsEngine.sumBy: non-numeric values contribute 0', () => {
  assertEqual(StatsEngine.sumBy([{w:1}, {w:'x'}, {w:undefined}, {w:2}], 'w'), 3);
});

test('StatsEngine.sumBy: empty list returns 0', () => {
  assertEqual(StatsEngine.sumBy([], 'w'), 0);
});

test('StatsEngine.countBy: counts matching predicate', () => {
  assertEqual(StatsEngine.countBy([1, 2, 3, 4], n => n % 2 === 0), 2);
});

test('StatsEngine.groupBy: buckets by key', () => {
  const items = [{t:'a',v:1}, {t:'b',v:2}, {t:'a',v:3}];
  const out = StatsEngine.groupBy(items, i => i.t);
  assertDeepEqual(out, { a: [{t:'a',v:1}, {t:'a',v:3}], b: [{t:'b',v:2}] });
});

test('StatsEngine.totalWeightKg: sums weight by id list against inventory', () => {
  const inv = [{id:'a', weightKg:0.5}, {id:'b', weightKg:1.5}, {id:'c', weightKg:2.0}];
  assertEqual(StatsEngine.totalWeightKg(['a','c'], inv), 2.5);
});

test('StatsEngine.totalWeightKg: missing ids contribute 0', () => {
  const inv = [{id:'a', weightKg:0.5}];
  assertEqual(StatsEngine.totalWeightKg(['a','missing','also-missing'], inv), 0.5);
});

test('StatsEngine.totalWeightKg: empty id list returns 0', () => {
  assertEqual(StatsEngine.totalWeightKg([], [{id:'a', weightKg:1}]), 0);
});
