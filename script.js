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
  'Ларинская гимназия': ['1', '2', '3'],
  'ЖЕДЕПОМ':            ['Подвал', '1', '2', '3', 'Чердак']
};

const FLOORS_OVERRIDE_BY_BUILDING = {
  'Крыло мастерских': ['1', '2']
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
  { key: 'burenie',      label: 'Бурение проходок',                  unit: 'шт'  },
  { key: 'raskluchenie', label: 'Расключение',                       unit: 'шт'  },
  { key: 'kryshki',      label: 'Установка крышек кабель-канала',    unit: 'м'   },
  { key: 'zatyazhka',    label: 'Затяжка кабеля в гофру',            unit: 'м'   },
  { key: 'zadelka',      label: 'Штукатурка',                        unit: 'шт'  },
  { key: 'tura',         label: 'Тура (монтаж/демонтаж)',            unit: 'раз' },
  { key: 'strahovka',    label: 'Страховка лестницы',                unit: 'ч'   }
];

const SHEET_WORK_MONTAGE = [
  'zadelka', 'burenie', 'raskluchenie', 'kryshki', 'zatyazhka'
];

const SHEET_SYSTEM_APS_SOUE = [
  'zadelka', 'raskluchenie', 'burenie', 'zatyazhka', 'kryshki'
];

function getSheetWorkForLocation(kind) {
  if (SHEET_WORK_MONTAGE.indexOf(kind) !== -1) return 'Монтаж';
  return WORK_ADDITIONAL;
}

function getSheetSystemForLocation(kind) {
  if (SHEET_SYSTEM_APS_SOUE.indexOf(kind) !== -1) return 'АПС/СОУЭ';
  return '';
}

function isLocationKind(kind) { return LOCATION_WORKS.some(w => w.key === kind); }
function locationWorkByKey(key) { return LOCATION_WORKS.find(w => w.key === key) || null; }
function locationWorkByLabel(label) { return LOCATION_WORKS.find(w => w.label === label) || null; }

// ============================================
//  КООРДИНАТЫ ПОМЕЩЕНИЙ
// ============================================
const ROOM_COORDS = {
  'Ларинская гимназия': {
    'Чердак': {
      '1': 'В-Е/1-5',
      '2': 'Ш-Е/5-7',
      '3': 'В-Ш/5-7',
      '4': 'Г-Ш/7-8',
      '5': 'А-В/1-3',
      '6': 'А-Б/3-6',
      '7': 'А-Б/6-9'
    },
    'Основное здание': {
      '1': {
        '1': 'И-К/2-4',  '2': 'И-Л/2-4',  '3': 'И-К/1-2',  '4': 'К-М/1-2',
        '5': 'М-Н/1-2',  '6': 'Н-П/1-2',  '7': 'П-Р/1-2',  '8': 'Р-С/1-2',
        '9': 'М-С/2-3',  '10': 'М-Р/3-8', '11': 'Р-С/3-4', '12': 'П-С/2-3',
        '13': 'Р-С/3-4', '14': 'Р-С/3-4', '15': 'Р-С/3-5', '16': 'Р-С/5-6',
        '17': 'Р-С/5-6', '18': 'Р-С/6-7', '19': 'Р-С/6-7', '20': 'П-С/8-9',
        '21': 'П-С/9-10','22': 'П-С/10-11','23': 'Р-С/11-13','24': 'П-Р/11-13',
        '25': 'О-Р/10-11','26': 'К-Н/10-13','27': 'М-Н/13-17','28': 'М-Н/13-17',
        '29': 'И-К/10-13','30': 'Ж-И/10-13','31': 'И-М/13-17','32': 'З-И/13-17',
        '33': 'Ж-З/13-17','34': 'З-И/13-17','35': 'Ж-И/13-17','36': 'Е-Ж/13-17',
        '37': 'Е-Ж/13-17','38': 'Д-Е/12-13','39': 'Д-Е/12-13','40': 'В-Д/11-13',
        '41': 'Г-Д/12-13','42': 'Е-Ж/10-13','43': 'Г-Ж/8-10', '44': 'Е-Ж/7-9',
        '45': 'Г-Е/7-9', '46': 'Г-Ж/5-7', '47': 'Е-Ж/4-5', '48': 'Г-Е/3-5',
        '49': 'Г-Е/3-4', '50': 'Е-Ж/3-4', '51': 'З-И/2-3', '52': 'З-И/3-4',
        '53': 'Е-З/2-4', '54': 'Ж-И/1-2', '55': 'Е-З/2-3', '56': 'Е-Ж/2-3',
        '57': 'Е-Ж/1-2', '58': 'Д-Е/2-3', '59': 'Д-Е/1-3', '60': 'Г-Д/1-3',
        '61': 'Г-Е/1-2', '62': 'Г-Е/1-2', '63': 'А-Г/1-2', '64': 'В-Г/2-4',
        '65': 'Б-Г/2-4', '66': 'А-Б/2-3'
      },
      '2': {
        '1': 'И-М/1-2',  '2': 'Ж-И/1-2',  '3': 'Ж-З/1-2',  '4': 'Д-Ж/1-2',
        '5': 'В-Д/1-2',  '6': 'Б-В/1-2',  '7': 'А-Б/1-2',  '8': 'А-Б/2-3',
        '9': 'А-Б/2-3',  '10': 'А-Б/3-4', '11': 'В-Д/2-5', '12': 'Б-В/3-5',
        '13': 'Б-В/5-6', '14': 'Б-В/6-7', '15': 'Б-Г/5-9', '16': 'А-Б/8-9',
        '17': 'А-Б/8-9', '18': 'Б-Г/9-10','19': 'Г-Д/8-9', '20': 'Г-Д/7-9',
        '21': 'Д-Ж/7-9', '22': 'Д-Ж/8-9', '23': 'Д-Ж/10-12','24': 'Г-З/9-10',
        '25': 'Ж-З/7-9', '26': 'З-К/7-8', '27': 'И-К/9-10','28': 'К-М/8-9',
        '29': 'К-М/6-8', '30': 'К-М/5-6', '31': 'Л-М/4-5', '32': 'К-Л/4-5',
        '33': 'Л-М/3-4', '34': 'Л-М/2-4', '35': 'Л-М/2-3', '36': 'Е-Л/2-4',
        '37': 'Д-Е/2-4'
      },
      '3': {
        '1': 'И-К/1-2',  '2': 'И-К/2-3',  '3': 'И-К/2-4',  '4': 'И-К/4-5',
        '5': 'З-К/2-4',  '6': 'И-К/4-5',  '7': 'Ж-З/2-4',  '8': 'Е-К/2-3',
        '9': 'З-К/1-2',  '10': 'Ж-З/1-2', '11': 'Е-Ж/1-2', '12': 'Е-Ж/2-4',
        '13': 'Д-Е/1-2', '14': 'Г-Е/1-2', '15': 'В-Д/1-2', '16': 'Б-Д/2-3',
        '17': 'Г-Д/2-4', '18': 'Б-Г/2-4', '19': 'Б-Г/1-2', '20': 'А-Б/1-2',
        '21': 'А-В/3-5'
      }
    },
    'Крыло мастерских': {
      '1': {
        '1': 'А-В/15-16','2': 'А-В/14-15','3': 'А-В/13-14','4': 'А-В/12-13',
        '5': 'Б-В/12-14','6': 'В-Г/1-2',  '7': 'А-В/1-2',  '8': 'Б-В/2-3',
        '9': 'Б-В/3-4',  '10': 'А-Б/3-5', '11': 'Б-В/4-6', '12': 'А-Б/4-5',
        '13': 'А-Б/4-6', '14': 'Б-В/6-8', '15': 'А-В/4-10','16': 'Б-В/8-9',
        '17': 'Б-В/9-10','18': 'Б-В/9-10','19': 'Б-В/9-10','20': 'А-Б/9-10',
        '21': 'Б-В/10-11','22': 'Б-В/11-12','23': 'Б-В/11-12','24': 'Б-В/11-12',
        '25': 'А-В/11-12','26': 'А-В/11-12','27': 'А-Б/11-12'
      },
      '2': {
        '1': 'Б-В/7-8',  '2': 'А-Б/7-8',  '3': 'А-В/6-7',  '4': 'А-В/6-7',
        '5': 'В-Г/2-3',  '6': 'В-Г/2-3',  '7': 'В-Г/1-2',  '8': 'Б-Г/1-2',
        '9': 'А-В/1-2',  '10': 'А-Б/2-3', '11': 'Б-В/2-4', '12': 'А-Б/2-4',
        '13': 'А-В/3-5', '14': 'А-В/4-5', '15': 'А-Б/5-6'
      }
    }
  }
};

function lookupRoomCoords(object, building, floor, num) {
  if (object !== 'Ларинская гимназия') return null;
  const objData = ROOM_COORDS[object];
  if (!objData) return '';
  const buildData = objData[building];
  if (!buildData) return '';
  if (building === ATTIC) {
    return buildData[String(num)] || '';
  }
  const floorData = buildData[String(floor)];
  if (!floorData) return '';
  return floorData[String(num)] || '';
}

function applyCoordsToRoomString(roomStr, object, building, floor) {
  if (!roomStr) return roomStr || '';
  if (object !== 'Ларинская гимназия') return roomStr;

  const parts = String(roomStr).split(',').map(p => p.trim()).filter(Boolean);
  const out = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const m = part.match(/^([кК]?)(\d+)$/);
    if (!m) { out.push(part); continue; }
    const prefix = m[1] || '';
    const n = m[2];
    const coords = lookupRoomCoords(object, building, floor, n);
    if (coords === null || coords === '') {
      out.push(prefix + n + '(?)');
    } else {
      out.push(prefix + n + '(' + coords + ')');
    }
  }
  return out.join(', ');
}

// ============================================
//  МАТЕРИАЛЫ
// ============================================
const MATERIALS = [
  { id: 'cable', label: 'Кабель КПСЭнг(A)FRHF "Технокабель" 1x2x', unit: 'м', rows: [
    { key: 'cable_075_aps', variant: 'х0,75', system: 'АПС', tableName: 'Кабель КПСЭнг(A)FRHF "Технокабель" 1x2x0,75' },
    { key: 'cable_1_soue',  variant: 'х1',    system: 'СОУЭ', tableName: 'Кабель КПСЭнг(A)FRHF "Технокабель" 1x2x1' }
  ]},
  { id: 'channel', label: 'Кабель-канал белый ECOLINE IEK', unit: 'м', rows: [
    { key: 'channel_40x25', variant: '40х25', system: 'АПС/СОУЭ', tableName: 'Кабель-канал белый ECOLINE IEK 40x25' },
    { key: 'channel_25x16', variant: '25х16', system: 'АПС/СОУЭ', tableName: 'Кабель-канал белый ECOLINE IEK 25x16' }
  ]},
  { id: 'corrugated', label: 'Труба гофрированная ПВХ, серая', unit: 'м', prefix: 'd=', rows: [
    { key: 'corrugated_20', variant: '20 мм', system: 'АПС/СОУЭ', tableName: 'Труба гофрированная ПВХ, серая d=20мм' },
    { key: 'corrugated_16', variant: '16 мм', system: 'АПС/СОУЭ', tableName: 'Труба гофрированная ПВХ, серая d=16мм' }
  ]},
  { id: 'steel', label: 'Труба стальная ВГП ДУ ГОСТ 3262-75', unit: 'м', prefix: 'd=', rows: [
    { key: 'steel_15', variant: '15 мм', system: 'АПС/СОУЭ', tableName: 'Труба стальная ВГП ДУ ГОСТ 3262-75 15×2,8 мм.' },
    { key: 'steel_20', variant: '20 мм', system: 'АПС/СОУЭ', tableName: 'Труба стальная ВГП ДУ ГОСТ 3262-75 20×2,8 мм.' }
  ]},
  { id: 'vata', label: 'Вата минеральная', unit: 'шт', montageOnly: true, rows: [
    { key: 'vata', variant: '', system: 'АПС/СОУЭ', tableName: 'Вата минеральная' }
  ]},
  { id: 'germetik', label: 'Герметик огнезащитный "ОГНЕЗА-ГТ"', unit: 'шт', montageOnly: true, rows: [
    { key: 'germetik', variant: '', system: 'АПС/СОУЭ', tableName: 'Герметик огнезащитный "ОГНЕЗА-ГТ"' }
  ]},
  { id: 'birki', label: 'Бирки кабельные У-136, 55×62 мм', unit: 'шт', montageOnly: true, rows: [
    { key: 'birki', variant: '', system: 'АПС/СОУЭ', tableName: 'Бирки кабельные У-136, 55×62 мм' }
  ]}
];

const MATERIAL_BY_KEY = (() => {
  const m = {};
  MATERIALS.forEach(mat => mat.rows.forEach(r => { m[r.key] = { mat, row: r }; }));
  return m;
})();

function isMatAvailableForWork(mat, work) {
  if (mat.montageOnly && work !== 'Монтаж') return false;
  return true;
}

// ============================================
//  СОСТОЯНИЕ
// ============================================
const mainState = {};
const _mainBlockStatus = {};

const _matGroupExpanded = {};
const _addGroupExpanded = {};

function makeEmptyMatRow() { return { building: '', floor: '', room: '', qty: '' }; }

function makeEmptyMaterialState(work) {
  const s = {};
  MATERIALS.forEach(mat => {
    if (!isMatAvailableForWork(mat, work)) return;
    mat.rows.forEach(r => {
      s[r.key] = { rows: [makeEmptyMatRow()] };
    });
  });
  return s;
}

function clearMatGroupExpansion() {
  for (const k in _matGroupExpanded) delete _matGroupExpanded[k];
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
let _reviewOpen = false;

// Блокировка/разблокировка всей страницы
function lockApp() { document.body.classList.add('app-blocked'); }
function unlockApp() { document.body.classList.remove('app-blocked'); }

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
  let s = String(raw == null ? '' : raw);
  const trailingDelim = /[^0-9]$/.test(s) && s.length > 0;

  s = s.replace(/[^0-9]+/g, ',');
  s = s.replace(/^,+/, '');

  if (!s) return '';

  const parts = s.split(',');
  let intPart = parts[0] || '';
  let fracAll = parts.slice(1).join('');

  if (intPart.length > 1 && intPart.charAt(0) === '0') {
    const extra = intPart.slice(1);
    intPart = '0';
    fracAll = extra + fracAll;
  }

  if (intPart.length > 4) intPart = intPart.slice(0, 4);
  if (fracAll.length > 3) fracAll = fracAll.slice(0, 3);

  if (fracAll) return intPart + ',' + fracAll;
  if (trailingDelim && s.indexOf(',') !== -1 && intPart) return intPart + ',';
  return intPart;
}

// ============================================
//  ФОРМАТИРОВАНИЕ ПОМЕЩЕНИЙ
// ============================================
function liveFormatRooms(raw, isDeleting) {
  let s = String(raw == null ? '' : raw);
  if (!s) return '';

  const trailingDelim = /[^0-9]$/.test(s);

  s = s.replace(/[^0-9]+/g, ', ');
  s = s.replace(/^(?:,\s*)+/, '');
  s = s.replace(/,\s*/g, ', ');
  s = s.trim();

  if (trailingDelim && s && !isDeleting) s += ' ';
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

function setupRoomInput(input, onValueChanged) {
  input.addEventListener('input', () => {
    const raw = input.value;
    const posBefore = (typeof input.selectionStart === 'number') ? input.selectionStart : raw.length;
    const wasAtEnd = posBefore === raw.length;
    const prevLen = typeof input._prevLen === 'number' ? input._prevLen : raw.length;
    const isDeleting = raw.length < prevLen;
    input._prevLen = raw.length;

    const formatted = liveFormatRooms(raw, isDeleting);

    if (formatted !== raw) {
      input.value = formatted;
      let newPos;
      if (wasAtEnd) newPos = formatted.length;
      else {
        const delta = formatted.length - raw.length;
        newPos = Math.max(0, Math.min(formatted.length, posBefore + delta));
      }
      try { input.setSelectionRange(newPos, newPos); } catch (_) {}
    }

    if (typeof onValueChanged === 'function') onValueChanged(input.value);
  });
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
  const w = { 'Подвал': -1, '1': 1, '2': 2, '3': 3, 'Чердак': 100, '': 900 };
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

function compareForSheet(a, b) {
  const aMent = a.kind === 'mentorship';
  const bMent = b.kind === 'mentorship';
  if (aMent !== bMent) return aMent ? 1 : -1;

  const fa = floorWeight(a.floor || '');
  const fb = floorWeight(b.floor || '');
  if (fa !== fb) return fa - fb;

  const ra = roomSortKey(a.room || '');
  const rb = roomSortKey(b.room || '');
  if (ra !== rb) return ra - rb;

  const sa = String(a.room || '');
  const sb = String(b.room || '');
  if (sa !== sb) return sa.localeCompare(sb);

  return workWeight(a.work) - workWeight(b.work);
}

function formatFloorLabel(floor) {
  if (!floor) return '';
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
  const roomLabel = 'пом. ' + (entry.is_master_wing ? MASTER_WING_PREFIX : '') + entry.room;
  if (!floorLabel) return roomLabel.charAt(0).toUpperCase() + roomLabel.slice(1);
  return floorLabel + ' · ' + roomLabel;
}

function formatRuDate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || '';
  const parts = iso.split('-');
  return parts[2] + '.' + parts[1] + '.' + parts[0];
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
      materials: makeEmptyMaterialState(work),
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
//  ХИНТЫ ДЛЯ СВОРАЧИВАЕМЫХ ГРУПП
// ============================================
function getMatGroupHint(mat, state) {
  let filled = 0;
  mat.rows.forEach(r => {
    const data = state[r.key];
    if (!data) return;
    data.rows.forEach(row => {
      if (row.qty) filled++;
    });
  });
  return filled > 0 ? (filled + ' зап.') : '';
}

function getLocationGroupHint(workKey) {
  const items = (additionalState[workKey] && additionalState[workKey].items) || [];
  const w = locationWorkByKey(workKey);
  const unit = w ? w.unit : '';
  let sum = 0, count = 0;
  items.forEach(it => {
    const v = parseFloat(String(it.value || '').replace(',', '.'));
    if (isFinite(v) && v > 0) { sum += v; count++; }
  });
  if (count === 0) return '';
  const s = String(Math.round(sum * 100) / 100).replace('.', ',');
  return s + ' ' + unit;
}

function getMentorshipGroupHint() {
  const items = additionalState.mentorship.items || [];
  let sum = 0, count = 0;
  items.forEach(m => {
    const v = parseFloat(String(m.hours || '').replace(',', '.'));
    if (isFinite(v) && v > 0) { sum += v; count++; }
  });
  if (count === 0) return '';
  const s = String(Math.round(sum * 100) / 100).replace('.', ',');
  return s + ' ч';
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
    if (!isMatAvailableForWork(mat, work)) return;

    const groupEl = document.createElement('div');
    groupEl.className = 'mat-group';
    const expKey = work + '|' + mat.id;
    const isExpanded = !!_matGroupExpanded[expKey];
    if (isExpanded) groupEl.classList.add('expanded');

    const headerEl = document.createElement('button');
    headerEl.type = 'button';
    headerEl.className = 'mat-group-header';

    const arrow = document.createElement('span');
    arrow.className = 'mat-group-arrow';
    arrow.textContent = '▸';

    const title = document.createElement('span');
    title.className = 'mat-group-title';
    title.textContent = mat.label;

    const hint = document.createElement('span');
    hint.className = 'mat-group-hint';
    hint.textContent = getMatGroupHint(mat, state);

    headerEl.appendChild(arrow);
    headerEl.appendChild(title);
    headerEl.appendChild(hint);

    headerEl.addEventListener('click', () => {
      _matGroupExpanded[expKey] = !_matGroupExpanded[expKey];
      renderMaterialsForBlock(work);
    });
    groupEl.appendChild(headerEl);

    const bodyEl = document.createElement('div');
    bodyEl.className = 'mat-group-body';

    mat.rows.forEach(r => {
      const data = state[r.key];
      if (!data) return;

      const card = document.createElement('div');
      card.className = 'mat-card';
      card.dataset.matKey = r.key;

      const isSimple = !r.variant && mat.rows.length === 1;

      const head = document.createElement('div');
      head.className = 'mat-head';

      const headLeft = document.createElement('span');
      headLeft.className = 'mat-head-left';

      if (!isSimple) {
        const nameEl = document.createElement('span');
        nameEl.className = 'mat-head-name';
        nameEl.textContent = 'Вариант';
        headLeft.appendChild(nameEl);

        const forEl = document.createElement('span');
        forEl.className = 'variant-for';
        forEl.textContent = 'для';
        headLeft.appendChild(forEl);
      }

      if (r.system) {
        const sysEl = document.createElement('span');
        sysEl.className = systemClass(r.system);
        sysEl.textContent = r.system;
        headLeft.appendChild(sysEl);
      }

      if (headLeft.children.length > 0) head.appendChild(headLeft);

      const headRight = document.createElement('span');
      headRight.className = 'mat-head-right';

      if (mat.prefix) {
        const prefixEl = document.createElement('span');
        prefixEl.className = 'variant-prefix';
        prefixEl.textContent = mat.prefix;
        headRight.appendChild(prefixEl);
      }

      if (r.variant) {
        const badge = document.createElement('span');
        badge.className = 'variant-badge';
        badge.textContent = r.variant;
        headRight.appendChild(badge);
      }

      if (headRight.children.length > 0) head.appendChild(headRight);

      if (head.children.length > 0) card.appendChild(head);

      const rowsWrap = document.createElement('div');
      rowsWrap.className = 'mat-rows';
      card.appendChild(rowsWrap);

      data.rows.forEach((row, idx) => {
        const rowEl = document.createElement('div');
        rowEl.className = 'mat-row';

        if (data.rows.length > 1) {
          const numEl = document.createElement('div');
          numEl.className = 'mat-row-num';
          numEl.textContent = 'Место ' + (idx + 1);
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
              renderMaterialsForBlock(work);
            });
            fWrap.appendChild(b);
          });
          floorLine.appendChild(fWrap);
          rowEl.appendChild(floorLine);
        }

        const floorChosen = !!row.floor || isAtticRow;
        const showRoom = floorChosen;

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
          rInput.value = row.room || '';
          rInput.dataset.focusKey = r.key + '_room_' + idx;
          if (!row.room) rInput.classList.add('is-empty');

          setupRoomInput(rInput, (val) => {
            row.room = val;
            rInput.classList.toggle('is-empty', !val);
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
      addFloorBtn.textContent = '+ Добавить место';
      addFloorBtn.dataset.addFloorFor = r.key;
      addFloorBtn.addEventListener('click', () => {
        data.rows.push(makeEmptyMatRow());
        renderMaterialsForBlock(work);
      });
      card.appendChild(addFloorBtn);

      bodyEl.appendChild(card);
      updateAddFloorButton(card, r.key, work);
    });

    groupEl.appendChild(bodyEl);
    container.appendChild(groupEl);
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
    const label = info ? (info.mat.label + (info.row.variant ? ' ' + info.row.variant : '')) : k;

    for (let i = 0; i < data.rows.length; i++) {
      const row = data.rows[i];
      const qtyNum = parseFloat(String(row.qty || '').replace(',', '.'));
      if (!isFinite(qtyNum) || qtyNum <= 0) continue;

      if (buildingRequired && !row.building) {
        show('⚠️ ' + label + ', место ' + (i + 1) + ': укажите корпус', 'err');
        return false;
      }
      const isAtticRow = isAtticBuilding(row.building);
      if (!isAtticRow && !row.floor) {
        show('⚠️ ' + label + ', место ' + (i + 1) + ': укажите этаж', 'err');
        return false;
      }
      if (!row.room) {
        show('⚠️ ' + label + ', место ' + (i + 1) + ': укажите помещения', 'err');
        return false;
      }
    }
  }
  return true;
}

function resetMainBlock(work) {
  const st = mainState[work];
  if (!st) return;
  st.materials = makeEmptyMaterialState(work);
  MATERIALS.forEach(mat => {
    _matGroupExpanded[work + '|' + mat.id] = false;
  });
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
      const r = normalizeZadelkaRoom(it.room || '');
      if (!r) { show('⚠️ ' + w.label + ', место ' + (i + 1) + ': укажите помещения', 'err'); return false; }
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
      const normalizedRoom = finalizeRooms(row.room || '');
      const room = applyPrefixToRoom(normalizedRoom, building);

      const newEntry = {
        kind: 'main',
        building: building,
        work: work,
        floor: floor,
        room: room,
        is_master_wing: isMasterWingBuilding(building),
        materials: { [matKey]: row.qty }
      };

      const idx = journal.findIndex(e =>
        e.kind === 'main' &&
        e.work === newEntry.work &&
        (e.building || '') === newEntry.building &&
        (e.floor || '') === newEntry.floor &&
        (e.room || '') === newEntry.room &&
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
    for (const k in _addGroupExpanded) delete _addGroupExpanded[k];
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

  const groupEl = document.createElement('div');
  groupEl.className = 'add-group';
  const expKey = 'add|' + workKey;
  const isExpanded = !!_addGroupExpanded[expKey];
  if (isExpanded) groupEl.classList.add('expanded');

  const headerEl = document.createElement('button');
  headerEl.type = 'button';
  headerEl.className = 'add-group-header';

  const arrow = document.createElement('span');
  arrow.className = 'add-group-arrow';
  arrow.textContent = '▸';

  const title = document.createElement('span');
  title.className = 'add-group-title';
  title.textContent = work.label;

  const hint = document.createElement('span');
  hint.className = 'add-group-hint';
  hint.textContent = getLocationGroupHint(workKey);

  headerEl.appendChild(arrow);
  headerEl.appendChild(title);
  headerEl.appendChild(hint);

  headerEl.addEventListener('click', () => {
    _addGroupExpanded[expKey] = !_addGroupExpanded[expKey];
    renderAdditionalFields();
  });

  groupEl.appendChild(headerEl);

  const bodyEl = document.createElement('div');
  bodyEl.className = 'add-group-body';

  const items = additionalState[workKey].items;

  items.forEach((item, idx) => {
    if (idx > 0) {
      const sep = document.createElement('div');
      sep.className = 'zadelka-separator';
      sep.textContent = 'Место ' + (idx + 1);
      bodyEl.appendChild(sep);
    } else if (items.length > 1) {
      const sep = document.createElement('div');
      sep.className = 'zadelka-separator';
      sep.textContent = 'Место 1';
      bodyEl.appendChild(sep);
    }

    if (items.length > 1) {
      const del = document.createElement('button');
      del.type = 'button'; del.className = 'zadelka-remove-btn';
      del.textContent = '× удалить место';
      del.addEventListener('click', () => {
        additionalState[workKey].items.splice(idx, 1);
        renderAdditionalFields();
      });
      bodyEl.appendChild(del);
    }

    const bLabel = document.createElement('label');
    bLabel.className = 'req';
    bLabel.innerHTML = 'Корпус <span class="req-star">*</span>';
    bodyEl.appendChild(bLabel);

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
      const hint2 = document.createElement('span');
      hint2.className = 'segmented-hint';
      hint2.textContent = objectSelect.value
        ? 'Для «' + objectSelect.value + '» корпус не используется'
        : '🔒 Сначала объект';
      bSeg.appendChild(hint2);
    }
    bodyEl.appendChild(bSeg);

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
        bodyEl.appendChild(fLabel);

        const fWrap = document.createElement('div');
        fWrap.className = 'segmented segmented-floors';
        fWrap.innerHTML = '<input type="hidden" class="req-field" value="">' +
          '<span class="segmented-hint">— выберите —</span>';
        bodyEl.appendChild(fWrap);

        const fSeg = new SegmentedControl(fWrap);
        fSeg.setOptions(floorList);
        if (item.floor) fSeg.value = item.floor;
        fSeg.input.addEventListener('change', () => {
          item.floor = fSeg.value;
          renderAdditionalFields();
        });
      }
    }

    const floor = item.floor;
    const isAtticZ = (building === 'Чердак');
    const showRoom = (!!floor || isAtticZ);

    if (showRoom) {
      const rLabel = document.createElement('label');
      rLabel.className = 'req';
      rLabel.innerHTML = 'Помещения <span class="req-star">*</span>';
      bodyEl.appendChild(rLabel);

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

      setupRoomInput(rInp, (val) => { item.room = val; });

      rInp.addEventListener('blur', () => {
        const n = finalizeRooms(rInp.value);
        if (rInp.value !== n) rInp.value = n;
        item.room = n;
      });
      rWrap.appendChild(rInp);
      bodyEl.appendChild(rWrap);

      const hintEl = document.createElement('div');
      hintEl.className = 'hint-small';
      hintEl.textContent = building === MASTER_WING
        ? 'Номера через запятую. Все сохранятся с префиксом «к».'
        : 'Номера через запятую. Сохранятся по возрастанию.';
      bodyEl.appendChild(hintEl);
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
    bodyEl.appendChild(qLine);
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button'; addBtn.className = 'btn-add-mentor';
  addBtn.textContent = '+ Добавить место';
  addBtn.addEventListener('click', () => {
    additionalState[workKey].items.push(makeLocationItem());
    renderAdditionalFields();
  });
  bodyEl.appendChild(addBtn);

  groupEl.appendChild(bodyEl);
  container.appendChild(groupEl);
}

function renderMentorshipFields(container) {
  const groupEl = document.createElement('div');
  groupEl.className = 'add-group';
  const expKey = 'add|mentorship';
  const isExpanded = !!_addGroupExpanded[expKey];
  if (isExpanded) groupEl.classList.add('expanded');

  const headerEl = document.createElement('button');
  headerEl.type = 'button';
  headerEl.className = 'add-group-header';

  const arrow = document.createElement('span');
  arrow.className = 'add-group-arrow';
  arrow.textContent = '▸';

  const title = document.createElement('span');
  title.className = 'add-group-title';
  title.textContent = SECTION_MENTOR;

  const hint = document.createElement('span');
  hint.className = 'add-group-hint';
  hint.textContent = getMentorshipGroupHint();

  headerEl.appendChild(arrow);
  headerEl.appendChild(title);
  headerEl.appendChild(hint);

  headerEl.addEventListener('click', () => {
    _addGroupExpanded[expKey] = !_addGroupExpanded[expKey];
    renderAdditionalFields();
  });
  groupEl.appendChild(headerEl);

  const bodyEl = document.createElement('div');
  bodyEl.className = 'add-group-body';

  const subtitle = document.createElement('div');
  subtitle.className = 'hint-small';
  subtitle.style.marginBottom = '6px';
  subtitle.textContent = 'Укажите имя и фамилию ученика и количество часов';
  bodyEl.appendChild(subtitle);

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
    bodyEl.appendChild(line);
    updateNameVisual(nameIn, inputH);
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button'; addBtn.className = 'btn-add-mentor';
  addBtn.textContent = '+ Добавить ученика';
  addBtn.addEventListener('click', () => {
    additionalState.mentorship.items.push({ name: '', hours: '' });
    renderAdditionalFields();
  });
  bodyEl.appendChild(addBtn);

  groupEl.appendChild(bodyEl);
  container.appendChild(groupEl);
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
        name: r.tableName || (mat.label + (r.variant ? ' ' + r.variant : '')),
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
      qty: entry.qty.replace(',', '.'), system: getSheetSystemForLocation(entry.kind) }];
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

      let restoredFloor = entry.floor || '';
      if (restoredFloor === ATTIC) restoredFloor = '';
      if (restoredFloor === 'Нет') restoredFloor = '';

      targetRow.building = entry.building || '';
      targetRow.floor = restoredFloor;
      targetRow.room = stripPrefixFromRoom(entry.room || '');
      targetRow.qty = entry.materials[matKey];

      const info = MATERIAL_BY_KEY[matKey];
      if (info) _matGroupExpanded[entry.work + '|' + info.mat.id] = true;
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
    let restoredFloor = entry.floor || '';
    if (restoredFloor === 'Нет') restoredFloor = '';
    additionalState[entry.kind].items = [{
      building: entry.building || '',
      floor: restoredFloor,
      room: stripPrefixFromRoom(entry.room || ''),
      value: entry.qty || ''
    }];
    _addGroupExpanded['add|' + entry.kind] = true;
    renderAdditionalFields();
  } else if (entry.kind === 'mentorship') {
    additionalState.mentorship.items = [{ name: entry.name || '', hours: entry.hours || '' }];
    _addGroupExpanded['add|mentorship'] = true;
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
    if (st) st.materials = makeEmptyMaterialState(work);
  });

  MAIN_WORKS.forEach(({ work }) => { _mainBlockStatus[work] = null; });

  clearMatGroupExpansion();
  for (const k in _addGroupExpanded) delete _addGroupExpanded[k];

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
//  ЭКРАН ПРОВЕРКИ ПЕРЕД ОТПРАВКОЙ
// ============================================
function ensureReviewModal() {
  let overlay = document.getElementById('review-overlay');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'review-overlay';
  overlay.className = 'review-overlay';
  overlay.innerHTML =
    '<div class="review-modal">' +
      '<div class="review-header">' +
        '<div class="review-title">Проверьте отчёт</div>' +
        '<div class="review-subtitle">Проверьте все записи перед отправкой</div>' +
      '</div>' +
      '<div class="review-body" id="review-body"></div>' +
      '<div class="review-footer">' +
        '<button type="button" class="review-btn review-btn-edit" id="review-edit">✏️ Изменить</button>' +
        '<button type="button" class="review-btn review-btn-send" id="review-send">✅ Отправить</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  return overlay;
}

function buildEntryLocLabel(entry) {
  if (entry.kind === 'mentorship') return entry.name || 'Наставничество';
  const floorLabel = formatFloorLabel(entry.floor);
  const roomLabel = 'пом. ' + (entry.is_master_wing ? MASTER_WING_PREFIX : '') + (entry.room || '');
  if (!floorLabel) return roomLabel;
  return floorLabel + ' · ' + roomLabel;
}

function buildEntryWorkLabel(entry) {
  if (entry.kind === 'main') return entry.work;
  if (isLocationKind(entry.kind)) return getSheetWorkForLocation(entry.kind);
  return 'Наставничество';
}

function buildReviewContent() {
  const sorted = journal.slice().sort(compareForSheet);

  let html = '<div class="rv-info">';
  html += '<div class="rv-info-row"><span class="rv-info-label">Объект:</span> <span class="rv-info-value">' + escapeHtml(objectSelect.value || '—') + '</span></div>';
  html += '<div class="rv-info-row"><span class="rv-info-label">Дата:</span> <span class="rv-info-value">' + escapeHtml(formatRuDate(dateInput.value) || '—') + '</span></div>';
  html += '<div class="rv-info-row"><span class="rv-info-label">Имя:</span> <span class="rv-info-value">' + escapeHtml(nameInput.value || '—') + '</span></div>';
  html += '</div>';

  html += '<div class="rv-entries-title">Записи (' + sorted.length + ')</div>';

  sorted.forEach(entry => {
    const locLabel = buildEntryLocLabel(entry);
    const workLabel = buildEntryWorkLabel(entry);

    html += '<div class="rv-entry">';
    html += '<div class="rv-entry-head">';
    html += '<span class="rv-entry-loc">' + escapeHtml(locLabel) + '</span>';
    html += '<span class="rv-entry-work">' + escapeHtml(workLabel) + '</span>';
    html += '</div>';

    let matsArr = [];
    if (entry.kind === 'main') {
      matsArr = materialsMapToArray(entry.materials || {});
    } else if (isLocationKind(entry.kind)) {
      const w = locationWorkByKey(entry.kind);
      matsArr = [{ name: w ? w.label : entry.kind, unit: w ? w.unit : 'шт', qty: entry.qty }];
    } else if (entry.kind === 'mentorship') {
      matsArr = [{ name: 'Наставничество — ' + entry.name, unit: 'ч', qty: entry.hours }];
    }

    if (matsArr.length > 0) {
      html += '<div class="rv-entry-mats">';
      matsArr.forEach(m => {
        html += '<div class="rv-mat">';
        html += '<span class="rv-mat-name">' + escapeHtml(m.name) + '</span>';
        html += '<span class="rv-mat-qty">' + escapeHtml(String(m.qty).replace('.', ',')) + ' ' + escapeHtml(m.unit) + '</span>';
        html += '</div>';
      });
      html += '</div>';
    }
    html += '</div>';
  });

  return html;
}

function showReviewModal() {
  const overlay = ensureReviewModal();
  const body = overlay.querySelector('#review-body');
  body.innerHTML = buildReviewContent();
  overlay.classList.add('show');
  lockApp();

  const editOld = overlay.querySelector('#review-edit');
  const sendOld = overlay.querySelector('#review-send');
  const editNew = editOld.cloneNode(true);
  const sendNew = sendOld.cloneNode(true);
  editOld.parentNode.replaceChild(editNew, editOld);
  sendOld.parentNode.replaceChild(sendNew, sendOld);

  editNew.addEventListener('click', () => {
    overlay.classList.remove('show');
    _reviewOpen = false;
    unlockApp();
  });

  sendNew.addEventListener('click', () => {
    overlay.classList.remove('show');
    _reviewOpen = false;
    // блокировка сохраняется, пока идёт отправка
    doActualSend();
  });
}

// ============================================
//  ОКНО УСПЕХА
// ============================================
function ensureSuccessOverlay() {
  let overlay = document.getElementById('success-overlay');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'success-overlay';
  overlay.className = 'success-overlay';
  overlay.innerHTML =
    '<div class="success-box">' +
      '<div class="success-check">✓</div>' +
      '<div class="success-title">Отчет отправлен</div>' +
      '<div class="success-sub" id="success-sub"></div>' +
      '<button type="button" class="success-btn" id="success-close" title="Закрыть">👍</button>' +
      '<div class="success-hint">Нажмите, чтобы закрыть</div>' +
    '</div>';
  document.body.appendChild(overlay);
  return overlay;
}

function showSuccessOverlay(totalRows) {
  const overlay = ensureSuccessOverlay();
  const sub = overlay.querySelector('#success-sub');
  if (sub) sub.textContent = 'Строк: ' + totalRows;
  overlay.classList.add('show');

  const btnOld = overlay.querySelector('#success-close');
  const btnNew = btnOld.cloneNode(true);
  btnOld.parentNode.replaceChild(btnNew, btnOld);
  btnNew.addEventListener('click', () => {
    overlay.classList.remove('show');
    unlockApp();
  });
}

// ============================================
//  ОТПРАВКА (шаг 1)
// ============================================
async function sendAll() {
  if (_sending || _reviewOpen) return;

  show('');
  if (!validateHeader()) return;

  const hasPendingMain = MAIN_WORKS.some(({ work }) => !isMainBlockEmpty(work));
  const hasPendingAdditional = hasActiveAdditional();

  if (hasPendingMain || hasPendingAdditional) {
    const doAdd = confirm('В форме есть незанесённые работы. Добавить их в журнал перед отправкой?');
    if (doAdd) { const ok = addAllToJournal(); if (!ok) return; }
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

  _reviewOpen = true;
  showReviewModal();
}

// ============================================
//  ОТПРАВКА (шаг 2)
// ============================================
async function doActualSend() {
  if (_sending) return;
  _sending = true;

  const btn = document.getElementById('btn');
  const prevText = btn ? btn.textContent : 'Отправить отчет';
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Отправляем…'; }

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
        show('⚠️ Отправка отменена.', 'err');
        unlockApp();
        return;
      }
    }

    const sortedJournal = journal.slice().sort(compareForSheet);
    const records = [];

    sortedJournal.forEach(entry => {
      if (entry.kind === 'main') {
        records.push({
          room: applyCoordsToRoomString(entry.room || '', objectSelect.value.trim(), entry.building, entry.floor),
          room_none: false,
          floor: entry.floor || '',
          work: entry.work,
          materials: materialsMapToArray(entry.materials || {})
        });
      } else if (isLocationKind(entry.kind)) {
        const w = locationWorkByKey(entry.kind);
        const z = parseFloat(String(entry.qty).replace(',', '.'));
        if (!isFinite(z) || z <= 0) return;
        records.push({
          room: applyCoordsToRoomString(entry.room || '', objectSelect.value.trim(), entry.building, entry.floor),
          room_none: false, floor: entry.floor || '',
          work: getSheetWorkForLocation(entry.kind),
          materials: [{ name: w.label, unit: w.unit, qty: String(z), system: getSheetSystemForLocation(entry.kind) }]
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
      show('');

      // Сброс формы (пока окно успеха ещё висит)
      journal.length = 0;
      clearDraft();
      renderJournal();
      MAIN_WORKS.forEach(({ work }) => resetMainBlock(work));
      initAdditionalState();
      for (const k in _addGroupExpanded) delete _addGroupExpanded[k];
      renderAdditionalFields();

      setupDateRange();
      dateInput.value = toISODate(new Date());
      updateDateHighlight();

      // Показываем окно успеха. Блокировка снимется при нажатии 👍
      showSuccessOverlay(totalRows);
    } catch (e) {
      clearInterval(ticker);
      hideProgress();
      show('❌ Ошибка: ' + e.message, 'err');
      unlockApp();
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
