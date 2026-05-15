// UIUtils — shared modal helpers.
// Modal visibility is driven by the `open` class on `.modal-overlay` elements;
// popovers use the same pattern on `.popover-overlay`.
export const UIUtils = {
  openModal(id){  document.getElementById(id)?.classList.add('open'); },
  closeModal(id){ document.getElementById(id)?.classList.remove('open'); },
  closeAllModals(){
    document.querySelectorAll('.modal-overlay').forEach(o=>o.classList.remove('open'));
  },
  closeAllPopovers(){
    document.querySelectorAll('.popover-overlay').forEach(o=>o.classList.remove('open'));
  },
};
