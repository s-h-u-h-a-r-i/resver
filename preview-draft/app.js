let cur = { p: 0, b: 0, s: 1 };
const prefs = { dim: true, typewriter: false }; // set from the overflow menu
const projects = DATA.projects;
const curProject = () => projects[cur.p];
const curBook = () => curProject().books[cur.b];
// seed "last edited" ordinals come from mock-data.js's SEED map
projects.forEach((pr) =>
  pr.books.forEach((bk) => {
    const sd = SEED[bk.id] || [];
    bk.scenes.forEach((s, i) => {
      s.updated = sd[i] ?? 0;
    });
  }),
);
function lastSceneOf(bk) {
  let idx = 0,
    best = -Infinity;
  bk.scenes.forEach((s, i) => {
    if ((s.updated || 0) > best) {
      best = s.updated || 0;
      idx = i;
    }
  });
  return idx;
}
function lastOfProject(pr) {
  let res = { b: 0, s: 0 },
    best = -Infinity;
  pr.books.forEach((bk, bi) =>
    bk.scenes.forEach((s, si) => {
      if ((s.updated || 0) > best) {
        best = s.updated || 0;
        res = { b: bi, s: si };
      }
    }),
  );
  return res;
}
function esc(s) {
  return (s == null ? '' : String(s)).replace(
    /[&<>]/g,
    (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[m],
  );
}
// the mark zone + margin are UI chrome, not prose — strip them before reading a paragraph's text
function stripChrome(p) {
  const c = p.cloneNode(true);
  c.querySelector('.margin')?.remove();
  c.querySelector('.mark')?.remove();
  return c;
}

const page = document.getElementById('page'),
  heading = document.getElementById('heading'),
  hTitle = document.getElementById('hTitle'),
  wc = document.getElementById('wc'),
  whisperScene = document.getElementById('whisperScene'),
  stage = document.getElementById('stage');

function recount() {
  if (!wc) return; // word count removed from the toolbar for now
  const n = [...page.querySelectorAll('.para')]
    .map((p) => paraText(p))
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  wc.textContent = n.toLocaleString();
}

// every place a name is shown, refreshed after any rename (without rebuilding the paragraphs)
function refreshLabels() {
  const i = cur.s,
    s = curBook().scenes[i],
    label = 'Scene ' + String(i + 1).padStart(2, '0');
  heading.querySelector('.eyebrow').textContent = label;
  if (document.activeElement !== hTitle) hTitle.textContent = s.title; // don't yank the caret mid-type
  document.getElementById('bookTitle').textContent = curBook().name;
  document.getElementById('projectName').textContent = curProject().name;
  whisperScene.textContent = label + ' · ' + s.title;
}

function render(i) {
  cur.s = i;
  const s = curBook().scenes[i];
  refreshLabels();
  document.getElementById('prevScene').disabled = i <= 0;
  document.getElementById('nextScene').disabled =
    i >= curBook().scenes.length - 1;
  page.querySelectorAll('.para').forEach((p) => p.remove());
  s.paras.forEach((text, idx) => {
    const p = document.createElement('p');
    p.className = 'para';
    p.dataset.pid = cur.b + '-' + i + '-' + idx;
    p.dataset.pidx = idx;
    p.setAttribute('contenteditable', 'true');
    p.setAttribute('spellcheck', 'false');
    const note = continuityFor(i, idx).length
      ? `<button class="note" title="Continuity noted here" aria-label="View continuity note"><i></i></button>`
      : '';
    p.innerHTML =
      `<span class="mark" title="Mark this paragraph for the assistant"></span>` +
      `<span class="margin">${note}<span class="tools">` +
      `<button class="undo" title="Undo this paragraph" disabled>${icon('undo-2', 13)}</button>` +
      `<button class="redo" title="Redo this paragraph" disabled>${icon('redo-2', 13)}</button>` +
      `</span><span class="rev">v1</span></span>` +
      text;
    page.appendChild(p);
    wire(p, text);
  });
  recount();
  renderChips();
  stage.scrollTop = 0;
}

function wire(p, initial) {
  let hist = [initial],
    ptr = 0,
    timer = null;
  // carry the mark zone + margin across restores, keep them out of the text
  function uiHTML() {
    const m = p.querySelector('.mark'),
      g = p.querySelector('.margin');
    return (m ? m.outerHTML : '') + (g ? g.outerHTML : '');
  }
  function getText() {
    return stripChrome(p).textContent;
  }
  function draw() {
    p.querySelector('.undo').disabled = ptr <= 0;
    p.querySelector('.redo').disabled = ptr >= hist.length - 1;
    p.querySelector('.rev').textContent = 'v' + (ptr + 1);
  }
  function commit() {
    const val = getText();
    if (val === hist[ptr]) return;
    hist = hist.slice(0, ptr + 1);
    hist.push(val);
    if (hist.length > 40) hist.shift();
    ptr = hist.length - 1;
    curBook().scenes[cur.s].updated = Date.now();
    draw();
    recount();
  }
  function restore() {
    p.innerHTML = uiHTML() + hist[ptr];
    bind();
    draw();
    recount();
  }
  function bind() {
    p.querySelector('.undo').addEventListener('mousedown', (e) => {
      e.preventDefault();
      commit();
      if (ptr > 0) {
        ptr--;
        restore();
      }
    });
    p.querySelector('.redo').addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (ptr < hist.length - 1) {
        ptr++;
        restore();
      }
    });
    const mark = p.querySelector('.mark');
    if (mark)
      mark.addEventListener('mousedown', (e) => {
        e.preventDefault();
        p.classList.toggle('selected');
        renderChips();
      });
    const note = p.querySelector('.note');
    if (note)
      note.addEventListener('mousedown', (e) => {
        e.preventDefault();
        revealContinuity(cur.s, +p.dataset.pidx);
      });
  }
  p.addEventListener('focus', () => {
    p.classList.add('active');
    if (prefs.dim) document.body.classList.add('focusline');
    if (prefs.typewriter)
      p.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setMenu(false);
  });
  p.addEventListener('blur', () => {
    p.classList.remove('active');
    document.body.classList.remove('focusline');
    commit();
  });
  p.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(commit, 800);
    recount();
  });
  bind();
  draw();
}

// deep-focus: hide chrome shortly after the last keystroke; any movement brings it back
let idle = null;
function sleepSoon() {
  clearTimeout(idle);
  idle = setTimeout(() => {
    const a = document.activeElement;
    if (a && a.classList.contains('para')) document.body.classList.add('deep');
  }, 2600);
}
document.addEventListener('mousemove', () => {
  document.body.classList.remove('deep');
  sleepSoon();
});
document.addEventListener('keydown', sleepSoon);

// overlays
const scrim = document.getElementById('scrim'),
  scenePicker = document.getElementById('scenePicker'),
  bookPicker = document.getElementById('bookPicker'),
  projectPicker = document.getElementById('projectPicker'),
  drawer = document.getElementById('drawer');
function closeAll() {
  if (typeof cleanupPending === 'function') cleanupPending();
  scrim.classList.remove('open');
  scenePicker.classList.remove('open');
  bookPicker.classList.remove('open');
  projectPicker.classList.remove('open');
  drawer.classList.remove('open');
  document.body.classList.remove('panel-open');
  document.getElementById('deskModal').classList.remove('open');
  document.getElementById('confirmModal').classList.remove('open');
}

// ── panel cards: read-only by default; explicit edit mode uses real inputs ──
let editing = { cast: -1, cont: -1, style: -1, future: -1 }; // index of the card currently in edit mode
let isNew = { cast: false, cont: false, style: false, future: false }; // …and whether it has ever been saved

function input(cls, value, ph, onInput, multiline) {
  const el = document.createElement(multiline ? 'textarea' : 'input');
  el.className = 'fin ' + cls;
  el.value = value || '';
  el.placeholder = ph;
  el.spellcheck = false;
  el.addEventListener('input', () => onInput(el.value.trim()));
  el.addEventListener('keydown', (e) => e.stopPropagation()); // Escape must not close the drawer while typing
  return el;
}
function editBtn(fn) {
  const b = document.createElement('button');
  b.className = 'card-edit';
  b.type = 'button';
  b.title = 'Edit';
  b.innerHTML = icon('pencil', 13);
  b.addEventListener('click', fn);
  return b;
}
// a never-saved card offers Cancel (discard); an existing one offers Delete (destroy)
function cardActions(onDone, onDiscard, fresh, delLabel) {
  const wrap = document.createElement('div');
  wrap.className = 'card-actions';
  const done = document.createElement('button');
  done.className = 'btn-done';
  done.type = 'button';
  done.textContent = 'Done';
  done.addEventListener('click', onDone);
  wrap.appendChild(done);
  const other = document.createElement('button');
  other.type = 'button';
  if (fresh) {
    other.className = 'btn-cancel';
    other.textContent = 'Cancel';
  } else {
    other.className = 'btn-del';
    other.innerHTML = icon('trash-2', 13) + '<span>' + delLabel + '</span>';
  }
  other.addEventListener('click', onDiscard);
  wrap.appendChild(other);
  return wrap;
}
function addBtn(label, fn) {
  const b = document.createElement('button');
  b.className = 'add-item';
  b.type = 'button';
  b.innerHTML = icon('plus', 13) + '<span>' + label + '</span>';
  b.addEventListener('click', fn);
  return b;
}

// ── editable card list: shared scaffolding for cast / continuity / style /
// future-beat panels. Each renders as a read-only card with an edit button,
// or — while its index matches editing[flag] — an inline form with a
// Done/Cancel|Delete action row. A never-saved ("fresh") card that's still
// blank on Done is discarded rather than kept empty.
function cardList({
  container,
  items,
  flag,
  className,
  addLabel,
  delLabel,
  makeNew,
  isBlank,
  buildEdit,
  buildView,
  rerender,
  onChange,
}) {
  container.innerHTML = '';
  container.appendChild(
    addBtn(addLabel, () => {
      makeNew();
      editing[flag] = items.length - 1;
      isNew[flag] = true;
      rerender();
      container.querySelector('.fin')?.focus();
    }),
  );
  items.forEach((item, i) => {
    const d = document.createElement('div');
    d.className = className(item);
    if (editing[flag] === i) {
      const fresh = isNew[flag];
      buildEdit(item, d);
      d.appendChild(
        cardActions(
          () => {
            if (fresh && isBlank(item)) items.splice(i, 1);
            editing[flag] = -1;
            isNew[flag] = false;
            rerender();
            onChange?.();
          },
          () => {
            items.splice(i, 1);
            editing[flag] = -1;
            isNew[flag] = false;
            rerender();
            onChange?.();
          },
          fresh,
          delLabel,
        ),
      );
    } else {
      buildView(item, d);
      d.appendChild(
        editBtn(() => {
          editing[flag] = i;
          isNew[flag] = false;
          rerender();
        }),
      );
    }
    container.appendChild(d);
  });
}

// PROJECT-level reference panels (cast, style, future beats) — re-render whenever the project changes
function renderCast() {
  cardList({
    container: document.getElementById('castList'),
    items: curProject().characters,
    flag: 'cast',
    className: () => 'fig',
    addLabel: 'New character',
    delLabel: 'Delete character',
    rerender: renderCast,
    makeNew: () => curProject().characters.push({ name: '', role: '', bio: '' }),
    isBlank: (c) => !c.name && !c.role && !c.bio,
    buildEdit: (c, d) => {
      d.appendChild(input('', c.name, 'Name', (v) => (c.name = v)));
      d.appendChild(
        input('small', c.role, 'Role (Lead, Foil, Ally…)', (v) => (c.role = v)),
      );
      d.appendChild(
        input(
          'ta',
          c.bio,
          'Who are they? What do they want?',
          (v) => (c.bio = v),
          true,
        ),
      );
    },
    buildView: (c, d) => {
      d.innerHTML =
        `<div class="fn">${esc(c.name) || '<span style="color:var(--ink-3)">Unnamed</span>'} <span class="fr">${esc(c.role)}</span></div>` +
        `<div class="fb">${esc(c.bio)}</div>`;
    },
  });
}
// continuity_notes.paragraph_id is not-null — anchor every new note to the
// paragraph you were reading when you created it
function renderCont() {
  cardList({
    container: document.getElementById('contList'),
    items: curBook().continuity,
    flag: 'cont',
    className: (c) => 'cnote' + (c.soft ? ' soft' : ''),
    addLabel: 'New continuity note',
    delLabel: 'Delete note',
    rerender: renderCont,
    onChange: refreshNotes,
    makeNew: () =>
      curBook().continuity.push({
        title: '',
        body: '',
        at: { s: cur.s, p: 0 },
        where:
          'Scene ' + String(cur.s + 1).padStart(2, '0') + ' · ¶' + (0 + 1),
      }),
    isBlank: (c) => !c.title && !c.body,
    buildEdit: (c, d) => {
      d.dataset.at = c.at.s + '-' + c.at.p;
      const ct = document.createElement('div');
      ct.className = 'ct';
      ct.style.width = '100%';
      ct.appendChild(
        input('', c.title, 'What must stay true?', (v) => (c.title = v)),
      );
      ct.appendChild(
        input('ta', c.body, 'Details…', (v) => (c.body = v), true),
      );
      d.appendChild(ct);
    },
    buildView: (c, d) => {
      d.dataset.at = c.at.s + '-' + c.at.p;
      const dot = document.createElement('span');
      dot.className = 'm';
      d.appendChild(dot);
      const ct = document.createElement('div');
      ct.className = 'ct';
      ct.innerHTML =
        `<div class="cn-title">${esc(c.title) || '<span style="color:var(--ink-3)">Untitled note</span>'}</div>` +
        `<div class="cn-body">${esc(c.body)}</div>` +
        (c.where ? `<span class="cw">${esc(c.where)}</span>` : '');
      d.appendChild(ct);
    },
  });
}
// keep the paragraph margin dots in sync without rebuilding paragraphs (which would wipe undo history)
function refreshNotes() {
  page.querySelectorAll('.para').forEach((p) => {
    const idx = +p.dataset.pidx,
      has = continuityFor(cur.s, idx).length > 0;
    const margin = p.querySelector('.margin');
    let note = p.querySelector('.note');
    if (has && !note) {
      note = document.createElement('button');
      note.className = 'note';
      note.type = 'button';
      note.title = 'Continuity noted here';
      note.innerHTML = '<i></i>';
      note.addEventListener('mousedown', (e) => {
        e.preventDefault();
        revealContinuity(cur.s, idx);
      });
      margin.prepend(note);
    } else if (!has && note) {
      note.remove();
    }
  });
}
// paragraph-linked continuity (continuity → paragraph)
function continuityFor(sIdx, pIdx) {
  return (curBook().continuity || []).filter(
    (c) => c.at && c.at.s === sIdx && c.at.p === pIdx,
  );
}
function revealContinuity(sIdx, pIdx) {
  openDrawer('cont');
  const key = sIdx + '-' + pIdx;
  requestAnimationFrame(() => {
    document
      .querySelectorAll('#contList .cnote')
      .forEach((n) => n.classList.remove('flash'));
    const t = document.querySelector('#contList .cnote[data-at="' + key + '"]');
    if (t) {
      void t.offsetWidth;
      t.classList.add('flash');
      t.scrollIntoView({ block: 'center' });
    }
  });
}
function renderStyle() {
  cardList({
    container: document.getElementById('styleList'),
    items: curProject().styleRules,
    flag: 'style',
    className: () => 'fig',
    addLabel: 'New style rule',
    delLabel: 'Delete rule',
    rerender: renderStyle,
    makeNew: () => curProject().styleRules.push({ title: '', content: '' }),
    isBlank: (r) => !r.title && !r.content,
    buildEdit: (r, d) => {
      d.appendChild(input('', r.title, 'Rule', (v) => (r.title = v)));
      d.appendChild(
        input(
          'ta',
          r.content,
          'How should it read?',
          (v) => (r.content = v),
          true,
        ),
      );
    },
    buildView: (r, d) => {
      d.innerHTML =
        `<div class="fn">${esc(r.title) || '<span style="color:var(--ink-3)">Untitled rule</span>'}</div>` +
        `<div class="fb">${esc(r.content)}</div>`;
    },
  });
}
// future_beats (project-level) can each link to one or more of this project's
// continuity notes (future_beat_continuity), shown as toggleable chips while editing
function allContinuityTitles() {
  const out = [];
  curProject().books.forEach((bk) =>
    (bk.continuity || []).forEach((c) => {
      if (c.title && !out.includes(c.title)) out.push(c.title);
    }),
  );
  return out;
}
function renderFuture() {
  cardList({
    container: document.getElementById('futureList'),
    items: curProject().futureBeats,
    flag: 'future',
    className: () => 'fig',
    addLabel: 'New future beat',
    delLabel: 'Delete beat',
    rerender: renderFuture,
    makeNew: () =>
      curProject().futureBeats.push({ title: '', content: '', continuity: [] }),
    isBlank: (r) => !r.title && !r.content,
    buildEdit: (r, d) => {
      d.appendChild(input('', r.title, 'Beat', (v) => (r.title = v)));
      d.appendChild(
        input(
          'ta',
          r.content,
          'What has to happen, and why does it matter?',
          (v) => (r.content = v),
          true,
        ),
      );
      const titles = allContinuityTitles();
      if (titles.length) {
        const chips = document.createElement('div');
        chips.className = 'beat-links';
        titles.forEach((t) => {
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'beat-link' + (r.continuity.includes(t) ? ' on' : '');
          chip.textContent = t;
          chip.addEventListener('click', () => {
            const idx = r.continuity.indexOf(t);
            if (idx >= 0) r.continuity.splice(idx, 1);
            else r.continuity.push(t);
            renderFuture();
          });
          chips.appendChild(chip);
        });
        d.appendChild(chips);
      }
    },
    buildView: (r, d) => {
      d.innerHTML =
        `<div class="fn">${esc(r.title) || '<span style="color:var(--ink-3)">Untitled beat</span>'}</div>` +
        `<div class="fb">${esc(r.content)}</div>` +
        (r.continuity.length
          ? `<div class="beat-links">${r.continuity.map((t) => `<span class="beat-link">${esc(t)}</span>`).join('')}</div>`
          : '');
    },
  });
}
// PROJECT-level panels re-render whenever the project changes
function loadProject() {
  renderCast();
  renderStyle();
  renderFuture();
  document.getElementById('projectName').textContent = curProject().name;
}
// BOOK-level panels re-render whenever the book changes
function loadBook() {
  renderCont();
  document.getElementById('bookTitle').textContent = curBook().name;
}

function goTo(p, b, s) {
  const projectChanged = p !== cur.p;
  const bookChanged = projectChanged || b !== cur.b;
  cur.p = p;
  cur.b = b;
  if (projectChanged) loadProject();
  if (bookChanged) loadBook();
  render(s);
  closeAll();
}

// reference drawer — docks and pushes the whole main view left so nothing sits under it
function openDrawer(tab) {
  scrim.classList.remove('open');
  scenePicker.classList.remove('open');
  drawer.classList.add('open');
  document.body.classList.add('panel-open');
  document
    .querySelectorAll('.dtabs button[data-tab]')
    .forEach((x) => x.classList.toggle('active', x.dataset.tab === tab));
  document
    .querySelectorAll('.dpanel')
    .forEach((x) => x.classList.toggle('active', x.dataset.panel === tab));
}
document
  .querySelectorAll('.dock [data-ref]')
  .forEach((b) => b.addEventListener('click', () => openDrawer(b.dataset.ref)));
document
  .querySelectorAll('.dtabs button[data-tab]')
  .forEach((b) => b.addEventListener('click', () => openDrawer(b.dataset.tab)));
document.getElementById('drawerClose').addEventListener('click', closeAll);

// two popups: Scenes (current book) and Books (current project). Project selection is deferred.
const sceneSearch = document.getElementById('sceneSearch'),
  sceneList = document.getElementById('sceneList'),
  sceneCtx = document.getElementById('sceneCtx'),
  bookSearch = document.getElementById('bookSearch'),
  bookList = document.getElementById('bookList'),
  bookCtx = document.getElementById('bookCtx');
const pad = (n) => String(n + 1).padStart(2, '0');
const wordCountOf = (s) =>
  s.paras.join(' ').trim().split(/\s+/).filter(Boolean).length;
// scenes.status is constrained to draft | revised | final
const statusText = (s) =>
  ({ draft: 'draft', revised: 'revised', final: 'final' })[s.status] ||
  'draft';
const sceneSub = (s) =>
  wordCountOf(s).toLocaleString() + ' words · ' + statusText(s);

function emptyRow(parent, text) {
  const d = document.createElement('div');
  d.className = 'ctx-empty';
  d.style.padding = '14px 16px';
  d.textContent = text;
  parent.appendChild(d);
}

function row(parent, o) {
  const r = document.createElement('div');
  r.className = 'srow' + (o.active ? ' active' : '');
  let h = '';
  if (o.num) h += `<span class="n">${o.num}</span>`;
  h += `<span class="t">${esc(o.label)}</span>`;
  if (o.sub) h += `<span class="s">${esc(o.sub)}</span>`;
  r.innerHTML = h;
  r.addEventListener('click', o.onClick);
  if (o.rename) {
    const b = document.createElement('button');
    b.className = 'ren';
    b.type = 'button';
    b.title = 'Rename';
    b.innerHTML = icon('pencil', 13);
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      startRename(r, o);
    });
    r.appendChild(b);
  }
  if (o.del) {
    // no edit mode needed here — but destructive, so it always confirms
    const b = document.createElement('button');
    b.className = 'del-row';
    b.type = 'button';
    b.title = 'Delete';
    b.innerHTML = icon('trash-2', 13);
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      o.del();
    });
    r.appendChild(b);
  }
  parent.appendChild(r);
  return r;
}

// a brand-new project/book is created straight into its name field; abandoning it discards it
let pending = { project: -1, book: -1 };
function cleanupPending() {
  if (pending.book >= 0) {
    const bks = curProject().books;
    if (bks[pending.book] && !bks[pending.book].name)
      bks.splice(pending.book, 1);
    pending.book = -1;
  }
  if (pending.project >= 0) {
    if (projects[pending.project] && !projects[pending.project].name)
      projects.splice(pending.project, 1);
    pending.project = -1;
  }
}

// ── confirmation, for destructive actions only ──
const confirmModal = document.getElementById('confirmModal');
let confirmFn = null;
function askConfirm(title, body, onOk) {
  document.getElementById('cfTitle').textContent = title;
  document.getElementById('cfBody').textContent = body;
  confirmFn = onOk;
  scrim.classList.add('open');
  confirmModal.classList.add('open');
}
function closeConfirm() {
  confirmModal.classList.remove('open');
  confirmFn = null;
}
document.getElementById('cfCancel').addEventListener('click', closeConfirm);
document.getElementById('cfOk').addEventListener('click', () => {
  const f = confirmFn;
  closeConfirm();
  if (f) f();
});
// inline rename, in place — Enter commits, Escape cancels
function startRename(r, o) {
  const t = r.querySelector('.t');
  const inp = document.createElement('input');
  inp.className = 'ren-in';
  inp.value = o.label;
  if (o.isNew) inp.placeholder = o.placeholder || 'Name…';
  t.replaceWith(inp);
  inp.focus();
  inp.select();
  let closed = false;
  const finish = (save) => {
    if (closed) return;
    closed = true;
    const v = inp.value.trim();
    if (save && v) {
      o.rename(v);
      refreshLabels();
    } else if (o.isNew) {
      o.discard();
    } // never named = never created
    o.refresh();
  };
  inp.addEventListener('click', (e) => e.stopPropagation());
  inp.addEventListener('mousedown', (e) => e.stopPropagation());
  inp.addEventListener('keydown', (e) => {
    e.stopPropagation(); // don't let Escape close the whole popup
    if (e.key === 'Enter') {
      e.preventDefault();
      finish(true);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      finish(false);
    }
  });
  inp.addEventListener('blur', () => finish(true));
}

// Scenes popup — current book only, no project/book selection
function renderScenes() {
  sceneCtx.textContent = curBook().name;
  const addWrap = document.getElementById('sceneAdd');
  addWrap.innerHTML = '';
  addWrap.appendChild(
    addBtn('New scene', () => {
      sceneSearch.value = '';
      curBook().scenes.push({
        title: 'Untitled scene',
        status: 'draft',
        paras: [''],
        updated: Date.now(),
      });
      goTo(cur.p, cur.b, curBook().scenes.length - 1);
      // a scene names itself on the page — land in it with the title selected, ready to type over
      setTimeout(() => {
        hTitle.focus();
        const rng = document.createRange();
        rng.selectNodeContents(hTitle);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(rng);
      }, 60);
    }),
  );
  const q = sceneSearch.value.trim().toLowerCase();
  sceneList.innerHTML = '';
  let n = 0;
  curBook().scenes.forEach((s, si) => {
    if (q && !s.title.toLowerCase().includes(q)) return;
    row(sceneList, {
      num: pad(si),
      label: s.title,
      sub: sceneSub(s),
      active: si === cur.s,
      onClick: () => goTo(cur.p, cur.b, si),
      rename: (v) => {
        s.title = v;
      },
      refresh: renderScenes,
      del:
        curBook().scenes.length > 1
          ? () =>
              askConfirm(
                'Delete this scene?',
                `“${s.title}” and everything written in it will be permanently deleted. This can’t be undone.`,
                () => deleteScene(si),
              )
          : null,
    });
    n++;
  });
  if (!n) emptyRow(sceneList, 'No scenes match.');
}
function deleteScene(si) {
  const bk = curBook();
  bk.scenes.splice(si, 1);
  if (cur.s === si) render(Math.min(si, bk.scenes.length - 1));
  else if (cur.s > si) {
    cur.s--;
    refreshLabels();
  }
  renderScenes();
}
// shared by the Scenes / Books / Projects popups: reset the overlay, reset
// the search box, render, and hand focus to the search field on request
function openPicker(overlay, searchEl, renderFn, focus) {
  closeAll();
  scrim.classList.add('open');
  overlay.classList.add('open');
  searchEl.value = '';
  renderFn();
  if (focus) setTimeout(() => searchEl.focus(), 40);
}
function openScenesPopup(focus) {
  openPicker(scenePicker, sceneSearch, renderScenes, focus);
}

// Book popup — books in the current project only. Selecting a book resumes its last-edited scene.
function renderBooks() {
  bookCtx.textContent = curProject().name;
  const addWrap = document.getElementById('bookAdd');
  addWrap.innerHTML = '';
  addWrap.appendChild(
    addBtn('New book', () => {
      bookSearch.value = ''; // a new row must not be hidden by a stale filter
      curProject().books.push({
        id: 'b' + Date.now(),
        name: '',
        continuity: [],
        scenes: [
          {
            title: 'Untitled scene',
            status: 'draft',
            paras: [''],
            updated: Date.now(),
          },
        ],
      });
      pending.book = curProject().books.length - 1;
      renderBooks(); // renders it straight into its name field
    }),
  );
  const q = bookSearch.value.trim().toLowerCase();
  bookList.innerHTML = '';
  let n = 0;
  curProject().books.forEach((bk, bi) => {
    if (q && !bk.name.toLowerCase().includes(q)) return;
    const o = {
      label: bk.name,
      sub: bk.scenes.length + ' scenes',
      active: bi === cur.b,
      onClick: () => goTo(cur.p, bi, lastSceneOf(bk)),
      rename: (v) => {
        bk.name = v;
      },
      refresh: renderBooks,
      del:
        curProject().books.length > 1
          ? () =>
              askConfirm(
                'Delete this book?',
                `“${bk.name}” and its ${bk.scenes.length} scene${bk.scenes.length === 1 ? '' : 's'} — plus any continuity notes anchored to them — will be permanently deleted. This can’t be undone.`,
                () => deleteBook(bi),
              )
          : null,
    };
    if (pending.book === bi) {
      o.isNew = true;
      o.del = null;
      o.placeholder = 'Name this book…';
      o.rename = (v) => {
        bk.name = v;
        pending.book = -1;
        goTo(cur.p, bi, 0);
      }; // named → open it
      o.discard = () => {
        curProject().books.splice(bi, 1);
        pending.book = -1;
      };
    }
    const r = row(bookList, o);
    if (pending.book === bi) startRename(r, o);
    n++;
  });
  if (!n) emptyRow(bookList, 'No books match.');
}
function deleteBook(bi) {
  const pr = curProject();
  pr.books.splice(bi, 1);
  if (cur.b === bi) {
    cur.b = Math.min(bi, pr.books.length - 1);
    loadBook();
    render(lastSceneOf(curBook()));
  } else if (cur.b > bi) {
    cur.b--;
    refreshLabels();
  }
  renderBooks();
}
function openBookPopup(focus) {
  openPicker(bookPicker, bookSearch, renderBooks, focus);
}

// Project popup — opened from the toolbar chip. Selecting a project resumes its last-edited scene.
const projectSearch = document.getElementById('projectSearch'),
  projectList = document.getElementById('projectList');
function renderProjects() {
  const addWrap = document.getElementById('projectAdd');
  addWrap.innerHTML = '';
  addWrap.appendChild(
    addBtn('New project', () => {
      projectSearch.value = '';
      projects.push({
        id: 'p' + Date.now(),
        name: '',
        characters: [],
        styleRules: [],
        futureBeats: [],
        books: [
          {
            id: 'b' + Date.now(),
            name: 'Untitled book',
            continuity: [],
            scenes: [
              {
                title: 'Untitled scene',
                status: 'draft',
                paras: [''],
                updated: Date.now(),
              },
            ],
          },
        ],
      });
      pending.project = projects.length - 1;
      renderProjects();
    }),
  );
  const q = projectSearch.value.trim().toLowerCase();
  projectList.innerHTML = '';
  let n = 0;
  projects.forEach((pr, pi) => {
    if (q && !pr.name.toLowerCase().includes(q)) return;
    const o = {
      label: pr.name,
      sub: pr.books.length + ' book' + (pr.books.length > 1 ? 's' : ''),
      active: pi === cur.p,
      onClick: () => {
        const t = lastOfProject(projects[pi]);
        goTo(pi, t.b, t.s);
      },
      rename: (v) => {
        pr.name = v;
      },
      refresh: renderProjects,
      del:
        projects.length > 1
          ? () =>
              askConfirm(
                'Delete this project?',
                `“${pr.name}”, all ${pr.books.length} book${pr.books.length === 1 ? '' : 's'} inside it, and its cast, style rules and future beats will be permanently deleted. This can’t be undone.`,
                () => deleteProject(pi),
              )
          : null,
    };
    if (pending.project === pi) {
      o.isNew = true;
      o.del = null;
      o.placeholder = 'Name this project…';
      o.rename = (v) => {
        pr.name = v;
        pending.project = -1;
        goTo(pi, 0, 0);
      };
      o.discard = () => {
        projects.splice(pi, 1);
        pending.project = -1;
      };
    }
    const r = row(projectList, o);
    if (pending.project === pi) startRename(r, o);
    n++;
  });
  if (!n) emptyRow(projectList, 'No projects match.');
}
function deleteProject(pi) {
  projects.splice(pi, 1);
  if (cur.p === pi) {
    cur.p = Math.min(pi, projects.length - 1);
    const t = lastOfProject(curProject());
    cur.b = t.b;
    loadProject();
    loadBook();
    render(t.s);
  } else if (cur.p > pi) {
    cur.p--;
    refreshLabels();
  }
  renderProjects();
}
function openProjectPopup(focus) {
  openPicker(projectPicker, projectSearch, renderProjects, focus);
}

sceneSearch.addEventListener('input', renderScenes);
bookSearch.addEventListener('input', renderBooks);
projectSearch.addEventListener('input', renderProjects);
document
  .getElementById('openScenes')
  .addEventListener('click', () => openScenesPopup(true));
document
  .getElementById('bookTitle')
  .addEventListener('click', () => openBookPopup(false));
document
  .getElementById('projectBtn')
  .addEventListener('click', () => openProjectPopup(false));
function stepScene(delta) {
  const t = cur.s + delta;
  if (t >= 0 && t < curBook().scenes.length) {
    render(t);
    stage.scrollTop = 0;
  }
}
document
  .getElementById('prevScene')
  .addEventListener('click', () => stepScene(-1));
document
  .getElementById('nextScene')
  .addEventListener('click', () => stepScene(1));

scrim.addEventListener('click', closeAll);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAll();
});
// ── overflow menu ──
const menu = document.getElementById('menu'),
  menuBtn = document.getElementById('menuBtn');
function setMenu(open) {
  menu.classList.toggle('open', open);
  menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
menuBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  setMenu(!menu.classList.contains('open'));
});
document.addEventListener('click', (e) => {
  if (
    menu.classList.contains('open') &&
    !menu.contains(e.target) &&
    !menuBtn.contains(e.target)
  )
    setMenu(false);
});

// theme: light / dark / system (system = no override, follow the OS)
function drawSeg() {
  const t = document.documentElement.getAttribute('data-theme') || 'system';
  document
    .querySelectorAll('#themeSeg button')
    .forEach((b) => b.classList.toggle('on', b.dataset.t === t));
}
document.querySelectorAll('#themeSeg button').forEach((b) =>
  b.addEventListener('click', () => {
    if (b.dataset.t === 'system')
      document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', b.dataset.t);
    drawSeg();
  }),
);

// preferences
function drawPrefs() {
  document
    .querySelectorAll('.mi.tog')
    .forEach((b) =>
      b.querySelector('.sw').classList.toggle('on', !!prefs[b.dataset.pref]),
    );
}
document.querySelectorAll('.mi.tog').forEach((b) =>
  b.addEventListener('click', () => {
    prefs[b.dataset.pref] = !prefs[b.dataset.pref];
    if (!prefs.dim) document.body.classList.remove('focusline');
    drawPrefs();
  }),
);

// desktop-gated features: show the item, but prompt for the desktop app rather than dead-ending
const deskModal = document.getElementById('deskModal');
document.querySelectorAll('[data-desktop]').forEach((b) =>
  b.addEventListener('click', () => {
    setMenu(false);
    document.getElementById('dmTitle').textContent =
      b.dataset.dtitle || 'This lives in Resver for desktop';
    document.getElementById('dmBody').textContent = b.dataset.dbody || '';
    scrim.classList.add('open');
    deskModal.classList.add('open');
  }),
);
document.getElementById('dmClose').addEventListener('click', closeAll);

// illustrative actions (preview only)
document
  .querySelectorAll('.menu .mi[data-act]')
  .forEach((b) => b.addEventListener('click', () => setMenu(false)));

drawSeg();
drawPrefs();

// paragraph selection → AI context chips
function paraText(p) {
  return stripChrome(p).textContent.trim();
}
function renderChips() {
  const sel = [...document.querySelectorAll('.para.selected')];
  const wrap = document.getElementById('ctxChips');
  document.getElementById('ctxCount').textContent = sel.length;
  wrap.innerHTML = '';
  if (!sel.length) {
    const d = document.createElement('div');
    d.className = 'ctx-empty';
    d.textContent =
      'Nothing marked yet. Click the margin beside a paragraph to mark it as context.';
    wrap.appendChild(d);
    return;
  }
  sel.forEach((p) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    const t = document.createElement('span');
    t.className = 'ctxt';
    t.textContent = paraText(p);
    const x = document.createElement('button');
    x.className = 'cx';
    x.type = 'button';
    x.textContent = '×';
    x.title = 'Remove from context';
    x.addEventListener('click', () => {
      p.classList.remove('selected');
      renderChips();
    });
    chip.append(t, x);
    wrap.appendChild(chip);
  });
}

// AI composer — look & feel only (canned, preview responses)
const chatScroll = document.getElementById('chatScroll'),
  aiInput = document.getElementById('aiInput'),
  aiSend = document.getElementById('aiSend');
function addBubble(role, text) {
  const m = document.createElement('div');
  m.className = 'msg ' + role;
  const b = document.createElement('div');
  b.className = 'bubble';
  b.textContent = text;
  m.appendChild(b);
  chatScroll.appendChild(m);
  chatScroll.scrollTop = chatScroll.scrollHeight;
  return b;
}
function sendMsg() {
  const v = aiInput.value.trim();
  if (!v) return;
  addBubble('user', v);
  aiInput.value = '';
  aiInput.style.height = 'auto';
  const n = document.querySelectorAll('.para.selected').length;
  const b = addBubble('bot', 'thinking…');
  b.classList.add('typing');
  setTimeout(() => {
    b.classList.remove('typing');
    b.textContent = n
      ? `Reading the ${n} paragraph${n > 1 ? 's' : ''} you selected… (preview — the assistant isn’t wired up yet)`
      : `Happy to help — select a paragraph or two so I can ground my answer in your text. (preview only)`;
    chatScroll.scrollTop = chatScroll.scrollHeight;
  }, 700);
}
aiSend.addEventListener('click', sendMsg);
aiInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMsg();
  }
});
aiInput.addEventListener('input', () => {
  aiInput.style.height = 'auto';
  aiInput.style.height = Math.min(aiInput.scrollHeight, 120) + 'px';
});

// rename a scene by writing over its title on the page
hTitle.addEventListener('input', () => {
  const t = hTitle.textContent.trim();
  curBook().scenes[cur.s].title = t;
  whisperScene.textContent =
    'Scene ' +
    String(cur.s + 1).padStart(2, '0') +
    ' · ' +
    (t || 'Untitled scene');
});
hTitle.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    hTitle.blur();
  } // a title is one line
  if (e.key === 'Escape') {
    e.preventDefault();
    hTitle.blur();
  }
});
hTitle.addEventListener('blur', () => {
  if (!hTitle.textContent.trim()) {
    // never leave a scene nameless
    curBook().scenes[cur.s].title = 'Untitled scene';
    hTitle.textContent = 'Untitled scene';
  }
  refreshLabels();
});

// fill static icon placeholders (dock, tabs, minimise, send)
document.querySelectorAll('[data-icon]').forEach((el) => {
  el.innerHTML = icon(el.dataset.icon, +el.dataset.size || 16);
});

loadProject();
loadBook();
render(lastSceneOf(curBook()));
