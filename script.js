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

const SECTION_MENTOR = 'Наставничество';

const LOCATION_WORKS = [
  { key: 'zadelka',      label: 'Штукатурка',             unit: 'шт'  },
  { key: 'tura',         label: 'Тура (монтаж/демонтаж)', unit: 'раз' },
  { key: 'burenie',      label: 'Бурение проходок',       unit: 'шт'  },
  { key: 'vata',         label: 'Вата',                   unit: 'шт'  },
  { key: 'germetik',     label: 'Герметик',               unit: 'шт'  },
  { key: 'birki',        label: 'Бирки',                  unit: 'шт'  },
  { key: 'raskluchenie', label: 'Расключение',            unit: 'шт'  }
];

function isLocationKind(kind) {
  return LOCATION_WORKS.some(w => w.key === kind);
}

function locationWorkByKey(key) {
  return LOCATION_WORKS.find(w => w.key === key) || null;
}

function locationWorkByLabel(label) {
  return LOCATION_WORKS.find(w => w.label === label) || null;
}

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
//  ДОПОЛНИТЕЛЬНЫЕ РАБОТЫ — состояние формы
//  Все работы всегда активны — пользователь
//  просто заполняет те, что ему нужны.
// ============================================
function makeLocationItem() {
  return { building: '', floor: '', room: '', value: '' };
}

function makeAdditionalState() {
  const state = {};
  LOCATION_WORKS.forEach(w => {
    state[w.key] = { items: [makeLocationItem()] };
  });
  state.mentorship = { items: [{ name: '', hours: '' }] };
  return state;
}

let additionalState = makeAdditionalState();

function initAdditionalState() {
  additionalState = makeAdditionalState();
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

// Есть ли хоть одна заполненная строка в доп. работах?
function hasActiveAdditional() {
  if (additionalState.mentorship.items.some(m => m.name || m.hours)) return true;
  return LOCATION_WORKS.some(w => {
    const items = (additionalState[w.key] && additionalState[w.key].items) || [];
    return items.some(it => it.building || it.floor || it.room || it.value);
  });
}

// ============================================
//  ЭТАЖИ ДЛЯ ДОПОЛНИТЕЛЬНЫХ РАБОТ (по корпусу строки)
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
//  МЯГКАЯ ОЧИСТКА ПОМЕЩЕНИЯ ПРИ ВВОДЕ
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
//  НОРМАЛИЗАЦИЯ СПИСКА ПОМЕЩЕНИЙ
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
//  ПОРЯДОК ДОПОЛНИТЕЛЬНЫХ РАБОТ В ЖУРНАЛЕ
// ============================================
function kindOrder(kind) {
  if (kind === 'mentorship') return 999;
  const i = LOCATION_WORKS.findIndex(w => w.key === kind);
  return i === -1 ? 500 : i;
}

// ============================================
//  КЛЮЧ СЕКЦИИ ЖУРНАЛА ДЛЯ ЗАПИСИ
// ============================================
function sectionKeyFor(entry) {
  if (entry.kind === 'main') return entry.building || '';
  if (entry.kind === 'mentorship') return SECTION_MENTOR;
  const w = locationWorkByKey(entry.kind);
  return w ? w.label : '';
}

// ============================================
//  ВЕС СЕКЦИИ ЖУРНАЛА
// ============================================
function sectionWeight(key) {
  if (key === '') return -1;
  const bi = BUILDING_ORDER.indexOf(key);
  if (bi !== -1) return bi;
  const li = LOCATION_WORKS.findIndex(w => w.label === key);
  if (li !== -1) return 900 + li;
  if (key === SECTION_MENTOR) return 999;
  return 500;
}

// ============================================
//  ВЕС КОРПУСА (для сортировки подсекций)
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
  const aLoc = isLocationKind(a.kind);
  const bLoc = isLocationKind(b.kind);
  const aAdd = aLoc || a.kind === 'mentorship';
  const bAdd = bLoc || b.kind === 'mentorship';

  if (aAdd !== bAdd) return aAdd ? 1 : -1;

  if (aAdd && bAdd) {
    const ka = kindOrder(a.kind);
    const kb = kindOrder(b.kind);
    if (ka !== kb) return ka - kb;

    if (aLoc && bLoc) {
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
  if (isLocationKind(entry.kind)) {
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
//  КАСТОМНЫЙ SELECT (для этажа в основной части)
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
//  Блокируем всю карточку, если не заполнены имя и объект.
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
    additionalState = makeAdditionalState();
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
      let sysClass = 'variant-system';
      if (r.system === 'АПС')       sysClass += ' variant-system-aps';
      else if (r.system === 'СОУЭ') sysClass += ' variant-system-soue';
      sysEl.className = sysClass;
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
//  УНИВЕРСАЛЬНЫЙ РЕНДЕР РАБОТЫ С МЕСТАМИ
// ============================================
function renderLocationFields(workKey, container) {
  const work = locationWorkByKey(workKey);
  if (!work) return;

  const group = document.createElement('div');
  group.className = 'additional-group';

  const title = document.createElement('div');
  title.className = 'additional-group-name';
  title.textContent = work.label;
  group.appendChild(title);

  const items = additionalState[workKey].items;

  items.forEach((item, idx) => {
    if (idx > 0) {
      const sep = document.createElement('div');
      sep.className = 'zadelka-separator';
      sep.textContent = 'Место ' + (idx + 1);
      group.appendChild(sep);
    } else if (items.length > 1) {
      const sep = document.createElement('div');
      sep.className = 'zadelka-separator';
      sep.textContent = 'Место 1';
      group.appendChild(sep);
    }

    if (items.length > 1) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'zadelka-remove-btn';
      del.textContent = '× удалить место';
      del.addEventListener('click', () => {
        additionalState[workKey].items.splice(idx, 1);
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
      rInp.dataset.focusId = workKey + '_room_' + idx;

      rInp.addEventListener('input', () => {
        const before = rInp.value;
        const after = sanitizeZadelkaRoomInput(before);
        if (before !== after) {
          rInp.value = after;
          rInp.setSelectionRange(after.length, after.length);
        }
        item.room = rInp.value;
      });

      rInp.addEventListener('blur', () => {
        const normalized = normalizeZadelkaRoom(rInp.value);
        if (rInp.value !== normalized) {
          rInp.value = normalized;
        }
        item.room = normalized;
      });

      rWrap.appendChild(rInp);
      group.appendChild(rWrap);

      const hint = document.createElement('div');
      hint.className = 'hint-small';
      if (building === MASTER_WING) {
        hint.textContent = 'Номера через пробел. Корпус «Крыло мастерских» — все сохранятся с префиксом «к»: к3, к10, к12.';
      } else {
        hint.textContent = 'Номера через пробел. Сохранятся через запятую по возрастанию: 3, 10, 12.';
      }
      group.appendChild(hint);
    }

    const qLine = document.createElement('div');
    qLine.className = 'variant-line';

    const minusBtn = document.createElement('button');
    minusBtn.type = 'button';
    minusBtn.className = 'qty-btn qty-btn-minus';
    minusBtn.textContent = '−';
    qLine.appendChild(minusBtn);

    const qInp = document.createElement('input');
    qInp.type = 'text';
    qInp.inputMode = 'decimal';
    qInp.className = 'variant-input';
    qInp.placeholder = '0';
    qInp.autocomplete = 'off';
    qInp.value = item.value || '';
    qInp.dataset.focusId = workKey + '_qty_' + idx;
    qLine.appendChild(qInp);

    const plusBtn = document.createElement('button');
    plusBtn.type = 'button';
    plusBtn.className = 'qty-btn qty-btn-plus';
    plusBtn.textContent = '+';
    qLine.appendChild(plusBtn);

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button';
    clearBtn.className = 'variant-clear-btn';
    clearBtn.textContent = '×';
    clearBtn.title = 'Очистить';
    clearBtn.style.display = qInp.value ? 'inline-flex' : 'none';
    qLine.appendChild(clearBtn);

    const unit = document.createElement('span');
    unit.className = 'variant-unit';
    unit.textContent = work.unit;
    qLine.appendChild(unit);

    qInp.addEventListener('input', () => {
      const before = qInp.value;
      const after = formatQty(before);
      if (before !== after) {
        qInp.value = after;
        qInp.setSelectionRange(after.length, after.length);
      }
      item.value = qInp.value;
      clearBtn.style.display = qInp.value ? 'inline-flex' : 'none';
      updateMinusState(qInp, minusBtn);
    });
    minusBtn.addEventListener('click', () => {
      bumpQty(qInp, v => { item.value = v; }, -1, clearBtn, minusBtn);
    });
    plusBtn.addEventListener('click', () => {
      bumpQty(qInp, v => { item.value = v; }, 1, clearBtn, minusBtn);
    });
    clearBtn.addEventListener('click', () => {
      qInp.value = '';
      item.value = '';
      clearBtn.style.display = 'none';
      updateMinusState(qInp, minusBtn);
      qInp.focus();
    });

    updateMinusState(qInp, minusBtn);
    group.appendChild(qLine);
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn-add-mentor';
  addBtn.textContent = '+ Добавить место';
  addBtn.addEventListener('click', () => {
    additionalState[workKey].items.push(makeLocationItem());
    renderAdditionalFields();
  });
  group.appendChild(addBtn);

  container.appendChild(group);
}

// ============================================
//  РЕНДЕР НАСТАВНИЧЕСТВА
// ============================================
function renderMentorshipFields(container) {
  const group = document.createElement('div');
  group.className = 'additional-group';

  const name = document.createElement('div');
  name.className = 'additional-group-name';
  name.textContent = SECTION_MENTOR;
  group.appendChild(name);

  additionalState.mentorship.items.forEach((m, idx) => {
    const line = document.createElement('div');
    line.className = 'variant-line';
    line.dataset.mentorIdx = idx;

    const nameIn = document.createElement('input');
    nameIn.type = 'text';
    nameIn.className = 'mentor-name-input';
    nameIn.placeholder = 'Василий Пупкин';
    nameIn.autocomplete = 'off';
    nameIn.autocapitalize = 'words';
    nameIn.spellcheck = false;
    nameIn.maxLength = 40;
    nameIn.value = m.name || '';
    nameIn.dataset.focusId = 'mentor_name_' + idx;

    nameIn.addEventListener('input', () => {
      const before = nameIn.value;
      const pos = nameIn.selectionStart;
      const after = formatName(before);
      if (before !== after) {
        nameIn.value = after;
        const delta = before.length - after.length;
        const newPos = Math.max(0, Math.min(after.length, pos - delta));
        nameIn.setSelectionRange(newPos, newPos);
      }
      m.name = nameIn.value;
      updateNameVisual(nameIn);
    });

    nameIn.addEventListener('blur', () => {
      updateNameVisual(nameIn);
    });

    line.appendChild(nameIn);
    updateNameVisual(nameIn);

    const minusBtn = document.createElement('button');
    minusBtn.type = 'button';
    minusBtn.className = 'qty-btn qty-btn-minus';
    minusBtn.textContent = '−';
    line.appendChild(minusBtn);

    const inputH = document.createElement('input');
    inputH.type = 'text';
    inputH.inputMode = 'decimal';
    inputH.className = 'variant-input';
    inputH.dataset.focusId = 'mentor_hours_' + idx;
    inputH.placeholder = '0';
    inputH.autocomplete = 'off';
    inputH.value = m.hours || '';
    line.appendChild(inputH);

    const plusBtn = document.createElement('button');
    plusBtn.type = 'button';
    plusBtn.className = 'qty-btn qty-btn-plus';
    plusBtn.textContent = '+';
    line.appendChild(plusBtn);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'variant-clear-btn';
    delBtn.textContent = '×';
    delBtn.title = 'Удалить человека';
    delBtn.style.display = additionalState.mentorship.items.length > 1 ? 'inline-flex' : 'none';
    line.appendChild(delBtn);

    const unit = document.createElement('span');
    unit.className = 'variant-unit';
    unit.textContent = 'ч';
    line.appendChild(unit);

    inputH.addEventListener('input', () => {
      const before = inputH.value;
      const after = formatQty(before);
      if (before !== after) {
        inputH.value = after;
        inputH.setSelectionRange(after.length, after.length);
      }
      m.hours = inputH.value;
      updateMinusState(inputH, minusBtn);
    });
    minusBtn.addEventListener('click', () => {
      bumpQty(inputH, v => { m.hours = v; }, -1, null, minusBtn);
    });
    plusBtn.addEventListener('click', () => {
      bumpQty(inputH, v => { m.hours = v; }, 1, null, minusBtn);
    });
    delBtn.addEventListener('click', () => {
      additionalState.mentorship.items.splice(idx, 1);
      if (additionalState.mentorship.items.length === 0) {
        additionalState.mentorship.items.push({ name: '', hours: '' });
      }
      renderAdditionalFields();
    });

    updateMinusState(inputH, minusBtn);
    group.appendChild(line);
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn-add-mentor';
  addBtn.textContent = '+ Добавить человека';
  addBtn.addEventListener('click', () => {
    additionalState.mentorship.items.push({ name: '', hours: '' });
    renderAdditionalFields();
  });
  group.appendChild(addBtn);

  container.appendChild(group);
}

// ============================================
//  ОБЩИЙ РЕНДЕР ДОПОЛНИТЕЛЬНЫХ РАБОТ
//  Все работы всегда видны — без pills.
// ============================================
function renderAdditionalFields() {
  if (!additionalFields) return;

  const active = document.activeElement;
  const focusId = active && active.dataset ? active.dataset.focusId : null;
  const selStart = active && typeof active.selectionStart === 'number' ? active.selectionStart : null;

  _destroyZadelkaCustomSelects();
  additionalFields.innerHTML = '';

  LOCATION_WORKS.forEach(w => {
    renderLocationFields(w.key, additionalFields);
  });

  renderMentorshipFields(additionalFields);

  if (focusId) {
    const el = additionalFields.querySelector('[data-focus-id="' + focusId + '"]');
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
  initAdditionalState();
  renderMaterials();
  renderAdditionalFields();

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
  updateAdditionalAccessibility();
}

// ============================================
//  ЖУРНАЛ — РЕНДЕР ОДНОЙ ЗАПИСИ
// ============================================
function renderJournalEntryElement(entry) {
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

  if (entry.kind === 'main') {
    const meta = document.createElement('div');
    meta.className = 'journal-entry-meta';
    meta.textContent = entry.work;
    el.appendChild(meta);
  }

  let matsArr = [];
  if (entry.kind === 'main') {
    matsArr = materialStateToArrayFromState(entry.materialState || {});
  } else if (isLocationKind(entry.kind)) {
    const w = locationWorkByKey(entry.kind);
    matsArr = [{
      name: w ? w.label : entry.kind,
      unit: w ? w.unit : 'шт',
      qty: entry.qty.replace(',', '.'),
      system: ''
    }];
  } else if (entry.kind === 'mentorship') {
    matsArr = [{
      name: entry.name,
      unit: 'ч',
      qty: entry.hours.replace(',', '.'),
      system: ''
    }];
  }

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

  return el;
}

// ============================================
//  ЖУРНАЛ — РЕНДЕР
// ============================================
function renderJournal() {
  saveDraft();

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
    const key = sectionKeyFor(entry);
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  });

  const keys = Object.keys(groups).sort((a, b) => sectionWeight(a) - sectionWeight(b));

  keys.forEach(key => {
    const isLocationSection = !!locationWorkByLabel(key);

    if (isLocationSection) {
      const t = document.createElement('div');
      t.className = 'journal-building-title';
      t.textContent = key;
      journalCont.appendChild(t);

      const byBuilding = {};
      groups[key].forEach(entry => {
        const b = entry.building || '';
        if (!byBuilding[b]) byBuilding[b] = [];
        byBuilding[b].push(entry);
      });

      const bKeys = Object.keys(byBuilding).sort(
        (a, b) => buildingWeight(a) - buildingWeight(b)
      );

      bKeys.forEach(bKey => {
        if (bKey) {
          const st = document.createElement('div');
          st.className = 'journal-subsection-title';
          st.textContent = bKey;
          journalCont.appendChild(st);
        }
        byBuilding[bKey].forEach(entry => {
          journalCont.appendChild(renderJournalEntryElement(entry));
        });
      });
      return;
    }

    if (key) {
      const t = document.createElement('div');
      t.className = 'journal-building-title';
      t.textContent = key;
      journalCont.appendChild(t);
    }

    groups[key].forEach(entry => {
      journalCont.appendChild(renderJournalEntryElement(entry));
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

  if (entry.kind === 'main') {
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

    materialState = Object.assign({}, entry.materialState || {});
    roomInput.value = entry.room;
    updateFieldState(roomInput);
    renderMaterials();
  } else if (isLocationKind(entry.kind)) {
    additionalState[entry.kind].items = [{
      building: entry.building || '',
      floor: entry.floor || '',
      room: stripPrefixFromRoom(entry.room || ''),
      value: entry.qty || ''
    }];
    renderAdditionalFields();
  } else if (entry.kind === 'mentorship') {
    additionalState.mentorship.items = [
      { name: entry.name || '', hours: entry.hours || '' }
    ];
    renderAdditionalFields();
  }

  const card = document.getElementById('entry-card');
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });

  updateRoomState();
  updateWorkAccessibility();
  updateAdditionalAccessibility();
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

  const mainComplete = isMainEntryComplete();

  if (mainComplete && isBuildingRequired() && !buildingInput.value.trim()) {
    const err = document.getElementById('err-building');
    if (err) err.classList.add('show');
    if (!firstProblem) firstProblem = buildingInput;
  }

  if (mainComplete && !isAttic() && !floorInput.value.trim()) {
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
  const hasAdd = hasActiveAdditional();
  const mainComplete = isMainEntryComplete();

  ['err-room', 'err-work'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });

  let firstProblem = null;

  if (!hasAdd && !mainComplete) {
    if (!floorInput.value.trim() && !isAttic()) {
      const err = document.getElementById('err-floor');
      if (err) err.classList.add('show');
      if (!firstProblem) firstProblem = floorInput;
    }
    if (!roomInput.value.trim() && floorInput.value !== 'Нет') {
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
  }

  for (const w of LOCATION_WORKS) {
    const items = (additionalState[w.key] && additionalState[w.key].items) || [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];

      const needB = isBuildingRequired();
      const isEmptyRow = !it.building && !it.floor && !it.room && !it.value;
      if (isEmptyRow) continue;

      if (needB && !it.building) {
        show('⚠️ ' + w.label + ', место ' + (i + 1) + ': укажите корпус', 'err');
        return false;
      }

      const isAtticZ = (it.building === 'Чердак');
      if (!isAtticZ && !it.floor) {
        show('⚠️ ' + w.label + ', место ' + (i + 1) + ': укажите этаж', 'err');
        return false;
      }

      const floorIsNo = (it.floor === 'Нет');
      const r = normalizeZadelkaRoom(it.room || '');
      if (!isAtticZ && !floorIsNo && !r) {
        show('⚠️ ' + w.label + ', место ' + (i + 1) + ': укажите помещение', 'err');
        return false;
      }

      const v = parseFloat(String(it.value || '').replace(',', '.'));
      if (!isFinite(v) || v <= 0) {
        show('⚠️ ' + w.label + ', место ' + (i + 1) + ': укажите количество', 'err');
        return false;
      }
    }
  }

  let mentorBad = false;
  additionalState.mentorship.items.forEach((m, idx) => {
    const name = String(m.name || '').trim();
    const hours = String(m.hours || '').trim();
    if (!name && !hours) return;
    if (!name || !isNameValid(name)) {
      mentorBad = true;
      const inp = document.querySelector('[data-focus-id="mentor_name_' + idx + '"]');
      if (inp) inp.classList.add('is-invalid');
    }
    const n = parseFloat(hours.replace(',', '.'));
    if (!hours || !isFinite(n) || n <= 0) {
      mentorBad = true;
    }
  });
  if (mentorBad) {
    show('⚠️ Укажите имя (2 слова) и часы для каждого наставника', 'err');
    const badEl = document.querySelector('.mentor-name-input.is-invalid');
    if (badEl && badEl.scrollIntoView) {
      badEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return false;
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
//  ПОИСК ДЛЯ СЛИЯНИЯ (main)
// ============================================
function findMergeIndex(newEntry) {
  return journal.findIndex(e =>
    e.kind === 'main' &&
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

  const mainComplete = isMainEntryComplete();

  let added = false;
  let merged = false;

  if (mainComplete) {
    const mainEntry = {
      kind: 'main',
      room: roomInput.value.trim(),
      room_none: floorInput.value === 'Нет',
      is_master_wing: isMasterWing(),
      building: buildingInput.value.trim(),
      floor: floorInput.value.trim(),
      work: workInput.value,
      materialState: Object.assign({}, materialState)
    };

    const idx = findMergeIndex(mainEntry);
    if (idx !== -1) {
      journal[idx].materialState = sumMaterialStates(
        journal[idx].materialState,
        mainEntry.materialState
      );
      merged = true;
    } else {
      journal.push(mainEntry);
      added = true;
    }
  }

  LOCATION_WORKS.forEach(w => {
    const items = (additionalState[w.key] && additionalState[w.key].items) || [];
    items.forEach(it => {
      const zVal = parseFloat(String(it.value || '').replace(',', '.'));
      if (!isFinite(zVal) || zVal <= 0) return;

      const zRoom = applyPrefixToRoom(
        normalizeZadelkaRoom(it.room || ''),
        it.building || ''
      );
      const zEntry = {
        kind: w.key,
        building: it.building || '',
        floor: it.floor || '',
        room: zRoom,
        qty: it.value
      };

      const idx = journal.findIndex(e =>
        e.kind === w.key &&
        (e.building || '') === zEntry.building &&
        (e.floor || '')    === zEntry.floor
      );

      if (idx !== -1) {
        const oldQ = parseFloat(String(journal[idx].qty).replace(',', '.')) || 0;
        const newQ = oldQ + zVal;
        journal[idx].qty = String(Math.round(newQ * 100) / 100).replace('.', ',');
        journal[idx].room = combineRooms(journal[idx].room, zEntry.room);
        merged = true;
      } else {
        journal.push(zEntry);
        added = true;
      }
    });
  });

  additionalState.mentorship.items.forEach(m => {
    const n = String(m.name || '').trim();
    const h = String(m.hours || '').trim();
    if (!n || !h) return;
    const hn = parseFloat(h.replace(',', '.'));
    if (!isFinite(hn) || hn <= 0) return;

    const idx = journal.findIndex(e =>
      e.kind === 'mentorship' &&
      String(e.name).toLowerCase() === n.toLowerCase()
    );

    if (idx !== -1) {
      const oldH = parseFloat(String(journal[idx].hours).replace(',', '.')) || 0;
      const newH = oldH + hn;
      journal[idx].hours = String(Math.round(newH * 100) / 100).replace('.', ',');
      merged = true;
    } else {
      journal.push({ kind: 'mentorship', name: n, hours: String(hn).replace('.', ',') });
      added = true;
    }
  });

  renderJournal();
  resetCurrentEntry();

  if (added) {
    showToast('Запись добавлена в журнал');
  } else if (merged) {
    showToast('Позиции объединены с существующей записью');
  }
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
  updateAdditionalAccessibility();

  LOCATION_WORKS.forEach(w => {
    if (additionalState[w.key]) {
      additionalState[w.key].items = [makeLocationItem()];
    }
  });
  renderAdditionalFields();
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
  updateAdditionalAccessibility();
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
});

// ============================================
//  ФОРМАТ ПОМЕЩЕНИЯ (основная часть)
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
  }
  updateFieldState(nameInput);
  updateFormAccessibility();
});

nameInput.addEventListener('blur', () => {
  updateFieldState(nameInput);
  const v = nameInput.value.trim();
  if (v && !isNameValid(v)) {
    nameErr.textContent = 'Введите Имя и Фамилию — ровно 2 слова (например: Василий Пупкин)';
    nameErr.classList.add('show');
  } else {
    nameErr.classList.remove('show');
  }
});

// ============================================
//  ПОДСВЕТКА ПОЛЕЙ
// ============================================
function updateFieldState(el) {
  if (el.id === 'name' || el.classList.contains('mentor-name-input')) {
    updateNameVisual(el);
    return;
  }

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
// ============================================
let _sending = false;

async function sendAll() {
  if (_sending) return;

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

  if (isOffline()) {
    show('📵 Нет подключения к интернету. Проверьте сеть и попробуйте снова.', 'err');
    showToast('📵 Нет подключения');
    return;
  }

  _sending = true;
  try {
    show('🔄 Проверяем соединение...', '');
    const reachable = await checkConnection();
    show('');

    if (!reachable) {
      const proceed = confirm(
        '📵 Не удалось связаться с сервером.\n\n' +
        'Возможно, сеть нестабильна или сервер недоступен.\n\n' +
        'Отправить всё равно?'
      );
      if (!proceed) {
        show('⚠️ Отправка отменена. Проверьте подключение и попробуйте снова.', 'err');
        return;
      }
    }

    const sortedJournal = journal.slice().sort(compareEntries);

    const records = [];

    sortedJournal.forEach(entry => {
      if (entry.kind === 'main') {
        let room = entry.room || '';
        if (entry.is_master_wing && room) room = MASTER_WING_PREFIX + room;

        records.push({
          room: room,
          room_none: entry.room_none,
          floor: entry.floor || '',
          work: entry.work,
          materials: materialStateToArrayFromState(entry.materialState || {})
        });
      } else if (isLocationKind(entry.kind)) {
        const w = locationWorkByKey(entry.kind);
        const z = parseFloat(String(entry.qty).replace(',', '.'));
        if (!isFinite(z) || z <= 0) return;

        records.push({
          room: entry.room || '',
          room_none: false,
          floor: entry.floor || '',
          work: WORK_ADDITIONAL,
          materials: [{
            name: w.label,
            unit: w.unit,
            qty: String(z),
            system: ''
          }]
        });
      } else if (entry.kind === 'mentorship') {
        const h = parseFloat(String(entry.hours).replace(',', '.'));
        if (!isFinite(h) || h <= 0) return;

        records.push({
          room: '',
          room_none: false,
          floor: '',
          work: WORK_ADDITIONAL,
          materials: [{
            name: 'Наставничество — ' + entry.name,
            unit: 'ч',
            qty: String(h),
            system: ''
          }]
        });
      }
    });

    const payload = {
      object:  objectSelect.value.trim(),
      date:    dateInput.value.trim(),
      name:    nameInput.value.trim(),
      records: records
    };

    const totalRows = records.reduce((sum, r) =>
      sum + (r.materials.length === 0 ? 1 : r.materials.length), 0);

    const btn = document.getElementById('btn');
    btn.disabled = true;
    btn.textContent = 'Отправляем...';

    showProgress(totalRows);

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

      await new Promise(r => setTimeout(r, 350));

      hideProgress();
      show('✅ Отчет отправлен! Строк: ' + totalRows, 'ok');

      journal.length = 0;
      clearDraft();
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
      updateSendButton();
    }
  } finally {
    _sending = false;
  }
}

// ============================================
//  СТАРТ
// ============================================
initMaterialState();
initAdditionalState();
updateFormAccessibility();
updateMaterialsVisibility();
renderMaterials();
renderAdditionalFields();

const _restoredDraft = loadDraft();
if (_restoredDraft && _restoredDraft.length > 0) {
  journal.push(..._restoredDraft);
}

renderJournal();
updateSendButton();
setupConnectionWatcher();

if (_restoredDraft && _restoredDraft.length > 0) {
  setTimeout(() => {
    showToast('📂 Восстановлено записей: ' + _restoredDraft.length);
  }, 700);
}

window.addToJournal = addToJournal;
window.sendAll = sendAll;
