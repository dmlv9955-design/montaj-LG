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
const SECRET_KEY = 'montaj2026';

const FLOORS_BY_OBJECT = {
  'Ларинская гимназия': ['1', '2', '3', 'Чердак', 'Нет'],
  'ЖЕДЕПОМ':            ['Подвал', '1', '2', '3', 'Чердак', 'Нет']
};

// ============================================
//  ПОЛЕ «ДАТА» — ДИАПАЗОН, ПОДСВЕТКА, АВТОСМЕНА
// ============================================
const DATE_MIN_DAYS_AGO = 7;   // на сколько дней назад максимум
const dateInput = document.getElementById('date');

// утилита: дата в формате YYYY-MM-DD (по локальному времени)
function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// установить min / max и значение по умолчанию
function setupDateRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const minDate = new Date(today);
  minDate.setDate(minDate.getDate() - DATE_MIN_DAYS_AGO);

  dateInput.min = toISODate(minDate);
  dateInput.max = toISODate(today);

  if (!dateInput.value) {
    dateInput.value = toISODate(today);
  }
}

// подсветка: вчера — жёлтым, старше — красным, сегодня — нейтральным
function updateDateHighlight() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = toISODate(today);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayISO = toISODate(yesterday);

  const v = dateInput.value;

  // сбрасываем оба класса
  dateInput.classList.remove('is-old-date', 'is-very-old-date');

  if (!v || v === todayISO) return;              // сегодня или пусто — без подсветки
  if (v === yesterdayISO) {
    dateInput.classList.add('is-old-date');      // вчера — жёлтый
  } else {
    dateInput.classList.add('is-very-old-date'); // старше — красный
  }
}


// стартовая настройка
setupDateRange();
updateDateHighlight();

// при изменении — обновляем подсветку
dateInput.addEventListener('change', () => {
  // проверим, что введённая дата в диапазоне
  if (dateInput.value) {
    if (dateInput.value < dateInput.min) {
      dateInput.value = dateInput.min;
    }
    if (dateInput.value > dateInput.max) {
      dateInput.value = dateInput.max;
    }
  }
  updateDateHighlight();
  updateFieldState(dateInput);
});

// автообновление раз в день: раз в минуту проверяем — не наступил ли новый день
let lastKnownDay = toISODate(new Date());
setInterval(() => {
  const todayISO = toISODate(new Date());
  if (todayISO !== lastKnownDay) {
    lastKnownDay = todayISO;
    // новый день — обновим min/max
    setupDateRange();
    // если монтажник не менял дату вручную (стояла «вчерашняя»), поставим сегодня
    if (!dateInput.value || dateInput.value < dateInput.min) {
      dateInput.value = todayISO;
    }
    updateDateHighlight();
    updateFieldState(dateInput);
  }
}, 60 * 1000); // проверка раз в минуту

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

    // сохраняем ссылки на слушатели, чтобы потом можно было снять
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

    this.updateDisplay();
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

// ============================================
//  ИНИЦИАЛИЗАЦИЯ CUSTOM SELECT
// ============================================
const customSelects = {};

document.querySelectorAll('[data-cselect]').forEach(rootEl => {
  const input = rootEl.querySelector('input[type="hidden"]');
  if (input) customSelects[input.id] = new CustomSelect(rootEl);
});

// ============================================
//  ЭЛЕМЕНТЫ
// ============================================
const objectSelect  = document.getElementById('object');
const floorInput    = document.getElementById('floor');
const floorCS       = customSelects.floor;
const floorHint     = document.getElementById('floor-hint');
const roomInput     = document.getElementById('room');
const roomNone      = document.getElementById('room-none');
const roomNoneLabel = document.getElementById('room-none-label');
const nameInput     = document.getElementById('name');
const nameErr       = document.getElementById('err-name');

const REQUIRED_IDS = ['date', 'name', 'object', 'floor', 'work', 'room'];

// ============================================
//  ЭТАЖИ
// ============================================
function rebuildFloors() {
  const obj = objectSelect.value;
  const floors = FLOORS_BY_OBJECT[obj];

  if (!floors) {
    floorCS.setOptions([]);
    floorCS.placeholder = '🔒 Сначала объект';
    floorCS.disabled = true;
    floorHint.textContent = '🔒 Сначала выберите объект';
    floorHint.style.display = 'inline-flex';
    return;
  }

  floorCS.setOptions(floors);
  floorCS.placeholder = '— выберите —';
  floorCS.disabled = false;
  floorHint.style.display = 'none';
  updateFieldState(floorInput);
}

// ============================================
//  ПОМЕЩЕНИЕ
// ============================================
function updateRoomState() {
  const floorVal = floorInput.value;
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
  updateRoomState();
  updateFieldState(objectSelect);
});

floorInput.addEventListener('change', () => {
  if (floorInput.value !== 'Нет') {
    roomNone.checked = false;
    if (roomInput.value === 'Нет') roomInput.value = '';
  }
  updateRoomState();
  updateFieldState(floorInput);
});

roomNone.addEventListener('change', () => {
  updateRoomState();
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
  const after  = formatRoom(before);
  if (before !== after) {
    roomInput.value = after;
    roomInput.setSelectionRange(after.length, after.length);
  }
  updateFieldState(roomInput);
});

// ============================================
//  ФОРМАТ И ВАЛИДАЦИЯ ИМЕНИ
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
  const wrap = el.closest && el.closest('.cselect');
  if (wrap) {
    wrap.classList.remove('is-empty', 'is-filled');
    if (el.disabled) return;
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
const MATERIAL_UNITS = ['шт', 'м', 'м²', 'м³', 'кг', 'л', 'компл', 'упак'];

function addMaterial() {
  const wrap = document.getElementById('materials');
  const row = document.createElement('div');
  row.className = 'material-row';

  const nameIn = document.createElement('input');
  nameIn.type = 'text';
  nameIn.className = 'm-name';
  nameIn.placeholder = 'Название';

  const unitWrap = document.createElement('div');
  unitWrap.className = 'cselect';
  unitWrap.dataset.cselect = '';
  unitWrap.innerHTML = `
    <input type="hidden" class="m-unit" value="">
    <button type="button" class="cselect-btn">
      <span class="cselect-value placeholder">ед.</span>
      <span class="cselect-arrow"></span>
    </button>
    <ul class="cselect-list"></ul>
  `;

  const qtyIn = document.createElement('input');
  qtyIn.type = 'number';
  qtyIn.className = 'm-qty';
  qtyIn.placeholder = '0';
  qtyIn.step = '0.01';
  qtyIn.min = '0';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn-remove';
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', () => row.remove());

  row.append(nameIn, unitWrap, qtyIn, removeBtn);
  wrap.appendChild(row);

  const cs = new CustomSelect(unitWrap);
  cs.setOptions(MATERIAL_UNITS);
  cs.placeholder = 'ед.';
  cs.updateDisplay();
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

    // сброс обычных полей
    nameInput.value = '';
    roomNone.checked = false;

    // сброс всех кастомных селектов (через сеттер — сразу перерисует display)
    Object.values(customSelects).forEach(cs => {
      cs.value = '';
    });

    document.getElementById('materials').innerHTML = '';
    addMaterial();

    rebuildFloors();
    updateRoomState();

    // сброс даты на сегодня
    setupDateRange();
    dateInput.value = toISODate(new Date());
    updateDateHighlight();

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
