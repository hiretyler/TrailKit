// Tests for the Quick Add parser (src/trailkit/parse.js).
// Pure and DOM-free, so these run in both the node and browser runners.

import { test, assert, assertEqual } from './assert.js';
import { parseGearLines, matchTypeToken, matchActivityToken, toKg } from '../src/trailkit/parse.js';

function row1(line){
  const { rows } = parseGearLines(line);
  assert(rows.length === 1, `expected 1 row for ${JSON.stringify(line)}, got ${rows.length}`);
  return rows[0];
}

function assertApprox(actual, expected, msg){
  if(Math.abs(actual - expected) > 1e-9){
    throw new Error(`${msg || 'expected approx'}: got ${actual}, want ~${expected}`);
  }
}

// ── Counts ──────────────────────────────────────────────────────
test('parse: 3x leading count', () => {
  const r = row1('3x wool socks');
  assertEqual(r.count, 3);
  assertEqual(r.type, 'Worn');
  assertApprox(r.weightKg, 0.08);
  assertEqual(r.name, 'Wool Socks');
  assertEqual(r.conf.type, 'guessed');
});

test('parse: 3 x leading count with spaces', () => {
  assertEqual(row1('3 x wool socks').count, 3);
});

test('parse: 3× leading count with U+00D7', () => {
  assertEqual(row1('3× wool socks').count, 3);
});

test('parse: trailing count x3', () => {
  const r = row1('wool socks x3');
  assertEqual(r.count, 3);
  assertEqual(r.name, 'Wool Socks');
});

test('parse: trailing count (x3)', () => {
  assertEqual(row1('wool socks (x3)').count, 3);
});

test('parse: bare line is count 1', () => {
  assertEqual(row1('wool socks').count, 1);
});

test('parse: bare number without x is part of the name', () => {
  const r = row1('550 cord');
  assertEqual(r.count, 1);
  assertEqual(r.name, '550 Cord');
  assertEqual(r.type, 'Item');
  assertEqual(r.conf.type, 'default');
});

test('parse: count capped at 20 sets capped flag', () => {
  const r = row1('100x zip ties');
  assertEqual(r.count, 20);
  assertEqual(r.capped, true);
});

test('parse: count expansion is not the parser\'s job', () => {
  const { rows } = parseGearLines('3x wool socks');
  assertEqual(rows.length, 1);
  assertEqual(rows[0].count, 3);
});

// ── Pipe fields ─────────────────────────────────────────────────
test('parse: count + type + activity pipe fields', () => {
  const r = row1('2 x wool socks | Worn | hike');
  assertEqual(r.count, 2);
  assertEqual(r.type, 'Worn');
  assertEqual(r.conf.type, 'given');
  assertEqual(r.activity, 'hike');
  assertEqual(r.conf.activity, 'given');
});

test('parse: pipe fields are order-independent', () => {
  const r = row1('wool socks | hike | Worn');
  assertEqual(r.type, 'Worn');
  assertEqual(r.conf.type, 'given');
  assertEqual(r.activity, 'hike');
});

test('parse: type and activity synonyms resolve', () => {
  assertEqual(row1('headlamp | emergency').type, 'Safety');
  assertEqual(row1('jersey | clothing | mtb').type, 'Worn');
  assertEqual(row1('jersey | clothing | mtb').activity, 'bike');
  assertEqual(matchTypeToken('First Aid'), 'Medical');
  assertEqual(matchActivityToken('Mountain Bike'), 'bike');
});

test('parse: pipe weight field with grams-misread guard', () => {
  assertApprox(row1('widget | 80g').weightKg, 0.08);
  assertApprox(row1('widget | 80kg').weightKg, 0.08, '80kg reads as grams misread');
  assertApprox(toKg(2, 'kg'), 2);
});

// ── Weight tokens in the name ───────────────────────────────────
test('parse: trailing weight token is read and stripped', () => {
  const r = row1('wool socks 80g');
  assertApprox(r.weightKg, 0.08);
  assertEqual(r.conf.weight, 'given');
  assertEqual(r.name, 'Wool Socks');
});

test('parse: multitool 140g', () => {
  const r = row1('multitool 140g');
  assertEqual(r.type, 'Tools');
  assertApprox(r.weightKg, 0.14);
  assertEqual(r.name, 'Multitool');
});

test('parse: lbs conversion', () => {
  const r = row1('tent 3lbs');
  assertApprox(r.weightKg, 3 * 0.4536);
  assertEqual(r.type, 'Item');
  assertEqual(r.icon, '⛺');
  assertEqual(r.name, 'Tent');
});

// ── Volume tokens in the name ───────────────────────────────────
test('parse: liters in a bottle name set capacity, name keeps token', () => {
  const r = row1('Nalgene 1L Wide Mouth');
  assertEqual(r.type, 'Bottle');
  assertApprox(r.capacityL, 1);
  assertEqual(r.name, 'Nalgene 1L Wide Mouth');
});

test('parse: oz reads as volume on a container', () => {
  const r = row1('Klean Kanteen 32oz');
  assertEqual(r.type, 'Bottle');
  assertApprox(r.capacityL, 0.95); // 32 * 0.0296, rounded for display
  assert(r.name.includes('32oz'), 'volume token stays in the name');
});

test('parse: explicit type overriding a starter name drops starter fields', () => {
  const r = row1('Headlamp | Backpack');
  assertEqual(r.type, 'Backpack');
  assertEqual(r.slots, 15, 'backpack default slots, not the starter headlamp slots');
  assertEqual(r.maxKg, 10, 'backpack default maxKg, never null');
  assertEqual(r.packSlots, 7);
});

test('parse: liters figure drives backpack slots', () => {
  const r = row1('30L daypack | Backpack');
  assertEqual(r.type, 'Backpack');
  assertEqual(r.conf.type, 'given');
  assertEqual(r.slots, 17);
  assertEqual(r.packSlots, 7);
  assertEqual(r.maxKg, 10);
  assertEqual(r.backpackBladder, true);
  assertEqual(r.backpackLeftBottle, true);
  assertEqual(r.backpackRightBottle, true);
});

test('parse: bladder defaults', () => {
  const r = row1('2L reservoir');
  assertEqual(r.type, 'Bladder');
  assertEqual(r.slots, 4);
  assertApprox(r.capacityL, 2);
});

// ── Icons, bullets, markers ─────────────────────────────────────
test('parse: leading emoji becomes the icon', () => {
  const r = row1('🔦 Headlamp | safety | ALL');
  assertEqual(r.icon, '🔦');
  assertEqual(r.conf.icon, 'given');
  assertEqual(r.type, 'Safety');
  assertEqual(r.activity, 'all');
  assertEqual(r.conf.activity, 'given');
});

test('parse: bullet marker stripped', () => {
  const r = row1('- 2 x Headlamp');
  assertEqual(r.count, 2);
  assertEqual(r.name, 'Headlamp');
});

test('parse: ordered list marker stripped', () => {
  const r = row1('1. Headlamp');
  assertEqual(r.count, 1);
  assertEqual(r.name, 'Headlamp');
});

// ── Starter item lookup ─────────────────────────────────────────
test('parse: starter item exact match restores curated record', () => {
  const r = row1('Headlamp');
  assertEqual(r.type, 'Safety');
  assertEqual(r.conf.type, 'given');
  assertEqual(r.icon, '🔦');
  assertApprox(r.weightKg, 0.09);
  assertEqual(r.slots, 1);
  assertEqual(r.desc, 'Rechargeable LED headlamp. Red night mode.');
});

test('parse: starter lookup is case-insensitive', () => {
  const r = row1('hydration bladder');
  assertEqual(r.type, 'Bladder');
  assertEqual(r.slots, 4);
  assertApprox(r.capacityL, 2);
});

// ── Names ───────────────────────────────────────────────────────
test('parse: title-case only when source is entirely lowercase', () => {
  assertEqual(row1('BD Spot 400').name, 'BD Spot 400');
  assertEqual(row1('wool socks').name, 'Wool Socks');
});

test('parse: activity defaults to the __default__ sentinel', () => {
  const r = row1('wool socks');
  assertEqual(r.activity, '__default__');
  assertEqual(r.conf.activity, 'default');
});

// ── Noise handling ──────────────────────────────────────────────
test('parse: preamble lines are ignored, raw kept', () => {
  const { rows, ignored } = parseGearLines('Here is your gear list:');
  assertEqual(rows.length, 0);
  assertEqual(ignored.length, 1);
  assertEqual(ignored[0].raw, 'Here is your gear list:');
});

test('parse: fences, headers, and rules dropped silently', () => {
  const { rows, ignored } = parseGearLines('```\n## Hiking\n---\n|---|---|');
  assertEqual(rows.length, 0);
  assertEqual(ignored.length, 0);
});

test('parse: colon-ended line without pipe or count is ignored', () => {
  const { rows, ignored } = parseGearLines('Big trip stuff:');
  assertEqual(rows.length, 0);
  assertEqual(ignored.length, 1);
});

test('parse: lines with no letters are ignored', () => {
  const { rows, ignored } = parseGearLines('!!!');
  assertEqual(rows.length, 0);
  assertEqual(ignored.length, 1);
});

test('parse: line indexes map to the source lines', () => {
  const { rows, ignored } = parseGearLines('wool socks\n\nOkay, here you go\n2x headlamp');
  assertEqual(rows.length, 2);
  assertEqual(rows[0].lineIndex, 0);
  assertEqual(rows[1].lineIndex, 3);
  assertEqual(ignored.length, 1);
  assertEqual(ignored[0].lineIndex, 2);
});
