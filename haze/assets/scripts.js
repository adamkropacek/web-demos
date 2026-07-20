/* ============================================================
   HAZE site — shared JS (multi-page)
   Hosting-agnostic: no framework, no build step, pure vanilla.
   ============================================================ */

// Keep empty until a real form endpoint is approved; forms fall back to mailto.
const FORM_ENDPOINT = '';

// Mark page loaded immediately
document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('loaded');
});
if (document.readyState !== 'loading') document.body.classList.add('loaded');

// Header scroll state — header is always visible; only the background depth changes
// once the user starts scrolling so the bar reads stable (no opacity jitter).
const hdr = document.getElementById('hdr');
if (hdr) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) hdr.classList.add('scrolled');
    else hdr.classList.remove('scrolled');
  }, { passive: true });
}

// Reveal on scroll
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('in'); });
}, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));
setTimeout(() => document.querySelectorAll('.reveal').forEach(el => el.classList.add('in')), 4000);

// Hero parallax (homepage only, skipped on reduced motion)
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const heroImg = document.querySelector('.hero-img img');
let ticking = false;
if (!reduceMotion && heroImg) {
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, window.innerHeight);
        heroImg.style.transform = `scale(1) translateY(${y * 0.18}px)`;
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

// Cookie consent (Consent Mode v2)
function cookieChoice(accept) {
  if (typeof gtag === 'function') {
    if (accept) {
      gtag('consent','update',{'ad_storage':'granted','ad_user_data':'granted','ad_personalization':'granted','analytics_storage':'granted'});
    }
  }
  localStorage.setItem('haze-cookies', accept ? 'accepted' : 'declined');
  const el = document.getElementById('cookies');
  if (el) el.classList.remove('show');
}
if (!localStorage.getItem('haze-cookies')) {
  setTimeout(() => {
    const el = document.getElementById('cookies');
    if (el) el.classList.add('show');
  }, 1800);
}

// Google Ads click id (gclid/wbraid/gbraid) -> localStorage 90 dni -> lead payload (OCI pipeline)
try {
  const _qs = new URLSearchParams(location.search);
  ['gclid','wbraid','gbraid'].forEach(k => {
    const v = _qs.get(k);
    if (v) localStorage.setItem('haze-' + k, JSON.stringify({v: v, t: Date.now()}));
  });
} catch (e) {}
function getClickId() {
  try {
    for (const k of ['gclid','wbraid','gbraid']) {
      const raw = localStorage.getItem('haze-' + k);
      if (!raw) continue;
      const rec = JSON.parse(raw);
      if (Date.now() - rec.t < 90 * 24 * 3600 * 1000) return k + '=' + rec.v;
      localStorage.removeItem('haze-' + k);
    }
  } catch (e) {}
  return '';
}

// Lead form: real endpoint + mailto fallback, form_submit fires both paths
// (form_submit = GA4 Key Event, importuje se do Google Ads - nemenit nazev)
function fireLeadEvent() {
  if (typeof gtag === 'function') {
    gtag('event','form_submit',{form_type:'main_contact',send_to:'G-5V6W6CMFGR'});
  }
}
function showFormSuccess(form) {
  // Build success node with DOM API (no innerHTML, no user-controlled content)
  const wrap = document.createElement('div');
  wrap.className = 'form-success reveal in';
  const h3 = document.createElement('h3');
  h3.textContent = 'Děkujeme. Ozveme se do 24 hodin.';
  const p = document.createElement('p');
  p.appendChild(document.createTextNode('Mezitím nám můžete zavolat na '));
  const tel = document.createElement('a');
  tel.href = 'tel:+420602488989';
  tel.style.color = 'var(--haze-dark)';
  tel.style.fontWeight = '700';
  tel.textContent = '+420 602 488 989';
  p.appendChild(tel);
  p.appendChild(document.createTextNode(' (Po-Pá 7:00-17:00).'));
  wrap.appendChild(h3);
  wrap.appendChild(p);
  form.replaceWith(wrap);
}
function mailtoFallback(f) {
  const clickId = getClickId();
  const body = [
    `Jméno: ${f.name.value}`,
    `Firma: ${f.company ? f.company.value : ''}`,
    `Telefon: ${f.phone.value}`,
    ``,
    `Zpráva:`,
    f.message.value,
    ``,
    `---`,
    clickId ? `Google Ads click: ${clickId}` : ``,
    `Odesláno z: ${location.href}`,
    `Datum: ${new Date().toISOString()}`
  ].join('\n');
  const subject = 'Poptávka HAZE';
  window.location.href = `mailto:info@haze.cz?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
const leadForm = document.getElementById('leadForm');
if (leadForm) {
  const cid = getClickId();
  if (cid) {
    const inp = document.createElement('input');
    inp.type = 'hidden';
    inp.name = 'google_ads_click';
    inp.value = cid;
    leadForm.appendChild(inp);
  }
  leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    // Honeypot: if the hidden "website" field is filled, it's a bot. Silently succeed.
    const hp = f.elements.website;
    if (hp && hp.value && hp.value.trim() !== '') {
      showFormSuccess(f);
      return;
    }
    const usingEndpoint = Boolean(FORM_ENDPOINT);
    if (usingEndpoint) {
      try {
        const res = await fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { 'Accept': 'application/json' },
          body: new FormData(f)
        });
        if (res.ok) {
          fireLeadEvent();
          showFormSuccess(f);
          return;
        }
        throw new Error('endpoint_not_ok');
      } catch (err) {
        fireLeadEvent();
        mailtoFallback(f);
        return;
      }
    }
    fireLeadEvent();
    mailtoFallback(f);
  });
}

// Mobile nav drawer (hamburger) — off-canvas panel below 1100px
const navToggle = document.getElementById('navToggle');
const navEl = document.querySelector('header .nav');
if (navToggle && navEl) {
  const isMobile = () => window.matchMedia('(max-width:1100px)').matches;
  const closeNav = () => {
    document.body.classList.remove('nav-open');
    navToggle.setAttribute('aria-expanded', 'false');
  };
  navToggle.addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open');
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  // Dropdown row (Produkty) becomes a tap-to-expand accordion inside the drawer
  navEl.querySelectorAll('.has-dropdown > a').forEach(a => {
    a.addEventListener('click', e => {
      if (isMobile()) { e.preventDefault(); a.parentElement.classList.toggle('mobile-open'); }
    });
  });
  // Tapping any real link (not the dropdown toggle) closes the drawer
  navEl.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      if (!a.parentElement.classList.contains('has-dropdown')) closeNav();
    });
  });
  // Close on overlay click, Escape, and when resizing back to desktop
  document.addEventListener('click', e => {
    if (document.body.classList.contains('nav-open') &&
        !navEl.contains(e.target) && !navToggle.contains(e.target)) closeNav();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeNav(); });
  window.addEventListener('resize', () => { if (!isMobile()) closeNav(); });
}

// Track phone + email clicks
document.querySelectorAll('a[href^="tel:"]').forEach(a => {
  a.addEventListener('click', () => {
    if (typeof gtag === 'function') gtag('event','phone_click',{send_to:'G-5V6W6CMFGR'});
  });
});
document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
  a.addEventListener('click', () => {
    if (typeof gtag === 'function') gtag('event','email_click',{send_to:'G-5V6W6CMFGR'});
  });
});

// TV / presentation mode — explicit, persisted across pages.
// Enable: add ?tv (or ?tv=1) to the URL. Disable: ?tv=0. Toggle anytime: Shift+T.
// Persists via localStorage so clicking through the whole site stays zoomed.
(function () {
  const KEY = 'haze_tv';
  const q = new URLSearchParams(location.search);
  if (q.has('tv')) localStorage.setItem(KEY, q.get('tv') === '0' ? '0' : '1');
  const apply = () => document.documentElement.classList.toggle('tv-mode', localStorage.getItem(KEY) === '1');
  apply();
  document.addEventListener('keydown', (e) => {
    if (e.shiftKey && (e.key === 'T' || e.key === 't')) {
      localStorage.setItem(KEY, localStorage.getItem(KEY) === '1' ? '0' : '1');
      apply();
    }
  });
})();

/* ---- product gallery lightbox (shared) ---- */
(function(){
  var gals=document.querySelectorAll('[data-gallery]');
  if(!gals.length)return;
  var lb=document.createElement('div');lb.className='plb';
  lb.innerHTML='<button class="plb-close" aria-label="Zavřít">×</button><button class="plb-nav plb-prev" aria-label="Předchozí">‹</button><img alt=""><button class="plb-nav plb-next" aria-label="Další">›</button><div class="plb-count"></div>';
  document.body.appendChild(lb);
  var lbImg=lb.querySelector('img'),lbCount=lb.querySelector('.plb-count'),cur=[],idx=0;
  function show(i){idx=(i+cur.length)%cur.length;lbImg.src=cur[idx];lbCount.textContent=(idx+1)+' / '+cur.length;}
  function open(list,i){cur=list;lb.classList.add('open');show(i);}
  function close(){lb.classList.remove('open');}
  lb.querySelector('.plb-close').onclick=close;
  lb.querySelector('.plb-prev').onclick=function(e){e.stopPropagation();show(idx-1);};
  lb.querySelector('.plb-next').onclick=function(e){e.stopPropagation();show(idx+1);};
  lb.addEventListener('click',function(e){if(e.target===lb)close();});
  document.addEventListener('keydown',function(e){if(!lb.classList.contains('open'))return;if(e.key==='Escape')close();if(e.key==='ArrowLeft')show(idx-1);if(e.key==='ArrowRight')show(idx+1);});
  gals.forEach(function(g){
    var main=g.querySelector('.pgal-main'),ths=[].slice.call(g.querySelectorAll('.pgal-th'));
    var list=ths.length?ths.map(function(t){return t.querySelector('img').src;}):[main.src];
    ths.forEach(function(t,i){t.onclick=function(){main.src=t.querySelector('img').src;ths.forEach(function(x){x.classList.remove('is-active');});t.classList.add('is-active');open(list,i);};});
    main.onclick=function(){var ci=list.indexOf(main.src);open(list,ci<0?0:ci);};
  });
  var sx=0;lb.addEventListener('touchstart',function(e){sx=e.touches[0].clientX;},{passive:true});
  lb.addEventListener('touchend',function(e){var dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>40)show(idx+(dx<0?1:-1));},{passive:true});
})();
