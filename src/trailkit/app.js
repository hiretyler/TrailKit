// TrailKit domain code — everything app-specific.
// Imports the Planner Engine (the generic scaffolding shared with PlanFit).
//
// This file is intentionally still one big block: the goal of this Phase 1
// extraction is to get a working build with real module boundaries between
// engine and domain, without simultaneously refactoring the domain. Future
// audit-pass work (see docs/AUDIT.md) will split this into focused modules.

import {
  PlannerStore,
  DragEngine,
  RulesEngine,
  StatsEngine,
  Persistence,
  UIUtils,
} from '../engine/index.js';

import { parseGearLines, matchTypeToken, matchActivityToken, matchSlotsToken, matchVolToken, csvToGearLines, setExtraActivities, LEAD_COUNT_RE, EMOJI_RE } from './parse.js';
import { STARTER_ITEMS, STARTER_PACKS, STARTER_LOADOUTS } from './quickadd-data.js';
import PACKING_TEMPLATE from './exports/packing-list.html';
import { EP_DATA, EP_TABS } from './emoji-data.js';
import { VERSION } from './version.js';
import { esc, buildTrailkitXML, parseTrailkitDoc } from './xml.js';



// ── DOM lookup chokepoint (AUDIT #12) ────────────────────────────
// Every element access funnels through $() - one place to add
// caching, missing-id warnings, or a registry later. IDs stay
// stringly-typed by choice; a full id registry was judged more churn
// than value for a single-page app (see docs/AUDIT.md #12).
const $ = id => document.getElementById(id);

// ╔═══════════════════════════════════════════════════════════════╗
// ║  TRAILKIT DOMAIN  v0.97                                      ║
// ║  All TrailKit-specific logic: inventory, loadouts, rules,    ║
// ║  drag placement, stats, persistence, and rendering.          ║
// ╚═══════════════════════════════════════════════════════════════╝

// ── ITEM TYPES ──────────────────────────────────────────────────
// Item | Worn | Bottle | Bladder | Safety | Medical | Tools | Backpack
// TYPE ORDER for YOUR GEAR sort
const TYPE_ORDER = ['Backpack','Bladder','Bottle','Safety','Medical','Tools','Worn','Item'];

// ── MASTER INVENTORY ─────────────────────────────────────────────
// Each item: { id, icon, name, type, activity ('all' or sport key),
//              slots, weightKg, capacityL (Bladder/Bottle only),
//              maxKg (Backpack only), desc }
// slots = main-compartment slots consumed (special slots are free)
// For Backpack: slots = capacity of its main compartment

// SAMPLE GEAR — baked-in demo data, always available; only the
// dev-only "Add New Sample Gear" path ever appends (never persisted).
// AUDIT #14: entry ORDER here is purely cosmetic - renderStash sorts
// by TYPE_ORDER then name at render time, so grouping below is for
// human editors only.
const SAMPLE_INVENTORY = [
  // ── Backpacks
  {id:'bp_talon22',    icon:'🎒', name:'Osprey Talon 22',      type:'Backpack', activity:'hike',  slots:12, weightKg:0.87, capacityL:null, maxKg:15, desc:'Versatile 22L daypack. AirSpeed back panel. 3L bladder-compatible.'},
  {id:'bp_baltoro65',  icon:'🎽', name:'Gregory Baltoro 65',   type:'Backpack', activity:'hike',  slots:20, weightKg:2.10, capacityL:null, maxKg:27, desc:'Technical 65L expedition pack. Full-featured suspension.'},
  {id:'bp_momentum26', icon:'🏃', name:'Osprey Momentum 26',   type:'Backpack', activity:'run',   slots:8,  weightKg:0.53, capacityL:null, maxKg:10, desc:'Hydration-optimised 26L trail running pack.'},
  {id:'bp_creek50',    icon:'🧗', name:'BD Creek 50',          type:'Backpack', activity:'climb', slots:14, weightKg:1.60, capacityL:null, maxKg:20, desc:'50L alpine climbing pack. Ice-axe loops, crampon patch.'},
  // ── Bladders
  {id:'bl_hydrapak2',  icon:'💧', name:'Hydrapak 2L Bladder',  type:'Bladder',  activity:'all',   slots:4,  weightKg:0.18, capacityL:2,    maxKg:null, desc:'Shape-shift 2L reservoir. Wide-pak opening, easy clean.'},
  {id:'bl_osprey3',    icon:'💧', name:'Osprey 3L Hydraulics', type:'Bladder',  activity:'hike',  slots:5,  weightKg:0.21, capacityL:3,    maxKg:null, desc:'3L high-flow reservoir. Quick-connect tube.'},
  // ── Bottles
  {id:'bt_softflask',  icon:'🥤', name:'Soft Flask 500ml',     type:'Bottle',   activity:'run',   slots:1,  weightKg:0.04, capacityL:0.5,  maxKg:null, desc:'Collapsible BPA-free soft flask. Fits most vest pockets.'},
  {id:'bt_nalgene1',   icon:'🍶', name:'Nalgene 1L Wide Mouth',type:'Bottle',   activity:'all',   slots:2,  weightKg:0.18, capacityL:1,    maxKg:null, desc:'Classic 1L wide-mouth water bottle. BPA-free Tritan.'},
  {id:'bt_klean32',    icon:'🥛', name:'Klean Kanteen 32oz',   type:'Bottle',   activity:'all',   slots:2,  weightKg:0.22, capacityL:0.95, maxKg:null, desc:'Insulated stainless steel bottle. 32oz / 946ml.'},
  // ── Safety
  {id:'sf_headlamp',   icon:'🔦', name:'BD Spot 400 Headlamp', type:'Safety',   activity:'all',   slots:1,  weightKg:0.09, capacityL:null, maxKg:null, desc:'400-lumen rechargeable headlamp. IPX8 waterproof.'},
  {id:'sf_beacon',     icon:'📡', name:'Spot Gen4 Beacon',     type:'Safety',   activity:'all',   slots:1,  weightKg:0.15, capacityL:null, maxKg:null, desc:'Personal locator beacon. 406 MHz GPS. 24hr battery.'},
  {id:'sf_inreach',    icon:'🛰️', name:'Garmin inReach Mini',  type:'Safety',   activity:'all',   slots:1,  weightKg:0.10, capacityL:null, maxKg:null, desc:'Two-way satellite communicator. SOS, weather, GPS tracking.'},
  {id:'sf_bivy',       icon:'🛖', name:'Hyperlite Bivy',       type:'Safety',   activity:'camp',  slots:2,  weightKg:0.11, capacityL:null, maxKg:null, desc:'Solo emergency bivy. Reflective mylar. Waterproof.'},
  // ── Medical
  {id:'md_kit',        icon:'🩺', name:'Adventure Medical Kit',type:'Medical',  activity:'all',   slots:3,  weightKg:0.45, capacityL:null, maxKg:null, desc:'Comprehensive first aid kit. 4 people / 10 days.'},
  {id:'md_blister',    icon:'🩹', name:'Blister Kit',          type:'Medical',  activity:'hike',  slots:1,  weightKg:0.05, capacityL:null, maxKg:null, desc:'Moleskin, Leukotape, alcohol pads, nitrile gloves.'},
  // ── Tools
  {id:'tl_leatherman', icon:'🔧', name:'Leatherman Wave+',     type:'Tools',    activity:'all',   slots:1,  weightKg:0.24, capacityL:null, maxKg:null, desc:'Full-size multi-tool with 18 tools.'},
  {id:'tl_spork',      icon:'🥄', name:'Snow Peak Ti Spork',   type:'Tools',    activity:'camp',  slots:1,  weightKg:0.03, capacityL:null, maxKg:null, desc:'Ultralight titanium spork. 26g.'},
  {id:'tl_belay',      icon:'🪝', name:'Petzl Rig Belay',      type:'Tools',    activity:'climb', slots:1,  weightKg:0.17, capacityL:null, maxKg:null, desc:'Assisted-braking belay/rappel device.'},
  // ── Worn
  {id:'wn_shoes',      icon:'🥾', name:'Salomon X Ultra 4',    type:'Worn',     activity:'hike',  slots:2,  weightKg:0.90, capacityL:null, maxKg:null, desc:'High-traction mid-cut trail shoe. Waterproof GTX membrane.'},
  {id:'wn_shell',      icon:'🧥', name:"Arc'teryx Beta LT",    type:'Worn',     activity:'hike',  slots:3,  weightKg:0.35, capacityL:null, maxKg:null, desc:'Lightweight 3-layer Gore-Tex shell. Packable, waterproof.'},
  {id:'wn_socks',      icon:'🧦', name:'Darn Tough Micro Crew',type:'Worn',     activity:'hike',  slots:1,  weightKg:0.08, capacityL:null, maxKg:null, desc:'Merino wool hiking sock. Lifetime guarantee.'},
  {id:'wn_gloves',     icon:'🧤', name:'BD Crag Gloves',       type:'Worn',     activity:'climb', slots:1,  weightKg:0.06, capacityL:null, maxKg:null, desc:'Lightweight climbing gloves with touchscreen fingertips.'},
  {id:'wn_puffy',      icon:'🪶', name:'Insulated Puffy Jacket',type:'Worn',    activity:'all',   slots:3,  weightKg:0.42, capacityL:null, maxKg:null, desc:'850 fill down puffy. Packable. -10°C comfort.'},
  {id:'wn_pants',      icon:'🩳', name:'Smartwool Hiking Pants',type:'Worn',    activity:'hike',  slots:2,  weightKg:0.31, capacityL:null, maxKg:null, desc:'Merino-blend trail pants. 4-way stretch. UPF 50+.'},
  {id:'wn_hat',        icon:'🧢', name:'OR Sun Hat',           type:'Worn',     activity:'all',   slots:1,  weightKg:0.09, capacityL:null, maxKg:null, desc:'Wide brim sun hat. UPF 50+. Moisture-wicking band.'},
  {id:'wn_glasses',    icon:'🕶️',name:'Julbo Aerospace',       type:'Worn',     activity:'hike',  slots:1,  weightKg:0.04, capacityL:null, maxKg:null, desc:'Photochromic glacier glasses. Cat 2–4.'},
  {id:'wn_basetop',    icon:'👕', name:'Merino Base Layer Top',type:'Worn',     activity:'all',   slots:2,  weightKg:0.20, capacityL:null, maxKg:null, desc:'Lightweight 150g merino wool base layer top.'},
  {id:'wn_basebot',    icon:'🩲', name:'Merino Base Layer Bottom',type:'Worn',  activity:'all',   slots:2,  weightKg:0.18, capacityL:null, maxKg:null, desc:'Lightweight 150g merino wool base layer bottoms.'},
  // ── Items (normal)
  {id:'it_topomap',    icon:'🗺️', name:'USGS Topo Map',        type:'Item',     activity:'hike',  slots:1,  weightKg:0.04, capacityL:null, maxKg:null, desc:'Waterproofed topographic map. 1:24,000 scale.'},
  {id:'it_sunscreen',  icon:'🧴', name:'Sunscreen SPF50',      type:'Item',     activity:'all',   slots:1,  weightKg:0.09, capacityL:null, maxKg:null, desc:'Mineral broad-spectrum SPF50. Water-resistant 80 min.'},
  {id:'it_powerbank',  icon:'🔋', name:'Anker PowerCore 10K',  type:'Item',     activity:'all',   slots:1,  weightKg:0.18, capacityL:null, maxKg:null, desc:'10,000 mAh USB-C power bank. 18W fast charge.'},
  {id:'it_phone',      icon:'📱', name:'iPhone 15 Pro',        type:'Item',     activity:'all',   slots:1,  weightKg:0.19, capacityL:null, maxKg:null, desc:'Satellite SOS. 48MP camera. Titanium frame.'},
  {id:'it_tent',       icon:'⛺', name:'Big Agnes Copper Spur',type:'Item',     activity:'camp',  slots:6,  weightKg:1.36, capacityL:null, maxKg:null, desc:'Ultralight 3-season backpacking tent. 2-person.'},
  {id:'it_rope',       icon:'🪢', name:'Dynamic Rope 60m',     type:'Item',     activity:'climb', slots:8,  weightKg:3.80, capacityL:null, maxKg:null, desc:'Dry-treated 9.8mm single rope. UIAA certified.'},
  {id:'it_harness',    icon:'🧗', name:'BD Momentum Harness',  type:'Item',     activity:'climb', slots:2,  weightKg:0.34, capacityL:null, maxKg:null, desc:'Momentum adjustable harness. UIAA certified.'},
  {id:'it_towel',      icon:'🧽', name:'PackTowl UltraLite',   type:'Item',     activity:'all',   slots:2,  weightKg:0.08, capacityL:null, maxKg:null, desc:'Absorbent microfiber towel. XL.'},
  {id:'it_helmet',     icon:'🪖', name:'MIPS Trail Helmet',    type:'Safety',   activity:'bike',  slots:4,  weightKg:0.29, capacityL:null, maxKg:null, desc:'Lightweight XC trail helmet. 18 vents, MIPS liner.'},

  // ── Mountain biking (added in the v1.15 sample overhaul)
  {id:'bp_mule12',     icon:'🚴', name:'CamelBak M.U.L.E. 12', type:'Backpack', activity:'bike',  slots:9,  weightKg:0.65, capacityL:null, maxKg:9,  desc:'12L trail riding pack. Reservoir sleeve, tool organizer.'},
  {id:'sf_bikelights', icon:'💡', name:'Bontrager Ion Lights', type:'Safety',   activity:'bike',  slots:1,  weightKg:0.14, capacityL:null, maxKg:null, desc:'USB front and rear light set. Daytime flash modes.'},
  {id:'tl_crankpump',  icon:'💨', name:'Crankbrothers Klic',   type:'Tools',    activity:'bike',  slots:1,  weightKg:0.16, capacityL:null, maxKg:null, desc:'Hand pump with hidden hose and pressure gauge.'},
  {id:'tl_tubekit',    icon:'🛞', name:'Tube + Lever Kit',     type:'Tools',    activity:'bike',  slots:1,  weightKg:0.25, capacityL:null, maxKg:null, desc:'Spare 29" tube, two levers, glueless patches.'},
  {id:'tl_bikemulti',  icon:'🪛', name:'Crankbrothers M17',    type:'Tools',    activity:'bike',  slots:1,  weightKg:0.17, capacityL:null, maxKg:null, desc:'17-function bike multi-tool with chain breaker.'},
  {id:'wn_bikegloves', icon:'🧤', name:'Fox Ranger Gloves',    type:'Worn',     activity:'bike',  slots:1,  weightKg:0.06, capacityL:null, maxKg:null, desc:'Padded trail gloves. Touchscreen fingertips.'},
  {id:'wn_jersey',     icon:'🎽', name:'Patagonia Merino Jersey',type:'Worn',   activity:'bike',  slots:1,  weightKg:0.16, capacityL:null, maxKg:null, desc:'Merino-blend riding jersey. Rear zip pocket.'},
  {id:'wn_bikeshorts', icon:'🩳', name:'POC Trail Shorts',     type:'Worn',     activity:'bike',  slots:1,  weightKg:0.24, capacityL:null, maxKg:null, desc:'Stretch trail shorts with padded liner.'},

  // ── Adventure moto (added in the v1.15 sample overhaul)
  {id:'bp_kriega25',   icon:'🏍️', name:'Kriega R25 Pack',      type:'Backpack', activity:'moto',  slots:12, weightKg:1.20, capacityL:null, maxKg:15, desc:'Waterproof 25L riding pack. Quadloc harness, zero bounce.'},
  {id:'sf_motohelmet', icon:'🪖', name:'Arai XD-5 Helmet',     type:'Safety',   activity:'moto',  slots:6,  weightKg:1.60, capacityL:null, maxKg:null, desc:'Dual-sport helmet. Peak, wide eye port, Snell rated.'},
  {id:'sf_earplugs',   icon:'👂', name:'EarPeace Moto Plugs',  type:'Safety',   activity:'moto',  slots:1,  weightKg:0.01, capacityL:null, maxKg:null, desc:'Filtered earplugs. Cut wind roar, keep speech.'},
  {id:'wn_motojacket', icon:'🧥', name:'Klim Baja S4 Jacket',  type:'Worn',     activity:'moto',  slots:4,  weightKg:2.00, capacityL:null, maxKg:null, desc:'Vented adventure jacket. CE armor at shoulders and elbows.'},
  {id:'wn_motogloves', icon:'🧤', name:"REV'IT Sand 4 Gloves", type:'Worn',     activity:'moto',  slots:1,  weightKg:0.18, capacityL:null, maxKg:null, desc:'Vented ADV gloves with knuckle protection.'},
  {id:'wn_motoboots',  icon:'🥾', name:'Forma Adventure Boots',type:'Worn',     activity:'moto',  slots:4,  weightKg:2.30, capacityL:null, maxKg:null, desc:'Waterproof ADV boots. Ankle bracing, grippy sole.'},
  {id:'tl_toolroll',   icon:'🧰', name:'Kriega Tool Roll',     type:'Tools',    activity:'moto',  slots:3,  weightKg:1.10, capacityL:null, maxKg:null, desc:'Compact roll with bike-specific hex and torx bits.'},

  // ── Camping (added in the v1.15 sample overhaul)
  {id:'bp_basecamp',   icon:'🧳', name:'REI Big Haul 60',      type:'Backpack', activity:'camp',  slots:18, weightKg:1.30, capacityL:null, maxKg:25, desc:'60L duffel with backpack straps and daisy chains.'},
  {id:'it_sleepbag',   icon:'🛌', name:'Kelty Cosmic 20',      type:'Item',     activity:'camp',  slots:5,  weightKg:1.13, capacityL:null, maxKg:null, desc:'20°F down bag. Packs small for the price.'},
  {id:'it_sleeppad',   icon:'🛏️', name:'Therm-a-Rest ProLite', type:'Item',     activity:'camp',  slots:3,  weightKg:0.51, capacityL:null, maxKg:null, desc:'Self-inflating 3-season pad. R-value 3.2.'},
  {id:'it_stove',      icon:'🔥', name:'Jetboil Flash',        type:'Item',     activity:'camp',  slots:2,  weightKg:0.37, capacityL:null, maxKg:null, desc:'Integrated canister stove. Boils in about 100 seconds.'},
];

// SAMPLE LOADOUTS — paired with SAMPLE_INVENTORY
const SAMPLE_LOADOUTS = {
  hike:{
    'day-hike':{label:'Day Hike — Light',
      backpackId:'bp_talon22',bladderId:'bl_hydrapak2',bottleLeft:'bt_softflask',bottleRight:null,
      mainItems:['sf_headlamp','it_topomap','md_blister','it_sunscreen','sf_inreach'],
      wornItems:['wn_shoes','wn_socks','wn_glasses','wn_pants']},
    'overnighter':{label:'Overnighter Pack',
      backpackId:'bp_baltoro65',bladderId:'bl_osprey3',bottleLeft:'bt_nalgene1',bottleRight:'bt_nalgene1',
      mainItems:['it_tent','wn_puffy','md_kit','tl_leatherman','sf_headlamp','sf_beacon'],
      wornItems:['wn_shoes','wn_socks','wn_shell','wn_pants','wn_basetop']},
  },
  climb:{
    'sport-climb':{label:'Sport Climbing',
      backpackId:'bp_creek50',bladderId:'bl_hydrapak2',bottleLeft:null,bottleRight:null,
      mainItems:['it_rope','it_harness','md_kit','sf_headlamp','tl_belay'],
      wornItems:['wn_gloves','wn_shell']},
  },
  run:{
    'trail-run':{label:'Trail Run',
      backpackId:'bp_momentum26',bladderId:'bl_hydrapak2',bottleLeft:'bt_softflask',bottleRight:'bt_softflask',
      mainItems:['sf_beacon','md_blister','it_sunscreen'],
      wornItems:['wn_hat']},
  },
  bike:{
    'trail-ride':{label:'Trail Ride',
      backpackId:'bp_mule12',bladderId:'bl_hydrapak2',bottleLeft:null,bottleRight:null,
      mainItems:['tl_crankpump','tl_tubekit','tl_bikemulti','sf_bikelights','md_blister','it_helmet'],
      wornItems:['wn_bikegloves','wn_jersey','wn_bikeshorts','wn_glasses']},
  },
  moto:{
    'dual-sport-day':{label:'Dual-Sport Day',
      backpackId:'bp_kriega25',bladderId:'bl_hydrapak2',bottleLeft:'bt_klean32',bottleRight:null,
      mainItems:['tl_toolroll','sf_earplugs','md_kit','it_powerbank','sf_headlamp','it_towel'],
      wornItems:['wn_motojacket','wn_motogloves','wn_motoboots']},
  },
  camp:{
    'weekend-camp':{label:'Weekend Camp',
      backpackId:'bp_basecamp',bladderId:null,bottleLeft:'bt_nalgene1',bottleRight:'bt_klean32',
      mainItems:['it_tent','it_sleepbag','it_sleeppad','it_stove','tl_spork','sf_headlamp'],
      wornItems:['wn_puffy','wn_basetop']},
  },
};

// User gear and the sample/user toggle live IN THE STORE (AUDIT #2) —
// the active inventory is derived via getInventory(), never aliased.
// SAMPLE_INVENTORY stays module-level: baked-in demo data, and the
// dev-only "add to sample" path may push to it (never persisted).

// ── SPORT COLOR MAP ──────────────────────────────────────────────
const SPORT_COLOR = {all:'var(--sport-all)',hike:'var(--sport-hike)',bike:'var(--sport-bike)',
  run:'var(--sport-run)',climb:'var(--sport-climb)',moto:'var(--sport-moto)',camp:'var(--sport-camp)'};
const SPORT_LABEL = {all:'All Activities',hike:'Hiking',bike:'MTB',run:'Running',
  climb:'Climbing',moto:'Moto',camp:'Camping'};
const SPORT_KEYS = ['hike','bike','run','climb','moto','camp'];

// ── ACTIVITIES — six built-ins plus user-defined customs ─────────
// Custom activities live in S.customActivities [{key,label,emoji,color}].
// Everything that enumerates sports goes through allSports() and the
// sport*() lookups so customs appear everywhere built-ins do.
function allSports(){ return [...SPORT_KEYS, ...S.customActivities.map(c=>c.key)]; }
function customActivity(k){ return S.customActivities.find(c=>c.key===k) || null; }
function sportLabel(k){ return SPORT_LABEL[k] || customActivity(k)?.label || k; }
function sportEmoji(k){ return QA_SPORT_EMOJI[k] || customActivity(k)?.emoji || '⬡'; }
function sportColor(k){ return SPORT_COLOR[k] || customActivity(k)?.color || 'var(--sport-all)'; }

// activity is 'all', one sport key, or a comma list ('hike,camp')
function actList(a){return String(a||'all').split(',');}
function actMatches(a,f){return f==='all'||a==='all'||actList(a).includes(f);}
function actLabel(a){
  if(!a||a==='all')return SPORT_LABEL.all;
  const ks=actList(a);
  if(ks.length===1)return sportLabel(ks[0]);
  if(ks.length===2)return ks.map(sportLabel).join(' + ');
  return `${sportLabel(ks[0])} +${ks.length-1}`;
}
function vc(n){return 'v'+Math.min(n,8);}
function fkg(v){return v.toFixed(2)+' kg';}
// The active inventory is DERIVED - never hold a reference across a
// dispatch that could flip the sample toggle or replace user gear
function getInventory(){ return S.useSampleGear ? SAMPLE_INVENTORY : S.userInventory; }
function itemById(id){return getInventory().find(i=>i.id===id)||null;}
function itemByName(n){return getInventory().find(i=>i.name===n)||null;}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TRAILKIT STORE  — action types, initial state, reducers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── ACTION TYPES (AUDIT #8) ──────────────────────────────────────
// A typo'd string action silently no-ops (no reducer registered);
// a typo'd constant throws at the call site. Always dispatch via A.*.
const A = {
  SET_BACKPACK:'SET_BACKPACK', SET_BLADDER:'SET_BLADDER',
  SET_BOTTLE_LEFT:'SET_BOTTLE_LEFT', SET_BOTTLE_RIGHT:'SET_BOTTLE_RIGHT',
  ADD_TO_MAIN:'ADD_TO_MAIN', REMOVE_FROM_MAIN:'REMOVE_FROM_MAIN',
  ADD_TO_WORN:'ADD_TO_WORN', REMOVE_FROM_WORN:'REMOVE_FROM_WORN',
  CLEAR_LOADOUT:'CLEAR_LOADOUT', LOAD_LOADOUT:'LOAD_LOADOUT',
  SAVE_LOADOUT:'SAVE_LOADOUT', INSTALL_LOADOUTS:'INSTALL_LOADOUTS',
  QA_RESTORE:'QA_RESTORE',
  SET_SPORT:'SET_SPORT', SET_GEAR_FILTER:'SET_GEAR_FILTER',
  SET_LOADOUT_KEY:'SET_LOADOUT_KEY',
  SET_SAMPLE_GEAR:'SET_SAMPLE_GEAR',
  ADD_ITEMS:'ADD_ITEMS', SET_USER_INVENTORY:'SET_USER_INVENTORY',
  UPDATE_ITEM:'UPDATE_ITEM',
  ADD_ACTIVITY:'ADD_ACTIVITY', UPDATE_ACTIVITY:'UPDATE_ACTIVITY',
  REMOVE_ACTIVITY:'REMOVE_ACTIVITY', DELETE_LOADOUT:'DELETE_LOADOUT',
};

const store = new PlannerStore({
  sport:       'hike',
  gearFilter:  'all',
  loadoutKey:  '__default__',
  backpackId:  null,
  bladderId:  null,
  bottleLeft:  null,
  bottleRight: null,
  mainItems:   [],
  wornItems:   [],
  userLoadouts:{},
  useSampleGear: true,
  userInventory: [],
  customActivities: [],   // [{key,label,emoji,color}] — user-defined sports
});

// ── TRAILKIT ACTION TYPES (domain vocabulary) ────────────────────
// Placement
store.on(A.SET_BACKPACK,      (s, a) => ({ backpackId: a.id }));
store.on(A.SET_BLADDER,       (s, a) => ({ bladderId: a.id }));
store.on(A.SET_BOTTLE_LEFT,   (s, a) => ({ bottleLeft: a.id }));
store.on(A.SET_BOTTLE_RIGHT,  (s, a) => ({ bottleRight: a.id }));
store.on(A.ADD_TO_MAIN,       (s, a) => ({ mainItems: [...s.mainItems, a.id] }));
store.on(A.REMOVE_FROM_MAIN,  (s, a) => ({ mainItems: s.mainItems.filter(id=>id!==a.id) }));
store.on(A.ADD_TO_WORN,       (s, a) => ({ wornItems: [...s.wornItems, a.id] }));
store.on(A.REMOVE_FROM_WORN,  (s, a) => ({ wornItems: s.wornItems.filter(id=>id!==a.id) }));

// Loadout lifecycle
store.on(A.CLEAR_LOADOUT, (s) => ({
  backpackId: null, bladderId: null, bottleLeft: null, bottleRight: null,
  mainItems: [], wornItems: [],
}));
store.on(A.LOAD_LOADOUT, (s, a) => ({
  loadoutKey:  a.key,
  backpackId:  a.loadout.backpackId  || null,
  bladderId:  a.loadout.bladderId ?? a.loadout.bladderIds ?? null,
  bottleLeft:  a.loadout.bottleLeft  || null,
  bottleRight: a.loadout.bottleRight || null,
  mainItems:   [...(a.loadout.mainItems || [])],
  wornItems:   [...(a.loadout.wornItems || [])],
}));
store.on(A.SAVE_LOADOUT, (s, a) => {
  const current  = s.userLoadouts;
  const bySport  = { ...(current[a.sport] || {}), [a.key]: a.snapshot };
  return { userLoadouts: { ...current, [a.sport]: bySport }, loadoutKey: a.key };
});
// Bulk-merge loadouts across sports (starter loadouts from Quick Add).
// Unlike SAVE_LOADOUT it never touches loadoutKey - installing a
// loadout for another sport must not hijack the active selection.
store.on(A.INSTALL_LOADOUTS, (s, a) => {
  const merged = { ...s.userLoadouts };
  for(const sport of Object.keys(a.bySport)){
    merged[sport] = { ...(merged[sport] || {}), ...a.bySport[sport] };
  }
  return { userLoadouts: merged };
});
// One-shot restore of a pre-commit snapshot (Quick Add undo)
store.on(A.QA_RESTORE, (s, a) => ({ ...a.state }));

// Navigation
store.on(A.SET_SPORT,      (s, a) => ({ sport: a.sport }));
store.on(A.SET_GEAR_FILTER,(s, a) => ({ gearFilter: a.filter }));
store.on(A.SET_LOADOUT_KEY,(s, a) => ({ loadoutKey: a.key }));

// Inventory + sample toggle (AUDIT #2 — formerly module-level globals)
store.on(A.SET_SAMPLE_GEAR,   (s, a) => ({ useSampleGear: !!a.on }));
store.on(A.ADD_ITEMS,         (s, a) => ({ userInventory: [...s.userInventory, ...a.items] }));
store.on(A.SET_USER_INVENTORY,(s, a) => ({ userInventory: a.items.slice() }));
store.on(A.UPDATE_ITEM,       (s, a) => ({
  userInventory: s.userInventory.map(i => i.id===a.id ? { ...i, ...a.patch } : i),
}));

// Custom activities
store.on(A.ADD_ACTIVITY,   (s, a) => ({ customActivities: [...s.customActivities, a.activity] }));
store.on(A.UPDATE_ACTIVITY,(s, a) => ({
  customActivities: s.customActivities.map(c => c.key===a.key ? { ...c, ...a.patch } : c),
}));
// Removing an activity cascades: its loadout namespace is dropped and
// items carrying it are untagged (falling back to 'all' when it was
// their only tag). The Manage Activities modal arms a second-click
// confirm before dispatching when loadouts exist.
store.on(A.REMOVE_ACTIVITY,(s, a) => {
  const { [a.key]: _dropped, ...restLoadouts } = s.userLoadouts;
  return {
    customActivities: s.customActivities.filter(c => c.key!==a.key),
    userLoadouts: restLoadouts,
    userInventory: s.userInventory.map(i => {
      const keys = String(i.activity||'all').split(',').filter(k => k!==a.key);
      const next = keys.length ? keys.join(',') : 'all';
      return next===i.activity ? i : { ...i, activity: next };
    }),
  };
});

// Delete one saved user loadout (samples are untouchable)
store.on(A.DELETE_LOADOUT,(s, a) => {
  const bySport = { ...(s.userLoadouts[a.sport] || {}) };
  delete bySport[a.key];
  const userLoadouts = { ...s.userLoadouts };
  if(Object.keys(bySport).length) userLoadouts[a.sport] = bySport;
  else delete userLoadouts[a.sport];
  return { userLoadouts };
});

// ── S — strict read-only live view of store state (AUDIT #1) ─────
// The old `S` was a mutable alias: `S.mainItems.push(x)` would
// half-work (in-memory yes, subscribers/persistence no). This deep
// proxy keeps every existing read working — S.mainItems.map(...),
// [...S.wornItems], JSON.stringify(S.userLoadouts) — but any write
// at any depth throws immediately. All mutation goes through
// store.dispatch; the only sanctioned writers of _S are the store
// subscriber below and restoreState's rehydration.
const _S = store.getState();
store.subscribe((state) => { Object.assign(_S, state); });
const _roCache = new WeakMap();
function _ro(v){
  if(v===null || typeof v!=='object') return v;
  let p=_roCache.get(v);
  if(!p){
    p=new Proxy(v,{
      get:(t,k)=>_ro(t[k]),
      set(_t,k){ throw new Error(`TrailKit: state is read-only - dispatch an action instead of writing S…${String(k)}`); },
      deleteProperty(_t,k){ throw new Error(`TrailKit: state is read-only - dispatch an action instead of deleting S…${String(k)}`); },
    });
    _roCache.set(v,p);
  }
  return p;
}
const S = _ro(_S);

// ── HELPERS ──────────────────────────────────────────────────────
function allocatedIds(){
  return new Set([
    S.backpackId, S.bladderId, S.bottleLeft, S.bottleRight,
    ...S.mainItems, ...S.wornItems
  ].filter(Boolean));
}

function backpackItem(){return S.backpackId?itemById(S.backpackId):null;}
function mainCap(){const bp=backpackItem();return bp?bp.slots:0;}
function usedSlots(){
  return S.mainItems.reduce((sum,id)=>{const it=itemById(id);return sum+(it?it.slots:1);},0);
}
function freeSlots(){return mainCap()-usedSlots();}
function hasRoomFor(it){return freeSlots()>=it.slots;}

// ── TOOLTIP ──────────────────────────────────────────────────────
const TT=$('tooltip');
function showTip(e,it){
  if(!it){hideTip();return;}
  const capLine = it.capacityL!=null
    ? `<div class="tt-row"><span class="tt-key">Capacity</span><span class="tt-val tt-hi">${it.capacityL}L</span></div>` : '';
  const maxLine = it.maxKg!=null
    ? `<div class="tt-row"><span class="tt-key">Max Load</span><span class="tt-val">${it.maxKg} kg</span></div>` : '';
  const slotsLabel = it.type==='Backpack' ? 'Main Compartment' : 'Slots Used';
  // Custom activities have no tt-sport-* class - style inline from
  // their preset color (hex + alpha suffix)
  const a0 = actList(it.activity)[0];
  const isCustomAct = it.activity!=='all' && !SPORT_LABEL[a0];
  const actTag = isCustomAct
    ? `<span class="tt-tag" style="background:${sportColor(a0)}33;color:${sportColor(a0)};">${actLabel(it.activity)}</span>`
    : `<span class="tt-tag tt-sport${it.activity!=='all'?'-'+a0:''}">${actLabel(it.activity)}</span>`;
  TT.innerHTML=`
    <div class="tt-tags">
      <span class="tt-tag tt-type-bg">${it.type.toUpperCase()}</span>
      ${actTag}
    </div>
    <div class="tt-name">${it.name}</div>
    <div class="tt-desc">${it.desc}</div>
    <div class="tt-stats">
      <div class="tt-row"><span class="tt-key">${slotsLabel}</span><span class="tt-val tt-hi">${it.slots} slot${it.slots!==1?'s':''}</span></div>
      <div class="tt-row"><span class="tt-key">Weight</span><span class="tt-val">${fkg(it.weightKg)}</span></div>
      ${capLine}${maxLine}
    </div>`;
  // Show first so offsetWidth/Height are measurable, then position
  TT.classList.add('visible');
  // Use rAF to let the browser do one layout pass so dimensions are real
  requestAnimationFrame(()=> posTip(e));
}
function hideTip(){TT.classList.remove('visible');}
function posTip(e){
  const pad = 14;
  const vw  = window.innerWidth;
  const vh  = window.innerHeight;
  // Use actual rendered size after content is set, fall back to estimates
  const pw  = TT.offsetWidth  || 272;
  const ph  = TT.offsetHeight || 260;

  const mobile = vw <= 720;

  let x, y;
  if(mobile){
    // On mobile: centre horizontally over the finger, prefer above the touch point
    // so the thumb doesn't obscure the card. Account for tab bar (56px).
    const usableBottom = vh - 56;
    x = e.clientX - pw / 2;
    y = e.clientY - ph - pad; // try above finger first
    if(y < 44) y = e.clientY + pad; // not enough room above topbar — go below
    if(y + ph > usableBottom) y = usableBottom - ph - pad; // clamp above tab bar
  } else {
    // Desktop: prefer below-right of cursor
    x = e.clientX + pad;
    y = e.clientY + pad;
    if(x + pw > vw) x = e.clientX - pw - pad;
    if(y + ph > vh) y = e.clientY - ph - pad;
  }

  // Hard clamp to viewport edges with a small margin
  const margin = 6;
  x = Math.max(margin, Math.min(x, vw - pw - margin));
  y = Math.max(44 + margin, Math.min(y, vh - ph - margin));

  TT.style.left = x + 'px';
  TT.style.top  = y + 'px';
}
document.addEventListener('mousemove',e=>{if(TT.classList.contains('visible'))posTip(e);});

// ── RENDER: YOUR GEAR ────────────────────────────────────────────
function renderStash(){
  const grid=$('stashGrid'); if(!grid)return;
  grid.innerHTML='';
  // ── Empty user inventory: show the Quick Add onboarding card instead
  if(getInventory().length===0 && !S.useSampleGear){
    const cnt0=$('stashCount');
    if(cnt0) cnt0.textContent='0 available · 0 in Loadout';
    const act0=$('stashActivityCount');
    if(act0) act0.style.display='none';
    const card=document.createElement('div');
    card.className='qa-empty-card';
    card.innerHTML=`
      <div class="qa-empty-title">Your locker is empty.</div>
      <div class="qa-empty-sub">Type or paste your gear - one line per item.</div>
      <button class="qa-empty-btn" data-qa="open">Quick Add Gear</button>
      <span class="qa-empty-link" data-qa="sample">Browse sample gear instead</span>`;
    grid.appendChild(card);
    return;
  }
  const allocated=allocatedIds();
  const f=S.gearFilter;

  // ── Counts always reflect FULL inventory (not filtered view)
  const totalAll   = getInventory().length;
  const inLoadout  = getInventory().filter(it=>allocated.has(it.id)).length;

  // ── Activity-specific count: items with a non-'all' activity value
  // Only shown when a specific filter is selected
  const activitySpecific = f !== 'all'
    ? getInventory().filter(it=>it.activity!=='all'&&actMatches(it.activity,f)).length
    : 0;

  // ── Update header counts
  const cnt = $('stashCount');
  if(cnt) cnt.textContent = `${totalAll - inLoadout} available · ${inLoadout} in Loadout`;

  const actLine = $('stashActivityCount');
  if(actLine){
    if(f !== 'all' && activitySpecific > 0){
      actLine.textContent = `${activitySpecific} activity-specific`;
      actLine.style.display = '';
    } else {
      actLine.style.display = 'none';
    }
  }

  // ── Filter and sort visible items for the grid
  const visible=getInventory().filter(it=>actMatches(it.activity,f));
  visible.sort((a,b)=>TYPE_ORDER.indexOf(a.type)-TYPE_ORDER.indexOf(b.type)||a.name.localeCompare(b.name));

  // ── Render with type group labels
  let lastType=null;
  visible.forEach(it=>{
    if(it.type!==lastType){
      const lbl=document.createElement('div');
      lbl.className='stash-type-label';
      lbl.textContent=it.type==='Item'?'Normal Items':it.type+' Items';
      grid.appendChild(lbl);
      lastType=it.type;
    }
    const inUse=allocated.has(it.id);
    const wrap=document.createElement('div');
    wrap.className='slot-stack-wrapper';
    if(!inUse && it.slots>=2){
      const l1=document.createElement('div');l1.className='stack-layer stack-layer-1';wrap.appendChild(l1);
    }
    if(!inUse && it.slots>=3){
      const l2=document.createElement('div');l2.className='stack-layer stack-layer-2';wrap.appendChild(l2);
    }
    const el=document.createElement('div');
    el.className=`slot type-${it.type}${inUse?' in-loadout':' available'}`;
    el.dataset.id=it.id;
    el.dataset.zone='stash';
    const showBadge = it.slots > 1 || it.type === 'Backpack';
    el.innerHTML=`
      ${showBadge ? `<div class="slot-vol-badge ${vc(it.slots)}">${it.type==='Backpack'?it.slots+'✦':it.slots}</div>` : ''}
      <div class="slot-icon">${it.icon}</div>
      <div class="slot-type-bar"></div>`;
    el.addEventListener('mouseenter',e=>showTip(e,it));
    el.addEventListener('mouseleave',hideTip);
    if(!inUse){
      el.setAttribute('draggable','true');
      el.addEventListener('dragstart',e=>onDragStart(e,it.id,'stash',null));
      el.addEventListener('dragend',onDragEnd);
    }
    wrap.appendChild(el);
    grid.appendChild(wrap);
  });
}

// ── RENDER: BACKPACK SLOT ────────────────────────────────────────
function renderBackpackSlot(){
  const slot=$('backpackSlot');
  const iconEl=$('bpSlotIcon');
  const badge=$('bpSlotBadge');
  const bar=$('bpSlotBar');
  const info=$('packInfo');
  const bp=backpackItem();
  // Rebind drop fresh
  const fresh=slot.cloneNode(true);
  slot.parentNode.replaceChild(fresh,slot);
  if(bp){
    fresh.classList.remove('empty-dashed');
    fresh.querySelector('#bpSlotIcon').textContent=bp.icon;
    const b=fresh.querySelector('#bpSlotBadge');
    b.textContent=bp.slots+'✦'; b.className=`slot-vol-badge ${vc(bp.slots)}`; b.style.display='';
    fresh.querySelector('#bpSlotBar').style.display='';
    fresh.setAttribute('draggable','true');
    fresh.addEventListener('dragstart',e=>onDragStart(e,bp.id,'backpack',null));
    fresh.addEventListener('dragend',onDragEnd);
    info.innerHTML=`
      <div class="pack-name">${bp.name}</div>
      <div class="pack-meta">Capacity: <span>${bp.slots} slots</span></div>
      <div class="pack-meta">Weight: <span>${fkg(bp.weightKg)}</span></div>
      <div class="pack-meta">Max Load: <span>${bp.maxKg} kg</span></div>`;
  } else {
    fresh.classList.add('empty-dashed');
    fresh.querySelector('#bpSlotIcon').textContent='🎒';
    fresh.querySelector('#bpSlotBadge').style.display='none';
    fresh.querySelector('#bpSlotBar').style.display='none';
    info.innerHTML='<div class="pack-empty-hint">Drop a backpack to begin building your loadout.</div>';
  }
  fresh.addEventListener('mouseenter',e=>bp?showTip(e,bp):null);
  fresh.addEventListener('mouseleave',hideTip);
  bindDrop(fresh,'backpack',null);
}

// ── RENDER: WATER SECTION ────────────────────────────────────────
function renderWater(){
  const hasBp=!!S.backpackId;
  const bp=backpackItem();
  $('waterSection').classList.toggle('locked-section',!hasBp);

  // Determine pocket support from backpack special fields (default true if not set)
  const hasBladderPocket  = !bp || bp.backpackBladder    !== false;
  const hasLeftBottlePocket = !bp || bp.backpackLeftBottle  !== false;
  const hasRightBottlePocket= !bp || bp.backpackRightBottle !== false;

  // Bladder
  {
    const slot=$('bladderSlot');
    const fresh=slot.cloneNode(true);
    slot.parentNode.replaceChild(fresh,slot);
    const iconEl=fresh.querySelector('#bladderIcon');
    const badge=fresh.querySelector('#bladderBadge');
    const bar=fresh.querySelector('#bladderBar');
    const it=S.bladderId?itemById(S.bladderId):null;
    if(it){
      fresh.classList.remove('empty-dashed');
      iconEl.textContent=it.icon;
      badge.textContent=it.capacityL+'L'; badge.className=`slot-vol-badge v2`; badge.style.display='';
      bar.style.display='';
      fresh.setAttribute('draggable','true');
      fresh.addEventListener('dragstart',e=>onDragStart(e,it.id,'bladder',null));
      fresh.addEventListener('dragend',onDragEnd);
    } else {
      fresh.classList.add('empty-dashed');
      iconEl.textContent='💧'; badge.style.display='none'; bar.style.display='none';
    }
    fresh.addEventListener('mouseenter',e=>it?showTip(e,it):null);
    fresh.addEventListener('mouseleave',hideTip);
    if(hasBp && hasBladderPocket) bindDrop(fresh,'bladder',null);
    fresh.classList.toggle('water-slot-disabled', hasBp && !hasBladderPocket);
  }
  // Bottle pockets
  [['bottleLeft','bLeftIcon','bLeftBar',S.bottleLeft,'bottle-left', hasLeftBottlePocket],
   ['bottleRight','bRightIcon','bRightBar',S.bottleRight,'bottle-right', hasRightBottlePocket]].forEach(([sid,iid,bid,itemId,zone,hasPocket])=>{
    const slot=$(sid);
    const fresh=slot.cloneNode(true);
    slot.parentNode.replaceChild(fresh,slot);
    const ic=fresh.querySelector('#'+iid);
    const bar=fresh.querySelector('#'+bid);
    const it=itemId?itemById(itemId):null;
    if(it){
      fresh.classList.add('filled');
      ic.textContent=it.icon; ic.style.color='';
      bar.style.display='';
      fresh.setAttribute('draggable','true');
      fresh.addEventListener('dragstart',e=>onDragStart(e,it.id,zone,null));
      fresh.addEventListener('dragend',onDragEnd);
    } else {
      fresh.classList.remove('filled');
      ic.textContent='+'; ic.style.color='var(--text-secondary)';
      bar.style.display='none';
    }
    fresh.addEventListener('mouseenter',e=>it?showTip(e,it):null);
    fresh.addEventListener('mouseleave',hideTip);
    if(hasBp && hasPocket) bindDrop(fresh,zone,null);
    fresh.classList.toggle('water-slot-disabled', hasBp && !hasPocket);
  });

  // Total-L badge
  let totalL = 0;
  if(S.bladderId){ const b=itemById(S.bladderId); if(b?.capacityL) totalL+=b.capacityL; }
  if(S.bottleLeft){ const b=itemById(S.bottleLeft);  if(b?.capacityL) totalL+=b.capacityL; }
  if(S.bottleRight){ const b=itemById(S.bottleRight); if(b?.capacityL) totalL+=b.capacityL; }
  const badge=$('waterTotalL');
  if(badge) badge.textContent = totalL > 0 ? `${parseFloat(totalL.toFixed(2))}L Total` : '';
}

// ── RENDER: MAIN COMPARTMENT ─────────────────────────────────────
function renderMain(){
  const grid=$('mainGrid'); if(!grid)return;
  grid.innerHTML='';
  const hasBp=!!S.backpackId;
  $('mainSection').classList.toggle('locked-section',!hasBp);
  if(!hasBp){$('mainCap').textContent='—';return;}
  // Items
  S.mainItems.forEach((id,i)=>{
    const it=itemById(id); if(!it)return;
    const wrap=document.createElement('div');
    wrap.className='slot-stack-wrapper';
    if(it.slots>=2){const l=document.createElement('div');l.className='stack-layer stack-layer-1';wrap.appendChild(l);}
    if(it.slots>=3){const l=document.createElement('div');l.className='stack-layer stack-layer-2';wrap.appendChild(l);}
    const el=document.createElement('div');
    el.className=`slot type-${it.type}`;
    el.dataset.id=it.id; el.dataset.zone='main'; el.dataset.index=i;
    el.innerHTML=`
      ${it.slots > 1 ? `<div class="slot-vol-badge ${vc(it.slots)}">${it.slots}</div>` : ''}
      <div class="slot-icon">${it.icon}</div>
      <div class="slot-type-bar"></div>
      <div class="slot-rm-btn" title="Remove">✕</div>`;
    el.addEventListener('mouseenter',e=>showTip(e,it));
    el.addEventListener('mouseleave',hideTip);
    el.setAttribute('draggable','true');
    el.addEventListener('dragstart',e=>onDragStart(e,id,'main',i));
    el.addEventListener('dragend',onDragEnd);
    el.querySelector('.slot-rm-btn').addEventListener('click', ev=>{
      ev.stopPropagation();
      store.dispatch({type:A.REMOVE_FROM_MAIN, id}); renderAll();
    });
    bindDrop(el,'main',i);
    wrap.appendChild(el);
    grid.appendChild(wrap);
  });
  // Empty slots
  const free=freeSlots();
  for(let i=0;i<free;i++){
    const el=document.createElement('div');
    el.className='slot empty-slot droppable';
    el.dataset.zone='main'; el.dataset.index=S.mainItems.length+i;
    el.innerHTML='<div style="font-size:13px;color:var(--text-dim)">+</div>';
    bindDrop(el,'main',S.mainItems.length+i);
    grid.appendChild(el);
  }
  $('mainCap').textContent=`${S.mainItems.length} items · ${free} slots free`;
}

// ── RENDER: WORN LIST ─────────────────────────────────────────────
function renderWorn(){
  const list=$('wornList'); if(!list)return;
  list.innerHTML='';
  S.wornItems.forEach((id,i)=>{
    const it=itemById(id); if(!it)return;
    const row=document.createElement('div');
    row.className='worn-row';
    row.dataset.id=id; row.dataset.zone='worn'; row.dataset.index=i;
    row.innerHTML=`
      <div class="worn-icon">${it.icon}</div>
      <div class="worn-info">
        <div class="worn-name">${it.name.length>22?it.name.slice(0,21)+'…':it.name}</div>
        <div class="worn-sub">${fkg(it.weightKg)}</div>
      </div>
      <div class="worn-rm" title="Remove">✕</div>`;
    row.addEventListener('mouseenter',e=>showTip(e,it));
    row.addEventListener('mouseleave',hideTip);
    row.setAttribute('draggable','true');
    row.addEventListener('dragstart',e=>onDragStart(e,id,'worn',i));
    row.addEventListener('dragend',onDragEnd);
    row.querySelector('.worn-rm').addEventListener('click',ev=>{
      ev.stopPropagation();
      store.dispatch({type:A.REMOVE_FROM_WORN, id}); renderAll();
    });
    bindDrop(row,'worn',i);
    list.appendChild(row);
  });
  // Always-present drop target row
  const add=document.createElement('div');
  add.className='worn-add-row';
  add.innerHTML='<span style="font-size:12px;margin-right:6px;color:var(--text-secondary)">+</span><span class="worn-add-label">Drop Worn Item Here</span>';
  bindDrop(add,'worn',S.wornItems.length);
  list.appendChild(add);

  // ── Mirror worn list into mobile Loadout tab worn section
  const mList=$('mobileWornList');
  if(mList){
    mList.innerHTML='';
    if(!S.wornItems.length){
      // Even with no items, skip the "nothing worn" message —
      // the add-row below always shows
    } else {
      S.wornItems.forEach((id,i)=>{
        const it=itemById(id); if(!it)return;
        const row=document.createElement('div');
        row.className='worn-row';
        row.dataset.id=id; row.dataset.zone='worn'; row.dataset.index=i;
        row.innerHTML=`
          <div class="worn-icon">${it.icon}</div>
          <div class="worn-info">
            <div class="worn-name">${it.name.length>22?it.name.slice(0,21)+'…':it.name}</div>
            <div class="worn-sub">${fkg(it.weightKg)}</div>
          </div>
          <div class="worn-rm" title="Remove">✕</div>`;
        row.querySelector('.worn-rm').addEventListener('click', ev=>{
          ev.stopPropagation();
          store.dispatch({type:A.REMOVE_FROM_WORN,id}); renderAll();
        });
        mList.appendChild(row);
      });
    }
    // Always-present drop target (mirrors desktop worn list)
    const mAdd=document.createElement('div');
    mAdd.className='worn-add-row';
    mAdd.innerHTML='<span style="font-size:12px;margin-right:6px;color:var(--text-secondary)">+</span><span class="worn-add-label">Drop Worn Item Here</span>';
    bindDrop(mAdd,'worn',S.wornItems.length);
    mList.appendChild(mAdd);
  }
}

// ── RENDER: STATS ────────────────────────────────────────────────
function renderStats(){
  const bp=backpackItem();
  const ids=[S.backpackId,S.bladderId,S.bottleLeft,S.bottleRight,...S.mainItems,...S.wornItems].filter(Boolean);
  const items = ids.map(id=>itemById(id)).filter(Boolean);
  const kg      = StatsEngine.sumBy(items, 'weightKg');
  const safety  = StatsEngine.countBy(items, it=>it.type==='Safety');
  const medical = StatsEngine.countBy(items, it=>it.type==='Medical');
  const tools   = StatsEngine.countBy(items, it=>it.type==='Tools');
  const maxKg=bp?bp.maxKg:null;
  const pct=maxKg?Math.min(100,(kg/maxKg)*100):0;
  // ── Desktop
  // totalWeight/totalWeightMax elements removed from footer (weight shown in Pack Weight panel)
  const _tw=$('totalWeight');
  const _twm=$('totalWeightMax');
  if(_tw)  _tw.textContent=fkg(kg);
  if(_twm) _twm.textContent=maxKg?`/ ${maxKg} kg max`:'';
  $('sideWeight').textContent=maxKg?`${fkg(kg)} / ${maxKg} kg`:`${fkg(kg)}`;
  $('weightFill').style.width=pct+'%';
  updCtr('ctr-Safety', safety, safety>0?'ok':'warn');
  updCtr('ctr-Medical', medical, medical>0?'ok':'warn');
  updCtr('ctr-Tools',   tools,   'neutral');
  // ── Mobile stats panel (always in sync)
  const mw=$('mTotalWeight');
  if(mw) mw.textContent=fkg(kg);
  const mwm=$('mTotalWeightMax');
  if(mwm) mwm.textContent=maxKg?`/ ${maxKg} kg max`:'';
  const mwf=$('mWeightFill');
  if(mwf) mwf.style.width=pct+'%';
  updCtr('mCtr-Safety',  safety,  safety>0?'ok':'warn');
  updCtr('mCtr-Medical', medical, medical>0?'ok':'warn');
  updCtr('mCtr-Tools',   tools,   'neutral');
}
function updCtr(id,n,state){
  const el=$(id); if(!el)return;
  el.className='item-counter '+state;
  const v=el.querySelector('.item-counter-value');
  if(v) v.innerHTML=`${n} <span>packed</span>`;
}

// ── FULL RENDER ──────────────────────────────────────────────────
function renderAll(){
  renderBackpackSlot();
  renderWater();
  renderMain();
  renderWorn();
  renderStash();
  renderStats();
  persistState();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DRAG & DROP — wired to DragEngine + RulesEngine
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ╔═══════════════════════════════════════════════════════════════╗
// ║  TRAILKIT RULES                                              ║
// ║  Domain-specific placement rules registered with the shared  ║
// ║  RulesEngine. Each rule is a named function so it can be     ║
// ║  identified in debug output and selectively replaced or       ║
// ║  extended without touching the engine.                       ║
// ║                                                              ║
// ║  Rule contract: (item, toZone, state) →                      ║
// ║    { valid: true }  |  { valid: false, reason: string }      ║
// ║                                                              ║
// ║  To add a rule: RulesEngine.register(myRuleFn)               ║
// ║  To port to PlanFit: copy this block, swap the zone/type     ║
// ║  mappings for workout/container equivalents.                  ║
// ╚═══════════════════════════════════════════════════════════════╝

// ── Rule 1: Type Matching ────────────────────────────────────────
// Certain zones only accept items of a specific type.
// Returns invalid immediately if the item type doesn't match the zone.
function ruleTypeMatch(item, toZone){
  const ZONE_TYPE = {
    'backpack'     : 'Backpack',
    'bladder'      : 'Bladder',
    'bottle-left'  : 'Bottle',
    'bottle-right' : 'Bottle',
    'worn'         : 'Worn',
    // 'main' and 'stash' accept any type — not listed here.
  };
  const required = ZONE_TYPE[toZone];
  if(required && item.type !== required)
    return { valid: false, reason: `Only ${required} items can go here.` };
  return { valid: true };
}

// ── Rule 2: Backpack Required ────────────────────────────────────
// Nothing can go in the main compartment until a backpack is placed.
function ruleBackpackRequired(item, toZone, state){
  if(toZone === 'main' && !state.backpackId)
    return { valid: false, reason: 'Drop a backpack first.' };
  return { valid: true };
}

// ── Rule 3: Capacity Check ───────────────────────────────────────
// The main compartment has a slot limit defined by the active backpack.
// Each item consumes item.slots slots. Reject if the item won't fit.
function ruleCapacity(item, toZone, state){
  if(toZone !== 'main') return { valid: true };
  const bp   = itemById(state.backpackId);
  const cap  = bp ? bp.slots : 0;
  const used = StatsEngine.sumBy(
    state.mainItems.map(id => itemById(id)).filter(Boolean),
    'slots'
  );
  if(used + item.slots > cap)
    return { valid: false, reason: `Not enough space — ${cap - used} slot${cap-used===1?'':'s'} free.` };
  return { valid: true };
}

// ── Register all rules ───────────────────────────────────────────
// Order matters: type match runs first (cheapest check),
// then backpack-required, then capacity (most expensive).
RulesEngine
  .register(ruleTypeMatch)
  .register(ruleBackpackRequired)
  .register(ruleCapacity);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  DRAG WIRING — connects DragEngine to TrailKit placement logic
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Initialise DragEngine with TrailKit's drop handler.
// From this point, DragEngine owns drag state; TrailKit just
// handles placement logic when a valid drop occurs.
DragEngine.init(function onDragDrop(drag, toZone, toIdx){
  const {id, zone:fromZone, idx:fromIdx} = drag;
  const it = itemById(id); if(!it) return;

  // Validate via RulesEngine — all three TrailKit rules run here.
  const check = RulesEngine.validate(it, toZone, S);
  if(!check.valid) return;

  // Remove from source zone (dispatches store action).
  removeFrom(fromZone, fromIdx, id);

  // Place in destination zone (dispatches store action).
  // On failure, restore the item to its original zone.
  if(!placeTo(toZone, id, it)){
    restoreTo(fromZone, fromIdx, id);
  }
  renderAll();
});

// bindDrop — thin wrapper over DragEngine.bindZone().
// All render functions call bindDrop(el, zone, idx) to register drop targets;
// the engine handles the dragover/dragleave/drop event plumbing.
function bindDrop(el, zone, idx){
  DragEngine.bindZone(el, zone, idx);
}

function onDragStart(e, id, zone, idx){
  hideTip();
  DragEngine.start(id, zone, idx);
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', id);
  setTimeout(()=>{
    const el = e.target.closest('.slot,.worn-row,.bottle-slot-single,.big-slot');
    if(el) el.classList.add('dragging');
  }, 0);
}

function onDragEnd(){
  DragEngine.end();
}

function onDrop(e, toZone, toIdx){
  // Legacy path — kept for any direct addEventListener('drop') callsites.
  // New code goes through DragEngine.bindZone → DragEngine._onDrop.
  e.preventDefault(); e.stopPropagation();
  document.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));
  const drag = DragEngine.getState(); if(!drag) return;
  const {id, zone:fromZone, idx:fromIdx} = drag;
  const it = itemById(id); if(!it) return;

  const check = RulesEngine.validate(it, toZone, S);
  if(!check.valid) return;

  removeFrom(fromZone, fromIdx, id);
  if(!placeTo(toZone, id, it)){
    restoreTo(fromZone, fromIdx, id);
  }
  renderAll();
}

function removeFrom(zone,idx,id){
  if(zone==='stash') return;
  if(zone==='backpack')      store.dispatch({ type:A.SET_BACKPACK,     id: null });
  else if(zone==='bladder')  store.dispatch({ type:A.SET_BLADDER,      id: null });
  else if(zone==='bottle-left')  store.dispatch({ type:A.SET_BOTTLE_LEFT,  id: null });
  else if(zone==='bottle-right') store.dispatch({ type:A.SET_BOTTLE_RIGHT, id: null });
  else if(zone==='main')     store.dispatch({ type:A.REMOVE_FROM_MAIN, id });
  else if(zone==='worn')     store.dispatch({ type:A.REMOVE_FROM_WORN, id });
}

function placeTo(zone,id,it){
  if(zone==='stash') return true;
  if(zone==='backpack'){   store.dispatch({ type:A.SET_BACKPACK,     id }); return true; }
  if(zone==='bladder'){    store.dispatch({ type:A.SET_BLADDER,      id }); return true; }
  if(zone==='bottle-left'){ store.dispatch({ type:A.SET_BOTTLE_LEFT, id }); return true; }
  if(zone==='bottle-right'){store.dispatch({ type:A.SET_BOTTLE_RIGHT,id }); return true; }
  if(zone==='worn'){       store.dispatch({ type:A.ADD_TO_WORN,      id }); return true; }
  if(zone==='main'){
    const bp   = itemById(S.backpackId);
    const cap  = bp ? bp.slots : 0;
    const used = StatsEngine.sumBy(S.mainItems.map(id=>itemById(id)).filter(Boolean), 'slots');
    if(used + it.slots > cap) return false;
    store.dispatch({ type:A.ADD_TO_MAIN, id });
    return true;
  }
  return false;
}

function restoreTo(zone,idx,id){
  const it = itemById(id); if(!it) return;
  if(zone==='backpack')      store.dispatch({ type:A.SET_BACKPACK,    id });
  else if(zone==='bladder')  store.dispatch({ type:A.SET_BLADDER,     id });
  else if(zone==='bottle-left')  store.dispatch({ type:A.SET_BOTTLE_LEFT,  id });
  else if(zone==='bottle-right') store.dispatch({ type:A.SET_BOTTLE_RIGHT, id });
  else if(zone==='main'){
    const bp   = itemById(S.backpackId);
    const cap  = bp ? bp.slots : 0;
    const used = StatsEngine.sumBy(S.mainItems.map(id=>itemById(id)).filter(Boolean), 'slots');
    if(used + it.slots <= cap) store.dispatch({ type:A.ADD_TO_MAIN, id });
  }
  else if(zone==='worn')     store.dispatch({ type:A.ADD_TO_WORN, id });
}

// Stash accepts items back (return from loadout)
function initStashDrop(){
  const grid=$('stashGrid');
  grid.addEventListener('dragover',e=>{e.preventDefault();grid.classList.add('stash-drop-active');});
  grid.addEventListener('dragleave',()=>grid.classList.remove('stash-drop-active'));
  grid.addEventListener('drop',e=>{
    e.preventDefault(); grid.classList.remove('stash-drop-active');
    const drag = DragEngine.getState(); if(!drag || drag.zone==='stash') return;
    removeFrom(drag.zone, drag.idx, drag.id);
    renderAll();
  });
}

// ── LOADOUT MANAGEMENT ───────────────────────────────────────────
function allLoadouts(sport){
  if(S.useSampleGear){
    // In sample mode: show sample loadouts merged with any user loadouts for that sport
    return {...(SAMPLE_LOADOUTS[sport]||{}), ...(S.userLoadouts[sport]||{})};
  }
  // In user mode: only user-saved loadouts
  return {...(S.userLoadouts[sport]||{})};
}

function populateLoadoutSel(){
  const sel=$('loadoutSelect'); if(!sel)return;
  sel.innerHTML='';
  const map=allLoadouts(S.sport);
  const keys=Object.keys(map);
  if(!keys.length){
    const o=document.createElement('option');o.value='__default__';o.textContent='Default Loadout';
    sel.appendChild(o); store.dispatch({ type:A.SET_LOADOUT_KEY, key:'__default__' });
  } else {
    keys.forEach(k=>{
      const o=document.createElement('option');o.value=k;o.textContent=map[k].label||k;
      sel.appendChild(o);
    });
    if(!map[S.loadoutKey]) store.dispatch({ type:A.SET_LOADOUT_KEY, key:keys[0] });
    sel.value=S.loadoutKey;
  }
}

function loadLoadout(key){
  store.dispatch({ type: A.CLEAR_LOADOUT });
  if(key==='__default__'){ store.dispatch({ type:A.SET_LOADOUT_KEY, key:'__default__' }); renderAll(); return; }
  const lo = allLoadouts(S.sport)[key]; if(!lo) return;
  store.dispatch({ type: A.LOAD_LOADOUT, key, loadout: lo });
  renderAll();
}

function clearState(){
  store.dispatch({ type: A.CLEAR_LOADOUT });
}

function snapshotLoadout(label){
  return {label,
    backpackId:S.backpackId, bladderId:S.bladderId,
    bottleLeft:S.bottleLeft, bottleRight:S.bottleRight,
    mainItems:[...S.mainItems], wornItems:[...S.wornItems]};
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  STATE PERSISTENCE — wired to shared Persistence module
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Persistence.init(
  'trailkit_v1',
  // serialize: store state → plain object for JSON
  (state) => ({
    useSampleGear : state.useSampleGear,
    userInventory : state.userInventory,
    userLoadouts  : state.userLoadouts,
    customActivities: state.customActivities,
    quickAdd      : { seen: _qaSeen, draft: _qaDraft.slice(0, 20000) },
    activeLoadout : {
      sport:       state.sport,
      loadoutKey:  state.loadoutKey,
      backpackId:  state.backpackId,
      bladderId:  state.bladderId,
      bottleLeft:  state.bottleLeft,
      bottleRight: state.bottleRight,
      mainItems:   state.mainItems,
      wornItems:   state.wornItems,
    },
  }),
  // deserialize: raw JSON → state patch. Quick Add draft state is the
  // one remaining module-level side effect (it isn't store state).
  (payload) => {
    const qa = payload.quickAdd || {}; // older payloads have no quickAdd key
    _qaSeen  = !!qa.seen;
    _qaDraft = typeof qa.draft === 'string' ? qa.draft.slice(0, 20000) : '';
    const a = payload.activeLoadout || {};
    // AUDIT #11 migration: stored loadouts from before the
    // bladderIds->bladderId rename normalize on load
    const migrateLoadouts = (all) => {
      const out = {};
      for(const sport of Object.keys(all || {})){
        out[sport] = {};
        for(const [k, lo] of Object.entries(all[sport])){
          const { bladderIds, ...rest } = lo;
          out[sport][k] = { ...rest, bladderId: lo.bladderId ?? bladderIds ?? null };
        }
      }
      return out;
    };
    return {
      useSampleGear: typeof payload.useSampleGear === 'boolean' ? payload.useSampleGear : true,
      userInventory: Array.isArray(payload.userInventory) ? payload.userInventory : [],
      customActivities: Array.isArray(payload.customActivities) ? payload.customActivities : [],
      userLoadouts: migrateLoadouts(payload.userLoadouts),
      sport:        a.sport       || 'hike',
      loadoutKey:   a.loadoutKey  || '__default__',
      backpackId:   a.backpackId  || null,
      bladderId:   a.bladderId ?? a.bladderIds ?? null,  // bladderIds = pre-rename payloads
      bottleLeft:   a.bottleLeft  || null,
      bottleRight:  a.bottleRight || null,
      mainItems:    a.mainItems   || [],
      wornItems:    a.wornItems   || [],
    };
  }
);

// Surface quota failures once per session (AUDIT #9) - silent loss of
// persistence is worse than a nag
let _quotaWarned = false;
function persistState(){
  const ok = Persistence.save(S);
  if(ok === false && !_quotaWarned){
    _quotaWarned = true;
    showToast("Couldn't save your changes - browser storage is full", {duration: 8000});
  }
}

function restoreState(){
  const restored = Persistence.load();
  if(!restored) return false;
  store._patch(restored);
  Object.assign(_S, restored); // sanctioned direct write: rehydration only
  return true;
}

// ── XML / CSV HELPERS ────────────────────────────────────────────
// esc + XML building live in xml.js (AUDIT #4); csvQ stays local.

// CSV field quoting — wraps in quotes, escapes internal quotes
function csvQ(s){ const v=String(s==null?'':s); return '"'+v.replace(/"/g,'""')+'"'; }

// ── BUILD XML ────────────────────────────────────────────────────
function buildXML(){
  return buildTrailkitXML({
    version: VERSION,
    inventory: getInventory(),
    userLoadouts: S.userLoadouts,
    sports: allSports(),
  });
}

// ── DOWNLOAD BLOB ─────────────────────────────────────────────────
function downloadBlob(content, filename, mime){
  // 1. Build XML string
  // 2. Create Blob with correct MIME
  // 3. Create object URL and click a hidden anchor
  const blob = new Blob([content], {type: mime + ';charset=utf-8'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 1500);
}

function exportXML(){
  downloadBlob(buildXML(), 'my-trailkit.xml', 'text/xml');
}

function exportPackingLists(){
  const sports = allSports();
  const srcInv = S.useSampleGear ? SAMPLE_INVENTORY : S.userInventory;

  function resolveName(id){
    if(!id) return null;
    const it = srcInv.find(i=>i.id===id) || getInventory().find(i=>i.id===id);
    return it ? it.name : null;
  }

  let sections = [];
  sports.forEach(sport=>{
    const map = allLoadouts(sport);
    Object.entries(map).forEach(([,lo])=>{
      const ids = [
        lo.backpackId, lo.bladderId, lo.bottleLeft, lo.bottleRight,
        ...(lo.mainItems||[]), ...(lo.wornItems||[])
      ].filter(Boolean);
      const names = ids.map(id=>resolveName(id)).filter(Boolean);
      if(!names.length) return;
      sections.push({ sport, label: lo.label||'Loadout', names });
    });
  });

  const now = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});

  // Template lives in exports/packing-list.html (AUDIT #6), inlined
  // as a string at build time - real <script> tags in the source,
  // no more <' + 'script> splitting hacks. Placeholders are
  // replaced with function replacers so '$' in data stays literal.
  let content = '';

  if(!sections.length){
    content += `  <div class="no-loadouts">No saved loadouts found. Build and save loadouts in TrailKit, then re-export.</div>\n`;
  } else {
    sections.forEach((sec, idx)=>{
      const sportLbl = sportLabel(sec.sport);
      content += `  <div class="loadout-block">
    <div class="loadout-meta">
      <span class="loadout-activity">${sportLbl}</span>
      <span class="sport-badge sb-${sec.sport}">${sportLbl}</span>
    </div>
    <div class="loadout-name">${esc(sec.label)}</div>
    <ul class="item-list">
`;
      sec.names.forEach((name, i)=>{
        const cbId = `cb_${idx}_${i}`;
        content += `      <li class="item-row">
        <input class="item-cb" type="checkbox" id="${cbId}">
        <label class="item-label" for="${cbId}">${esc(name)}</label>
      </li>
`;
      });
      content += `    </ul>
    <div class="item-count">${sec.names.length} item${sec.names.length!==1?'s':''}</div>
  </div>
`;
    });
  }

  const html = PACKING_TEMPLATE
    .replace(/{{NOW}}/g, () => now)
    .replace('{{SAMPLE_NOTE}}', () => S.useSampleGear ? ' &nbsp;·&nbsp; Sample Gear' : '')
    .replace('{{VERSION}}', () => VERSION)
    .replace('{{CONTENT}}', () => content);

  const isSample = S.useSampleGear ? '-sample' : '';
  downloadBlob(html, `trailkit-packing-lists${isSample}.html`, 'text/html');
}

function exportCSV(){
  const srcInv = S.useSampleGear ? SAMPLE_INVENTORY : S.userInventory;
  const sports = allSports();

  // ── Sheet 1: Inventory ─────────────────────────────────────
  let csv = 'TRAILKIT getInventory()\r\n';
  csv += 'Name,Type,Activity,Slots,Weight (kg),Capacity (L),Max Load (kg),Description\r\n';
  srcInv.forEach(it=>{
    csv += [
      csvQ(it.name),
      csvQ(it.type),
      csvQ(actLabel(it.activity)),
      it.slots,
      it.weightKg.toFixed(2),
      it.capacityL!=null ? it.capacityL : '',
      it.maxKg!=null     ? it.maxKg     : '',
      csvQ(it.desc||'')
    ].join(',') + '\r\n';
  });

  // ── Sheet 2: Loadouts (appended as separate section) ────────
  csv += '\r\nTRAILKIT LOADOUTS\r\n';
  csv += 'Loadout Name,Activity,Slot,Item Name,Item Type,Weight (kg)\r\n';

  sports.forEach(sport=>{
    const map = allLoadouts(sport);
    Object.entries(map).forEach(([,lo])=>{
      const sportLbl = sportLabel(sport);

      // Collect all item IDs in display order: backpack, bladder, bottles, main, worn
      const slots = [];
      const pushSlot = (id, slotLabel)=>{
        if(!id) return;
        const it = srcInv.find(i=>i.id===id) || getInventory().find(i=>i.id===id);
        if(it) slots.push({slot:slotLabel, it});
      };
      pushSlot(lo.backpackId,  'Backpack');
      pushSlot(lo.bladderId,  'Bladder');
      pushSlot(lo.bottleLeft,  'Left Bottle');
      pushSlot(lo.bottleRight, 'Right Bottle');
      (lo.mainItems||[]).forEach((id,i)=>pushSlot(id, `Main ${i+1}`));
      (lo.wornItems||[]).forEach((id,i)=>pushSlot(id, `Worn ${i+1}`));

      slots.forEach(({slot, it})=>{
        csv += [
          csvQ(lo.label||'Loadout'),
          csvQ(sportLbl),
          csvQ(slot),
          csvQ(it.name),
          csvQ(it.type),
          it.weightKg.toFixed(2)
        ].join(',') + '\r\n';
      });
    });
  });

  // ── Weight summary ────────────────────────────────────────
  csv += '\r\nWEIGHT SUMMARY BY LOADOUT\r\n';
  csv += 'Loadout Name,Activity,Total Weight (kg),Item Count\r\n';
  sports.forEach(sport=>{
    const map = allLoadouts(sport);
    Object.entries(map).forEach(([,lo])=>{
      const ids=[lo.backpackId,lo.bladderId,lo.bottleLeft,lo.bottleRight,
                 ...(lo.mainItems||[]),...(lo.wornItems||[])].filter(Boolean);
      let totalKg=0, count=0;
      ids.forEach(id=>{
        const it = srcInv.find(i=>i.id===id) || getInventory().find(i=>i.id===id);
        if(it){ totalKg+=it.weightKg; count++; }
      });
      if(!count) return;
      csv += [
        csvQ(lo.label||'Loadout'),
        csvQ(sportLabel(sport)),
        totalKg.toFixed(2),
        count
      ].join(',') + '\r\n';
    });
  });

  const isSample = S.useSampleGear ? '-sample' : '';
  downloadBlob(csv, `trailkit-export${isSample}.csv`, 'text/csv');
}

// ── QUICK ADD ────────────────────────────────────────────────────
// One modal, three onboarding paths (type/paste, starter-pack chips,
// AI photo prompt), one parser (parse.js), one commit into
// S.userInventory. The draft survives any dismissal via persistence,
// so Cancel/backdrop/Escape are deliberately not intercepted.

const QA_SPORTS=['hike','bike','run','climb','moto','camp'];
const QA_SPORT_EMOJI={hike:'🥾',bike:'🚵',run:'🏃',climb:'🧗',moto:'🏍️',camp:'⛺'};
const QA_TYPES=TYPE_ORDER;
const QA_DRAFT_MAX=20000;
const QA_COMMIT_CAP=300;

// Shipped verbatim - keep the hyphens, never em dashes.
const QA_AI_PROMPT=`I'm cataloguing my outdoor gear for an app called TrailKit.
Look at the attached photo and list every distinct piece of gear you can see.

Reply with ONLY a plain list, one item per line, in exactly this format:

count x name | type | activity

- count is a whole number. Use it only to group identical items: 3 x wool socks
- name is short and plain. Skip the brand unless it is clearly printed on the item.
- type must be exactly one of these eight words:
    Backpack - packs, rucksacks, duffels, running vests
    Bladder - hydration reservoirs
    Bottle - water bottles and soft flasks
    Safety - headlamps, beacons, whistles, helmets, emergency shelter
    Medical - first aid supplies
    Tools - multi-tools, pumps, knives, repair kits
    Worn - clothing, footwear, gloves, hats, anything worn on the body
    Item - anything else
- activity must be exactly one of: hike, bike, run, climb, moto, camp, all
  Use "all" if the item suits more than one.
- optionally add a weight as a fourth field if you can judge it: 80g or 0.08kg

A correct reply looks exactly like this:

1 x 22L Daypack | Backpack | hike
3 x Wool Socks | Worn | hike | 80g
1 x Headlamp | Safety | all
1 x Multi-Tool | Tools | all

No intro, no summary, no markdown, no bullets. Just the lines.`;

let _qaDraft='';
let _qaSeen=false;
const _qaPacksOn=new Set();       // sports whose starter pack lines are injected
let _qaRows=[], _qaIgnored=[];    // last parse result
const _qaChecks=new Map();        // lineIndex -> checked override (in-memory only)
let _qaRenderTimer=null, _qaSaveTimer=null, _toastTimer=null;

function qaNorm(n){return n.toLowerCase().replace(/\s+/g,' ').replace(/\s*\(\d+\)$/,'').trim();}
function qaChecked(r){return _qaChecks.has(r.lineIndex)?_qaChecks.get(r.lineIndex):!r._dup;}
// Overrides are keyed by line index - remap them whenever line
// removal renumbers the draft, or stale keys land on the wrong rows
function qaShiftChecks(mapFn){
  const next=[];
  _qaChecks.forEach((v,k)=>{const nk=mapFn(k); if(nk!=null)next.push([nk,v]);});
  _qaChecks.clear();
  next.forEach(([k,v])=>_qaChecks.set(k,v));
}
function qaTa(){return $('qaText');}

function qaPersistSoon(){clearTimeout(_qaSaveTimer);_qaSaveTimer=setTimeout(persistState,800);}
function qaPersistNow(){clearTimeout(_qaSaveTimer);persistState();}

// ── Toast (no alert()) ──
// opts.actions: [{label, fn}] renders buttons after the message.
// Clicking one hides the toast first, so every action is one-shot -
// the undo/nudge snapshots live in the action closures and die with
// the toast.
function hideToast(){
  const t=$('tkToast'); if(!t)return;
  clearTimeout(_toastTimer);
  t.classList.remove('show');
}
function showToast(msg,opts){
  const t=$('tkToast'); if(!t)return;
  const acts=(opts&&opts.actions)||[];
  t.textContent='';
  const m=document.createElement('span');
  m.className='tk-toast-msg'; m.textContent=msg;
  t.appendChild(m);
  acts.forEach(a=>{
    const b=document.createElement('button');
    b.type='button'; b.className='tk-toast-btn'; b.textContent=a.label;
    b.addEventListener('click',()=>{hideToast();a.fn();});
    t.appendChild(b);
  });
  t.classList.toggle('tk-toast-actions',acts.length>0);
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer=setTimeout(hideToast,(opts&&opts.duration)||(acts.length?9000:2500));
}

// ── Parse + dedup ──
function qaParse(){
  const res=parseGearLines(_qaDraft);
  _qaRows=res.rows; _qaIgnored=res.ignored;
  const seen=new Set(S.userInventory.map(i=>qaNorm(i.name)));
  _qaRows.forEach(r=>{const k=qaNorm(r.name); r._dup=seen.has(k); seen.add(k);});
}

function qaRefresh(){qaParse(); qaRenderPreview(); qaUpdateTally();}

// ── Activity multi-select popover (one open at a time) ──
// Fixed-position and body-appended so the preview pane's scroll
// clipping cannot cut it off. Checking All Activities checks every
// sport's box; the selection applies when the popover closes -
// all six = 'all', a subset = comma list, never fewer than one.
let _qaActPop=null;
function qaCloseActPop(apply){
  if(!_qaActPop)return;
  const {el,row,orig}=_qaActPop;
  const checked=allSports().filter(k=>el.querySelector(`input[data-act="${k}"]`)?.checked);
  el.remove();
  _qaActPop=null;
  if(!apply||!checked.length)return;
  const value=checked.length===allSports().length?'all':checked.join(',');
  if(value!==orig)qaSetLineField(row.lineIndex,'activity',value);
}
function qaOpenActPop(btn,r,eff){
  if(_qaActPop){
    const same=_qaActPop.btn===btn, before=_qaDraft;
    qaCloseActPop(true);
    // Applying may rewrite the draft and rebuild the rows, detaching
    // this btn - bail and let the user click the fresh one
    if(same||_qaDraft!==before)return;
  }
  const keys=eff==='all'?allSports():actList(eff).filter(k=>allSports().includes(k));
  const pop=document.createElement('div');
  pop.className='qa-act-pop';
  pop.innerHTML=`<label class="qa-act-opt qa-act-opt-all"><input type="checkbox" data-act-all>${SPORT_LABEL.all}</label>`
    +allSports().map(k=>`<label class="qa-act-opt"><input type="checkbox" data-act="${k}"${keys.includes(k)?' checked':''}>${sportEmoji(k)} ${sportLabel(k)}</label>`).join('');
  const syncAll=()=>{pop.querySelector('[data-act-all]').checked=allSports().every(k=>pop.querySelector(`input[data-act="${k}"]`).checked);};
  pop.addEventListener('click',e=>e.stopPropagation());
  pop.addEventListener('change',e=>{
    const t=e.target;
    if(t.hasAttribute('data-act-all')){
      allSports().forEach(k=>{pop.querySelector(`input[data-act="${k}"]`).checked=true;});
    } else if(!t.checked&&!allSports().some(k=>pop.querySelector(`input[data-act="${k}"]`).checked)){
      t.checked=true;
    }
    syncAll();
  });
  const rect=btn.getBoundingClientRect();
  pop.style.left=Math.max(8,Math.min(rect.left,window.innerWidth-180))+'px';
  pop.style.top=Math.min(rect.bottom+4,window.innerHeight-240)+'px';
  document.body.appendChild(pop);
  syncAll();
  _qaActPop={el:pop,btn,row:r,orig:eff};
  $('qaPreview')?.addEventListener('scroll',()=>qaCloseActPop(true),{once:true});
}
document.addEventListener('click',e=>{
  if(_qaActPop&&!_qaActPop.el.contains(e.target))qaCloseActPop(true);
});

// ── Preview rendering ──
function qaRenderPreview(){
  qaCloseActPop(false);
  const box=$('qaPreview'); if(!box)return;
  const scroll=box.scrollTop;
  box.innerHTML='';
  if(!_qaRows.length && !_qaIgnored.length){
    box.innerHTML='<div class="qa-preview-empty">Preview appears as you type.</div>';
    return;
  }
  _qaRows.forEach(r=>{
    const on=qaChecked(r);
    const confCls=r.conf.type==='given'?'given':(r.conf.type==='guessed'?'guessed':'default');
    const dot={given:'●',guessed:'◐',default:'○'}[confCls];
    const row=document.createElement('div');
    row.className='qa-row'+(on?'':' qa-off')
      +(r.type==='Bottle'||r.type==='Bladder'?' qa-has-cap':'');
    row.innerHTML=`
      <input type="checkbox" class="qa-check"${on?' checked':''}>
      <span class="qa-row-icon">${r.icon}</span>
      <span class="qa-row-name" title="${esc(r.raw)}">${esc(r.name)}</span>
      ${r.count>1?`<span class="qa-count-badge">×${r.count}</span>`:''}
      ${r.capped?'<span class="qa-pill">MAX 20</span>':''}
      ${r._dup?'<span class="qa-pill">ALREADY IN</span>':''}
      <span class="qa-dot ${confCls}" title="type ${r.conf.type} · weight ${r.conf.weight}">${dot}</span>
      <select class="edit-select qa-mini qa-type-sel"></select>
      <button class="edit-select qa-mini qa-act-btn" type="button" title="Choose activities"></button>
      <span class="qa-num-wrap" title="${r.type==='Backpack'?'Main compartment slots':'Slots this item takes up'}">
        <input type="number" class="edit-select qa-mini qa-num qa-slots-in" min="1" max="24" step="1">▦</span>
      ${r.type==='Bottle'||r.type==='Bladder'?`<span class="qa-num-wrap" title="Capacity in liters">
        <input type="number" class="edit-select qa-mini qa-num qa-cap-in" min="0.1" max="99" step="0.1">L</span>`:''}
      <span class="qa-weight">${fkg(r.weightKg)}</span>
      <span class="qa-del" title="Remove line">×</span>`;
    const tsel=row.querySelector('.qa-type-sel');
    QA_TYPES.forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t;tsel.appendChild(o);});
    tsel.value=r.type;
    tsel.addEventListener('change',()=>qaSetLineField(r.lineIndex,'type',tsel.value));
    const abtn=row.querySelector('.qa-act-btn');
    const eff=r.activity==='__default__'?($('qaTagAs')?.value||'all'):r.activity;
    abtn.textContent=eff==='all'?'All':actLabel(eff);
    abtn.addEventListener('click',e=>{e.stopPropagation();qaOpenActPop(abtn,r,eff);});
    const iconEl=row.querySelector('.qa-row-icon');
    iconEl.title='Change icon';
    iconEl.addEventListener('click',e=>{
      e.stopPropagation();
      qaCloseActPop(true);
      openEmojiPicker({anchor:iconEl,onPick:em=>qaSetLineIcon(r.lineIndex,em)});
    });
    const slIn=row.querySelector('.qa-slots-in');
    slIn.value=r.slots;
    slIn.addEventListener('change',()=>{
      const v=Math.max(1,Math.min(24,parseInt(slIn.value,10)||1));
      qaSetLineField(r.lineIndex,'slots',v+' slots');
    });
    const capIn=row.querySelector('.qa-cap-in');
    if(capIn){
      capIn.value=r.capacityL??'';
      capIn.addEventListener('change',()=>{
        const v=Math.max(0.1,Math.min(99,parseFloat(capIn.value)||1));
        qaSetLineField(r.lineIndex,'capacity',v+'L');
      });
    }
    row.querySelector('.qa-check').addEventListener('change',e=>{
      _qaChecks.set(r.lineIndex,e.target.checked);
      row.classList.toggle('qa-off',!e.target.checked);
      qaUpdateTally();
    });
    row.querySelector('.qa-del').addEventListener('click',()=>qaDeleteLine(r.lineIndex));
    box.appendChild(row);
  });
  if(_qaIgnored.length){
    const n=_qaIgnored.length;
    const tog=document.createElement('div');
    tog.className='qa-ignored-toggle';
    tog.textContent=`⌄ ${n} line${n!==1?'s':''} ignored`;
    const list=document.createElement('div');
    list.className='qa-ignored-list';
    list.style.display='none';
    list.textContent=_qaIgnored.map(i=>i.raw).join('\n');
    tog.addEventListener('click',()=>{
      const open=list.style.display==='none';
      list.style.display=open?'':'none';
      tog.textContent=`${open?'⌃':'⌄'} ${n} line${n!==1?'s':''} ignored`;
    });
    box.appendChild(tog);
    box.appendChild(list);
  }
  box.scrollTop=scroll;
}

// ── Tally header + live commit button label ──
function qaUpdateTally(){
  const inc=_qaRows.filter(qaChecked);
  const total=inc.reduce((s,r)=>s+r.count,0);
  const n=Math.min(total,QA_COMMIT_CAP);
  const guessed=_qaRows.filter(r=>r.conf.type!=='given').length;
  const dups=_qaRows.filter(r=>r._dup).length;
  const t=$('qaTally');
  if(t) t.innerHTML=`${n} item${n!==1?'s':''} · ${guessed} guessed · ${dups} duplicate${dups!==1?'s':''}`
    +(total>QA_COMMIT_CAP?` <span class="qa-cap-note">· capped at ${QA_COMMIT_CAP}</span>`:'');
  const btn=$('qaCommitBtn');
  if(btn){
    btn.textContent=n>0?`Add ${n} Item${n!==1?'s':''}`:'Add Items';
    btn.disabled=n===0;
  }
  const seg=$('qaSegPreview');
  if(seg) seg.textContent=`Preview (${_qaRows.length})`;
}

// ── Row edits write back into the source line ──
// Each editable kind maps to the parser's own matcher, so the old
// field is found and stripped exactly the way parsing classifies it
const QA_FIELD_MATCHERS={
  type:matchTypeToken, activity:matchActivityToken,
  slots:matchSlotsToken, capacity:matchVolToken,
};
function qaSetLineField(lineIndex,kind,value){
  const lines=_qaDraft.split('\n');
  if(lineIndex<0||lineIndex>=lines.length)return;
  let parts=lines[lineIndex].split('|').map(s=>s.trim());
  const head=parts.shift();
  const isKind=QA_FIELD_MATCHERS[kind];
  parts=parts.filter(p=>p&&isKind(p)==null);
  if(value)parts.push(value);
  lines[lineIndex]=[head,...parts].join(' | ');
  _qaDraft=lines.join('\n');
  const ta=qaTa(); if(ta)ta.value=_qaDraft;
  qaRefresh(); qaPersistSoon();
}

// ── Per-row icon editing: the emoji is written into the source line ──
// The grammar reads a leading emoji (after an optional count token) as
// the row's icon, so an icon edit is just a text edit - the reparse
// keeps preview and draft honest, and the choice survives in the text.
function qaSetLineIcon(lineIndex, emoji){
  const lines=_qaDraft.split('\n');
  if(lineIndex<0||lineIndex>=lines.length)return;
  const line=lines[lineIndex];
  const bullet=(line.match(/^\s*(?:[-*•·+]\s+|\d{1,3}[.)]\s+)?/)||[''])[0];
  let rest=line.slice(bullet.length);
  const count=rest.match(LEAD_COUNT_RE);
  const countTok=count?count[0]:'';
  if(count)rest=rest.slice(countTok.length);
  const em=rest.match(EMOJI_RE);
  if(em)rest=rest.slice(em[0].length);
  lines[lineIndex]=bullet+countTok+emoji+' '+rest;
  _qaDraft=lines.join('\n');
  const ta=qaTa(); if(ta)ta.value=_qaDraft;
  qaRefresh(); qaPersistSoon();
}

function qaDeleteLine(lineIndex){
  const lines=_qaDraft.split('\n');
  if(lineIndex<0||lineIndex>=lines.length)return;
  lines.splice(lineIndex,1);
  qaShiftChecks(k=>k===lineIndex?null:(k>lineIndex?k-1:k));
  _qaDraft=lines.join('\n');
  const ta=qaTa(); if(ta)ta.value=_qaDraft;
  qaRefresh(); qaPersistSoon();
}

// ── Starter-pack chips ──
function qaPackLines(sport){
  return (STARTER_PACKS[sport]||[])
    .map(id=>{const it=STARTER_ITEMS.find(s=>s.id===id);return it?it.name:null;})
    .filter(Boolean);
}

function qaRenderChips(){
  const box=$('qaChips'); if(!box)return;
  box.innerHTML='';
  QA_SPORTS.forEach(sport=>{
    const b=document.createElement('button');
    b.className='qa-chip'+(_qaPacksOn.has(sport)?' active':'');
    b.style.setProperty('--qa-accent',SPORT_COLOR[sport]);
    b.textContent=`${QA_SPORT_EMOJI[sport]} ${SPORT_LABEL[sport]} (${qaPackLines(sport).length})`;
    b.addEventListener('click',()=>qaTogglePack(sport));
    box.appendChild(b);
  });
  // Starter-loadout opt-in only matters while a pack chip is on
  const opt=$('qaLoadoutOpt');
  if(opt)opt.style.display=_qaPacksOn.size?'':'none';
}

function qaTogglePack(sport){
  if(_qaPacksOn.has(sport)){
    // Remove each injected line once, but only if it still matches
    // exactly - edited lines survive, by design
    _qaPacksOn.delete(sport);
    const want=new Map();
    qaPackLines(sport).forEach(n=>want.set(n,(want.get(n)||0)+1));
    const kept=[];
    for(const ln of _qaDraft.split('\n')){
      const c=want.get(ln)||0;
      if(c>0){want.set(ln,c-1);continue;}
      kept.push(ln);
    }
    _qaDraft=kept.join('\n').replace(/\n{3,}/g,'\n\n').replace(/\s+$/,'');
    // Bulk removal plus blank-line collapse renumbers everything -
    // dropping the overrides beats landing them on the wrong rows
    _qaChecks.clear();
  } else {
    _qaPacksOn.add(sport);
    const cur=_qaDraft.replace(/\s+$/,'');
    _qaDraft=(cur?cur+'\n\n':'')+qaPackLines(sport).join('\n');
  }
  const ta=qaTa(); if(ta)ta.value=_qaDraft;
  qaRenderChips(); qaRefresh(); qaPersistSoon();
}

// ── Take Photo To Add Your Gear: copy the prompt, then open the
// instructions modal. If both clipboard paths fail (file:// is a
// non-secure context), the modal shows the prompt preselected for
// a manual copy instead of the copied confirmation.
function qaCopyLegacySilent(){
  try{
    const ta=document.createElement('textarea');
    ta.value=QA_AI_PROMPT;
    ta.style.cssText='position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(ta);
    ta.focus(); ta.select();
    const ok=document.execCommand('copy');
    ta.remove();
    return ok;
  }catch(e){return false;}
}

function qaOpenPhotoModal(copied){
  const okLine=$('qaPhotoCopied');
  const manual=$('qaPhotoManual');
  if(okLine)okLine.style.display=copied?'':'none';
  if(manual)manual.style.display=copied?'none':'';
  if(!copied){
    const ta=$('qaPhotoPromptText');
    if(ta){ta.value=QA_AI_PROMPT;setTimeout(()=>{ta.focus();ta.select();},120);}
  }
  openModal('qaPhotoModal');
}

function qaPhotoClick(){
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(QA_AI_PROMPT)
      .then(()=>qaOpenPhotoModal(true))
      .catch(()=>qaOpenPhotoModal(qaCopyLegacySilent()));
  } else qaOpenPhotoModal(qaCopyLegacySilent());
}

// ── Mobile WRITE | PREVIEW panes ──
function qaSetPane(which){
  const modal=document.querySelector('#quickAddModal .qa-modal');
  if(modal)modal.classList.toggle('qa-show-preview',which==='preview');
  const w=$('qaSegWrite'), p=$('qaSegPreview');
  if(w)w.classList.toggle('active',which==='write');
  if(p)p.classList.toggle('active',which==='preview');
}

// ── Open ──
function openQuickAdd(){
  _qaSeen=true;
  $('quickAddBtn')?.classList.remove('qa-unseen');
  const ta=qaTa();
  if(ta)ta.value=_qaDraft;
  qaSetPane('write');
  qaRenderChips();
  qaRefresh();
  openModal('quickAddModal');
  setTimeout(()=>{if(ta)ta.focus();},120);
}

// ── Commit ──

// ── Starter loadouts ──
// STARTER_LOADOUTS reference sp_ ids; the committed items carry
// minted user ids, so resolve each reference through its curated
// name against S.userInventory. Dedup-suffixed copies ("Bottle (2)")
// resolve to the user's original - that's the item they own. A sport
// whose backpack didn't survive the preview (line deleted, row
// unchecked) installs nothing: a loadout without its pack is noise.
function qaInstallStarterLoadouts(sports){
  const bare=n=>n.toLowerCase().replace(/\s+/g,' ').trim();
  const resolve=spId=>{
    if(!spId)return null;
    const sp=STARTER_ITEMS.find(x=>x.id===spId); if(!sp)return null;
    const it=S.userInventory.find(i=>bare(i.name)===bare(sp.name));
    return it?it.id:null;
  };
  const bySport={};
  for(const sport of sports){
    const lo=STARTER_LOADOUTS[sport]; if(!lo)continue;
    const backpackId=resolve(lo.backpackId);
    if(!backpackId)continue;
    bySport[sport]={[lo.key]:{label:lo.label,backpackId,
      bladderId:resolve(lo.bladderId),
      bottleLeft:resolve(lo.bottleLeft),
      bottleRight:resolve(lo.bottleRight),
      mainItems:lo.mainItems.map(resolve).filter(Boolean),
      wornItems:lo.wornItems.map(resolve).filter(Boolean)}};
  }
  const installed=Object.keys(bySport);
  if(installed.length)store.dispatch({type:A.INSTALL_LOADOUTS,bySport});
  return installed;
}

// ── Post-commit backpack nudge ──
// Packs are the one type a text line under-specifies (main slots,
// max load, pocket flags), so the commit toast offers a deep link
// into the Edit Item modal, chaining through each added pack.
let _qaNudgePacks=[];
function qaNudgeNext(){
  while(_qaNudgePacks.length){
    const id=_qaNudgePacks.shift();
    const it=S.userInventory.find(i=>i.id===id);
    if(it){openItemDetail(it);return;}
  }
}

// ── One-shot undo of the last commit ──
// The snapshot carries full store slices, so one QA_RESTORE dispatch
// puts everything back (inventory, sample flag, loadouts, board)
function qaUndoCommit(u){
  _qaNudgePacks.length=0;
  _qaDraft=u.draft;
  _qaPacksOn.clear(); u.packs.forEach(s=>_qaPacksOn.add(s));
  _qaChecks.clear(); u.checks.forEach((v,k)=>_qaChecks.set(k,v));
  const ta=qaTa(); if(ta)ta.value=_qaDraft;
  store.dispatch({type:A.QA_RESTORE,state:u.state});
  syncSampleChrome();
  populateLoadoutSel();
  renderAll();
  showToast('↩ Quick Add undone');
}

function qaCommit(){
  const inc=_qaRows.filter(qaChecked);
  if(!inc.length)return;
  const bare=n=>n.toLowerCase().replace(/\s+/g,' ').trim();
  const taken=new Set(S.userInventory.map(i=>bare(i.name)));
  const tagAs=$('qaTagAs')?.value||'all';

  // Snapshot everything the commit can touch, for the toast's Undo.
  // Items are appended, never mutated, so a shallow inventory copy is
  // enough; userLoadouts gets a deep copy because INSTALL_LOADOUTS
  // merges into it. All slices ride one QA_RESTORE dispatch on undo.
  const undoSnap={
    draft:_qaDraft,
    packs:new Set(_qaPacksOn),
    checks:new Map(_qaChecks),
    state:{
      userInventory:[...S.userInventory],
      useSampleGear:S.useSampleGear,
      loadoutKey:S.loadoutKey,
      backpackId:S.backpackId, bladderId:S.bladderId,
      bottleLeft:S.bottleLeft, bottleRight:S.bottleRight,
      mainItems:[...S.mainItems], wornItems:[...S.wornItems],
      userLoadouts:JSON.parse(JSON.stringify(S.userLoadouts)),
    },
  };

  const usedIds=new Set(S.userInventory.map(i=>i.id));
  const mintId=()=>{
    let id;
    do{id='user_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);}
    while(usedIds.has(id));
    usedIds.add(id);
    return id;
  };

  let added=0;
  const minted=[], leftover=[], packIds=[];
  for(const r of _qaRows){
    if(!qaChecked(r))continue;
    let did=0;
    for(let i=0;i<r.count;i++){
      if(added>=QA_COMMIT_CAP)break;
      let name=r.name;
      if(taken.has(bare(name))){
        let n=2;
        while(taken.has(bare(`${r.name} (${n})`)))n++;
        name=`${r.name} (${n})`;
      }
      taken.add(bare(name));
      const it={id:mintId(),icon:r.icon,name,type:r.type,
        activity:r.activity==='__default__'?tagAs:r.activity,
        slots:r.slots,weightKg:r.weightKg,
        capacityL:r.capacityL??null,maxKg:r.maxKg??null,desc:r.desc||''};
      if(r.type==='Backpack'){
        it.packSlots=r.packSlots??7;
        it.backpackBladder=r.backpackBladder!==false;
        it.backpackLeftBottle=r.backpackLeftBottle!==false;
        it.backpackRightBottle=r.backpackRightBottle!==false;
        packIds.push(it.id);
      }
      minted.push(it);
      added++; did++;
    }
    // A row the 300-cap cut short keeps its source line in the draft
    // instead of vanishing with the commit
    if(did<r.count)leftover.push(r.raw);
  }
  if(!added)return;
  store.dispatch({type:A.ADD_ITEMS, items:minted});
  qaCloseActPop(false);
  const loSports=$('qaLoadoutsToo')?.checked?[..._qaPacksOn]:[];
  _qaDraft=leftover.join('\n'); _qaPacksOn.clear(); _qaChecks.clear();
  const ta=qaTa(); if(ta)ta.value=_qaDraft;
  closeModal('quickAddModal');
  // Gated epilogue: only reset the loadout when leaving sample mode.
  // importXML clears unconditionally; Quick Add must not wipe an
  // in-progress user loadout. Loadout install runs after the sample
  // flip so the dropdown refresh sees user mode. renderAll persists -
  // nothing state-changing after it.
  if(S.useSampleGear){setSampleGear(false);clearState();populateLoadoutSel();}
  const loInstalled=loSports.length?qaInstallStarterLoadouts(loSports):[];
  const loCount=loInstalled.length;
  if(loInstalled.includes(S.sport)){
    // The active sport just got a starter loadout. On a fresh board,
    // load it so the user sees their loadout packed instead of a
    // dropdown entry pointing at an empty board. Mid-build, only
    // refresh the dropdown - and not from '__default__', where
    // populateLoadoutSel would hijack the selection.
    const empty=!S.backpackId&&!S.mainItems.length&&!S.wornItems.length;
    if(empty){populateLoadoutSel();loadLoadout(STARTER_LOADOUTS[S.sport].key);}
    else if(S.loadoutKey!=='__default__')populateLoadoutSel();
  }
  renderAll();

  _qaNudgePacks=packIds.slice();
  let msg=`✓ ${added} item${added!==1?'s':''} added`;
  if(packIds.length)msg+=` · ${packIds.length} pack${packIds.length!==1?'s':''}`;
  if(loCount)msg+=` · ${loCount} starter loadout${loCount!==1?'s':''}`;
  if(leftover.length)msg+=` · ${leftover.length} line${leftover.length!==1?'s':''} kept`;
  const actions=[];
  if(packIds.length)actions.push({label:packIds.length>1?`Set Pack Sizes (${packIds.length})`:'Set Pack Size',fn:qaNudgeNext});
  actions.push({label:'Undo',fn:()=>qaUndoCommit(undoSnap)});
  showToast(msg,{actions});
}

// ── Wiring ──
qaTa().addEventListener('input',function(){
  _qaDraft=this.value.slice(0,QA_DRAFT_MAX);
  clearTimeout(_qaRenderTimer);
  _qaRenderTimer=setTimeout(qaRefresh,120);
  qaPersistSoon();
});
qaTa().addEventListener('paste',function(){
  setTimeout(()=>{_qaDraft=this.value.slice(0,QA_DRAFT_MAX);qaRefresh();qaPersistSoon();},0);
});

$('quickAddBtn').addEventListener('click',openQuickAdd);
$('addSampleWarnBulkBtn').addEventListener('click',()=>{
  closeModal('addToSampleWarnModal'); openQuickAdd();
});
$('popQuickAddBtn').addEventListener('click',()=>{
  closeAllPopovers(); openQuickAdd();
});

$('qaPhotoBtn').addEventListener('click',qaPhotoClick);
$('qaPhotoOkBtn').addEventListener('click',()=>closeModal('qaPhotoModal'));

// ── CSV template + upload ──
// Same pipeline as typing: uploaded rows become grammar lines in the
// draft, so the preview, dedup, and commit path treat them like any
// other text. Junk rows fall into the parser's ignored bucket.
$('qaCsvTemplateBtn').addEventListener('click',()=>{
  downloadBlob([
    'name,count,type,activity,weight,slots,capacity',
    'Wool Socks,3,Worn,hike,80g,,',
    '22L Daypack,1,Backpack,hike,0.9kg,12,',
    'Water Bottle,1,Bottle,all,150g,,1L',
    'Headlamp,1,Safety,all,90g,,',
    'First Aid Kit,1,Medical,,,2,',
    'Multi-Tool,1,,,,,',
  ].join('\n'),'TrailKit-gear-template.csv','text/csv');
});
$('qaCsvUploadBtn').addEventListener('click',()=>{
  $('qaCsvFile').click();
});
$('qaCsvFile').addEventListener('change',function(){
  const f=this.files&&this.files[0];
  this.value=''; // same file re-selectable after an edit
  if(!f)return;
  const rd=new FileReader();
  rd.onload=()=>{
    const {lines,skipped}=csvToGearLines(String(rd.result||''));
    if(!lines.length){showToast('No gear rows found in that CSV');return;}
    const cur=_qaDraft.replace(/\s+$/,'');
    const next=(cur?cur+'\n\n':'')+lines.join('\n');
    const clipped=next.length>QA_DRAFT_MAX;
    _qaDraft=next.slice(0,QA_DRAFT_MAX);
    const ta=qaTa(); if(ta)ta.value=_qaDraft;
    qaRefresh(); qaPersistSoon();
    showToast(`${lines.length} line${lines.length!==1?'s':''} loaded from CSV`
      +(skipped?` · ${skipped} row${skipped!==1?'s':''} skipped`:'')
      +(clipped?' · draft is full, tail trimmed':''));
  };
  rd.readAsText(f);
});

// ── Backpack-nudge chain ──
// After the Edit Item save handler settles, open the next added pack.
// The check is deferred: if the modal is still open the save was
// rejected (add-mode validation), so don't stack another one.
$('editSaveBtn').addEventListener('click',()=>{
  if(!_qaNudgePacks.length)return;
  setTimeout(()=>{
    if(!$('itemDetailModal').classList.contains('open'))qaNudgeNext();
  },150);
});
// Closing the modal any way other than Save abandons the chain
$('itemDetailCloseBtn').addEventListener('click',()=>{_qaNudgePacks.length=0;});
document.addEventListener('keydown',e=>{if(e.key==='Escape')_qaNudgePacks.length=0;});
$('qaTagAs').addEventListener('change',()=>{qaRenderPreview();qaUpdateTally();});
$('qaSegWrite').addEventListener('click',()=>qaSetPane('write'));
$('qaSegPreview').addEventListener('click',()=>qaSetPane('preview'));
$('qaCommitBtn').addEventListener('click',qaCommit);
$('qaClearBtn').addEventListener('click',()=>{
  _qaDraft=''; _qaPacksOn.clear(); _qaChecks.clear();
  const ta=qaTa(); if(ta)ta.value='';
  qaRenderChips(); qaRefresh(); qaPersistNow();
});
$('qaCancelBtn').addEventListener('click',()=>{
  qaCloseActPop(false);
  closeModal('quickAddModal'); qaPersistNow();
});
// Backdrop and Escape dismissals are handled by the shared modal
// plumbing; these only flush the draft so dismissal stays lossless.
$('quickAddModal').addEventListener('click',function(e){
  if(e.target===this)qaPersistNow();
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&$('quickAddModal').classList.contains('open')){
    qaCloseActPop(false); qaPersistNow();
  }
});

// Empty-stash CTA (delegated - the card is re-created every render)
$('stashGrid').addEventListener('click',e=>{
  const t=e.target.closest('[data-qa]'); if(!t)return;
  if(t.dataset.qa==='open')openQuickAdd();
  else if(t.dataset.qa==='sample'){
    // Mirror sampleToggleBtn: loadLoadout keeps the dropdown and the
    // board in sync (renderAll alone leaves a phantom selection)
    setSampleGear(true);clearState();populateLoadoutSel();
    loadLoadout($('loadoutSelect')?.value||'__default__');
  }
});

// ── PARSE XML (new schema) ────────────────────────────────────────
function importXML(xmlStr){
  try {
    const parser = new DOMParser();
    const doc    = parser.parseFromString(xmlStr, 'text/xml');
    if(doc.querySelector('parsererror'))
      throw new Error('Malformed XML — check the file and try again.');

    const parsed = parseTrailkitDoc(doc);

    // Items already owned (by id) are skipped, not overwritten
    const existingIds = new Set(S.userInventory.map(i=>i.id));
    const importedItems = parsed.items.filter(it=>!existingIds.has(it.id));
    const newItems = importedItems.length, newLoadouts = parsed.loadoutCount;
    if(importedItems.length) store.dispatch({type:A.ADD_ITEMS, items:importedItems});
    if(newLoadouts) store.dispatch({type:A.INSTALL_LOADOUTS, bySport: parsed.loadoutsBySport});

    // Switch to user gear mode after import. Gated like qaCommit:
    // clearState only when leaving sample mode, so importing more
    // items never wipes an in-progress user loadout. renderAll
    // persists - no explicit persistState after it.
    if(S.useSampleGear){
      setSampleGear(false);
      clearState();
    }
    populateLoadoutSel();
    renderAll();

    showToast(`✓ ${newItems} item${newItems!==1?'s':''} and ${newLoadouts} loadout${newLoadouts!==1?'s':''} imported to Your Gear`);
  } catch(err){
    showToast('Import failed: ' + err.message, {duration:6000});
  }
}

// ── PREVIEW IMPORT VIA OBJECT URL ────────────────────────────────
// (URL.createObjectURL used for instant file reading before parse)
function handleImportFile(file){
  if(!file) return;
  const url = URL.createObjectURL(file);
  fetch(url)
    .then(r => r.text())
    .then(xml => {
      URL.revokeObjectURL(url);
      importXML(xml);
    })
    .catch(err => {
      URL.revokeObjectURL(url);
      showToast('Could not read file: ' + err.message, {duration:6000});
    });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  MODAL HELPERS — thin wrappers around shared UIUtils
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function openModal(id)     { UIUtils.openModal(id); }
function closeModal(id)    { UIUtils.closeModal(id); }
function closeAllModals()  { UIUtils.closeAllModals(); }
function closeAllPopovers(){ UIUtils.closeAllPopovers(); }
document.querySelectorAll('.popover-overlay').forEach(o=>{
  o.addEventListener('click',e=>{ if(e.target===o) closeAllPopovers(); });
});
// Click backdrop of any modal to close it
document.querySelectorAll('.modal-overlay').forEach(o=>{
  o.addEventListener('click',e=>{ if(e.target===o) o.classList.remove('open'); });
});

// ╔══════════════════════════════════════════════════════════════╗
// ║  EDIT / ADD ITEM MODAL  (shared, mode-switched)             ║
// ╚══════════════════════════════════════════════════════════════╝
let _editingItem = null;   // item object being mutated (null in add mode)
let _modalMode   = 'edit'; // 'edit' | 'add'
let _addToSample = false;  // true = adding to SAMPLE_INVENTORY

// Emoji picker data lives in emoji-data.js (AUDIT #5)


let _epActiveCat = 0;
let _epSearch    = '';

function _epPool(){
  if(_epSearch){
    const terms = _epSearch.toLowerCase().split(/\s+/).filter(Boolean);
    return Object.keys(EP_DATA).filter(em=>{
      const kw = EP_DATA[em];
      return terms.every(t => kw.includes(t));
    });
  }
  return EP_TABS[_epActiveCat].keys.filter(k => EP_DATA[k]);
}

function buildEmojiPicker(){
  _epActiveCat = 0; _epSearch = '';
  const cats = $('emojiCats');
  cats.innerHTML = '';
  EP_TABS.forEach((t,i)=>{
    const b = document.createElement('button');
    b.className = 'emoji-cat-btn' + (i===0?' active':'');
    b.title = t.name; b.textContent = t.label;
    b.addEventListener('click',()=>{ _epActiveCat=i; _epSearch='';
      $('emojiSearch').value='';
      renderEmojiGrid(); _epUpdateCats(); });
    cats.appendChild(b);
  });
  // Re-clone search to remove stale listeners
  const old = $('emojiSearch');
  const ns  = old.cloneNode(true); ns.value='';
  old.parentNode.replaceChild(ns, old);
  ns.addEventListener('input', function(){
    _epSearch = this.value.trim();
    renderEmojiGrid();
  });
  renderEmojiGrid();
  setTimeout(()=>ns.focus(), 60);
}

function _epUpdateCats(){
  document.querySelectorAll('.emoji-cat-btn').forEach((b,i)=>b.classList.toggle('active',i===_epActiveCat));
}

function renderEmojiGrid(){
  const grid = $('emojiGrid');
  grid.innerHTML = '';
  const pool = _epPool();
  if(!pool.length){
    grid.innerHTML='<div style="grid-column:1/-1;font-size:11px;color:var(--text-dim);padding:10px 0;text-align:center;">No results</div>';
    return;
  }
  pool.forEach(em=>{
    const b = document.createElement('button');
    b.className='emoji-btn'; b.textContent=em;
    b.title = EP_DATA[em]||'';
    b.addEventListener('click',()=>{ selectEmoji(em); });
    grid.appendChild(b);
  });
}

// Default consumer is the Edit Item modal (writes to #detailIcon).
// Other callers (Quick Add preview rows) pass {anchor, onPick} to
// borrow the picker; the target dies with the picker either way.
let _epTarget = null;
function selectEmoji(em){
  const t = _epTarget;
  closeEmojiPicker();
  if(t){ t.onPick(em); return; }
  $('detailIcon').textContent = em;
}

function openEmojiPicker(target){
  _epTarget = target || null;
  const overlay = $('emojiPickerOverlay');
  const picker  = $('emojiPicker');
  overlay.classList.add('open');
  const r = (target ? target.anchor : $('editIconBtn')).getBoundingClientRect();
  let left = Math.max(8, r.left - 40);
  let top  = r.bottom + 8;
  if(left + 328 > window.innerWidth) left = window.innerWidth - 336;
  if(top  + 340 > window.innerHeight) top = Math.max(8, r.top - 340);
  picker.style.left = left+'px'; picker.style.top = top+'px';
  buildEmojiPicker();
}

function closeEmojiPicker(){
  _epTarget = null;
  $('emojiPickerOverlay').classList.remove('open');
}

$('emojiPickerOverlay').addEventListener('click', function(e){
  if(e.target===this) closeEmojiPicker();
});
$('editIconBtn').addEventListener('click', e=>{
  e.stopPropagation(); openEmojiPicker();
});

// ══════════════════════════════════════════════════════════════
//  TAG PREVIEW + SPECIAL SECTIONS
// ══════════════════════════════════════════════════════════════
const TYPE_COLORS = {
  Backpack:'rgba(96,60,160,0.3)',Bladder:'rgba(74,158,255,0.18)',Bottle:'rgba(0,200,180,0.15)',
  Safety:'rgba(245,166,35,0.2)',Medical:'rgba(232,64,64,0.18)',Tools:'rgba(125,187,255,0.15)',
  Worn:'rgba(61,220,132,0.15)',Item:'rgba(61,84,104,0.2)'
};
const TYPE_TEXT = {
  Backpack:'#c4a0ff',Bladder:'#4a9eff',Bottle:'var(--accent-teal)',
  Safety:'var(--accent-amber)',Medical:'#ff7070',Tools:'#7dbbff',
  Worn:'var(--accent-green)',Item:'var(--text-secondary)'
};

function refreshTagPreview(){
  const type=$('editType').value;
  const act =$('editActivity').value;
  const c=TYPE_COLORS[type]||TYPE_COLORS.Item, tc=TYPE_TEXT[type]||TYPE_TEXT.Item;
  const sc=act==='all'?'tt-sport':`tt-sport-${actList(act)[0]}`;
  let html=`<span class="edit-tag" style="background:${c};color:${tc};border:1px solid rgba(255,255,255,0.1);">${type.toUpperCase()}</span>`;
  if(act!=='all') html+=`<span class="edit-tag ${sc}">${actLabel(act)}</span>`;
  $('editTagsPreview').innerHTML=html;
}

function refreshSpecialSections(){
  const type=$('editType').value;
  $('editSpecialBackpack').style.display=type==='Backpack'?'':'none';
  $('editSpecialBottle').style.display  =type==='Bottle'  ?'':'none';
  $('editSpecialBladder').style.display =type==='Bladder' ?'':'none';
  $('editSlotsLabel').textContent=type==='Backpack'
    ?'Slots This Empty Backpack Takes Up':'Slots Used';
}

// When type changes in Add mode, apply type-specific defaults
function applyTypeDefaults(type){
  if(_modalMode!=='add') return;
  if(type==='Backpack'){
    $('editSlots').value   =7;
    $('editWeight').value  =0.45;
    $('editBpSlots').value =15;
    $('editBpMaxload').value=10;
    $('editBpBladder').checked    =true;
    $('editBpLeftBottle').checked =false;
    $('editBpRightBottle').checked=false;
  } else if(type==='Bladder'){
    $('editSlots').value  =1;
    $('editWeight').value =0.1;
    $('editBladderL').value=2;
  } else if(type==='Bottle'){
    $('editSlots').value  =1;
    $('editWeight').value =0.1;
    $('editBottleL').value=1;
  } else {
    $('editSlots').value  =1;
    $('editWeight').value =0.1;
  }
}

$('editType').addEventListener('change',()=>{
  refreshTagPreview(); refreshSpecialSections();
  applyTypeDefaults($('editType').value);
});
$('editActivity').addEventListener('change', refreshTagPreview);

// ══════════════════════════════════════════════════════════════
//  SHARED: read form → item object
// ══════════════════════════════════════════════════════════════
function readFormIntoItem(it){
  const type=$('editType').value;
  it.icon    =$('detailIcon').textContent.trim()||'📦';
  it.name    =$('editName').value.trim();
  it.type    =type;
  it.activity=$('editActivity').value;
  it.weightKg=parseFloat($('editWeight').value)||0;
  it.desc    =$('editDesc').value.trim();
  if(type==='Backpack'){
    it.slots              =Math.max(1,parseInt($('editSlots').value)||1);
    // For backpack the displayed "slots used" field is editSlots; main compartment is editBpSlots
    // We intentionally store mainSlots separately when displaying backpack in loadout
    // But in the data model, 'slots' = main compartment capacity for backpacks
    it.slots              =Math.max(1,parseInt($('editBpSlots').value)||1);
    it.packSlots          =Math.max(1,parseInt($('editSlots').value)||1);
    it.maxKg              =parseFloat($('editBpMaxload').value)||null;
    it.backpackBladder    =$('editBpBladder').checked;
    it.backpackLeftBottle =$('editBpLeftBottle').checked;
    it.backpackRightBottle=$('editBpRightBottle').checked;
    it.capacityL=null;
  } else if(type==='Bottle'){
    it.slots    =Math.max(1,parseInt($('editSlots').value)||1);
    it.capacityL=parseFloat($('editBottleL').value)||null;
    it.maxKg=null;
  } else if(type==='Bladder'){
    it.slots    =Math.max(1,parseInt($('editSlots').value)||1);
    it.capacityL=parseFloat($('editBladderL').value)||null;
    it.maxKg=null;
  } else {
    it.slots    =Math.max(1,parseInt($('editSlots').value)||1);
    it.capacityL=null; it.maxKg=null;
  }
  return it;
}

// ══════════════════════════════════════════════════════════════
//  OPEN EDIT MODAL
// ══════════════════════════════════════════════════════════════
function openItemDetail(it){
  if(!it) return;
  _editingItem=it; _modalMode='edit';
  $('editModalModeLabel').textContent='Edit Item';
  $('editSaveBtn').textContent='Save Changes';

  $('detailIcon').textContent =it.icon||'📦';
  $('editName').value         =it.name||'';
  $('editType').value         =it.type||'Item';
  // Multi-activity items (comma lists from Quick Add) need a dynamic
  // option or the single-select silently reverts them on save
  const actSel=$('editActivity');
  actSel.querySelectorAll('option[data-multi]').forEach(o=>o.remove());
  const av=it.activity||'all';
  if(av.includes(',')){
    const o=document.createElement('option');
    o.value=av; o.textContent=actLabel(av); o.dataset.multi='1';
    actSel.appendChild(o);
  }
  actSel.value=av;
  // For backpacks "Slots This Empty Backpack Takes Up" = packSlots; "Main Compartment Slots" = slots
  $('editSlots').value        =it.type==='Backpack'?(it.packSlots??it.slots??7):it.slots??1;
  $('editWeight').value       =it.weightKg??0;
  $('editDesc').value         =it.desc||'';
  $('editBpSlots').value      =it.type==='Backpack'?(it.slots??15):15;
  $('editBpMaxload').value    =it.maxKg??'';
  $('editBpBladder').checked    =it.backpackBladder    !==false;
  $('editBpLeftBottle').checked =it.backpackLeftBottle !==false;
  $('editBpRightBottle').checked=it.backpackRightBottle!==false;
  $('editBottleL').value      =it.type==='Bottle' ?(it.capacityL??1):'';
  $('editBladderL').value     =it.type==='Bladder'?(it.capacityL??2):'';

  refreshTagPreview(); refreshSpecialSections();
  openModal('itemDetailModal');
}

// ══════════════════════════════════════════════════════════════
//  OPEN ADD MODAL
// ══════════════════════════════════════════════════════════════
function openAddItemModal(toSample){
  _editingItem=null; _modalMode='add'; _addToSample=!!toSample;
  $('editModalModeLabel').textContent=toSample?'Add New Sample Gear':'Add New Item';
  $('editSaveBtn').textContent=toSample?'Save New Sample Gear':'Save Item';

  $('detailIcon').textContent='📦';
  $('editName').value    ='';
  $('editType').value    ='Item';
  $('editActivity').value='all';
  $('editSlots').value   =1;
  $('editWeight').value  =0.1;
  $('editDesc').value    ='';
  // Backpack defaults
  $('editBpSlots').value =15;
  $('editBpMaxload').value=10;
  $('editBpBladder').checked    =true;
  $('editBpLeftBottle').checked =false;
  $('editBpRightBottle').checked=false;
  // Bottle/Bladder defaults
  $('editBottleL').value =1;
  $('editBladderL').value=2;

  refreshTagPreview(); refreshSpecialSections();
  openModal('itemDetailModal');
  setTimeout(()=>$('editName').focus(), 120);
}

// ══════════════════════════════════════════════════════════════
//  ADD ITEM BUTTON → warn if sample gear active
// ══════════════════════════════════════════════════════════════
$('addItemBtn').addEventListener('click',()=>{
  if(S.useSampleGear){ openModal('addToSampleWarnModal'); }
  else             { openAddItemModal(false); }
});
$('addSampleWarnSwitchBtn').addEventListener('click',()=>{
  closeModal('addToSampleWarnModal');
  setSampleGear(false); clearState(); populateLoadoutSel(); renderAll();
  openAddItemModal(false);
});
$('addSampleWarnSampleBtn').addEventListener('click',()=>{
  closeModal('addToSampleWarnModal');
  openAddItemModal(true);
});

// ══════════════════════════════════════════════════════════════
//  SAVE — handles both edit and add modes
// ══════════════════════════════════════════════════════════════
$('editSaveBtn').addEventListener('click',()=>{
  if(_modalMode==='edit'){
    if(!_editingItem) return;
    const patch = readFormIntoItem({});
    if(S.userInventory.some(i=>i.id===_editingItem.id)){
      store.dispatch({type:A.UPDATE_ITEM, id:_editingItem.id, patch});
    } else {
      // Sample items live outside the store (module-level demo data)
      Object.assign(_editingItem, patch);
    }
    closeModal('itemDetailModal'); closeEmojiPicker();
    _editingItem=null; renderAll();

  } else {
    // Add mode
    const newIt = readFormIntoItem({
      id:'user_'+Date.now()+'_'+Math.random().toString(36).slice(2,7)
    });
    if(!newIt.name){
      const el=$('editName');
      el.focus(); el.style.borderColor='var(--accent-red)';
      setTimeout(()=>el.style.borderColor='',1800);
      return;
    }
    if(_addToSample) SAMPLE_INVENTORY.push(newIt);
    else store.dispatch({type:A.ADD_ITEMS, items:[newIt]});
    closeModal('itemDetailModal'); closeEmojiPicker();
    renderAll();
  }
});

$('itemDetailCloseBtn').addEventListener('click',()=>{
  closeModal('itemDetailModal'); closeEmojiPicker();
});

// ── EDIT MODE ────────────────────────────────────────────────────
let editModeActive = false;
let editHoverEl = null;

function setEditMode(on){
  editModeActive = on;
  document.body.classList.toggle('edit-mode', on);
  $('editItemBtn').classList.toggle('active', on);
  if(!on && editHoverEl){
    editHoverEl.classList.remove('edit-hover');
    editHoverEl = null;
  }
}

$('editItemBtn').addEventListener('click', ()=>{
  setEditMode(!editModeActive);
});

// Highlight slot under cursor when edit mode is on
$('stashGrid').addEventListener('mouseover', e=>{
  if(!editModeActive) return;
  const slot = e.target.closest('.slot[data-id]');
  if(editHoverEl && editHoverEl !== slot) {
    editHoverEl.classList.remove('edit-hover');
    editHoverEl = null;
  }
  if(slot){ slot.classList.add('edit-hover'); editHoverEl = slot; }
});

$('stashGrid').addEventListener('mouseout', e=>{
  if(!editModeActive) return;
  const slot = e.target.closest('.slot[data-id]');
  if(slot && !slot.contains(e.relatedTarget)){
    slot.classList.remove('edit-hover');
    if(editHoverEl === slot) editHoverEl = null;
  }
});

$('stashGrid').addEventListener('click', e=>{
  if(!editModeActive) return;
  const slot = e.target.closest('.slot[data-id]');
  if(!slot) return;
  e.stopPropagation();
  const it = itemById(slot.dataset.id);
  if(it){ openItemDetail(it); setEditMode(false); }
});

// Press Escape to exit edit mode
document.addEventListener('keydown', e=>{
  if(e.key==='Escape'){
    if(editModeActive){ setEditMode(false); return; }
    closeAllModals();
    closeAllPopovers();
  }
});

// ── SAMPLE GEAR TOGGLE ───────────────────────────────────────────
function setSampleGear(on){
  store.dispatch({ type:A.SET_SAMPLE_GEAR, on });
  syncSampleChrome();
}
// One condensed control: the button IS the indicator (amber pulse
// via .sample-active) and the toggle. Title carries the action.
function syncSampleChrome(){
  const on = S.useSampleGear;
  const toggleBtn  = $('sampleToggleBtn');
  const panelTitle = $('stashPanelTitle');
  if(toggleBtn){
    toggleBtn.textContent = on ? '⬡ Sample Gear' : 'Use Sample Gear';
    toggleBtn.title = on ? 'Sample gear is in use - click to switch back to Your Gear'
                         : 'Load the demo inventory and loadouts';
    toggleBtn.classList.toggle('sample-active', on);
  }
  if(panelTitle) panelTitle.textContent = 'Inventory';
}

$('sampleToggleBtn').addEventListener('click', ()=>{
  setSampleGear(!S.useSampleGear);
  clearState();
  populateLoadoutSel();
  loadLoadout($('loadoutSelect')?.value || '__default__');
});

// ── EXPORT MODAL + SAMPLE GEAR WARNING ───────────────────────────
let pendingExportFn = null;

const EXPORT_WARN_MSGS = {
  xml:     "You're about to export Sample Gear data as a TrailKit file. Switch to Your Gear first to export your personal inventory and loadouts.",
  packing: "You're about to export Sample Gear packing lists, not your own loadouts. The downloaded file will contain sample data.",
  csv:     "You're about to export a CSV of Sample Gear and sample loadouts, not your personal inventory."
};

function maybeExport(exportFn, type){
  closeAllPopovers();
  if(S.useSampleGear){
    pendingExportFn = exportFn;
    const msgEl = $('sampleExportWarnMsg');
    if(msgEl) msgEl.textContent = EXPORT_WARN_MSGS[type] || EXPORT_WARN_MSGS.xml;
    openModal('sampleExportWarnModal');
  } else {
    exportFn();
  }
}

// ── ABOUT / HELP MODAL ───────────────────────────────────────────
$('fmAboutBtn').addEventListener('click', ()=>{
  closeAllPopovers(); openModal('aboutModal');
});
$('aboutCloseBtn').addEventListener('click', ()=>closeModal('aboutModal'));

$('dlTrailkitBtn').addEventListener('click',  ()=>maybeExport(exportXML,           'xml'));
$('dlPackingBtn').addEventListener('click',   ()=>maybeExport(exportPackingLists,   'packing'));
$('dlCsvBtn').addEventListener('click',       ()=>maybeExport(exportCSV,            'csv'));

// Sample gear export warning modal
$('sampleWarnCancelBtn').addEventListener('click', ()=>{
  pendingExportFn = null;
  closeModal('sampleExportWarnModal');
});
$('sampleWarnExportBtn').addEventListener('click', ()=>{
  closeModal('sampleExportWarnModal');
  if(pendingExportFn){ pendingExportFn(); pendingExportFn = null; }
});

// ── FILE MENU ────────────────────────────────────────────────────
// One popover consolidating Import / Export / About (v1.15). Also the
// anchor the mobile Etc-tab import/export buttons delegate to.
$('fileMenuBtn').addEventListener('click', function(e){
  e.stopPropagation();
  const overlay = $('fileOverlay');
  const pop     = $('fileMenu');
  const rect    = this.getBoundingClientRect();
  pop.style.right = (window.innerWidth - rect.right) + 'px';
  pop.style.top   = (rect.bottom + 6) + 'px';
  pop.style.left  = 'auto';
  overlay.classList.toggle('open');
});
$('uploadTrailkitBtn').addEventListener('click', ()=>{
  // Mode flips inside importXML on success - flipping here would
  // strand the user in an empty inventory if they cancel the dialog
  $('importFileInput').click();
});
$('importFileInput').addEventListener('change', function(){
  const file = this.files[0]; if(!file) return;
  handleImportFile(file);
  closeAllPopovers();
  this.value = '';
});

// Mobile tab bar, Etc-tab export, essential-modal close - wired
// here because inline onclick is dead inside the bundled IIFE
$('mTabGear').addEventListener('click', ()=>mSetTab('gear'));
$('mTabPack').addEventListener('click', ()=>mSetTab('pack'));
$('mTabStats').addEventListener('click', ()=>mSetTab('stats'));
$('mExportBtn').addEventListener('click', ()=>$('fileMenuBtn').click());
$('essModalCloseBtn').addEventListener('click', ()=>closeModal('essentialModal'));

// Close popovers when clicking outside
document.addEventListener('click', e=>{
  if(!e.target.closest('#fileOverlay') && !e.target.closest('#fileMenuBtn')){
    closeAllPopovers();
  }
});

// ── CUSTOM ACTIVITIES — Manage Activities modal ──────────────────
// One entry point (the ⚙ row in the activity dropdown), one modal.
// Built-ins are fixed; up to 4 customs with label, emoji (existing
// picker), and a preset color swatch. Keys are minted once from the
// first label and stay stable across renames - items and loadouts
// reference the key. Deleting requires the activity to have no
// loadouts; items tagged with it fall back to 'all' (reducer).
const ACT_CUSTOM_CAP = 4;
const ACT_PRESET_COLORS = ['#e05252','#e08f3c','#3cc98f','#4a90e0','#b06ae0','#e05a9e'];

function actSlug(label){
  let base = String(label||'').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'') || 'activity';
  const taken = new Set(['all','__manage__','__default__',...allSports()]);
  let key = base, n = 2;
  while(taken.has(key)) key = `${base}-${n++}`;
  return key;
}

// Everything that lists sports re-derives after a change
function refreshActivities(){
  setExtraActivities(S.customActivities);
  populateSportSelects();
  populateLoadoutSel();
  renderAll(); // persists; also refreshes tooltips/labels using customs
}

function populateSportSelects(){
  const opt=(v,txt)=>{const o=document.createElement('option');o.value=v;o.textContent=txt;return o;};
  const as=$('activitySelect');
  if(as){
    as.innerHTML='';
    allSports().forEach(k=>as.appendChild(opt(k,`${sportEmoji(k)} ${sportLabel(k)}`)));
    as.appendChild(opt('__manage__','⚙ Manage Activities…'));
    as.value=allSports().includes(S.sport)?S.sport:'hike';
  }
  const gf=$('gearFilter');
  if(gf){
    const cur=gf.value||S.gearFilter||'all';
    gf.innerHTML='';
    gf.appendChild(opt('all','All Activities'));
    allSports().forEach(k=>gf.appendChild(opt(k,`${sportEmoji(k)} ${sportLabel(k)}`)));
    gf.value=['all',...allSports()].includes(cur)?cur:'all';
  }
  const qt=$('qaTagAs');
  if(qt){
    const cur=qt.value||'all';
    qt.innerHTML='';
    qt.appendChild(opt('all','All Activities'));
    allSports().forEach(k=>qt.appendChild(opt(k,sportLabel(k))));
    qt.value=['all',...allSports()].includes(cur)?cur:'all';
  }
  const ea=$('editActivity');
  if(ea){
    const cur=ea.value||'all';
    ea.innerHTML='';
    ea.appendChild(opt('all','All Activities'));
    allSports().forEach(k=>ea.appendChild(opt(k,sportLabel(k))));
    if(['all',...allSports()].includes(cur)) ea.value=cur;
  }
}

function renderActivitiesModal(){
  const bl=$('actBuiltinList');
  bl.innerHTML='';
  SPORT_KEYS.forEach(k=>{
    const row=document.createElement('div');
    row.className='act-row act-row-builtin';
    row.innerHTML=`<span class="act-emoji">${sportEmoji(k)}</span>
      <span class="act-name">${sportLabel(k)}</span>
      <span class="act-builtin-tag">built-in</span>`;
    bl.appendChild(row);
  });
  const cl=$('actCustomList');
  cl.innerHTML='';
  S.customActivities.forEach(c=>{
    const row=document.createElement('div');
    row.className='act-row';
    row.innerHTML=`
      <button class="act-emoji act-emoji-btn" type="button" title="Change emoji">${c.emoji}</button>
      <input class="edit-input act-name-in" maxlength="18" value="${esc(c.label)}">
      <span class="act-swatches">${ACT_PRESET_COLORS.map(col=>
        `<button class="act-swatch${col===c.color?' active':''}" type="button" style="background:${col}" data-col="${col}"></button>`).join('')}</span>
      <span class="act-del" title="Delete activity">×</span>`;
    const emBtn=row.querySelector('.act-emoji-btn');
    emBtn.addEventListener('click',e=>{
      e.stopPropagation();
      openEmojiPicker({anchor:emBtn,onPick:em=>{
        store.dispatch({type:A.UPDATE_ACTIVITY,key:c.key,patch:{emoji:em}});
        refreshActivities(); renderActivitiesModal();
      }});
    });
    const nameIn=row.querySelector('.act-name-in');
    nameIn.addEventListener('change',()=>{
      const label=nameIn.value.trim();
      if(!label){ nameIn.value=c.label; return; }
      const patch={label};
      // While nothing references the key yet (no loadouts, no tagged
      // items, not the active sport), re-slug it from the new label so
      // keys read 'skiing', not 'new-activity-1'. Once referenced, the
      // key is frozen and only the label changes.
      const referenced = Object.keys(S.userLoadouts[c.key]||{}).length>0
        || S.userInventory.some(i=>actList(i.activity).includes(c.key))
        || S.sport===c.key;
      if(!referenced) patch.key=actSlug(label);
      store.dispatch({type:A.UPDATE_ACTIVITY,key:c.key,patch});
      refreshActivities(); renderActivitiesModal();
    });
    row.querySelectorAll('.act-swatch').forEach(sw=>{
      sw.addEventListener('click',()=>{
        store.dispatch({type:A.UPDATE_ACTIVITY,key:c.key,patch:{color:sw.dataset.col}});
        refreshActivities(); renderActivitiesModal();
      });
    });
    const delBtn=row.querySelector('.act-del');
    delBtn.addEventListener('click',()=>{
      const n=Object.keys(S.userLoadouts[c.key]||{}).length;
      // With loadouts attached, deletion is a two-click confirm: the
      // first click arms the button and names the cascade, the second
      // (within 4s) deletes activity + loadouts together
      if(n && !delBtn.dataset.armed){
        delBtn.dataset.armed='1';
        delBtn.classList.add('armed');
        delBtn.title=`Also deletes ${n} loadout${n!==1?'s':''} - click again to confirm`;
        showToast(`"${c.label}" has ${n} loadout${n!==1?'s':''} - click × again to delete both`,{duration:4000});
        setTimeout(()=>{delete delBtn.dataset.armed;delBtn.classList.remove('armed');},4000);
        return;
      }
      const wasActive = S.sport===c.key;
      store.dispatch({type:A.REMOVE_ACTIVITY,key:c.key});
      if(wasActive){
        store.dispatch({type:A.SET_SPORT,sport:'hike'});
        clearState();
      }
      refreshActivities(); renderActivitiesModal();
    });
    cl.appendChild(row);
  });
  $('actAddBtn').style.display =
    S.customActivities.length>=ACT_CUSTOM_CAP ? 'none' : '';
}

function openActivitiesModal(){
  renderActivitiesModal();
  openModal('activitiesModal');
}

$('actAddBtn').addEventListener('click',()=>{
  if(S.customActivities.length>=ACT_CUSTOM_CAP) return;
  const label=`New Activity ${S.customActivities.length+1}`;
  const used=new Set(S.customActivities.map(c=>c.color));
  const color=ACT_PRESET_COLORS.find(c=>!used.has(c))||ACT_PRESET_COLORS[0];
  store.dispatch({type:A.ADD_ACTIVITY,activity:{key:actSlug(label),label,emoji:'⛰️',color}});
  refreshActivities(); renderActivitiesModal();
  const ins=document.querySelectorAll('#actCustomList .act-name-in');
  const last=ins[ins.length-1];
  if(last){ last.focus(); last.select(); }
});
$('actCloseBtn').addEventListener('click',()=>closeModal('activitiesModal'));

// ── ACTIVITY / LOADOUT SELECTS ───────────────────────────────────
$('activitySelect').addEventListener('change', function(){
  if(this.value==='__manage__'){
    this.value=S.sport;             // never leave ⚙ selected
    openActivitiesModal();
    return;
  }
  // Guard against programmatic/bogus values - a stray SET_SPORT would
  // mint a phantom loadout namespace under that key
  if(!allSports().includes(this.value)){ this.value=S.sport; return; }
  store.dispatch({ type: A.SET_SPORT, sport: this.value });
  populateLoadoutSel();
  loadLoadout($('loadoutSelect')?.value || '__default__');
});
$('loadoutSelect').addEventListener('change', function(){
  loadLoadout(this.value);
});

// ── GEAR FILTER ──────────────────────────────────────────────────
$('gearFilter').addEventListener('change', function(){
  store.dispatch({ type: A.SET_GEAR_FILTER, filter: this.value });
  renderStash();
});

// ── SAVE NEW ─────────────────────────────────────────────────────
const saveModal  = $('saveModal');
const saveInput  = $('saveInput');
$('saveNewBtn').addEventListener('click', ()=>{
  saveInput.value = ''; openModal('saveModal'); setTimeout(()=>saveInput.focus(), 150);
});
$('saveCancelBtn').addEventListener('click', ()=>closeModal('saveModal'));
$('saveConfirmBtn').addEventListener('click', ()=>{
  const label = saveInput.value.trim(); if(!label){ saveInput.focus(); return; }
  const key   = label.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
  store.dispatch({ type:A.SAVE_LOADOUT, sport:S.sport, key, snapshot:snapshotLoadout(label) });
  populateLoadoutSel();
  $('loadoutSelect').value = key;
  closeModal('saveModal');
  persistState(); // the save must survive an immediate tab close
});
saveInput.addEventListener('keydown', e=>{
  if(e.key==='Enter') $('saveConfirmBtn').click();
});

// ── OVERWRITE ────────────────────────────────────────────────────
$('overwriteBtn').addEventListener('click', ()=>{
  const lo = allLoadouts(S.sport)[S.loadoutKey];
  $('overwriteMsg').textContent =
    lo ? `Overwrite "${lo.label}" with your current loadout?` : 'Overwrite selected loadout?';
  openModal('overwriteModal');
});
$('overwriteCancelBtn').addEventListener('click', ()=>closeModal('overwriteModal'));
$('overwriteConfirmBtn').addEventListener('click', ()=>{
  const existing = allLoadouts(S.sport)[S.loadoutKey];
  store.dispatch({ type:A.SAVE_LOADOUT, sport:S.sport, key:S.loadoutKey, snapshot:snapshotLoadout((existing||{}).label || S.loadoutKey) });
  closeModal('overwriteModal');
  persistState(); // ditto Save New - dispatch alone never persists
});

// ── DELETE LOADOUT ───────────────────────────────────────────────
// Deletes the selected SAVED user loadout (the board is untouched
// until reload; gear items always stay in the inventory). Sample
// loadouts are baked in and refuse.
$('deleteLoadoutBtn').addEventListener('click', ()=>{
  const key=S.loadoutKey;
  if(key==='__default__'){ showToast('No saved loadout selected'); return; }
  const userLo=S.userLoadouts[S.sport]?.[key];
  if(!userLo){ showToast('Sample loadouts are built in and can\'t be deleted'); return; }
  $('deleteLoMsg').textContent=
    `Delete "${userLo.label||key}"? Your gear items stay in the inventory.`;
  openModal('deleteLoModal');
});
$('deleteLoCancelBtn').addEventListener('click', ()=>closeModal('deleteLoModal'));
$('deleteLoConfirmBtn').addEventListener('click', ()=>{
  store.dispatch({ type:A.DELETE_LOADOUT, sport:S.sport, key:S.loadoutKey });
  closeModal('deleteLoModal');
  clearState();
  populateLoadoutSel();
  loadLoadout($('loadoutSelect')?.value || '__default__');
});

// ── CLEAR ────────────────────────────────────────────────────────
$('clearBtn').addEventListener('click', ()=>openModal('clearModal'));
$('clearCancelBtn').addEventListener('click', ()=>closeModal('clearModal'));
$('clearConfirmBtn').addEventListener('click', ()=>{
  clearState(); closeModal('clearModal'); renderAll();
});

// ── THEME ────────────────────────────────────────────────────────
let isLight = false;
$('themeToggle').addEventListener('click', ()=>{
  isLight = !isLight;
  document.body.classList.toggle('light', isLight);
});

// ── ESSENTIAL ITEMS POPUP ────────────────────────────────────────
// Clicking any of the three counters (Safety / Medical / Tools) opens
// a modal listing every item of that type currently in the loadout.
const ESS_META = {
  'Safety':  { icon:'🔦', label:'Safety Items' },
  'Medical': { icon:'🩺', label:'Medical Items' },
  'Tools':   { icon:'🔧', label:'Tools' },
};

function openEssentialPopup(type){
  const meta = ESS_META[type]; if(!meta) return;
  // Collect all loadout item IDs
  const ids = [S.backpackId, ...(Array.isArray(S.bladderId)?S.bladderId:[S.bladderId].filter(Boolean)), S.bottleLeft, S.bottleRight,
               ...S.mainItems, ...S.wornItems].filter(Boolean);
  const items = ids.map(id=>itemById(id)).filter(it=>it && it.type===type);

  $('essModalIcon').textContent  = meta.icon;
  $('essModalTitle').textContent = meta.label;
  $('essModalSub').textContent   =
    items.length ? `${items.length} item${items.length!==1?'s':''} packed` : 'None packed';

  const list  = $('essModalList');
  const empty = $('essModalEmpty');
  list.innerHTML = '';

  if(!items.length){
    list.style.display = 'none';
    empty.style.display = 'block';
  } else {
    list.style.display = 'flex';
    empty.style.display = 'none';
    items.forEach(it=>{
      const row = document.createElement('div');
      row.style.cssText = `display:flex;align-items:center;gap:12px;padding:9px 12px;
        background:var(--bg-slot);border:1px solid var(--border);border-radius:3px;`;
      row.innerHTML = `
        <span style="font-size:22px;line-height:1;">${it.icon}</span>
        <div style="flex:1;">
          <div style="font-family:'Rajdhani',sans-serif;font-size:14px;font-weight:700;
            color:var(--text-primary);">${it.name}</div>
          ${it.desc ? `<div style="font-size:11px;color:var(--text-secondary);margin-top:2px;
            line-height:1.4;">${it.desc}</div>` : ''}
        </div>
        <div style="font-family:'Share Tech Mono',monospace;font-size:12px;
          color:var(--accent-teal);white-space:nowrap;">${fkg(it.weightKg)}</div>`;
      list.appendChild(row);
    });
  }
  openModal('essentialModal');
}

// Wire counter elements — called after init() to be safe
function wireEssentialCounters(){
  ['ctr-Safety','ctr-Medical','ctr-Tools',
   'mCtr-Safety','mCtr-Medical','mCtr-Tools'].forEach(id=>{
    const el = $(id);
    if(!el) return;
    const type = id.replace(/^m?[Cc]tr-/,'');
    // Remove any previous listener before re-adding (safe re-wire)
    if(el._essHandler) el.removeEventListener('click', el._essHandler);
    el._essHandler = ()=> openEssentialPopup(type);
    el.addEventListener('click', el._essHandler);
    el.title = `View ${type} items`;
  });
}

// ── INIT ─────────────────────────────────────────────────────────

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  MOBILE LAYER — tab navigation + touch-to-place engine
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const MOBILE_BP = 720; // breakpoint in px

// ── Is mobile? Checked live so resize works ──
function isMobile(){ return window.innerWidth <= MOBILE_BP; }

// ── Active tab state ──
let _mTab = 'gear'; // 'gear' | 'pack' | 'stats'

// ── Touch-to-place selection ──
let _mSel = null; // { id, el } — currently selected stash item

// ── Tab switching ──────────────────────────────────────────────
function mSetTab(tab){
  if(!isMobile()) return;
  _mTab = tab;

  // Panel visibility
  const stash  = document.querySelector('.stash-panel');
  const right  = document.querySelector('.right-panel');
  const stats  = $('mStatsPanel');

  stash.classList.toggle('m-active',  tab === 'gear');
  right.classList.toggle('m-active',  tab === 'pack');
  if(stats) stats.classList.toggle('m-active', tab === 'stats');

  // Tab button highlights
  ['gear','pack','stats'].forEach(t=>{
    const btn = $(`mTab${t.charAt(0).toUpperCase()+t.slice(1)}`);
    if(btn) btn.classList.toggle('m-tab-active', t === tab);
  });

  // Update hint text to guide the user through the two-tap flow
  mUpdateHint();

  // When entering Pack tab with a selection, highlight valid zones
  if(tab === 'pack' && _mSel){
    const it = itemById(_mSel.id);
    if(it) mHighlightDropZones(it);
  } else {
    document.querySelectorAll('.m-drop-ready').forEach(el=>el.classList.remove('m-drop-ready'));
  }
}

// ── Update hint banner text based on current state ───────────
function mUpdateHint(){
  const hint = $('mTapHint');
  if(!hint) return;
  if(!isMobile()){ hint.style.display='none'; return; }
  if(!_mSel){ hint.style.display='none'; return; }
  const it = itemById(_mSel.id);
  if(!it){ hint.style.display='none'; return; }
  if(_mTab === 'gear'){
    hint.textContent = `${it.icon} ${it.name} selected — tap ⬡ Pack to place`;
  } else if(_mTab === 'pack'){
    hint.textContent = `${it.icon} ${it.name} — tap a slot to place`;
  } else {
    hint.textContent = `${it.icon} ${it.name} selected`;
  }
  hint.style.display = 'block';
  hint.style.color = '';
}

// ── Clear tap-to-place selection ──────────────────────────────
function mClearSel(){
  if(_mSel && _mSel.el){
    _mSel.el.classList.remove('m-selected');
  }
  _mSel = null;
  // Hide hint banner
  const hint = $('mTapHint');
  if(hint) hint.style.display = 'none';
  // Remove drop-ready highlights from all slots
  document.querySelectorAll('.m-drop-ready').forEach(el=>el.classList.remove('m-drop-ready'));
}

// ── Highlight valid drop zones for selected item ──────────────
function mHighlightDropZones(it){
  // Determine which zones this item type can go to
  const typeZones = {
    'Backpack': ['backpack'],
    'Bladder':  ['bladder'],
    'Bottle':   ['bottle-left','bottle-right'],
    'Worn':     ['worn'],
  };
  const validZones = typeZones[it.type] || ['main'];
  // Add m-drop-ready to all droppable elements matching valid zones
  document.querySelectorAll('[data-zone]').forEach(el=>{
    if(validZones.includes(el.dataset.zone)){
      if(el.classList.contains('empty-slot') || el.classList.contains('worn-add-row')
        || el.id === 'backpackSlot' || el.id === 'bladderSlot'
        || el.id === 'bottleLeft'  || el.id === 'bottleRight'){
        el.classList.add('m-drop-ready');
      }
    }
  });
}

// ── Handle tap on a stash item (Gear tab) ────────────────────
function mTapStashItem(id, el){
  if(!isMobile()) return;
  const it = itemById(id); if(!it) return;

  // Tap the same item: deselect
  if(_mSel && _mSel.id === id){
    mClearSel();
    return;
  }

  // Select new item
  mClearSel();
  _mSel = { id, el };
  el.classList.add('m-selected');

  // Show hint via central helper (text depends on current tab)
  mUpdateHint();
}

// ── Handle tap on a drop zone (Pack tab) ─────────────────────
function mTapDropZone(zone, idx){
  if(!isMobile() || !_mSel) return;
  const id = _mSel.id;
  const it = itemById(id); if(!it) return;

  // Validate via RulesEngine
  const check = RulesEngine.validate(it, zone, S);
  if(!check.valid){
    // Flash hint with reason
    const hint = $('mTapHint');
    if(hint){
      hint.textContent = `⚠ ${check.reason}`;
      hint.style.display = 'block';
      hint.style.color = 'var(--accent-red)';
      setTimeout(()=>{ hint.style.color=''; mUpdateHint(); }, 2000);
    }
    return;
  }

  // Place item (stash → zone, no removeFrom needed since stash items aren't "in" the store)
  placeTo(zone, id, it);
  mClearSel();
  renderAll();
}

// ── Wire mobile tap listeners onto newly rendered slots ───────
// Called at end of renderAll when on mobile.
// Strategy: stash items and main-grid slots are recreated each render,
// so we bind fresh each time (no guard needed — new elements).
// Big slots (backpack, bladder, bottles) persist; we store the handler
// on the element and removeEventListener before re-adding.
// ── Mobile long-press tooltip engine ────────────────────────────
// A 350ms hold on any gear slot shows the same tooltip card used on
// desktop hover. A quick tap (< 350ms) cancels the timer so the
// normal tap-to-place flow is completely unaffected.
// The tooltip auto-dismisses after 2.5s or on the next touchstart.

let _lpTimer  = null;   // pending long-press setTimeout
let _lpActive = false;  // true while tooltip is showing from a long-press

function mLongPressStart(e, it){
  if(!it) return;
  // Cancel any existing timer
  clearTimeout(_lpTimer);
  _lpTimer = setTimeout(()=>{
    _lpActive = true;
    // Build a synthetic event-like object from the touch position
    const touch = e.touches[0];
    const fakeE = { clientX: touch.clientX, clientY: touch.clientY };
    showTip(fakeE, it);
    // Prevent the pending tap from firing as a select action
    _lpSuppressNext = true;
  }, 500);
}

function mLongPressCancel(){
  clearTimeout(_lpTimer);
  _lpTimer = null;
  // Don't hide tip here — let the 2.5s auto-dismiss or next touchstart handle it
}

let _lpSuppressNext = false; // swallows the click that fires after a long-press

// Auto-dismiss when user touches anywhere while tooltip is showing
document.addEventListener('touchstart', ()=>{
  if(_lpActive){
    hideTip();
    _lpActive = false;
  }
}, { passive: true });

// ── Mobile tap + long-press wiring, DELEGATED (AUDIT #3) ─────────
// One listener per stable container instead of per-node binding with
// _mTapBound/_mHandler/_lpBound flags. Rendered slots come and go;
// the containers (#stashGrid, .loadout-body, #mainGrid,
// #mobileWornList) persist, so this binds exactly once at init.
// Every handler checks isMobile() live, which also makes
// desktop→mobile resizes work without re-wiring.

const M_BIG_SLOT_ZONE = {
  backpackSlot:'backpack', bladderSlot:'bladder',
  bottleLeft:'bottle-left', bottleRight:'bottle-right',
};

// Swallow the synthetic click that follows a long-press, and taps
// that merely dismiss an open long-press tooltip
function mTapSwallowed(){
  if(_lpSuppressNext){ _lpSuppressNext = false; return true; }
  return _lpActive;
}

function mItemInZone(zone){
  if(zone==='backpack')     return itemById(S.backpackId);
  if(zone==='bladder')      return itemById(Array.isArray(S.bladderId)?S.bladderId[0]:S.bladderId);
  if(zone==='bottle-left')  return itemById(S.bottleLeft);
  if(zone==='bottle-right') return itemById(S.bottleRight);
  return null;
}

function delegateLongPress(container, resolveItem){
  container.addEventListener('touchstart', e=>{
    if(!isMobile()) return;
    const it = resolveItem(e);
    if(it) mLongPressStart(e, it);
  }, { passive: true });
  container.addEventListener('touchend',  mLongPressCancel, { passive: true });
  container.addEventListener('touchmove', mLongPressCancel, { passive: true });
}

function initMobileDelegation(){
  // ── Stash: tap to select, long-press to preview
  const stashGrid = $('stashGrid');
  stashGrid.addEventListener('click', e=>{
    if(!isMobile() || mTapSwallowed()) return;
    const el = e.target.closest('.slot[data-id]:not(.in-loadout)');
    if(el) mTapStashItem(el.dataset.id, el);
  });
  delegateLongPress(stashGrid, e=>{
    const el = e.target.closest('.slot[data-id]');
    return el ? itemById(el.dataset.id) : null;
  });

  // ── Big slots (backpack/bladder/bottles): tap to place, long-press
  // to preview the current occupant. Bound on .loadout-body because
  // the slot nodes themselves are clone-replaced every render.
  const loBody = document.querySelector('.loadout-body');
  loBody.addEventListener('click', e=>{
    if(!isMobile() || mTapSwallowed() || !_mSel) return;
    const slotEl = e.target.closest('#backpackSlot,#bladderSlot,#bottleLeft,#bottleRight');
    if(slotEl) mTapDropZone(M_BIG_SLOT_ZONE[slotEl.id], null);
  });
  delegateLongPress(loBody, e=>{
    const slotEl = e.target.closest('#backpackSlot,#bladderSlot,#bottleLeft,#bottleRight');
    if(slotEl) return mItemInZone(M_BIG_SLOT_ZONE[slotEl.id]);
    const mainEl = e.target.closest('#mainGrid .slot[data-id]');
    return mainEl ? itemById(mainEl.dataset.id) : null;
  });

  // ── Main grid: tap an empty slot to place (removal is the ✕ on
  // each filled slot; long-press handled by the loadout-body binding)
  $('mainGrid').addEventListener('click', e=>{
    if(!isMobile() || mTapSwallowed() || !_mSel) return;
    const el = e.target.closest('.empty-slot.droppable');
    if(el) mTapDropZone('main', parseInt(el.dataset.index) || 0);
  });

  // ── Mobile worn list: tap the add-row to place
  const mWornList = $('mobileWornList');
  if(mWornList){
    mWornList.addEventListener('click', e=>{
      if(!isMobile() || !_mSel) return;
      if(e.target.closest('.worn-add-row')) mTapDropZone('worn', S.wornItems.length);
    });
  }
}

// ── Mobile theme toggle (themeToggle now lives in topbar, no mobile dupe needed) ──
function initMobileThemeToggle(){
  // themeToggle is in the topbar and visible on mobile; nothing extra to wire.
}

// ── Mobile init ───────────────────────────────────────────────
function initMobile(){
  if(!isMobile()) return;
  mSetTab('gear');
  initMobileThemeToggle();
  // Wire Etc-tab Import button to same handler as desktop Import btn
  const mImp = $('mImportBtn');
  if(mImp && !mImp._wired){
    mImp._wired = true;
    mImp.addEventListener('click', ()=> $('fileMenuBtn').click());
  }
}

// ── Handle resize: re-init if crossing breakpoint ─────────────
let _wasMobile = isMobile();
window.addEventListener('resize', ()=>{
  const nowMobile = isMobile();
  if(nowMobile !== _wasMobile){
    _wasMobile = nowMobile;
    if(nowMobile) initMobile();
    else mClearSel();
    renderAll();
  }
});

(function init(){
  restoreState(); // rehydrates S.useSampleGear, S.userInventory, userLoadouts, activeLoadout

  // Amber dot on Quick Add until its first open
  $('quickAddBtn')?.classList.toggle('qa-unseen', !_qaSeen);

  // Version strings render from the VERSION constant (AUDIT #10)
  document.querySelectorAll('[data-version]').forEach(el=>{ el.textContent='v'+VERSION; });

  // Sync the sample/user chrome (inventory itself is derived state)
  syncSampleChrome();

  // Activities: register customs with the parser, then build every
  // sport dropdown (also selects S.sport in the activity select)
  setExtraActivities(S.customActivities);
  populateSportSelects();

  initStashDrop();
  populateLoadoutSel();

  const loSel = $('loadoutSelect');
  if(loSel && loSel.querySelector(`option[value="${CSS.escape(S.loadoutKey)}"]`)){
    loSel.value = S.loadoutKey;
  }

  renderAll();
  initMobileDelegation(); // one-time delegated tap/long-press wiring
  initMobile(); // must run after renderAll so DOM is ready
  wireEssentialCounters();
})();
