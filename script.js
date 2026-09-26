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
const WORK_ADDITIONAL = 'Другие работы';

const SECTION_ZADELKA = 'Заделка поверхностей';
const SECTION_MENTOR  = 'Наставничество';

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

// ============================================
//  ДРУГИЕ РАБОТЫ — состояние формы
// ============================================
function makeZadelkaItem() {
  return { building: '', floor: '', room: '', value: '' };
}

let additionalState = {
  zadelka: {
    active: false,
    items: [makeZadelkaItem()]
  },
  mentorship: {
    active: false,
    items: [{ name: '', hours: '' }]
  }
};

function initAdditionalState() {
  additionalState = {
    zadelka: {
      active: false,
      items: [makeZadelkaItem()]
    },
    mentorship: {
      active: false,
      items: [{ name: '', hours: '' }]
    }
  };
}

// ============================================
//  ЖУРНАЛ
// ============================================
const journal = [];

// ============================================
//  ЧЕРНОВИК ЖУРНАЛА (localStorage)
// ============================================
const DRAFT_KEY = 'montaj_journal_draft_v1';
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function saveDraft() {
  try {
    if (!journal || journal.length === 0) {
      localStorage.removeItem(DRAFT_KEY);
      return;
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      savedAt: Date.now(),
      entries: journal
    }));
  } catch (e) {
    console.warn('Не удалось сохранить черновик:', e);
  }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray(parsed.entries)) return null;

    if (typeof parsed.savedAt === 'number' &&
        Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }

    const ok = parsed.entries.every(e =>
      e && typeof e === 'object' && typeof e.kind === 'string'
    );
    return ok ? parsed.entries : null;
  } catch (e) {
    console.warn('Не удалось прочитать черновик:', e);
    return null;
  }
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch (_) {}
}

// ============================================
//  АКТИВНОСТЬ КНОПКИ «ОТПРАВИТЬ ОТЧЕТ»
// ============================================
function updateSendButton() {
  const btn = document.getElementById('btn');
  if (!btn) return;

  const offline = isOffline();
  const empty = journal.length === 0;

  btn.disabled = empty || offline;

  if (offline && !empty) {
    btn.textContent = '📵 Нет подключения';
    btn.title = 'Проверьте подключение к интернету';
  } else {
    btn.textContent = 'Отправить отчет';
    btn.title = '';
  }
}

// ============================================
//  ОСНОВНАЯ ЧАСТЬ ЗАПИСИ ЗАПОЛНЕНА ПОЛНОСТЬЮ?
// ============================================
function isMainEntryComplete() {
  const floorOk = isAttic() || !!floorInput.value.trim();
  const roomOk  = !!roomInput.value.trim() || floorInput.value === 'Нет';
  const workOk  = !!workInput.value.trim();
  return floorOk && roomOk && workOk;
}

function hasActiveAdditional() {
  return additionalState.zadelka.active || additionalState.mentorship.active;
}

// ============================================
//  ЭТАЖИ ДЛЯ ЗАДЕЛКИ (по корпусу конкретной строки)
// ============================================
function getZadelkaFloors(building) {
  const obj = objectSelect.value;

  if (!isBuildingRequired()) {
    return FLOORS_BY_OBJECT[obj] || null;
  }
  if (!building) return null;
  if (building === 'Чердак') return null;
  if (FLOORS_OVERRIDE_BY_BUILDING[building]) return FLOORS_OVERRIDE_BY_BUILDING[building];
  return FLOORS_BY_OBJECT[obj] || null;
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
//  МЯГКАЯ ОЧИСТКА ПОМЕЩЕНИЯ ЗАДЕЛКИ ПРИ ВВОДЕ
// ============================================
function sanitizeZadelkaRoomInput(value) {
  let s = String(value == null ? '' : value);
  s = s.replace(/\./g, ' ');
  s = s.replace(/[^0-9\s]/g, '');
  s = s.replace(/\s+/g, ' ');
  s = s.replace(/^\s+/, '');
  return s;
}

// ============================================
//  НОРМАЛИЗАЦИЯ ПОМЕЩЕНИЯ ЗАДЕЛКИ
// ============================================
function normalizeZadelkaRoom(value) {
  let s = String(value == null ? '' : value);
  s = s.replace(/\./g, ' ');
  s = s.replace(/[^0-9\s]/g, '');
  s = s.replace(/\s+/g, ' ').trim();

  const parts = s.split(' ').filter(p => p !== '');
  const set = new Set();

  parts.forEach(p => {
    const n = parseInt(p, 10);
    if (!isFinite(n) || n <= 0) return;
    set.add(n);
  });

  const nums = Array.from(set).sort((a, b) => a - b);
  return nums.join(', ');
}

// ============================================
//  РАЗБОР СПИСКА ПОМЕЩЕНИЙ В ДВЕ ГРУППЫ
// ============================================
function parseRooms(roomStr) {
  const plain = new Set();
  const prefixed = new Set();
  String(roomStr || '').split(',').forEach(part => {
    const s = part.trim();
    if (!s) return;
    const m = s.match(/^([кК]?)(\d+)$/);
    if (!m) return;
    const n = parseInt(m[2], 10);
    if (!isFinite(n) || n <= 0) return;
    if (m[1]) prefixed.add(n);
    else plain.add(n);
  });
  return { plain, prefixed };
}

// ============================================
//  ОБЪЕДИНЕНИЕ ДВУХ СПИСКОВ ПОМЕЩЕНИЙ
// ============================================
function combineRooms(a, b) {
  const pa = parseRooms(a);
  const pb = parseRooms(b);

  const plain = new Set();
  pa.plain.forEach(n => plain.add(n));
  pb.plain.forEach(n => plain.add(n));

  const prefixed = new Set();
  pa.prefixed.forEach(n => prefixed.add(n));
  pb.prefixed.forEach(n => prefixed.add(n));

  const out = []
    .concat(Array.from(plain).sort((x, y) => x - y).map(n => String(n)))
    .concat(Array.from(prefixed).sort((x, y) => x - y).map(n => 'к' + n));

  return out.join(', ');
}

// ============================================
//  ПРИМЕНЕНИЕ ПРЕФИКСА «к» К СПИСКУ ПОМЕЩЕНИЙ
// ============================================
function applyPrefixToRoom(room, building) {
  if (!room) return '';
  if (building !== MASTER_WING) return room;

  return room
    .split(',')
    .map(part => {
      const s = part.trim();
      if (!s) return '';
      if (/^[кК]/.test(s)) return s;
      return MASTER_WING_PREFIX + s;
    })
    .filter(Boolean)
    .join(', ');
}

// ============================================
//  СНЯТИЕ ПРЕФИКСА «к» СО СПИСКА ПОМЕЩЕНИЙ
// ============================================
function stripPrefixFromRoom(room) {
  if (!room) return '';
  return room
    .split(',')
    .map(part => part.trim().replace(/^[кК]/, ''))
    .filter(Boolean)
    .join(', ');
}

// ============================================
//  СУММИРОВАНИЕ МАТЕРИАЛОВ
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
//  ВЕС ТИПА РАБОТ
// ============================================
function workWeight(work) {
  if (work === 'Демонтаж')  return 0;
  if (work === 'Монтаж')    return 1;
  return 99;
}

// ============================================
//  ВЕС СЕКЦИИ ЖУРНАЛА
// ============================================
function sectionWeight(key) {
  if (key === SECTION_ZADELKA) return 900;
  if (key === SECTION_MENTOR)  return 901;
  const i = BUILDING_ORDER.indexOf(key);
  return i === -1 ? 500 : i;
}

// ============================================
//  ВЕС КОРПУСА (для сортировки заделки)
// ============================================
function buildingWeight(b) {
  if (!b) return -1;
  const i = BUILDING_ORDER.indexOf(b);
  return i === -1 ? 500 : i;
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
    '': 900,
    'Нет': 1000
  };
  return (floor in w) ? w[floor] : 500;
}

function roomSortKey(room) {
  if (!room) return 9999999;
  const first = String(room).split(',')[0].trim();
  const m = first.match(/^([кК]?)(\d+)$/);
  if (!m) return 9999999;
  const n = parseInt(m[2], 10);
  if (!isFinite(n)) return 9999999;
  return m[1] ? 1000000 + n : n;
}

function roomWeight(room) {
  return roomSortKey(room);
}

function compareEntries(a, b) {
  const aAdd = (a.kind === 'zadelka' || a.kind === 'mentorship');
  const bAdd = (b.kind === 'zadelka' || b.kind === 'mentorship');
  if (aAdd !== bAdd) return aAdd ? 1 : -1;

  if (aAdd && bAdd) {
    const oa = (a.kind === 'zadelka') ? 0 : 1;
    const ob = (b.kind === 'zadelka') ? 0 : 1;
    if (oa !== ob) return oa - ob;

    if (a.kind === 'zadelka' && b.kind === 'zadelka') {
      const ba = buildingWeight(a.building);
      const bb = buildingWeight(b.building);
      if (ba !== bb) return ba - bb;

      const fa = floorWeight(a.floor);
      const fb = floorWeight(b.floor);
      if (fa !== fb) return fa - fb;

      const ra = roomSortKey(a.room);
      const rb = roomSortKey(b.room);
      if (ra !== rb) return ra - rb;

      return String(a.room).localeCompare(String(b.room));
    }
    if (a.kind === 'mentorship' && b.kind === 'mentorship') {
      return String(a.name).localeCompare(String(b.name));
    }
    return 0;
  }

  const fa = floorWeight(a.floor);
  const fb = floorWeight(b.floor);
  if (fa !== fb) return fa - fb;

  const ra = roomWeight(a.room);
  const rb = roomWeight(b.room);
  if (ra !== rb) return ra - rb;

  const ka = a.is_master_wing ? 1 : 0;
  const kb = b.is_master_wing ? 1 : 0;
  if (ka !== kb) return ka - kb;

  return workWeight(a.work) - workWeight(b.work);
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
  if (entry.kind === 'zadelka') {
    const parts = [];
    const fl = formatFloorLabel(entry.floor);
    if (fl) parts.push(fl);
    if (entry.room) parts.push('пом. ' + entry.room);
    return parts.length ? parts.join(' · ') : 'Без привязки';
  }

  if (entry.kind === 'mentorship') {
    return entry.name || 'Наставничество';
  }

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
//  ПРОВЕРКА СОЕДИНЕНИЯ
// ============================================
function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

async function checkConnection() {
  if (isOffline()) return false;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    const pingUrl = API_URL +
      (API_URL.indexOf('?') === -1 ? '?' : '&') +
      '_ping=' + Date.now();

    await fetch(pingUrl, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal
    });

    clearTimeout(timer);
    return true;
  } catch (_) {
    return false;
  }
}

function setupConnectionWatcher() {
  window.addEventListener('online', () => {
    showToast('✅ Соединение восстановлено');
    updateSendButton();
  });
  window.addEventListener('offline', () => {
    showToast('📵 Нет подключения к интернету');
    updateSendButton();
  });
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
//  ЭТАЖИ (основная часть)
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
const additionalCard   = document.getElementById('additional-card');
const additionalPills  = document.getElementById('additional-pills');
const additionalFields = document.getElementById('additional-fields');

let _zadelkaCustomSelects = [];

function _destroyZadelkaCustomSelects() {
  _zadelkaCustomSelects.forEach(cs => {
    try { cs.destroy(); } catch (_) {}
  });
  _zadelkaCustomSelects = [];
}

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
//  ИМЯ — ВИЗУАЛЬНОЕ СОСТОЯНИЕ (три цвета)
// ============================================
function updateNameVisual(el) {
  if (!el) return;
  el.classList.remove('is-empty', 'is-partial', 'is-filled', 'is-invalid');

  if (el.disabled) return;

  const v = String(el.value || '').trim();
  if (!v) {
    el.classList.add('is-empty');
  } else if (!isNameValid(v)) {
    el.classList.add('is-partial');
  } else {
    el.classList.add('is-filled');
  }
}

// ============================================
//  КОРПУС (основная часть)
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
//  ДОСТУПНОСТЬ ДОПОЛНИТЕЛЬНЫХ РАБОТ
//  Блокируем всю карточку #additional-card,
//  если не заполнены имя и объект.
// ============================================
function updateAdditionalAccessibility() {
  if (!additionalCard) return;

  const nameOk   = isNameValid(nameInput.value);
  const objectOk = !!objectSelect.value;
  const unlocked = nameOk && objectOk;

  if (unlocked) {
    additionalCard.classList.remove('additional-block-disabled');
    return;
  }

  additionalCard.classList.add('additional-block-disabled');

  const hadActive = hasActiveAdditional();
  if (hadActive) {
    additionalState.zadelka.active = false;
    additionalState.zadelka.items = [makeZadelkaItem()];
    additionalState.mentorship.active = false;
    additionalState.mentorship.items = [{ name: '', hours: '' }];
    updateAdditionalPills();
    renderAdditionalFields();
  }
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
  updateAdditionalAccessibility();
}

// ============================================
//  ЭТАЖИ (основная часть)
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
//  ПОМЕЩЕНИЕ (основная часть)
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
function updateMaterialsVisibility() {
  if (!materialsSection) return;
  const workSegDisabled = workSeg.classList.contains('segmented-disabled');
  const isWork = WORK_WITH_MATERIALS.indexOf(workInput.value) !== -1;
  materialsSection.style.display = (isWork && !workSegDisabled) ? 'block' : 'none';
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

function bumpQty(input, setter, delta, clearBtn, minusBtn) {
  const num = parseQty(input.value);
  let next = num + delta;
  if (next < 0) next = 0;

  const formatted = next === 0 ? '' : formatQty(String(next).replace('.', ','));

  input.value = formatted;
  setter(formatted);
  if (clearBtn) clearBtn.style.display = formatted ? 'inline-flex' : 'none';
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
        bumpQty(input, v => { materialState[r.key] = v; }, -1, clearBtn, minusBtn);
      });
      plusBtn.addEventListener('click', () => {
        bumpQty(input, v => { materialState[r.key] = v; }, 1, clearBtn, minusBtn);
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
//  РЕНДЕР ЗАДЕЛКИ — СПИСОК МЕСТ
// ============================================
function renderZadelkaFields(container) {
  const group = document.createElement('div');
  group.className = 'additional-group';

  const name = document.createElement('div');
  name.className = 'additional-group-name';
  name.textContent = SECTION_ZADELKA;
  group.appendChild(name);

  additionalState.zadelka.items.forEach((item, idx) => {
    if (idx > 0) {
      const sep = document.createElement('div');
      sep.className = 'zadelka-separator';
      sep.textContent = 'Место ' + (idx + 1);
      group.appendChild(sep);
    } else if (additionalState.zadelka.items.length > 1) {
      const sep = document.createElement('div');
      sep.className = 'zadelka-separator';
      sep.textContent = 'Место 1';
      group.appendChild(sep);
    }

    if (additionalState.zadelka.items.length > 1) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'zadelka-remove-btn';
      del.textContent = '× удалить место';
      del.addEventListener('click', () => {
        additionalState.zadelka.items.splice(idx, 1);
        renderAdditionalFields();
      });
      group.appendChild(del);
    }

    if (isBuildingRequired()) {
      const bLabel = document.createElement('label');
      bLabel.className = 'req';
      bLabel.innerHTML = 'Корпус <span class="req-star">*</span>';
      group.appendChild(bLabel);

      const bSeg = document.createElement('div');
      bSeg.className = 'segmented';

      BUILDINGS_BY_OBJECT[objectSelect.value].forEach(val => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'segmented-btn';
        btn.dataset.value = val;
        if (item.building === val) btn.classList.add('active');
        btn.textContent = val;
        btn.addEventListener('click', () => {
          item.building = val;
          item.floor = '';
          item.room = '';
          renderAdditionalFields();
        });
        bSeg.appendChild(btn);
      });

      group.appendChild(bSeg);
    }

    const building = item.building;
    let showFloor = true;

    if (isBuildingRequired()) {
      if (!building) showFloor = false;
      else if (building === 'Чердак') showFloor = false;
    }

    if (showFloor) {
      const floorList = getZadelkaFloors(building);

      if (floorList) {
        const fLabel = document.createElement('label');
        fLabel.className = 'req';
        fLabel.innerHTML = 'Этаж <span class="req-star">*</span>';
        group.appendChild(fLabel);

        const fWrap = document.createElement('div');
        fWrap.className = 'cselect';
        fWrap.innerHTML = `
          <input type="hidden" value="">
          <button type="button" class="cselect-btn">
            <span class="cselect-value placeholder">— выберите —</span>
            <span class="cselect-arrow"></span>
          </button>
          <ul class="cselect-list"></ul>
        `;
        group.appendChild(fWrap);

        const cs = new CustomSelect(fWrap);
        cs.setOptions(floorList);
        cs.placeholder = '— выберите —';
        if (item.floor) cs.value = item.floor;

        cs.input.addEventListener('change', () => {
          item.floor = cs.value;
          item.room = '';
          renderAdditionalFields();
        });

        _zadelkaCustomSelects.push(cs);
      }
    }

    const floor = item.floor;
    const isAtticZ = (building === 'Чердак');
    const floorIsNo = (floor === 'Нет');
    const floorChosen = !!floor || isAtticZ;
    const showRoom = floorChosen && !floorIsNo;

    if (showRoom) {
      const rLabel = document.createElement('label');
      rLabel.className = 'req';
      rLabel.innerHTML = 'Помещение <span class="req-star">*</span>';
      group.appendChild(rLabel);

      const rWrap = document.createElement('div');
      rWrap.className = 'room-wrap';

      if (building === MASTER_WING) {
        const prefix = document.createElement('span');
        prefix.className = 'room-prefix';
        prefix.textContent = MASTER_WING_PREFIX;
        prefix.title = 'Все номера автоматически получат префикс «к»';
        rWrap.appendChild(prefix);
      }

      const rInp = document.createElement('input');
      rInp.type = 'text';
      rInp.className = 'req-field';
      rInp.placeholder = '12 15 20';
      rInp.inputMode = 'text';
      rInp.autocomplete = 'off';
      rInp.maxLength = 60;
      rInp.value = item.room || '';
      rInp.dataset.focusId = 'zadelka_room_' + idx;

      rInp.addEventListener('input
