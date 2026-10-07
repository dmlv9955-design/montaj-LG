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

const WORK_W
