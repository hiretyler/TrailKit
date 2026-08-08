// ── TRAILKIT XML (AUDIT #4) ──────────────────────────────────────
// The .trailkit interchange format, split from app.js so the build
// side is pure and testable in node. Parsing takes an already-parsed
// XML Document (the caller owns DOMParser), so this module never
// touches the DOM globals itself.
//
// Schema: <trailkit> → <yourgear><item>…</item>…</yourgear>
//                    → <loadouts><loadout>…</loadout>…</loadouts>
// documented in docs/narrative/. Import stays permissive: every item
// field has a default; malformed loadout entries are skipped.

export function esc(s){ return String(s==null?'':s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

const txt = (tag,val) => `<${tag}>${esc(val)}</${tag}>\n`;

// Pure: state in, XML string out
export function buildTrailkitXML({ version, inventory, userLoadouts, sports }){
  let x = '<?xml version="1.0" encoding="UTF-8"?>\n';
  x += `<!-- TrailKit v${esc(version)} export -->\n<trailkit>\n`;

  x += '  <yourgear>\n';
  (inventory||[]).forEach(it=>{
    x += '    <item>\n';
    x += '      ' + txt('id',            it.id);
    x += '      ' + txt('item-name',     it.name);
    x += '      ' + txt('item-icon',     it.icon);
    x += '      ' + txt('type',          it.type);
    x += '      ' + txt('activity',      it.activity);
    x += '      ' + txt('slots',         it.slots);
    x += '      ' + txt('weight',        it.weightKg);
    x += '      ' + txt('item-description', it.desc);
    // <special> block — only fields relevant to the item type
    const hasSpecial = it.type==='Backpack' || it.type==='Bottle' || it.type==='Bladder';
    if(hasSpecial){
      x += '      <special>\n';
      if(it.type==='Backpack'){
        x += '        ' + txt('backpack-maxload', it.maxKg ?? '');
        x += '        ' + txt('backpack-slots',   it.slots);
      }
      if(it.type==='Bottle')  x += '        ' + txt('bottle-liters',  it.capacityL ?? '');
      if(it.type==='Bladder') x += '        ' + txt('bladder-liters', it.capacityL ?? '');
      x += '      </special>\n';
    }
    x += '    </item>\n';
  });
  x += '  </yourgear>\n';

  x += '  <loadouts>\n';
  (sports||[]).forEach(sport=>{
    const map = (userLoadouts||{})[sport] || {};
    Object.entries(map).forEach(([,lo])=>{
      x += '    <loadout>\n';
      x += '      ' + txt('loadout-activity', sport);
      x += '      ' + txt('loadout-name',     lo.label || '');
      x += '      <loadout-backpack>'    + (lo.backpackId  ? `<item>${esc(lo.backpackId)}</item>`  : '') + '</loadout-backpack>\n';
      x += '      <loadout-bladder>'     + (lo.bladderId   ? `<item>${esc(lo.bladderId)}</item>`   : '') + '</loadout-bladder>\n';
      x += '      <loadout-leftbottle>'  + (lo.bottleLeft  ? `<item>${esc(lo.bottleLeft)}</item>`  : '') + '</loadout-leftbottle>\n';
      x += '      <loadout-rightbottle>' + (lo.bottleRight ? `<item>${esc(lo.bottleRight)}</item>` : '') + '</loadout-rightbottle>\n';
      x += '      <loadout-worn>\n';
      (lo.wornItems||[]).forEach(id=>{ x += `        <item>${esc(id)}</item>\n`; });
      x += '      </loadout-worn>\n';
      x += '      <loadout-main>\n';
      (lo.mainItems||[]).forEach(id=>{ x += `        <item>${esc(id)}</item>\n`; });
      x += '      </loadout-main>\n';
      x += '    </loadout>\n';
    });
  });
  x += '  </loadouts>\n</trailkit>';
  return x;
}

// Document in (already DOMParser-parsed), plain data out. Intra-file
// duplicate item ids keep the first occurrence.
export function parseTrailkitDoc(doc){
  const items = [];
  const seen = new Set();
  doc.querySelectorAll('yourgear > item').forEach(el=>{
    const id = el.querySelector('id')?.textContent?.trim();
    if(!id || seen.has(id)) return;
    seen.add(id);
    const type     = el.querySelector('type')?.textContent?.trim() || 'Item';
    const sp       = el.querySelector('special');
    const capL     = sp?.querySelector('bottle-liters,bladder-liters')?.textContent;
    const maxKgVal = sp?.querySelector('backpack-maxload')?.textContent;
    items.push({
      id,
      name:      el.querySelector('item-name')?.textContent         || id,
      icon:      el.querySelector('item-icon')?.textContent         || '📦',
      type,
      activity:  el.querySelector('activity')?.textContent?.trim()  || 'all',
      slots:     parseInt(el.querySelector('slots')?.textContent)   || 1,
      weightKg:  parseFloat(el.querySelector('weight')?.textContent)|| 0,
      capacityL: capL     != null && capL     !== '' ? parseFloat(capL)     : null,
      maxKg:     maxKgVal != null && maxKgVal !== '' ? parseFloat(maxKgVal) : null,
      desc:      el.querySelector('item-description')?.textContent  || '',
    });
  });

  const loadoutsBySport = {};
  let loadoutCount = 0;
  doc.querySelectorAll('loadouts > loadout').forEach(el=>{
    const sport = el.querySelector('loadout-activity')?.textContent?.trim();
    const label = el.querySelector('loadout-name')?.textContent?.trim();
    if(!sport || !label) return;
    const key = label.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'') || 'loadout-'+loadoutCount;
    const getItemId = sel => el.querySelector(sel+' > item')?.textContent?.trim() || null;
    const getItems  = sel => [...el.querySelectorAll(sel+' > item')].map(e=>e.textContent.trim()).filter(Boolean);
    if(!loadoutsBySport[sport]) loadoutsBySport[sport] = {};
    loadoutsBySport[sport][key] = {
      label,
      backpackId:  getItemId('loadout-backpack'),
      bladderId:   getItemId('loadout-bladder'),
      bottleLeft:  getItemId('loadout-leftbottle'),
      bottleRight: getItemId('loadout-rightbottle'),
      wornItems:   getItems('loadout-worn'),
      mainItems:   getItems('loadout-main'),
    };
    loadoutCount++;
  });

  return { items, loadoutsBySport, loadoutCount };
}
