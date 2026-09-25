// ============================================
//  ПЕРЕКЛЮЧАТЕЛЬ ТЕМЫ
// ============================================
(function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  const icon   = document.getElementById('theme-icon');

  // 1. Применяем сохранённую тему при загрузке
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') {
    document.body.classList.add('dark');
    icon.textContent = '☀️';
  } else {
    icon.textContent = '🌙';
  }

  // 2. Обработчик клика
  toggle.addEventListener('click', () => {
    const isDark = document.body.classList.toggle('dark');
    icon.textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  });
})();

// ============================================
//  НАСТРОЙКИ ПОДКЛЮЧЕНИЯ К GOOGLE SHEETS
// ============================================
const API_URL = 'https://script.google.com/macros/s/AKfycbw6i5ZyPzjWSkYB8PTACDnFcMFbXxDCDLK137pU6pCCMS4B92dXYtms1qmJN5mWQ-za/exec';
const SECRET_KEY = 'montaj2026';

// ============================================
//  ЭТАЖИ ПО ОБЪЕКТАМ
// ============================================
const FLOORS_BY_OBJECT = {
  'Ларинская гимназия': ['1', '2', '3', 'Чердак', 'Нет'],
  'ЖЕДЕПОМ':            ['Подвал', '1', '2', '3', 'Чердак', 'Нет']
};

// ============================================
//  ЭЛЕМЕНТЫ
// ============================================
const objectSelect  = document.getElementById('object');
const floorSelect   = document.getElementById('floor');
const floorHint     = document.getElementById('floor-hint');
const roomInput     = document.getElementById('room');
const roomNone      = document.getElementById('room-none');
const roomNoneLabel = document.getElementById('room-none-label');
const nameInput     = document.getElementById('name');
const nameErr       = document.getElementById('err-name');

const REQUIRED_IDS = ['date', 'name', 'object', 'floor', 'work', 'room'];

// ============================================
//  ИНИЦИАЛИЗАЦИЯ
// ============================================
document.getElementById('date').valueAsDate = new Date();

// ============================================
//  ЭТАЖИ
// ============================================
function rebuildFloors() {
  const obj = objectSelect.value;
  const floors = FLOORS_BY_OBJECT[obj];
  floorSelect.innerHTML = '';

  if (!floors) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = '🔒 Сначала выберите объект';
    floorSelect.appendChild(opt);
    floorSelect.disabled = true;
    floorHint.textContent = '🔒 Сначала выберите объект';
    floorHint.style.display = 'inline-flex';
    return;
  }

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '— выберите —';
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.hidden = true;
  floorSelect.appendChild(placeholder);

  floors.forEach(f => {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f;
    floorSelect.appendChild(opt);
  });

  floorSelect.disabled = false;
  floorHint.style.display = 'none';
  updateFieldState(floorSelect);
}

// ============================================
//  ПОМЕЩЕНИЕ — ЛОГИКА БЛОКИРОВОК
// ============================================
function updateRoomState() {
  const floorVal = floorSelect.value;
  const noneChecked = roomNone.checked;

  roomInput.classList.remove('is-empty', 'is-filled', 'is-invalid');

  if (!floorVal) {
    roomInput.value = '';
    roomInput.disabled = true;
    roomInput.placeholder = '🔒 Сначала выберите этаж';
    roomNone.checked = false;
    roomNone.disabled = true;
    roomNoneLabel.classList.add('is-disabled');
    return;
  }

  if (floorVal === 'Нет') {
    roomInput.value = 'Нет';
    roomInput.disabled = true;
    roomInput.placeholder = '';
    roomNone.checked = false;
    roomNone.disabled = true;
    roomNoneLabel.classList.add('is-disabled');
    return;
  }

  roomNone.disabled = false;
  roomNoneLabel.classList.remove('is-disabled');
  roomInput.placeholder = '32 105 108';

  if (noneChecked) {
    roomInput.value = 'Нет';
    roomInput.disabled = true;
  } else {
    roomInput.disabled = false;
    updateFieldState(roomInput);
  }
}

// ============================================
//  ОБРАБОТЧИКИ
// ============================================
objectSelect.addEventListener('change', () => {
  rebuildFloors();
  floorSelect.value = '';
  updateRoomState();
  updateFieldState(objectSelect);
});

floorSelect.addEventListener('change', () => {
  if (floorSelect.value !== 'Нет') {
    roomNone.checked = false;
    if (roomInput.value === 'Нет') {
      roomInput.value = '';
    }
  }
  updateRoomState();
  updateFieldState(floorSelect);
});

roomNone.addEventListener('change', () => {
  updateRoomState();
});

// ============================================
//  ФОРМАТИРОВАНИЕ ПОЛЯ «ПОМЕЩЕНИЕ»
// ============================================
function formatRoom(value) {
  let cleaned = value.replace(/[^0-9\s]/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ');
  const parts = cleaned.split(' ').filter(p => p !== '');
  let result = parts.join(', ');
  if (cleaned.endsWith(' ') && parts.length > 0) {
    result += ', ';
  }
  return result;
}

roomInput.addEventListener('input', () => {
  if (roomInput.disabled) return;
  const before = roomInput.value;
  const after  = formatRoom(before);
  if (before !== after) {
    roomInput.value = after;
    roomInput.setSelectionRange(after.length, after.length);
  }
  updateFieldState(roomInput);
});

// ============================================
//  ФОРМАТИРОВАНИЕ И ВАЛИДАЦИЯ ИМЕНИ
// ============================================
function formatName(value) {
  let cleaned = value.replace(/[^А-Яа-яЁёA-Za-z\s-]/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/-+/g, '-');
  cleaned = cleaned.replace(/\s-|-\s/g, '-');
  cleaned = cleaned.replace(/(^|\s|-)([а-яёa-z])/g,
                            (m, p1, p2) => p1 + p2.toUpperCase());
  const parts = cleaned.split(' ');
  if (parts.length > 2) {
    cleaned = parts.slice(0, 2).join(' ');
  }
  return cleaned;
}

function isNameValid(value) {
  const v = value.trim();
  return /^[А-ЯЁA-Z][а-яёa-z]+(?:-[А-ЯЁA-Z][а-яёa-z]+)?\s+[А-ЯЁA-Z][а-яёa-z]+(?:-[А-ЯЁA-Z][а-яёa-z]+)?$/.test(v);
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
  if (!el.classList.contains('req-field')) return;

  if (el.disabled) {
    el.classList.remove('is-empty', 'is-filled', 'is-invalid');
    return;
  }

  const isEmpty = !el.value || !el.value.trim();
  if (isEmpty) {
    el.classList.add('is-empty');
    el.classList.remove('is-filled');
  } else {
    el.classList.add('is-filled');
    el.classList.remove('is-empty');
  }
}

REQUIRED_IDS.forEach(id => {
  const el = document.getElementById(id);
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
//  МАТЕРИАЛЫ
// ============================================
function addMaterial() {
  const wrap = document.getElementById('materials');
  const row = document.createElement('div');
  row.className = 'material-row';
  row.innerHTML = `
    <input type="text" class="m-name" placeholder="Название">
    <select class="m-unit">
      <option value="" disabled selected hidden>ед.</option>
      <option>шт</option><option>м</option><option>м²</option><option>м³</option>
      <option>кг</option><option>л</option><option>компл</option><option>упак</option>
    </select>
    <input type="number" class="m-qty" placeholder="0" step="0.01" min="0">
    <button type="button" class="btn-remove" onclick="this.parentElement.remove()">×</button>
  `;
  wrap.appendChild(row);
}

function collectMaterials() {
  const list = [];
  document.querySelectorAll('.material-row').forEach(r => {
    const name = r.querySelector('.m-name').value.trim();
    const unit = r.querySelector('.m-unit').value;
    const qty  = r.querySelector('.m-qty').value.trim();
    if (name || unit || qty) list.push({ name, unit, qty });
  });
  return list;
}

// ============================================
//  УТИЛИТЫ
// ============================================
function val(id) { return document.getElementById(id).value.trim(); }
function show(text, cls) {
  const m = document.getElementById('msg');
  m.textContent = text; m.className = cls || '';
}

// ============================================
//  ОТПРАВКА
// ============================================
async function send() {
  REQUIRED_IDS.forEach(id => {
    const err = document.getElementById('err-' + id);
    if (err) err.classList.remove('show');
  });

  let firstProblem = null;

  REQUIRED_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (el.disabled) return;

    if (!el.value.trim()) {
      el.classList.add('shake');
      setTimeout(() => el.classList.remove('shake'), 500);
      const err = document.getElementById('err-' + id);
      if (err) {
        err.textContent = id === 'name'
          ? 'Введите Имя и Фамилию — ровно 2 слова'
          : 'Заполните это поле';
        err.classList.add('show');
      }
      if (!firstProblem) firstProblem = el;
    }
  });

  const nameVal = val('name');
  if (nameVal && !isNameValid(nameVal)) {
    nameInput.classList.add('is-invalid', 'shake');
    setTimeout(() => nameInput.classList.remove('shake'), 500);
    nameErr.textContent = 'Введите Имя и Фамилию — ровно 2 слова (например: Иван Иванов)';
    nameErr.classList.add('show');
    if (!firstProblem) firstProblem = nameInput;
  }

  if (firstProblem) {
    show('⚠️ Заполните выделенные поля', 'err');
    firstProblem.focus();
    firstProblem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const payload = {
    key:       SECRET_KEY,
    object:    val('object'),
    date:      val('date'),
    name:      val('name'),
    floor:     val('floor'),
    room:      val('room').replace(/,\s*$/, ''),
    work:      val('work'),
    system:    val('system'),
    materials: collectMaterials()
  };

  const btn = document.getElementById('btn');
  btn.disabled = true;
  btn.textContent = 'Отправляем...';
  show('');

  try {
    await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    show('✅ Отчет отправлен!', 'ok');

    ['name', 'object'].forEach(id => document.getElementById(id).value = '');
    roomNone.checked = false;

    document.getElementById('materials').innerHTML = '';
    addMaterial();

    rebuildFloors();
    floorSelect.value = '';
    updateRoomState();

    document.getElementById('date').valueAsDate = new Date();

    REQUIRED_IDS.forEach(id => updateFieldState(document.getElementById(id)));
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
addMaterial();

window.addMaterial = addMaterial;
window.send = send;
