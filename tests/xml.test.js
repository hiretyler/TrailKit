// Tests for the .trailkit XML module (src/trailkit/xml.js).
// buildTrailkitXML is pure and runs everywhere; the parse/round-trip
// tests need DOMParser, so they register only in the browser runner
// (tests/test.html) and are skipped in node.

import { test, assert, assertEqual, assertDeepEqual } from './assert.js';
import { esc, buildTrailkitXML, parseTrailkitDoc } from '../src/trailkit/xml.js';

const FIXTURE = {
  version: '9.99',
  inventory: [
    {id:'u_pack', name:'Big <Pack> & "Friends"', icon:'🎒', type:'Backpack',
     activity:'hike', slots:12, weightKg:0.9, capacityL:null, maxKg:15, desc:'A & B'},
    {id:'u_bottle', name:'Bottle', icon:'🍶', type:'Bottle',
     activity:'all', slots:2, weightKg:0.15, capacityL:1, maxKg:null, desc:''},
    {id:'u_socks', name:'Socks', icon:'🧦', type:'Worn',
     activity:'hike,camp', slots:1, weightKg:0.08, capacityL:null, maxKg:null, desc:'wool'},
  ],
  userLoadouts: {
    hike: { 'day-out': { label:'Day Out', backpackId:'u_pack', bladderId:null,
      bottleLeft:'u_bottle', bottleRight:null, mainItems:['u_socks'], wornItems:[] } },
  },
  sports: ['hike','bike'],
};

test('xml: build escapes markup in item fields', () => {
  const x = buildTrailkitXML(FIXTURE);
  assert(x.includes('Big &lt;Pack&gt; &amp; &quot;Friends&quot;'), 'name should be escaped');
  assert(!x.includes('Big <Pack>'), 'raw markup must not survive');
});

test('xml: build emits the version comment and schema sections', () => {
  const x = buildTrailkitXML(FIXTURE);
  assert(x.includes('<!-- TrailKit v9.99 export -->'));
  assert(x.includes('<yourgear>') && x.includes('</yourgear>'));
  assert(x.includes('<loadouts>') && x.includes('</loadouts>'));
});

test('xml: special blocks match item type', () => {
  const x = buildTrailkitXML(FIXTURE);
  assert(x.includes('<backpack-maxload>15</backpack-maxload>'));
  assert(x.includes('<bottle-liters>1</bottle-liters>'));
  assert(!x.includes('bladder-liters'), 'no bladder in fixture');
});

test('xml: loadout slots serialize ids, empty slots stay empty tags', () => {
  const x = buildTrailkitXML(FIXTURE);
  assert(x.includes('<loadout-backpack><item>u_pack</item></loadout-backpack>'));
  assert(x.includes('<loadout-bladder></loadout-bladder>'));
  assert(x.includes('<loadout-activity>hike</loadout-activity>'));
});

test('xml: comma-list activities pass through verbatim', () => {
  assert(buildTrailkitXML(FIXTURE).includes('<activity>hike,camp</activity>'));
});

test('xml: esc handles null/undefined as empty', () => {
  assertEqual(esc(null), '');
  assertEqual(esc(undefined), '');
  assertEqual(esc('a<b'), 'a&lt;b');
});

// ── Round-trip (browser runner only - needs DOMParser) ──────────
if (typeof DOMParser !== 'undefined') {
  test('xml: build → parse round-trips items and loadouts', () => {
    const x = buildTrailkitXML(FIXTURE);
    const doc = new DOMParser().parseFromString(x, 'text/xml');
    assert(!doc.querySelector('parsererror'), 'output must be well-formed');
    const parsed = parseTrailkitDoc(doc);
    assertEqual(parsed.items.length, 3);
    assertEqual(parsed.items[0].name, 'Big <Pack> & "Friends"');
    assertEqual(parsed.items[0].maxKg, 15);
    assertEqual(parsed.items[1].capacityL, 1);
    assertEqual(parsed.items[2].activity, 'hike,camp');
    assertEqual(parsed.loadoutCount, 1);
    assertDeepEqual(parsed.loadoutsBySport.hike['day-out'].mainItems, ['u_socks']);
    assertEqual(parsed.loadoutsBySport.hike['day-out'].bottleLeft, 'u_bottle');
    assertEqual(parsed.loadoutsBySport.hike['day-out'].bladderId, null);
  });

  test('xml: parse dedupes intra-file duplicate item ids', () => {
    const x = buildTrailkitXML({ ...FIXTURE,
      inventory: [FIXTURE.inventory[0], FIXTURE.inventory[0]] });
    const doc = new DOMParser().parseFromString(x, 'text/xml');
    assertEqual(parseTrailkitDoc(doc).items.length, 1);
  });
}
