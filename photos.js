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
    'BTH Извещатель дымовой "ДИП-34А-03 (BOLID)"',
    'BTH Извещатель дымовой "ДИП-34А-04 (BOLID)"',
    'BTK Извещатель тепловой "С2000-ИП-03 (BOLID)"',
    'BIAD Оповещатель речевой "SWS-103W (Sonar)"',
    'BIAL Оповещатель световой "С2000-ОСТ исп.1 (BOLID)"',
    'BTM Извещатель ручной "ИПР 513-3АМ исп.01 (BOLID)"',
    'SC Блок сигнально-пусковой "С2000-СП2 (BOLID)"',
    'BIAL Извещатель линейный "С2000-ИПДЛ исп.60 (BOLID)"',
    'IZ Блок изолирующий "БРИЗ (BOLID)"',
    'KM Коробка монтажная "КМ-О"'
];

const EQUIPMENT_SHORT = {
    'BTH Извещатель дымовой "ДИП-34А-03 (BOLID)"': 'BTH',
    'BTH Извещатель дымовой "ДИП-34А-04 (BOLID)"': 'BTH',
    'BTK Извещатель тепловой "С2000-ИП-03 (BOLID)"': 'BTK',
    'BIAD Оповещатель речевой "SWS-103W (Sonar)"': 'BIAD',
    'BIAL Оповещатель световой "С2000-ОСТ исп.1 (BOLID)"': 'BIAL',
    'BTM Извещатель ручной "ИПР 513-3АМ исп.01 (BOLID)"': 'BTM',
    'SC Блок сигнально-пусковой "С2000-СП2 (BOLID)"': 'SC',
    'BIAL Извещатель линейный "С2000-ИПДЛ исп.60 (BOLID)"': 'BIAL',
    'IZ Блок изолирующий "БРИЗ (BOLID)"': 'IZ',
    'KM Коробка монтажная "КМ-О"': 'KM'
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
        sideFrom: '', sideTo: '',
        penetrationNum: '',
        isCross: false, buildingTo: '', crossFloorTo: '',
        stages: {}
    };
}

function makeEmptyEquipmentItem() {
    return { address: '', addressFrom: '', addressTo: '', photos: [] };
}

const photoState = {
    'Помещения':    { expanded: false, items: [makeEmptyPomeshchenieItem()] },
    'Проходки':     { expanded: false, items: [makeEmptyProhodkaItem()] },
    'Расключение':  { expanded: false, subs: {} },
    'Оборудование': { expanded: false, subs: {} }
};

EQUIPMENT_CATEGORIES.forEach(cat => {
    photoState['Расключение'].subs[cat] = { expanded: false, items: [makeEmptyEquipmentItem()] };
    photoState['Оборудование'].subs[cat] = { expanded: false, items: [makeEmptyEquipmentItem()] };
});

function resetAllState() {
    photoState['Помещения']    = { expanded: false, items: [makeEmptyPomeshchenieItem()] };
    photoState['Проходки']     = { expanded: false, items: [makeEmptyProhodkaItem()] };
    photoState['Расключение']  = { expanded: false, subs: {} };
    photoState['Оборудование'] = { expanded: false, subs: {} };

    EQUIPMENT_CATEGORIES.forEach(cat => {
        photoState['Расключение'].subs[cat] = { expanded: false, items: [makeEmptyEquipmentItem()] };
        photoState['Оборудование'].subs[cat] = { expanded: false, items: [makeEmptyEquipmentItem()] };
    });
}

let failedRecords = [];

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
    if (parts.length > 2) parts = parts.slice(0, 2);
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
    if (el.id === 'name') { updateNameVisual(el); return; }

    const wrap = el.closest && el.closest('.segmented');
    if (wrap) {
        if (el.disabled || wrap.classList.contains('segmented-disabled')) {
            wrap.classList.remove('is-empty', 'is-filled'); return;
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
    if (el.disabled) { el.classList.remove('is-empty', 'is-filled', 'is-invalid'); return; }
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
    if (isNameValid(nameInput.value)) nameErr.classList.remove('show');
    refreshNameGates();
    renderAll();
});

nameInput.addEventListener('blur', () => {
    const v = nameInput.value.trim();
    if (v && !isNameValid(v)) {
        nameErr.textContent = 'Введите Имя и Фамилию — ровно 2 слова';
        nameErr.classList.add('show');
    } else nameErr.classList.remove('show');
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
        nameInput.focus(); update();
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
    container.appendChild(renderTopLevel('Расключение'));
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

    let emoji = '📦';
    if (title === 'Помещения') emoji = '🚪';
    else if (title === 'Проходки') emoji = '🔩';
    else if (title === 'Расключение') emoji = '🔧';
    else if (title === 'Оборудование') emoji = '📦';

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
        else if (title === 'Расключение') body.appendChild(renderEquipmentSection('Расключение'));
        else if (title === 'Оборудование') body.appendChild(renderEquipmentSection('Оборудование'));
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
            if (item.roomFrom !== undefined) { item.roomFrom = ''; item.roomTo = ''; item.sideFrom = ''; item.sideTo = ''; }
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

    // Правильная проверка: есть ли реально загруженные фото в этапах?
    let hasActualPhotos = false;
    for (const key in item.stages) {
        if (item.stages[key] && item.stages[key].length > 0) { hasActualPhotos = true; break; }
    }
    if (hasActualPhotos && !item.room) roomInp.classList.add('is-empty');

    roomInp.addEventListener('input', () => {
        item.room = roomInp.value.replace(/[^0-9]/g, '');
        if (roomInp.value !== item.room) roomInp.value = item.room;
        roomInp.classList.remove('is-empty');
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

    // Кнопка сквозной проходки
    const crossBtn = document.createElement('button');
    crossBtn.type = 'button';
    crossBtn.className = 'loc-floor-btn' + (item.isCross ? ' active' : '');
    crossBtn.style.marginBottom = '8px';
    crossBtn.style.width = '100%';
    crossBtn.style.whiteSpace = 'normal';
    crossBtn.style.lineHeight = '1.3';
    crossBtn.textContent = item.isCross ? '↔ Сквозная проходка (Откуда / Куда)' : '↔ Сделать сквозной проходкой';
    crossBtn.addEventListener('click', () => {
        item.isCross = !item.isCross;
        if (!item.isCross) {
            item.buildingTo = ''; item.crossFloorTo = '';
        }
        renderAll();
    });
    card.appendChild(crossBtn);

    if (item.isCross) {
        card.appendChild(renderPhotoCrossLocation(item, true));
        card.appendChild(renderPhotoCrossLocation(item, false));
    } else {
        if (isBuildingRequired()) card.appendChild(renderBuildingRow(item, renderAll));
        if (!isAtticItem(item)) {
            card.appendChild(renderFloorRow(item, renderAll));
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

        let hasActualPhotos = false;
        for (const key in item.stages) {
            const s = item.stages[key];
            if ((s.from && s.from.length > 0) || (s.to && s.to.length > 0)) { hasActualPhotos = true; break; }
        }
        if (hasActualPhotos && !item.roomFrom) fromInp.classList.add('is-empty');

        fromInp.addEventListener('input', () => {
            item.roomFrom = fromInp.value.replace(/[^0-9]/g, '');
            if (fromInp.value !== item.roomFrom) fromInp.value = item.roomFrom;
            fromInp.classList.remove('is-empty');
            updateSendButtonState();
        });

        fromInp.addEventListener('change', () => {
            if (item.roomFrom !== item.roomTo) {
                item.sideFrom = ''; item.sideTo = '';
            }
            renderAll();
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

        if (hasActualPhotos && !item.roomTo) toInp.classList.add('is-empty');

        toInp.addEventListener('input', () => {
            item.roomTo = toInp.value.replace(/[^0-9]/g, '');
            if (toInp.value !== item.roomTo) toInp.value = item.roomTo;
            toInp.classList.remove('is-empty');
            updateSendButtonState();
        });

        toInp.addEventListener('change', () => {
            if (item.roomFrom !== item.roomTo) {
                item.sideFrom = ''; item.sideTo = '';
            }
            renderAll();
        });

        roomsLine.appendChild(toInp);
        card.appendChild(roomsLine);

        // ─── БЛОК СТОРОН (если помещения совпадают) ───
        if (item.roomFrom && item.roomFrom === item.roomTo) {
            const sidesBlock = document.createElement('div');
            sidesBlock.style.marginTop = '10px';
            sidesBlock.style.padding = '10px';
            sidesBlock.style.background = 'var(--input-disabled-bg)';
            sidesBlock.style.borderRadius = '8px';
            sidesBlock.style.border = '1px dashed var(--border)';

            const title = document.createElement('div');
            title.className = 'section-subtitle';
            title.style.marginTop = '0';
            title.style.marginBottom = '8px';
            title.textContent = 'Укажите стороны (т.к. помещение одно)';
            sidesBlock.appendChild(title);

            const sides = ['А', 'Б', 'В', 'Г', 'Д', 'Е'];

            const fromSideLine = document.createElement('div');
            fromSideLine.className = 'mat-line';
            const fromLblSide = document.createElement('span');
            fromLblSide.className = 'mat-line-label';
            fromLblSide.textContent = 'Из (Сторона):';
            fromSideLine.appendChild(fromLblSide);

            const fromSidesWrap = document.createElement('div');
            fromSidesWrap.className = 'mat-line-floors';
            sides.forEach(side => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'loc-floor-btn' + (item.sideFrom === side ? ' active' : '');
                b.textContent = side;
                if (item.sideTo === side) b.disabled = true;
                b.addEventListener('click', () => {
                    item.sideFrom = side;
                    renderAll();
                });
                fromSidesWrap.appendChild(b);
            });
            fromSideLine.appendChild(fromSidesWrap);
            sidesBlock.appendChild(fromSideLine);

            const toSideLine = document.createElement('div');
            toSideLine.className = 'mat-line';
            toSideLine.style.marginTop = '6px';
            const toLblSide = document.createElement('span');
            toLblSide.className = 'mat-line-label';
            toLblSide.textContent = 'В (Сторона):';
            toSideLine.appendChild(toLblSide);

            const toSidesWrap = document.createElement('div');
            toSidesWrap.className = 'mat-line-floors';
            sides.forEach(side => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'loc-floor-btn' + (item.sideTo === side ? ' active' : '');
                b.textContent = side;
                if (item.sideFrom === side) b.disabled = true;
                b.addEventListener('click', () => {
                    item.sideTo = side;
                    renderAll();
                });
                toSidesWrap.appendChild(b);
            });
            toSideLine.appendChild(toSidesWrap);
            sidesBlock.appendChild(toSideLine);

            card.appendChild(sidesBlock);
        }
    }

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

function renderPhotoCrossLocation(data, isSource) {
    const block = document.createElement('div');
    block.style.padding = '10px 12px';
    block.style.marginTop = '8px';
    block.style.border = '1.5px dashed var(--border-focus)';
    block.style.borderRadius = '10px';
    block.style.background = 'var(--card-bg)';

    const title = document.createElement('div');
    title.style.fontSize = '12px';
    title.style.fontWeight = '700';
    title.style.color = 'var(--border-focus)';
    title.style.marginBottom = '6px';
    title.textContent = isSource ? '📍 Откуда (Из)' : '🎯 Куда (В)';
    block.appendChild(title);

    const bKey = isSource ? 'building' : 'buildingTo';
    const fKey = isSource ? 'floor' : 'crossFloorTo';
    const rKey = isSource ? 'roomFrom' : 'roomTo';

    if (isBuildingRequired()) {
        const corpLine = document.createElement('div');
        corpLine.className = 'mat-line';
        corpLine.style.marginTop = '6px';
        const lbl = document.createElement('span');
        lbl.className = 'mat-line-label';
        lbl.textContent = 'Корпус:';
        corpLine.appendChild(lbl);

        const corpWrap = document.createElement('div');
        corpWrap.className = 'mat-line-corp';
        BUILDINGS_BY_OBJECT[objectSelect.value].forEach(val => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'loc-floor-btn' + (data[bKey] === val ? ' active' : '');
            b.textContent = val;
            b.addEventListener('click', () => {
                data[bKey] = val;
                data[fKey] = '';
                data[rKey] = '';
                renderAll();
            });
            corpWrap.appendChild(b);
        });
        corpLine.appendChild(corpWrap);
        block.appendChild(corpLine);
    }

    const building = data[bKey];
    const isAtticZ = (building === 'Чердак');

    if (!isAtticZ) {
        const floorLine = document.createElement('div');
        floorLine.className = 'mat-line';
        floorLine.style.marginTop = '6px';
        const lbl = document.createElement('span');
        lbl.className = 'mat-line-label';
        lbl.textContent = 'Этаж:';
        floorLine.appendChild(lbl);

        const fWrap = document.createElement('div');
        fWrap.className = 'mat-line-floors';
        const floors = getFloorsFor(objectSelect.value, building) || [];
        const buildingChosen = !isBuildingRequired() || !!building;

        floors.forEach(f => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'loc-floor-btn' + (data[fKey] === f ? ' active' : '');
            b.textContent = f;
            if (!buildingChosen) b.disabled = true;
            b.addEventListener('click', () => {
                if (b.disabled) return;
                data[fKey] = f;
                renderAll();
            });
            fWrap.appendChild(b);
        });
        floorLine.appendChild(fWrap);
        block.appendChild(floorLine);
    }

    const roomLine = document.createElement('div');
    roomLine.className = 'mat-line';
    roomLine.style.marginTop = '6px';
    const lbl = document.createElement('span');
    lbl.className = 'mat-line-label';
    lbl.textContent = 'Помещение:';
    roomLine.appendChild(lbl);

    const rWrap = document.createElement('div');
    rWrap.className = 'mat-line-room';

    const rInp = document.createElement('input');
    rInp.type = 'text';
    rInp.className = 'loc-room-input';
    rInp.inputMode = 'numeric';
    rInp.pattern = '[0-9]*';
    rInp.style.width = '80px';
    rInp.value = data[rKey] || '';
    rInp.addEventListener('input', () => {
        data[rKey] = rInp.value.replace(/[^0-9]/g, '');
        if (rInp.value !== data[rKey]) rInp.value = data[rKey];
        updateSendButtonState();
    });
    rWrap.appendChild(rInp);
    roomLine.appendChild(rWrap);
    block.appendChild(roomLine);

    return block;
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

        const fromRoomText = item.roomFrom ? (item.roomFrom === item.roomTo && item.sideFrom ? `пом.${item.roomFrom} (Сторона ${item.sideFrom})` : `пом.${item.roomFrom}`) : '?';
        const toRoomText = item.roomTo ? (item.roomFrom === item.roomTo && item.sideTo ? `пом.${item.roomTo} (Сторона ${item.sideTo})` : `пом.${item.roomTo}`) : '?';

        const fromLabelText = item.isCross
            ? `Из: ${item.building || ''} ${item.floor || ''}эт ${fromRoomText}`
            : `Из помещения ${fromRoomText}`;
        const toLabelText = item.isCross
            ? `В: ${item.buildingTo || ''} ${item.crossFloorTo || ''}эт ${toRoomText}`
            : `В помещение ${toRoomText}`;

        const fromLabel = document.createElement('div');
        fromLabel.style.fontWeight = '700';
        fromLabel.style.fontSize = '12px';
        fromLabel.style.marginTop = '6px';
        fromLabel.textContent = fromLabelText;
        zone.appendChild(fromLabel);
        zone.appendChild(renderPhotoPicker(stg.from));

        const toLabel = document.createElement('div');
        toLabel.style.fontWeight = '700';
        toLabel.style.fontSize = '12px';
        toLabel.style.marginTop = '10px';
        toLabel.textContent = toLabelText;
        zone.appendChild(toLabel);
        zone.appendChild(renderPhotoPicker(stg.to));

        wrap.appendChild(zone);
    }

    return wrap;
}

// ============================================
//  ОБОРУДОВАНИЕ / РАСКЛЮЧЕНИЕ
// ============================================
function renderEquipmentSection(topLevel) {
    const wrap = document.createElement('div');
    EQUIPMENT_CATEGORIES.forEach(catName => {
        wrap.appendChild(renderEquipmentSub(catName, topLevel));
    });
    return wrap;
}

function renderEquipmentSub(catName, topLevel) {
    const st = photoState[topLevel].subs[catName];
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
            body.appendChild(renderEquipmentItem(catName, item, idx, topLevel));
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

function renderEquipmentItem(catName, item, idx, topLevel) {
    const st = photoState[topLevel].subs[catName];
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

    const isKM = catName.includes('КМ-О');

    if (isKM) {
        const line1 = document.createElement('div');
        line1.className = 'mat-line';
        const lbl1 = document.createElement('span');
        lbl1.className = 'mat-line-label';
        lbl1.textContent = 'От (адрес):';
        line1.appendChild(lbl1);

        const inpFrom = document.createElement('input');
        inpFrom.type = 'text';
        inpFrom.className = 'loc-room-input';
        inpFrom.style.width = '80px';
        inpFrom.placeholder = '1.1';
        inpFrom.value = item.addressFrom || '';
        if (item.photos.length > 0 && !item.addressFrom) inpFrom.classList.add('is-empty');

        inpFrom.addEventListener('input', () => {
            const before = inpFrom.value;
            const after = formatDeviceAddress(before);
            if (before !== after) inpFrom.value = after;
            item.addressFrom = inpFrom.value;
            inpFrom.classList.remove('is-empty');
            updateSendButtonState();
        });
        line1.appendChild(inpFrom);
        card.appendChild(line1);

        const line2 = document.createElement('div');
        line2.className = 'mat-line';
        line2.style.marginTop = '6px';
        const lbl2 = document.createElement('span');
        lbl2.className = 'mat-line-label';
        lbl2.textContent = 'До (адрес):';
        line2.appendChild(lbl2);

        const inpTo = document.createElement('input');
        inpTo.type = 'text';
        inpTo.className = 'loc-room-input';
        inpTo.style.width = '80px';
        inpTo.placeholder = '1.2';
        inpTo.value = item.addressTo || '';
        if (item.photos.length > 0 && !item.addressTo) inpTo.classList.add('is-empty');

        inpTo.addEventListener('input', () => {
            const before = inpTo.value;
            const after = formatDeviceAddress(before);
            if (before !== after) inpTo.value = after;
            item.addressTo = inpTo.value;
            inpTo.classList.remove('is-empty');
            updateSendButtonState();
        });
        line2.appendChild(inpTo);
        card.appendChild(line2);
    } else {
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
        if (item.photos.length > 0 && !item.address) inp.classList.add('is-empty');

        inp.addEventListener('input', () => {
            const before = inp.value;
            const after = formatDeviceAddress(before);
            if (before !== after) inp.value = after;
            item.address = inp.value;
            inp.classList.remove('is-empty');
            updateSendButtonState();
        });

        line.appendChild(inp);
        card.appendChild(line);
    }

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
        const floorForSend = item.isCross ? item.floor : (item.building === ATTIC ? ATTIC : (item.floor || ''));

        Object.keys(item.stages).forEach(stageName => {
            const sides = item.stages[stageName];
            const basePayload = {
                type: 'photo', object: object, date: date, name: name,
                category: 'Проходки',
                building: item.building || '',
                floor: floorForSend,
                roomFrom: item.roomFrom || '',
                roomTo: item.roomTo || '',
                sideFrom: item.sideFrom || '',
                sideTo: item.sideTo || '',
                penetrationNum: item.penetrationNum || '',
                isCross: item.isCross || false,
                buildingTo: item.buildingTo || '',
                crossFloorTo: item.crossFloorTo || '',
                stage: stageName
            };

            (sides.from || []).forEach(ph => {
                if (ph._sent && !includeSent) return;
                out.push({ ...basePayload, _photo: ph, side: 'from', fileData: ph.dataUrl });
            });
            (sides.to || []).forEach(ph => {
                if (ph._sent && !includeSent) return;
                out.push({ ...basePayload, _photo: ph, side: 'to', fileData: ph.dataUrl });
            });
        });
    });

    ['Расключение', 'Оборудование'].forEach(topSection => {
        EQUIPMENT_CATEGORIES.forEach(catName => {
            const st = photoState[topSection].subs[catName];
            if (!st) return;

            st.items.forEach(item => {
                (item.photos || []).forEach(ph => {
                    if (ph._sent && !includeSent) return;
                    let finalAddress = item.address;
                    if (catName.includes('КМ-О')) {
                        finalAddress = `${item.addressFrom || '?'}-${item.addressTo || '?'}`;
                    }
                    out.push({
                        _photo: ph,
                        type: 'photo', object: object, date: date, name: name,
                        category: EQUIPMENT_SHORT[catName],
                        section: topSection,
                        deviceAddress: finalAddress,
                        fileData: ph.dataUrl
                    });
                });
            });
        });
    });

    return out;
}

// ============================================
//  ВАЛИДАЦИЯ (СТРОГАЯ ПРОВЕРКА)
// ============================================
function isFormValid() {
    let firstProblem = null;

    // Проверяем помещения (только если реально есть фото в этапах)
    for (let i = 0; i < photoState['Помещения'].items.length; i++) {
        const item = photoState['Помещения'].items[i];
        let hasPhotos = false;
        for (const key in item.stages) {
            if (item.stages[key] && item.stages[key].length > 0) { hasPhotos = true; break; }
        }
        if (hasPhotos && !item.room) {
            firstProblem = 'Укажите номер помещения, к которому прикреплены фото';
            break;
        }
    }

    // Проверяем проходки
    if (!firstProblem) {
        for (let i = 0; i < photoState['Проходки'].items.length; i++) {
            const item = photoState['Проходки'].items[i];
            let hasPhotos = false;
            for (const key in item.stages) {
                const s = item.stages[key];
                if ((s.from && s.from.length > 0) || (s.to && s.to.length > 0)) { hasPhotos = true; break; }
            }
            if (hasPhotos && (!item.roomFrom || !item.roomTo)) {
                firstProblem = 'Укажите помещения "Из" и "В" для проходки';
                break;
            }
        }
    }

    // Проверяем оборудование
    if (!firstProblem) {
        for (const section of ['Расключение', 'Оборудование']) {
            for (const cat of EQUIPMENT_CATEGORIES) {
                for (const item of photoState[section].subs[cat].items) {
                    if (item.photos.length > 0) {
                        if (cat.includes('КМ-О') && (!item.addressFrom || !item.addressTo)) {
                            firstProblem = 'Укажите адреса "От" и "До" для коробки КМ-О';
                            break;
                        }
                        if (!cat.includes('КМ-О') && !item.address) {
                            firstProblem = 'Укажите адрес устройства ' + cat;
                            break;
                        }
                    }
                }
                if (firstProblem) break;
            }
            if (firstProblem) break;
        }
    }

    return { ok: !firstProblem, error: firstProblem };
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

    const valid = isFormValid();

    btn.disabled = !(nameOk && objOk && hasPhotos && valid.ok) || isOffline();
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
            title: 'Помещение ' + (item.room || '?') + (item.floor ? ' · ' + item.floor + ' этаж' : '') + (item.building ? ' · ' + item.building : ''),
            photos: photos
        });
    });

    photoState['Проходки'].items.forEach(item => {
        const photos = [];
        Object.keys(item.stages).forEach(stageName => {
            const s = item.stages[stageName];
            (s.from || []).forEach(ph => photos.push({ stage: stageName + ' (из ' + item.roomFrom + ')', ph: ph }));
            (s.to   || []).forEach(ph => photos.push({ stage: stageName + ' (в ' + item.roomTo   + ')', ph: ph }));
        });
        if (!photos.length) return;

        let title = '';
        if (item.isCross) {
            title = `Сквозная ${item.roomFrom || '?'}-${item.roomTo || '?'} (${item.building || ''} - ${item.buildingTo || ''})`;
        } else {
            let rFrom = item.roomFrom || '?';
            let rTo = item.roomTo || '?';
            if (item.roomFrom === item.roomTo) {
                if (item.sideFrom) rFrom += `(${item.sideFrom})`;
                if (item.sideTo) rTo += `(${item.sideTo})`;
            }
            title = 'Проходка ' + rFrom + '-' + rTo + (item.floor ? ' · ' + item.floor : '');
        }
        if (item.penetrationNum) title += ' (№' + item.penetrationNum + ')';

        sections.push({ title: title, photos: photos });
    });

    ['Расключение', 'Оборудование'].forEach(topSection => {
        EQUIPMENT_CATEGORIES.forEach(catName => {
            const st = photoState[topSection].subs[catName];
            if (!st) return;
            st.items.forEach(item => {
                const photos = (item.photos || []).map(ph => ({ stage: '', ph: ph }));
                if (!photos.length) return;
                let addr = item.address;
                if (catName.includes('КМ-О')) addr = `${item.addressFrom || '?'}-${item.addressTo || '?'}`;
                sections.push({
                    title: topSection + ' · ' + EQUIPMENT_SHORT[catName] + ' · ' + (addr || '?'),
                    photos: photos
                });
            });
        });
    });

    return sections;
}

function showReview() {
    const valid = isFormValid();
    if (!valid.ok) {
        showMsg('⚠️ ' + valid.error, 'err');
        return;
    }

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
        doActualSend(false);
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
        nameErr.textContent = nameInput.value.trim() ? 'Введите Имя и Фамилию — ровно 2 слова (например: Василий Пупкин)' : 'Введите Имя и Фамилию — ровно 2 слова';
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
        if (firstProblem.scrollIntoView) firstProblem.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    if (isOffline()) {
        showMsg('📵 Нет подключения к интернету', 'err');
        return;
    }

    const valid = isFormValid();
    if (!valid.ok) {
        showMsg('⚠️ ' + valid.error, 'err');
        return;
    }

    const all = collectPhotos(false);
    if (all.length === 0) {
        showMsg('⚠️ Нет новых фотографий для отправки.', 'err');
        return;
    }

    showReview();
}

function retrySend() {
    if (failedRecords.length === 0) return;
    showMsg('');
    doActualSend(true);
}

async function doActualSend(isRetry = false) {
    const all = isRetry ? failedRecords : collectPhotos(false);
    if (!all || !all.length) return;

    document.body.classList.add('app-blocked');
    $('progress-overlay').classList.add('show');
    updateProgress(0, all.length);

    const currentFailed = [];
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
                currentFailed.push({ record: rec, error: resp.error || 'unknown' });
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
                currentFailed.push({ record: rec, error: String(e2.message || e2) });
            }
        }
        updateProgress(i + 1, all.length);
    }

    $('progress-overlay').classList.remove('show');
    document.body.classList.remove('app-blocked');

    if (!isRetry) renderAll();

    const btnRetry = $('btn-retry');

    if (currentFailed.length > 0) {
        failedRecords = currentFailed.map(f => f.record);
        const list = currentFailed.map((f, i) => (i + 1) + '. ' + describeRecord(f.record) + ' — ' + f.error).join('\n');

        if (btnRetry) {
            btnRetry.style.display = 'block';
            btnRetry.textContent = `🔄 Повторить неудавшиеся (${failedRecords.length})`;
        }

        alert('❌ Не удалось отправить: ' + currentFailed.length + ' фото\n\n' + list + '\n\n✅ Отправлено: ' + sent + ' фото\n\nНажмите «Повторить неудавшиеся», чтобы отправить их еще раз.');
        return;
    }

    failedRecords = [];
    if (btnRetry) btnRetry.style.display = 'none';

    const remaining = collectPhotos(false).length;
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
    if (rec.category === 'Проходки')  return 'Проходка ' + (rec.roomFrom || '?') + '-' + (rec.roomTo || '?') + (rec.penetrationNum ? ' №' + rec.penetrationNum : '') + (rec.isCross ? ' (сквозная)' : '');
    return (rec.section || '') + ' · ' + rec.category + ' · ' + (rec.deviceAddress || '?');
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

function setupConnectionWatcher() {
    window.addEventListener('online', () => { showToast('✅ Соединение восстановлено'); updateSendButtonState(); });
    window.addEventListener('offline', () => { showToast('📵 Нет подключения к интернету'); updateSendButtonState(); });
}
setupConnectionWatcher();

refreshNameGates();
renderAll();