(function(){
  var top=document.getElementById('top');
  function onScroll(){top.classList.toggle('on',scrollY>40)}
  addEventListener('scroll',onScroll,{passive:true});onScroll();
  var burger=document.getElementById('burger'),mnav=document.getElementById('mnav');
  if(burger){burger.addEventListener('click',function(){var o=!mnav.classList.contains('open');burger.classList.toggle('open',o);mnav.classList.toggle('open',o);document.body.classList.toggle('menu-open',o);burger.setAttribute('aria-expanded',o)});
    mnav.querySelectorAll('a').forEach(function(a){a.addEventListener('click',function(){burger.classList.remove('open');mnav.classList.remove('open');document.body.classList.remove('menu-open')})})}
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{rootMargin:'0px 0px -8% 0px',threshold:.08});
  document.querySelectorAll('.rv').forEach(function(el){io.observe(el)});
  var hm=document.querySelector('.hero .hero-media img');
  if(hm&&!matchMedia('(prefers-reduced-motion:reduce)').matches){addEventListener('scroll',function(){var y=scrollY;if(y<innerHeight)hm.style.translate='0 '+(y*.18)+'px'},{passive:true})}
  document.querySelectorAll('.num').forEach(function(n){var t=+n.dataset.n,d=+(n.dataset.dur||1200);var o=new IntersectionObserver(function(es){if(!es[0].isIntersecting)return;o.disconnect();var s=performance.now();(function f(now){var p=Math.min(1,(now-s)/d);n.textContent=Math.round(t*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(f)})(s)});o.observe(n)});
  document.querySelectorAll('[data-car]').forEach(function(w){var c=w.querySelector('.car');w.querySelectorAll('[data-dir]').forEach(function(b){b.addEventListener('click',function(){c.scrollBy({left:(+b.dataset.dir)*(c.clientWidth*.8),behavior:'smooth'})})})});
  var FORM_ENDPOINT='';/* production: URL of the clinic's form handler (PHP mail, Formspree, ...). Empty = demo mode: shows the success state without sending. */
  var f=document.getElementById('form');
  if(f){var q=new URLSearchParams(location.search);var tx=document.getElementById('f-tx');if(q.get('treatment')&&tx){tx.value=q.get('treatment')}var msg=document.getElementById('f-msg');if(q.get('course')&&msg&&!msg.value){msg.value='Course: '+q.get('course').replace(/-/g,' ')}
    f.addEventListener('submit',function(e){e.preventDefault();var v=function(id){var el=document.getElementById(id);return el?(el.value||'').trim():''};var name=v('f-name'),email=v('f-email');
      if(!name||!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){f.classList.add('bad');document.getElementById(!name?'f-name':'f-email').focus();return}
      f.classList.remove('bad');var btn=f.querySelector('button[type=submit]');btn.disabled=true;
      function done(){f.classList.add('sent');f.querySelector('.ok').scrollIntoView({block:'center',behavior:'smooth'})}
      if(FORM_ENDPOINT){fetch(FORM_ENDPOINT,{method:'POST',body:new FormData(f),headers:{'Accept':'application/json'}}).then(function(r){if(!r.ok)throw 0;done()}).catch(function(){btn.disabled=false;alert('Sending failed. Please call us on +995 579 666 111.')})}else{setTimeout(done,500)}})}
  function split(h){var i=0;(function walk(node){[].slice.call(node.childNodes).forEach(function(n){if(n.nodeType===3){var frag=document.createDocumentFragment();n.textContent.split(/(\s+)/).forEach(function(w){if(!w)return;if(/^\s+$/.test(w)){frag.appendChild(document.createTextNode(' '));return}var sp=document.createElement('span');sp.className='w';sp.style.setProperty('--i',i++);sp.textContent=w;frag.appendChild(sp)});node.replaceChild(frag,n)}else if(n.nodeType===1&&n.tagName!=='BR'){walk(n)}})})(h);h.classList.add('ws')}
  if(!matchMedia('(prefers-reduced-motion:reduce)').matches){document.querySelectorAll('h2.rv').forEach(split)}
  var ph=document.querySelector('.phero .hero-media img');
  if(ph&&!matchMedia('(prefers-reduced-motion:reduce)').matches){addEventListener('scroll',function(){var y=scrollY;if(y<innerHeight)ph.style.translate='0 '+(y*.25)+'px'},{passive:true})}
  var y=document.getElementById('yr');if(y)y.textContent=new Date().getFullYear();
})();
