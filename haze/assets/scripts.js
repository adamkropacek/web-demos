/* ============================================================
   HAZE site — shared JS (multi-page)
   Hosting-agnostic: no framework, no build step, pure vanilla.
   ============================================================ */

// Endpoint for lead form. Replace REPLACE_ME with a real Formspree (or compatible) form ID before deploy.
const FORM_ENDPOINT = 'https://formspree.io/f/REPLACE_ME';

// Mark page loaded immediately
document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('loaded');
});
if (document.readyState !== 'loading') document.body.classList.add('loaded');

// Header scroll state
const hdr = document.getElementById('hdr');
if (hdr) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) hdr.classList.add('scrolled');
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

// Lead form: real endpoint + mailto fallback, generate_lead fires both paths
function fireLeadEvent() {
  if (typeof gtag === 'function') {
    gtag('event','generate_lead',{form_type:'main_contact',send_to:'G-5V6W6CMFGR'});
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
  const body = [
    `Jméno a firma: ${f.name.value}`,
    `Telefon: ${f.phone.value}`,
    ``,
    `Zpráva:`,
    f.message.value,
    ``,
    `---`,
    `Odesláno z: ${location.href}`,
    `Datum: ${new Date().toISOString()}`
  ].join('\n');
  const subject = 'Poptávka HAZE';
  window.location.href = `mailto:info@haze.cz?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
const leadForm = document.getElementById('leadForm');
if (leadForm) {
  leadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const usingEndpoint = FORM_ENDPOINT && !FORM_ENDPOINT.includes('REPLACE_ME');
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
