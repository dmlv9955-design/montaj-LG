/**
 * ============================================================
 *  ФОТОФИКСАЦИЯ — серверная часть
 * ============================================================
 */

const PHOTO_ROOT_BY_OBJECT = {
  'Ларинская гимназия': '1eB8bus_1Fzec6jK1Gc4CObwbTly51KUc',
  'ЖЕДЕПОМ':            '1TF0DXMfwgXhbyGM-ytoenUINndvO3m_X'
};

const PHOTO_MAX_SIZE = 8 * 1024 * 1024;

// ============================================================
//  ТОЧКА ВХОДА (вызывается из Code.gs — doPost)
// ============================================================
function handlePhotoPost(d, tz) {
  const check = validatePhotoPayload(d);
  if (!check.ok) {
    logPhotoAttempt(d, false, check.error, tz);
    return json({ ok: false, error: check.error });
  }

  try {
    const saved = savePhotoFile(d);
    logPhotoAttempt(d, true, 'OK: ' + saved.name, tz);
    return json({ ok: true, fileId: saved.id, fileName: saved.name });
  } catch (err) {
    const msg = String(err.message || err);
    logPhotoAttempt(d, false, 'savePhotoFile error: ' + msg, tz);
    return json({ ok: false, error: msg });
  }
}

// ============================================================
//  ЛОГ ПОПЫТОК (в таблицу пишем только ошибки)
// ============================================================
function logPhotoAttempt(d, ok, reason, tz) {
  try {
    if (ok) {
      console.log('✅ Фото сохранено: ' + reason);
      return;
    }

    let sheetName = 'Отклонённые';
    if (d && typeof d.object === 'string') {
      const obj = findObjectByFormValue(d.object);
      if (obj) sheetName = obj.rejectedSheet;
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(['timestamp', 'reason', 'payload', 'ip_hint']);
      sheet.setFrozenRows(1);
    }

    const shortPayload = {
      type: d.type,
      object: d.object,
      date: d.date,
      name: d.name,
      category: d.category,
      section: d.section,
      building: d.building,
      floor: d.floor,
      room: d.room,
      roomFrom: d.roomFrom,
      roomTo: d.roomTo,
      sideFrom: d.sideFrom,
      sideTo: d.sideTo,
      side: d.side,
      stage: d.stage,
      deviceAddress: d.deviceAddress,
      isCross: d.isCross,
      buildingTo: d.buildingTo,
      crossFloorTo: d.crossFloorTo,
      fileSize: d.fileData ? d.fileData.length : 0
    };

    sheet.appendRow([
      Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss'),
      '❌ ' + reason,
      JSON.stringify(shortPayload),
      ''
    ]);
  } catch (_) {}
}

// ============================================================
//  ВАЛИДАЦИЯ
// ============================================================
function validatePhotoPayload(d) {
  if (!d || typeof d !== 'object') return { ok: false, error: 'payload is not an object' };
  if (typeof d.name !== 'string' || !d.name.trim()) return { ok: false, error: 'no name' };
  if (!PHOTO_ROOT_BY_OBJECT[d.object]) return { ok: false, error: 'unknown object: ' + d.object };
  if (typeof d.fileData !== 'string' || !d.fileData) return { ok: false, error: 'no fileData' };
  if (d.fileData.length > PHOTO_MAX_SIZE) return { ok: false, error: 'file too big' };
  if (typeof d.category !== 'string' || !d.category) return { ok: false, error: 'no category' };
  if (typeof d.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.date)) {
    return { ok: false, error: 'invalid date' };
  }
  return { ok: true };
}

// ============================================================
//  СОХРАНЕНИЕ ОДНОГО ФОТО
// ============================================================
function savePhotoFile(d) {
  const rootId = PHOTO_ROOT_BY_OBJECT[d.object];
  const root = DriveApp.getFolderById(rootId);

  const masterName = String(d.name || '').trim();
  const masterFolder = getOrCreateChild(root, masterName);

  const dateRu = formatDateRuForFolder(d.date);
  const dateFolder = getOrCreateChild(masterFolder, dateRu);

  const result = resolvePhotoFolder(dateFolder, d);
  const folder = result.folder;
  const filePrefix = result.prefix;
  const useParens = result.useParens;

  const n = computeNextFileNumber(folder, filePrefix);
  const fileName = useParens
    ? (filePrefix + ' (' + n + ').jpg')
    : (filePrefix + ' ' + n + '.jpg');

  const blob = decodePhotoBlob(d.fileData, fileName);
  const file = folder.createFile(blob);

  return { id: file.getId(), name: file.getName() };
}

function resolvePhotoFolder(root, d) {
  const category = String(d.category || '').trim();

  if (category === 'Помещения') {
    const room = String(d.room || '').trim();
    if (!room) throw new Error('empty room');

    const roomLabel = applyKPrefix(room, d.building);

    // 1. Создаем путь: Помещения -> Этаж -> Помещение
    let folder = getOrCreateChild(root, 'Помещения');
    folder = walkFloor(folder, d.building, d.floor);
    folder = getOrCreateChild(folder, roomLabel);

    // 2. Извлекаем краткое название этапа (без скобок)
    const stage = stripStageBrackets(d.stage);

    // 3. Создаем подпапку с названием этапа (До работ, Поверхности и т.д.)
    if (stage) {
      folder = getOrCreateChild(folder, stage);
    }

    const prefix = roomLabel + (stage ? ' ' + stage : '');

    return { folder: folder, prefix: prefix, useParens: false };
  }

  if (category === 'Проходки') {
    const from = String(d.roomFrom || '').trim();
    const to   = String(d.roomTo   || '').trim();
    if (!from || !to) throw new Error('empty roomFrom/roomTo');

    const pNum = String(d.penetrationNum || '').trim();
    const suffix = pNum ? ' (' + pNum + ')' : '';

    let folderName = '';
    let folder = getOrCreateChild(root, 'Проходки');

    if (d.isCross) {
      const bFrom = String(d.building || '').trim();
      const fFrom = String(d.floor || '').trim();
      const bTo = String(d.buildingTo || '').trim();
      const fTo = String(d.crossFloorTo || d.floorTo || '').trim();

      const locFrom = (bFrom ? bFrom + ' ' : '') + (fFrom ? fFrom + 'эт ' : '') + 'пом.' + from;
      const locTo   = (bTo   ? bTo   + ' ' : '') + (fTo   ? fTo   + 'эт ' : '') + 'пом.' + to;

      const dirFromTo = locFrom + ' - ' + locTo + suffix;
      const dirToFrom = locTo   + ' - ' + locFrom + suffix;
      folderName = (d.side === 'from') ? dirFromTo : dirToFrom;

      folder = getOrCreateChild(folder, 'Сквозные');
      folder = getOrCreateChild(folder, folderName);
    } else {
      const fromLabel = applyKPrefix(from, d.building);
      const toLabel   = applyKPrefix(to,   d.building);

      let fromStr = fromLabel;
      let toStr = toLabel;

      if (from === to) {
        if (d.sideFrom) fromStr += ' (' + d.sideFrom + ')';
        if (d.sideTo) toStr += ' (' + d.sideTo + ')';
      }

      const dirFromTo = fromStr + '-' + toStr + suffix;
      const dirToFrom = toStr   + '-' + fromStr + suffix;
      folderName = (d.side === 'from') ? dirFromTo : dirToFrom;

      folder = walkFloor(folder, d.building, d.floor);
      folder = getOrCreateChild(folder, folderName);
    }

    const stage = stripStageBrackets(d.stage);
    const prefix = folderName + (stage ? ' ' + stage : '');

    return { folder: folder, prefix: prefix, useParens: false };
  }

  // ─── ОБОРУДОВАНИЕ / РАСКЛЮЧЕНИЕ ───
  const deviceCat = category;
  const address   = String(d.deviceAddress || '').trim();
  if (!address) throw new Error('empty deviceAddress');

  // Используем section для создания правильной корневой папки
  const topSection = String(d.section || 'Оборудование').trim();

  let folder = getOrCreateChild(root, topSection);
  folder = getOrCreateChild(folder, deviceCat);
  folder = getOrCreateChild(folder, address);

  return { folder: folder, prefix: address, useParens: true };
}

function applyKPrefix(room, building) {
  const r = String(room || '').trim();
  if (!r) return '';
  if (building === 'Крыло мастерских' && !/^[кК]/.test(r)) {
    return 'к' + r;
  }
  return r;
}

function walkFloor(parent, building, floor) {
  let floorName = '';
  if (building === 'Чердак') {
    floorName = 'Чердак';
  } else {
    const f = String(floor || '').trim();
    if (/^\d+$/.test(f))          floorName = f + ' этаж';
    else if (/^\d+-\d+$/.test(f)) floorName = f + ' этаж';
    else if (f)                   floorName = f;
    else                          floorName = 'Без этажа';
  }
  return getOrCreateChild(parent, floorName);
}

// ============================================================
//  УТИЛИТЫ
// ============================================================
function getOrCreateChild(parent, name) {
  const n = String(name || '').trim();
  if (!n) throw new Error('empty folder name');
  const it = parent.getFoldersByName(n);
  if (it.hasNext()) return it.next();
  return parent.createFolder(n);
}

function computeNextFileNumber(folder, prefix) {
  const esc = String(prefix).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const reNoParen = new RegExp('^' + esc + '\\s+(\\d+)\\.jpg$', 'i');
  const reParen   = new RegExp('^' + esc + '\\s+\\((\\d+)\\)\\.jpg$', 'i');

  let maxN = 0;
  const it = folder.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    const nm = f.getName();
    let m = nm.match(reNoParen) || nm.match(reParen);
    if (m) {
      const n = parseInt(m[1], 10);
      if (isFinite(n) && n > maxN) maxN = n;
    }
  }
  return maxN + 1;
}

function stripStageBrackets(stage) {
  const s = String(stage || '').trim();
  if (!s) return '';
  return s.replace(/\s*\([^)]*\)/g, '').trim();
}

function formatDateRuForFolder(iso) {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(iso || '');
  return m[3] + '.' + m[2] + '.' + m[1];
}

function decodePhotoBlob(fileData, fileName) {
  let base64 = String(fileData || '');
  const comma = base64.indexOf(',');
  if (comma !== -1) base64 = base64.slice(comma + 1);

  const bytes = Utilities.base64Decode(base64);
  return Utilities.newBlob(bytes, 'image/jpeg', fileName);
}