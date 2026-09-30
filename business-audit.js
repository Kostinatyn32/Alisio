(() => {
  const navButton = document.querySelector('.ba-menu-button');
  const mobileNav = document.querySelector('#ba-mobile-nav');
  navButton?.addEventListener('click', () => {
    const open = navButton.getAttribute('aria-expanded') === 'true';
    navButton.setAttribute('aria-expanded', String(!open));
    navButton.setAttribute('aria-label', open ? 'Відкрити меню' : 'Закрити меню');
    mobileNav.hidden = open;
  });
  mobileNav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    mobileNav.hidden = true;
    navButton?.setAttribute('aria-expanded', 'false');
    navButton?.setAttribute('aria-label', 'Відкрити меню');
  }));

  const departments = {
    leads: ['01 / ВХІДНИЙ ПОТІК', 'Продажі та ліди', 'Від першого звернення до наступного кроку: швидкість відповіді, кваліфікація, передавання в CRM і follow-up.', ['Повторне введення даних', 'Заявки без відповідального', 'Забутий follow-up']],
    service: ['02 / ДОСВІД КЛІЄНТА', 'Клієнтський сервіс', 'Відповіді на запити, історія взаємодії, передавання складних випадків і контроль обіцянок клієнту.', ['Запити у різних каналах', 'Повторне пояснення проблеми', 'Звернення без відповіді']],
    ops: ['03 / ЩОДЕННІ ОПЕРАЦІЇ', 'Операції', 'Статуси задач, передавання між командами, повторювані перевірки та залежності, які затримують виконання.', ['Ручні нагадування', 'Нечіткий власник задачі', 'Очікування погодження']],
    marketing: ['04 / ПОПИТ І КОМУНІКАЦІЯ', 'Маркетинг', 'Підготовка кампаній, узгодження матеріалів, маршрутизація лідів і передавання результатів у продажі.', ['Дублювання аудиторій', 'Ручне зведення звітів', 'Втрата ліда після кампанії']],
    finance: ['05 / ГРОШІ ТА ЗВІТНІСТЬ', 'Фінанси та звітність', 'Збирання показників, звірка даних, підготовка регулярних звітів і контроль аномалій.', ['Копіювання цифр', 'Звірка з кількох джерел', 'Затримка звіту']],
    people: ['06 / КОМАНДА', 'Команда та HR', 'Онбординг, типові внутрішні запити, доступи, маршрутизація задач і передавання знань.', ['Повторювані запити', 'Ручний онбординг', 'Знання в окремих чатах']],
    management: ['07 / КЕРІВНИЦТВО', 'Управління', 'Огляд показників, відхилення, рішення, що потребують ескалації, і видимість статусів без ручного chase.', ['Ручне зведення статусів', 'Пізно помітні відхилення', 'Постійні уточнення']],
    systems: ['08 / СИСТЕМИ ТА ДАНІ', 'Системи та дані', 'Зв’язки CRM, ERP, пошти, таблиць і месенджерів: доступи, якість даних та надійність інтеграцій.', ['Розрізнені джерела', 'Неузгоджені статуси', 'Дані без власника']]
  };
  const tabs = [...document.querySelectorAll('[role="tab"][data-dept]')];
  const panel = document.querySelector('#dept-panel');
  function selectDepartment(tab, focus = false) {
    const item = departments[tab.dataset.dept];
    if (!item) return;
    tabs.forEach((candidate) => {
      const selected = candidate === tab;
      candidate.setAttribute('aria-selected', String(selected));
      candidate.tabIndex = selected ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', tab.id);
    document.querySelector('#dept-number').textContent = item[0];
    document.querySelector('#dept-title').textContent = item[1];
    document.querySelector('#dept-copy').textContent = item[2];
    document.querySelector('#dept-checklist').replaceChildren(...item[3].map((text) => {
      const tag = document.createElement('span'); tag.textContent = text; return tag;
    }));
    if (focus) tab.focus();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectDepartment(tab));
    tab.addEventListener('keydown', (event) => {
      let next = index;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault(); selectDepartment(tabs[next], true);
    });
  });

  const config = window.ALISIO_QR_CONFIG || {};
  const telegram = config.telegramUrl || 'https://t.me/oleg_ssh';
  const whatsapp = new URL(config.whatsappUrl || 'https://wa.me/420773708849');
  whatsapp.searchParams.set('text', 'Вітаю! Хочу обговорити безкоштовний AI-аудит бізнесу з ALISIO.');
  const params = new URLSearchParams(window.location.search);
  const tracking = new URLSearchParams();
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach((key) => {
    if (params.has(key)) tracking.set(key, params.get(key));
  });
  const addTracking = (target) => {
    const url = new URL(target, window.location.href);
    tracking.forEach((value, key) => url.searchParams.set(key, value));
    return url.toString();
  };
  document.querySelector('#ba-telegram').href = addTracking(telegram);
  document.querySelector('#ba-whatsapp').href = addTracking(whatsapp.toString());
  const form = document.querySelector('#ba-form');
  const feedback = document.querySelector('#ba-form-feedback');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const entries = [
      ['Ім’я', data.get('name')], ['Компанія', data.get('company')], ['Сайт', data.get('website')],
      ['Сфера', data.get('industry')], ['Команда', data.get('team')], ['Контакт', data.get('contact')],
      ['Системи', data.get('systems')], ['Процеси', data.get('processes')], ['Затримки / втрата даних', data.get('delays')]
    ].filter(([, value]) => String(value || '').trim()).map(([label, value]) => `${label}: ${String(value).trim()}`);
    const draft = `Вітаю! Хочу обговорити безкоштовний AI-аудит бізнесу з ALISIO.\n\n${entries.join('\n')}`;
    const destination = new URL(whatsapp);
    destination.searchParams.set('text', draft);
    tracking.forEach((value, key) => destination.searchParams.set(key, value));
    window.open(destination.toString(), '_blank', 'noopener,noreferrer');
    feedback.textContent = 'Чернетку відкрито у WhatsApp. Перевірте її та натисніть «Надіслати», якщо все правильно.';
    if (window.dataLayer) window.dataLayer.push({ event: 'business_audit_whatsapp_draft' });
  });
  document.querySelectorAll('a[href="#contact"]').forEach((link) => link.addEventListener('click', () => {
    if (window.dataLayer) window.dataLayer.push({ event: 'business_audit_cta', location: link.dataset.location || (link.closest('header') ? 'header' : 'content') });
  }));
})();
