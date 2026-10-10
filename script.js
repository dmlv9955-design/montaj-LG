// ============================================
//  ТЕМА
// ============================================
(function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  const icon   = document.getElementById('theme-icon');
  if (!toggle) return;
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') { document.body.classList.add('dark'); icon.textContent = '☀️'; }
  else { icon.textContent = '🌙'; }
  toggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    icon.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
})();

// ============================================
//  SCROLL TOP
// ============================================
(function initScrollTop() {
  const btn = document.getElementById('scroll-top');
  if (!btn) return;
  function update() {
    if (window.scrollY > 300) btn.classList.add('show');
    else btn.classList.remove('show');
  }
  window.addEventListener('scroll', update, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
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
const WORK_ADDITIONAL = 'Другие работы';
const SECTION_MENTOR = 'Наставничество';

const MAIN_WORKS = [
  { work: 'Демонтаж', suffix: 'demontazh', emoji: '🔨', alwaysOpen: false },
  { work: 'Монтаж',   suffix: 'montazh',   emoji: '🔧', alwaysOpen: true  }
];

const LOCATION_WORKS = [
  { key: 'zadelka',      label: 'Штукатурка',             unit: 'шт'  },
  { key: 'tura',         label: 'Тура (монтаж/демонтаж)', unit: 'раз' },
  { key: 'burenie',      label: 'Бурение проходок',       unit: 'шт'  },
  { key: 'vata',         label: 'Вата',                   unit: 'шт'  },
  { key: 'germetik',     label: 'Герметик',               unit: 'шт'  },
  { key: 'birki',        label: 'Бирки',                  unit: 'шт'  },
  { key: 'raskluchenie', label: 'Расключение',            unit: 'шт'  }
];

function isLocationKind(kind) { return LOCATION_WORKS.some(w => w.key === kind); }
function locationWorkByKey(key) { return LOCATION_WORKS.find(w => w.key === key) || null; }
function locationWorkByLabel(label) { return LOCATION_WORKS.find(w => w.label === label) || null; }

// ============================================
//  МАТЕРИАЛЫ
// ============================================
const MATERIALS = [
  { id: 'cable', label: 'Кабель КПСЭнг(A)FRHF "Технокабель" 1x2x', unit: 'м', rows: [
    { key: 'cable_075_aps', variant: 'х0,75', system: 'АПС', tableName: 'Кабель КПСЭнг(A)FRHF "Технокабель" 1x2x0,75' },
    { key: 'cable_1_soue',  variant: 'х1',    system: 'СОУЭ', tableName: 'Кабель КПСЭнг(A)FRHF "Технокабель" 1x2x1' }
  ]},
  { id: 'channel', label: 'Кабель-канал белый ECOLINE IEK', unit: 'м', rows: [
    { key: 'channel_40x25', variant: '40х25', system: 'АПС/СОУЭ', primary: true, tableName: 'Кабель-канал белый ECOLINE IEK 40x25' },
    { key: 'channel_25x16', variant: '25х16', system: 'АПС/СОУЭ', tableName: 'Кабель-канал белый ECOLINE IEK 25x16' }
  ]},
  { id: 'corrugated', label: 'Труба гофрированная ПВХ, серая', unit: 'м', rows: [
    { key: 'corrugated_20', variant: '20 мм', system: 'АПС/СОУЭ', primary: true, tableName: 'Труба гофрированная ПВХ, серая d=20мм' },
    { key: 'corrugated_16', variant: '16 мм', system: 'АПС/СОУЭ', tableName: 'Труба гофрированная ПВХ, серая d=16мм' }
  ]},
  { id: 'steel', label: 'Труба стальная ВГП ДУ ГОСТ 3262-75', unit: 'м', rows: [
    { key: 'steel_15', variant: '15', unitHint: 'мм.', system: 'АПС/СОУЭ', primary: true, tableName: 'Труба стальная ВГП ДУ ГОСТ 3262-75 15×2,8 мм.' },
    { key: 'steel_20', variant: '20', unitHint: 'мм.', system: 'АПС/СОУЭ', tableName: 'Труба стальная ВГП ДУ ГОСТ 3262-75 20×2,8 мм.' }
  ]}
];

const MATERIAL_BY_KEY = (() => {
  const m = {};
  MATERIALS.forEach(mat => mat.rows.forEach(r => { m[r.key] = { mat, row: r }; }));
  return m;
})();

// ============================================
//  СОСТОЯНИЕ
// ============================================
const mainState = {};
const _mainBlockStatus = {};

function makeEmptyMatRow() { return { building: '', floor: '', room: '', qty: '' }; }

function makeEmptyMaterialState() {
  const s = {};
  MATERIALS.forEach(mat => mat.rows.forEach(r => {
    s[r.key] = { rows: [makeEmptyMatRow()] };
  }));
  return s;
}

// ============================================
//  ДОП. РАБОТЫ
// ============================================
function makeLocationItem() { return { building: '', floor: '', room: '', value: '' }; }

function makeAdditionalState() {
  const state = {};
  LOCATION_WORKS.forEach(w => { state[w.key] = { items: [makeLocationItem()] }; });
  state.mentorship = { items: [{ name: '', hours: '' }] };
  return state;
}

let additionalState = makeAdditionalState();
function initAdditionalState() { additionalState = makeAdditionalState(); }

// ============================================
//  ЖУРНАЛ
// ============================================
const journal = [];

const DRAFT_KEY = 'montaj_journal_draft_v1';
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function saveDraft() {
  try {
    if (!journal || journal.length === 0) { localStorage.removeItem(DRAFT_KEY); return; }
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), entries: journal }));
  } catch (e) { console.warn('Не удалось сохранить черновик:', e); }
}

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray(parsed.entries)) return null;
    if (typeof parsed.savedAt === 'number' && Date.now() - parsed.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(DRAFT_KEY); return null;
    }
    const ok = parsed.entries.every(e => e && typeof e === 'object' && typeof e.kind === 'string');
    return ok ? parsed.entries : null;
  } catch (e) { console.warn('Не удалось прочитать черновик:', e); return null; }
}

function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch (_) {} }

// ============================================
//  ЗАЩИТА
// ============================================
let _sending = false;
let _addingToJournal = false;

// ============================================
//  ВЕРХНЯЯ КНОПКА «ОТПРАВИТЬ»
// ============================================
function updateSendButton() {
  const btn = document.getElementById('btn');
  if (!btn) return;
  if (_sending) return;
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

function hasActiveAdditional() {
  if (additionalState.mentorship.items.some(m => m.name || m.hours)) return true;
  return LOCATION_WORKS.some(w => {
    const items = (additionalState[w.key] && additionalState[w.key].items) || [];
    return items.some(it => it.building || it.floor || it.room || it.value);
  });
}

function isMainBlockEmpty(work) {
  const st = mainState[work];
  if (!st) return true;
  for (const k in st.materials) {
    const rows = st.materials[k].rows || [];
    for (const r of rows) {
      if (r.qty || r.building || r.floor || r.room) return false;
    }
  }
  return true;
}

function isMatRowLocationComplete(row, buildingRequired) {
  if (buildingRequired && !row.building) return false;
  if (isAtticBuilding(row.building)) return true;
  if (!row.floor) return false;
  if (row.floor === 'Нет') return true;
  if (!row.room) return false;
  return true;
}

function isMatRowReadyForMore(row, buildingRequired) {
  return isMatRowLocationComplete(row, buildingRequired);
}

// ============================================
//  ФОРМАТИРОВАНИЕ ЧИСЕЛ
// ============================================
function formatQty(raw) {
  let s = String(raw == null ? '' : raw).replace(/[^0-9.,]/g, '');
  s = s.replace(/\./g, ',');
  const firstComma = s.indexOf(',');
  if (firstComma !== -1) s = s.slice(0, firstComma + 1) + s.slice(firstComma + 1).replace(/,/g, '');
  const parts = s.split(',');
  let intPart = parts[0] || '';
  let fracPart = parts.length > 1 ? parts[1] : null;
  if (intPart.length > 1 && intPart.charAt(0) === '0') {
    const extra = intPart.slice(1); intPart = '0'; fracPart = extra + (fracPart || '');
  }
  if (intPart.length > 4) intPart = intPart.slice(0, 4);
  if (fracPart !== null && fracPart.length > 2) fracPart = fracPart.slice(0, 2);
  if (fracPart !== null) return intPart + ',' + fracPart;
  return intPart;
}

// ============================================
//  ФОРМАТИРОВАНИЕ ПОМЕЩЕНИЙ
// ============================================
function sanitizeZadelkaRoomInput(value) {
  let s = String(value == null ? '' : value);
  s = s.replace(/\./g, ' ').replace(/[^0-9\s]/g, '').replace(/\s+/g, ' ').replace(/^\s+/, '');
  return s;
}

function liveFormatRooms(raw) {
  let s = String(raw == null ? '' : raw);
  if (!s) return '';
  const trailingDelim = /[^0-9]$/.test(s);

  s = s.replace(/[^0-9]+/g, ', ');
  s = s.replace(/^(?:,\s*)+/, '');
  s = s.replace(/,\s*/g, ', ');
  s = s.trim();

  if (trailingDelim) {
    if (!s) s = '';
    else s += ', ';
  }
  return s;
}

function finalizeRooms(raw) {
  const nums = String(raw == null ? '' : raw)
    .split(',')
    .map(p => p.replace(/[^0-9]/g, ''))
    .filter(p => p !== '')
    .map(p => parseInt(p, 10))
    .filter(n => isFinite(n) && n > 0);
  const set = new Set(nums);
  return Array.from(set).sort((a, b) => a - b).join(', ');
}

function normalizeZadelkaRoom(value) {
  const nums = String(value == null ? '' : value)
    .split(/[^0-9]+/)
    .map(p => parseInt(p, 10))
    .filter(n => isFinite(n) && n > 0);
  const set = new Set(nums);
  return Array.from(set).sort((a, b) => a - b).join(', ');
}

function parseRooms(roomStr) {
  const plain = new Set(); const prefixed = new Set();
  String(roomStr || '').split(',').forEach(part => {
    const s = part.trim(); if (!s) return;
    const m = s.match(/^([кК]?)(\d+)$/); if (!m) return;
    const n = parseInt(m[2], 10); if (!isFinite(n) || n <= 0) return;
    if (m[1]) prefixed.add(n); else plain.add(n);
  });
  return { plain, prefixed };
}

function combineRooms(a, b) {
  const pa = parseRooms(a); const pb = parseRooms(b);
  const plain = new Set(); pa.plain.forEach(n => plain.add(n)); pb.plain.forEach(n => plain.add(n));
  const prefixed = new Set(); pa.prefixed.forEach(n => prefixed.add(n)); pb.prefixed.forEach(n => prefixed.add(n));
  return []
    .concat(Array.from(plain).sort((x, y) => x - y).map(n => String(n)))
    .concat(Array.from(prefixed).sort((x, y) => x - y).map(n => 'к' + n))
    .join(', ');
}

function applyPrefixToRoom(room, building) {
  if (!room) return '';
  if (building !== MASTER_WING) return room;
  return room.split(',').map(p => {
    const s = p.trim(); if (!s) return '';
    if (/^[кК]/.test(s)) return s;
    return MASTER_WING_PREFIX + s;
  }).filter(Boolean).join(', ');
}

function stripPrefixFromRoom(room) {
  if (!room) return '';
  return room.split(',').map(p => p.trim().replace(/^[кК]/, '')).filter(Boolean).join(', ');
}

// ============================================
//  СОРТИРОВКА
// ============================================
function workWeight(work) {
  if (work === 'Демонтаж') return 0;
  if (work === 'Монтаж')   return 1;
  return 99;
}

function kindOrder(kind) {
  if (kind === 'mentorship') return 999;
  const i = LOCATION_WORKS.findIndex(w => w.key === kind);
  return i === -1 ? 500 : i;
}

function sectionKeyFor(entry) {
  if (entry.kind === 'main') return entry.building || '';
  if (entry.kind === 'mentorship') return SECTION_MENTOR;
  const w = locationWorkByKey(entry.kind);
  return w ? w.label : '';
}

function sectionWeight(key) {
  if (key === '') return -1;
  const bi = BUILDING_ORDER.indexOf(key); if (bi !== -1) return bi;
  const li = LOCATION_WORKS.findIndex(w => w.label === key); if (li !== -1) return 900 + li;
  if (key === SECTION_MENTOR) return 999;
  return 500;
}

function buildingWeight(b) {
  if (!b) return -1;
  const i = BUILDING_ORDER.indexOf(b);
  return i === -1 ? 500 : i;
}

function floorWeight(floor) {
  const w = { 'Подвал': -1, '1': 1, '2': 2, '3': 3, 'Чердак': 100, '': 900, 'Нет': 1000 };
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

function compareEntries(a, b) {
  const aLoc = isLocationKind(a.kind); const bLoc = isLocationKind(b.kind);
  const aAdd = aLoc || a.kind === 'mentorship'; const bAdd = bLoc || b.kind === 'mentorship';
  if (aAdd !== bAdd) return aAdd ? 1 : -1;
  if (aAdd && bAdd) {
    const ka = kindOrder(a.kind); const kb = kindOrder(b.kind);
    if (ka !== kb) return ka - kb;
    if (aLoc && bLoc) {
      const ba = buildingWeight(a.building); const bb = buildingWeight(b.building);
      if (ba !== bb) return ba - bb;
      const fa = floorWeight(a.floor); const fb = floorWeight(b.floor);
      if (fa !== fb) return fa - fb;
      const ra = roomSortKey(a.room); const rb = roomSortKey(b.room);
      if (ra !== rb) return ra - rb;
      return String(a.room).localeCompare(String(b.room));
    }
    if (a.kind === 'mentorship' && b.kind === 'mentorship') return String(a.name).localeCompare(String(b.name));
    return 0;
  }
  const fa = floorWeight(a.floor); const fb = floorWeight(b.floor);
  if (fa !== fb) return fa - fb;
  const ra = roomSortKey(a.room); const rb = roomSortKey(b.room);
  if (ra !== rb) return ra - rb;
  const ka = a.is_master_wing ? 1 : 0; const kb = b.is_master_wing ? 1 : 0;
  if (ka !== kb) return ka - kb;
  return workWeight(a.work) - workWeight(b.work);
}

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
  if (entry.kind === 'mentorship') return entry.name || 'Наставничество';
  const floorLabel = formatFloorLabel(entry.floor);
  let roomLabel;
  if (entry.room_none) roomLabel = 'без помещения';
  else roomLabel = 'пом. ' + (entry.is_master_wing ? MASTER_WING_PREFIX : '') + entry.room;
  if (!floorLabel) return roomLabel.charAt(0).toUpperCase() + roomLabel.slice(1);
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
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const minDate = new Date(today); minDate.setDate(minDate.getDate() - DATE_MIN_DAYS_AGO);
  dateInput.min = toISODate(minDate); dateInput.max = toISODate(today);
  if (!dateInput.value) dateInput.value = toISODate(today);
}

function updateDateHighlight() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayISO = toISODate(today);
  const v = dateInput.value;
  dateInput.classList.remove('is-old-date');
  if (!v || v === todayISO) return;
  dateInput.classList.add('is-old-date');
}

setupDateRange(); updateDateHighlight();

dateInput.addEventListener('change', () => {
  if (dateInput.value) {
    if (dateInput.value < dateInput.min) dateInput.value = dateInput.min;
    if (dateInput.value > dateInput.max) dateInput.value = dateInput.max;
  }
  updateDateHighlight(); updateFieldState(dateInput);
});

// ============================================
//  УТИЛИТЫ
// ============================================
function show(text, cls) { const m = document.getElementById('msg'); m.textContent = text; m.className = cls || ''; }

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

let toastTimer = null;
function showToast(text) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = text; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

function isOffline() { return typeof navigator !== 'undefined' && navigator.onLine === false; }

async function checkConnection() {
  if (isOffline()) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const pingUrl = API_URL + (API_URL.indexOf('?') === -1 ? '?' : '&') + '_ping=' + Date.now();
    await fetch(pingUrl, { method: 'HEAD', mode: 'no-cors', cache: 'no-store', signal: controller.signal });
    clearTimeout(timer); return true;
  } catch (_) { return false; }
}

function setupConnectionWatcher() {
  window.addEventListener('online', () => { showToast('✅ Соединение восстановлено'); updateSendButton(); });
  window.addEventListener('offline', () => { showToast('📵 Нет подключения к интернету'); updateSendButton(); });
}

function showProgress(total) {
  const o = document.getElementById('progress-overlay');
  const c = document.getElementById('progress-counter');
  if (!o || !c) return;
  c.textContent = '0 из ' + total; o.classList.add('show');
}
function updateProgress(done, total) { const c = document.getElementById('progress-counter'); if (c) c.textContent = done + ' из ' + total; }
function hideProgress() { const o = document.getElementById('progress-overlay'); if (o) o.classList.remove('show'); }

function getFloorsFor(object, building) {
  if (building && FLOORS_OVERRIDE_BY_BUILDING[building]) return FLOORS_OVERRIDE_BY_BUILDING[building];
  return FLOORS_BY_OBJECT[object] || null;
}

function isBuildingRequired() { return !!BUILDINGS_BY_OBJECT[objectSelect.value]; }
function isMasterWingBuilding(b) { return b === MASTER_WING; }
function isAtticBuilding(b) { return b === ATTIC; }

function systemClass(sys) {
  if (!sys) return 'variant-system';
  if (sys === 'АПС')      return 'variant-system variant-system-aps';
  if (sys === 'СОУЭ')     return 'variant-system variant-system-soue';
  if (sys === 'АПС/СОУЭ') return 'variant-system variant-system-both';
  return 'variant-system';
}

// ============================================
//  SEGMENTED CONTROL
// ============================================
class SegmentedControl {
  constructor(rootEl) {
    this.root = rootEl;
    this.input = rootEl.querySelector('input[type="hidden"]');
    this.hint = rootEl.querySelector('.segmented-hint');
  }
  get value() { return this.input.value; }
  set value(v) { this.input.value = v || ''; this.updateDisplay(); }
  get disabled() { return this.root.classList.contains('segmented-disabled'); }
  set disabled(v) { this.root.classList.toggle('segmented-disabled', !!v); this.input.disabled = !!v; }
  setHint(text) { if (this.hint) this.hint.textContent = text; }
  setOptions(arr) {
    this.root.querySelectorAll('.segmented-btn').forEach(b => b.remove());
    arr.forEach(val => {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'segmented-btn';
      btn.dataset.value = val; btn.textContent = val;
      btn.addEventListener('click', () => {
        if (this.root.classList.contains('segmented-disabled')) return;
        this.input.value = val;
        this.input.dispatchEvent(new Event('change', { bubbles: true }));
        this.updateDisplay();
      });
      this.root.appendChild(btn);
    });
    const vals = arr.map(o => typeof o === 'string' ? o : o.value);
    if (!vals.includes(this.input.value)) this.input.value = '';
    this.updateDisplay();
  }
  updateDisplay() {
    const v = this.input.value;
    this.root.querySelectorAll('.segmented-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === v);
    });
  }
}

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
      if (root.classList.contains('segmented-disabled')) return;
      const isActive = btn.classList.contains('active');
      if (allowDeselect && isActive) input.value = '';
      else input.value = btn.dataset.value;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      updateDisplay();
    });
  });
  input.addEventListener('change', updateDisplay);
  updateDisplay();
  input._updateSegmentedDisplay = updateDisplay;
}

initSegmented('object-segmented', 'object', { allowDeselect: false });

// ============================================
//  ВЕРХНИЕ ЭЛЕМЕНТЫ
// ============================================
const objectSelect     = document.getElementById('object');
const nameInput        = document.getElementById('name');
const nameErr          = document.getElementById('err-name');
const journalCont      = document.getElementById('journal-container');
const journalEmpty     = document.getElementById('journal-empty');
const journalCount     = document.getElementById('journal-count');
const objectSeg        = document.getElementById('object-segmented');
const additionalCard   = document.getElementById('additional-card');
const additionalFields = document.getElementById('additional-fields');

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
    input.focus(); update();
  });
  update(); input._updateClearBtn = update;
}
attachClearButton('name', 'clear-name');

// ============================================
//  ИМЯ
// ============================================
function isNameValid(value) {
  const v = value.trim();
  return /^[А-ЯЁA-Z][а-яёa-z]+(?:-[А-ЯЁA-Z][а-яёa-z]+)?\s+[А-ЯЁA-Z][а-яёa-z]+(?:-[А-ЯЁA-Z][а-яёa-z]+)?$/.test(v);
}

function updateNameVisual(el, gateInput) {
  if (!el) return;
  el.classList.remove('is-empty', 'is-partial', 'is-filled', 'is-invalid');
  if (el.disabled) return;
  if (gateInput) { const g = String(gateInput.value || '').trim(); if (!g) return; }
  const v = String(el.value || '').trim();
  if (!v) el.classList.add('is-empty');
  else if (!isNameValid(v)) el.classList.add('is-partial');
  else el.classList.add('is-filled');
}

// ============================================
//  ДОСТУПНОСТЬ ДОП. РАБОТ
// ============================================
function updateAdditionalAccessibility() {
  if (!additionalCard) return;
  const nameOk = isNameValid(nameInput.value);
  const objectOk = !!objectSelect.value;
  const unlocked = nameOk && objectOk;
  if (unlocked) { additionalCard.classList.remove('additional-block-disabled'); return; }
  additionalCard.classList.add('additional-block-disabled');
  const hadActive = hasActiveAdditional();
  if (hadActive) { additionalState = makeAdditionalState(); renderAdditionalFields(); }
}

// ============================================
//  ЕДИНЫЙ ПЕРЕСЧЁТ ПО ИМЕНИ
// ============================================
function refreshNameGates() {
  const nameOk = isNameValid(nameInput.value);
  dateInput.disabled = !nameOk;
  const objHint = objectSeg.querySelector('.segmented-hint');
  if (!nameOk) {
    objectSeg.classList.add('segmented-disabled');
    if (objHint) objHint.textContent = '🔒 Введите имя';
    if (objectSelect.value) {
      objectSelect.value = '';
      if (objectSelect._updateSegmentedDisplay) objectSelect._updateSegmentedDisplay();
    }
  } else objectSeg.classList.remove('segmented-disabled');
  updateFieldState(dateInput); updateFieldState(objectSelect);
  updateAllMainBlocks(); updateAdditionalAccessibility();
}

// ============================================
//  HTML-ШАБЛОН БЛОКА
// ============================================
function createMainBlockHTML(work, suffix, emoji, alwaysOpen) {
  const arrowHTML = alwaysOpen ? '' : '<span class="acc-arrow">▼</span>';
  return `
    <button type="button" class="accordion-header accordion-header-${suffix}" disabled>
      <span class="acc-emoji">${emoji}</span>
      <span class="acc-label">${work}</span>
      ${arrowHTML}
    </button>
    <div class="accordion-body">
      <div data-materials-section>
        <div class="section-subtitle">Материалы</div>
        <div data-materials></div>
      </div>
    </div>
  `;
}

// ============================================
//  ИНИЦИАЛИЗАЦИЯ БЛОКОВ
// ============================================
function initMainWorks() {
  const container = document.getElementById('main-works-container');
  if (!container) { console.warn('Нет #main-works-container в HTML'); return; }
  container.innerHTML = '';

  MAIN_WORKS.forEach(({ work, suffix, emoji, alwaysOpen }) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'accordion-item' + (alwaysOpen ? ' accordion-item-always-open' : '');
    wrapper.dataset.work = work;

    const inner = document.createElement('div');
    inner.innerHTML = createMainBlockHTML(work, suffix, emoji, alwaysOpen).trim();
    while (inner.firstChild) wrapper.appendChild(inner.firstChild);
    container.appendChild(wrapper);

    const st = {
      work, suffix,
      alwaysOpen: !!alwaysOpen,
      materials: makeEmptyMaterialState(),
      expanded: !!alwaysOpen,
      wrapper: wrapper,
      elements: {
        header: wrapper.querySelector('.accordion-header'),
        body: wrapper.querySelector('.accordion-body'),
        materialsCont: wrapper.querySelector('[data-materials]')
      }
    };
    mainState[work] = st;

    if (alwaysOpen) {
      st.elements.header.classList.add('expanded', 'accordion-header-static');
      st.elements.body.classList.add('open');
      st.elements.header.style.cursor = 'default';
    } else {
      st.elements.header.addEventListener('click', () => {
        if (st.elements.header.disabled) return;
        toggleMainAccordion(work);
      });
    }

    renderMaterialsForBlock(work);
  });
}

function toggleMainAccordion(work) {
  const st = mainState[work];
  if (!st || st.alwaysOpen) return;
  st.expanded = !st.expanded;
  st.elements.header.classList.toggle('expanded', st.expanded);
  st.elements.body.classList.toggle('open', st.expanded);
  if (st.expanded) renderMaterialsForBlock(work);
}

function updateAllMainBlocks() {
  const nameOk = isNameValid(nameInput.value);
  const objOk = !!objectSelect.value;
  const enabled = nameOk && objOk;
  const newStatus = enabled ? 'enabled' : 'disabled';

  MAIN_WORKS.forEach(({ work }) => {
    const st = mainState[work];
    if (!st) return;

    st.elements.header.disabled = !enabled;
    if (st.wrapper) st.wrapper.classList.toggle('main-block-locked', !enabled);

    const statusChanged = _mainBlockStatus[work] !== newStatus;
    if (statusChanged && st.expanded) {
      renderMaterialsForBlock(work);
    }
    _mainBlockStatus[work] = newStatus;
  });
}

// ============================================
//  РЕНДЕР МАТЕРИАЛОВ
// ============================================
function renderMaterialsForBlock(work) {
  const st = mainState[work];
  if (!st || !st.elements) return;
  const container = st.elements.materialsCont;
  if (!container) return;

  const active = document.activeElement;
  const inThis = active && container.contains(active);
  const focusKey = inThis && active.dataset ? active.dataset.focusKey : null;
  const selStart = inThis && typeof active.selectionStart === 'number' ? active.selectionStart : null;

  container.innerHTML = '';
  const state = st.materials;
  const buildingRequired = isBuildingRequired();
  const buildingList = BUILDINGS_BY_OBJECT[objectSelect.value] || [];

  MATERIALS.forEach(mat => {
    mat.rows.forEach(r => {
      const data = state[r.key];
      if (!data) return;

      const card = document.createElement('div');
      card.className = 'mat-card';
      card.dataset.matKey = r.key;

      // === Шапка: название слева, [вид] для [система] справа ===
      const head = document.createElement('div');
      head.className = 'mat-head';

      const nameEl = document.createElement('span');
      nameEl.className = 'mat-head-name';
      nameEl.textContent = mat.label;
      head.appendChild(nameEl);

      const headRight = document.createElement('span');
      headRight.className = 'mat-head-right';

      // 1) Вид
      const badge = document.createElement('span');
      badge.className = 'variant-badge' + (r.primary ? ' primary' : '');
      badge.textContent = r.variant;
      headRight.appendChild(badge);

      // 1а) Мелкая подпись после бейджа (например, «мм.»)
      if (r.unitHint) {
        const hintEl = document.createElement('span');
        hintEl.className = 'variant-hint';
        hintEl.textContent = r.unitHint;
        headRight.appendChild(hintEl);
      }

      // 2) «для»
      const forEl = document.createElement('span');
      forEl.className = 'variant-for';
      forEl.textContent = 'для';
      headRight.appendChild(forEl);

      // 3) Система
      const sysEl = document.createElement('span');
      sysEl.className = systemClass(r.system);
      sysEl.textContent = r.system;
      headRight.appendChild(sysEl);

      head.appendChild(headRight);
      card.appendChild(head);

      const rowsWrap = document.createElement('div');
      rowsWrap.className = 'mat-rows';
      card.appendChild(rowsWrap);

      data.rows.forEach((row, idx) => {
        const rowEl = document.createElement('div');
        rowEl.className = 'mat-row';

        if (data.rows.length > 1) {
          const numEl = document.createElement('div');
          numEl.className = 'mat-row-num';
          numEl.textContent = 'Этаж ' + (idx + 1);
          rowEl.appendChild(numEl);
        }

        if (idx > 0) {
          const del = document.createElement('button');
          del.type = 'button';
          del.className = 'mat-row-del';
          del.title = 'Удалить';
          del.textContent = '×';
          del.addEventListener('click', () => {
            data.rows.splice(idx, 1);
            if (data.rows.length === 0) data.rows.push(makeEmptyMatRow());
            renderMaterialsForBlock(work);
          });
          rowEl.appendChild(del);
        }

        // === Корпус ===
        if (buildingRequired) {
          const corpLine = document.createElement('div');
          corpLine.className = 'mat-line';
          const lbl = document.createElement('span');
          lbl.className = 'mat-line-label';
          lbl.textContent = 'Корпус:';
          corpLine.appendChild(lbl);

          const corpWrap = document.createElement('div');
          corpWrap.className = 'mat-line-corp';

          buildingList.forEach(val => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'loc-floor-btn' + (row.building === val ? ' active' : '')
              + (!row.building ? ' is-empty' : '');
            b.textContent = val;
            b.addEventListener('click', () => {
              row.building = val;
              row.floor = '';
              row.room = '';
              renderMaterialsForBlock(work);
            });
            corpWrap.appendChild(b);
          });

          corpLine.appendChild(corpWrap);
          rowEl.appendChild(corpLine);
        }

        // === Этаж ===
        const isAtticRow = isAtticBuilding(row.building);
        const floors = getFloorsFor(objectSelect.value, row.building);
        const buildingChosen = !buildingRequired || !!row.building;
        const canChooseFloor = buildingChosen && !isAtticRow && floors && floors.length > 0;

        if (canChooseFloor) {
          const floorLine = document.createElement('div');
          floorLine.className = 'mat-line';
          const flbl = document.createElement('span');
          flbl.className = 'mat-line-label';
          flbl.textContent = 'Этаж:';
          floorLine.appendChild(flbl);

          const fWrap = document.createElement('div');
          fWrap.className = 'mat-line-floors';
          floors.forEach(f => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'loc-floor-btn' + (row.floor === f ? ' active' : '')
              + (!row.floor ? ' is-empty' : '');
            b.textContent = f;
            b.addEventListener('click', () => {
              row.floor = f;
              if (f === 'Нет') row.room = 'Нет';
              else if (row.room === 'Нет') row.room = '';
              renderMaterialsForBlock(work);
            });
            fWrap.appendChild(b);
          });
          floorLine.appendChild(fWrap);
          rowEl.appendChild(floorLine);
        }

        // === Помещения + количество ===
        const floorChosen = !!row.floor || isAtticRow;
        const floorIsNo = row.floor === 'Нет';
        const showRoom = floorChosen && !floorIsNo;

        const mainLine = document.createElement('div');
        mainLine.className = 'mat-line';

        if (showRoom) {
          const rlbl = document.createElement('span');
          rlbl.className = 'mat-line-label';
          rlbl.textContent = 'Помещения:';
          mainLine.appendChild(rlbl);

          const rWrap = document.createElement('div');
          rWrap.className = 'mat-line-room';

          if (isMasterWingBuilding(row.building)) {
            const p = document.createElement('span');
            p.className = 'room-prefix';
            p.textContent = MASTER_WING_PREFIX;
            rWrap.appendChild(p);
          }

          const rInput = document.createElement('input');
          rInput.type = 'text';
          rInput.className = 'loc-room-input';
          rInput.inputMode = 'text';
          rInput.autocomplete = 'off';
          rInput.placeholder = '12, 15, 20';
          rInput.value = row.room === 'Нет' ? '' : (row.room || '');
          rInput.dataset.focusKey = r.key + '_room_' + idx;
          if (!row.room) rInput.classList.add('is-empty');

          rInput.addEventListener('input', () => {
            const formatted = liveFormatRooms(rInput.value);
            if (formatted !== rInput.value) {
              rInput.value = formatted;
              try { rInput.setSelectionRange(formatted.length, formatted.length); } catch (_) {}
            }
            row.room = rInput.value;
            rInput.classList.toggle('is-empty', !rInput.value);
            updateAddFloorButton(card, r.key, work);
          });

          rInput.addEventListener('blur', () => {
            const finalVal = finalizeRooms(rInput.value);
            if (rInput.value !== finalVal) rInput.value = finalVal;
            row.room = finalVal;
            rInput.classList.toggle('is-empty', !finalVal);
          });

          rWrap.appendChild(rInput);
          mainLine.appendChild(rWrap);
        }

        const qWrap = document.createElement('div');
        qWrap.className = 'mat-line-qty';

        const qlbl = document.createElement('span');
        qlbl.className = 'mat-line-label';
        qlbl.textContent = 'Кол-во:';
        qWrap.appendChild(qlbl);

        const minusBtn = document.createElement('button');
        minusBtn.type = 'button';
        minusBtn.className = 'qty-btn qty-btn-minus';
        minusBtn.textContent = '−';
        qWrap.appendChild(minusBtn);

        const qInput = document.createElement('input');
        qInput.type = 'text';
        qInput.inputMode = 'decimal';
        qInput.className = 'variant-input';
        qInput.placeholder = '0';
        qInput.autocomplete = 'off';
        qInput.value = row.qty || '';
        qInput.dataset.focusKey = r.key + '_qty_' + idx;
        qWrap.appendChild(qInput);

        const plusBtn = document.createElement('button');
        plusBtn.type = 'button';
        plusBtn.className = 'qty-btn qty-btn-plus';
        plusBtn.textContent = '+';
        qWrap.appendChild(plusBtn);

        const clearBtn = document.createElement('button');
        clearBtn.type = 'button';
        clearBtn.className = 'variant-clear-btn';
        clearBtn.textContent = '×';
        clearBtn.title = 'Очистить';
        clearBtn.style.display = qInput.value ? 'inline-flex' : 'none';
        qWrap.appendChild(clearBtn);

        const unitEl = document.createElement('span');
        unitEl.className = 'variant-unit';
        unitEl.textContent = mat.unit;
        qWrap.appendChild(unitEl);

        qInput.addEventListener('input', () => {
          const before = qInput.value;
          const after = formatQty(before);
          if (before !== after) {
            qInput.value = after;
            qInput.setSelectionRange(after.length, after.length);
          }
          row.qty = qInput.value;
          clearBtn.style.display = qInput.value ? 'inline-flex' : 'none';
          updateMinusState(qInput, minusBtn);
          updateAddFloorButton(card, r.key, work);
        });

        minusBtn.addEventListener('click', () => {
          bumpQty(qInput, v => { row.qty = v; }, -1, clearBtn, minusBtn);
          updateAddFloorButton(card, r.key, work);
        });
        plusBtn.addEventListener('click', () => {
          bumpQty(qInput, v => { row.qty = v; }, 1, clearBtn, minusBtn);
          updateAddFloorButton(card, r.key, work);
        });
        clearBtn.addEventListener('click', () => {
          qInput.value = ''; row.qty = '';
          clearBtn.style.display = 'none';
          updateMinusState(qInput, minusBtn);
          updateAddFloorButton(card, r.key, work);
          qInput.focus();
        });

        updateMinusState(qInput, minusBtn);
        mainLine.appendChild(qWrap);
        rowEl.appendChild(mainLine);

        rowsWrap.appendChild(rowEl);
      });

      const addFloorBtn = document.createElement('button');
      addFloorBtn.type = 'button';
      addFloorBtn.className = 'mat-add-floor';
      addFloorBtn.textContent = '+ Добавить этаж';
      addFloorBtn.dataset.addFloorFor = r.key;
      addFloorBtn.addEventListener('click', () => {
        data.rows.push(makeEmptyMatRow());
        renderMaterialsForBlock(work);
      });
      card.appendChild(addFloorBtn);

      container.appendChild(card);

      updateAddFloorButton(card, r.key, work);
    });
  });

  if (focusKey) {
    const el = container.querySelector('[data-focus-key="' + focusKey + '"]');
    if (el) {
      el.focus();
      if (selStart !== null && el.setSelectionRange) {
        const pos = Math.min(selStart, el.value.length);
        el.setSelectionRange(pos, pos);
      }
    }
  }
}

function updateAddFloorButton(card, matKey, work) {
  const st = mainState[work];
  if (!st) return;
  const data = st.materials[matKey];
  if (!data) return;
  const btn = card.querySelector('[data-add-floor-for="' + matKey + '"]');
  if (!btn) return;

  const lastRow = data.rows[data.rows.length - 1];
  if (!lastRow) { btn.classList.add('hidden'); return; }

  const buildingRequired = isBuildingRequired();
  const ready = isMatRowReadyForMore(lastRow, buildingRequired);
  btn.classList.toggle('hidden', !ready);
}

// ============================================
//  ВАЛИДАЦИЯ БЛОКА
// ============================================
function validateMainFieldsForBlock(work) {
  const st = mainState[work];
  if (!st) return false;
  const buildingRequired = isBuildingRequired();

  for (const k in st.materials) {
    const data = st.materials[k];
    const info = MATERIAL_BY_KEY[k];
    const label = info ? (info.mat.label + ' ' + info.row.variant) : k;

    for (let i = 0; i < data.rows.length; i++) {
      const row = data.rows[i];
      const qtyNum = parseFloat(String(row.qty || '').replace(',', '.'));
      if (!isFinite(qtyNum) || qtyNum <= 0) continue;

      if (buildingRequired && !row.building) {
        show('⚠️ ' + label + ', этаж ' + (i + 1) + ': укажите корпус', 'err');
        return false;
      }
      const isAtticRow = isAtticBuilding(row.building);
      if (!isAtticRow && !row.floor) {
        show('⚠️ ' + label + ', этаж ' + (i + 1) + ': укажите этаж', 'err');
        return false;
      }
      if (row.floor !== 'Нет' && !isAtticRow && !row.room) {
        show('⚠️ ' + label + ', этаж ' + (i + 1) + ': укажите помещения', 'err');
        return false;
      }
    }
  }
  return true;
}

function resetMainBlock(work) {
  const st = mainState[work];
  if (!st) return;
  st.materials = makeEmptyMaterialState();
  renderMaterialsForBlock(work);
}

// ============================================
//  ВАЛИДАЦИЯ ШАПКИ
// ============================================
function validateHeader() {
  let firstProblem = null;
  ['err-object'].forEach(id => {
    const el = document.getElementById(id); if (el) el.classList.remove('show');
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

// ============================================
//  ВАЛИДАЦИЯ ДОП. РАБОТ
// ============================================
function validateAdditionalOnly() {
  for (const w of LOCATION_WORKS) {
    const items = (additionalState[w.key] && additionalState[w.key].items) || [];
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const isEmptyRow = !it.building && !it.floor && !it.room && !it.value;
      if (isEmptyRow) continue;
      const needB = isBuildingRequired();
      if (needB && !it.building) { show('⚠️ ' + w.label + ', место ' + (i + 1) + ': укажите корпус', 'err'); return false; }
      const isAtticZ = (it.building === 'Чердак');
      if (!isAtticZ && !it.floor) { show('⚠️ ' + w.label + ', место ' + (i + 1) + ': укажите этаж', 'err'); return false; }
      const floorIsNo = (it.floor === 'Нет');
      const r = normalizeZadelkaRoom(it.room || '');
      if (!isAtticZ && !floorIsNo && !r) { show('⚠️ ' + w.label + ', место ' + (i + 1) + ': укажите помещения', 'err'); return false; }
      const v = parseFloat(String(it.value || '').replace(',', '.'));
      if (!isFinite(v) || v <= 0) { show('⚠️ ' + w.label + ', место ' + (i + 1) + ': укажите количество', 'err'); return false; }
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
    if (!hours || !isFinite(n) || n <= 0) mentorBad = true;
  });
  if (mentorBad) {
    show('⚠️ Укажите имя ученика (2 слова) и часы', 'err');
    const badEl = document.querySelector('.mentor-name-input.is-invalid');
    if (badEl && badEl.scrollIntoView) badEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }
  return true;
}

// ============================================
//  ПРИМЕНЕНИЕ ДОП. РАБОТ
// ============================================
function applyAdditionalToJournal() {
  let added = 0, merged = 0;

  LOCATION_WORKS.forEach(w => {
    const items = (additionalState[w.key] && additionalState[w.key].items) || [];
    items.forEach(it => {
      const isEmptyRow = !it.building && !it.floor && !it.room && !it.value;
      if (isEmptyRow) return;
      const v = parseFloat(String(it.value || '').replace(',', '.'));
      if (!isFinite(v) || v <= 0) return;
      const zRoom = applyPrefixToRoom(normalizeZadelkaRoom(it.room || ''), it.building || '');
      const zEntry = { kind: w.key, building: it.building || '', floor: it.floor || '', room: zRoom, qty: it.value };
      const idx = journal.findIndex(e =>
        e.kind === w.key && (e.building || '') === zEntry.building && (e.floor || '') === zEntry.floor
      );
      if (idx !== -1) {
        const oldQ = parseFloat(String(journal[idx].qty).replace(',', '.')) || 0;
        const newQ = oldQ + v;
        journal[idx].qty = String(Math.round(newQ * 100) / 100).replace('.', ',');
        journal[idx].room = combineRooms(journal[idx].room, zEntry.room);
        merged++;
      } else { journal.push(zEntry); added++; }
    });
  });

  additionalState.mentorship.items.forEach(m => {
    const name = String(m.name || '').trim();
    const hours = String(m.hours || '').trim();
    if (!name || !hours) return;
    const n = parseFloat(hours.replace(',', '.'));
    if (!isFinite(n) || n <= 0) return;
    const idx = journal.findIndex(e => e.kind === 'mentorship' && String(e.name).toLowerCase() === name.toLowerCase());
    if (idx !== -1) {
      const oldH = parseFloat(String(journal[idx].hours).replace(',', '.')) || 0;
      const newH = oldH + n;
      journal[idx].hours = String(Math.round(newH * 100) / 100).replace('.', ',');
      merged++;
    } else { journal.push({ kind: 'mentorship', name, hours: String(n).replace('.', ',') }); added++; }
  });

  return { added, merged };
}

// ============================================
//  ПРИМЕНЕНИЕ ОСНОВНОГО БЛОКА
// ============================================
function applyMainBlockToJournal(work) {
  const st = mainState[work];
  if (!st) return { added: 0, merged: 0 };

  let added = 0, merged = 0;

  for (const matKey in st.materials) {
    const data = st.materials[matKey];
    const info = MATERIAL_BY_KEY[matKey];
    if (!info) continue;

    for (let i = 0; i < data.rows.length; i++) {
      const row = data.rows[i];
      const qtyNum = parseFloat(String(row.qty || '').replace(',', '.'));
      if (!isFinite(qtyNum) || qtyNum <= 0) continue;

      const building = row.building || '';
      const floor = isAtticBuilding(building) ? ATTIC : (row.floor || '');
      const roomNone = (row.floor === 'Нет');
      const normalizedRoom = finalizeRooms(row.room || '');
      const room = roomNone ? 'Нет' : applyPrefixToRoom(normalizedRoom, building);

      const newEntry = {
        kind: 'main',
        building: building,
        work: work,
        floor: floor,
        room: room,
        room_none: roomNone,
        is_master_wing: isMasterWingBuilding(building),
        materials: { [matKey]: row.qty }
      };

      const idx = journal.findIndex(e =>
        e.kind === 'main' &&
        e.work === newEntry.work &&
        (e.building || '') === newEntry.building &&
        (e.floor || '') === newEntry.floor &&
        (e.room || '') === newEntry.room &&
        !!e.room_none === !!newEntry.room_none &&
        !!e.is_master_wing === !!newEntry.is_master_wing
      );

      if (idx !== -1) {
        const target = journal[idx].materials || {};
        const oldQ = parseFloat(String(target[matKey] || '').replace(',', '.')) || 0;
        const sum = oldQ + qtyNum;
        target[matKey] = String(Math.round(sum * 100) / 100).replace('.', ',');
        journal[idx].materials = target;
        merged++;
      } else {
        journal.push(newEntry);
        added++;
      }
    }
  }

  return { added, merged };
}

// ============================================
//  ОБЩАЯ КНОПКА
// ============================================
function addAllToJournal() {
  if (_addingToJournal) return false;
  _addingToJournal = true;

  const btn = document.querySelector('.btn-add-journal');
  const prevText = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Добавляем…'; }

  try {
    show('');
    if (!validateHeader()) return false;

    const pendingMainWorks = MAIN_WORKS
      .filter(({ work }) => !isMainBlockEmpty(work))
      .map(({ work }) => work);
    const hasAdd = hasActiveAdditional();

    if (pendingMainWorks.length === 0 && !hasAdd) {
      show('⚠️ Заполните хотя бы одну работу', 'err');
      showToast('Нечего добавлять');
      return false;
    }

    for (const work of pendingMainWorks) {
      if (!validateMainFieldsForBlock(work)) {
        const st = mainState[work];
        if (st && !st.expanded && !st.alwaysOpen) toggleMainAccordion(work);
        return false;
      }
    }
    if (!validateAdditionalOnly()) return false;

    let addedCount = 0, mergedCount = 0;

    pendingMainWorks.forEach(work => {
      const res = applyMainBlockToJournal(work);
      addedCount += res.added;
      mergedCount += res.merged;
      resetMainBlock(work);
    });

    const addRes = applyAdditionalToJournal();
    addedCount += addRes.added;
    mergedCount += addRes.merged;

    if (addedCount === 0 && mergedCount === 0) {
      showToast('Нечего добавлять');
      return false;
    }

    renderJournal();
    initAdditionalState();
    renderAdditionalFields();

    const parts = [];
    if (addedCount > 0) parts.push('добавлено: ' + addedCount);
    if (mergedCount > 0) parts.push('объединено: ' + mergedCount);
    showToast('В журнал — ' + parts.join(', '));
    return true;
  } finally {
    _addingToJournal = false;
    if (btn) { btn.disabled = false; btn.textContent = prevText; }
  }
}

// ============================================
//  РЕНДЕР ДОП. РАБОТ
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
      del.type = 'button'; del.className = 'zadelka-remove-btn';
      del.textContent = '× удалить место';
      del.addEventListener('click', () => {
        additionalState[workKey].items.splice(idx, 1);
        renderAdditionalFields();
      });
      group.appendChild(del);
    }

    const bLabel = document.createElement('label');
    bLabel.className = 'req';
    bLabel.innerHTML = 'Корпус <span class="req-star">*</span>';
    group.appendChild(bLabel);

    const bSeg = document.createElement('div');
    bSeg.className = 'segmented';

    if (isBuildingRequired()) {
      BUILDINGS_BY_OBJECT[objectSelect.value].forEach(val => {
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'segmented-btn';
        btn.dataset.value = val;
        if (item.building === val) btn.classList.add('active');
        btn.textContent = val;
        btn.addEventListener('click', () => {
          item.building = val; item.floor = ''; item.room = '';
          renderAdditionalFields();
        });
        bSeg.appendChild(btn);
      });
    } else {
      bSeg.classList.add('segmented-disabled');
      const hint = document.createElement('span');
      hint.className = 'segmented-hint';
      hint.textContent = objectSelect.value
        ? 'Для «' + objectSelect.value + '» корпус не используется'
        : '🔒 Сначала объект';
      bSeg.appendChild(hint);
    }
    group.appendChild(bSeg);

    const building = item.building;
    let showFloor = true;
    if (isBuildingRequired()) {
      if (!building) showFloor = false;
      else if (building === 'Чердак') showFloor = false;
    }

    if (showFloor) {
      const floorList = getFloorsFor(objectSelect.value, building);
      if (floorList) {
        const fLabel = document.createElement('label');
        fLabel.className = 'req';
        fLabel.innerHTML = 'Этаж <span class="req-star">*</span>';
        group.appendChild(fLabel);

        const fWrap = document.createElement('div');
        fWrap.className = 'segmented segmented-floors';
        fWrap.innerHTML = '<input type="hidden" class="req-field" value="">' +
          '<span class="segmented-hint">— выберите —</span>';
        group.appendChild(fWrap);

        const fSeg = new SegmentedControl(fWrap);
        fSeg.setOptions(floorList);
        if (item.floor) fSeg.value = item.floor;
        fSeg.input.addEventListener('change', () => {
          item.floor = fSeg.value; item.room = '';
          renderAdditionalFields();
        });
      }
    }

    const floor = item.floor;
    const isAtticZ = (building === 'Чердак');
    const floorIsNo = (floor === 'Нет');
    const showRoom = (!!floor || isAtticZ) && !floorIsNo;

    if (showRoom) {
      const rLabel = document.createElement('label');
      rLabel.className = 'req';
      rLabel.innerHTML = 'Помещения <span class="req-star">*</span>';
      group.appendChild(rLabel);

      const rWrap = document.createElement('div');
      rWrap.className = 'room-wrap';
      if (building === MASTER_WING) {
        const prefix = document.createElement('span');
        prefix.className = 'room-prefix';
        prefix.textContent = MASTER_WING_PREFIX;
        rWrap.appendChild(prefix);
      }

      const rInp = document.createElement('input');
      rInp.type = 'text'; rInp.className = 'req-field';
      rInp.placeholder = '12, 15, 20';
      rInp.inputMode = 'text'; rInp.autocomplete = 'off'; rInp.maxLength = 60;
      rInp.value = item.room || '';
      rInp.dataset.focusId = workKey + '_room_' + idx;
      rInp.addEventListener('input', () => {
        const before = rInp.value;
        const after = liveFormatRooms(before);
        if (before !== after) {
          rInp.value = after;
          try { rInp.setSelectionRange(after.length, after.length); } catch (_) {}
        }
        item.room = rInp.value;
      });
      rInp.addEventListener('blur', () => {
        const n = finalizeRooms(rInp.value);
        if (rInp.value !== n) rInp.value = n;
        item.room = n;
      });
      rWrap.appendChild(rInp);
      group.appendChild(rWrap);

      const hint = document.createElement('div');
      hint.className = 'hint-small';
      hint.textContent = building === MASTER_WING
        ? 'Номера через запятую. Все сохранятся с префиксом «к».'
        : 'Номера через запятую. Сохранятся по возрастанию.';
      group.appendChild(hint);
    }

    const qLine = document.createElement('div');
    qLine.className = 'variant-line';

    const minusBtn = document.createElement('button');
    minusBtn.type = 'button'; minusBtn.className = 'qty-btn qty-btn-minus';
    minusBtn.textContent = '−';
    qLine.appendChild(minusBtn);

    const qInp = document.createElement('input');
    qInp.type = 'text'; qInp.inputMode = 'decimal';
    qInp.className = 'variant-input'; qInp.placeholder = '0';
    qInp.autocomplete = 'off'; qInp.value = item.value || '';
    qInp.dataset.focusId = workKey + '_qty_' + idx;
    qLine.appendChild(qInp);

    const plusBtn = document.createElement('button');
    plusBtn.type = 'button'; plusBtn.className = 'qty-btn qty-btn-plus';
    plusBtn.textContent = '+';
    qLine.appendChild(plusBtn);

    const clearBtn = document.createElement('button');
    clearBtn.type = 'button'; clearBtn.className = 'variant-clear-btn';
    clearBtn.textContent = '×';
    clearBtn.style.display = qInp.value ? 'inline-flex' : 'none';
    qLine.appendChild(clearBtn);

    const unit = document.createElement('span');
    unit.className = 'variant-unit';
    unit.textContent = work.unit;
    qLine.appendChild(unit);

    qInp.addEventListener('input', () => {
      const before = qInp.value; const after = formatQty(before);
      if (before !== after) { qInp.value = after; qInp.setSelectionRange(after.length, after.length); }
      item.value = qInp.value;
      clearBtn.style.display = qInp.value ? 'inline-flex' : 'none';
      updateMinusState(qInp, minusBtn);
    });
    minusBtn.addEventListener('click', () => bumpQty(qInp, v => { item.value = v; }, -1, clearBtn, minusBtn));
    plusBtn.addEventListener('click', () => bumpQty(qInp, v => { item.value = v; }, 1, clearBtn, minusBtn));
    clearBtn.addEventListener('click', () => {
      qInp.value = ''; item.value = '';
      clearBtn.style.display = 'none';
      updateMinusState(qInp, minusBtn); qInp.focus();
    });

    updateMinusState(qInp, minusBtn);
    group.appendChild(qLine);
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button'; addBtn.className = 'btn-add-mentor';
  addBtn.textContent = '+ Добавить место';
  addBtn.addEventListener('click', () => {
    additionalState[workKey].items.push(makeLocationItem());
    renderAdditionalFields();
  });
  group.appendChild(addBtn);

  container.appendChild(group);
}

function renderMentorshipFields(container) {
  const group = document.createElement('div');
  group.className = 'additional-group';

  const name = document.createElement('div');
  name.className = 'additional-group-name';
  name.textContent = SECTION_MENTOR;
  group.appendChild(name);

  const subtitle = document.createElement('div');
  subtitle.className = 'hint-small';
  subtitle.style.marginBottom = '6px';
  subtitle.textContent = 'Укажите имя и фамилию ученика и количество часов';
  group.appendChild(subtitle);

  additionalState.mentorship.items.forEach((m, idx) => {
    const line = document.createElement('div');
    line.className = 'variant-line';

    const nameIn = document.createElement('input');
    nameIn.type = 'text'; nameIn.className = 'mentor-name-input';
    nameIn.placeholder = 'Иван Иванов';
    nameIn.autocomplete = 'off'; nameIn.autocapitalize = 'words';
    nameIn.spellcheck = false; nameIn.maxLength = 40;
    nameIn.value = m.name || '';
    nameIn.dataset.focusId = 'mentor_name_' + idx;
    nameIn.addEventListener('input', () => {
      const before = nameIn.value; const pos = nameIn.selectionStart;
      const after = formatName(before);
      if (before !== after) {
        nameIn.value = after;
        const delta = before.length - after.length;
        const newPos = Math.max(0, Math.min(after.length, pos - delta));
        nameIn.setSelectionRange(newPos, newPos);
      }
      m.name = nameIn.value;
      updateNameVisual(nameIn, inputH);
    });
    nameIn.addEventListener('blur', () => updateNameVisual(nameIn, inputH));
    line.appendChild(nameIn);

    const minusBtn = document.createElement('button');
    minusBtn.type = 'button'; minusBtn.className = 'qty-btn qty-btn-minus';
    minusBtn.textContent = '−';
    line.appendChild(minusBtn);

    const inputH = document.createElement('input');
    inputH.type = 'text'; inputH.inputMode = 'decimal';
    inputH.className = 'variant-input';
    inputH.dataset.focusId = 'mentor_hours_' + idx;
    inputH.placeholder = '0'; inputH.autocomplete = 'off';
    inputH.value = m.hours || '';
    line.appendChild(inputH);

    const plusBtn = document.createElement('button');
    plusBtn.type = 'button'; plusBtn.className = 'qty-btn qty-btn-plus';
    plusBtn.textContent = '+';
    line.appendChild(plusBtn);

    const delBtn = document.createElement('button');
    delBtn.type = 'button'; delBtn.className = 'variant-clear-btn';
    delBtn.textContent = '×';
    delBtn.style.display = additionalState.mentorship.items.length > 1 ? 'inline-flex' : 'none';
    line.appendChild(delBtn);

    const unit = document.createElement('span');
    unit.className = 'variant-unit';
    unit.textContent = 'ч';
    line.appendChild(unit);

    inputH.addEventListener('input', () => {
      const before = inputH.value; const after = formatQty(before);
      if (before !== after) { inputH.value = after; inputH.setSelectionRange(after.length, after.length); }
      m.hours = inputH.value;
      updateMinusState(inputH, minusBtn);
      updateNameVisual(nameIn, inputH);
    });
    minusBtn.addEventListener('click', () => {
      bumpQty(inputH, v => { m.hours = v; }, -1, null, minusBtn);
      updateNameVisual(nameIn, inputH);
    });
    plusBtn.addEventListener('click', () => {
      bumpQty(inputH, v => { m.hours = v; }, 1, null, minusBtn);
      updateNameVisual(nameIn, inputH);
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
    updateNameVisual(nameIn, inputH);
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button'; addBtn.className = 'btn-add-mentor';
  addBtn.textContent = '+ Добавить ученика';
  addBtn.addEventListener('click', () => {
    additionalState.mentorship.items.push({ name: '', hours: '' });
    renderAdditionalFields();
  });
  group.appendChild(addBtn);

  container.appendChild(group);
}

function renderAdditionalFields() {
  if (!additionalFields) return;
  const active = document.activeElement;
  const focusId = active && active.dataset ? active.dataset.focusId : null;
  const selStart = active && typeof active.selectionStart === 'number' ? active.selectionStart : null;

  additionalFields.innerHTML = '';
  LOCATION_WORKS.forEach(w => renderLocationFields(w.key, additionalFields));
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
function materialsMapToArray(map) {
  const list = [];
  MATERIALS.forEach(mat => {
    mat.rows.forEach(r => {
      const raw = String((map[r.key] || '')).trim();
      if (!raw) return;
      const num = parseFloat(raw.replace(',', '.'));
      if (!isFinite(num) || num <= 0) return;
      list.push({
        name: r.tableName || (mat.label + ' ' + r.variant),
        unit: mat.unit,
        qty: raw.replace(',', '.'),
        system: r.system
      });
    });
  });
  return list;
}

// ============================================
//  ЧИСЛО
// ============================================
function parseQty(raw) {
  const s = String(raw || '').trim(); if (!s) return 0;
  const n = parseFloat(s.replace(',', '.'));
  return isFinite(n) ? n : 0;
}
function updateMinusState(input, minusBtn) { minusBtn.disabled = parseQty(input.value) <= 0; }
function bumpQty(input, setter, delta, clearBtn, minusBtn) {
  const num = parseQty(input.value);
  let next = num + delta; if (next < 0) next = 0;
  const formatted = next === 0 ? '' : formatQty(String(next).replace('.', ','));
  input.value = formatted; setter(formatted);
  if (clearBtn) clearBtn.style.display = formatted ? 'inline-flex' : 'none';
  updateMinusState(input, minusBtn);
}

// ============================================
//  ЖУРНАЛ
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
  editBtn.type = 'button'; editBtn.className = 'journal-btn journal-btn-edit';
  editBtn.title = 'Изменить'; editBtn.textContent = '✏️';
  editBtn.addEventListener('click', () => editJournalEntry(realIdx));
  actions.appendChild(editBtn);

  const delBtn = document.createElement('button');
  delBtn.type = 'button'; delBtn.className = 'journal-btn journal-btn-del';
  delBtn.title = 'Удалить'; delBtn.textContent = '🗑';
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
    matsArr = materialsMapToArray(entry.materials || {});
  } else if (isLocationKind(entry.kind)) {
    const w = locationWorkByKey(entry.kind);
    matsArr = [{ name: w ? w.label : entry.kind, unit: w ? w.unit : 'шт',
      qty: entry.qty.replace(',', '.'), system: '' }];
  } else if (entry.kind === 'mentorship') {
    matsArr = [{ name: entry.name, unit: 'ч',
      qty: entry.hours.replace(',', '.'), system: '' }];
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

function renderJournal() {
  saveDraft();
  journalCount.textContent = journal.length > 0 ? '(' + journal.length + ')' : '';
  updateSendButton();

  if (journal.length === 0) {
    journalCont.innerHTML = ''; journalEmpty.style.display = 'block'; return;
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

      const bKeys = Object.keys(byBuilding).sort((a, b) => buildingWeight(a) - buildingWeight(b));
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
//  РЕДАКТИРОВАНИЕ ИЗ ЖУРНАЛА
// ============================================
function editJournalEntry(idx) {
  const entry = journal[idx];
  if (!entry) return;

  if (entry.kind === 'main') {
    const st = mainState[entry.work];
    if (!st) return;

    journal.splice(idx, 1);
    renderJournal();
    if (!st.expanded && !st.alwaysOpen) toggleMainAccordion(entry.work);

    const matKey = Object.keys(entry.materials || {})[0];
    if (matKey && st.materials[matKey]) {
      const data = st.materials[matKey];
      let targetRow = data.rows.find(r => !r.qty && !r.building && !r.floor && !r.room);
      if (!targetRow) { targetRow = makeEmptyMatRow(); data.rows.push(targetRow); }
      targetRow.building = entry.building || '';
      targetRow.floor = entry.floor === ATTIC ? '' : (entry.floor || '');
      targetRow.room = entry.room === 'Нет' ? 'Нет' : stripPrefixFromRoom(entry.room || '');
      targetRow.qty = entry.materials[matKey];
    }

    renderMaterialsForBlock(entry.work);

    const card = document.getElementById('entry-card');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast('Запись загружена — нажмите «Добавить всё в журнал»');
    return;
  }

  journal.splice(idx, 1);
  renderJournal();

  if (isLocationKind(entry.kind)) {
    additionalState[entry.kind].items = [{
      building: entry.building || '',
      floor: entry.floor || '',
      room: stripPrefixFromRoom(entry.room || ''),
      value: entry.qty || ''
    }];
    renderAdditionalFields();
  } else if (entry.kind === 'mentorship') {
    additionalState.mentorship.items = [{ name: entry.name || '', hours: entry.hours || '' }];
    renderAdditionalFields();
  }

  const card = document.getElementById('additional-card');
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('Запись загружена — нажмите «Добавить всё в журнал»');
}

function removeJournalEntry(idx) {
  if (!journal[idx]) return;
  journal.splice(idx, 1);
  renderJournal();
  showToast('Запись удалена');
}

// ============================================
//  ФОРМАТ ИМЕНИ
// ============================================
function formatName(value) {
  let cleaned = value.replace(/[^А-Яа-яЁёA-Za-z\s-]/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ').replace(/-+/g, '-').replace(/\s-|-\s/g, '-');
  cleaned = cleaned.replace(/(^|\s|-)([а-яёa-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());
  const parts = cleaned.split(' ');
  if (parts.length > 2) cleaned = parts.slice(0, 2).join(' ');
  return cleaned;
}

// ============================================
//  ПОДСВЕТКА ПОЛЕЙ
// ============================================
function updateFieldState(el) {
  if (el.id === 'name') { updateNameVisual(el); return; }
  if (el.classList.contains('mentor-name-input')) {
    const idx = String(el.dataset.focusId || '').replace('mentor_name_', '');
    const hoursEl = document.querySelector('[data-focus-id="mentor_hours_' + idx + '"]');
    updateNameVisual(el, hoursEl); return;
  }
  const wrap = el.closest && el.closest('.segmented');
  if (wrap) {
    if (el.disabled || wrap.classList.contains('segmented-disabled')) {
      wrap.classList.remove('is-empty', 'is-filled'); return;
    }
    wrap.classList.remove('is-empty', 'is-filled');
    const isEmpty = !el.value || !el.value.trim();
    wrap.classList.toggle('is-empty', isEmpty);
    wrap.classList.toggle('is-filled', !isEmpty);
    return;
  }
  if (!el.classList.contains('req-field')) return;
  if (el.disabled) { el.classList.remove('is-empty', 'is-filled', 'is-invalid'); return; }
  const isEmpty = !el.value || !el.value.trim();
  el.classList.toggle('is-empty', isEmpty);
  el.classList.toggle('is-filled', !isEmpty);
}

['date', 'name', 'object'].forEach(id => {
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
//  ОБРАБОТЧИКИ ШАПКИ
// ============================================
objectSelect.addEventListener('change', () => {
  updateFieldState(objectSelect);

  MAIN_WORKS.forEach(({ work }) => {
    const st = mainState[work];
    if (st) st.materials = makeEmptyMaterialState();
  });

  MAIN_WORKS.forEach(({ work }) => { _mainBlockStatus[work] = null; });

  updateAllMainBlocks();
  updateAdditionalAccessibility();

  LOCATION_WORKS.forEach(w => {
    if (additionalState[w.key]) additionalState[w.key].items = [makeLocationItem()];
  });
  renderAdditionalFields();
});

nameInput.addEventListener('input', () => {
  const before = nameInput.value; const pos = nameInput.selectionStart;
  const after = formatName(before);
  if (before !== after) {
    nameInput.value = after;
    const delta = before.length - after.length;
    const newPos = Math.max(0, Math.min(after.length, pos - delta));
    nameInput.setSelectionRange(newPos, newPos);
  }
  if (isNameValid(nameInput.value)) nameErr.classList.remove('show');
  updateFieldState(nameInput);
  refreshNameGates();
});

nameInput.addEventListener('blur', () => {
  updateFieldState(nameInput);
  const v = nameInput.value.trim();
  if (v && !isNameValid(v)) {
    nameErr.textContent = 'Введите Имя и Фамилию — ровно 2 слова (например: Василий Пупкин)';
    nameErr.classList.add('show');
  } else nameErr.classList.remove('show');
  refreshNameGates();
});

// ============================================
//  ОТПРАВКА
// ============================================
async function sendAll() {
  if (_sending) return;
  _sending = true;

  const btn = document.getElementById('btn');
  const prevText = btn ? btn.textContent : 'Отправить отчет';
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Отправляем…'; }

  try {
    show('');
    if (!validateHeader()) return;

    const hasPendingMain = MAIN_WORKS.some(({ work }) => !isMainBlockEmpty(work));
    const hasPendingAdditional = hasActiveAdditional();

    if (hasPendingMain || hasPendingAdditional) {
      const doAdd = confirm('В форме есть незанесённые работы. Добавить их в журнал перед отправкой?');
      if (doAdd) { const ok = addAllToJournal(); if (!ok) return; }
    }

    if (journal.length === 0) { show('⚠️ Журнал пуст. Добавьте хотя бы одну запись.', 'err'); return; }
    if (isOffline()) {
      show('📵 Нет подключения к интернету. Проверьте сеть и попробуйте снова.', 'err');
      showToast('📵 Нет подключения'); return;
    }

    show('🔄 Проверяем соединение...', '');
    const reachable = await checkConnection();
    show('');

    if (!reachable) {
      const proceed = confirm(
        '📵 Не удалось связаться с сервером.\n\n' +
        'Возможно, сеть нестабильна или сервер недоступен.\n\n' +
        'Отправить всё равно?'
      );
      if (!proceed) { show('⚠️ Отправка отменена.', 'err'); return; }
    }

    const sortedJournal = journal.slice().sort(compareEntries);
    const records = [];

    sortedJournal.forEach(entry => {
      if (entry.kind === 'main') {
        records.push({
          room: entry.room || '',
          room_none: entry.room_none,
          floor: entry.floor || '',
          work: entry.work,
          materials: materialsMapToArray(entry.materials || {})
        });
      } else if (isLocationKind(entry.kind)) {
        const w = locationWorkByKey(entry.kind);
        const z = parseFloat(String(entry.qty).replace(',', '.'));
        if (!isFinite(z) || z <= 0) return;
        records.push({
          room: entry.room || '', room_none: false, floor: entry.floor || '',
          work: WORK_ADDITIONAL,
          materials: [{ name: w.label, unit: w.unit, qty: String(z), system: '' }]
        });
      } else if (entry.kind === 'mentorship') {
        const h = parseFloat(String(entry.hours).replace(',', '.'));
        if (!isFinite(h) || h <= 0) return;
        records.push({
          room: '', room_none: false, floor: '',
          work: WORK_ADDITIONAL,
          materials: [{ name: 'Наставничество — ' + entry.name, unit: 'ч', qty: String(h), system: '' }]
        });
      }
    });

    const payload = {
      object: objectSelect.value.trim(),
      date: dateInput.value.trim(),
      name: nameInput.value.trim(),
      records: records
    };

    const totalRows = records.reduce((sum, r) =>
      sum + (r.materials.length === 0 ? 1 : r.materials.length), 0);

    showProgress(totalRows);
    let shown = 0;
    const tickMs = Math.max(60, Math.floor(1800 / totalRows));
    const ticker = setInterval(() => {
      if (shown < totalRows - 1) { shown++; updateProgress(shown, totalRows); }
    }, tickMs);

    try {
      await fetch(API_URL, {
        method: 'POST', mode: 'no-cors',
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
      MAIN_WORKS.forEach(({ work }) => resetMainBlock(work));
      initAdditionalState();
      renderAdditionalFields();

      setupDateRange();
      dateInput.value = toISODate(new Date());
      updateDateHighlight();
    } catch (e) {
      clearInterval(ticker);
      hideProgress();
      show('❌ Ошибка: ' + e.message, 'err');
    }
  } finally {
    _sending = false;
    if (btn) { btn.disabled = false; btn.textContent = prevText; }
    updateSendButton();
  }
}

// ============================================
//  СТАРТ
// ============================================
initMainWorks();
initAdditionalState();
renderAdditionalFields();
refreshNameGates();

const _restoredDraft = loadDraft();
if (_restoredDraft && _restoredDraft.length > 0) journal.push(..._restoredDraft);
renderJournal();
updateSendButton();
setupConnectionWatcher();

if (_restoredDraft && _restoredDraft.length > 0) {
  setTimeout(() => showToast('📂 Восстановлено записей: ' + _restoredDraft.length), 700);
}

window.addAllToJournal = addAllToJournal;
window.sendAll = sendAll;
