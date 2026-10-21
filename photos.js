// ============================================
//  ТЕМА (общая с index.html)
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

const MASTER_WING = 'Крыло мастерских';
const MASTER_WING_PREFIX = 'к';
const ATTIC = 'Чердак';

const STAGES_POMESHCHENIYA = [
  'До работ (общие планы)',
  'Поверхности (открытые потолки)',
  'Скрытые работы (за потолком armstrong или открытый кабель-канал)',
  'После работ (закрытые потолки или кабель-каналы)'
];

const STAGES_PROHODKI = [
  'До сверления',
  'Отверстие',
  'Гильза',
  'Кабель в гильзе',
  'Вата',
  'Герметик'
];

const EQUIPMENT_CATEGORIES = [
  'BIAD звуковые оповещатели',
  'BIAL световые оповещатели',
  'BTH дымовые извещатели',
  'BTLI линейные извещатели',
  'BTM ручные извещатели',
  'IZ блоки разветвительные',
  'SC блоки КП'
];

const EQUIPMENT_SHORT = {
  'BIAD звуковые оповещатели':  'BIAD',
  'BIAL световые оповещатели':  'BIAL',
  'BTH дымовые извещатели':     'BTH',
  'BTLI линейные извещатели':   'BTLI',
  'BTM ручные извещатели':      'BTM',
  'IZ блоки разветвительные':   'IZ',
  'SC блоки КП':                'SC'
};

const MAX_IMAGE_SIDE = 1280;
const JPEG_QUALITY   = 0.75;
const DATE_MIN_DAYS_AGO = 7;

// ============================================
//  СОСТОЯНИЕ
// ============================================
function makeEmptyPomeshchenieItem() {
  return { building: '', floor: '', room: '', stages: {} };
}

function makeEmptyProhodkaItem() {
  return {
    building: '', floor: '',
    roomFrom: '', roomTo: '',
    penetrationNum: '', // <--- ДОБАВЛЕНО
    betweenFloors: false,
    floorFrom: '', floorTo: '',
    stages: {}
  };
}

function makeEmptyEquipmentItem() {
  return { address: '', photos: [] };
}

const photoState = {
  'Помещения':    { expanded: false, items: [makeEmptyPomeshchenieItem()] },
  'Проходки':     { expanded: false, items: [makeEmptyProhodkaItem()] },
  'Оборудование': { expanded: false, subs: {} }
};

EQUIPMENT_CATEGORIES.forEach(cat => {
  photoState['Оборудование'].subs[cat] = {
    expanded: false,
    items: [makeEmptyEquipmentItem()]
  };
});

function resetAllState() {
  photoState['Помещения']    = { expanded: false, items: [makeEmptyPomeshchenieItem()] };
  photoState['Проходки']     = { expanded: false, items: [makeEmptyProhodkaItem()] };
  photoState['Оборудование'] = { expanded: false, subs: {} };
  EQUIPMENT_CATEGORIES.forEach(cat => {
    photoState['Оборудование'].subs[cat] = {
      expanded: false,
      items: [makeEmptyEquipmentItem()]
    };
  });
}

// ============================================
//  УТИЛИТЫ
// ============================================
function $(id) { return document.getElementById(id); }

function showToast(text) {
  const el = $('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => el.classList.remove('show'), 2200);
}

function showMsg(text, cls) {
  const m = $('msg');
  m.textContent = text || '';
  m.className = cls || '';
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function isNameValid(value) {
  const v = String(value || '').trim();
  return /^[А-ЯЁA-Z][а-яёa-z]+(?:-[А-ЯЁA-Z][а-яёa-z]+)?\s+[А-ЯЁA-Z][а-яёa-z]+(?:-[А-ЯЁA-Z][а-яёa-z]+)?$/.test(v);
}

function formatName(value) {
  let cleaned = value.replace(/[^А-Яа-яЁёA-Za-z\s-]/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ').replace(/-+/g, '-').replace(/\s-|-\s/g, '-');
  cleaned = cleaned.replace(/(^|\s|-)([а-яёa-z])/g, (m, p1, p2) => p1 + p2.toUpperCase());
  const parts = cleaned.split(' ');
  if (parts.length > 2) cleaned = parts.slice(0, 2).join(' ');
  return cleaned;
}

function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function getFloorsFor(object, building) {
  if (building && FLOORS_OVERRIDE_BY_BUILDING[building]) return FLOORS_OVERRIDE_BY_BUILDING[building];
  return FLOORS_BY_OBJECT[object] || null;
}

function isBuildingRequired() { return !!BUILDINGS_BY_OBJECT[objectSelect.value]; }
function isMasterWingBuilding(b) { return b === MASTER_WING; }
function isAtticBuilding(b) { return b === ATTIC; }

function formatDeviceAddress(val) {
  let s = String(val == null ? '' : val);
  s = s.replace(/[^0-9]+/g, '.');
  s = s.replace(/^\.+/, '');
  let parts = s.split('.');
  if (parts.length > 2) {
    parts = parts.slice(0, 2);
  }
  return parts.join('.');
}

// ============================================
//  СЖАТИЕ ФОТО
// ============================================
function compressImage(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Не картинка: ' + file.name));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Не удалось открыть картинку'));
      img.onload = () => {
        try {
          let w = img.width;
          let h = img.height;
          const max = MAX_IMAGE_SIDE;
          if (w > max || h > max) {
            if (w >= h) { h = Math.round(h * max / w); w = max; }
            else        { w = Math.round(w * max / h); h = max; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
          resolve(dataUrl);
        } catch (e) {
          reject(e);
        }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function approxBytesFromDataUrl(dataUrl) {
  const b64 = dataUrl.split(',')[1] || '';
  return Math.round(b64.length * 0.75);
}

// ============================================
//  ВЕРХНИЕ ЭЛЕМЕНТЫ
// ============================================
const objectSelect = $('object');
const nameInput    = $('name');
const nameErr      = $('err-name');
const objectErr    = $('err-object');
const dateInput    = $('date');
const objectSeg    = $('object-segmented');
const container    = $('photo-works-container');

// ============================================
//  ДАТА
// ============================================
function setupDateRange() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const minDate = new Date(today); minDate.setDate(minDate.getDate() - DATE_MIN_DAYS_AGO);
  dateInput.min = toISODate(minDate);
  dateInput.max = toISODate(today);
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

// ============================================
//  ПАРАМЕТРЫ ИЗ URL
// ============================================
(function applyUrlParams() {
  const qs = new URLSearchParams(window.location.search);
  const name = qs.get('name');
  const object = qs.get('object');
  const date = qs.get('date');

  if (name) nameInput.value = formatName(name);
  if (date) {
    dateInput.value = date;
    if (dateInput.value < dateInput.min) dateInput.value = dateInput.min;
    if (dateInput.value > dateInput.max) dateInput.value = dateInput.max;
    updateDateHighlight();
  }

  if (object && (object === 'Ларинская гимназия' || object === 'ЖЕДЕПОМ')) {
    setTimeout(() => {
      if (isNameValid(nameInput.value)) {
        objectSelect.value = object;
        if (objectSelect._updateSegmentedDisplay) objectSelect._updateSegmentedDisplay();
        refreshNameGates();
        updateFieldState(objectSelect);
        renderAll();
      }
    }, 50);
  }
})();

// ============================================
//  SEGMENTED CONTROL
// ============================================
class SegmentedControl {
  constructor(rootEl) {
    this.root = rootEl;
    this.input = rootEl.querySelector('input[type="hidden"]');
  }
  get value() { return this.input.value; }
  set value(v) { this.input.value = v || ''; this.updateDisplay(); }
  get disabled() { return this.root.classList.contains('segmented-disabled'); }
  set disabled(v) { this.root.classList.toggle('segmented-disabled', !!v); this.input.disabled = !!v; }
  updateDisplay() {
    const v = this.input.value;
    this.root.querySelectorAll('.segmented-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === v);
    });
  }
}

function initSegmented(rootId, inputId) {
  const root = $(rootId);
  const input = $(inputId);
  if (!root || !input) return;

  function updateDisplay() {
    root.querySelectorAll('.segmented-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.value === input.value);
    });
  }

  root.querySelectorAll('.segmented-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (root.classList.contains('segmented-disabled')) return;
      if (btn.disabled) return;
      input.value = btn.dataset.value;
      input.dispatchEvent(new Event('change', { bubbles: true }));
      updateDisplay();
    });
  });

  input.addEventListener('change', updateDisplay);
  updateDisplay();
  input._updateSegmentedDisplay = updateDisplay;
}
initSegmented('object-segmented', 'object');

// ============================================
//  ПОДСВЕТКА ПОЛЕЙ
// ============================================
function updateNameVisual(el) {
  if (!el) return;
  el.classList.remove('is-empty', 'is-partial', 'is-filled', 'is-invalid');
  if (el.disabled) return;
  const v = String(el.value || '').trim();
  if (!v) el.classList.add('is-empty');
  else if (!isNameValid(v)) el.classList.add('is-partial');
  else el.classList.add('is-filled');
}

function updateFieldState(el) {
  if (!el) return;

  if (el.id === 'name') {
    updateNameVisual(el);
    return;
  }

  const wrap = el.closest && el.closest('.segmented');
  if (wrap) {
    if (el.disabled || wrap.classList.contains('segmented-disabled')) {
      wrap.classList.remove('is-empty', 'is-filled');
      return;
    }
    if (el.id === 'object') {
      wrap.classList.remove('is-empty', 'is-filled');
      const nameOk = isNameValid(nameInput.value);
      const val = String(el.value || '').trim();
      const isEmpty = nameOk && !val;
      wrap.classList.toggle('is-empty', isEmpty);
      wrap.classList.toggle('is-filled', !!val);
    }
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

// ============================================
//  ГЕЙТЫ
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
  } else {
    objectSeg.classList.remove('segmented-disabled');
  }

  updateFieldState(nameInput);
  updateFieldState(dateInput);
  updateFieldState(objectSelect);
  updateSendButtonState();
}

// ============================================
//  ИМЯ
// ============================================
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
  refreshNameGates();
  renderAll();
});

nameInput.addEventListener('blur', () => {
  const v = nameInput.value.trim();
  if (v && !isNameValid(v)) {
    nameErr.textContent = 'Введите Имя и Фамилию — ровно 2 слова';
    nameErr.classList.add('show');
  } else {
    nameErr.classList.remove('show');
  }
  refreshNameGates();
});

// ============================================
//  КНОПКА ОЧИСТКИ ИМЕНИ
// ============================================
(function attachClearName() {
  const btn = $('clear-name');
  if (!btn) return;
  function update() {
    btn.style.display = nameInput.value && !nameInput.disabled ? 'inline-flex' : 'none';
  }
  nameInput.addEventListener('input', update);
  nameInput.addEventListener('change', update);
  btn.addEventListener('click', () => {
    nameInput.value = '';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
    nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    nameInput.focus();
    update();
  });
  update();
})();

// ============================================
//  ОБЪЕКТ
// ============================================
let prevObject = objectSelect.value;

objectSelect.addEventListener('change', () => {
  const hasPhotos = collectPhotos(false).length > 0 || collectPhotos(true).length > 0;
  if (hasPhotos && prevObject && objectSelect.value !== prevObject) {
    const ok = confirm('При смене объекта загруженные фото будут удалены. Продолжить?');
    if (!ok) {
      objectSelect.value = prevObject;
      if (objectSelect._updateSegmentedDisplay) objectSelect._updateSegmentedDisplay();
      updateFieldState(objectSelect);
      return;
    }
    resetAllState();
  }
  prevObject = objectSelect.value;
  updateFieldState(objectSelect);
  renderAll();
});

// ============================================
//  РЕНДЕР
// ============================================
function renderAll() {
  container.innerHTML = '';

  const object = objectSelect.value;
  const enabled = !!object;

  if (!enabled) {
    const placeholder = document.createElement('div');
    placeholder.className = 'hint-small';
    placeholder.style.textAlign = 'center';
    placeholder.style.padding = '16px 8px';
    placeholder.textContent = '🔒 Сначала введите имя и выберите объект';
    container.appendChild(placeholder);
    updateSendButtonState();
    return;
  }

  container.appendChild(renderTopLevel('Помещения'));
  container.appendChild(renderTopLevel('Проходки'));
  container.appendChild(renderTopLevel('Оборудование'));

  updateSendButtonState();
}

function renderTopLevel(title) {
  const wrapper = document.createElement('div');
  wrapper.className = 'accordion-item';
  wrapper.dataset.top = title;

  const st = photoState[title];

  const header = document.createElement('button');
  header.type = 'button';
  header.className = 'accordion-header accordion-header-montazh';
  if (st.expanded) header.classList.add('expanded');

  const emoji = title === 'Помещения' ? '🚪' : title === 'Проходки' ? '🔩' : '📦';
  header.innerHTML =
    '<span class="acc-emoji">' + emoji + '</span>' +
    '<span class="acc-label">' + escapeHtml(title) + '</span>' +
    '<span class="acc-arrow">▼</span>';

  header.addEventListener('click', () => {
    st.expanded = !st.expanded;
    renderAll();
  });

  wrapper.appendChild(header);

  const body = document.createElement('div');
  body.className = 'accordion-body' + (st.expanded ? ' open' : '');

  if (st.expanded) {
    if (title === 'Помещения') body.appendChild(renderPomeshcheniyaSection());
    else if (title === 'Проходки') body.appendChild(renderProhodkiSection());
    else if (title === 'Оборудование') body.appendChild(renderOborudovanieSection());
  }

  wrapper.appendChild(body);
  return wrapper;
}

// ============================================
//  КОРПУС / ЭТАЖ
// ============================================
function renderBuildingRow(item, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'mat-line';

  const lbl = document.createElement('span');
  lbl.className = 'mat-line-label';
  lbl.textContent = 'Корпус:';
  wrap.appendChild(lbl);

  const btns = document.createElement('div');
  btns.className = 'mat-line-corp';

  const list = BUILDINGS_BY_OBJECT[objectSelect.value] || [];
  list.forEach(val => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'loc-floor-btn' + (item.building === val ? ' active' : '');
    b.textContent = val;
    b.addEventListener('click', () => {
      item.building = val;
      item.floor = '';
      if (item.room !== undefined) item.room = '';
      if (item.roomFrom !== undefined) { item.roomFrom = ''; item.roomTo = ''; }
      onChange();
    });
    btns.appendChild(b);
  });
  wrap.appendChild(btns);
  return wrap;
}

function renderFloorRow(item, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'mat-line';

  const lbl = document.createElement('span');
  lbl.className = 'mat-line-label';
  lbl.textContent = 'Этаж:';
  wrap.appendChild(lbl);

  const btns = document.createElement('div');
  btns.className = 'mat-line-floors';

  const floors = getFloorsFor(objectSelect.value, item.building) || [];
  const buildingChosen = !isBuildingRequired() || !!item.building;

  floors.forEach(f => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'loc-floor-btn' + (item.floor === f ? ' active' : '');
    b.textContent = f;
    if (!buildingChosen) b.disabled = true;
    b.addEventListener('click', () => {
      item.floor = f;
      onChange();
    });
    btns.appendChild(b);
  });

  wrap.appendChild(btns);
  return wrap;
}

function isAtticItem(item) { return item.building === ATTIC; }

// ============================================
//  ПОМЕЩЕНИЯ
// ============================================
function renderPomeshcheniyaSection() {
  const wrap = document.createElement('div');
  const st = photoState['Помещения'];

  st.items.forEach((item, idx) => {
    wrap.appendChild(renderPomeshchenieItem(item, idx));
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'mat-add-floor';
  addBtn.textContent = '+ Добавить помещение';
  addBtn.addEventListener('click', () => {
    st.items.push(makeEmptyPomeshchenieItem());
    renderAll();
  });
  wrap.appendChild(addBtn);

  return wrap;
}

function renderPomeshchenieItem(item, idx) {
  const st = photoState['Помещения'];
  const card = document.createElement('div');
  card.className = 'mat-row';
  card.style.marginTop = '12px';

  if (st.items.length > 1) {
    const top = document.createElement('div');
    top.className = 'mat-row-num';
    top.textContent = 'Помещение ' + (idx + 1);
    top.style.position = 'relative';

    if (idx > 0) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'mat-row-del';
      del.textContent = '×';
      del.title = 'Удалить';
      del.addEventListener('click', () => {
        st.items.splice(idx, 1);
        renderAll();
      });
      top.appendChild(del);
    }
    card.appendChild(top);
  }

  if (isBuildingRequired()) card.appendChild(renderBuildingRow(item, renderAll));
  if (!isAtticItem(item)) card.appendChild(renderFloorRow(item, renderAll));

  const roomLine = document.createElement('div');
  roomLine.className = 'mat-line';
  const roomLbl = document.createElement('span');
  roomLbl.className = 'mat-line-label';
  roomLbl.textContent = 'Помещение:';
  roomLine.appendChild(roomLbl);

  const roomWrap = document.createElement('div');
  roomWrap.className = 'mat-line-room';
  if (isMasterWingBuilding(item.building)) {
    const p = document.createElement('span');
    p.className = 'room-prefix';
    p.textContent = MASTER_WING_PREFIX;
    roomWrap.appendChild(p);
  }
  const roomInp = document.createElement('input');
  roomInp.type = 'text';
  roomInp.inputMode = 'numeric';
  roomInp.pattern = '[0-9]*';
  roomInp.className = 'loc-room-input';
  roomInp.placeholder = '45';
  roomInp.value = item.room || '';
  roomInp.addEventListener('input', () => {
    item.room = roomInp.value.replace(/[^0-9]/g, '');
    if (roomInp.value !== item.room) roomInp.value = item.room;
    updateSendButtonState();
  });
  roomWrap.appendChild(roomInp);
  roomLine.appendChild(roomWrap);
  card.appendChild(roomLine);

  const stagesTitle = document.createElement('div');
  stagesTitle.className = 'section-subtitle';
  stagesTitle.style.marginTop = '12px';
  stagesTitle.textContent = 'Какие этапы сфотографированы';
  card.appendChild(stagesTitle);

  STAGES_POMESHCHENIYA.forEach(stageName => {
    card.appendChild(renderStageCheckboxPomeshchenie(item, stageName));
  });

  return card;
}

function renderStageCheckboxPomeshchenie(item, stageName) {
  const wrap = document.createElement('div');
  wrap.style.marginTop = '8px';

  const isChecked = !!item.stages[stageName];
  const line = document.createElement('label');
  line.style.display = 'flex';
  line.style.alignItems = 'center';
  line.style.gap = '8px';
  line.style.cursor = 'pointer';
  line.style.padding = '6px 4px';

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = isChecked;
  cb.style.width = '18px';
  cb.style.height = '18px';
  cb.style.flexShrink = '0';
  cb.addEventListener('change', () => {
    if (cb.checked) item.stages[stageName] = item.stages[stageName] || [];
    else            delete item.stages[stageName];
    renderAll();
  });

  const txt = document.createElement('span');
  txt.textContent = stageName;
  txt.style.fontSize = '13px';
  txt.style.lineHeight = '1.3';

  line.appendChild(cb);
  line.appendChild(txt);
  wrap.appendChild(line);

  if (isChecked) {
    const zone = document.createElement('div');
    zone.style.marginTop = '6px';
    zone.style.marginLeft = '26px';
    zone.appendChild(renderPhotoPicker(item.stages[stageName]));
    wrap.appendChild(zone);
  }

  return wrap;
}

// ============================================
//  ПРОХОДКИ
// ============================================
function renderProhodkiSection() {
  const wrap = document.createElement('div');
  const st = photoState['Проходки'];

  st.items.forEach((item, idx) => {
    wrap.appendChild(renderProhodkaItem(item, idx));
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'mat-add-floor';
  addBtn.textContent = '+ Добавить проходку';
  addBtn.addEventListener('click', () => {
    st.items.push(makeEmptyProhodkaItem());
    renderAll();
  });
  wrap.appendChild(addBtn);

  return wrap;
}

function renderProhodkaItem(item, idx) {
  const st = photoState['Проходки'];
  const card = document.createElement('div');
  card.className = 'mat-row';
  card.style.marginTop = '12px';

  if (st.items.length > 1) {
    const top = document.createElement('div');
    top.className = 'mat-row-num';
    top.textContent = 'Проходка ' + (idx + 1);
    top.style.position = 'relative';

    if (idx > 0) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'mat-row-del';
      del.textContent = '×';
      del.title = 'Удалить';
      del.addEventListener('click', () => {
        st.items.splice(idx, 1);
        renderAll();
      });
      top.appendChild(del);
    }
    card.appendChild(top);
  }

  if (isBuildingRequired()) card.appendChild(renderBuildingRow(item, renderAll));
  if (!isAtticItem(item)) {
    card.appendChild(renderFloorRow(item, renderAll));

    const betweenLine = document.createElement('div');
    betweenLine.className = 'mat-line';
    betweenLine.style.marginTop = '6px';

    const betweenBtn = document.createElement('button');
    betweenBtn.type = 'button';
    betweenBtn.className = 'loc-floor-btn' + (item.betweenFloors ? ' active' : '');
    betweenBtn.textContent = 'Между этажами';
    betweenBtn.addEventListener('click', () => {
      item.betweenFloors = !item.betweenFloors;
      if (item.betweenFloors) {
        item.floor = '';
        item.floorFrom = '';
        item.floorTo = '';
      }
      renderAll();
    });
    betweenLine.appendChild(betweenBtn);
    card.appendChild(betweenLine);

    if (item.betweenFloors) {
      const floorRangeLine = document.createElement('div');
      floorRangeLine.className = 'mat-line';
      floorRangeLine.style.marginTop = '6px';

      const lbl = document.createElement('span');
      lbl.className = 'mat-line-label';
      lbl.textContent = 'с этажа:';
      floorRangeLine.appendChild(lbl);

      const floors = getFloorsFor(objectSelect.value, item.building) || [];
      const selFrom = document.createElement('select');
      selFrom.className = 'loc-room-input';
      selFrom.style.width = '80px';
      const optEmpty = document.createElement('option');
      optEmpty.value = ''; optEmpty.textContent = '—';
      selFrom.appendChild(optEmpty);
      floors.forEach(f => {
        const o = document.createElement('option');
        o.value = f; o.textContent = f;
        if (item.floorFrom === f) o.selected = true;
        selFrom.appendChild(o);
      });
      selFrom.addEventListener('change', () => {
        item.floorFrom = selFrom.value;
        item.floor = normalizeFloorRange(item.floorFrom, item.floorTo);
        renderAll();
      });
      floorRangeLine.appendChild(selFrom);

      const lbl2 = document.createElement('span');
      lbl2.className = 'mat-line-label';
      lbl2.textContent = 'по этаж:';
      lbl2.style.marginLeft = '6px';
      floorRangeLine.appendChild(lbl2);

      const selTo = document.createElement('select');
      selTo.className = 'loc-room-input';
      selTo.style.width = '80px';
      const optEmpty2 = document.createElement('option');
      optEmpty2.value = ''; optEmpty2.textContent = '—';
      selTo.appendChild(optEmpty2);
      floors.forEach(f => {
        const o = document.createElement('option');
        o.value = f; o.textContent = f;
        if (item.floorTo === f) o.selected = true;
        selTo.appendChild(o);
      });
      selTo.addEventListener('change', () => {
        item.floorTo = selTo.value;
        item.floor = normalizeFloorRange(item.floorFrom, item.floorTo);
        renderAll();
      });
      floorRangeLine.appendChild(selTo);

      card.appendChild(floorRangeLine);
    }
  }

  // ─── ИЗ / В ПОМЕЩЕНИЕ — одной строкой ───
  const roomsLine = document.createElement('div');
  roomsLine.style.display = 'flex';
  roomsLine.style.flexWrap = 'nowrap';
  roomsLine.style.alignItems = 'center';
  roomsLine.style.gap = '4px';
  roomsLine.style.marginTop = '8px';
  roomsLine.style.width = '100%';

  const fromLbl = document.createElement('span');
  fromLbl.style.fontSize = '11px';
  fromLbl.style.fontWeight = '600';
  fromLbl.style.color = 'var(--text-hint)';
  fromLbl.style.whiteSpace = 'nowrap';
  fromLbl.style.flex = '0 0 auto';
  fromLbl.textContent = 'Из помещения:';
  roomsLine.appendChild(fromLbl);

  const fromInp = document.createElement('input');
  fromInp.type = 'text';
  fromInp.inputMode = 'numeric';
  fromInp.pattern = '[0-9]*';
  fromInp.className = 'loc-room-input';
  fromInp.style.flex = '1 1 0';
  fromInp.style.minWidth = '0';
  fromInp.style.width = 'auto';
  fromInp.style.maxWidth = '70px';
  fromInp.value = item.roomFrom || '';
  fromInp.addEventListener('input', () => {
    item.roomFrom = fromInp.value.replace(/[^0-9]/g, '');
    if (fromInp.value !== item.roomFrom) fromInp.value = item.roomFrom;
    updateSendButtonState();
  });
  roomsLine.appendChild(fromInp);

  const toLbl = document.createElement('span');
  toLbl.style.fontSize = '11px';
  toLbl.style.fontWeight = '600';
  toLbl.style.color = 'var(--text-hint)';
  toLbl.style.whiteSpace = 'nowrap';
  toLbl.style.flex = '0 0 auto';
  toLbl.style.marginLeft = '4px';
  toLbl.textContent = 'В помещение:';
  roomsLine.appendChild(toLbl);

  const toInp = document.createElement('input');
  toInp.type = 'text';
  toInp.inputMode = 'numeric';
  toInp.pattern = '[0-9]*';
  toInp.className = 'loc-room-input';
  toInp.style.flex = '1 1 0';
  toInp.style.minWidth = '0';
  toInp.style.width = 'auto';
  toInp.style.maxWidth = '70px';
  toInp.value = item.roomTo || '';
  toInp.addEventListener('input', () => {
    item.roomTo = toInp.value.replace(/[^0-9]/g, '');
    if (toInp.value !== item.roomTo) toInp.value = item.roomTo;
    updateSendButtonState();
  });
  roomsLine.appendChild(toInp);

  card.appendChild(roomsLine);

  // ─── № ПРОХОДКИ ───
  const numLine = document.createElement('div');
  numLine.className = 'mat-line';
  numLine.style.marginTop = '6px';

  const numLbl = document.createElement('span');
  numLbl.className = 'mat-line-label';
  numLbl.textContent = '№ проходки:';
  numLine.appendChild(numLbl);

  const numInp = document.createElement('input');
  numInp.type = 'text';
  numInp.inputMode = 'numeric';
  numInp.pattern = '[0-9]*';
  numInp.className = 'loc-room-input';
  numInp.style.width = '80px';
  numInp.placeholder = '1';
  numInp.value = item.penetrationNum || '';
  numInp.addEventListener('input', () => {
    item.penetrationNum = numInp.value.replace(/[^0-9]/g, '');
    if (numInp.value !== item.penetrationNum) numInp.value = item.penetrationNum;
    updateSendButtonState();
  });
  numLine.appendChild(numInp);
  card.appendChild(numLine);
  // ───────────────────

  const stagesTitle = document.createElement('div');
  stagesTitle.className = 'section-subtitle';
  stagesTitle.style.marginTop = '12px';
  stagesTitle.textContent = 'Какие этапы сфотографированы';
  card.appendChild(stagesTitle);

  STAGES_PROHODKI.forEach(stageName => {
    card.appendChild(renderStageCheckboxProhodka(item, stageName));
  });

  return card;
}

function normalizeFloorRange(a, b) {
  const na = parseInt(a, 10);
  const nb = parseInt(b, 10);
  if (!isFinite(na) || !isFinite(nb) || na === nb) return a || '';
  if (na > nb) return nb + '-' + na + ' этаж';
  return na + '-' + nb + ' этаж';
}

function renderStageCheckboxProhodka(item, stageName) {
  const wrap = document.createElement('div');
  wrap.style.marginTop = '8px';

  const isChecked = !!item.stages[stageName];
  const line = document.createElement('label');
  line.style.display = 'flex';
  line.style.alignItems = 'center';
  line.style.gap = '8px';
  line.style.cursor = 'pointer';
  line.style.padding = '6px 4px';

  const cb = document.createElement('input');
  cb.type = 'checkbox';
  cb.checked = isChecked;
  cb.style.width = '18px';
  cb.style.height = '18px';
  cb.style.flexShrink = '0';
  cb.addEventListener('change', () => {
    if (cb.checked) item.stages[stageName] = { from: [], to: [] };
    else            delete item.stages[stageName];
    renderAll();
  });

  const txt = document.createElement('span');
  txt.textContent = stageName;
  txt.style.fontSize = '13px';
  txt.style.lineHeight = '1.3';

  line.appendChild(cb);
  line.appendChild(txt);
  wrap.appendChild(line);

  if (isChecked) {
    const stg = item.stages[stageName];
    const zone = document.createElement('div');
    zone.style.marginTop = '6px';
    zone.style.marginLeft = '26px';

    const fromLabel = document.createElement('div');
    fromLabel.style.fontWeight = '700';
    fromLabel.style.fontSize = '12px';
    fromLabel.style.marginTop = '6px';
    fromLabel.textContent = 'Из помещения ' + (item.roomFrom || '?');
    zone.appendChild(fromLabel);
    zone.appendChild(renderPhotoPicker(stg.from));

    const toLabel = document.createElement('div');
    toLabel.style.fontWeight = '700';
    toLabel.style.fontSize = '12px';
    toLabel.style.marginTop = '10px';
    toLabel.textContent = 'Из помещения ' + (item.roomTo || '?');
    zone.appendChild(toLabel);
    zone.appendChild(renderPhotoPicker(stg.to));

    wrap.appendChild(zone);
  }

  return wrap;
}

// ============================================
//  ОБОРУДОВАНИЕ
// ============================================
function renderOborudovanieSection() {
  const wrap = document.createElement('div');
  EQUIPMENT_CATEGORIES.forEach(catName => {
    wrap.appendChild(renderEquipmentSub(catName));
  });
  return wrap;
}

function renderEquipmentSub(catName) {
  const st = photoState['Оборудование'].subs[catName];
  const wrapper = document.createElement('div');
  wrapper.className = 'accordion-item';
  wrapper.style.marginTop = '8px';

  const header = document.createElement('button');
  header.type = 'button';
  header.className = 'accordion-header accordion-header-montazh';
  header.style.padding = '12px 14px';
  header.style.fontSize = '14px';
  header.style.position = 'static';
  if (st.expanded) header.classList.add('expanded');

  header.innerHTML =
    '<span class="acc-label">' + escapeHtml(catName) + '</span>' +
    '<span class="acc-arrow">▼</span>';

  header.addEventListener('click', () => {
    st.expanded = !st.expanded;
    renderAll();
  });

  wrapper.appendChild(header);

  const body = document.createElement('div');
  body.className = 'accordion-body' + (st.expanded ? ' open' : '');
  if (st.expanded) {
    st.items.forEach((item, idx) => {
      body.appendChild(renderEquipmentItem(catName, item, idx));
    });

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'mat-add-floor';
    addBtn.textContent = '+ Добавить устройство';
    addBtn.addEventListener('click', () => {
      st.items.push(makeEmptyEquipmentItem());
      renderAll();
    });
    body.appendChild(addBtn);
  }

  wrapper.appendChild(body);
  return wrapper;
}

function renderEquipmentItem(catName, item, idx) {
  const st = photoState['Оборудование'].subs[catName];
  const card = document.createElement('div');
  card.className = 'mat-row';
  card.style.marginTop = '10px';

  if (st.items.length > 1) {
    const top = document.createElement('div');
    top.className = 'mat-row-num';
    top.textContent = 'Устройство ' + (idx + 1);
    top.style.position = 'relative';

    if (idx > 0) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'mat-row-del';
      del.textContent = '×';
      del.title = 'Удалить';
      del.addEventListener('click', () => {
        st.items.splice(idx, 1);
        renderAll();
      });
      top.appendChild(del);
    }
    card.appendChild(top);
  }

  const line = document.createElement('div');
  line.className = 'mat-line';
  const lbl = document.createElement('span');
  lbl.className = 'mat-line-label';
  lbl.textContent = 'Адрес:';
  line.appendChild(lbl);

  const inp = document.createElement('input');
  inp.type = 'text';
  inp.className = 'loc-room-input';
  inp.style.width = '120px';
  inp.placeholder = '2.45';
  inp.value = item.address || '';
  
  inp.addEventListener('input', () => {
    const before = inp.value;
    const after = formatDeviceAddress(before);
    
    if (before !== after) {
      const pos = inp.selectionStart;
      const delta = before.length - after.length;
      inp.value = after;
      inp.setSelectionRange(pos - delta, pos - delta);
    }
    
    item.address = inp.value;
    updateSendButtonState();
  });
  
  line.appendChild(inp);
  card.appendChild(line);

  const photosLbl = document.createElement('div');
  photosLbl.className = 'section-subtitle';
  photosLbl.style.marginTop = '8px';
  photosLbl.textContent = 'Фото';
  card.appendChild(photosLbl);

  card.appendChild(renderPhotoPicker(item.photos));

  return card;
}

// ============================================
//  ПИКЕР ФОТО
// ============================================
function renderPhotoPicker(photosArr) {
  const wrap = document.createElement('div');
  const grid = document.createElement('div');
  grid.style.display = 'flex';
  grid.style.flexWrap = 'wrap';
  grid.style.gap = '8px';
  grid.style.marginTop = '6px';

  photosArr.forEach((ph, pIdx) => {
    const cell = document.createElement('div');
    cell.style.position = 'relative';
    cell.style.width = '72px';
    cell.style.height = '72px';
    cell.style.borderRadius = '8px';
    cell.style.overflow = 'hidden';
    cell.style.border = '1.5px solid ' + (ph._sent ? 'var(--green-border)' : 'var(--border)');

    const img = document.createElement('img');
    img.src = ph.dataUrl;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    if (ph._sent) img.style.opacity = '.55';
    cell.appendChild(img);

    if (ph._sent) {
      const badge = document.createElement('div');
      badge.textContent = '✓';
      badge.style.position = 'absolute';
      badge.style.bottom = '2px';
      badge.style.left = '2px';
      badge.style.background = 'var(--green-border)';
      badge.style.color = '#fff';
      badge.style.width = '18px';
      badge.style.height = '18px';
      badge.style.borderRadius = '50%';
      badge.style.display = 'flex';
      badge.style.alignItems = 'center';
      badge.style.justifyContent = 'center';
      badge.style.fontSize = '12px';
      badge.style.fontWeight = '700';
      cell.appendChild(badge);
    }

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.textContent = '×';
    delBtn.style.position = 'absolute';
    delBtn.style.top = '0';
    delBtn.style.right = '0';
    delBtn.style.width = '20px';
    delBtn.style.height = '20px';
    delBtn.style.padding = '0';
    delBtn.style.border = 'none';
    delBtn.style.borderRadius = '0 0 0 6px';
    delBtn.style.background = 'rgba(217, 115, 104, .85)';
    delBtn.style.color = '#fff';
    delBtn.style.fontSize = '14px';
    delBtn.style.cursor = 'pointer';
    delBtn.style.lineHeight = '1';
    delBtn.addEventListener('click', () => {
      if (ph._sent && !confirm('Это фото уже отправлено. Удалить его из формы?')) return;
      photosArr.splice(pIdx, 1);
      renderAll();
    });
    cell.appendChild(delBtn);
    grid.appendChild(cell);
  });

  const addCell = document.createElement('label');
  addCell.style.width = '72px';
  addCell.style.height = '72px';
  addCell.style.border = '2px dashed var(--border-focus)';
  addCell.style.borderRadius = '8px';
  addCell.style.display = 'flex';
  addCell.style.alignItems = 'center';
  addCell.style.justifyContent = 'center';
  addCell.style.cursor = 'pointer';
  addCell.style.fontSize = '24px';
  addCell.style.color = 'var(--border-focus)';
  addCell.style.background = 'var(--input-bg)';
  addCell.textContent = '+';

  const fileInp = document.createElement('input');
  fileInp.type = 'file';
  fileInp.accept = 'image/*';
  fileInp.multiple = true;
  fileInp.style.display = 'none';

  fileInp.addEventListener('change', async () => {
    const files = Array.from(fileInp.files || []);
    if (!files.length) return;

    for (const f of files) {
      try {
        const dataUrl = await compressImage(f);
        photosArr.push({
          dataUrl: dataUrl,
          fileName: f.name,
          size: approxBytesFromDataUrl(dataUrl),
          _sent: false
        });
      } catch (e) {
        showToast('Не удалось обработать: ' + f.name);
      }
    }
    renderAll();
  });

  addCell.appendChild(fileInp);
  grid.appendChild(addCell);
  wrap.appendChild(grid);
  return wrap;
}

// ============================================
//  СБОР ФОТО
// ============================================
function collectPhotos(includeSent) {
  const out = [];
  const object = objectSelect.value;
  const date = dateInput.value;
  const name = nameInput.value.trim();

  photoState['Помещения'].items.forEach(item => {
    Object.keys(item.stages).forEach(stageName => {
      (item.stages[stageName] || []).forEach(ph => {
        if (ph._sent && !includeSent) return;
        out.push({
          _photo: ph,
          type: 'photo', object: object, date: date, name: name,
          category: 'Помещения',
          building: item.building || '',
          floor: item.building === ATTIC ? ATTIC : (item.floor || ''),
          room: item.room || '',
          stage: stageName,
          fileData: ph.dataUrl
        });
      });
    });
  });

  photoState['Проходки'].items.forEach(item => {
    const floorForSend = item.betweenFloors
      ? (item.floor || '')
      : (item.building === ATTIC ? ATTIC : (item.floor || ''));

    Object.keys(item.stages).forEach(stageName => {
      const sides = item.stages[stageName];
      (sides.from || []).forEach(ph => {
        if (ph._sent && !includeSent) return;
        out.push({
          _photo: ph,
          type: 'photo', object: object, date: date, name: name,
          category: 'Проходки',
          building: item.building || '',
          floor: floorForSend,
          roomFrom: item.roomFrom || '',
          roomTo: item.roomTo || '',
          penetrationNum: item.penetrationNum || '', // <--- ДОБАВЛЕНО
          side: 'from',
          stage: stageName,
          fileData: ph.dataUrl
        });
      });
      (sides.to || []).forEach(ph => {
        if (ph._sent && !includeSent) return;
        out.push({
          _photo: ph,
          type: 'photo', object: object, date: date, name: name,
          category: 'Проходки',
          building: item.building || '',
          floor: floorForSend,
          roomFrom: item.roomFrom || '',
          roomTo: item.roomTo || '',
          penetrationNum: item.penetrationNum || '', // <--- ДОБАВЛЕНО
          side: 'to',
          stage: stageName,
          fileData: ph.dataUrl
        });
      });
    });
  });

  EQUIPMENT_CATEGORIES.forEach(catName => {
    const st = photoState['Оборудование'].subs[catName];
    st.items.forEach(item => {
      (item.photos || []).forEach(ph => {
        if (ph._sent && !includeSent) return;
        out.push({
          _photo: ph,
          type: 'photo', object: object, date: date, name: name,
          category: EQUIPMENT_SHORT[catName],
          deviceAddress: item.address || '',
          fileData: ph.dataUrl
        });
      });
    });
  });

  return out;
}

// ============================================
//  КНОПКА ОТПРАВКИ
// ============================================
function updateSendButtonState() {
  const btn = $('btn-send');
  if (!btn) return;
  const nameOk = isNameValid(nameInput.value);
  const objOk = !!objectSelect.value;
  const hasPhotos = collectPhotos(false).length > 0;
  btn.disabled = !(nameOk && objOk && hasPhotos) || isOffline();
}

// ============================================
//  ЭКРАН ПРОВЕРКИ
// ============================================
function buildReviewSections() {
  const sections = [];

  photoState['Помещения'].items.forEach(item => {
    const photos = [];
    Object.keys(item.stages).forEach(stageName => {
      (item.stages[stageName] || []).forEach(ph => photos.push({ stage: stageName, ph: ph }));
    });
    if (!photos.length) return;

    sections.push({
      title: 'Помещение ' + (item.room || '?') +
             (item.floor ? ' · ' + item.floor + ' этаж' : '') +
             (item.building ? ' · ' + item.building : ''),
      photos: photos
    });
  });

  photoState['Проходки'].items.forEach(item => {
    const photos = [];
    Object.keys(item.stages).forEach(stageName => {
      const s = item.stages[stageName];
      (s.from || []).forEach(ph => photos.push({ stage: stageName + ' (из ' + item.roomFrom + ')', ph: ph }));
      (s.to   || []).forEach(ph => photos.push({ stage: stageName + ' (из ' + item.roomTo   + ')', ph: ph }));
    });
    if (!photos.length) return;

    sections.push({
      title: 'Проходка ' + (item.roomFrom || '?') + '-' + (item.roomTo || '?') +
             (item.penetrationNum ? ' (№' + item.penetrationNum + ')' : '') + // <--- ДОБАВЛЕНО
             (item.floor ? ' · ' + item.floor : ''),
      photos: photos
    });
  });

  EQUIPMENT_CATEGORIES.forEach(catName => {
    const st = photoState['Оборудование'].subs[catName];
    st.items.forEach(item => {
      const photos = (item.photos || []).map(ph => ({ stage: '', ph: ph }));
      if (!photos.length) return;
      sections.push({
        title: EQUIPMENT_SHORT[catName] + ' · ' + (item.address || '?'),
        photos: photos
      });
    });
  });

  return sections;
}

function showReview() {
  const overlay = $('review-overlay');
  const body    = $('review-body');
  const sub     = $('review-subtitle');

  const sections = buildReviewSections();
  let totalPhotos = 0;
  let sentPhotos = 0;
  sections.forEach(sec => {
    sec.photos.forEach(p => {
      totalPhotos++;
      if (p.ph._sent) sentPhotos++;
    });
  });

  const newPhotos = totalPhotos - sentPhotos;
  sub.textContent = 'Всего фото: ' + totalPhotos +
    (sentPhotos > 0 ? ' (из них уже отправлено: ' + sentPhotos + ', новых: ' + newPhotos + ')' : '');

  body.innerHTML = '';

  sections.forEach(sec => {
    const el = document.createElement('div');
    el.className = 'rv-entry';
    el.style.marginBottom = '8px';

    const head = document.createElement('div');
    head.className = 'rv-entry-head';
    head.style.cursor = 'pointer';
    head.innerHTML =
      '<span class="rv-entry-loc">▸ ' + escapeHtml(sec.title) + '</span>' +
      '<span class="rv-entry-work">' + sec.photos.length + ' фото</span>';
    el.appendChild(head);

    const inner = document.createElement('div');
    inner.style.display = 'none';
    inner.style.marginTop = '8px';

    const grid = document.createElement('div');
    grid.style.display = 'flex';
    grid.style.flexWrap = 'wrap';
    grid.style.gap = '6px';

    sec.photos.forEach(p => {
      const cell = document.createElement('div');
      cell.style.position = 'relative';
      cell.style.width = '64px';
      cell.style.height = '64px';
      cell.style.borderRadius = '6px';
      cell.style.overflow = 'hidden';
      cell.style.border = '2px solid ' + (p.ph._sent ? 'var(--green-border)' : 'var(--border)');

      const img = document.createElement('img');
      img.src = p.ph.dataUrl;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      if (p.ph._sent) img.style.opacity = '.55';
      cell.appendChild(img);

      if (p.ph._sent) {
        const badge = document.createElement('div');
        badge.textContent = '✓';
        badge.style.position = 'absolute';
        badge.style.bottom = '2px';
        badge.style.left = '2px';
        badge.style.background = 'var(--green-border)';
        badge.style.color = '#fff';
        badge.style.width = '16px';
        badge.style.height = '16px';
        badge.style.borderRadius = '50%';
        badge.style.display = 'flex';
        badge.style.alignItems = 'center';
        badge.style.justifyContent = 'center';
        badge.style.fontSize = '10px';
        badge.style.fontWeight = '700';
        cell.appendChild(badge);
      }

      grid.appendChild(cell);
    });

    inner.appendChild(grid);
    el.appendChild(inner);

    head.addEventListener('click', () => {
      inner.style.display = inner.style.display === 'none' ? 'block' : 'none';
      const arrow = head.querySelector('.rv-entry-loc');
      if (arrow) {
        arrow.textContent = (inner.style.display === 'none' ? '▸ ' : '▾ ') + sec.title;
      }
    });

    body.appendChild(el);
  });

  overlay.classList.add('show');
  document.body.classList.add('app-blocked');

  const edit = $('review-edit');
  const send = $('review-send');
  const editNew = edit.cloneNode(true);
  const sendNew = send.cloneNode(true);
  edit.parentNode.replaceChild(editNew, edit);
  send.parentNode.replaceChild(sendNew, send);

  editNew.addEventListener('click', () => {
    overlay.classList.remove('show');
    document.body.classList.remove('app-blocked');
  });
  sendNew.addEventListener('click', () => {
    overlay.classList.remove('show');
    doActualSend();
  });
}

// ============================================
//  ОТПРАВКА
// ============================================
function sendPhotos() {
  showMsg('');

  let firstProblem = null;

  if (objectErr) objectErr.classList.remove('show');
  nameErr.classList.remove('show');

  if (!isNameValid(nameInput.value)) {
    nameErr.textContent = nameInput.value.trim()
      ? 'Введите Имя и Фамилию — ровно 2 слова (например: Василий Пупкин)'
      : 'Введите Имя и Фамилию — ровно 2 слова';
    nameErr.classList.add('show');
    if (!firstProblem) firstProblem = nameInput;
  }

  if (!objectSelect.value.trim()) {
    if (objectErr) objectErr.classList.add('show');
    updateFieldState(objectSelect);
    if (!firstProblem) firstProblem = objectSelect;
  }

  if (firstProblem) {
    showMsg('⚠️ Заполните поля сверху', 'err');
    if (firstProblem.focus) firstProblem.focus();
    if (firstProblem.scrollIntoView) {
      firstProblem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  if (isOffline()) {
    showMsg('📵 Нет подключения к интернету', 'err');
    return;
  }

  const all = collectPhotos(false);
  if (all.length === 0) {
    showMsg('⚠️ Нет новых фотографий для отправки.', 'err');
    return;
  }

  showReview();
}

async function doActualSend() {
  const all = collectPhotos(false);
  if (!all.length) return;

  document.body.classList.add('app-blocked');
  $('progress-overlay').classList.add('show');
  updateProgress(0, all.length);

  const failed = [];
  let sent = 0;

  for (let i = 0; i < all.length; i++) {
    const rec = all[i];
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(rec)
      });

      let resp = null;
      try {
        const txt = await res.text();
        resp = JSON.parse(txt);
      } catch (_) {}

      if (resp && resp.ok === false) {
        failed.push({ record: rec, error: resp.error || 'unknown' });
      } else {
        if (rec._photo) rec._photo._sent = true;
        sent++;
      }
    } catch (e) {
      try {
        await fetch(API_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(rec)
        });
        if (rec._photo) rec._photo._sent = true;
        sent++;
      } catch (e2) {
        failed.push({ record: rec, error: String(e2.message || e2) });
      }
    }

    updateProgress(i + 1, all.length);
  }

  $('progress-overlay').classList.remove('show');
  document.body.classList.remove('app-blocked');
  renderAll();

  const remaining = collectPhotos(false).length;

  if (failed.length > 0) {
    const list = failed.map((f, i) =>
      (i + 1) + '. ' + describeRecord(f.record) + ' — ' + f.error
    ).join('\n');

    alert(
      '❌ Не удалось отправить: ' + failed.length + ' фото\n\n' +
      list + '\n\n' +
      '✅ Отправлено: ' + sent + ' фото\n\n' +
      'Неудавшиеся фото остались в форме без галочки ✓. ' +
      'Нажмите «Отправить» ещё раз — будут досланы только они. ' +
      'Уже отправленные помечены зелёной галочкой и повторно не пойдут.'
    );
    return;
  }

  if (remaining === 0) {
    resetAllState();
    renderAll();
    showSuccess(sent);
  } else {
    showSuccess(sent);
  }
}

function describeRecord(rec) {
  if (rec.category === 'Помещения') return 'Помещение ' + (rec.room || '?');
  if (rec.category === 'Проходки')  return 'Проходка ' + (rec.roomFrom || '?') + '-' + (rec.roomTo || '?') + (rec.penetrationNum ? ' №' + rec.penetrationNum : '');
  return rec.category + ' · ' + (rec.deviceAddress || '?');
}

function updateProgress(done, total) {
  const c = $('progress-counter');
  if (c) c.textContent = done + ' из ' + total;
}

function showSuccess(total) {
  $('success-sub').textContent = 'Фото отправлено: ' + total;
  $('success-overlay').classList.add('show');

  const btn = $('success-close');
  const btnNew = btn.cloneNode(true);
  btn.parentNode.replaceChild(btnNew, btn);
  btnNew.addEventListener('click', () => {
    $('success-overlay').classList.remove('show');
  });
}

// ============================================
//  ПОДКЛЮЧЕНИЕ
// ============================================
function setupConnectionWatcher() {
  window.addEventListener('online', () => { showToast('✅ Соединение восстановлено'); updateSendButtonState(); });
  window.addEventListener('offline', () => { showToast('📵 Нет подключения к интернету'); updateSendButtonState(); });
}
setupConnectionWatcher();

// ============================================
//  СТАРТ
// ============================================
refreshNameGates();
renderAll();
