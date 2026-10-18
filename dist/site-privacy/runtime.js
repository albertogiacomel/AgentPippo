/* Optional first-party privacy/advertising integration. Klaro is BSD-3-Clause. */
(() => {
  'use strict';
  if (window.SitePrivacy || location.protocol === 'file:') return;
  const entry = document.currentScript;
  const base = new URL('./', entry.src);
  const publisher = 'ca-pub-8896739816580918';
  const slot = '5611479310';
  const production = location.hostname === 'giacomel.info' || location.hostname.endsWith('.giacomel.info');
  // Live serving stays off until the owner's Google privacy setup is complete.
  const liveAdsEnabled = false;
  const consent = { advertising: false, 'google-fonts': false, 'google-ai': false, analytics: false };
  let manager, config, googlePromise, consentReady = false, started = false;
  const initialized = new WeakSet();
  const lang = () => document.documentElement.lang.toLowerCase().startsWith('it') ? 'it' : 'en';
  const text = {
    it: {
      privacy: 'Privacy', choices: 'Preferenze privacy', ad: 'Pubblicità',
      notice: 'Puoi giocare senza servizi facoltativi. Genitori e tutori possono scegliere quali attivare: pubblicità non personalizzata, caratteri Google, funzioni AI online e statistiche.',
      description: 'Tutti i servizi facoltativi sono disattivati inizialmente. Puoi rifiutarli e continuare a giocare. Le preferenze non cancellano i progressi. Per i minori la scelta spetta a chi esercita la responsabilità genitoriale; questo pannello non verifica l’identità o l’età.',
      decline: 'Continua senza facoltativi', accept: 'Consenti i selezionati', save: 'Salva preferenze',
      ads: 'Pubblicità Google non personalizzata', adsBody: 'Annunci senza personalizzazione o remarketing. Il servizio resta spento finché la configurazione privacy Google non è completata; questa scelta da sola non lo attiva.',
      fonts: 'Caratteri Google', fontsBody: 'Scarica i caratteri da Google. Se rifiuti, il sito usa i caratteri del dispositivo.',
      ai: 'Funzioni Google AI online', aiBody: 'Consente richieste facoltative per pronunce e suggerimenti. Non inviare dati personali nei testi. I giochi conservano le alternative locali disponibili.',
      analytics: 'Statistiche di utilizzo', analyticsBody: 'Consente il caricamento delle statistiche Vercel dove presenti. Nessun servizio è attivato dalla sola apertura del pannello.',
    },
    en: {
      privacy: 'Privacy', choices: 'Privacy preferences', ad: 'Advertisement',
      notice: 'You can play without optional services. Parents and guardians can choose non-personalized ads, Google fonts, online AI features and usage statistics.',
      description: 'Optional services start disabled. You can decline and keep playing. These preferences do not erase game progress. For children, choices belong to a parent or guardian; this panel does not verify identity or age.',
      decline: 'Continue without optional services', accept: 'Allow selected services', save: 'Save preferences',
      ads: 'Non-personalized Google advertising', adsBody: 'Ads without personalization or remarketing. This service stays off until Google privacy setup is complete; this choice alone does not enable it.',
      fonts: 'Google fonts', fontsBody: 'Downloads fonts from Google. If declined, the site uses device fonts.',
      ai: 'Online Google AI features', aiBody: 'Allows optional pronunciation and suggestion requests. Do not send personal information in text. Available local game alternatives remain usable.',
      analytics: 'Usage statistics', analyticsBody: 'Allows Vercel statistics where present. Opening preferences alone does not enable any service.',
    },
  };
  const api = {
    version: '1.0.0',
    get ready() { return ready; },
    hasConsent: name => consentReady && consent[name] === true,
    open: async () => { await api.ready; window.klaro.show(config, true); },
    getStatus: () => ({ consentReady, liveAdsEnabled, production, consent: { ...consent } }),
    // Dependency injection is used by the local regression fixture, never for live impressions.
    mountAd: (target, options = {}) => mountAd(target, options),
  };
  window.SitePrivacy = Object.freeze(api);

  function publish(name, value) {
    const previous = consent[name];
    consent[name] = Boolean(value);
    const key = 'privacy' + name.split('-').map(s => s[0].toUpperCase() + s.slice(1)).join('');
    document.documentElement.dataset[key] = value ? 'allowed' : 'denied';
    window.dispatchEvent(new CustomEvent('siteprivacychange', { detail: { service: name, allowed: Boolean(value) } }));
    if (name === 'google-fonts') {
      for (const link of document.querySelectorAll('link[data-privacy-font-href]')) {
        if (value) link.href = link.dataset.privacyFontHref;
        else link.removeAttribute('href');
      }
    }
    if (name === 'advertising' && previous && !value && document.getElementById('giacomel-google-ads')) {
      // Klaro saves the choice in the current task; reload removes already loaded provider code.
      setTimeout(() => location.reload(), 0);
    }
    if (name === 'advertising' && value && liveAdsEnabled && production) showLiveAd();
  }

  function loadScript(id, url, attributes = {}) {
    return new Promise((resolve, reject) => {
      const existing = document.getElementById(id);
      if (existing?.dataset.loaded === 'true') { resolve(existing); return; }
      const script = existing || document.createElement('script');
      const timeout = setTimeout(() => finish(new Error('Script load timeout: ' + id)), 15000);
      const loaded = () => finish();
      const failed = () => finish(new Error('Script unavailable: ' + id));
      function finish(error) {
        clearTimeout(timeout); script.removeEventListener('load', loaded); script.removeEventListener('error', failed);
        if (error) { if (!existing) script.remove(); reject(error); }
        else { script.dataset.loaded = 'true'; resolve(script); }
      }
      script.addEventListener('load', loaded, { once: true }); script.addEventListener('error', failed, { once: true });
      if (!existing) {
        script.id = id; script.src = url; script.async = true;
        for (const [key, value] of Object.entries(attributes)) script.setAttribute(key, value);
        document.head.appendChild(script);
      }
    });
  }

  function loadGoogle() {
    googlePromise ||= loadScript('giacomel-google-ads', 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + publisher, { crossorigin: 'anonymous' });
    return googlePromise;
  }

  function mountAd(target, { enabled = liveAdsEnabled && production, hasConsent = () => api.hasConsent('advertising'), load = loadGoogle, test = false } = {}) {
    if (!enabled || !hasConsent() || !target?.isConnected || target.querySelector('[data-site-ad]')) return null;
    const aside = document.createElement('aside'); aside.className = 'site-ad'; aside.dataset.siteAd = '';
    aside.setAttribute('aria-label', text[lang()].ad);
    const label = document.createElement('p'); label.className = 'site-ad-label'; label.textContent = text[lang()].ad;
    const ins = document.createElement('ins'); ins.className = 'adsbygoogle'; ins.style.display = 'block'; ins.style.width = '100%';
    ins.dataset.adClient = publisher; ins.dataset.adSlot = slot; ins.dataset.adFormat = 'auto'; ins.dataset.fullWidthResponsive = 'true'; ins.dataset.tagForAgeTreatment = '1';
    if (test) ins.dataset.adtest = 'on';
    aside.append(label, ins); target.appendChild(aside);
    const collapse = () => { aside.hidden = true; };
    const observer = new MutationObserver(() => { if (ins.dataset.adStatus === 'unfilled') { collapse(); observer.disconnect(); } });
    observer.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });
    Promise.resolve().then(load).then(() => {
      if (!hasConsent() || !ins.isConnected) { observer.disconnect(); aside.remove(); return; }
      if (initialized.has(ins) || ins.getBoundingClientRect().width <= 0) { collapse(); observer.disconnect(); return; }
      initialized.add(ins);
      const queue = window.adsbygoogle ||= [];
      queue.push({});
      aside.dataset.state = 'requested';
    }).catch(error => { aside.dataset.error = error.message; collapse(); observer.disconnect(); });
    return aside;
  }

  function showLiveAd() {
    if (location.pathname.endsWith('/privacy.html')) return;
    const target = document.querySelector('main');
    if (target) mountAd(target);
  }

  function translate() {
    if (config) { config.lang = lang(); window.klaro?.render(config); }
    for (const link of document.querySelectorAll('[data-site-privacy-link]')) link.textContent = text[lang()].privacy;
    for (const button of document.querySelectorAll('[data-site-privacy-open]')) button.textContent = text[lang()].choices;
    for (const label of document.querySelectorAll('.site-ad-label')) label.textContent = text[lang()].ad;
    for (const aside of document.querySelectorAll('[data-site-ad]')) aside.setAttribute('aria-label', text[lang()].ad);
  }

  function makeChoices() {
    const block = document.createElement('div'); block.className = 'site-privacy-links';
    const link = document.createElement('a'); link.href = '/privacy.html'; link.dataset.sitePrivacyLink = ''; link.textContent = text[lang()].privacy;
    const button = document.createElement('button'); button.type = 'button'; button.dataset.sitePrivacyOpen = ''; button.textContent = text[lang()].choices;
    button.addEventListener('click', () => {
      const controller = window.__gameKit;
      controller?.lifecycle?.pause('privacy-consent');
      controller?.dialog?.close();
      void api.open().catch(() => { controller?.lifecycle?.resume('privacy-consent'); location.href = '/privacy.html'; });
    });
    block.append(link, button); return block;
  }

  function installLinks() {
    document.body.appendChild(makeChoices());
    let attached = false;
    const attach = () => {
      const dialog = window.__gameKit?.dialog?.element;
      if (dialog && !attached) { dialog.appendChild(makeChoices()); attached = true; return true; }
      return false;
    };
    if (!attach()) {
      const observer = new MutationObserver(() => { if (attach()) observer.disconnect(); });
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => observer.disconnect(), 15000);
    }
  }

  function translations(language) {
    const t = text[language];
    return { privacyPolicyUrl: '/privacy.html', ok: t.accept, acceptSelected: t.accept, acceptAll: language === 'it' ? 'Consenti facoltativi' : 'Allow optional services', decline: t.decline, save: t.save,
      consentNotice: { description: t.notice, learnMore: t.choices }, consentModal: { title: t.choices, description: t.description },
      purposes: { advertising: { title: t.ads, description: t.adsBody }, styling: { title: t.fonts, description: t.fontsBody }, ai: { title: t.ai, description: t.aiBody }, analytics: { title: t.analytics, description: t.analyticsBody } } };
  }

  async function start() {
    if (started) return; started = true;
    const sheet = document.createElement('link'); sheet.rel = 'stylesheet'; sheet.href = new URL('vendor/klaro-0.7.21/klaro.min.css', base); document.head.appendChild(sheet);
    const own = document.createElement('link'); own.rel = 'stylesheet'; own.href = new URL('site.css', base); document.head.appendChild(own);
    config = { elementID: 'klaro', storageMethod: 'cookie', storageName: 'giacomel_privacy_v1', cookieExpiresAfterDays: 180,
      ...(production ? { cookieDomain: '.giacomel.info' } : {}), default: false, mustConsent: false, acceptAll: true, hideDeclineAll: false, hideLearnMore: false,
      htmlTexts: false, lang: lang(), translations: { it: translations('it'), en: translations('en') },
      services: [ ['advertising', 'advertising', 'ads', 'adsBody'], ['google-fonts', 'styling', 'fonts', 'fontsBody'], ['google-ai', 'ai', 'ai', 'aiBody'], ['analytics', 'analytics', 'analytics', 'analyticsBody'] ].map(([name, purpose, title, body]) => ({ name, purposes: [purpose], default: false, required: false, optOut: false,
        translations: { it: { title: text.it[title], description: text.it[body] }, en: { title: text.en[title], description: text.en[body] } }, callback: value => publish(name, value) })),
    };
    window.giacomelPrivacyConfig = config;
    installLinks();
    await loadScript('giacomel-klaro', new URL('vendor/klaro-0.7.21/klaro-no-css.js', base), { 'data-klaro-config': 'giacomelPrivacyConfig' });
    manager = window.klaro.getManager(config); consentReady = true;
    for (const name of Object.keys(consent)) publish(name, manager.confirmed && manager.getConsent(name));
    new MutationObserver(translate).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    const privacyRoot = document.getElementById('klaro');
    if (privacyRoot) new MutationObserver(() => {
      const modal = privacyRoot.querySelector('.cookie-modal');
      const controller = window.__gameKit?.lifecycle;
      if (controller) { if (modal && getComputedStyle(modal).display !== 'none') controller.pause('privacy-consent'); else controller.resume('privacy-consent'); }
    }).observe(privacyRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
    return api;
  }
  // The frozen public API exposes the promise through a getter from the outset.
  const ready = document.readyState === 'loading' ? new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true })).then(start) : start();
  // Avoid unhandled rejections when a content blocker prevents the consent UI; optional services remain denied.
  ready.catch(() => { document.documentElement.dataset.privacyStatus = 'unavailable'; });
  Object.defineProperty(window, '__sitePrivacyReady', { value: ready });
})();
