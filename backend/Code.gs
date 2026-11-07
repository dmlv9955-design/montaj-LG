/**
 * ============================================================
 *  ОТЧЁТ МОНТАЖНИКА — BACKEND (Google Apps Script)
 * ============================================================
 */

// ─── Лимиты ─────────────────────────────────────────────────
const MAX_RECORDS            = 200;
const MAX_ROWS_PER_DAY       = 2000;
const MAX_PER_NAME_HOUR      = 30;
const MAX_NAME_LEN           = 60;
const MAX_ROOM_LEN           = 200;
const MAX_SYSTEM_LEN         = 40;
const MAX_MATERIALS          = 30;
const MAX_MATERIAL_NAME_LEN  = 150;
const MAX_QTY_LEN            = 20;
const MAX_DAYS_AGO           = 7;

const ALLOWED_WORK = ['Монтаж', 'Демонтаж', 'Другие работы'];

// Форматы ячеек
const DATE_FORMAT = 'dd.MM.yyyy';
const TEXT_FORMAT = '@';

// Шапки листов
const SHEET_HEADERS = [
  'Объект', 'Дата', 'Имя', 'Этаж', 'Помещение',
  'Тип работ', 'Система', 'Материал', 'Ед.изм.', 'Кол-во', 'timestamp'
];
const REJECTED_HEADERS = ['timestamp', 'reason', 'payload', 'ip_hint'];
const VYP_HEADERS = [
  'Дата', 'Наименование работ', 'Этаж', 'Пом. №', 'Тип работ',
  'Система', 'Материалы и оборудование', 'Ед. изм', 'Кол-во', 'Кол-во работников'
];
const OJR_HEADERS = ['', 'Дата', '', 'Наименование работ', 'ФИО'];
const SUMMARY_HEADERS = ['Дата', 'Кол-во работников', 'Имена'];

const OJR_RESPONSIBLE = '';
const LOG_SHEET_FALLBACK = 'Отклонённые';

// ============================================================
//  КОНФИГ ОБЪЕКТОВ
// ============================================================
const OBJECTS = [
  {
    code: 'LG',
    label: 'Ларинская гимназия',
    title: 'Ларинская гимназия',
    filterObjects: ['Ларинская гимназия'],
    reportsSheet:  'Отчеты "Ларинская"',
    rejectedSheet: 'Отклонённые "Ларинская"',
    vypSheet:      'Выполнение "Ларинская"',
    ojrSheet:      'ОЖР "Ларинская"',
    summarySheet:  'Сводка "Ларинская"'
  },
  {
    code: 'JD',
    label: 'ЖЕДЕПОМ',
    title: 'ЖЕДЕПОМ',
    filterObjects: ['ЖЕДЕПОМ'],
    reportsSheet:  'Отчеты "ЖЕДЕПОМ"',
    rejectedSheet: 'Отклонённые "ЖЕДЕПОМ"',
    vypSheet:      'Выполнение "ЖЕДЕПОМ"',
    ojrSheet:      'ОЖР "ЖЕДЕПОМ"',
    summarySheet:  'Сводка "ЖЕДЕПОМ"'
  }
];

function getObjectByCode(code) {
  for (let i = 0; i < OBJECTS.length; i++) {
    if (OBJECTS[i].code === code) return OBJECTS[i];
  }
  return null;
}

function findObjectByFormValue(v) {
  const s = String(v == null ? '' : v).trim();
  if (!s) return null;
  for (let i = 0; i < OBJECTS.length; i++) {
    const obj = OBJECTS[i];
    for (let j = 0; j < obj.filterObjects.length; j++) {
      if (obj.filterObjects[j] === s) return obj;
    }
  }
  return null;
}

function getAllowedObjects() {
  const list = [];
  OBJECTS.forEach(obj => obj.filterObjects.forEach(o => list.push(o)));
  return list;
}

function isObjectInFilter(objName, filterObjects) {
  const n = String(objName || '').trim();
  for (let i = 0; i < filterObjects.length; i++) {
    if (n === filterObjects[i]) return true;
  }
  return false;
}

// ============================================================
//  КОНФИГ ВЫПОЛНЕНИЯ / ОЖР
// ============================================================
const VYP_EXCLUDED_MATERIALS = [
  'Штукатурка',
  'Тура (монтаж/демонтаж)',
  'Страховка лестницы',
  'Разметка кабельных трасс',
  'Затяжка кабеля в гофру',
  'Установка крышек кабель-канала'
];
const VYP_EXCLUDED_WORK_TYPES = ['Демонтаж'];
const VYP_SUMMARY_EXCLUDED_WORKS = ['Демонтаж'];

const OJR_MATERIALS_ORDER = [
  'Труба стальная ВГП ДУ ГОСТ 3262-75 15×2,8 мм.',
  'Труба стальная ВГП ДУ ГОСТ 3262-75 20×2,8 мм.',
  'Кабель-канал белый ECOLINE IEK 40x25',
  'Кабель-канал белый ECOLINE IEK 25x16',
  'Труба гофрированная ПВХ, серая d=20мм',
  'Труба гофрированная ПВХ, серая d=16мм',
  'Кабель КПСЭнг(A)FRHF "Технокабель" 1x2x0,75',
  'Кабель КПСЭнг(A)FRHF "Технокабель" 1x2x1',
  'Вата минеральная 100 мм, 100 кг/м³',
  'Герметик огнезащитный "ОГНЕЗА-ГТ"',
  'Бирки кабельные У-136, 55×62 мм'
];

const OJR_EXCLUDED_MATERIALS = [
  'Бурение проходок',
  'Расключение',
  'Установка крышек кабель-канала',
  'Затяжка кабеля в гофру',
  'Разметка кабельных трасс',
  'Штукатурка',
  'Тура (монтаж/демонтаж)',
  'Страховка лестницы'
];

// ============================================================
//  ТОЧКА ВХОДА
// ============================================================
function doPost(e) {
  const tz = Session.getScriptTimeZone() || 'Europe/Moscow';

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return reject(null, 'empty body', tz);
    }

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return reject(null, 'invalid JSON: ' + parseErr.message, tz);
    }

    // ─── ВЕТКА ФОТОФИКСАЦИИ (см. photos.gs) ───
    if (data && data.type === 'photo') {
      return handlePhotoPost(data, tz);
    }

    // ─── ВЕТКА ОТЧЁТА (основная) ───
    const check = validatePayload(data);
    if (!check.ok) return reject(data, check.error, tz);

    const clean = sanitize(data);

    if (!checkDailyLimit(tz)) {
      return reject(data, 'daily limit exceeded', tz);
    }
    if (!checkNameRate(clean.name)) {
      return reject(data, 'too many reports from this name', tz);
    }

    const obj = findObjectByFormValue(clean.object);
    const rowsWritten = appendRows(clean, obj, tz);

    bumpDailyCounter(tz, rowsWritten);
    bumpNameCounter(clean.name);

    return json({ ok: true, records: clean.records.length, rows: rowsWritten });

  } catch (err) {
    return reject(null, 'server error: ' + err.message, tz);
  }
}

// ============================================================
//  ВАЛИДАЦИЯ
// ============================================================
function validatePayload(d) {
  const requiredHeader = ['name', 'object', 'date'];
  for (let i = 0; i < requiredHeader.length; i++) {
    const key = requiredHeader[i];
    if (typeof d[key] !== 'string' || !d[key].trim()) {
      return { ok: false, error: 'missing/empty field: ' + key };
    }
  }

  if (!/^[А-ЯЁA-Z][а-яёa-z-]+\s+[А-ЯЁA-Z][а-яёa-z-]+$/i.test(d.name.trim())) {
    return { ok: false, error: 'invalid name format' };
  }

  if (getAllowedObjects().indexOf(d.object) === -1) {
    return { ok: false, error: 'unknown object' };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) {
    return { ok: false, error: 'invalid date format' };
  }
  const parsed = new Date(d.date + 'T00:00:00');
  if (isNaN(parsed.getTime())) {
    return { ok: false, error: 'invalid date value' };
  }
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = (now - parsed) / (1000 * 60 * 60 * 24);
  if (diffDays < 0 || diffDays > MAX_DAYS_AGO) {
    return { ok: false, error: 'date out of range' };
  }

  const records = Array.isArray(d.records) ? d.records : [];
  if (records.length === 0) {
    return { ok: false, error: 'no records' };
  }
  if (records.length > MAX_RECORDS) {
    return { ok: false, error: 'too many records (max ' + MAX_RECORDS + ')' };
  }

  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    const idx = '#' + (i + 1) + ': ';

    if (typeof r !== 'object' || r === null) {
      return { ok: false, error: idx + 'record is not an object' };
    }
    if (typeof r.work !== 'string' || ALLOWED_WORK.indexOf(r.work) === -1) {
      return { ok: false, error: idx + 'unknown work type: ' + r.work };
    }
    if (typeof r.floor !== 'string') {
      return { ok: false, error: idx + 'floor is not a string' };
    }

    const mats = Array.isArray(r.materials) ? r.materials : [];
    if (mats.length > MAX_MATERIALS) {
      return { ok: false, error: idx + 'too many materials (max ' + MAX_MATERIALS + ')' };
    }
    for (let j = 0; j < mats.length; j++) {
      const m = mats[j];
      if (typeof m !== 'object' || m === null) {
        return { ok: false, error: idx + 'material is not an object' };
      }
      if (typeof m.name !== 'string' || !m.name.trim()) {
        return { ok: false, error: idx + 'material without name' };
      }
      if (m.qty !== undefined && m.qty !== '' && isNaN(Number(m.qty))) {
        return { ok: false, error: idx + 'material qty is not a number' };
      }
    }
  }

  return { ok: true };
}

// ============================================================
//  САНИТИЗАЦИЯ
// ============================================================
function sanitize(d) {
  const cleanStr = (s, max) => String(s == null ? '' : s)
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim()
    .slice(0, max);

  const records = (Array.isArray(d.records) ? d.records : []).map(r => {
    const roomNone = r.room_none === true;

    const mats = (Array.isArray(r.materials) ? r.materials : [])
      .map(m => ({
        name:   cleanStr(m.name,   MAX_MATERIAL_NAME_LEN),
        unit:   cleanStr(m.unit,   10),
        qty:    cleanStr(m.qty,    MAX_QTY_LEN),
        system: cleanStr(m.system, MAX_SYSTEM_LEN)
      }))
      .filter(m => m.name);

    return {
      floor:     cleanStr(r.floor, 20),
      room:      roomNone ? 'Нет' : cleanStr(r.room, MAX_ROOM_LEN),
      room_none: roomNone,
      work:      cleanStr(r.work, 40),
      materials: mats
    };
  });

  return {
    date:    cleanStr(d.date, 10),
    name:    cleanStr(d.name, MAX_NAME_LEN),
    object:  cleanStr(d.object, 40),
    records: records
  };
}

// ============================================================
//  ЛИМИТЫ
// ============================================================
function todayKey(tz) {
  return Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
}

function checkDailyLimit(tz) {
  const cache = CacheService.getScriptCache();
  const count = Number(cache.get('daily_' + todayKey(tz)) || 0);
  return count < MAX_ROWS_PER_DAY;
}

function bumpDailyCounter(tz, n) {
  const cache = CacheService.getScriptCache();
  const key = 'daily_' + todayKey(tz);
  const count = Number(cache.get(key) || 0);
  cache.put(key, String(count + n), 86400);
}

function checkNameRate(name) {
  const cache = CacheService.getScriptCache();
  const hour = Utilities.formatDate(new Date(), 'GMT', 'yyyy-MM-dd-HH');
  const key = 'name_' + hash(name) + '_' + hour;
  const count = Number(cache.get(key) || 0);
  return count < MAX_PER_NAME_HOUR;
}

function bumpNameCounter(name) {
  const cache = CacheService.getScriptCache();
  const hour = Utilities.formatDate(new Date(), 'GMT', 'yyyy-MM-dd-HH');
  const key = 'name_' + hash(name) + '_' + hour;
  const count = Number(cache.get(key) || 0);
  cache.put(key, String(count + 1), 3600);
}

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return String(h >>> 0);
}

// ============================================================
//  ХЕЛПЕР: точка → запятая для количеств
// ============================================================
function qtyToComma(v) {
  const s = String(v == null ? '' : v);
  if (!s) return '';
  return s.replace('.', ',');
}

// ============================================================
//  ФОРМАТИРОВАНИЕ ЛИСТОВ
// ============================================================

function applyReportsFormatting(sheet, startRow, numRows) {
  if (numRows < 1) return;

  sheet.getRange(startRow, 1,  numRows, 1).setNumberFormat(TEXT_FORMAT);
  sheet.getRange(startRow, 2,  numRows, 1).setNumberFormat(DATE_FORMAT);
  sheet.getRange(startRow, 3,  numRows, 9).setNumberFormat(TEXT_FORMAT);

  sheet.getRange(startRow, 1,  numRows, 1).setHorizontalAlignment('left');
  sheet.getRange(startRow, 2,  numRows, 1).setHorizontalAlignment('right');
  sheet.getRange(startRow, 3,  numRows, 1).setHorizontalAlignment('left');
  sheet.getRange(startRow, 4,  numRows, 4).setHorizontalAlignment('center');
  sheet.getRange(startRow, 8,  numRows, 1).setHorizontalAlignment('left');
  sheet.getRange(startRow, 9,  numRows, 2).setHorizontalAlignment('center');
  sheet.getRange(startRow, 11, numRows, 1).setHorizontalAlignment('left');
}

function applyVypFormatting(sheet, startRow, numRows) {
  if (numRows < 1) return;

  sheet.getRange(startRow, 1, numRows, VYP_HEADERS.length).setNumberFormat(TEXT_FORMAT);

  sheet.getRange(startRow, 1, numRows, VYP_HEADERS.length)
    .setVerticalAlignment('middle')
    .setWrap(false);

  sheet.getRange(startRow, 1, numRows, 1).setHorizontalAlignment('center');
  sheet.getRange(startRow, 2, numRows, 1).setHorizontalAlignment('center');
  sheet.getRange(startRow, 3, numRows, 4).setHorizontalAlignment('center');
  sheet.getRange(startRow, 7, numRows, 1).setHorizontalAlignment('left');
  sheet.getRange(startRow, 8, numRows, 3).setHorizontalAlignment('center');

  sheet.getRange(startRow, 2, numRows, 1).setWrap(true);
}

function applyOjrFormatting(sheet, startRow, numRows) {
  if (numRows < 1) return;

  sheet.getRange(startRow, 1, numRows, OJR_HEADERS.length).setNumberFormat(TEXT_FORMAT);

  sheet.getRange(startRow, 1, numRows, OJR_HEADERS.length)
    .setVerticalAlignment('middle')
    .setWrap(false);

  sheet.getRange(startRow, 1, numRows, 1).setHorizontalAlignment('center');
  sheet.getRange(startRow, 2, numRows, 1).setHorizontalAlignment('center');
  sheet.getRange(startRow, 3, numRows, 1).setHorizontalAlignment('center');
  sheet.getRange(startRow, 4, numRows, 1).setHorizontalAlignment('left');
  sheet.getRange(startRow, 5, numRows, 1).setHorizontalAlignment('left');

  sheet.getRange(startRow, 4, numRows, 1).setWrap(true);
}

function applyRejectedFormatting(sheet, startRow, numRows) {
  if (numRows < 1) return;

  sheet.getRange(startRow, 1, numRows, REJECTED_HEADERS.length).setNumberFormat(TEXT_FORMAT);

  sheet.getRange(startRow, 1, numRows, REJECTED_HEADERS.length)
    .setVerticalAlignment('middle')
    .setHorizontalAlignment('left')
    .setWrap(false);

  sheet.getRange(startRow, 3, numRows, 1).setWrap(true);
}

function applySummaryFormatting(sheet, startRow, numRows) {
  if (numRows < 1) return;

  sheet.getRange(startRow, 1, numRows, SUMMARY_HEADERS.length).setNumberFormat(TEXT_FORMAT);

  sheet.getRange(startRow, 1, numRows, SUMMARY_HEADERS.length)
    .setVerticalAlignment('middle')
    .setWrap(false);

  sheet.getRange(startRow, 1, numRows, 1).setHorizontalAlignment('right');
  sheet.getRange(startRow, 2, numRows, 1).setHorizontalAlignment('center');
  sheet.getRange(startRow, 3, numRows, 1).setHorizontalAlignment('left');

  sheet.getRange(startRow, 3, numRows, 1).setWrap(true);
}

// ============================================================
//  ЛИСТ «ОТЧЕТЫ» — ПО ОБЪЕКТАМ
// ============================================================
function getOrCreateReportsSheet(obj) {
  if (!obj) return null;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(obj.reportsSheet);

  if (!sheet) {
    sheet = ss.insertSheet(obj.reportsSheet);
    sheet.appendRow(SHEET_HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, SHEET_HEADERS.length)
         .setFontWeight('bold')
         .setBackground('#f1f5f9')
         .setVerticalAlignment('middle')
         .setHorizontalAlignment('center')
         .setWrap(true);
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 100);
    sheet.setColumnWidth(8, 220);
    sheet.setColumnWidth(11, 160);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(SHEET_HEADERS);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

// ============================================================
//  ЗАПИСЬ В ТАБЛИЦУ
// ============================================================
function appendRows(c, obj, tz) {
  const sheet = getOrCreateReportsSheet(obj);
  if (!sheet) {
    throw new Error('unknown object for sheet: ' + c.object);
  }

  const ts = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss');
  const dateObj = isoToDate(c.date);

  const rows = [];

  c.records.forEach(r => {
    const base = [c.object, dateObj, c.name, r.floor, r.room, r.work];

    if (!r.materials || r.materials.length === 0) {
      rows.push(base.concat(['', '', '', '', ts]));
    } else {
      r.materials.forEach(m => {
        rows.push(base.concat([
          m.system || '',
          m.name,
          m.unit,
          qtyToComma(m.qty),
          ts
        ]));
      });
    }
  });

  if (rows.length === 0) return 0;

  const startRow = sheet.getLastRow() + 1;
  const n = rows.length;

  applyReportsFormatting(sheet, startRow, n);
  sheet.getRange(startRow, 1, n, 11).setValues(rows);

  return n;
}

function isoToDate(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return new Date(+m[1], +m[2] - 1, +m[3]);
}

// ============================================================
//  ЛОГ ОТКЛОНЁННЫХ
// ============================================================
function reject(data, reason, tz) {
  try {
    let sheetName = LOG_SHEET_FALLBACK;
    if (data && typeof data.object === 'string') {
      const obj = findObjectByFormValue(data.object);
      if (obj) sheetName = obj.rejectedSheet;
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(REJECTED_HEADERS);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, REJECTED_HEADERS.length)
           .setFontWeight('bold')
           .setBackground('#f1f5f9')
           .setVerticalAlignment('middle')
           .setHorizontalAlignment('center')
           .setWrap(true);
    }

    const rowNum = sheet.getLastRow() + 1;
    applyRejectedFormatting(sheet, rowNum, 1);
    sheet.getRange(rowNum, 1, 1, REJECTED_HEADERS.length).setValues([[
      Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss'),
      reason,
      data ? JSON.stringify(data) : '(none)',
      ''
    ]]);
  } catch (_) {}
  return json({ ok: false, error: reason });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ============================================================
 *  МЕНЮ
 * ============================================================ */

function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    const menu = ui.createMenu('📋 Журналы');

    OBJECTS.forEach(obj => {
      const sub = ui.createMenu(obj.label);

      sub.addItem('📊 Выполнение — за сегодня',     'vypToday_' + obj.code);
      sub.addItem('📊 Выполнение — за другой день', 'vypAnotherDay_' + obj.code);
      sub.addItem('📘 ОЖР — за сегодня',            'ojrToday_' + obj.code);
      sub.addItem('📘 ОЖР — за другой день',        'ojrAnotherDay_' + obj.code);
      sub.addSeparator();
      sub.addItem('👥 Сколько сдали — за сегодня',  'workersToday_' + obj.code);
      sub.addItem('👥 Сколько сдали — за день...',  'workersAnotherDay_' + obj.code);
      sub.addItem('📋 Обновить сводку по работникам', 'updateSummary_' + obj.code);
      sub.addItem('📂 Открыть сводку по работникам',  'gotoSummary_' + obj.code);
      sub.addSeparator();
      sub.addItem('📄 Открыть «Отчеты»',            'reportsGoto_' + obj.code);
      sub.addItem('📄 Открыть «Отклонённые»',       'rejectedGoto_' + obj.code);
      sub.addItem('📂 Открыть «Выполнение»',        'vypGoto_' + obj.code);
      sub.addItem('📂 Открыть «ОЖР»',               'ojrGoto_' + obj.code);
      sub.addSeparator();
      sub.addItem('🗑 Очистить «Отчеты»',           'reportsClear_' + obj.code);
      sub.addItem('🗑 Очистить «Сводка»',           'summaryClear_' + obj.code);
      sub.addItem('🗑 Очистить «Отклонённые»',      'rejectedClear_' + obj.code);
      sub.addItem('🗑 Очистить «Выполнение»',       'vypClear_' + obj.code);
      sub.addItem('🗑 Очистить «ОЖР»',              'ojrClear_' + obj.code);
      sub.addSeparator();
      sub.addItem('🗑 Очистить ВСЁ (Отчеты + Выполнение + ОЖР + Сводка)', 'clearAll_' + obj.code);

      menu.addSubMenu(sub);
    });

    menu.addToUi();

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let anyEmpty = false;
    OBJECTS.forEach(obj => {
      const sh = ss.getSheetByName(obj.vypSheet);
      if (!sh || sh.getLastRow() < 2) anyEmpty = true;
    });
    if (anyEmpty) {
      ss.toast(
        'Меню «📋 Журналы» — сверху. Выберите объект → «📊 Выполнение — за сегодня».',
        'Подсказка',
        6
      );
    }
  } catch (_) {}
}

/* ============================================================
 *  СЧЁТЧИК РАБОТНИКОВ
 * ============================================================ */

function collectWorkersData(obj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const src = ss.getSheetByName(obj.reportsSheet);
  if (!src) return null;

  const lastRow = src.getLastRow();
  if (lastRow < 2) return { byDate: {} };

  const data = src.getRange(2, 1, lastRow - 1, 11).getValues();
  const byDate = {};

  data.forEach(row => {
    const objectName = String(row[0] || '').trim();
    if (!isObjectInFilter(objectName, obj.filterObjects)) return;

    const dateIso = normalizeDateCellToIso(row[1]);
    const name    = String(row[2] || '').trim();

    if (!dateIso) return;
    if (!byDate[dateIso]) byDate[dateIso] = { names: {} };
    if (name) byDate[dateIso].names[name] = true;
  });

  const out = { byDate: {} };
  Object.keys(byDate).forEach(dateIso => {
    const arr = Object.keys(byDate[dateIso].names).sort();
    out.byDate[dateIso] = { count: arr.length, names: arr };
  });

  return out;
}

function showWorkersAlert(obj, dateIso) {
  const result = collectWorkersData(obj);
  if (!result) {
    SpreadsheetApp.getUi().alert('Лист "' + obj.reportsSheet + '" не найден.');
    return;
  }

  const day = result.byDate[dateIso];
  const dateRu = formatDateRu(dateIso);

  if (!day || day.count === 0) {
    SpreadsheetApp.getUi().alert(
      'За ' + dateRu + ' (' + obj.title + ')',
      'Отчёты не сдал никто.',
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    return;
  }

  const list = day.names.map((n, i) => (i + 1) + '. ' + n).join('\n');
  SpreadsheetApp.getUi().alert(
    'За ' + dateRu + ' (' + obj.title + ')',
    'Сдали отчёт: ' + day.count + ' чел.\n\n' + list,
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

function workersTodayFor(obj) {
  const tz = Session.getScriptTimeZone() || 'Europe/Moscow';
  const todayIso = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  showWorkersAlert(obj, todayIso);
}

function workersAnotherDayFor(obj) {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt(
    'Сколько сдали — ' + obj.title,
    'Введите дату в формате ДД.ММ.ГГГГ (например, 08.10.2026):',
    ui.ButtonSet.OK_CANCEL
  );
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const raw = String(res.getResponseText() || '').trim();
  const iso = parseAnyDateToIso(raw);
  if (!iso) {
    ui.alert('Не понял дату. Нужно ДД.ММ.ГГГГ или ГГГГ-ММ-ДД.');
    return;
  }
  showWorkersAlert(obj, iso);
}

/* ============================================================
 *  ЛИСТ «СВОДКА» — КТО И КОГДА СДАЛ
 * ============================================================ */

function getOrCreateSummarySheet(obj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(obj.summarySheet);

  if (!sheet) {
    sheet = ss.insertSheet(obj.summarySheet);
    sheet.appendRow(SUMMARY_HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, SUMMARY_HEADERS.length)
         .setFontWeight('bold')
         .setBackground('#f1f5f9')
         .setVerticalAlignment('middle')
         .setHorizontalAlignment('center')
         .setWrap(true);
    sheet.setColumnWidth(1, 100);
    sheet.setColumnWidth(2, 140);
    sheet.setColumnWidth(3, 600);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(SUMMARY_HEADERS);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function updateSummaryFor(obj) {
  const result = collectWorkersData(obj);
  if (!result) {
    SpreadsheetApp.getUi().alert('Лист "' + obj.reportsSheet + '" не найден.');
    return;
  }

  const dates = Object.keys(result.byDate).sort();
  const rows = [];
  dates.forEach(iso => {
    const d = result.byDate[iso];
    if (d.count === 0) return;
    rows.push([formatDateRu(iso), d.count, d.names.join(', ')]);
  });

  const sheet = getOrCreateSummarySheet(obj);
  resetSummarySheet(sheet);

  if (rows.length === 0) {
    sheet.activate();
    SpreadsheetApp.getActiveSpreadsheet().toast('Пока никто не сдал отчёты.', 'Сводка пустая', 3);
    return;
  }

  applySummaryFormatting(sheet, 2, rows.length);
  sheet.getRange(2, 1, rows.length, SUMMARY_HEADERS.length).setValues(rows);

  sheet.activate();
  SpreadsheetApp.getActiveSpreadsheet().toast(
    'Обновлено дней: ' + rows.length,
    'Сводка «' + obj.title + '»',
    3
  );
}

function gotoSummaryFor(obj) {
  const sheet = getOrCreateSummarySheet(obj);
  sheet.activate();
}

function summaryClearFor(obj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dst = ss.getSheetByName(obj.summarySheet);
  if (!dst) {
    SpreadsheetApp.getUi().alert('Лист "' + obj.summarySheet + '" не найден.');
    return;
  }
  const ui = SpreadsheetApp.getUi();
  const res = ui.alert(
    'Очистить лист «Сводка» (' + obj.title + ')?',
    'Будет очищена только сводка по работникам. Данные «Отчётов» не изменятся.',
    ui.ButtonSet.YES_NO
  );
  if (res !== ui.Button.YES) return;

  resetSummarySheet(dst);
  dst.activate();
  ss.toast('Сводка очищена', 'Готово', 3);
}

/* ============================================================
 *  УНИВЕРСАЛЬНЫЕ ОЧИСТКИ ЛИСТОВ
 * ============================================================ */

function resetSheet(sheet, headers) {
  try {
    const lastRow = Math.max(sheet.getMaxRows(), 100);
    const lastCol = Math.max(sheet.getMaxColumns(), headers.length);
    sheet.getRange(1, 1, lastRow, lastCol).breakApart();
  } catch (_) {}

  sheet.clear();

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange
    .setFontWeight('bold')
    .setBackground('#f1f5f9')
    .setVerticalAlignment('middle')
    .setHorizontalAlignment('center')
    .setWrap(true);

  sheet.setFrozenRows(1);
}

function resetReportsSheet(sheet)  { resetSheet(sheet, SHEET_HEADERS); }
function resetVypSheet(sheet)      { resetSheet(sheet, VYP_HEADERS); }
function resetOjrSheet(sheet)      { resetSheet(sheet, OJR_HEADERS); }
function resetRejectedSheet(sheet) { resetSheet(sheet, REJECTED_HEADERS); }
function resetSummarySheet(sheet)  { resetSheet(sheet, SUMMARY_HEADERS); }

/* ============================================================
 *  ПЕРЕХОДЫ И ОЧИСТКИ ПО ОБЪЕКТАМ
 * ============================================================ */

function reportsGotoFor(obj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(obj.reportsSheet);
  if (sh) sh.activate();
  else SpreadsheetApp.getUi().alert('Лист "' + obj.reportsSheet + '" не найден.');
}

function rejectedGotoFor(obj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(obj.rejectedSheet);
  if (!sh) {
    sh = ss.insertSheet(obj.rejectedSheet);
    sh.appendRow(REJECTED_HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, REJECTED_HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#f1f5f9')
      .setVerticalAlignment('middle')
      .setHorizontalAlignment('center')
      .setWrap(true);
  }
  sh.activate();
}

function reportsClearFor(obj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dst = ss.getSheetByName(obj.reportsSheet);
  if (!dst) {
    SpreadsheetApp.getUi().alert('Лист "' + obj.reportsSheet + '" не найден.');
    return;
  }

  const ui = SpreadsheetApp.getUi();
  const res = ui.alert(
    'Очистить лист «Отчеты» (' + obj.title + ')?',
    'Все строки будут удалены без возможности восстановления.\n\n' +
    'Листы «Выполнение», «ОЖР» и «Отклонённые» не изменятся.',
    ui.ButtonSet.YES_NO
  );
  if (res !== ui.Button.YES) return;

  resetReportsSheet(dst);
  dst.activate();
  ss.toast('Лист «Отчеты» (' + obj.title + ') очищен', 'Готово', 3);
}

function rejectedClearFor(obj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dst = ss.getSheetByName(obj.rejectedSheet);
  if (!dst) {
    SpreadsheetApp.getUi().alert('Лист "' + obj.rejectedSheet + '" не найден.');
    return;
  }

  const ui = SpreadsheetApp.getUi();
  const res = ui.alert(
    'Очистить лист «Отклонённые» (' + obj.title + ')?',
    'Весь лог отклонённых запросов по этому объекту будет удалён.',
    ui.ButtonSet.YES_NO
  );
  if (res !== ui.Button.YES) return;

  resetRejectedSheet(dst);
  dst.activate();
  ss.toast('Лист «Отклонённые» (' + obj.title + ') очищен', 'Готово', 3);
}

function vypClearFor(obj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dst = ss.getSheetByName(obj.vypSheet);
  if (!dst) {
    SpreadsheetApp.getUi().alert('Лист "' + obj.vypSheet + '" не найден.');
    return;
  }
  resetVypSheet(dst);
  dst.activate();
  ss.toast('Лист «Выполнение» (' + obj.title + ') очищен', 'Готово', 3);
}

function ojrClearFor(obj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dst = ss.getSheetByName(obj.ojrSheet);
  if (!dst) {
    SpreadsheetApp.getUi().alert('Лист "' + obj.ojrSheet + '" не найден.');
    return;
  }
  resetOjrSheet(dst);
  dst.activate();
  ss.toast('Лист «ОЖР» (' + obj.title + ') очищен', 'Готово', 3);
}

function clearAllFor(obj) {
  const ui = SpreadsheetApp.getUi();
  const res = ui.alert(
    'Очистить ВСЁ (' + obj.title + ')?',
    'Будут очищены листы:\n' +
    '• ' + obj.reportsSheet + '\n' +
    '• ' + obj.vypSheet + '\n' +
    '• ' + obj.ojrSheet + '\n' +
    '• ' + obj.summarySheet + '\n\n' +
    'Лист «Отклонённые» не затрагивается.\n\n' +
    'Действие необратимо.',
    ui.ButtonSet.YES_NO
  );
  if (res !== ui.Button.YES) return;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let cleared = 0;

  const rSh = ss.getSheetByName(obj.reportsSheet);
  if (rSh) { resetReportsSheet(rSh); cleared++; }

  const vSh = ss.getSheetByName(obj.vypSheet);
  if (vSh) { resetVypSheet(vSh); cleared++; }

  const oSh = ss.getSheetByName(obj.ojrSheet);
  if (oSh) { resetOjrSheet(oSh); cleared++; }

  const sSh = ss.getSheetByName(obj.summarySheet);
  if (sSh) { resetSummarySheet(sSh); cleared++; }

  if (rSh) rSh.activate();

  ss.toast('Очищено листов: ' + cleared, 'Готово', 3);
}

/* ============================================================
 *  УТИЛИТЫ ДАТ
 * ============================================================ */

function formatDateRu(iso) {
  const s = String(iso || '');
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return s;
  return m[3] + '.' + m[2] + '.' + m[1];
}

function parseAnyDateToIso(input) {
  const s = String(input || '').trim();
  let m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const d  = String(m[1]).padStart(2, '0');
    const mo = String(m[2]).padStart(2, '0');
    return m[3] + '-' + mo + '-' + d;
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const mo = String(m[2]).padStart(2, '0');
    const d  = String(m[3]).padStart(2, '0');
    return m[1] + '-' + mo + '-' + d;
  }
  return '';
}

function parseAnyDateToRu(input) {
  const s = String(input || '').trim();
  let m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const d  = String(m[1]).padStart(2, '0');
    const mo = String(m[2]).padStart(2, '0');
    return d + '.' + mo + '.' + m[3];
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) {
    const mo = String(m[2]).padStart(2, '0');
    const d  = String(m[3]).padStart(2, '0');
    return d + '.' + mo + '.' + m[1];
  }
  return '';
}

function normalizeDateCellToIso(raw) {
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const y  = raw.getFullYear();
    const mo = String(raw.getMonth() + 1).padStart(2, '0');
    const d  = String(raw.getDate()).padStart(2, '0');
    return y + '-' + mo + '-' + d;
  }
  const s = String(raw == null ? '' : raw).trim();
  if (!s) return '';
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return m[1] + '-' + m[2] + '-' + m[3];
  m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (m) {
    const d  = String(m[1]).padStart(2, '0');
    const mo = String(m[2]).padStart(2, '0');
    return m[3] + '-' + mo + '-' + d;
  }
  return '';
}

function ruToDate(s) {
  const m = String(s || '').match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  return new Date(+m[3], +m[2] - 1, +m[1]);
}

function compareRuDates(a, b) {
  const da = ruToDate(a);
  const db = ruToDate(b);
  if (da && db) return da - db;
  return String(a).localeCompare(String(b));
}

function getExistingDatesFromColumn(sheet, col) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const data = sheet.getRange(2, col, lastRow - 1, 1).getValues();
  const out = [];
  data.forEach(row => {
    const s = String(row[0] || '').trim();
    if (s) out.push(s);
  });
  return out;
}

/* ============================================================
 *  ФИЛЬТРЫ ВЫПОЛНЕНИЯ / ОЖР
 * ============================================================ */

function isVypExcludedWorkType(work) {
  const w = String(work || '').trim();
  return VYP_EXCLUDED_WORK_TYPES.indexOf(w) !== -1;
}

function isVypExcluded(matName) {
  const m = String(matName || '').trim();
  if (!m) return false;
  if (VYP_EXCLUDED_MATERIALS.indexOf(m) !== -1) return true;
  if (/^Наставничество/i.test(m)) return true;
  return false;
}

function isOjrExcludedMaterial(name) {
  const n = String(name || '').trim();
  if (!n) return false;
  if (OJR_EXCLUDED_MATERIALS.indexOf(n) !== -1) return true;
  if (/^Наставничество/i.test(n)) return true;
  return false;
}

/* ============================================================
 *  СБОРКА «ВЫПОЛНЕНИЯ»
 * ============================================================ */

function vypBuildTodayFor(obj) {
  const tz = Session.getScriptTimeZone() || 'Europe/Moscow';
  const todayIso = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  addVypDateAndRebuildFor(obj, todayIso);
}

function vypBuildAnotherDayFor(obj) {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt(
    'Сформировать «Выполнение» (' + obj.title + ')',
    'Введите дату в формате ДД.ММ.ГГГГ (например, 08.10.2026):',
    ui.ButtonSet.OK_CANCEL
  );
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const raw = String(res.getResponseText() || '').trim();
  const iso = parseAnyDateToIso(raw);
  if (!iso) {
    ui.alert('Не понял дату. Нужно ДД.ММ.ГГГГ или ГГГГ-ММ-ДД.');
    return;
  }
  addVypDateAndRebuildFor(obj, iso);
}

function addVypDateAndRebuildFor(obj, targetIso) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const src = ss.getSheetByName(obj.reportsSheet);
  if (!src) {
    SpreadsheetApp.getUi().alert('Не найден лист "' + obj.reportsSheet + '"');
    return;
  }
  let dst = ss.getSheetByName(obj.vypSheet);
  if (!dst) dst = ss.insertSheet(obj.vypSheet);

  const existingRu = getExistingDatesFromColumn(dst, 1);
  const set = {};
  existingRu.forEach(ru => {
    const iso = parseAnyDateToIso(ru);
    if (iso) set[iso] = true;
  });
  set[targetIso] = true;

  const allDates = Object.keys(set).sort();
  const stats = rebuildVypForDatesFor(obj, dst, src, allDates);

  dst.activate();
  ss.toast(
    'Собрано дней: ' + stats.days + ', строк: ' + stats.rows,
    'Выполнение «' + obj.title + '» обновлено',
    3
  );
}

function rebuildVypForDatesFor(obj, dst, src, datesIso) {
  const lastRow = src.getLastRow();
  const rowsAll = lastRow < 2 ? [] : src.getRange(2, 1, lastRow - 1, 11).getValues();

  const byDate = {};
  rowsAll.forEach(row => {
    const objectName = String(row[0] || '').trim();
    if (!isObjectInFilter(objectName, obj.filterObjects)) return;

    const dateIso = normalizeDateCellToIso(row[1]);
    const name    = String(row[2] || '').trim();
    const floor   = String(row[3] || '').trim();
    const room    = String(row[4] || '').trim();
    const work    = String(row[5] || '').trim();
    const system  = String(row[6] || '').trim();
    const mat     = String(row[7] || '').trim();
    const unit    = String(row[8] || '').trim();
    const qty     = row[9];

    if (!dateIso) return;

    if (!byDate[dateIso]) byDate[dateIso] = { names: {}, rows: [] };
    if (name) byDate[dateIso].names[name] = true;

    if (isVypExcludedWorkType(work)) return;
    if (isVypExcluded(mat)) return;

    byDate[dateIso].rows.push({ object: objectName, floor, room, work, system, mat, unit, qty });
  });

  const out = [];
  const merges = [];
  let daysCount = 0;

  datesIso.forEach(dateIso => {
    const day = byDate[dateIso] || { names: {}, rows: [] };
    const workers = Object.keys(day.names).length;
    const summary = day.rows.length > 0 ? buildVypSummary(day.rows) : '';
    const dateRu = formatDateRu(dateIso);

    const startRow = out.length + 2;
    daysCount++;

    if (day.rows.length === 0) {
      out.push([dateRu, summary, '', '', '', '', '', '', '', workers || '']);
      return;
    }

    day.rows.forEach((r, idx) => {
      if (idx === 0) {
        out.push([dateRu, summary, r.floor, r.room, r.work, r.system, r.mat, r.unit, r.qty, workers]);
      } else {
        out.push(['', '', r.floor, r.room, r.work, r.system, r.mat, r.unit, r.qty, '']);
      }
    });

    if (day.rows.length > 1) {
      merges.push({ row: startRow, num: day.rows.length, col: 1 });
      merges.push({ row: startRow, num: day.rows.length, col: 2 });
      merges.push({ row: startRow, num: day.rows.length, col: 10 });
    }
  });

  resetVypSheet(dst);

  if (out.length === 0) return { days: 0, rows: 0 };

  applyVypFormatting(dst, 2, out.length);
  dst.getRange(2, 1, out.length, VYP_HEADERS.length).setValues(out);

  merges.forEach(m => {
    try { dst.getRange(m.row, m.col, m.num, 1).merge(); } catch (_) {}
  });

  return { days: daysCount, rows: out.length };
}

function buildVypSummary(rows) {
  const roomsByBuilding = {
    'Основное здание': {},
    'Крыло мастерских': {},
    'Чердак': {}
  };

  rows.forEach(r => {
    if (VYP_SUMMARY_EXCLUDED_WORKS.indexOf(r.work) !== -1) return;
    const object  = String(r.object || '').trim();
    const floor   = String(r.floor || '').trim();
    const roomStr = String(r.room || '').trim();
    if (!floor || !roomStr) return;

    roomStr.split(',').forEach(partRaw => {
      let part = partRaw.trim();
      if (!part) return;
      
      // Обрабатываем записи вида "12-15"
      let roomNums = [];
      if (part.includes('-')) {
        roomNums = part.split('-').map(s => s.trim()).filter(Boolean);
      } else {
        roomNums = [part];
      }

      roomNums.forEach(numStr => {
        const m = numStr.match(/^([кК]?)(\d+)$/);
        if (!m) return;
        const prefix = m[1] ? 'к' : '';
        const num = m[2];

        let building;
        if (floor === 'Чердак') building = 'Чердак';
        else if (prefix === 'к') building = 'Крыло мастерских';
        else building = 'Основное здание';

        const coords = lookupRoomCoords(object, building, floor, num);

        if (!roomsByBuilding[building][floor]) roomsByBuilding[building][floor] = {};
        const key = prefix + num;
        if (roomsByBuilding[building][floor][key] === undefined) {
          roomsByBuilding[building][floor][key] = coords || '';
        }
      });
    });
  });

  const buildingOrder = ['Основное здание', 'Крыло мастерских', 'Чердак'];
  const presentBuildings = buildingOrder.filter(b => Object.keys(roomsByBuilding[b]).length > 0);
  const showBuildingLabel = presentBuildings.length > 1;

  const parts = ['Монтаж кабельных линий для систем АПС, СОУЭ.'];

  presentBuildings.forEach(building => {
    if (showBuildingLabel) parts.push(building + '.');

    const floorsMap = roomsByBuilding[building];
    const floorKeys = Object.keys(floorsMap).sort((a, b) => vypFloorWeight(a) - vypFloorWeight(b));

    floorKeys.forEach(floorKey => {
      const roomMap = floorsMap[floorKey];
      const roomKeys = Object.keys(roomMap).sort(vypRoomCompare);

      const roomsStr = roomKeys.map(k => {
        const coords = roomMap[k];
        return coords ? k + ' (' + coords + ')' : k;
      }).join(', ');

      let floorLabel;
      if (floorKey === 'Подвал') floorLabel = 'Подвал:';
      else if (floorKey === 'Чердак') floorLabel = 'Чердак:';
      else floorLabel = floorKey + ' этаж:';

      parts.push(floorLabel + ' ' + roomsStr + '.');
    });
  });

  return parts.join(' ');
}

function vypFloorWeight(f) {
  if (f === 'Подвал') return -1;
  if (f === 'Чердак') return 1000;
  const n = parseInt(f, 10);
  return isFinite(n) ? n : 500;
}

function vypRoomCompare(a, b) {
  const mA = a.match(/^([кК]?)(\d+)$/);
  const mB = b.match(/^([кК]?)(\d+)$/);
  if (!mA || !mB) return String(a).localeCompare(String(b));
  const pA = mA[1] ? 1 : 0;
  const pB = mB[1] ? 1 : 0;
  if (pA !== pB) return pA - pB;
  return parseInt(mA[2], 10) - parseInt(mB[2], 10);
}

/* ============================================================
 *  СБОРКА «ОЖР»
 * ============================================================ */

function ojrBuildTodayFor(obj) {
  const tz = Session.getScriptTimeZone() || 'Europe/Moscow';
  const todayRu = Utilities.formatDate(new Date(), tz, 'dd.MM.yyyy');
  addOjrDateAndRebuildFor(obj, todayRu);
}

function ojrBuildAnotherDayFor(obj) {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt(
    'Сформировать ОЖР (' + obj.title + ')',
    'Введите дату в формате ДД.ММ.ГГГГ (например, 08.10.2026):',
    ui.ButtonSet.OK_CANCEL
  );
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const raw = String(res.getResponseText() || '').trim();
  const ru = parseAnyDateToRu(raw);
  if (!ru) {
    ui.alert('Не понял дату. Нужно ДД.ММ.ГГГГ или ГГГГ-ММ-ДД.');
    return;
  }
  addOjrDateAndRebuildFor(obj, ru);
}

function addOjrDateAndRebuildFor(obj, targetRu) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const srcVyp = ss.getSheetByName(obj.vypSheet);
  if (!srcVyp) {
    SpreadsheetApp.getUi().alert(
      'Не найден лист "' + obj.vypSheet + '".\n' +
      'Сначала соберите «Выполнение» для объекта «' + obj.title + '».'
    );
    return;
  }

  let dstOjr = ss.getSheetByName(obj.ojrSheet);
  if (!dstOjr) {
    dstOjr = ss.insertSheet(obj.ojrSheet);
    dstOjr.getRange(1, 1, 1, OJR_HEADERS.length).setValues([OJR_HEADERS]);
    dstOjr.setFrozenRows(1);
    dstOjr.getRange(1, 1, 1, OJR_HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#f1f5f9')
      .setVerticalAlignment('middle')
      .setHorizontalAlignment('center')
      .setWrap(true);
  }

  const existingRu = getExistingDatesFromColumn(dstOjr, 2);
  const set = {};
  existingRu.forEach(d => { if (d) set[d] = true; });
  set[targetRu] = true;

  const datesRu = Object.keys(set).sort(compareRuDates);

  const stats = rebuildOjrFor(obj, dstOjr, srcVyp, datesRu);

  dstOjr.activate();
  ss.toast(
    'Дней: ' + stats.days + ', строк: ' + stats.rows,
    'ОЖР «' + obj.title + '» обновлён',
    3
  );
}

function rebuildOjrFor(obj, dstOjr, srcVyp, datesRu) {
  const lastRow = srcVyp.getLastRow();
  const data = lastRow < 2 ? [] : srcVyp.getRange(2, 1, lastRow - 1, 10).getValues();

  const daysMap = {};
  let currentDateRu = null;

  data.forEach(row => {
    const dateRu   = String(row[0] || '').trim();
    const summary  = String(row[1] || '').trim();
    const work     = String(row[4] || '').trim();
    const material = String(row[6] || '').trim();

    if (dateRu && dateRu !== currentDateRu) {
      currentDateRu = dateRu;
      if (!daysMap[dateRu]) {
        daysMap[dateRu] = { summary: summary, materials: {} };
      } else if (summary && !daysMap[dateRu].summary) {
        daysMap[dateRu].summary = summary;
      }
    }

    if (!currentDateRu) return;
    if (work !== 'Монтаж') return;
    if (isOjrExcludedMaterial(material)) return;

    if (material && daysMap[currentDateRu]) {
      daysMap[currentDateRu].materials[material] = true;
    }
  });

  const out = [];
  datesRu.forEach(dateRu => {
    const day = daysMap[dateRu] || { summary: '', materials: {} };
    const text = buildOjrText(day.summary, Object.keys(day.materials));
    out.push(['', dateRu, '', text, OJR_RESPONSIBLE]);
  });

  resetOjrSheet(dstOjr);

  if (out.length === 0) return { days: 0, rows: 0 };

  applyOjrFormatting(dstOjr, 2, out.length);
  dstOjr.getRange(2, 1, out.length, OJR_HEADERS.length).setValues(out);

  dstOjr.setColumnWidth(1, 40);
  dstOjr.setColumnWidth(2, 100);
  dstOjr.setColumnWidth(3, 40);
  dstOjr.setColumnWidth(4, 500);
  dstOjr.setColumnWidth(5, 150);

  return { days: datesRu.length, rows: out.length };
}

function buildOjrText(summary, materialsArr) {
  const ordered = [];
  const usedSet = {};

  OJR_MATERIALS_ORDER.forEach(name => {
    if (materialsArr.indexOf(name) === -1) return;
    ordered.push(name);
    usedSet[name] = true;
  });

  materialsArr.forEach(m => {
    if (!usedSet[m]) ordered.push(m);
  });

  const parts = [];
  if (summary) parts.push(summary);
  if (ordered.length > 0) {
    parts.push('При выполнении работ применены: ' + ordered.join(', ') + '.');
  }
  return parts.join('\n');
}

/* ============================================================
 *  ОБЁРТКИ ДЛЯ МЕНЮ
 * ============================================================ */

// ─── Ларинская гимназия (LG) ───
function vypToday_LG()       { vypBuildTodayFor(getObjectByCode('LG')); }
function vypAnotherDay_LG()  { vypBuildAnotherDayFor(getObjectByCode('LG')); }
function ojrToday_LG()       { ojrBuildTodayFor(getObjectByCode('LG')); }
function ojrAnotherDay_LG()  { ojrBuildAnotherDayFor(getObjectByCode('LG')); }
function workersToday_LG()      { workersTodayFor(getObjectByCode('LG')); }
function workersAnotherDay_LG() { workersAnotherDayFor(getObjectByCode('LG')); }
function updateSummary_LG()     { updateSummaryFor(getObjectByCode('LG')); }
function gotoSummary_LG()       { gotoSummaryFor(getObjectByCode('LG')); }
function reportsGoto_LG()    { reportsGotoFor(getObjectByCode('LG')); }
function rejectedGoto_LG()   { rejectedGotoFor(getObjectByCode('LG')); }
function vypGoto_LG()        { vypGotoFor(getObjectByCode('LG')); }
function ojrGoto_LG()        { ojrGotoFor(getObjectByCode('LG')); }
function reportsClear_LG()   { reportsClearFor(getObjectByCode('LG')); }
function rejectedClear_LG()  { rejectedClearFor(getObjectByCode('LG')); }
function vypClear_LG()       { vypClearFor(getObjectByCode('LG')); }
function ojrClear_LG()       { ojrClearFor(getObjectByCode('LG')); }
function summaryClear_LG()   { summaryClearFor(getObjectByCode('LG')); }
function clearAll_LG()       { clearAllFor(getObjectByCode('LG')); }

// ─── ЖЕДЕПОМ (JD) ───
function vypToday_JD()       { vypBuildTodayFor(getObjectByCode('JD')); }
function vypAnotherDay_JD()  { vypBuildAnotherDayFor(getObjectByCode('JD')); }
function ojrToday_JD()       { ojrBuildTodayFor(getObjectByCode('JD')); }
function ojrAnotherDay_JD()  { ojrBuildAnotherDayFor(getObjectByCode('JD')); }
function workersToday_JD()      { workersTodayFor(getObjectByCode('JD')); }
function workersAnotherDay_JD() { workersAnotherDayFor(getObjectByCode('JD')); }
function updateSummary_JD()     { updateSummaryFor(getObjectByCode('JD')); }
function gotoSummary_JD()       { gotoSummaryFor(getObjectByCode('JD')); }
function reportsGoto_JD()    { reportsGotoFor(getObjectByCode('JD')); }
function rejectedGoto_JD()   { rejectedGotoFor(getObjectByCode('JD')); }
function vypGoto_JD()        { vypGotoFor(getObjectByCode('JD')); }
function ojrGoto_JD()        { ojrGotoFor(getObjectByCode('JD')); }
function reportsClear_JD()   { reportsClearFor(getObjectByCode('JD')); }
function rejectedClear_JD()  { rejectedClearFor(getObjectByCode('JD')); }
function vypClear_JD()       { vypClearFor(getObjectByCode('JD')); }
function ojrClear_JD()       { ojrClearFor(getObjectByCode('JD')); }
function summaryClear_JD()   { summaryClearFor(getObjectByCode('JD')); }
function clearAll_JD()       { clearAllFor(getObjectByCode('JD')); }