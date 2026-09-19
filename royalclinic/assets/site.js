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
  var f=document.getElementById('form');
  if(f){f.addEventListener('submit',function(e){e.preventDefault();var v=function(id){var el=document.getElementById(id);return el?(el.value||'').trim():''};var name=v('f-name');if(!name){document.getElementById('f-name').focus();return}
    var L=['Hello Royal Clinic, I would like to book a free consultation.','Name: '+name];if(v('f-phone'))L.push('WhatsApp: '+v('f-phone'));if(v('f-tx'))L.push('Treatment: '+v('f-tx'));if(v('f-date'))L.push('Preferred date: '+v('f-date'));if(v('f-msg'))L.push('Note: '+v('f-msg'));
    open('https://wa.me/995579666111?text='+encodeURIComponent(L.join('\n')),'_blank','noopener')})}
  var y=document.getElementById('yr');if(y)y.textContent=new Date().getFullYear();
})();
