// PlannerStore — minimal reactive state container.
// Apps call store.dispatch(action) to mutate state.
// Reducers are registered per action type with `store.on(type, fn)`.
// Subscribers are called after every dispatch.
//
// Part of the Planner Engine — shared infrastructure for TrailKit,
// PlanFit, and future single-file planner apps.
export class PlannerStore {
  constructor(initialState){
    this._state      = Object.assign({}, initialState);
    this._reducers   = {};   // { actionType: fn(state, action) → partialState }
    this._middleware = [];   // [ fn(action, getState, next) ]
    this._subscribers= [];   // [ fn(state, action) ]
  }

  // Register a reducer for one action type.
  // Reducer receives (currentState, action) and returns a partial state object
  // which is shallow-merged into the existing state.
  on(actionType, reducerFn){
    this._reducers[actionType] = reducerFn;
    return this;
  }

  // Register middleware. Each fn receives (action, getState, next) and must
  // call next(action) to continue the chain.
  use(middlewareFn){
    this._middleware.push(middlewareFn);
    return this;
  }

  // Subscribe to all state changes. Listener receives (newState, action).
  subscribe(listenerFn){
    this._subscribers.push(listenerFn);
    return ()=>{ this._subscribers = this._subscribers.filter(f=>f!==listenerFn); };
  }

  getState(){
    // Shallow copy so callers can't accidentally mutate state directly.
    return Object.assign({}, this._state);
  }

  // Direct state patch — use only for init/restore, not for user actions.
  _patch(partial){
    Object.assign(this._state, partial);
  }

  dispatch(action){
    let idx = 0;
    const chain = [...this._middleware, (a) => this._applyReducer(a)];
    const next  = (a) => { const fn = chain[idx++]; if(fn) fn(a, ()=>this._state, next); };
    next(action);
    this._subscribers.forEach(fn => fn(this._state, action));
  }

  _applyReducer(action){
    const reducer = this._reducers[action.type];
    if(reducer){
      const partial = reducer(this._state, action);
      if(partial && typeof partial === 'object'){
        Object.assign(this._state, partial);
      }
    }
  }
}
