/**
 * HAZE interaktivní mapa /nase-projekty/
 *
 * Stack: Leaflet.js v1.9 + OpenStreetMap tiles (free, no API key, cost-zero)
 * Data: ../assets/data/projekty.json (39 projects: 37 CZ + 2 SK)
 *
 * Pin barvy: 5-odstínová oranžová paleta deterministicky podle regionu.
 * Pin velikost: scope_1_5 (pokud null -> default 11px).
 *
 * All dynamic content built via DOM API + textContent (XSS-safe).
 */
(function () {
  'use strict';

  const MAP_EL_ID = 'haze-mapa';
  const FILTER_EL_ID = 'haze-mapa-filtr';
  const LIST_EL_ID = 'haze-mapa-list';
  const DATA_URL = '../assets/data/projekty.json';

  const INITIAL_CENTER = [49.7, 16.5]; // ČR + SK těžiště
  const INITIAL_ZOOM = 7;

  // 5-odstínová oranžová paleta (od světle k tmavě)
  const ORANGE_SHADES = [
    '#FDB46A', // 1 - světlá broskvová
    '#FBA04A', // 2 - světle oranžová
    '#F79430', // 3 - HAZE brand
    '#E07A1C', // 4 - tmavě oranžová
    '#B85F12', // 5 - karamel/cihla
  ];
  const STROKE_COLOR = '#7a3d0a';
  const SK_STROKE = '#1d4ed8'; // modrý okraj pro SK piny (jemné odlišení)

  const PRODUCT_LABELS = {
    'stajova-vrata': 'Stájová vrata',
    'vrata-prumysl': 'Vrata pro průmysl',
    'bvs-ventilace': 'BVS ventilace',
    'stresni-vetrani': 'Střešní větrání',
    'plachtova-vrata': 'Plachtová vrata',
    'svinovaci-vrata': 'Svinovací vrata',
    'zastreseni-jimek': 'Zastřešení jímek',
    'pletiva-doplnky': 'Pletiva a doplňky',
    'protihlukove-steny': 'Protihlukové stěny',
  };

  let map;
  let allProjects = [];
  let activeFilters = new Set();
  let markers = {};

  function el(tag, opts) {
    const node = document.createElement(tag);
    if (!opts) return node;
    if (opts.className) node.className = opts.className;
    if (opts.text != null) node.textContent = String(opts.text);
    if (opts.title) node.title = opts.title;
    if (opts.attrs) {
      for (const [k, v] of Object.entries(opts.attrs)) {
        if (v != null) node.setAttribute(k, String(v));
      }
    }
    return node;
  }

  // Deterministic hash -> shade index (0-4)
  function shadeForRegion(region) {
    if (!region) return 2;
    let h = 0;
    for (let i = 0; i < region.length; i++) {
      h = ((h << 5) - h) + region.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h) % ORANGE_SHADES.length;
  }

  function init() {
    const mapEl = document.getElementById(MAP_EL_ID);
    if (!mapEl) return;

    if (typeof L === 'undefined') {
      mapEl.replaceChildren(el('p', { className: 'haze-mapa-error', text: 'Mapu se nepodařilo načíst (Leaflet missing).' }));
      return;
    }

    map = L.map(MAP_EL_ID, {
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> přispěvatelé',
    }).addTo(map);

    map.on('focus', () => map.scrollWheelZoom.enable());
    map.on('blur', () => map.scrollWheelZoom.disable());

    fetch(DATA_URL)
      .then((r) => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then((data) => {
        allProjects = data.projects || [];
        renderFilter(data._meta && data._meta.filter_categories ? data._meta.filter_categories : []);
        renderPins();
        renderList();
      })
      .catch((err) => {
        console.error('[haze-mapa] data load failed:', err);
        mapEl.replaceChildren(el('p', { className: 'haze-mapa-error', text: 'Data projektů se nepodařilo načíst.' }));
      });
  }

  function renderFilter(categories) {
    const filterEl = document.getElementById(FILTER_EL_ID);
    if (!filterEl) return;
    filterEl.replaceChildren();

    const allBtn = el('button', {
      className: 'haze-mapa-chip haze-mapa-chip--all is-active',
      text: 'Vše',
      attrs: { type: 'button', 'data-cat': '__all__' },
    });
    filterEl.appendChild(allBtn);

    categories.forEach((cat) => {
      const label = PRODUCT_LABELS[cat] || cat;
      const btn = el('button', {
        className: 'haze-mapa-chip',
        text: label,
        attrs: { type: 'button', 'data-cat': cat },
      });
      filterEl.appendChild(btn);
    });

    filterEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.haze-mapa-chip');
      if (!btn) return;
      const cat = btn.dataset.cat;

      if (cat === '__all__') {
        activeFilters.clear();
        filterEl.querySelectorAll('.haze-mapa-chip').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
      } else {
        filterEl.querySelector('[data-cat="__all__"]').classList.remove('is-active');
        if (activeFilters.has(cat)) {
          activeFilters.delete(cat);
          btn.classList.remove('is-active');
        } else {
          activeFilters.add(cat);
          btn.classList.add('is-active');
        }
        if (activeFilters.size === 0) {
          filterEl.querySelector('[data-cat="__all__"]').classList.add('is-active');
        }
      }
      renderPins();
      renderList();
    });
  }

  function projectMatchesFilter(p) {
    if (activeFilters.size === 0) return true;
    const products = p.products || [];
    for (const f of activeFilters) {
      if (products.includes(f)) return true;
    }
    return false;
  }

  function renderPins() {
    Object.values(markers).forEach((m) => map.removeLayer(m));
    markers = {};

    allProjects.forEach((p) => {
      if (!projectMatchesFilter(p)) return;
      if (p.lat == null || p.lng == null) return;

      const scope = typeof p.scope_1_5 === 'number' ? p.scope_1_5 : null;
      const radius = scope ? 6 + scope * 2.5 : 9;
      const fillColor = ORANGE_SHADES[shadeForRegion(p.region)];
      const stroke = p.country === 'SK' ? SK_STROKE : STROKE_COLOR;

      const marker = L.circleMarker([p.lat, p.lng], {
        radius,
        color: stroke,
        weight: 1.5,
        fillColor,
        fillOpacity: 0.92,
      }).addTo(map);

      const popupRoot = buildPopupContent(p);
      marker.bindPopup(popupRoot, { maxWidth: 320, className: 'haze-mapa-popup' });
      markers[p.id] = marker;
    });
  }

  function buildPopupContent(p) {
    const root = el('div', { className: 'haze-mapa-pop' });

    if (p.hero_image) {
      const img = el('img', { className: 'haze-mapa-pop-img', attrs: { src: p.hero_image, alt: p.name || '', loading: 'lazy' } });
      root.appendChild(img);
    }

    const body = el('div', { className: 'haze-mapa-pop-body' });

    const head = el('div', { className: 'haze-mapa-pop-head' });
    head.appendChild(el('strong', { text: p.name || '' }));
    const flag = p.country === 'SK' ? ' SK' : (p.country === 'CZ' ? ' CZ' : '');
    head.appendChild(el('span', {
      className: 'haze-mapa-pop-region',
      text: (p.region || '') + (flag ? ' ·' + flag : ''),
    }));
    body.appendChild(head);

    if (p.year) {
      body.appendChild(el('div', { className: 'haze-mapa-pop-year', text: 'Rok: ' + p.year }));
    }

    if (typeof p.scope_1_5 === 'number') {
      const filled = '■'.repeat(p.scope_1_5);
      const empty = '□'.repeat(5 - p.scope_1_5);
      body.appendChild(el('div', { className: 'haze-mapa-pop-scope', text: 'Rozsah ' + p.scope_1_5 + '/5 ' + filled + empty }));
    }

    if (p.description) {
      body.appendChild(el('p', { className: 'haze-mapa-pop-desc', text: p.description }));
    }

    if (p.result_metric) {
      const wrap = el('p', { className: 'haze-mapa-pop-result' });
      wrap.appendChild(el('strong', { text: 'Výsledek: ' }));
      wrap.appendChild(document.createTextNode(p.result_metric));
      body.appendChild(wrap);
    }

    const products = p.products || [];
    if (products.length) {
      const tags = el('div', { className: 'haze-mapa-pop-tags' });
      products.forEach((c) => {
        tags.appendChild(el('span', { className: 'haze-mapa-tag', text: PRODUCT_LABELS[c] || c }));
      });
      body.appendChild(tags);
    }

    root.appendChild(body);
    return root;
  }

  function renderList() {
    const listEl = document.getElementById(LIST_EL_ID);
    if (!listEl) return;
    listEl.replaceChildren();

    const filtered = allProjects.filter(projectMatchesFilter);

    const counter = el('div', { className: 'haze-mapa-counter' });
    counter.appendChild(el('strong', { text: String(filtered.length) }));
    counter.appendChild(document.createTextNode(' realizací'));
    const skCount = filtered.filter((p) => p.country === 'SK').length;
    if (skCount > 0) {
      counter.appendChild(el('span', {
        className: 'haze-mapa-counter-sk',
        text: ' · ' + skCount + ' na Slovensku',
      }));
    }
    listEl.appendChild(counter);

    const grid = el('div', { className: 'haze-mapa-grid' });
    filtered.forEach((p) => grid.appendChild(buildCard(p)));
    listEl.appendChild(grid);
  }

  function buildCard(p) {
    const hasCoords = p.lat != null && p.lng != null;
    const card = el('article', {
      className: 'haze-mapa-card' + (hasCoords ? '' : ' haze-mapa-card--pending'),
      attrs: hasCoords
        ? { 'data-id': p.id, tabindex: '0', role: 'button' }
        : { 'data-pending': '1' },
    });

    // Color stripe by region shade
    const stripe = el('span', { className: 'haze-mapa-card-stripe' });
    stripe.style.background = ORANGE_SHADES[shadeForRegion(p.region)];
    card.appendChild(stripe);

    const head = el('div', { className: 'haze-mapa-card-head' });
    head.appendChild(el('strong', { text: p.name || '' }));
    if (p.country === 'SK') {
      head.appendChild(el('span', { className: 'haze-mapa-card-flag', text: 'SK' }));
    }
    card.appendChild(head);

    const meta = el('div', { className: 'haze-mapa-card-meta' });
    meta.appendChild(el('span', { text: p.region || '' }));
    if (p.year) {
      meta.appendChild(el('span', { className: 'haze-mapa-card-year', text: String(p.year) }));
    }
    card.appendChild(meta);

    const products = p.products || [];
    if (products.length) {
      const tags = el('div', { className: 'haze-mapa-card-tags' });
      products.forEach((c) => {
        tags.appendChild(el('span', { className: 'haze-mapa-tag', text: PRODUCT_LABELS[c] || c }));
      });
      card.appendChild(tags);
    }

    if (hasCoords) {
      const handler = () => {
        const marker = markers[p.id];
        if (marker) {
          map.flyTo(marker.getLatLng(), 11, { duration: 0.6 });
          marker.openPopup();
        }
      };
      card.addEventListener('click', handler);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handler();
        }
      });
    }

    return card;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
