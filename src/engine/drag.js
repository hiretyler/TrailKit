// DragEngine — centralises HTML5 drag-and-drop lifecycle.
// Apps register drop zones via DragEngine.bindZone(el, zone, idx) and
// receive a callback in DragEngine.init(onDropFn) when a drop occurs.
// Drag state lives here, not scattered across the app.
export const DragEngine = {
  _state: null,   // { id, zone, idx }
  _onDrop: null,  // app-provided fn(dragState, toZone, toIdx)

  init(onDropFn){
    this._onDrop = onDropFn;
  },

  start(id, zone, idx){
    this._state = { id, zone, idx };
  },

  end(){
    document.querySelectorAll('.dragging,.drop-target').forEach(el=>{
      el.classList.remove('dragging','drop-target');
    });
    this._state = null;
  },

  getState(){ return this._state; },

  // Bind a DOM element as a drop zone.
  // `zone` and `idx` map to the app's placement model.
  bindZone(el, zone, idx){
    el.addEventListener('dragover', e=>{
      e.preventDefault();
      el.classList.add('drop-target');
    });
    el.addEventListener('dragleave', ()=>el.classList.remove('drop-target'));
    el.addEventListener('drop', e=>{
      e.preventDefault(); e.stopPropagation();
      document.querySelectorAll('.drop-target').forEach(t=>t.classList.remove('drop-target'));
      if(this._state && this._onDrop){
        this._onDrop(this._state, zone, idx);
      }
    });
  },
};
