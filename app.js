(() => {
  const emit = (name, properties = {}) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: name, ...properties });
  };

  const header = document.querySelector('.site-header');
  const stickyCta = document.querySelector('.mobile-sticky-cta');
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.querySelector('#mobile-menu');
  const form = document.querySelector('#audit-form');
  const status = document.querySelector('#form-status');
  const submit = form.querySelector('[type="submit"]');
  const success = document.querySelector('#form-success');
  const year = document.querySelector('#year');

  year.textContent = new Date().getFullYear();

  const params = new URLSearchParams(location.search);
  ['source', 'medium', 'campaign', 'content', 'term'].forEach((key) => {
    const input = form.elements.namedItem(`utm_${key}`);
    if (input) input.value = params.get(`utm_${key}`) || params.get(`utm_${key.replace('utm_', '')}`) || '';
  });

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      header.classList.toggle('scrolled', window.scrollY > 24);
      const threshold = document.documentElement.scrollHeight * 0.38;
      stickyCta.classList.toggle('visible', window.innerWidth < 768 && window.scrollY > threshold && window.scrollY < document.documentElement.scrollHeight - window.innerHeight - 180);
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  onScroll();

  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Відкрити меню' : 'Закрити меню');
    menu.hidden = isOpen;
  });
  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    menu.hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Відкрити меню');
  }));

  document.querySelectorAll('[data-location]').forEach((link) => link.addEventListener('click', () => {
    emit('audit_cta_click', { location: link.dataset.location || 'unknown' });
  }));
  document.querySelectorAll('.faq-item').forEach((item) => item.addEventListener('toggle', () => {
    if (item.open) emit('audit_faq_open');
  }));

  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in-view');
        if (entry.target.matches('.workflow-step')) emit('audit_workflow_step_view', { step: entry.target.dataset.step });
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.16 });
    document.querySelectorAll('.reveal, .workflow-step').forEach((element) => revealObserver.observe(element));
  } else {
    document.querySelectorAll('.reveal, .workflow-step').forEach((element) => element.classList.add('in-view'));
  }

  let scrollTracked = false;
  window.addEventListener('scroll', () => {
    if (!scrollTracked && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight * 0.5) {
      scrollTracked = true;
      emit('audit_scroll_50');
    }
  }, { passive: true });
  emit('audit_page_view', { page: location.pathname });

  form.addEventListener('focusin', (event) => {
    if (event.target.matches('input, select, textarea') && !form.dataset.started) {
      form.dataset.started = 'true';
      emit('audit_form_start');
    }
  });

  const clearError = (field) => {
    field.removeAttribute('aria-invalid');
    const error = document.querySelector(`#${field.id}-error`);
    if (error) error.textContent = '';
  };
  form.querySelectorAll('input, select').forEach((field) => field.addEventListener('input', () => clearError(field)));

  const validate = () => {
    form.querySelectorAll('[aria-invalid="true"]').forEach((field) => clearError(field));
    document.querySelector('#contact-error').textContent = '';
    const fields = {
      name: form.elements.namedItem('name'),
      company: form.elements.namedItem('company'),
      email: form.elements.namedItem('email'),
      phone: form.elements.namedItem('phone')
    };
    const errors = [];
    const setError = (field, message) => {
      field.setAttribute('aria-invalid', 'true');
      const target = document.querySelector(`#${field.id}-error`);
      if (target) target.textContent = message;
      errors.push(field);
    };
    if (fields.name.value.trim().length < 2) setError(fields.name, fields.name.value.trim() ? 'Вкажіть ім’я повністю' : 'Заповніть це поле');
    if (fields.company.value.trim().length < 2) setError(fields.company, 'Вкажіть назву готелю або компанії');
    if (!fields.email.value.trim() && !fields.phone.value.trim()) {
      document.querySelector('#contact-error').textContent = 'Залиште email або номер телефону';
      errors.push(fields.email);
    } else if (fields.email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.value.trim())) {
      setError(fields.email, 'Перевірте email');
    }
    if (fields.phone.value.trim() && fields.phone.value.replace(/\D/g, '').length < 7) setError(fields.phone, 'Перевірте номер телефону');
    if (errors.length) {
      emit('audit_form_error', { fields: errors.map((field) => field.name) });
      errors[0].focus();
      return false;
    }
    return true;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = '';
    success.hidden = true;
    if (!validate()) return;

    submit.disabled = true;
    submit.querySelector('span').textContent = 'Надсилаємо заявку...';
    emit('audit_form_submit');

    const data = new FormData(form);
    const payload = {
      name: data.get('name').trim(),
      company: data.get('company').trim(),
      email: data.get('email').trim(),
      phone: data.get('phone').trim(),
      rooms: data.get('rooms'),
      painPoint: data.get('painPoint').trim(),
      utm: Object.fromEntries(['source', 'medium', 'campaign', 'content', 'term'].map((key) => [key, data.get(`utm_${key}`) || ''])),
      page: `${location.pathname}${location.search}`,
      createdAt: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/audit-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Не вдалося надіслати заявку. Перевірте дані та спробуйте ще раз.');
      form.querySelectorAll('.form-grid, .utm-fields, .form-submit, .form-privacy').forEach((element) => { element.hidden = true; });
      success.hidden = false;
      success.focus();
      emit('audit_form_success');
    } catch (error) {
      status.textContent = error.message === 'Failed to fetch' ? 'Немає з’єднання. Спробуйте ще раз, коли інтернет відновиться.' : error.message;
      emit('audit_form_error', { reason: 'server' });
    } finally {
      submit.disabled = false;
      submit.querySelector('span').textContent = 'Отримати безкоштовний AI-аудит';
    }
  });

  document.querySelectorAll('.problem-card').forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse') return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      card.style.setProperty('--my', `${event.clientY - rect.top}px`);
    });
  });
})();
