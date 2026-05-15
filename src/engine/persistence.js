// Persistence — localStorage save/restore with a configurable key.
// Apps call Persistence.init(key, serializeFn, deserializeFn) once,
// then Persistence.save(state) / Persistence.load() as needed.
export const Persistence = {
  _key:         null,
  _serialize:   null,
  _deserialize: null,

  init(key, serializeFn, deserializeFn){
    this._key         = key;
    this._serialize   = serializeFn;
    this._deserialize = deserializeFn;
  },

  save(state){
    if(!this._key || !this._serialize) return;
    try { localStorage.setItem(this._key, JSON.stringify(this._serialize(state))); }
    catch(e){ /* quota exceeded — silent (see docs/AUDIT.md #9) */ }
  },

  load(){
    if(!this._key || !this._deserialize) return null;
    try {
      const raw = localStorage.getItem(this._key);
      return raw ? this._deserialize(JSON.parse(raw)) : null;
    } catch(e){ return null; }
  },
};
