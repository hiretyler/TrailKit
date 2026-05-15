// RulesEngine — validates a proposed placement before it is committed.
// Apps register rules with RulesEngine.register(fn).
// Each rule fn(item, toZone, currentState) returns:
//   { valid: true }  or  { valid: false, reason: 'message' }
// Rules run in registration order; the first failing rule short-circuits.
export const RulesEngine = {
  _rules: [],

  register(ruleFn){
    this._rules.push(ruleFn);
    return this;
  },

  // Returns { valid: bool, reason: string|null }
  validate(item, toZone, state){
    for(const rule of this._rules){
      const result = rule(item, toZone, state);
      if(result && !result.valid) return result;
    }
    return { valid: true, reason: null };
  },
};
