(() => {
  'use strict';

  const CONFIG = {
    /*
     * Existing Google Apps Script endpoint used for lead storage.
     * Replace this URL when you deploy your own Google Apps Script.
     */
    endpoint:
      'https://script.google.com/macros/s/AKfycbwGVNYc4scLaZdQ2Z7Bbjfwf_7wexxdD5u8SN3Sa7D0kE4qHR7ufM5Dc_phXyp7AJjI-A/exec',

    thankYouPage: 'thank-you.html',

    // Automatically show the popup after 25 seconds.
    popupDelay: 25000,

    phone: '+919355907407',

    // Used to ensure the automatic popup appears only once per day.
    popupStorageKey: 'eduunite_bba_popup_seen'
  };

  /*
   * DOM helper functions
   */
  const $ = (selector, context = document) =>
    context.querySelector(selector);

  const $$ = (selector, context = document) =>
    Array.from(context.querySelectorAll(selector));

  /*
   * Mobile navigation
   */
  const menuToggle = $('.menu-toggle');
  const menu = $('#primary-menu');

  function closeMenu() {
    if (!menu || !menuToggle) {
      return;
    }

    menu.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
  }

  if (menuToggle && menu) {
    menuToggle.addEventListener('click', () => {
      const open = !menu.classList.contains('is-open');

      menu.classList.toggle('is-open', open);
      menuToggle.setAttribute('aria-expanded', String(open));
      menuToggle.setAttribute(
        'aria-label',
        open ? 'Close navigation' : 'Open navigation'
      );
    });

    $$('a', menu).forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('click', (event) => {
      if (
        !menu.contains(event.target) &&
        !menuToggle.contains(event.target)
      ) {
        closeMenu();
      }
    });
  }

  /*
   * Scroll reveal animation
   */
  const revealItems = $$('.reveal');

  const reducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  if ('IntersectionObserver' in window && !reducedMotion) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -40px'
      }
    );

    revealItems.forEach((item) => {
      revealObserver.observe(item);
    });
  } else {
    revealItems.forEach((item) => {
      item.classList.add('is-visible');
    });
  }

  /*
   * Lead form popup
   */
  const modal = $('#leadModal');
  const modalDialog = modal
    ? $('.modal__dialog', modal)
    : null;

  let lastFocusedElement = null;
  let modalShownAutomatically = false;

  function popupSeenToday() {
    try {
      return (
        localStorage.getItem(CONFIG.popupStorageKey) ===
        new Date().toDateString()
      );
    } catch (error) {
      return false;
    }
  }

  function markPopupSeen() {
    try {
      localStorage.setItem(
        CONFIG.popupStorageKey,
        new Date().toDateString()
      );
    } catch (error) {
      // Continue when localStorage is unavailable.
    }
  }

  function openModal({ automatic = false } = {}) {
    if (!modal) {
      return;
    }

    if (
      automatic &&
      (modalShownAutomatically || popupSeenToday())
    ) {
      return;
    }

    if (automatic) {
      modalShownAutomatically = true;
      markPopupSeen();
    }

    lastFocusedElement = document.activeElement;

    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    window.setTimeout(() => {
      const firstInput = $(
        'input:not([type="hidden"]):not([tabindex="-1"])',
        modal
      );

      if (firstInput) {
        firstInput.focus();
      }
    }, 60);

    pushEvent('bba_lead_modal_open', {
      automatic
    });
  }

  function closeModal() {
    if (!modal) {
      return;
    }

    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');

    if (
      lastFocusedElement &&
      typeof lastFocusedElement.focus === 'function'
    ) {
      lastFocusedElement.focus();
    }
  }

  $$('[data-open-lead]').forEach((button) => {
    button.addEventListener('click', () => {
      openModal();
    });
  });

  $$('[data-close-modal]').forEach((button) => {
    button.addEventListener('click', closeModal);
  });

  if (modal) {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal();
      }
    });

    document.addEventListener('keydown', (event) => {
      if (
        event.key === 'Escape' &&
        modal.classList.contains('is-open')
      ) {
        closeModal();
      }

      if (
        event.key === 'Tab' &&
        modal.classList.contains('is-open') &&
        modalDialog
      ) {
        trapFocus(event, modalDialog);
      }
    });
  }

  function trapFocus(event, container) {
    const focusable = $$(
      [
        'a[href]',
        'button:not([disabled])',
        'input:not([disabled]):not([type="hidden"])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        '[tabindex]:not([tabindex="-1"])'
      ].join(','),
      container
    ).filter((element) => element.offsetParent !== null);

    if (!focusable.length) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (
      event.shiftKey &&
      document.activeElement === first
    ) {
      event.preventDefault();
      last.focus();
    } else if (
      !event.shiftKey &&
      document.activeElement === last
    ) {
      event.preventDefault();
      first.focus();
    }
  }

  /*
   * Automatically show popup on desktop.
   */
  window.setTimeout(() => {
    if (window.innerWidth > 700) {
      openModal({
        automatic: true
      });
    }
  }, CONFIG.popupDelay);

  /*
   * Exit-intent popup on larger desktop screens.
   */
  document.addEventListener('mouseout', (event) => {
    const leavingPage =
      event.clientY <= 0 &&
      !event.relatedTarget;

    if (
      window.innerWidth > 900 &&
      leavingPage
    ) {
      openModal({
        automatic: true
      });
    }
  });

  /*
   * URL and campaign tracking
   */
  const queryValue = (name) => {
    try {
      return (
        new URLSearchParams(
          window.location.search
        ).get(name) || ''
      );
    } catch (error) {
      return '';
    }
  };

  function storeAttribution() {
    const keys = [
      'gclid',
      'gbraid',
      'wbraid',
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'matchtype'
    ];

    try {
      const previous = JSON.parse(
        sessionStorage.getItem(
          'eduunite_attribution'
        ) || '{}'
      );

      keys.forEach((key) => {
        const current = queryValue(key);

        if (current) {
          previous[key] = current;
        }
      });

      sessionStorage.setItem(
        'eduunite_attribution',
        JSON.stringify(previous)
      );
    } catch (error) {
      // Tracking continues without sessionStorage.
    }
  }

  function attributionValue(name) {
    const current = queryValue(name);

    if (current) {
      return current;
    }

    try {
      const stored = JSON.parse(
        sessionStorage.getItem(
          'eduunite_attribution'
        ) || '{}'
      );

      return stored[name] || '';
    } catch (error) {
      return '';
    }
  }

  storeAttribution();

  /*
   * Initialise lead forms.
   */
  $$('[data-lead-form]').forEach((form) => {
    const startedAt = $(
      '[name="form_started_at"]',
      form
    );

    if (startedAt) {
      startedAt.value = String(Date.now());
    }

    form.addEventListener('input', (event) => {
      clearFieldError(
        form,
        event.target.name
      );
    });

    form.addEventListener('change', (event) => {
      clearFieldError(
        form,
        event.target.name
      );
    });
  });

  /*
   * Use event delegation so dynamically added
   * lead forms also work.
   */
  document.addEventListener(
    'submit',
    (event) => {
      const form = event.target;

      if (
        !(form instanceof HTMLFormElement) ||
        !form.matches('[data-lead-form]')
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const validation = validateForm(form);

      if (!validation.valid) {
        const firstInvalid = $(
          '[aria-invalid="true"]',
          form
        );

        if (firstInvalid) {
          firstInvalid.focus();
        }

        return;
      }

      submitLead(form);
    },
    true
  );

  /*
   * Return trimmed form value.
   */
  function value(form, name) {
    const field = form.elements.namedItem(name);

    if (
      field &&
      'value' in field
    ) {
      return String(field.value).trim();
    }

    return '';
  }

  /*
   * Field error helpers
   */
  function setFieldError(
    form,
    name,
    message
  ) {
    const field = form.elements.namedItem(name);
    const error = $(
      `[data-error-for="${name}"]`,
      form
    );

    if (
      field &&
      'setAttribute' in field
    ) {
      field.setAttribute(
        'aria-invalid',
        message ? 'true' : 'false'
      );
    }

    if (error) {
      error.textContent = message || '';
    }
  }

  function clearFieldError(form, name) {
    if (!name) {
      return;
    }

    setFieldError(form, name, '');
  }

  /*
   * Form validation
   */
  function validateForm(form) {
    const fullName = value(form, 'name');

    const phone = value(
      form,
      'phone'
    ).replace(/\D/g, '');

    const email = value(form, 'email');
    const state = value(form, 'state');

    const classStatus = value(
      form,
      'class_12_status'
    );

    const consentField =
      form.elements.namedItem('consent');

    const consent =
      !consentField ||
      consentField.checked;

    let valid = true;

    [
      'name',
      'phone',
      'email',
      'state',
      'class_12_status'
    ].forEach((fieldName) => {
      clearFieldError(
        form,
        fieldName
      );
    });

    if (fullName.length < 2) {
      setFieldError(
        form,
        'name',
        'Please enter your full name.'
      );

      valid = false;
    }

    if (
      phone.length !== 10 ||
      !/^[6-9]\d{9}$/.test(phone)
    ) {
      setFieldError(
        form,
        'phone',
        'Enter a valid 10-digit Indian mobile number.'
      );

      valid = false;
    }

    if (
      email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      setFieldError(
        form,
        'email',
        'Enter a valid email address.'
      );

      valid = false;
    }

    if (!state) {
      setFieldError(
        form,
        'state',
        'Please select or enter your state.'
      );

      valid = false;
    }

    if (!classStatus) {
      setFieldError(
        form,
        'class_12_status',
        'Please select your Class 12 status.'
      );

      valid = false;
    }

    if (!consent) {
      setStatus(
        form,
        'Please accept the consent checkbox so our counsellor can contact you.',
        true
      );

      valid = false;
    } else if (valid) {
      setStatus(form, '');
    }

    return {
      valid,
      phone
    };
  }

  /*
   * Create form payload for Google Apps Script.
   */
  function buildPayload(form) {
    const phone = value(
      form,
      'phone'
    ).replace(/\D/g, '');

    const started =
      Number(
        value(form, 'form_started_at')
      ) || Date.now();

    const fields = {
      Lead_Source:
        value(form, 'Lead_Source') ||
        'Google Ads-EduUnite',

      name: value(form, 'name'),

      phone,

      email: value(form, 'email'),

      /*
       * Kept for compatibility with the
       * existing Georgia sheet structure.
       */
      neet:
        value(form, 'neet') ||
        'Not Applicable - BBA',

      state: value(form, 'state'),

      class_12_status: value(
        form,
        'class_12_status'
      ),

      class_12_percentage: value(
        form,
        'class_12_percentage'
      ),

      preferred_country:
        value(
          form,
          'preferred_country'
        ) || 'Not decided',

      preferred_intake:
        value(
          form,
          'preferred_intake'
        ) || '2027',

      course:
        value(form, 'course') ||
        'BBA Abroad',

      source:
        'BBA Abroad Landing Page',

      event_type:
        value(form, 'event_type') ||
        'bba_abroad_lead',

      is_basic_registration:
        value(
          form,
          'is_basic_registration'
        ) || 'true',

      should_send:
        value(form, 'should_send') ||
        'true',

      page: window.location.pathname,

      page_url: window.location.href,

      referrer: document.referrer,

      gclid:
        attributionValue('gclid'),

      gbraid:
        attributionValue('gbraid'),

      wbraid:
        attributionValue('wbraid'),

      utm_source:
        attributionValue('utm_source'),

      utm_medium:
        attributionValue('utm_medium'),

      utm_campaign:
        attributionValue('utm_campaign'),

      utm_term:
        attributionValue('utm_term'),

      utm_content:
        attributionValue('utm_content'),

      matchtype:
        attributionValue('matchtype'),

      consent: 'Yes',

      form_id:
        form.id || 'bba-lead-form',

      form_fill_seconds: Math.max(
        0,
        Math.round(
          (Date.now() - started) / 1000
        )
      ),

      ts: new Date().toISOString()
    };

    return new URLSearchParams(fields);
  }

  /*
   * Submit lead to Google Apps Script.
   */
  async function submitLead(form) {
    /*
     * Honeypot spam protection.
     * Legitimate users will never fill this field.
     */
    const honeypot = value(
      form,
      'website'
    );

    if (honeypot) {
      window.location.assign(
        CONFIG.thankYouPage
      );

      return;
    }

    const button = $(
      'button[type="submit"]',
      form
    );

    const originalText = button
      ? button.textContent
      : '';

    if (button) {
      button.disabled = true;
      button.textContent = 'Submitting…';
    }

    setStatus(
      form,
      'Sending your details…'
    );

    let completed = false;

    /*
     * Complete submission and redirect.
     */
    const complete = () => {
      if (completed) {
        return;
      }

      completed = true;

      const popup = Boolean(
        form.closest('#leadModal')
      );

      pushEvent(
        popup
          ? 'generate_lead_popup'
          : 'generate_lead',
        {
          course:
            value(form, 'course') ||
            'BBA Abroad',

          lead_source:
            value(
              form,
              'Lead_Source'
            ) || 'Google Ads-EduUnite'
        }
      );

      /*
       * Send direct GA4 event when gtag exists.
       */
      if (
        typeof window.gtag === 'function'
      ) {
        window.gtag(
          'event',
          'bba_abroad_thank_you',
          {
            value: 0,
            currency: 'INR'
          }
        );
      }

      setStatus(
        form,
        'Thank you. Redirecting…'
      );

      window.setTimeout(() => {
        window.location.assign(
          CONFIG.thankYouPage
        );
      }, 350);
    };

    /*
     * Restore form when request fails.
     */
    const fail = () => {
      if (completed) {
        return;
      }

      if (button) {
        button.disabled = false;
        button.textContent =
          originalText || 'Try Again';
      }

      const readablePhone =
        CONFIG.phone.replace('+91', '');

      setStatus(
        form,
        `We could not send the form. Please call ${readablePhone} or try again.`,
        true
      );
    };

    /*
     * Google Apps Script with no-cors does not
     * expose a normal readable response.
     *
     * The fallback timer prevents users getting
     * stuck if the browser does not resolve fetch.
     */
    const timeout = window.setTimeout(
      complete,
      4500
    );

    try {
      await fetch(CONFIG.endpoint, {
        method: 'POST',
        mode: 'no-cors',
        body: buildPayload(form),
        keepalive: true
      });

      window.clearTimeout(timeout);
      complete();
    } catch (error) {
      window.clearTimeout(timeout);
      fail();
    }
  }

  /*
   * Form status message
   */
  function setStatus(
    form,
    message,
    isError = false
  ) {
    const status = $('.form-status', form);

    if (!status) {
      return;
    }

    status.textContent = message;

    status.classList.toggle(
      'is-error',
      Boolean(isError)
    );
  }

  /*
   * Google Tag Manager dataLayer helper
   */
  function pushEvent(
    event,
    details = {}
  ) {
    window.dataLayer =
      window.dataLayer || [];

    window.dataLayer.push({
      event,
      ...details
    });
  }

  /*
   * Phone click tracking
   */
  $$('a[href^="tel:"]').forEach(
    (link) => {
      link.addEventListener(
        'click',
        () => {
          pushEvent('click_to_call', {
            page:
              window.location.pathname
          });
        }
      );
    }
  );

  /*
   * WhatsApp click tracking
   */
  $$('a[href*="wa.me"]').forEach(
    (link) => {
      link.addEventListener(
        'click',
        () => {
          pushEvent(
            'click_whatsapp',
            {
              page:
                window.location.pathname
            }
          );
        }
      );
    }
  );
})();