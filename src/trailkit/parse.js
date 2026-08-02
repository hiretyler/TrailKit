// ── QUICK ADD PARSER ─────────────────────────────────────────────
// Pure, DOM-free line grammar for the Quick Add modal. Turns pasted
// or typed gear text into candidate inventory rows. Never rejects a
// line outright - unparseable noise lands in the `ignored` bucket,
// pure markdown scaffolding (fences, headers, table rules) is
// dropped silently. Count expansion is NOT this module's job: each
// source line maps to exactly one row carrying its count.

import { STARTER_ITEMS, GEAR_KEYWORDS } from './quickadd-data.js';

const TYPES = ['Backpack','Bladder','Bottle','Safety','Medical','Tools','Worn','Item'];

const TYPE_SYNONYM = {
  clothing:'Worn', apparel:'Worn', clothes:'Worn', wear:'Worn',
  'first aid':'Medical', med:'Medical', medkit:'Medical', meds:'Medical',
  tool:'Tools', repair:'Tools',
  pack:'Backpack', rucksack:'Backpack', daypack:'Backpack',
  reservoir:'Bladder', hydration:'Bladder',
  flask:'Bottle',
  emergency:'Safety',
  gear:'Item', misc:'Item', other:'Item', equipment:'Item',
};

const ACT_SYNONYM = {
  all:'all', any:'all', general:'all',
  hike:'hike', hiking:'hike',
  bike:'bike', mtb:'bike', 'mountain bike':'bike', cycling:'bike', biking:'bike',
  run:'run', running:'run',
  climb:'climb', climbing:'climb',
  moto:'moto', motorcycle:'moto', motorbike:'moto',
  camp:'camp', camping:'camp',
};

// Per-type fallbacks when nothing better is known
const TYPE_ICON   = {Backpack:'🎒',Bladder:'💧',Bottle:'🥤',Safety:'🔦',Medical:'🩺',Tools:'🔧',Worn:'🧦',Item:'📦'};
const TYPE_WEIGHT = {Backpack:0.9,Bladder:0.18,Bottle:0.1};

const PREAMBLE_RE = /^(here|sure|okay|of course|these|based on|note:|i (can|see)|hope|let me know)\b/i;
const LEAD_COUNT_RE  = /^(\d{1,3})\s*[x×*]\s*/i;
const TAIL_COUNT_RE  = /\s*\(?\s*[x×]\s*(\d{1,3})\s*\)?$/i;
const PIPE_WEIGHT_RE = /^(\d+(?:\.\d+)?)\s*(kg|g|lbs?|oz)$/i;
const PIPE_VOL_RE    = /^(\d+(?:\.\d+)?)\s*(l|ml)$/i;
const NAME_WEIGHT_RE = /\s(\d+(?:\.\d+)?)\s*(kg|g|lbs?|oz)$/i;
const NAME_VOL_RE    = /(\d+(?:\.\d+)?)\s*(l|ml|oz)\b/i;
// Leading emoji (incl. variation selectors and ZWJ sequences)
const EMOJI_RE = /^((?:\p{Extended_Pictographic}|[\u2600-\u27BF])(?:[\uFE0F\u200D](?:\p{Extended_Pictographic}|[\u2600-\u27BF])?)*)\s*/u;

// Exact-match a pipe field (or rewritten value) to a canonical type
export function matchTypeToken(s){
  const k = String(s||'').trim().toLowerCase();
  if(!k) return null;
  const t = TYPES.find(t=>t.toLowerCase()===k);
  return t || TYPE_SYNONYM[k] || null;
}

// Exact-match a pipe field to a canonical activity key
export function matchActivityToken(s){
  const k = String(s||'').trim().toLowerCase();
  return ACT_SYNONYM[k] || null;
}

// Volumes reach the DOM unformatted (capacity badges, tooltips), so
// round to 2 decimals at the source
const r2 = x => Math.round(x*100)/100;

// Weight token to kg; if the result is implausibly heavy assume a
// grams figure was mislabeled and read it as grams.
export function toKg(n, unit){
  const u = String(unit).toLowerCase();
  let kg = u==='kg' ? n : u==='g' ? n/1000 : u==='oz' ? n*0.02835 : n*0.4536;
  if(kg > 50) kg = kg/1000;
  return kg;
}

function findStarter(name){
  const low = name.toLowerCase();
  return STARTER_ITEMS.find(s=>s.name.toLowerCase()===low) || null;
}

function findKeyword(name){
  const low = name.toLowerCase();
  let best = null;
  for(const k of GEAR_KEYWORDS){
    if(low.includes(k.k) && (!best || k.k.length > best.k.length)) best = k;
  }
  return best;
}

// Parse one pre-screened line body into a row (null = send to ignored)
function parseLine(body, raw, lineIndex){
  let count = 1, capped = false, countGiven = false;

  // Leading count - the x/×/* is required, so "550 cord" stays count 1
  const lead = body.match(LEAD_COUNT_RE);
  if(lead){ count = parseInt(lead[1],10); countGiven = true; body = body.slice(lead[0].length); }

  // Leading emoji becomes the icon
  let icon = null;
  const em = body.match(EMOJI_RE);
  if(em){ icon = em[1]; body = body.slice(em[0].length); }

  // Pipe split - first non-empty segment is the name body, the rest
  // are fields classified by content, order-independent
  let parts = body.split('|').map(s=>s.trim());
  while(parts.length && !parts[0]) parts.shift();
  let nameBody = parts.shift() || '';
  const fields = parts.filter(Boolean);

  // Trailing count on the name body ("wool socks x3", "(x3)")
  if(!countGiven){
    const tail = nameBody.match(TAIL_COUNT_RE);
    if(tail && nameBody.slice(0, nameBody.length - tail[0].length).trim()){
      count = parseInt(tail[1],10); countGiven = true;
      nameBody = nameBody.slice(0, nameBody.length - tail[0].length);
    }
  }
  if(count < 1) count = 1;
  if(count > 20){ count = 20; capped = true; }

  // Classify pipe fields by content
  let pipeType=null, pipeAct=null, pipeWeight=null, pipeVol=null;
  const descExtra = [];
  for(const f of fields){
    const t = matchTypeToken(f);
    if(t && !pipeType){ pipeType = t; continue; }
    const a = matchActivityToken(f);
    if(a && !pipeAct){ pipeAct = a; continue; }
    const w = f.match(PIPE_WEIGHT_RE);
    if(w && pipeWeight==null){ pipeWeight = toKg(parseFloat(w[1]), w[2]); continue; }
    const v = f.match(PIPE_VOL_RE);
    if(v && pipeVol==null){ pipeVol = r2(v[2].toLowerCase()==='ml' ? parseFloat(v[1])/1000 : parseFloat(v[1])); continue; }
    descExtra.push(f);
  }

  // Weight token at the END of the name body. kg/g/lb are always
  // weight and get stripped. oz is deferred: for a Bottle/Bladder it
  // reads as volume and stays in the name.
  let nameWeight = null, deferredOz = null;
  const wt = nameBody.match(NAME_WEIGHT_RE);
  if(wt){
    if(wt[2].toLowerCase()==='oz'){ deferredOz = parseFloat(wt[1]); }
    else { nameWeight = toKg(parseFloat(wt[1]), wt[2]); nameBody = nameBody.slice(0, nameBody.length - wt[0].length); }
  }

  // Volume token inside the name - read, never stripped
  let nameVolL = null, nameVolIsOz = false;
  const vt = nameBody.match(NAME_VOL_RE);
  if(vt){
    const n = parseFloat(vt[1]), u = vt[2].toLowerCase();
    nameVolL = r2(u==='ml' ? n/1000 : u==='oz' ? n*0.0296 : n);
    nameVolIsOz = u==='oz';
  }

  let nameRaw = nameBody.replace(/\s+/g,' ').trim();
  if(!nameRaw) return null;

  // A starter whose type contradicts an explicit pipe type is not a
  // match - its slots/capacity/maxKg describe a different object
  let starter = findStarter(nameRaw);
  if(starter && pipeType && starter.type !== pipeType) starter = null;
  const kw = findKeyword(nameRaw);

  // Type resolution, first hit wins. A volume token on an otherwise
  // unresolved name reads as a drink container.
  let type, typeConf;
  if(pipeType)          { type = pipeType;     typeConf = 'given'; }
  else if(starter)      { type = starter.type; typeConf = 'given'; }
  else if(kw)           { type = kw.type;      typeConf = 'guessed'; }
  else if(nameVolL!=null){ type = 'Bottle';    typeConf = 'guessed'; }
  else                  { type = 'Item';       typeConf = 'default'; }

  // Settle the deferred oz token now that type is known
  let ozWeight = null;
  if(deferredOz != null && type !== 'Bottle' && type !== 'Bladder'){
    ozWeight = toKg(deferredOz, 'oz');
    nameRaw = nameRaw.replace(/\s*\d+(?:\.\d+)?\s*oz$/i,'').trim();
    if(nameVolIsOz) nameVolL = null;
    if(!nameRaw) return null;
  }

  // Icon and weight chains
  let iconV, iconConf;
  if(icon)         { iconV = icon;         iconConf = 'given'; }
  else if(starter) { iconV = starter.icon; iconConf = 'given'; }
  else if(kw)      { iconV = kw.icon;      iconConf = 'guessed'; }
  else             { iconV = TYPE_ICON[type] || '📦'; iconConf = 'default'; }

  let weightKg, weightConf;
  if(pipeWeight != null)      { weightKg = pipeWeight;       weightConf = 'given'; }
  else if(nameWeight != null) { weightKg = nameWeight;       weightConf = 'given'; }
  else if(ozWeight != null)   { weightKg = ozWeight;         weightConf = 'given'; }
  else if(starter)            { weightKg = starter.weightKg; weightConf = 'given'; }
  else if(kw)                 { weightKg = kw.weightKg;      weightConf = 'guessed'; }
  else                        { weightKg = TYPE_WEIGHT[type] ?? 0.1; weightConf = 'default'; }

  // Final name: collapse whitespace, title-case only if the source
  // was entirely lowercase, clamp to 60 chars
  let name = nameRaw;
  if(name === name.toLowerCase()) name = name.replace(/\b[a-z]/g, c=>c.toUpperCase());
  if(name.length > 60) name = name.slice(0,60).trim();

  const row = {
    raw, lineIndex, count, name,
    icon: iconV, type,
    activity: pipeAct || '__default__',
    slots: 1, weightKg, capacityL: null, maxKg: null, desc: '',
    conf: { type: typeConf, icon: iconConf, weight: weightConf, activity: pipeAct ? 'given' : 'default' },
  };
  if(capped) row.capped = true;

  // Starter lookup restores the full curated record; per-type
  // defaults below skip anything the starter already supplied
  if(starter){
    row.slots     = starter.slots;
    row.capacityL = starter.capacityL;
    row.maxKg     = starter.maxKg;
    row.desc      = starter.desc || '';
  }

  const parsedVol = pipeVol != null ? pipeVol : nameVolL;

  if(type === 'Backpack'){
    if(!starter){
      row.slots = parsedVol != null ? Math.min(24, Math.max(4, Math.round(parsedVol/1.8))) : 15;
      row.maxKg = 10;
    }
    row.packSlots = 7;
    row.backpackBladder = true;
    row.backpackLeftBottle = true;
    row.backpackRightBottle = true;
    row.capacityL = null;
    if(row.maxKg == null) row.maxKg = 10;
  } else if(type === 'Bladder'){
    if(!starter) row.slots = 4;
    row.capacityL = parsedVol ?? (starter ? starter.capacityL : null) ?? 2;
  } else if(type === 'Bottle'){
    if(!starter) row.slots = 1;
    row.capacityL = parsedVol ?? (starter ? starter.capacityL : null) ?? 1;
  } else if(!starter){
    row.slots = 1;
  }

  if(descExtra.length) row.desc = (row.desc ? row.desc+' ' : '') + descExtra.join(' ');

  return row;
}

// Main entry: text in, { rows, ignored } out. Row line indexes map
// 1:1 to the source lines of `text` split on '\n'.
export function parseGearLines(text){
  const rows = [], ignored = [];
  String(text || '').split('\n').forEach((raw, lineIndex)=>{
    let body = raw.trim();
    if(!body) return;                                   // silent
    if(/^```/.test(body)) return;                       // silent: code fence
    if(/^#/.test(body)) return;                         // silent: markdown header
    if(/^[|\s:]*-{3,}[-|\s:]*$/.test(body)) return;     // silent: hr / table rule

    // Strip bullets and ordered markers before the noise checks
    body = body.replace(/^[-*•·+]\s+/,'').replace(/^\d{1,3}[.)]\s+/,'').trim();
    if(!body) return;

    if(PREAMBLE_RE.test(body)){ ignored.push({raw, lineIndex}); return; }
    const hasCount = LEAD_COUNT_RE.test(body) || TAIL_COUNT_RE.test(body);
    if(/:$/.test(body) && !body.includes('|') && !hasCount){ ignored.push({raw, lineIndex}); return; }
    if(!/[a-z]/i.test(body)){ ignored.push({raw, lineIndex}); return; }

    const row = parseLine(body, raw, lineIndex);
    if(row) rows.push(row);
    else ignored.push({raw, lineIndex});
  });
  return { rows, ignored };
}
