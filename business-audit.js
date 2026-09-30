(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const menuButton = document.querySelector('.ba-menu-button');
  const mobileNav = document.querySelector('#ba-mobile-nav');
  const setMenu = (open) => {
    menuButton?.setAttribute('aria-expanded', String(open));
    menuButton?.setAttribute('aria-label', open ? 'Закрити меню' : 'Відкрити меню');
    if (mobileNav) mobileNav.hidden = !open;
  };
  menuButton?.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
  mobileNav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      menuButton.focus();
    }
  });

  const departments = {
    leads: { number:'01 / ВХІДНИЙ ПОТІК', title:'Продажі та ліди', copy:'Від першого звернення до наступного кроку: швидкість відповіді, кваліфікація, передавання в CRM і follow-up.', checks:['Повторне введення даних','Заявки без відповідального','Забутий follow-up'] },
    service: { number:'02 / ДОСВІД КЛІЄНТА', title:'Клієнтський сервіс', copy:'Запити з усіх каналів, історія взаємодії, передавання складних випадків і контроль обіцянок клієнту.', checks:['Запити у різних каналах','Повторне пояснення проблеми','Звернення без відповіді'] },
    ops: { number:'03 / ЩОДЕННІ ОПЕРАЦІЇ', title:'Операції', copy:'Статуси задач, передавання між командами, повторювані перевірки та залежності, які затримують виконання.', checks:['Ручні нагадування','Нечіткий власник задачі','Очікування погодження'] },
    marketing: { number:'04 / ПОПИТ І КОМУНІКАЦІЯ', title:'Маркетинг', copy:'Підготовка кампаній, узгодження матеріалів, маршрутизація лідів і передавання результатів у продажі.', checks:['Дублювання аудиторій','Ручне зведення звітів','Втрата ліда після кампанії'] },
    finance: { number:'05 / ГРОШІ ТА ЗВІТНІСТЬ', title:'Фінанси й звіти', copy:'Збирання показників, звірка даних із джерел і підготовка регулярних звітів з меншим ручним перенесенням.', checks:['Копіювання цифр','Звірка кількох джерел','Затримка звіту'] },
    people: { number:'06 / КОМАНДА', title:'Команда', copy:'Онбординг, типові внутрішні запити, доступи, маршрутизація задач і передавання знань між людьми.', checks:['Повторювані запити','Ручний онбординг','Знання в окремих чатах'] },
    management: { number:'07 / КЕРІВНИЦТВО', title:'Управління', copy:'Огляд показників, відхилення, рішення для ескалації та видимість статусів без постійного ручного контролю.', checks:['Зведення статусів вручну','Пізно помітні відхилення','Постійні уточнення'] },
    systems: { number:'08 / ДАНІ ТА ІНТЕГРАЦІЇ', title:'Дані й системи', copy:'Зв’язки CRM, ERP, пошти, таблиць і месенджерів: доступи, якість даних та надійність інтеграцій.', checks:['Розрізнені джерела','Неузгоджені статуси','Дані без власника'] }
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
    panel.classList.remove('is-active');
    document.querySelector('#dept-number').textContent = item.number;
    document.querySelector('#dept-title').textContent = item.title;
    document.querySelector('#dept-copy').textContent = item.copy;
    document.querySelector('#dept-checklist').replaceChildren(...item.checks.map((copy) => {
      const pill = document.createElement('span');
      pill.textContent = copy;
      return pill;
    }));
    requestAnimationFrame(() => panel.classList.add('is-active'));
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
      event.preventDefault();
      selectDepartment(tabs[next], true);
    });
  });
  if (panel) requestAnimationFrame(() => panel.classList.add('is-active'));

  const flowCopy = [
    ['КРОК 01 / ЗАПИТ','Нове звернення входить у процес із того каналу, яким уже користується клієнт.'],
    ['КРОК 02 / КОНТЕКСТ','Система звіряє дані клієнта й історію звернень, щоб не починати розмову з нуля.'],
    ['КРОК 03 / ЛЮДСЬКИЙ ОГЛЯД','Якщо випадок виходить за узгоджені правила, відповідальна людина бачить контекст і приймає рішення.'],
    ['КРОК 04 / ДОЗВОЛЕНА ДІЯ','Типовий наступний крок виконується у визначених межах та фіксується в робочій системі.'],
    ['КРОК 05 / ВИДИМИЙ РЕЗУЛЬТАТ','Команда бачить актуальний статус, а відповідальний може перевірити, що сталося і чому.']
  ];
  const flow = document.querySelector('[data-flow]');
  const flowSteps = [...document.querySelectorAll('[data-flow-step]')];
  flowSteps.forEach((button, index) => button.addEventListener('click', () => {
    flow.dataset.active = String(index);
    flowSteps.forEach((step, i) => {
      step.classList.toggle('is-active', i === index);
      step.setAttribute('aria-pressed', String(i === index));
    });
    document.querySelector('#flow-detail-label').textContent = flowCopy[index][0];
    document.querySelector('#flow-detail-copy').textContent = flowCopy[index][1];
  }));
  flowSteps.forEach((step, i) => step.setAttribute('aria-pressed', String(i === 0)));
  if (flow) flow.dataset.active = '0';

  const config = window.ALISIO_QR_CONFIG || {};
  const telegram = config.telegramUrl || 'https://t.me/oleg_ssh';
  const whatsapp = new URL(config.whatsappUrl || 'https://wa.me/420773708849');
  whatsapp.searchParams.set('text','Вітаю! Хочу обговорити безкоштовний AI-аудит бізнесу з ALISIO.');
  const incoming = new URLSearchParams(window.location.search);
  const tracking = new URLSearchParams();
  ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach((key) => {
    if (incoming.has(key)) tracking.set(key, incoming.get(key));
  });
  const withTracking = (href) => {
    const url = new URL(href, window.location.href);
    tracking.forEach((value, key) => url.searchParams.set(key, value));
    return url.toString();
  };
  document.querySelector('#ba-telegram').href = withTracking(telegram);
  document.querySelector('#ba-whatsapp').href = withTracking(whatsapp.toString());
  const form = document.querySelector('#ba-form');
  const feedback = document.querySelector('#ba-form-feedback');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const rows = [
      ['Ім’я',data.get('name')],['Компанія',data.get('company')],['Сфера',data.get('industry')],
      ['Контакт',data.get('contact')],['Системи та процеси',data.get('processes')]
    ].filter(([, value]) => String(value || '').trim()).map(([label, value]) => `${label}: ${String(value).trim()}`);
    const destination = new URL(whatsapp);
    destination.searchParams.set('text',`Вітаю! Хочу обговорити безкоштовний AI-аудит бізнесу з ALISIO.\n\n${rows.join('\n')}`);
    tracking.forEach((value, key) => destination.searchParams.set(key, value));
    window.open(destination.toString(), '_blank', 'noopener,noreferrer');
    feedback.textContent = 'Чернетка відкрита у WhatsApp. Перегляньте її та натисніть «Надіслати», якщо все правильно.';
    if (window.dataLayer) window.dataLayer.push({ event:'business_audit_whatsapp_draft' });
  });

  document.querySelectorAll('a[href="#contact"]').forEach((link) => link.addEventListener('click', () => {
    if (window.dataLayer) window.dataLayer.push({ event:'business_audit_cta', location:link.dataset.location || (link.closest('header') ? 'header' : 'content') });
  }));

  if (!reduceMotion && 'IntersectionObserver' in window) {
    const reveals = [
      ...document.querySelectorAll('[data-reveal],.ba-proof-band>div,.ba-friction-strip,.ba-dept-panel,.ba-flow-step,.ba-flow-detail,.ba-level-cards article,.ba-delivery-grid article,.ba-roadmap-track article,.ba-faq-list details')
    ];
    reveals.forEach((item, index) => {
      item.dataset.reveal = item.dataset.reveal || 'up';
      item.style.setProperty('--ba-reveal-delay', `${Math.min(index % 4, 3) * 55}ms`);
    });
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }), { threshold:.14, rootMargin:'0px 0px -35px 0px' });
    document.body.classList.add('motion-ready');
    reveals.forEach((item) => observer.observe(item));
  }

  if (!reduceMotion && window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    const media = document.querySelector('.ba-hero-media');
    media?.addEventListener('pointermove', (event) => {
      const rect = media.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      media.style.setProperty('--ba-tilt-x', `${(-y * 1.4).toFixed(2)}deg`);
      media.style.setProperty('--ba-tilt-y', `${(x * 1.8).toFixed(2)}deg`);
    });
    media?.addEventListener('pointerleave', () => {
      media.style.setProperty('--ba-tilt-x','0deg');
      media.style.setProperty('--ba-tilt-y','0deg');
    });
  }
})();
