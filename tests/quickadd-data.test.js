// Invariants for the Quick Add starter data. The starter-loadout
// install path resolves references by curated item name through the
// sport's pack chip, so a reference outside that sport's STARTER_PACKS
// list silently drops from the installed loadout - these tests make
// that a build-time failure instead.

import { test, assert, assertEqual } from './assert.js';
import { STARTER_ITEMS, STARTER_PACKS, STARTER_LOADOUTS } from '../src/trailkit/quickadd-data.js';

const byId = id => STARTER_ITEMS.find(i => i.id === id);

function loadoutRefs(lo){
  return [lo.backpackId, lo.bladderId, lo.bottleLeft, lo.bottleRight,
    ...lo.mainItems, ...lo.wornItems].filter(Boolean);
}

test('data: starter pack ids all exist in STARTER_ITEMS', () => {
  for(const [sport, ids] of Object.entries(STARTER_PACKS)){
    for(const id of ids) assert(byId(id), `${sport}: unknown item ${id}`);
  }
});

test('data: every sport with a pack has a starter loadout', () => {
  for(const sport of Object.keys(STARTER_PACKS)){
    assert(STARTER_LOADOUTS[sport], `${sport}: no starter loadout`);
  }
});

test('data: starter loadouts only reference items in their sport pack', () => {
  for(const [sport, lo] of Object.entries(STARTER_LOADOUTS)){
    const pack = new Set(STARTER_PACKS[sport] || []);
    for(const id of loadoutRefs(lo)){
      assert(pack.has(id), `${sport}: ${id} not in that sport's STARTER_PACKS`);
    }
  }
});

test('data: starter loadout special slots hold matching types', () => {
  for(const [sport, lo] of Object.entries(STARTER_LOADOUTS)){
    assertEqual(byId(lo.backpackId).type, 'Backpack', `${sport}: backpackId`);
    if(lo.bladderId)  assertEqual(byId(lo.bladderId).type,  'Bladder', `${sport}: bladderId`);
    if(lo.bottleLeft)  assertEqual(byId(lo.bottleLeft).type,  'Bottle',  `${sport}: bottleLeft`);
    if(lo.bottleRight) assertEqual(byId(lo.bottleRight).type, 'Bottle',  `${sport}: bottleRight`);
  }
});

test('data: starter loadout worn items are Worn type', () => {
  for(const [sport, lo] of Object.entries(STARTER_LOADOUTS)){
    for(const id of lo.wornItems){
      assertEqual(byId(id).type, 'Worn', `${sport}: ${id} in wornItems`);
    }
  }
});

test('data: starter loadout main items fit the pack main compartment', () => {
  for(const [sport, lo] of Object.entries(STARTER_LOADOUTS)){
    const cap = byId(lo.backpackId).slots;
    const used = lo.mainItems.reduce((s, id) => s + byId(id).slots, 0);
    assert(used <= cap, `${sport}: main items use ${used} of ${cap} slots`);
  }
});
