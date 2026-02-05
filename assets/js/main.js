/*
  Portfolio Interactions
  - Mobile navigation toggle
  - Smooth in-page navigation
  - Active link highlighting (scroll spy)
  - Reveal-on-scroll animations
  - Contact form validation
*/

(function () {
  const qs = (sel, ctx = document) => ctx.querySelector(sel);
  const qsa = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // Update footer year
  const yearEl = qs('#year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Mobile menu toggle
  const nav = qs('#primary-nav');
  const toggle = qs('.nav-toggle');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      nav.classList.toggle('open');
    });

    // Close menu when clicking a link (mobile)
    qsa('.nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Smooth scroll for in-page anchors (fallback for browsers not supporting CSS smooth)
  qsa('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = qs(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  // Reveal-on-scroll using IntersectionObserver
  const revealEls = qsa('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -15% 0px', threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    // Fallback: show immediately
    revealEls.forEach((el) => el.classList.add('visible'));
  }

  // Scroll spy — highlight active nav link based on current section
  const links = qsa('.nav-link');
  const sections = links.map((l) => qs(l.getAttribute('href'))).filter(Boolean);

  function setActiveLink() {
    const scrollPos = window.scrollY + window.innerHeight * 0.25; // Bias toward upcoming section
    let currentIdx = 0;
    sections.forEach((sec, idx) => {
      if (sec.offsetTop <= scrollPos) currentIdx = idx;
    });
    links.forEach((l, idx) => {
      l.classList.toggle('active', idx === currentIdx);
    });
  }
  window.addEventListener('scroll', setActiveLink, { passive: true });
  window.addEventListener('resize', setActiveLink);
  setActiveLink();

  // Contact form validation and submission
  {
    const form = document.getElementById('contact-form');
    if (form) {
      const name = form.querySelector('#name');
      const email = form.querySelector('#email');
      const message = form.querySelector('#message');
      const statusEl = document.getElementById('form-status');
  
      const setFieldError = (input, msg) => {
        const err = input.parentElement.querySelector('.field-error');
        if (err) err.textContent = msg || '';
        input.classList.toggle('has-error', !!msg);
      };
  
      const validateEmail = (val) => /.+@.+\..+/.test(val);
  
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        statusEl.textContent = '';
  
        const nameVal = name.value.trim();
        const emailVal = email.value.trim();
        const messageVal = message.value.trim();
        let valid = true;
  
        if (!nameVal) { setFieldError(name, 'Please enter your name'); valid = false; } else { setFieldError(name); }
        if (!validateEmail(emailVal)) { setFieldError(email, 'Please enter a valid email'); valid = false; } else { setFieldError(email); }
        if (!messageVal) { setFieldError(message, 'Please enter a message'); valid = false; } else { setFieldError(message); }
  
        if (!valid) {
          statusEl.textContent = 'Please fix the errors above.';
          return;
        }
  
        const submitBtn = form.querySelector('button[type="submit"]');
        const setLoading = (loading) => {
          if (submitBtn) {
            submitBtn.disabled = loading;
            submitBtn.textContent = loading ? 'Sending…' : 'Send Message';
          }
        };
  
        const payload = {
          name: nameVal,
          email: emailVal,
          message: messageVal,
          meta: { from: window.location.href, ts: new Date().toISOString() }
        };
  
        const provider = (form.dataset.contactProvider || 'mailto').toLowerCase();
        const subject = form.dataset.subject || 'Portfolio Contact';
        setLoading(true);
  
        try {
          if (provider === 'apps-script') {
            const endpoint = form.dataset.appsScript;
            if (!endpoint) {
              statusEl.textContent = 'Apps Script endpoint missing. Please set `data-apps-script`.';
              return;
            }
            const fd = new FormData();
            fd.append('name', payload.name);
            fd.append('email', payload.email);
            fd.append('message', payload.message);
            const res = await fetch(endpoint, { method: 'POST', body: fd });
            if (!res.ok) throw new Error('Network error');
            statusEl.textContent = 'Thanks! Your message has been sent.';
            form.reset();
          } else if (provider === 'formspree') {
            const endpoint = form.dataset.formspree || form.getAttribute('action');
            if (!endpoint) {
              statusEl.textContent = 'Formspree endpoint missing. Please configure `data-formspree` or `action`.';
              return;
            }
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Network error');
            statusEl.textContent = 'Thanks! Your message has been sent.';
            form.reset();
          } else if (provider === 'emailjs') {
            if (window.emailjs && form.dataset.emailjsService && form.dataset.emailjsTemplate && form.dataset.emailjsPublic) {
              window.emailjs.init(form.dataset.emailjsPublic);
              await window.emailjs.send(form.dataset.emailjsService, form.dataset.emailjsTemplate, payload);
              statusEl.textContent = 'Thanks! Your message has been sent.';
              form.reset();
            } else {
              statusEl.textContent = 'EmailJS not configured. Please set `data-emailjs-*` attributes on the form.';
            }
          } else {
            const addr = form.dataset.mailto || 'email@domain.com';
            const body = encodeURIComponent(`Name: ${payload.name}\nEmail: ${payload.email}\n\n${payload.message}`);
            const href = `mailto:${addr}?subject=${encodeURIComponent(subject)}&body=${body}`;
            window.location.href = href;
            statusEl.textContent = 'Opening your email client…';
          }
        } catch (err) {
          statusEl.textContent = 'Sorry, sending failed. Please try again later.';
        } finally {
          setLoading(false);
        }
      });
    }
  }
  // Custom animated cursor (desktop only)
  try {
    const prefersFine = window.matchMedia('(pointer: fine)').matches;
    if (prefersFine) {
      const dot = document.createElement('div');
      const glow = document.createElement('div');
      dot.className = 'cursor-dot';
      glow.className = 'cursor-glow';
      document.body.appendChild(glow);
      document.body.appendChild(dot);

      let tx = 0, ty = 0; // target
      let x = 0, y = 0;   // current
      const lerp = (a, b, n) => (1 - n) * a + n * b;

      function raf() {
        x = lerp(x, tx, 0.18);
        y = lerp(y, ty, 0.18);
        dot.style.left = x + 'px';
        dot.style.top = y + 'px';
        glow.style.left = x + 'px';
        glow.style.top = y + 'px';
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);

      window.addEventListener('pointermove', (e) => {
        tx = e.clientX; ty = e.clientY;
      }, { passive: true });

      window.addEventListener('mousedown', () => {
        document.body.classList.add('cursor-hover');
      });
      window.addEventListener('mouseup', () => {
        document.body.classList.remove('cursor-hover');
      });

      // Enlarge cursor when hovering interactive elements
      const interactive = qsa('a, button, .btn, .nav-toggle');
      interactive.forEach((el) => {
        el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
        el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
      });
    }
  } catch (_) { /* no-op */ }
})();

// Theme toggling & persistence
(function() {
  const root = document.documentElement;
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  const stored = localStorage.getItem('theme');
  const initial = stored ? stored : (prefersLight ? 'light' : 'dark');

  function applyTheme(theme) {
    const isLight = theme === 'light';
    root.classList.toggle('theme-light', isLight);
    localStorage.setItem('theme', theme);
    const themeColor = isLight ? '#ffffff' : '#111827';
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', themeColor);
  }

  applyTheme(initial);

  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isLight = root.classList.contains('theme-light');
      applyTheme(isLight ? 'dark' : 'light');
    });
  }

  // Sync with system preference changes
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    mq.addEventListener('change', (ev) => {
      const storedNow = localStorage.getItem('theme');
      if (!storedNow) {
        applyTheme(ev.matches ? 'light' : 'dark');
      }
    });
  }
})();
