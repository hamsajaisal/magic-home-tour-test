// Help for screen reader users. Nothing here is seen or heard by others:
// the messages go to a hidden live region that only screen readers read, and the game never
// speaks them with its own voice, so the screen reader and the game don't talk over each other.
const live = document.getElementById('sr-live');

export function announce(text) {
  if (!text) return;
  live.textContent = '';
  setTimeout(() => { live.textContent = text; }, 60);   // a fresh change, so the same words are read again
}

// The panels behave like dialogs: opening one moves the screen reader to its heading
// (which reads the panel's name), Escape closes the top one, and closing returns to where you were.
export function initDialogs(ids) {
  const back = new Map();   // panel id -> what had focus before it opened
  const shown = (el) => !el.classList.contains('hidden');
  for (const id of ids) {
    const el = document.getElementById(id);
    const card = el.querySelector('.modal-card') || el;
    const heading = card.querySelector('h2');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    if (heading) {
      heading.id ||= `${id}-title`;
      heading.tabIndex = -1;
      heading.classList.add('dialog-title');
      card.setAttribute('aria-labelledby', heading.id);
    }
    let was = shown(el);
    new MutationObserver(() => {
      const now = shown(el);
      if (now === was) return;
      was = now;
      if (now) {
        back.set(id, document.activeElement);
        (heading || card).focus({ preventScroll: true });
      } else {
        const b = back.get(id);
        back.delete(id);
        if (b && document.contains(b) && b.offsetParent !== null) b.focus({ preventScroll: true });
      }
    }).observe(el, { attributes: true, attributeFilter: ['class'] });
  }
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    // the one on top: later panels in the list sit above earlier ones
    const open = ids.map((id) => document.getElementById(id)).filter(shown);
    const top = open.sort((a, b) => (Number(getComputedStyle(b).zIndex) || 0) - (Number(getComputedStyle(a).zIndex) || 0))[0];
    if (!top) return;
    const close = top.querySelector(`[data-close="${top.id}"]`) || top.querySelector('.modal-card > .big-btn');
    if (close) { e.preventDefault(); close.click(); }
  });
}
