// ============================================
//  ПЕРЕКЛЮЧАТЕЛЬ ТЕМЫ
// ============================================
(function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  const icon   = document.getElementById('theme-icon');
  if (!toggle) return;

  const saved = localStorage.getItem('theme');
  if (saved === 'dark') {
    document.body.classList.add('dark');
    icon.textContent = '☀️';
  } else {
    icon.textContent = '🌙';
  }

  toggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    icon.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
})();

// ============================================
//  НАСТРОЙКИ
// ============================================
const API_URL = 'https://script.google.com/macros/s/AKfycbw6i5ZyPzjWSkYB8PTACDnFcMFbXxDCDLK137pU6pCCMS4B92dXYtms1qmJN5mWQ-za/exec';

const FLOORS_BY_OBJECT = {
  'Ларинская гимназия': ['1', '2', '3', 'Чердак', 'Нет'],
  'ЖЕДЕПОМ':            ['Подвал', '1', '2', '3', 'Чердак', 'Нет']
};

const MATERIALS = [
  {
    id: 'cable',
    label: 'Кабель КПСЭнг(A)FRHF 1x2x',
    unit: 'м',
    variants: [
      { id: 'cable_075', label: 'х0,75' },
      { id: 'cable_1',   label: 'х1' }
    ]
  },
  {
    id: 'channel',
    label: 'Кабель-канал',
    unit: 'м',
    variants: [
      { id: 'channel_40x25', label: '40х25', primary: true },
      { id: 'channel_25x16', label: '25х16' }
    ]
  },
  {
    id: 'corrugated',
    label: 'Труба гофрированная d=',
    unit: 'м',
    variants: [
      { id: 'corrugated_20', label: '20 мм', primary: true },
      { id: 'corrugated_16', label: '16 мм' }
    ]
  },
  {
    id: 'steel',
    label: 'Труба стальная ВГП ДУ d=',
    unit: 'м',
    variants: [
      { id: 'steel_15', label: '15 мм', primary: true },
      { id: 'steel_20', label: '20 мм' }
    ]
  }
];

// ============================================
//  СОСТОЯНИЕ
// ============================================
const materialValues = {};
const journal = [];

// ============================================
//  ДАТА
// ============================================
const DATE_MIN_DAYS_AGO = 7;
const dateInput = document.getElementById('date');

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function setupDateRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() - DATE_MIN_DAYS_AGO);

  dateInput.min = toISODate(minDate);
  dateInput.max = toISODate(today);

  if (!dateInput.value) dateInput.value = toISODate(today);
}

function updateDateHighlight() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = toISODate(today);
  const v = dateInput.value;
  dateInput.classList.remove('is-old-date');
  if (!v || v === todayISO) return;
  dateInput.classList.add('is-old-date');
}

setupDateRange();
updateDateHighlight();

dateInput.addEventListener('change', () => {
  if (dateInput.value) {
    if (dateInput.value < dateInput.min) dateInput.value = dateInput.min;
    if (dateInput.value > dateInput.max) dateInput.value = dateInput.max;
  }
  updateDateHighlight();
  updateFieldState(dateInput);
});

let lastKnownDay = toISODate(new Date());
setInterval(() => {
  const todayISO = toISODate(new Date());
  if (todayISO !== lastKnownDay) {
    lastKnownDay = todayISO;
    setupDateRange();
    if (!dateInput.value || dateInput.value < dateInput.min) {
      dateInput.value = todayISO;
    }
    updateDateHighlight();
    updateFieldState(dateInput);
  }
}, 60 * 1000);

// ============================================
//  УТИЛИТЫ
// ============================================
function show(text, cls) {
  const m = document.getElementById('msg');
  m.textContent = text; m.className = cls || '';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

let toastTimer = null;
function showToast(text) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ============================================
//  КАСТОМНЫЙ SELECT (этаж)
// ============================================
class CustomSelect {
  constructor(rootEl) {
    this.root = rootEl;
    this.input = rootEl.querySelector('input[type="hidden"]');
    this.btn = rootEl.querySelector('.cselect-btn');
    this.valueEl = rootEl.querySelector('.cselect-value');
    this.list = rootEl.querySelector('.cselect-list');
    this._placeholder = this.valueEl.textContent.trim();

    this.btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.input.disabled) return;
      this.toggle();
    });

    this.list.addEventListener('click', (e) => {
      const li = e.target.closest('.cselect-option');
      if (!li || li.classList.contains('disabled')) return;
      this.select(li.dataset.value);
    });

    this._onDocClick = (e) => {
      if (!this.root.contains(e.target)) this.close();
    };
    this._onDocKey = (e) => {
      if (e.key === 'Escape') this.close();
    };

    document.addEventListener('click', this._onDocClick);
    document.addEventListener('keydown', this._onDocKey);

    this.updateDisplay();
  }

  destroy() {
    document.removeEventListener('click', this._onDocClick);
    document.removeEventListener('keydown', this._onDocKey);
  }

  get value() { return this.input.value; }
  set value(v) { this.input.value = v; this.updateDisplay(); }
  get disabled() { return this.input.disabled; }
  set disabled(v) {
    this.input.disabled = v;
    this.btn.disabled = v;
    this.root.classList.toggle('cselect-disabled', v);
  }
  set placeholder(text) { this._placeholder = text; this.updateDisplay(); }

  select(value) {
    this.input.value = value;
    this.input.dispatchEvent(new Event('change', { bubbles: true }));
    this.updateDisplay();
    this.close();
  }

  setOptions(arr) {
    this.list.innerHTML = '';
    arr.forEach(opt => {
      const li = document.createElement('li');
      li.className = 'cselect-option';
      if (typeof opt === 'string') {
        li.dataset.value = opt;
        li.textContent = opt;
      } else {
        li.dataset.value = opt.value;
        li.textContent = opt.label;
      }
      this.list.appendChild(li);
    });
    const vals = arr.map(o => typeof o === 'string' ? o : o.value);
    if (!vals.includes(this.input.value)) this.input.value = '';
    this.updateDisplay();
  }

  updateDisplay() {
    const v = this.input.value;
    let label = null;
    let found = false;

    this.list.querySelectorAll('.cselect-option').forEach(li => {
      const isSel = li.dataset.value === v && v !== '';
      li.classList.toggle('selected', isSel);
      if (isSel) {
        label = li.textContent.replace(/\s*✓\s*$/, '').trim();
        found = true;
      }
    });

    if (found) {
      this.valueEl.textContent = label;
      this.valueEl.classList.remove('placeholder');
    } else {
      this.valueEl.textContent = this._placeholder;
      this.valueEl.classList.add('placeholder');
    }
  }

  toggle() {
    const isOpen = this.root.classList.contains('open');
    document.querySelectorAll('.cselect.open').forEach(el => el.classList.remove('open'));
    if (!isOpen) {
      this.root.classList.add('open');
      const sel = this.list.querySelector('.cselect-option.selected');
      if (sel) setTimeout(() => sel.scrollIntoView({ block: 'nearest' }), 30);
    }
  }

  close() { this.root.classList.remove('open'); }
}

const customSelects = {};
document.querySelectorAll('[data-cselect]').forEach(rootEl => {
  const input = rootEl.querySelector('input[type="hidden"]');
  if (input) customSelects[input.id] = new CustomSelect(rootEl);
});

// ============================================
//  SEGMENTED CONTROL
// ============================================
function initSegmented(rootId, inputId, opts) {
  opts = opts || {};
  const root = document.getElementById(rootId);
  const input = document.getElementById(inputId);
  if (!root || !input) return;

  const allowDeselect = opts.allowDeselect === true;

  function updateDisplay() {
    const v = input.value;
    root.querySelectorAll('.segmented-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === v);
    });
  }

  root.querySelectorAll('.segmented-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const isActive = btn.classList.contains('active');

      if (allowDeselect && isActive) {
        input.value = '';
      } else {
        input.value = btn.dataset.value;
      }

      input.dispatchEvent(new Event('change', { bubbles: true }));
      updateDisplay();
    });
  });

  input.addEventListener('change', updateDisplay);
  updateDisplay();

  input._updateSegmentedDisplay = updateDisplay;
}

initSegmented('object-segmented', 'object', { allowDeselect: false });
initSegmented('work-segmented',   'work',   { allowDeselect: false });

// ============================================
//  ЭЛЕМЕНТЫ
// ============================================
const objectSelect = document.getElementById('object');
const floorInput   = document.getElementById('floor');
const floorCS      = customSelects.floor;
const roomInput    = document.getElementById('room');
const nameInput    = document.getElementById('name');
const nameErr      = document.getElementById('err-name');
const workInput    = document.getElementById('work');
const journalCont  = document.getElementById('journal-container');
const journalEmpty = document.getElementById('journal-empty');
const journalCount = document.getElementById('journal-count');

// ============================================
//  ЭТАЖИ
// ============================================
function rebuildFloors() {
  const obj = objectSelect.value;
  const floors = FLOORS_BY_OBJECT[obj];

  if (!floors) {
    floorCS.setOptions([]);
    floorCS.placeholder = '🔒 Объект';
    floorCS.disabled = true;
    return;
  }

  floorCS.setOptions(floors);
  floorCS.placeholder = '— выберите —';
  floorCS.disabled = false;
  updateFieldState(floorInput);
}

// ============================================
//  ПОМЕЩЕНИЕ
// ============================================
function updateRoomState() {
  const floorVal = floorInput.value;

  roomInput.classList.remove('is-empty', 'is-filled', 'is-invalid');

  if (!floorVal) {
    roomInput.value = '';
    roomInput.disabled = true;
    roomInput.placeholder = '🔒 Этаж';
    return;
  }

  if (floorVal === 'Нет') {
    roomInput.value = 'Нет';
    roomInput.disabled = true;
    roomInput.placeholder = '';
    return;
  }

  roomInput.disabled = false;
  roomInput.placeholder = '32 105 108';
  updateFieldState(roomInput);
}

// ============================================
//  МАТЕРИАЛЫ — РЕНДЕР
// ============================================
function renderMaterials() {
  const container = document.getElementById('materials-container');
  if (!container) return;

  document.querySelectorAll('.variant-input').forEach(inp => {
    materialValues[inp.dataset.id] = inp.value;
  });

  container.innerHTML = '';

  MATERIALS.forEach(mat => {
    if (mat.variants.length === 0) return;

    const group = document.createElement('div');
    group.className = 'material-group';

    const nameEl = document.createElement('div');
    nameEl.className = 'material-group-name';
    nameEl.textContent = mat.label;
    group.appendChild(nameEl);

    mat.variants.forEach(v => {
      const line = document.createElement('div');
      line.className = 'variant-line';

      const badge = document.createElement('span');
      badge.className = 'variant-badge' + (v.primary ? ' primary' : '');
      badge.textContent = v.label;
      line.appendChild(badge);

      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'decimal';
      input.className = 'variant-input';
      input.dataset.id = v.id;
      input.placeholder = '0';
      input.autocomplete = 'off';
      input.value = materialValues[v.id] || '';

      input.addEventListener('input', () => {
        let raw = input.value.replace(/,/g, '.').replace(/[^0-9.]/g, '');
        const parts = raw.split('.');
        if (parts.length > 2) raw = parts[0] + '.' + parts.slice(1).join('');
        if (input.value !== raw) input.value = raw;
        materialValues[v.id] = raw;
      });

      line.appendChild(input);

      const unit = document.createElement('span');
      unit.className = 'variant-unit';
      unit.textContent = mat.unit;
      line.appendChild(unit);

      group.appendChild(line);
    });

    container.appendChild(group);
  });
}

// ============================================
//  МАТЕРИАЛЫ — В МАССИВ
// ============================================
function materialValuesToArray(mv) {
  const list = [];
  MATERIALS.forEach(mat => {
    mat.variants.forEach(v => {
      const qty = mv[v.id];
      if (qty && parseFloat(qty) > 0) {
        list.push({
          name: mat.label + ' ' + v.label,
          unit: mat.unit,
          qty: qty
        });
      }
    });
  });
  return list;
}

// ============================================
//  СБРОС ТЕКУЩЕЙ ЗАПИСИ
//  Снизу вверх: материалы → тип работ → помещение
// ============================================
function resetCurrentEntry() {
  // материалы
  Object.keys(materialValues).forEach(k => delete materialValues[k]);
  renderMaterials();

  // тип работ
  workInput.value = '';
  if (workInput._updateSegmentedDisplay) workInput._updateSegmentedDisplay();

  // помещение
  roomInput.value = '';
  updateFieldState(roomInput);
  roomInput.classList.remove('is-empty', 'is-filled', 'is-invalid');

  // ошибки
  ['err-room', 'err-work'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });
}

// ============================================
//  ЖУРНАЛ — РЕНДЕР
// ============================================
function renderJournal() {
  journalCount.textContent = journal.length > 0 ? '(' + journal.length + ')' : '';

  if (journal.length === 0) {
    journalCont.innerHTML = '';
    journalEmpty.style.display = 'block';
    return;
  }

  journalEmpty.style.display = 'none';
  journalCont.innerHTML = '';

  journal.forEach((entry, idx) => {
    const el = document.createElement('div');
    el.className = 'journal-entry';

    const header = document.createElement('div');
    header.className = 'journal-entry-header';

    const title = document.createElement('div');
    title.className = 'journal-entry-title';
    title.textContent = entry.room_none
      ? 'Без помещения'
      : 'Пом. ' + entry.room;
    header.appendChild(title);

    const actions = document.createElement('div');
    actions.className = 'journal-entry-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'journal-btn journal-btn-edit';
    editBtn.title = 'Изменить';
    editBtn.textContent = '✏️';
    editBtn.addEventListener('click', () => editJournalEntry(idx));
    actions.appendChild(editBtn);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'journal-btn journal-btn-del';
    delBtn.title = 'Удалить';
    delBtn.textContent = '🗑';
    delBtn.addEventListener('click', () => removeJournalEntry(idx));
    actions.appendChild(delBtn);

    header.appendChild(actions);
    el.appendChild(header);

    const meta = document.createElement('div');
    meta.className = 'journal-entry-meta';
    meta.textContent = entry.work;
    el.appendChild(meta);

    const matsArr = materialValuesToArray(entry.materialValues);
    if (matsArr.length > 0) {
      const mats = document.createElement('div');
      mats.className = 'journal-entry-materials';
      matsArr.forEach(m => {
        const row = document.createElement('div');
        row.className = 'journal-entry-mat';
        row.innerHTML =
          '<span class="jm-name">' + escapeHtml(m.name) + '</span>' +
          '<span class="jm-qty">' + escapeHtml(m.qty) + ' ' + escapeHtml(m.unit) + '</span>';
        mats.appendChild(row);
      });
      el.appendChild(mats);
    }

    journalCont.appendChild(el);
  });
}

// ============================================
//  ЖУРНАЛ — ДЕЙСТВИЯ
// ============================================
function editJournalEntry(idx) {
  const entry = journal[idx];
  if (!entry) return;

  journal.splice(idx, 1);
  renderJournal();

  workInput.value = entry.work;
  if (workInput._updateSegmentedDisplay) workInput._updateSegmentedDisplay();

  Object.keys(materialValues).forEach(k => delete materialValues[k]);
  Object.assign(materialValues, entry.materialValues);
  renderMaterials();

  roomInput.value = entry.room;
  updateFieldState(roomInput);

  const card = document.getElementById('entry-card');
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });

  showToast('Запись загружена для редактирования');
}

function removeJournalEntry(idx) {
  if (!journal[idx]) return;
  journal.splice(idx, 1);
  renderJournal();
  showToast('Запись удалена');
}

// ============================================
//  ВАЛИДАЦИЯ
// ============================================
function validateHeader() {
  let firstProblem = null;

  ['err-date', 'err-object', 'err-floor'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });
  nameErr.classList.remove('show');
  nameInput.classList.remove('is-invalid');

  if (!dateInput.value.trim()) {
    if (!firstProblem) firstProblem = dateInput;
  }

  if (!objectSelect.value.trim()) {
    const err = document.getElementById('err-object');
    if (err) err.classList.add('show');
    if (!firstProblem) firstProblem = objectSelect;
  }

  if (!floorInput.value.trim()) {
    const err = document.getElementById('err-floor');
    if (err) err.classList.add('show');
    if (!firstProblem) firstProblem = floorInput;
  }

  const nameVal = nameInput.value.trim();
  if (!nameVal || !isNameValid(nameVal)) {
    nameErr.textContent = nameVal
      ? 'Введите Имя и Фамилию — ровно 2 слова (например: Иван Иванов)'
      : 'Введите Имя и Фамилию — ровно 2 слова';
    nameErr.classList.add('show');
    nameInput.classList.add('is-invalid');
    if (!firstProblem) firstProblem = nameInput;
  }

  if (firstProblem) {
    show('⚠️ Заполните поля сверху', 'err');
    if (firstProblem.focus) firstProblem.focus();
    if (firstProblem.scrollIntoView) {
      firstProblem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return false;
  }
  return true;
}

function validateCurrentEntry() {
  let firstProblem = null;

  ['err-room', 'err-work'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });

  if (!roomInput.value.trim()) {
    roomInput.classList.add('shake');
    setTimeout(() => roomInput.classList.remove('shake'), 500);
    const err = document.getElementById('err-room');
    if (err) err.classList.add('show');
    if (!firstProblem) firstProblem = roomInput;
  }

  if (!workInput.value.trim()) {
    const err = document.getElementById('err-work');
    if (err) err.classList.add('show');
    if (!firstProblem) firstProblem = workInput;
  }

  if (firstProblem) {
    show('⚠️ Заполните поля записи', 'err');
    if (firstProblem.focus) firstProblem.focus();
    if (firstProblem.scrollIntoView) {
      firstProblem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return false;
  }
  return true;
}

function isNameValid(value) {
  const v = value.trim();
  return /^[А-ЯЁA-Z][а-яёa-z]+(?:-[А-ЯЁA-Z][а-яёa-z]+)?\s+[А-ЯЁA-Z][а-яёa-z]+(?:-[А-ЯЁA-Z][а-яёa-z]+)?$/.test(v);
}

// ============================================
//  ДОБАВИТЬ В ЖУРНАЛ
// ============================================
function addToJournal() {
  if (!validateHeader()) return;
  if (!validateCurrentEntry()) return;

  const entry = {
    room: roomInput.value.trim(),
    room_none: floorInput.value === 'Нет',
    work: workInput.value,
    materialValues: Object.assign({}, materialValues)
  };

  journal.push(entry);
  renderJournal();

  resetCurrentEntry();
  showToast('Запись добавлена в журнал');
}

// ============================================
//  ОБРАБОТЧИКИ
// ============================================
objectSelect.addEventListener('change', () => {
  rebuildFloors();
  updateRoomState();
  updateFieldState(objectSelect);
});

floorInput.addEventListener('change', () => {
  if (floorInput.value !== 'Нет' && roomInput.value === 'Нет') {
    roomInput.value = '';
  }
  updateRoomState();
  updateFieldState(floorInput);
});

workInput.addEventListener('change', () => {
  updateFieldState(workInput);
});

// ============================================
//  ФОРМАТИРОВАНИЕ ПОМЕЩЕНИЯ
// ============================================
function formatRoom(value) {
  let cleaned = value.replace(/[^0-9\s]/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ');
  const parts = cleaned.split(' ').filter(p => p !== '');
  let result = parts.join(', ');
  if (cleaned.endsWith(' ') && parts.length > 0) result += ', ';
  return result;
}

roomInput.addEventListener('input', () => {
  if (roomInput.disabled) return;
  const before = roomInput.value;
  const after = formatRoom(before);
  if (before !== after) {
    roomInput.value = after;
    roomInput.setSelectionRange(after.length, after.length);
  }
  updateFieldState(roomInput);
});

// ============================================
//  ФОРМАТ ИМЕНИ
// ============================================
function formatName(value) {
  let cleaned = value.replace(/[^А-Яа-яЁёA-Za-z\s-]/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/-+/g, '-');
  cleaned = cleaned.replace(/\s-|-\s/g, '-');
  cleaned = cleaned.replace(/(^|\s|-)([а-яёa-z])/g,
                            (m, p1, p2) => p1 + p2.toUpperCase());
  const parts = cleaned.split(' ');
  if (parts.length > 2) cleaned = parts.slice(0, 2).join(' ');
  return cleaned;
}

nameInput.addEventListener('input', () => {
  const before = nameInput.value;
  const pos = nameInput.selectionStart;
  const after = formatName(before);
  if (before !== after) {
    nameInput.value = after;
    const delta = before.length - after.length;
    const newPos = Math.max(0, Math.min(after.length, pos - delta));
    nameInput.setSelectionRange(newPos, newPos);
  }
  if (isNameValid(nameInput.value)) {
    nameErr.classList.remove('show');
    nameInput.classList.remove('is-invalid');
  }
  updateFieldState(nameInput);
});

nameInput.addEventListener('blur', () => {
  const v = nameInput.value.trim();
  if (v && !isNameValid(v)) {
    nameErr.textContent = 'Введите Имя и Фамилию — ровно 2 слова (например: Иван Иванов)';
    nameErr.classList.add('show');
    nameInput.classList.add('is-invalid');
  } else {
    nameErr.classList.remove('show');
    nameInput.classList.remove('is-invalid');
  }
});

// ============================================
//  ПОДСВЕТКА ПОЛЕЙ
// ============================================
function updateFieldState(el) {
  const wrap = el.closest && (el.closest('.cselect') || el.closest('.segmented'));
  if (wrap) {
    if (el.disabled) {
      wrap.classList.remove('is-empty', 'is-filled');
      return;
    }
    wrap.classList.remove('is-empty', 'is-filled');
    const isEmpty = !el.value || !el.value.trim();
    wrap.classList.toggle('is-empty', isEmpty);
    wrap.classList.toggle('is-filled', !isEmpty);
    return;
  }

  if (!el.classList.contains('req-field')) return;
  if (el.disabled) {
    el.classList.remove('is-empty', 'is-filled', 'is-invalid');
    return;
  }
  const isEmpty = !el.value || !el.value.trim();
  el.classList.toggle('is-empty', isEmpty);
  el.classList.toggle('is-filled', !isEmpty);
}

['date', 'name', 'object', 'floor', 'work', 'room'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  updateFieldState(el);
  el.addEventListener('input', () => updateFieldState(el));
  el.addEventListener('change', () => {
    updateFieldState(el);
    if (el.value.trim()) {
      const err = document.getElementById('err-' + id);
      if (err) err.classList.remove('show');
    }
  });
});

// ============================================
//  ОТПРАВКА
// ============================================
async function sendAll() {
  show('');

  if (!validateHeader()) return;

  const roomFilled = roomInput.value.trim() && roomInput.value.trim() !== 'Нет';
  const workFilled = workInput.value.trim();
  const currentFilled = roomFilled || workFilled;

  if (currentFilled) {
    const doAdd = confirm('В форме есть незанесённые в журнал данные. Добавить их в журнал перед отправкой?');
    if (doAdd) {
      if (!validateCurrentEntry()) return;
      const entry = {
        room: roomInput.value.trim(),
        room_none: floorInput.value === 'Нет',
        work: workInput.value,
        materialValues: Object.assign({}, materialValues)
      };
      journal.push(entry);
      renderJournal();
      resetCurrentEntry();
    }
  }

  if (journal.length === 0) {
    show('⚠️ Журнал пуст. Добавьте хотя бы одну запись.', 'err');
    return;
  }

  const records = journal.map(entry => ({
    room: entry.room_none ? 'Нет' : entry.room,
    room_none: entry.room_none,
    work: entry.work,
    materials: materialValuesToArray(entry.materialValues)
  }));

  const payload = {
    object:  objectSelect.value.trim(),
    date:    dateInput.value.trim(),
    name:    nameInput.value.trim(),
    floor:   floorInput.value.trim(),
    records: records
  };

  const btn = document.getElementById('btn');
  btn.disabled = true;
  btn.textContent = 'Отправляем...';

  try {
    await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    show('✅ Отчет отправлен! Записей: ' + records.length, 'ok');

    journal.length = 0;
    renderJournal();
    resetCurrentEntry();

    setupDateRange();
    dateInput.value = toISODate(new Date());
    updateDateHighlight();
  } catch (e) {
    show('❌ Ошибка: ' + e.message, 'err');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Отправить отчет';
  }
}

// ============================================
//  СТАРТ
// ============================================
rebuildFloors();
updateRoomState();
renderMaterials();
renderJournal();

window.addToJournal = addToJournal;
window.sendAll = sendAll;
