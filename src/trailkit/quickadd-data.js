// ── QUICK ADD DATA ───────────────────────────────────────────────
// Curated starter-pack gear and the keyword table that powers the
// quick-entry parser's type/icon/weight guessing. Brand-free by
// design: these represent "gear you probably own", not products.

// ── STARTER PACKS ── generic seed gear for onboarding, deduped by id
export const STARTER_ITEMS = [
  // ── Shared across sports (activity:'all') ─────────────────────
  {id:'sp_headlamp', icon:'🔦', name:'Headlamp', type:'Safety', activity:'all', slots:1, weightKg:0.09, capacityL:null, maxKg:null, desc:'Rechargeable LED headlamp. Red night mode.'},
  {id:'sp_whistle', icon:'📣', name:'Emergency Whistle', type:'Safety', activity:'all', slots:1, weightKg:0.01, capacityL:null, maxKg:null, desc:'Pealess safety whistle. Carries further than a shout.'},
  {id:'sp_emergency_blanket', icon:'🆘', name:'Emergency Blanket', type:'Safety', activity:'all', slots:1, weightKg:0.06, capacityL:null, maxKg:null, desc:'Reflective mylar blanket. Traps body heat in a stop.'},
  {id:'sp_first_aid', icon:'🩹', name:'First Aid Kit', type:'Medical', activity:'all', slots:2, weightKg:0.30, capacityL:null, maxKg:null, desc:'Compact first aid kit. Wound care, tape, blister pads.'},
  {id:'sp_multitool', icon:'🔧', name:'Multi-Tool', type:'Tools', activity:'all', slots:1, weightKg:0.20, capacityL:null, maxKg:null, desc:'Folding multi-tool. Pliers, blade and drivers.'},
  {id:'sp_water_bottle', icon:'🍶', name:'Water Bottle', type:'Bottle', activity:'all', slots:2, weightKg:0.15, capacityL:1, maxKg:null, desc:'Wide-mouth 1L bottle. BPA-free and dishwasher safe.'},
  {id:'sp_hydration_bladder', icon:'💧', name:'Hydration Bladder', type:'Bladder', activity:'all', slots:4, weightKg:0.18, capacityL:2, maxKg:null, desc:'2L reservoir with bite-valve drink tube.'},
  {id:'sp_rain_shell', icon:'🌧️', name:'Rain Shell', type:'Worn', activity:'all', slots:3, weightKg:0.35, capacityL:null, maxKg:null, desc:'Waterproof breathable shell. Packs into its own hood.'},
  {id:'sp_puffy', icon:'🪶', name:'Puffy Jacket', type:'Worn', activity:'all', slots:3, weightKg:0.40, capacityL:null, maxKg:null, desc:'Insulated puffy jacket. Compressible, hooded.'},
  {id:'sp_wool_socks', icon:'🧦', name:'Wool Hiking Socks', type:'Worn', activity:'all', slots:1, weightKg:0.08, capacityL:null, maxKg:null, desc:'Merino wool socks. Cushioned and quick-drying.'},
  {id:'sp_sun_hat', icon:'👒', name:'Sun Hat', type:'Worn', activity:'all', slots:1, weightKg:0.09, capacityL:null, maxKg:null, desc:'Wide-brim sun hat. Ventilated crown, chin cord.'},
  {id:'sp_sunglasses', icon:'🕶️', name:'Sunglasses', type:'Worn', activity:'all', slots:1, weightKg:0.03, capacityL:null, maxKg:null, desc:'Polarised sunglasses. Full UV protection.'},
  {id:'sp_gaiters', icon:'🦵', name:'Trail Gaiters', type:'Worn', activity:'all', slots:1, weightKg:0.06, capacityL:null, maxKg:null, desc:'Low gaiters. Keep grit and burrs out of your shoes.'},
  {id:'sp_sunscreen', icon:'🧴', name:'Sunscreen', type:'Item', activity:'all', slots:1, weightKg:0.09, capacityL:null, maxKg:null, desc:'Broad-spectrum SPF 50. Water-resistant 80 minutes.'},
  {id:'sp_bug_spray', icon:'🦟', name:'Bug Spray', type:'Item', activity:'all', slots:1, weightKg:0.10, capacityL:null, maxKg:null, desc:'Insect repellent. Works on mosquitos and ticks.'},
  {id:'sp_snacks', icon:'🍫', name:'Trail Snacks', type:'Item', activity:'all', slots:1, weightKg:0.25, capacityL:null, maxKg:null, desc:'Bars, nuts and dried fruit. A day of grazing.'},
  {id:'sp_phone', icon:'📱', name:'Phone', type:'Item', activity:'all', slots:1, weightKg:0.19, capacityL:null, maxKg:null, desc:'Smartphone with the map downloaded for offline use.'},
  {id:'sp_gps_watch', icon:'⌚', name:'GPS Watch', type:'Item', activity:'all', slots:1, weightKg:0.05, capacityL:null, maxKg:null, desc:'GPS sports watch. Tracks pace, distance and climb.'},
  {id:'sp_map', icon:'🗺️', name:'Topo Map', type:'Item', activity:'all', slots:1, weightKg:0.04, capacityL:null, maxKg:null, desc:'Waterproof topographic map of the area.'},
  {id:'sp_compass', icon:'🧭', name:'Compass', type:'Item', activity:'all', slots:1, weightKg:0.04, capacityL:null, maxKg:null, desc:'Baseplate compass with adjustable declination.'},
  {id:'sp_trekking_poles', icon:'🦯', name:'Trekking Poles', type:'Item', activity:'all', slots:2, weightKg:0.50, capacityL:null, maxKg:null, desc:'Collapsible pole pair. Saves knees on long descents.'},
  {id:'sp_towel', icon:'🧽', name:'Quick-Dry Towel', type:'Item', activity:'all', slots:2, weightKg:0.08, capacityL:null, maxKg:null, desc:'Microfiber towel. Wrings out nearly dry.'},

  // ── Hiking ────────────────────────────────────────────────────
  {id:'sp_daypack', icon:'🎒', name:'Day Pack', type:'Backpack', activity:'hike', slots:12, weightKg:0.90, capacityL:null, maxKg:15, desc:'Ventilated 22L daypack. Bladder sleeve and hip belt.'},
  {id:'sp_hiking_boots', icon:'🥾', name:'Hiking Boots', type:'Worn', activity:'hike', slots:2, weightKg:1.05, capacityL:null, maxKg:null, desc:'Mid-cut waterproof boots. Ankle support on rough ground.'},
  {id:'sp_hiking_pants', icon:'👖', name:'Hiking Pants', type:'Worn', activity:'hike', slots:2, weightKg:0.32, capacityL:null, maxKg:null, desc:'Stretch nylon trail pants. Quick-drying, sun rated.'},

  // ── Mountain biking ───────────────────────────────────────────
  {id:'sp_hydration_pack', icon:'🚴', name:'Hydration Pack', type:'Backpack', activity:'bike', slots:8, weightKg:0.60, capacityL:null, maxKg:10, desc:'Low-profile 10L riding pack. Reservoir sleeve, tool pocket.'},
  {id:'sp_bike_helmet', icon:'⛑️', name:'Bike Helmet', type:'Safety', activity:'bike', slots:4, weightKg:0.35, capacityL:null, maxKg:null, desc:'Vented trail helmet with rotational impact liner.'},
  {id:'sp_bike_lights', icon:'💡', name:'Bike Lights', type:'Safety', activity:'bike', slots:1, weightKg:0.15, capacityL:null, maxKg:null, desc:'Rechargeable front and rear light set.'},
  {id:'sp_bike_gloves', icon:'🧤', name:'Riding Gloves', type:'Worn', activity:'bike', slots:1, weightKg:0.06, capacityL:null, maxKg:null, desc:'Padded trail gloves. Touchscreen fingertips.'},
  {id:'sp_bike_shorts', icon:'🩳', name:'Bike Shorts', type:'Worn', activity:'bike', slots:1, weightKg:0.22, capacityL:null, maxKg:null, desc:'Trail shorts with a removable padded liner.'},
  {id:'sp_jersey', icon:'🎽', name:'Riding Jersey', type:'Worn', activity:'bike', slots:1, weightKg:0.16, capacityL:null, maxKg:null, desc:'Moisture-wicking jersey. Rear stash pocket.'},
  {id:'sp_mini_pump', icon:'💨', name:'Mini Pump', type:'Tools', activity:'bike', slots:1, weightKg:0.11, capacityL:null, maxKg:null, desc:'Frame-mount hand pump. Presta and Schrader heads.'},
  {id:'sp_tire_levers', icon:'🪛', name:'Tire Levers', type:'Tools', activity:'bike', slots:1, weightKg:0.03, capacityL:null, maxKg:null, desc:'Pair of nylon tire levers. Rim-safe.'},
  {id:'sp_spare_tube', icon:'🛞', name:'Spare Tube', type:'Tools', activity:'bike', slots:1, weightKg:0.20, capacityL:null, maxKg:null, desc:'Spare inner tube sized to your wheels.'},
  {id:'sp_patch_kit', icon:'🛠️', name:'Patch Kit', type:'Tools', activity:'bike', slots:1, weightKg:0.05, capacityL:null, maxKg:null, desc:'Glueless patches plus tubeless plugs and reamer.'},
  {id:'sp_chain_lube', icon:'🛢️', name:'Chain Lube', type:'Tools', activity:'bike', slots:1, weightKg:0.12, capacityL:null, maxKg:null, desc:'Drivetrain lube. Wet or dry formula to suit the season.'},

  // ── Trail running ─────────────────────────────────────────────
  {id:'sp_running_vest', icon:'🏃', name:'Running Vest', type:'Backpack', activity:'run', slots:6, weightKg:0.30, capacityL:null, maxKg:8, desc:'Trail vest with flask pockets. Rides without bounce.'},
  {id:'sp_soft_flask', icon:'🥤', name:'Soft Flask', type:'Bottle', activity:'run', slots:1, weightKg:0.04, capacityL:0.5, maxKg:null, desc:'Collapsible 500ml flask. Fits a vest chest pocket.'},
  {id:'sp_trail_runners', icon:'👟', name:'Trail Running Shoes', type:'Worn', activity:'run', slots:2, weightKg:0.55, capacityL:null, maxKg:null, desc:'Lugged trail shoes with a rock plate underfoot.'},
  {id:'sp_running_shorts', icon:'🩳', name:'Running Shorts', type:'Worn', activity:'run', slots:1, weightKg:0.14, capacityL:null, maxKg:null, desc:'Lightweight shorts with a built-in liner.'},
  {id:'sp_energy_gels', icon:'⚡', name:'Energy Gels', type:'Item', activity:'run', slots:1, weightKg:0.10, capacityL:null, maxKg:null, desc:'Energy gels. Roughly 100 calories each.'},

  // ── Rock climbing ─────────────────────────────────────────────
  {id:'sp_crag_pack', icon:'🧗', name:'Crag Pack', type:'Backpack', activity:'climb', slots:14, weightKg:1.30, capacityL:null, maxKg:20, desc:'Haul-style 45L pack. Wide opening, rope strap.'},
  {id:'sp_climbing_helmet', icon:'⛑️', name:'Climbing Helmet', type:'Safety', activity:'climb', slots:4, weightKg:0.30, capacityL:null, maxKg:null, desc:'Lightweight helmet. Rated for rockfall and impact.'},
  {id:'sp_climbing_rope', icon:'🪢', name:'Climbing Rope', type:'Item', activity:'climb', slots:8, weightKg:3.80, capacityL:null, maxKg:null, desc:'Dynamic single rope. 60m, dry-treated.'},
  {id:'sp_harness', icon:'🦺', name:'Climbing Harness', type:'Item', activity:'climb', slots:2, weightKg:0.40, capacityL:null, maxKg:null, desc:'Adjustable harness with four gear loops.'},
  {id:'sp_chalk_bag', icon:'🧂', name:'Chalk Bag', type:'Item', activity:'climb', slots:1, weightKg:0.15, capacityL:null, maxKg:null, desc:'Chalk bag with waist belt and brush loop.'},
  {id:'sp_belay_device', icon:'🪝', name:'Belay Device', type:'Tools', activity:'climb', slots:1, weightKg:0.09, capacityL:null, maxKg:null, desc:'Tube belay device with a locking carabiner.'},
  {id:'sp_carabiners', icon:'🔗', name:'Locking Carabiners', type:'Tools', activity:'climb', slots:1, weightKg:0.30, capacityL:null, maxKg:null, desc:'Set of screwgate lockers for anchors and belays.'},
  {id:'sp_quickdraws', icon:'⛓️', name:'Quickdraws', type:'Tools', activity:'climb', slots:2, weightKg:1.10, capacityL:null, maxKg:null, desc:'Set of twelve draws. Enough for most sport routes.'},
  {id:'sp_climbing_shoes', icon:'🥿', name:'Climbing Shoes', type:'Worn', activity:'climb', slots:1, weightKg:0.45, capacityL:null, maxKg:null, desc:'All-day climbing shoes. Moderate downturn.'},
  {id:'sp_approach_shoes', icon:'👞', name:'Approach Shoes', type:'Worn', activity:'climb', slots:2, weightKg:0.80, capacityL:null, maxKg:null, desc:'Sticky-rubber shoes for talus and easy scrambling.'},

  // ── Adventure / dual-sport moto ───────────────────────────────
  {id:'sp_moto_tail_bag', icon:'🏍️', name:'Moto Tail Bag', type:'Backpack', activity:'moto', slots:16, weightKg:1.80, capacityL:null, maxKg:20, desc:'Waterproof 35L roll-top tail bag. Strap mounted.'},
  {id:'sp_moto_helmet', icon:'🪖', name:'Moto Helmet', type:'Safety', activity:'moto', slots:6, weightKg:1.55, capacityL:null, maxKg:null, desc:'Dual-sport helmet with peak and face shield.'},
  {id:'sp_body_armor', icon:'🛡️', name:'Body Armor', type:'Safety', activity:'moto', slots:3, weightKg:1.00, capacityL:null, maxKg:null, desc:'Chest and back protector. CE rated inserts.'},
  {id:'sp_earplugs', icon:'👂', name:'Earplugs', type:'Safety', activity:'moto', slots:1, weightKg:0.01, capacityL:null, maxKg:null, desc:'Foam earplugs. Cuts wind noise on long days.'},
  {id:'sp_moto_jacket', icon:'🧥', name:'Riding Jacket', type:'Worn', activity:'moto', slots:4, weightKg:2.20, capacityL:null, maxKg:null, desc:'Armored adventure jacket. Vented, waterproof liner.'},
  {id:'sp_moto_pants', icon:'👖', name:'Riding Pants', type:'Worn', activity:'moto', slots:3, weightKg:1.60, capacityL:null, maxKg:null, desc:'Armored riding pants. Knee and hip protection.'},
  {id:'sp_moto_boots', icon:'🥾', name:'Riding Boots', type:'Worn', activity:'moto', slots:4, weightKg:2.40, capacityL:null, maxKg:null, desc:'Adventure boots. Ankle bracing, oil-resistant sole.'},
  {id:'sp_moto_gloves', icon:'🧤', name:'Riding Gloves', type:'Worn', activity:'moto', slots:1, weightKg:0.20, capacityL:null, maxKg:null, desc:'Leather gloves with knuckle protection.'},
  {id:'sp_goggles', icon:'🥽', name:'Goggles', type:'Worn', activity:'moto', slots:1, weightKg:0.18, capacityL:null, maxKg:null, desc:'Anti-fog riding goggles. Tear-off posts.'},
  {id:'sp_tool_roll', icon:'🧰', name:'Tool Roll', type:'Tools', activity:'moto', slots:3, weightKg:1.20, capacityL:null, maxKg:null, desc:'Roll-up tool kit matched to your bike fasteners.'},
  {id:'sp_tire_repair_kit', icon:'🔩', name:'Tire Repair Kit', type:'Tools', activity:'moto', slots:2, weightKg:0.45, capacityL:null, maxKg:null, desc:'Plugs, irons and CO2 inflators for a trailside fix.'},
  {id:'sp_bungee_cords', icon:'➰', name:'Bungee Cords', type:'Tools', activity:'moto', slots:1, weightKg:0.30, capacityL:null, maxKg:null, desc:'Bungees and cam straps for lashing loads down.'},

  // ── Camping ───────────────────────────────────────────────────
  {id:'sp_camp_duffel', icon:'🧳', name:'Gear Duffel', type:'Backpack', activity:'camp', slots:20, weightKg:1.20, capacityL:null, maxKg:25, desc:'Rugged 70L duffel with stowable pack straps.'},
  {id:'sp_tent2p', icon:'⛺', name:'2-Person Tent', type:'Item', activity:'camp', slots:6, weightKg:2.20, capacityL:null, maxKg:null, desc:'Freestanding 2-person tent. Rainfly and footprint.'},
  {id:'sp_sleeping_bag', icon:'🛌', name:'Sleeping Bag', type:'Item', activity:'camp', slots:5, weightKg:1.30, capacityL:null, maxKg:null, desc:'3-season bag. Comfort rating near -1°C.'},
  {id:'sp_sleeping_pad', icon:'🛏️', name:'Sleeping Pad', type:'Item', activity:'camp', slots:3, weightKg:0.60, capacityL:null, maxKg:null, desc:'Inflatable pad. R-value around 4 for shoulder season.'},
  {id:'sp_camp_stove', icon:'🔥', name:'Camp Stove', type:'Item', activity:'camp', slots:2, weightKg:0.40, capacityL:null, maxKg:null, desc:'Canister stove. Boils a litre in about four minutes.'},
  {id:'sp_stove_fuel', icon:'⛽', name:'Stove Fuel', type:'Item', activity:'camp', slots:1, weightKg:0.38, capacityL:null, maxKg:null, desc:'Isobutane canister. 230g size, about a weekend of meals.'},
  {id:'sp_cook_set', icon:'🍳', name:'Cook Set', type:'Item', activity:'camp', slots:3, weightKg:0.70, capacityL:null, maxKg:null, desc:'Nesting pot, pan and lid for two people.'},
  {id:'sp_camp_chair', icon:'🪑', name:'Camp Chair', type:'Item', activity:'camp', slots:4, weightKg:1.40, capacityL:null, maxKg:null, desc:'Folding chair with its own carry sack.'},
  {id:'sp_cooler', icon:'🧊', name:'Cooler', type:'Item', activity:'camp', slots:5, weightKg:1.60, capacityL:null, maxKg:null, desc:'Soft-sided cooler. Holds ice through a long weekend.'},
  {id:'sp_lantern', icon:'🏮', name:'Camp Lantern', type:'Item', activity:'camp', slots:2, weightKg:0.30, capacityL:null, maxKg:null, desc:'Rechargeable lantern. Dimmable, doubles as a power bank.'},
  {id:'sp_water_jug', icon:'🪣', name:'Water Jug', type:'Bottle', activity:'camp', slots:3, weightKg:0.30, capacityL:10, maxKg:null, desc:'Collapsible 10L jug with a spigot for camp water.'},
];

export const STARTER_PACKS = {
  hike:  ['sp_daypack','sp_hydration_bladder','sp_water_bottle','sp_hiking_boots','sp_wool_socks','sp_hiking_pants','sp_rain_shell','sp_puffy','sp_sun_hat','sp_sunglasses','sp_headlamp','sp_first_aid','sp_multitool','sp_map','sp_compass','sp_sunscreen','sp_snacks','sp_trekking_poles'],
  bike:  ['sp_hydration_pack','sp_hydration_bladder','sp_water_bottle','sp_bike_helmet','sp_bike_gloves','sp_bike_shorts','sp_jersey','sp_sunglasses','sp_bike_lights','sp_mini_pump','sp_tire_levers','sp_spare_tube','sp_patch_kit','sp_chain_lube','sp_multitool','sp_first_aid','sp_snacks','sp_rain_shell'],
  run:   ['sp_running_vest','sp_soft_flask','sp_hydration_bladder','sp_trail_runners','sp_wool_socks','sp_running_shorts','sp_gaiters','sp_rain_shell','sp_sun_hat','sp_sunglasses','sp_gps_watch','sp_headlamp','sp_energy_gels','sp_first_aid','sp_whistle','sp_emergency_blanket','sp_sunscreen','sp_phone'],
  climb: ['sp_crag_pack','sp_water_bottle','sp_climbing_rope','sp_harness','sp_climbing_shoes','sp_chalk_bag','sp_belay_device','sp_carabiners','sp_quickdraws','sp_climbing_helmet','sp_approach_shoes','sp_puffy','sp_rain_shell','sp_headlamp','sp_first_aid','sp_sunscreen','sp_snacks','sp_phone'],
  moto:  ['sp_moto_tail_bag','sp_hydration_bladder','sp_water_bottle','sp_moto_helmet','sp_moto_jacket','sp_moto_pants','sp_moto_boots','sp_moto_gloves','sp_goggles','sp_body_armor','sp_earplugs','sp_tool_roll','sp_tire_repair_kit','sp_bungee_cords','sp_rain_shell','sp_headlamp','sp_first_aid','sp_snacks'],
  camp:  ['sp_camp_duffel','sp_water_jug','sp_water_bottle','sp_tent2p','sp_sleeping_bag','sp_sleeping_pad','sp_camp_stove','sp_stove_fuel','sp_cook_set','sp_camp_chair','sp_cooler','sp_lantern','sp_headlamp','sp_first_aid','sp_multitool','sp_towel','sp_bug_spray','sp_puffy'],
};

// ── STARTER LOADOUTS ── one ready-made loadout per sport, installed
// (optionally) when that sport's pack chip is part of a Quick Add
// commit. References STARTER_ITEMS ids; the commit path resolves them
// to the user's real item ids by name, so every referenced id must
// appear in that sport's STARTER_PACKS list. mainItems slot totals
// are sized to the pack's main-compartment capacity - keep them
// within it when editing.
export const STARTER_LOADOUTS = {
  hike:  {key:'starter-hike', label:'Starter Day Hike',
    backpackId:'sp_daypack', bladderIds:'sp_hydration_bladder', bottleLeft:'sp_water_bottle', bottleRight:null,
    mainItems:['sp_headlamp','sp_first_aid','sp_multitool','sp_map','sp_compass','sp_sunscreen','sp_snacks','sp_trekking_poles'],
    wornItems:['sp_hiking_boots','sp_wool_socks','sp_hiking_pants','sp_rain_shell','sp_sun_hat','sp_sunglasses']},
  bike:  {key:'starter-bike', label:'Starter Trail Ride',
    backpackId:'sp_hydration_pack', bladderIds:'sp_hydration_bladder', bottleLeft:'sp_water_bottle', bottleRight:null,
    mainItems:['sp_mini_pump','sp_tire_levers','sp_spare_tube','sp_patch_kit','sp_multitool','sp_first_aid','sp_snacks'],
    wornItems:['sp_bike_gloves','sp_bike_shorts','sp_jersey','sp_sunglasses']},
  run:   {key:'starter-run', label:'Starter Trail Run',
    backpackId:'sp_running_vest', bladderIds:'sp_hydration_bladder', bottleLeft:'sp_soft_flask', bottleRight:null,
    mainItems:['sp_energy_gels','sp_first_aid','sp_whistle','sp_emergency_blanket','sp_phone'],
    wornItems:['sp_trail_runners','sp_wool_socks','sp_running_shorts','sp_gaiters','sp_sun_hat','sp_sunglasses']},
  climb: {key:'starter-climb', label:'Starter Crag Day',
    backpackId:'sp_crag_pack', bladderIds:null, bottleLeft:'sp_water_bottle', bottleRight:null,
    mainItems:['sp_climbing_rope','sp_harness','sp_chalk_bag','sp_belay_device','sp_first_aid'],
    wornItems:['sp_approach_shoes','sp_puffy']},
  moto:  {key:'starter-moto', label:'Starter Moto Ride',
    backpackId:'sp_moto_tail_bag', bladderIds:'sp_hydration_bladder', bottleLeft:'sp_water_bottle', bottleRight:null,
    mainItems:['sp_tool_roll','sp_tire_repair_kit','sp_first_aid','sp_bungee_cords','sp_headlamp','sp_snacks','sp_earplugs'],
    wornItems:['sp_moto_jacket','sp_moto_pants','sp_moto_boots','sp_moto_gloves','sp_goggles']},
  camp:  {key:'starter-camp', label:'Starter Camp Trip',
    backpackId:'sp_camp_duffel', bladderIds:null, bottleLeft:'sp_water_bottle', bottleRight:'sp_water_jug',
    mainItems:['sp_tent2p','sp_sleeping_bag','sp_sleeping_pad','sp_camp_stove','sp_stove_fuel','sp_cook_set'],
    wornItems:['sp_puffy']},
};

// ── KEYWORD TABLE ── longest-match-first guessing for quick entry
// Contract: lowercase the line, pick the LONGEST key that appears as
// a substring. Longer keys deliberately shadow shorter fallbacks
// (backpack > pack, soft flask > flask, sun hat > hat, ...). Some
// niche keys exist purely as guards: 'hatchet' stops 'hat' matching
// inside it, 'tent pole'/'tent stake' stop the full tent weight
// landing on parts, 'fuel bottle' stops a moto fuel bottle typing
// as Bottle. Deliberately excluded as too ambiguous or misfire-prone
// substrings: bag, pad, cap, cam, nut, tape, pot, pan, atc, tire, pole.
export const GEAR_KEYWORDS = [
  // packs
  {k:'backpack',          type:'Backpack',icon:'🎒', weightKg:0.90},
  {k:'hydration pack',    type:'Backpack',icon:'🎒', weightKg:0.60},
  {k:'vest',              type:'Backpack',icon:'🎽', weightKg:0.30},
  {k:'duffel',            type:'Backpack',icon:'🧳', weightKg:1.20},
  {k:'pannier',           type:'Backpack',icon:'🚲', weightKg:1.40},
  {k:'tail bag',          type:'Backpack',icon:'🏍️', weightKg:1.80},
  {k:'pack',              type:'Backpack',icon:'🎒', weightKg:0.80},
  // water
  {k:'bottle',            type:'Bottle',  icon:'🍶', weightKg:0.15},
  {k:'fuel bottle',       type:'Item',    icon:'⛽', weightKg:0.20},
  {k:'soft flask',        type:'Bottle',  icon:'🥤', weightKg:0.04},
  {k:'flask',             type:'Bottle',  icon:'🥤', weightKg:0.18},
  {k:'water jug',         type:'Bottle',  icon:'🪣', weightKg:0.30},
  {k:'bladder',           type:'Bladder', icon:'💧', weightKg:0.18},
  {k:'reservoir',         type:'Bladder', icon:'💧', weightKg:0.18},
  {k:'filter',            type:'Tools',   icon:'🚰', weightKg:0.10},
  // safety
  {k:'headlamp',          type:'Safety',  icon:'🔦', weightKg:0.09},
  {k:'flashlight',        type:'Safety',  icon:'🔦', weightKg:0.15},
  {k:'bike light',        type:'Safety',  icon:'💡', weightKg:0.15},
  {k:'whistle',           type:'Safety',  icon:'📣', weightKg:0.01},
  {k:'beacon',            type:'Safety',  icon:'📡', weightKg:0.15},
  {k:'satellite',         type:'Safety',  icon:'🛰️', weightKg:0.10},
  {k:'helmet',            type:'Safety',  icon:'⛑️', weightKg:0.35},
  {k:'climbing helmet',   type:'Safety',  icon:'⛑️', weightKg:0.30},
  {k:'motorcycle helmet', type:'Safety',  icon:'🪖', weightKg:1.55},
  {k:'armor',             type:'Safety',  icon:'🛡️', weightKg:1.00},
  {k:'knee pad',          type:'Safety',  icon:'🦵', weightKg:0.45},
  {k:'earplug',           type:'Safety',  icon:'👂', weightKg:0.01},
  {k:'bivy',              type:'Safety',  icon:'🛖', weightKg:0.15},
  {k:'emergency blanket', type:'Safety',  icon:'🆘', weightKg:0.06},
  {k:'space blanket',     type:'Safety',  icon:'🆘', weightKg:0.06},
  // medical
  {k:'first aid',         type:'Medical', icon:'🩹', weightKg:0.25},
  {k:'aid kit',           type:'Medical', icon:'🩹', weightKg:0.25},
  {k:'blister',           type:'Medical', icon:'🦶', weightKg:0.05},
  {k:'bandage',           type:'Medical', icon:'🩹', weightKg:0.05},
  {k:'tourniquet',        type:'Medical', icon:'🩸', weightKg:0.08},
  // tools
  {k:'multi-tool',        type:'Tools',   icon:'🔧', weightKg:0.20},
  {k:'multitool',         type:'Tools',   icon:'🔧', weightKg:0.20},
  {k:'knife',             type:'Tools',   icon:'🔪', weightKg:0.06},
  {k:'wrench',            type:'Tools',   icon:'🔧', weightKg:0.15},
  {k:'tool roll',         type:'Tools',   icon:'🧰', weightKg:1.20},
  {k:'pump',              type:'Tools',   icon:'💨', weightKg:0.11},
  {k:'tire lever',        type:'Tools',   icon:'🪛', weightKg:0.03},
  {k:'patch kit',         type:'Tools',   icon:'🛠️', weightKg:0.05},
  {k:'tube',              type:'Tools',   icon:'🛞', weightKg:0.20},
  {k:'chain lube',        type:'Tools',   icon:'🛢️', weightKg:0.12},
  {k:'duct tape',         type:'Tools',   icon:'🩹', weightKg:0.05},
  {k:'lighter',           type:'Tools',   icon:'🔥', weightKg:0.02},
  {k:'matches',           type:'Tools',   icon:'🔥', weightKg:0.02},
  {k:'spork',             type:'Tools',   icon:'🥄', weightKg:0.03},
  {k:'ice axe',           type:'Tools',   icon:'⛏️', weightKg:0.45},
  {k:'hatchet',           type:'Tools',   icon:'🪓', weightKg:0.60},
  // climbing
  {k:'rope',              type:'Item',    icon:'🪢', weightKg:3.80},
  {k:'harness',           type:'Item',    icon:'🦺', weightKg:0.40},
  {k:'carabiner',         type:'Tools',   icon:'🔗', weightKg:0.05},
  {k:'quickdraw',         type:'Tools',   icon:'⛓️', weightKg:0.10},
  {k:'sling',             type:'Tools',   icon:'➿', weightKg:0.06},
  {k:'belay',             type:'Tools',   icon:'🪝', weightKg:0.09},
  {k:'climbing cam',      type:'Tools',   icon:'⚙️', weightKg:0.10},
  {k:'chalk bag',         type:'Item',    icon:'🧂', weightKg:0.15},
  {k:'chalk',             type:'Item',    icon:'🧂', weightKg:0.06},
  {k:'climbing shoe',     type:'Worn',    icon:'🥿', weightKg:0.45},
  {k:'crampon',           type:'Item',    icon:'❄️', weightKg:0.90},
  // shelter and camp
  {k:'tent',              type:'Item',    icon:'⛺', weightKg:2.20},
  {k:'tent pole',         type:'Item',    icon:'⛺', weightKg:0.40},
  {k:'tent stake',        type:'Item',    icon:'⛺', weightKg:0.15},
  {k:'tarp',              type:'Item',    icon:'🏕️', weightKg:0.60},
  {k:'sleeping bag',      type:'Item',    icon:'🛌', weightKg:1.10},
  {k:'sleeping pad',      type:'Item',    icon:'🛏️', weightKg:0.55},
  {k:'pillow',            type:'Item',    icon:'🛏️', weightKg:0.10},
  {k:'stove',             type:'Item',    icon:'🔥', weightKg:0.40},
  {k:'fuel',              type:'Item',    icon:'⛽', weightKg:0.38},
  {k:'canister',          type:'Item',    icon:'⛽', weightKg:0.38},
  {k:'cook set',          type:'Item',    icon:'🍳', weightKg:0.70},
  {k:'cook pot',          type:'Item',    icon:'🍲', weightKg:0.35},
  {k:'cooler',            type:'Item',    icon:'🧊', weightKg:1.60},
  {k:'lantern',           type:'Item',    icon:'🏮', weightKg:0.30},
  {k:'chair',             type:'Item',    icon:'🪑', weightKg:1.40},
  {k:'trash bag',         type:'Item',    icon:'🗑️', weightKg:0.02},
  // clothing
  {k:'jacket',            type:'Worn',    icon:'🧥', weightKg:0.45},
  {k:'shell',             type:'Worn',    icon:'🌧️', weightKg:0.35},
  {k:'puffy',             type:'Worn',    icon:'🪶', weightKg:0.40},
  {k:'fleece',            type:'Worn',    icon:'🧶', weightKg:0.35},
  {k:'base layer',        type:'Worn',    icon:'👕', weightKg:0.20},
  {k:'shirt',             type:'Worn',    icon:'👕', weightKg:0.15},
  {k:'jersey',            type:'Worn',    icon:'🎽', weightKg:0.16},
  {k:'pants',             type:'Worn',    icon:'👖', weightKg:0.32},
  {k:'shorts',            type:'Worn',    icon:'🩳', weightKg:0.18},
  {k:'sock',              type:'Worn',    icon:'🧦', weightKg:0.08},
  {k:'glove',             type:'Worn',    icon:'🧤', weightKg:0.07},
  {k:'beanie',            type:'Worn',    icon:'🧢', weightKg:0.06},
  {k:'hat',               type:'Worn',    icon:'🧢', weightKg:0.09},
  {k:'sun hat',           type:'Worn',    icon:'👒', weightKg:0.09},
  {k:'sunglasses',        type:'Worn',    icon:'🕶️', weightKg:0.03},
  {k:'goggles',           type:'Worn',    icon:'🥽', weightKg:0.18},
  {k:'gaiter',            type:'Worn',    icon:'🦵', weightKg:0.06},
  {k:'neck gaiter',       type:'Worn',    icon:'🧣', weightKg:0.04},
  {k:'boot',              type:'Worn',    icon:'🥾', weightKg:1.05},
  {k:'motorcycle boot',   type:'Worn',    icon:'🥾', weightKg:2.40},
  {k:'shoe',              type:'Worn',    icon:'👟', weightKg:0.60},
  {k:'trail runner',      type:'Worn',    icon:'👟', weightKg:0.55},
  // navigation, electronics, misc
  {k:'map',               type:'Item',    icon:'🗺️', weightKg:0.04},
  {k:'compass',           type:'Item',    icon:'🧭', weightKg:0.04},
  {k:'gps',               type:'Item',    icon:'📍', weightKg:0.20},
  {k:'phone',             type:'Item',    icon:'📱', weightKg:0.19},
  {k:'power bank',        type:'Item',    icon:'🔋', weightKg:0.18},
  {k:'battery',           type:'Item',    icon:'🔋', weightKg:0.05},
  {k:'watch',             type:'Item',    icon:'⌚', weightKg:0.05},
  {k:'towel',             type:'Item',    icon:'🧽', weightKg:0.08},
  {k:'dry bag',           type:'Item',    icon:'🛍️', weightKg:0.10},
  {k:'stuff sack',        type:'Item',    icon:'🛍️', weightKg:0.03},
  {k:'trekking pole',     type:'Item',    icon:'🦯', weightKg:0.50},
  {k:'sunscreen',         type:'Item',    icon:'🧴', weightKg:0.09},
  {k:'bug spray',         type:'Item',    icon:'🦟', weightKg:0.10},
  {k:'snack',             type:'Item',    icon:'🍫', weightKg:0.25},
  {k:'energy bar',        type:'Item',    icon:'🍫', weightKg:0.06},
  {k:'energy gel',        type:'Item',    icon:'⚡', weightKg:0.03},
];
