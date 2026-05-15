// Planner Engine — barrel export.
// Shared infrastructure for TrailKit, PlanFit, and future single-file
// planner apps. Generic by design: no domain concepts (zones, item
// types, sports) should leak into this directory.
export { PlannerStore } from './store.js';
export { DragEngine }   from './drag.js';
export { RulesEngine }  from './rules.js';
export { StatsEngine }  from './stats.js';
export { Persistence }  from './persistence.js';
export { UIUtils }      from './ui.js';
