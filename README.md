[deepseek_markdown_20260926_47c0de.md](https://github.com/user-attachments/files/32678366/deepseek_markdown_20260926_47c0de.md)
# 📋 Отчет монтажника

Веб-форма для заполнения ежедневных отчётов о выполненных монтажных работах. Данные отправляются в Google Таблицу через Google Apps Script.

**Живая версия:** разворачивается как статический сайт (GitHub Pages / любой хостинг).

---

## 🎯 Назначение

Монтажник открывает форму на телефоне, заполняет данные о выполненной работе за день, жмёт «Отправить отчёт» — запись попадает в общую Google Таблицу компании.

Форма оптимизирована под мобильные: крупные поля, кастомные селекты, тёмная тема, валидация на лету.

---

## 🛠️ Стек

| Слой | Технология |
|------|-----------|
| Разметка | HTML5 |
| Стили | CSS3 (переменные, тёмная тема) |
| Логика | Vanilla JS (без фреймворков) |
| Бэкенд | Google Apps Script (`doPost`) |
| Хранилище | Google Sheets |

Никаких сборщиков, npm и зависимостей — три файла, работают из коробки.

---

## 📁 Структура проекта

```
montaj-LG/
├── index.html    # разметка формы
├── style.css     # стили + тёмная тема
├── script.js     # вся логика: валидация, отправка, UX
└── README.md     # этот файл
```

---

## 🚀 Быстрый старт

### 1. Клонировать репозиторий

```bash
git clone https://github.com/dmlv9955-design/montaj-LG.git
cd montaj-LG
```

### 2. Открыть локально

Просто открой `index.html` в браузере — этого достаточно для UI-разработки.

Чтобы протестировать реальную отправку — нужен работающий Apps Script (см. ниже).

### 3. Задеплоить

Любой статический хостинг:

- **GitHub Pages:** Settings → Pages → Source: `main` / `root`
- **Netlify / Vercel:** drag & drop папки
- **Локальный сервер:** `python -m http.server 8000`

---

## ⚙️ Настройка бэкенда (Google Apps Script)

### Шаг 1. Создать таблицу

Создай новую Google Таблицу с колонками:

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| date | name | object | floor | room | room_none | work | system | materials |

> `materials` — можно хранить как JSON-строку или разворачивать в отдельные строки. Решай под свои задачи.

### Шаг 2. Создать Apps Script

1. В таблице: **Расширения → Apps Script**
2. Вставь код:

```javascript
const SHEET_NAME = 'Лист1';
const SECRET_KEY = 'montaj2026'; // ⚠️ см. раздел «Безопасность»

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // простая проверка ключа
    if (data.key !== SECRET_KEY) {
      return ContentService
        .createTextOutput(JSON.stringify({ ok: false, error: 'bad key' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);

    sheet.appendRow([
      data.date,
      data.name,
      data.object,
      data.floor,
      data.room,
      data.room_none ? 'да' : 'нет',
      data.work,
      data.system,
      JSON.stringify(data.materials || [])
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

3. **Развернуть → Новое развёртывание → Веб-приложение**
   - «Запуск от имени»: **Я**
   - «Доступ»: **Все**
4. Скопируй URL — он выглядит как `https://script.google.com/macros/s/.../exec`

### Шаг 3. Прописать URL в `script.js`

```javascript
const API_URL = 'https://script.google.com/macros/s/ТВОЙ_ID/exec';
```

---

## 📤 Формат отправляемых данных

`POST` с `Content-Type: text/plain` (из-за `no-cors`), тело — JSON:

```json
{
  "key": "montaj2026",
  "object": "Ларинская гимназия",
  "date": "2026-09-26",
  "name": "Иван Иванов",
  "floor": "2",
  "room": "32, 105, 108",
  "room_none": false,
  "work": "Монтаж",
  "system": "Вентиляция",
  "materials": [
    { "name": "Воздуховод", "unit": "м", "qty": "12.5" },
    { "name": "Хомут", "unit": "шт", "qty": "8" }
  ]
}
```

| Поле | Тип | Обязательное | Примечание |
|------|-----|:---:|-----------|
| `key` | string | ✅ | секретный ключ для проверки на сервере |
| `object` | string | ✅ | `Ларинская гимназия` \| `ЖЕДЕПОМ` |
| `date` | string | ✅ | `YYYY-MM-DD`, не старше 7 дней |
| `name` | string | ✅ | ровно 2 слова, Имя + Фамилия |
| `floor` | string | ✅ | зависит от объекта |
| `room` | string | ✅ | цифры через запятую |
| `room_none` | boolean | — | `true` = помещения нет |
| `work` | string | ✅ | `Монтаж` \| `Демонтаж` \| `Наставничество` |
| `system` | string | — | `Вентиляция` \| `Кондиционирование` \| ... |
| `materials` | array | — | массив `{ name, unit, qty }` |

---

## 🧩 Функциональность

- ✅ Два объекта с разными наборами этажей
- ✅ Зависимые поля: объект → этаж → помещение
- ✅ Чекбокс «Нет помещения» + этаж «Нет» → автоматически подставляется `Нет`
- ✅ Кастомные селекты (не нативные) с клавиатурной навигацией
- ✅ Валидация имени (ровно 2 слова, кириллица/латиница, дефисы)
- ✅ Форматирование помещения: цифры через пробел → через запятую
- ✅ Динамический список материалов с выбором единицы измерения
- ✅ Ограничение даты: не старше 7 дней, не в будущем
- ✅ Подсветка даты: любой день раньше сегодня — жёлтый
- ✅ Тёмная / светлая тема с сохранением в `localStorage`
- ✅ Подсветка обязательных полей (пусто / заполнено)
- ✅ Анимация «тряски» для незаполненных полей
- ✅ Полный сброс формы после успешной отправки

---

## ⚠️ Безопасность

**`SECRET_KEY` лежит в открытом виде в `script.js`.** Любой, кто откроет DevTools, увидит ключ. Это допустимо для внутреннего инструмента, но **не защищает от подделки запросов**.

**Как усилить:**

1. Хранить ключ в `PropertiesService.getScriptProperties()` на стороне Apps Script.
2. Ротировать ключ раз в N месяцев.
3. Добавить rate-limiting по IP (через `CacheService`).
4. В идеале — авторизация через Google Account (`Session.getActiveUser()`).

---

## 🐛 Известные ограничения

- `fetch` работает с `mode: 'no-cors'` → **ответ сервера недоступен**, UI всегда показывает «✅ Отчет отправлен», даже если Apps Script упал.
- Нет офлайн-режима (PWA не настроен).
- Нет редактирования отправленных отчётов — только добавление.
- Нет README по схеме материалов в таблице — `materials` пока летит одной JSON-строкой.

---

## 🗺️ Идеи для развития

- [ ] PWA: манифест + service worker → установка на «Домой», офлайн-очередь
- [ ] Убрать `no-cors` → реальная проверка ответа Apps Script
- [ ] Разворачивать `materials` в отдельные строки или колонки в таблице
- [ ] Авторизация по Google Account вместо `SECRET_KEY`
- [ ] Автодополнение названий материалов из истории
- [ ] Экспорт отчётов за период (сводка по монтажникам / объектам)

---

## 📝 Лицензия

Внутренний проект. Все права у владельца репозитория.
