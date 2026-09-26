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
//  КНОПКА «ВВЕРХ»
// ============================================
(function initScrollTop() {
  const btn = document.getElementById('scroll-top');
  if (!btn) return;

  function update() {
    if (window.scrollY > 300) btn.classList.add('show');
    else btn.classList.remove('show');
  }

  window.addEventListener('scroll', update, { passive: true });
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  update();
})();

// ============================================
//  НАСТРОЙКИ
// ============================================
const API_URL = 'https://script.google.com/macros/s/AKfycbw6i5ZyPzjWSkYB8PTACDnFcMFbXxDCDLK137pU6pCCMS4B92dXYtms1qmJN5mWQ-za/exec';

const FLOORS_BY_OBJECT = {
  'Ларинская гимназия': ['1', '2', '3', 'Нет'],
  'ЖЕДЕПОМ':            ['Подвал', '1', '2', '3', 'Чердак', 'Нет']
};

const FLOORS_OVERRIDE_BY_BUILDING = {
  'Крыло мастерских': ['1', '2', 'Нет']
};

const BUILDINGS_BY_OBJECT = {
  'Ларинская гимназия': ['Основное здание', 'Крыло мастерских', 'Чердак']
};

const BUILDING_ORDER = ['Основное здание', 'Крыло мастерских', 'Чердак'];

const MASTER_WING = 'Крыло мастерских';
const MASTER_WING_PREFIX = 'к';
const ATTIC = 'Чердак';

const WORK_WITH_MATERIALS = ['Монтаж', 'Демонтаж'];

const MATERIALS = [
  {
    id: 'cable',
    label: 'Кабель КПСЭнг(A)FRHF 1x2x',
    unit: 'м',
    rows: [
      { key: 'cable_075_aps',  variant: 'х0,75', system: 'АПС' },
      { key: 'cable_075_soue', variant: 'х0,75', system: 'СОУЭ' },
      { key: 'cable_1_soue',   variant: 'х1',    system: 'СОУЭ' }
    ]
  },
  {
    id: 'channel',
    label: 'Кабель-канал',
    unit: 'м',
    rows: [
      { key: 'channel_40x25_aps',  variant: '40х25', system: 'АПС',  primary: true },
      { key: 'channel_40x25_soue', variant: '40х25', system: 'СОУЭ', primary: true },
      { key: 'channel_25x16_aps',  variant: '25х16', system: 'АПС' },
      { key: 'channel_25x16_soue', variant: '25х16', system: 'СОУЭ' }
    ]
  },
  {
    id: 'corrugated',
    label: 'Труба гофрированная d=',
    unit: 'м',
    rows: [
      { key: 'corrugated_20_aps',  variant: '20 мм', system: 'АПС',  primary: true },
      { key: 'corrugated_20_soue', variant: '20 мм', system: 'СОУЭ', primary: true },
      { key: 'corrugated_16_aps',  variant: '16 мм', system: 'АПС' },
      { key: 'corrugated_16_soue', variant: '16 мм', system: 'СОУЭ' }
    ]
  },
  {
    id: 'steel',
    label: 'Труба стальная ВГП ДУ d=',
    unit: 'м',
    rows: [
      { key: 'steel_15_aps',  variant: '15 мм', system: 'АПС',  primary: true },
      { key: 'steel_15_soue', variant: '15 мм', system: 'СОУЭ', primary: true },
      { key: 'steel_20_aps',  variant: '20 мм', system: 'АПС' },
      { key: 'steel_20_soue', variant: '20 мм', system: 'СОУЭ' }
    ]
  }
];

let materialState = {};

function initMaterialState() {
  materialState = {};
  MATERIALS.forEach(mat => {
    mat.rows.forEach(r => {
      materialState[r.key] = '';
    });
  });
}

const journal = [];

// ============================================
//  АКТИВНОСТЬ КНОПКИ «ОТПРАВИТЬ ОТЧЕТ»
// ============================================
function updateSendButton() {
  const btn = document.getElementById('btn');
  if (!btn) return;
  btn.disabled = journal.length === 0;
}

// ============================================
//  ФОРМАТИРОВАНИЕ КОЛИЧЕСТВА
// ============================================
function formatQty(raw) {
  let s = String(raw == null ? '' : raw).replace(/[^0-9.,]/g, '');
  s = s.replace(/\./g, ',');

  const firstComma = s.indexOf(',');
  if (firstComma !== -1) {
    s = s.slice(0, firstComma + 1) + s.slice(firstComma + 1).replace(/,/g, '');
  }

  const parts = s.split(',');
  let intPart = parts[0] || '';
  let fracPart = parts.length > 1 ? parts[1] : null;

  if (intPart.length > 1 && intPart.charAt(0) === '0') {
    const extra = intPart.slice(1);
    intPart = '0';
    fracPart = extra + (fracPart || '');
  }

  if (intPart.length > 4) intPart = intPart.slice(0, 4);
  if (fracPart !== null && fracPart.length > 2) fracPart = fracPart.slice(0, 2);

  if (fracPart !== null) return intPart + ',' + fracPart;
  return intPart;
}

// ============================================
//  СУММИРОВАНИЕ
// ============================================
function sumMaterialStates(a, b) {
  const result = Object.assign({}, a);
  Object.keys(b).forEach(key => {
    const av = String(result[key] || '').trim();
    const bv = String(b[key] || '').trim();
    if (!av && !bv) return;

    const an = av ? parseFloat(av.replace(',', '.')) : 0;
    const bn = bv ? parseFloat(bv.replace(',', '.')) : 0;
    const sum = (isFinite(an) ? an : 0) + (isFinite(bn) ? bn : 0);

    if (sum <= 0) {
      result[key] = '';
    } else {
      const rounded = Math.round(sum * 100) / 100;
      result[key] = String(rounded).replace('.', ',');
    }
  });
  return result;
}

// ============================================
//  СОРТИРОВКА
// ============================================
function floorWeight(floor) {
  const w = {
    'Подвал': -1,
    '1': 1,
    '2': 2,
    '3': 3,
    'Чердак': 100,
    'Нет': 1000
  };
  return (floor in w) ? w[floor] : 500;
}

function roomWeight(room) {
  if (!room || room === 'Нет') return 1000000;
  const num = parseInt(String(room).replace(/^к/, ''), 10);
  return isFinite(num) ? num : 999999;
}

function compareEntries(a, b) {
  const fa = floorWeight(a.floor);
  const fb = floorWeight(b.floor);
  if (fa !== fb) return fa - fb;

  const ra = roomWeight(a.room);
  const rb = roomWeight(b.room);
  if (ra !== rb) return ra - rb;

  const ka = a.is_master_wing ? 1 : 0;
  const kb = b.is_master_wing ? 1 : 0;
  if (ka !== kb) return ka - kb;

  return String(a.work || '').localeCompare(String(b.work || ''));
}

// ============================================
//  ФОРМАТ ЗАГОЛОВКА ЗАПИСИ
// ============================================
function formatFloorLabel(floor) {
  if (!floor) return '';
  if (floor === 'Нет') return 'Без этажа';
  if (floor === 'Подвал') return 'Подвал';
  if (floor === 'Чердак') return 'Чердак';
  return floor + ' этаж';
}

function formatJournalTitle(entry) {
  const floorLabel = formatFloorLabel(entry.floor);
  let roomLabel;
  if (entry.room_none) {
    roomLabel = 'без помещения';
  } else {
    roomLabel = 'пом. ' + (entry.is_master_wing ? MASTER_WING_PREFIX : '') + entry.room;
  }
  if (!floorLabel) {
    return roomLabel.charAt(0).toUpperCase() + roomLabel.slice(1);
  }
  return floorLabel + ' · ' + roomLabel;
}

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
//  ПРОГРЕСС
// ============================================
function showProgress(total) {
  const o = document.getElementById('progress-overlay');
  const c = document.getElementById('progress-counter');
  if (!o || !c) return;
  c.textContent = '0 из ' + total;
  o.classList.add('show');
}

function updateProgress(done, total) {
  const c = document.getElementById('progress-counter');
  if (c) c.textContent = done + ' из ' + total;
}

function hideProgress() {
  const o = document.getElementById('progress-overlay');
  if (o) o.classList.remove('show');
}

// ============================================
//  ЭТАЖИ ПО КОРПУСУ
// ============================================
function getFloorsFor(object, building) {
  if (building && FLOORS_OVERRIDE_BY_BUILDING[building]) {
    return FLOORS_OVERRIDE_BY_BUILDING[building];
  }
  return FLOORS_BY_OBJECT[object] || null;
}

// ============================================
//  КАСТОМНЫЙ SELECT
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

initSegmented('object-segmented',   'object',   { allowDeselect: false });
initSegmented('building-segmented', 'building', { allowDeselect: false });
initSegmented('work-segmented',     'work',     { allowDeselect: false });

// ============================================
//  ЭЛЕМЕНТЫ
// ============================================
const objectSelect     = document.getElementById('object');
const buildingInput    = document.getElementById('building');
const buildingSeg      = document.getElementById('building-segmented');
const buildingSection  = document.getElementById('building-section');
const floorInput       = document.getElementById('floor');
const floorCS          = customSelects.floor;
const floorCol         = document.getElementById('floor-col');
const roomInput        = document.getElementById('room');
const roomPrefix       = document.getElementById('room-prefix');
const nameInput        = document.getElementById('name');
const nameErr          = document.getElementById('err-name');
const workInput        = document.getElementById('work');
const journalCont      = document.getElementById('journal-container');
const journalEmpty     = document.getElementById('journal-empty');
const journalCount     = document.getElementById('journal-count');
const materialsSection = document.getElementById('materials-section');
const objectSeg        = document.getElementById('object-segmented');
const workSeg          = document.getElementById('work-segmented');

// ============================================
//  КНОПКА ОЧИСТКИ
// ============================================
function attachClearButton(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (!input || !btn) return;

  function update() {
    const show = !!input.value && !input.disabled;
    btn.style.display = show ? 'inline-flex' : 'none';
  }

  input.addEventListener('input', update);
  input.addEventListener('change', update);

  btn.addEventListener('click', () => {
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.focus();
    update();
  });

  update();
  input._updateClearBtn = update;
}

attachClearButton('name', 'clear-name');
attachClearButton('room', 'clear-room');

// ============================================
//  ВАЛИДНОСТЬ ИМЕНИ
// ============================================
function isNameValid(value) {
  const v = value.trim();
  return /^[А-ЯЁA-Z][а-яёa-z]+(?:-[А-ЯЁA-Z][а-яёa-z]+)?\s+[А-ЯЁA-Z][а-яёa-z]+(?:-[А-ЯЁA-Z][а-яёa-z]+)?$/.test(v);
}

// ============================================
//  КОРПУС
// ============================================
function isBuildingRequired() {
  return !!BUILDINGS_BY_OBJECT[objectSelect.value];
}

function isMasterWing() {
  return buildingInput.value === MASTER_WING;
}

function isAttic() {
  return buildingInput.value === ATTIC;
}

function updateBuildingVisibility() {
  const required = isBuildingRequired();

  if (required) {
    buildingSection.style.display = 'block';
  } else {
    buildingSection.style.display = 'none';
    if (buildingInput.value) {
      buildingInput.value = '';
      if (buildingInput._updateSegmentedDisplay) buildingInput._updateSegmentedDisplay();
    }
  }

  updateFloorVisibility();
  updateRoomPrefix();
}

function updateBuildingAccessibility() {
  if (!isBuildingRequired()) return;

  const nameOk   = isNameValid(nameInput.value);
  const objectOk = !!objectSelect.value;
  const hint     = buildingSeg.querySelector('.segmented-hint');

  if (!nameOk || !objectOk) {
    buildingSeg.classList.add('segmented-disabled');
    if (hint) {
      hint.textContent = nameOk ? '🔒 Сначала объект' : '🔒 Введите имя';
    }
  } else {
    buildingSeg.classList.remove('segmented-disabled');
  }
}

// ============================================
//  ВИДИМОСТЬ ЭТАЖА
// ============================================
function updateFloorVisibility() {
  if (!floorCol) return;

  if (isAttic()) {
    floorCol.style.display = 'none';
    floorInput.value = ATTIC;
  } else {
    floorCol.style.display = '';
    if (floorInput.value === ATTIC) {
      floorInput.value = '';
      if (floorCS) floorCS.value = '';
    }
  }
}

// ============================================
//  ПРЕФИКС «к»
// ============================================
function updateRoomPrefix() {
  if (!roomPrefix) return;
  const active = isMasterWing() && floorInput.value && floorInput.value !== 'Нет';
  roomPrefix.style.display = active ? 'inline-flex' : 'none';
}

// ============================================
//  ДОСТУПНОСТЬ ТИПА РАБОТ
// ============================================
function updateWorkAccessibility() {
  const nameOk   = isNameValid(nameInput.value);
  const objOk    = !!objectSelect.value;
  const buildOk  = !isBuildingRequired() || !!buildingInput.value;
  const floorOk  = isAttic() || !!floorInput.value;
  const roomOk   = !!roomInput.value.trim() || floorInput.value === 'Нет';
  const workOk   = nameOk && objOk && buildOk && floorOk && roomOk;

  const hint = workSeg.querySelector('.segmented-hint');

  if (!workOk) {
    workSeg.classList.add('segmented-disabled');
    if (hint) {
      hint.textContent = nameOk
        ? '🔒 Заполните поля выше'
        : '🔒 Введите имя';
    }
  } else {
    workSeg.classList.remove('segmented-disabled');
  }

  updateMaterialsVisibility();
}

// ============================================
//  ПОЛНЫЙ ПЕРЕСЧЁТ
// ============================================
function updateFormAccessibility() {
  const nameOk = isNameValid(nameInput.value);

  dateInput.disabled = !nameOk;

  const objHint = objectSeg.querySelector('.segmented-hint');
  if (!nameOk) {
    objectSeg.classList.add('segmented-disabled');
    if (objHint) objHint.textContent = '🔒 Введите имя';
  } else {
    objectSeg.classList.remove('segmented-disabled');
  }

  updateBuildingVisibility();
  updateBuildingAccessibility();

  rebuildFloors();
  updateRoomState();

  updateWorkAccessibility();
}

// ============================================
//  ЭТАЖИ
// ============================================
function rebuildFloors() {
  const nameOk = isNameValid(nameInput.value);
  const obj    = objectSelect.value;
  const build  = buildingInput.value;
  const floors = getFloorsFor(obj, build);

  if (isAttic()) {
    floorCS.setOptions([]);
    floorCS.disabled = true;
    floorInput.value = ATTIC;
    return;
  }

  if (!nameOk) {
    floorCS.placeholder = '🔒 Имя';
    floorCS.disabled = true;
    return;
  }

  if (!obj || !floors) {
    floorCS.setOptions([]);
    floorCS.placeholder = '🔒 Объект';
    floorCS.disabled = true;
    return;
  }

  if (isBuildingRequired() && !build) {
    floorCS.setOptions([]);
    floorCS.placeholder = '🔒 Корпус';
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
  const nameOk   = isNameValid(nameInput.value);
  const floorVal = floorInput.value;

  roomInput.classList.remove('is-empty', 'is-filled', 'is-invalid');

  if (!nameOk) {
    roomInput.disabled = true;
    roomInput.placeholder = '🔒 Имя';
    updateRoomPrefix();
    if (roomInput._updateClearBtn) roomInput._updateClearBtn();
    return;
  }

  if (isAttic()) {
    roomInput.disabled = false;
    roomInput.placeholder = '1234';
    updateFieldState(roomInput);
    updateRoomPrefix();
    if (roomInput._updateClearBtn) roomInput._updateClearBtn();
    return;
  }

  if (!floorVal) {
    roomInput.disabled = true;
    roomInput.placeholder = '🔒 Этаж';
    updateRoomPrefix();
    if (roomInput._updateClearBtn) roomInput._updateClearBtn();
    return;
  }

  if (floorVal === 'Нет') {
    roomInput.value = 'Нет';
    roomInput.disabled = true;
    roomInput.placeholder = '';
    updateRoomPrefix();
    if (roomInput._updateClearBtn) roomInput._updateClearBtn();
    return;
  }

  roomInput.disabled = false;
  roomInput.placeholder = '1234';
  updateFieldState(roomInput);
  updateRoomPrefix();
  if (roomInput._updateClearBtn) roomInput._updateClearBtn();
}

// ============================================
//  ВИДИМОСТЬ МАТЕРИАЛОВ
// ============================================
function isWorkWithMaterials() {
  return WORK_WITH_MATERIALS.indexOf(workInput.value) !== -1;
}

function updateMaterialsVisibility() {
  if (!materialsSection) return;
  const workSegDisabled = workSeg.classList.contains('segmented-disabled');
  materialsSection.style.display =
    (isWorkWithMaterials() && !workSegDisabled) ? 'block' : 'none';
}

// ============================================
//  РАБОТА С ЧИСЛОМ
// ============================================
function parseQty(raw) {
  const s = String(raw || '').trim();
  if (!s) return 0;
  const n = parseFloat(s.replace(',', '.'));
  return isFinite(n) ? n : 0;
}

function updateMinusState(input, minusBtn) {
  const num = parseQty(input.value);
  minusBtn.disabled = num <= 0;
}

function bumpQty(input, key, delta, clearBtn, minusBtn) {
  const num = parseQty(input.value);
  let next = num + delta;
  if (next < 0) next = 0;

  const formatted = next === 0 ? '' : formatQty(String(next).replace('.', ','));

  input.value = formatted;
  materialState[key] = formatted;
  clearBtn.style.display = formatted ? 'inline-flex' : 'none';
  updateMinusState(input, minusBtn);
}

// ============================================
//  РЕНДЕР МАТЕРИАЛОВ
// ============================================
function renderMaterials() {
  const container = document.getElementById('materials-container');
  if (!container) return;

  const active = document.activeElement;
  const focusId = active && active.dataset ? active.dataset.focusId : null;
  const selStart = active && typeof active.selectionStart === 'number' ? active.selectionStart : null;

  container.innerHTML = '';

  MATERIALS.forEach(mat => {
    const group = document.createElement('div');
    group.className = 'material-group';

    const nameEl = document.createElement('div');
    nameEl.className = 'material-group-name';
    nameEl.textContent = mat.label;
    group.appendChild(nameEl);

    const variantsWrap = document.createElement('div');
    variantsWrap.className = 'material-variants';
    group.appendChild(variantsWrap);

    mat.rows.forEach(r => {
      const line = document.createElement('div');
      line.className = 'variant-line';

      const badge = document.createElement('span');
      badge.className = 'variant-badge' + (r.primary ? ' primary' : '');
      badge.textContent = r.variant;
      line.appendChild(badge);

      const forEl = document.createElement('span');
      forEl.className = 'variant-for';
      forEl.textContent = 'для';
      line.appendChild(forEl);

      const sysEl = document.createElement('span');
      sysEl.className = 'variant-system';
      sysEl.textContent = r.system;
      line.appendChild(sysEl);

      const minusBtn = document.createElement('button');
      minusBtn.type = 'button';
      minusBtn.className = 'qty-btn qty-btn-minus';
      minusBtn.textContent = '−';
      minusBtn.title = 'Уменьшить на 1';
      line.appendChild(minusBtn);

      const input = document.createElement('input');
      input.type = 'text';
      input.inputMode = 'decimal';
      input.className = 'variant-input';
      input.dataset.focusId = r.key;
      input.placeholder = '0';
      input.autocomplete = 'off';
      input.value = materialState[r.key] || '';

      line.appendChild(input);

      const plusBtn = document.createElement('button');
      plusBtn.type = 'button';
      plusBtn.className = 'qty-btn qty-btn-plus';
      plusBtn.textContent = '+';
      plusBtn.title = 'Увеличить на 1';
      line.appendChild(plusBtn);

      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'variant-clear-btn';
      clearBtn.textContent = '×';
      clearBtn.title = 'Очистить';
      clearBtn.style.display = input.value ? 'inline-flex' : 'none';
      line.appendChild(clearBtn);

      const unit = document.createElement('span');
      unit.className = 'variant-unit';
      unit.textContent = mat.unit;
      line.appendChild(unit);

      input.addEventListener('input', () => {
        const before = input.value;
        const after = formatQty(before);
        if (before !== after) {
          input.value = after;
          input.setSelectionRange(after.length, after.length);
        }
        materialState[r.key] = input.value;
        clearBtn.style.display = input.value ? 'inline-flex' : 'none';
        updateMinusState(input, minusBtn);
      });

      minusBtn.addEventListener('click', () => {
        bumpQty(input, r.key, -1, clearBtn, minusBtn);
      });

      plusBtn.addEventListener('click', () => {
        bumpQty(input, r.key, 1, clearBtn, minusBtn);
      });

      clearBtn.addEventListener('click', () => {
        input.value = '';
        materialState[r.key] = '';
        clearBtn.style.display = 'none';
        updateMinusState(input, minusBtn);
        input.focus();
      });

      updateMinusState(input, minusBtn);

      variantsWrap.appendChild(line);
    });

    container.appendChild(group);
  });

  if (focusId) {
    const el = container.querySelector('[data-focus-id="' + focusId + '"]');
    if (el) {
      el.focus();
      if (selStart !== null && el.setSelectionRange) {
        const pos = Math.min(selStart, el.value.length);
        el.setSelectionRange(pos, pos);
      }
    }
  }
}

// ============================================
//  МАТЕРИАЛЫ → МАССИВ
// ============================================
function materialStateToArrayFromState(state) {
  const list = [];
  MATERIALS.forEach(mat => {
    mat.rows.forEach(r => {
      const raw = (state[r.key] || '').trim();
      if (!raw) return;
      const num = parseFloat(raw.replace(',', '.'));
      if (!isFinite(num) || num <= 0) return;
      list.push({
        name: mat.label + ' ' + r.variant,
        unit: mat.unit,
        qty: raw.replace(',', '.'),
        system: r.system
      });
    });
  });
  return list;
}

// ============================================
//  СБРОС ТЕКУЩЕЙ ЗАПИСИ
// ============================================
function resetCurrentEntry() {
  initMaterialState();
  renderMaterials();

  workInput.value = '';
  if (workInput._updateSegmentedDisplay) workInput._updateSegmentedDisplay();

  roomInput.value = '';
  updateFieldState(roomInput);
  roomInput.classList.remove('is-empty', 'is-filled', 'is-invalid');

  ['err-room', 'err-work'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });

  updateRoomState();
  updateWorkAccessibility();
}

// ============================================
//  ЖУРНАЛ — РЕНДЕР
// ============================================
function renderJournal() {
  journalCount.textContent = journal.length > 0 ? '(' + journal.length + ')' : '';

  updateSendButton();

  if (journal.length === 0) {
    journalCont.innerHTML = '';
    journalEmpty.style.display = 'block';
    return;
  }

  journalEmpty.style.display = 'none';
  journalCont.innerHTML = '';

  const sorted = journal.slice().sort(compareEntries);

  const groups = {};
  sorted.forEach(entry => {
    const key = entry.building || '';
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  });

  const keys = Object.keys(groups).sort((a, b) => {
    const ia = BUILDING_ORDER.indexOf(a);
    const ib = BUILDING_ORDER.indexOf(b);
    const wa = ia === -1 ? 999 : ia;
    const wb = ib === -1 ? 999 : ib;
    if (wa !== wb) return wa - wb;
    return a.localeCompare(b);
  });

  keys.forEach(key => {
    if (key) {
      const titleEl = document.createElement('div');
      titleEl.className = 'journal-building-title';
      titleEl.textContent = key;
      journalCont.appendChild(titleEl);
    }

    groups[key].forEach(entry => {
      const realIdx = journal.indexOf(entry);

      const el = document.createElement('div');
      el.className = 'journal-entry';

      const header = document.createElement('div');
      header.className = 'journal-entry-header';

      const title = document.createElement('div');
      title.className = 'journal-entry-title';
      title.textContent = formatJournalTitle(entry);
      header.appendChild(title);

      const actions = document.createElement('div');
      actions.className = 'journal-entry-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'journal-btn journal-btn-edit';
      editBtn.title = 'Изменить';
      editBtn.textContent = '✏️';
      editBtn.addEventListener('click', () => editJournalEntry(realIdx));
      actions.appendChild(editBtn);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'journal-btn journal-btn-del';
      delBtn.title = 'Удалить';
      delBtn.textContent = '🗑';
      delBtn.addEventListener('click', () => removeJournalEntry(realIdx));
      actions.appendChild(delBtn);

      header.appendChild(actions);
      el.appendChild(header);

      const meta = document.createElement('div');
      meta.className = 'journal-entry-meta';
      meta.textContent = entry.work;
      el.appendChild(meta);

      const matsArr = materialStateToArrayFromState(entry.materialState);
      if (matsArr.length > 0) {
        const mats = document.createElement('div');
        mats.className = 'journal-entry-materials';
        matsArr.forEach(m => {
          const row = document.createElement('div');
          row.className = 'journal-entry-mat';
          const sysLabel = m.system ? ' · ' + escapeHtml(m.system) : '';
          row.innerHTML =
            '<span class="jm-name">' + escapeHtml(m.name) + sysLabel + '</span>' +
            '<span class="jm-qty">' + escapeHtml(m.qty.replace('.', ',')) + ' ' + escapeHtml(m.unit) + '</span>';
          mats.appendChild(row);
        });
        el.appendChild(mats);
      }

      journalCont.appendChild(el);
    });
  });
}

// ============================================
//  ЖУРНАЛ — РЕДАКТИРОВАНИЕ
// ============================================
function editJournalEntry(idx) {
  const entry = journal[idx];
  if (!entry) return;

  journal.splice(idx, 1);
  renderJournal();

  if (isBuildingRequired() && entry.building) {
    buildingInput.value = entry.building;
    if (buildingInput._updateSegmentedDisplay) buildingInput._updateSegmentedDisplay();
    updateFloorVisibility();
    updateRoomPrefix();
  }

  if (entry.floor) {
    floorInput.value = entry.floor;
    if (floorCS) {
      const obj = objectSelect.value;
      const build = buildingInput.value;
      const floors = getFloorsFor(obj, build);
      if (floors) {
        floorCS.setOptions(floors);
        floorCS.disabled = false;
        floorCS.value = entry.floor;
      }
    }
  }

  workInput.value = entry.work;
  if (workInput._updateSegmentedDisplay) workInput._updateSegmentedDisplay();

  materialState = Object.assign({}, entry.materialState);
  renderMaterials();

  roomInput.value = entry.room;
  updateFieldState(roomInput);

  const card = document.getElementById('entry-card');
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });

  updateRoomState();
  updateWorkAccessibility();
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

  ['err-date', 'err-object', 'err-floor', 'err-building'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });
  nameErr.classList.remove('show');
  nameInput.classList.remove('is-invalid');

  if (!isNameValid(nameInput.value)) {
    nameErr.textContent = nameInput.value.trim()
      ? 'Введите Имя и Фамилию — ровно 2 слова (например: Василий Пупкин)'
      : 'Введите Имя и Фамилию — ровно 2 слова';
    nameErr.classList.add('show');
    nameInput.classList.add('is-invalid');
    if (!firstProblem) firstProblem = nameInput;
  }

  if (!objectSelect.value.trim()) {
    const err = document.getElementById('err-object');
    if (err) err.classList.add('show');
    if (!firstProblem) firstProblem = objectSelect;
  }

  if (isBuildingRequired() && !buildingInput.value.trim()) {
    const err = document.getElementById('err-building');
    if (err) err.classList.add('show');
    if (!firstProblem) firstProblem = buildingInput;
  }

  if (!isAttic() && !floorInput.value.trim()) {
    const err = document.getElementById('err-floor');
    if (err) err.classList.add('show');
    if (!firstProblem) firstProblem = floorInput;
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

// ============================================
//  ПОИСК ДЛЯ СЛИЯНИЯ
// ============================================
function findMergeIndex(newEntry) {
  return journal.findIndex(e =>
    e.floor === newEntry.floor &&
    e.room === newEntry.room &&
    !!e.room_none === !!newEntry.room_none &&
    !!e.is_master_wing === !!newEntry.is_master_wing &&
    (e.building || '') === (newEntry.building || '') &&
    e.work === newEntry.work
  );
}

// ============================================
//  ДОБАВИТЬ В ЖУРНАЛ
// ============================================
function addToJournal() {
  if (!validateHeader()) return;
  if (!validateCurrentEntry()) return;

  const withMaterials = isWorkWithMaterials();

  const entry = {
    room: roomInput.value.trim(),
    room_none: floorInput.value === 'Нет',
    is_master_wing: isMasterWing(),
    building: buildingInput.value.trim(),
    floor: floorInput.value.trim(),
    work: workInput.value,
    materialState: withMaterials ? Object.assign({}, materialState) : {}
  };

  let merged = false;

  if (withMaterials) {
    const idx = findMergeIndex(entry);
    if (idx !== -1) {
      journal[idx].materialState = sumMaterialStates(
        journal[idx].materialState,
        entry.materialState
      );
      merged = true;
    }
  }

  if (!merged) {
    journal.push(entry);
  }

  renderJournal();
  resetCurrentEntry();
  showToast(merged ? 'Позиции объединены с существующей записью' : 'Запись добавлена в журнал');
}

// ============================================
//  ОБРАБОТЧИКИ
// ============================================
objectSelect.addEventListener('change', () => {
  updateBuildingVisibility();
  updateBuildingAccessibility();

  rebuildFloors();
  updateRoomState();
  updateFieldState(objectSelect);
  updateWorkAccessibility();
});

buildingInput.addEventListener('change', () => {
  floorInput.value = '';
  if (floorCS) floorCS.value = '';
  roomInput.value = '';

  updateFieldState(buildingInput);
  updateFloorVisibility();
  updateRoomPrefix();
  rebuildFloors();
  updateRoomState();
  updateWorkAccessibility();
});

floorInput.addEventListener('change', () => {
  if (floorInput.value !== 'Нет' && roomInput.value === 'Нет') {
    roomInput.value = '';
  }
  updateRoomState();
  updateFieldState(floorInput);
  updateWorkAccessibility();
});

workInput.addEventListener('change', () => {
  updateFieldState(workInput);
  updateMaterialsVisibility();
  renderMaterials();
});

// ============================================
//  ФОРМАТ ПОМЕЩЕНИЯ
// ============================================
function formatRoom(value) {
  return value.replace(/[^0-9]/g, '').slice(0, 4);
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
  updateWorkAccessibility();
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
  updateFormAccessibility();
});

nameInput.addEventListener('blur', () => {
  const v = nameInput.value.trim();
  if (v && !isNameValid(v)) {
    nameErr.textContent = 'Введите Имя и Фамилию — ровно 2 слова (например: Василий Пупкин)';
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
    if (el.disabled || wrap.classList.contains('segmented-disabled')) {
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

['date', 'name', 'object', 'building', 'floor', 'work', 'room'].forEach(id => {
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
//  Один запрос — всё гарантированно доходит.
//  Прогресс — визуальная анимация.
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
      addToJournal();
      if (document.getElementById('msg').className === 'err') return;
    }
  }

  if (journal.length === 0) {
    show('⚠️ Журнал пуст. Добавьте хотя бы одну запись.', 'err');
    return;
  }

  // Формируем записи журнала для отправки
  const records = journal.map(entry => {
    let room = entry.room_none ? 'Нет' : entry.room;
    if (!entry.room_none && entry.is_master_wing) {
      room = MASTER_WING_PREFIX + room;
    }
    return {
      room: room,
      room_none: entry.room_none,
      floor: entry.floor,
      work: entry.work,
      materials: materialStateToArrayFromState(entry.materialState)
    };
  });

  const payload = {
    object:  objectSelect.value.trim(),
    date:    dateInput.value.trim(),
    name:    nameInput.value.trim(),
    records: records
  };

  // Считаем общее число строк, которое получится в таблице
  const totalRows = records.reduce((sum, r) =>
    sum + (r.materials.length === 0 ? 1 : r.materials.length), 0);

  const btn = document.getElementById('btn');
  btn.disabled = true;
  btn.textContent = 'Отправляем...';

  showProgress(totalRows);

  // Визуальная анимация прогресса — заполняется по мере ожидания.
  // Реальный запрос один, но пользователю видно, что идёт работа.
  let shown = 0;
  const tickMs = Math.max(60, Math.floor(1800 / totalRows));
  const ticker = setInterval(() => {
    if (shown < totalRows - 1) {
      shown++;
      updateProgress(shown, totalRows);
    }
  }, tickMs);

  try {
    await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    clearInterval(ticker);
    updateProgress(totalRows, totalRows);

    // небольшая пауза, чтобы пользователь увидел 100%
    await new Promise(r => setTimeout(r, 350));

    hideProgress();
    show('✅ Отчет отправлен! Строк: ' + totalRows, 'ok');

    journal.length = 0;
    renderJournal();
    resetCurrentEntry();

    setupDateRange();
    dateInput.value = toISODate(new Date());
    updateDateHighlight();
  } catch (e) {
    clearInterval(ticker);
    hideProgress();
    show('❌ Ошибка: ' + e.message, 'err');
  } finally {
    btn.textContent = 'Отправить отчет';
    updateSendButton();
  }
}

// ============================================
//  СТАРТ
// ============================================
initMaterialState();
updateFormAccessibility();
updateMaterialsVisibility();
renderMaterials();
renderJournal();
updateSendButton();

window.addToJournal = addToJournal;
window.sendAll = sendAll;
