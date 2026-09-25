/* Visualizzatore manuali Spedizioni Prime. Dati: manuale.json nella cartella del manuale. */
(function(){
  var ICON={prev:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
            next:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>',
            grid:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
            full:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>'};
  function esc(s){return s.replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function paras(t){
    return t.split('\n').map(function(p){
      if(!p.trim()) return '';
      var h=esc(p).replace(/(https?:\/\/[^\s<]+)/g,function(u){return u.indexOf(location.host)>=0&&location.host?'<a href="'+u+'">'+u+'</a>':'<a href="'+u+'" target="_blank" rel="noopener">'+u+'</a>';});
      return '<p>'+h+'</p>';}).join('');
  }
  var PHONE=window.matchMedia('(pointer:coarse) and (orientation:landscape) and (max-height:540px)');
  function zb(b,s){if(!PHONE.matches)return b;var o=s.img_box;var x=(b[0]-o[0])*100/o[2],y=(b[1]-o[1])*100/o[3],w=b[2]*100/o[2],h=b[3]*100/o[3];
    x=Math.max(0.5,Math.min(x,99.5-w));y=Math.max(0.5,Math.min(y,99.5-h));return [x,y,w,h];}
  function pos(el,b){el.style.left=b[0]+'%';el.style.top=b[1]+'%';el.style.width=b[2]+'%';el.style.height=b[3]+'%';}
  var D,i=0,pcount,pprev,pnext,stage,mtext,counter,bar,bPrev,bNext,grid;
  function render(){
    var s=D.slides[i];
    stage.querySelectorAll('.shot,.hl,.card,.dim').forEach(function(n){n.remove();});
    var im=document.createElement('img');im.className='shot';im.src=s.img;im.alt=s.testo.split('\n')[0];pos(im,PHONE.matches?[0,0,100,100]:s.img_box);
    stage.insertBefore(im,stage.firstChild);
    var hbs=(s.hl||[]).map(function(b){return zb(b,s);});
    if(hbs.length){ /* velo scuro con i "buchi" sulle zone evidenziate */
      var NS='http://www.w3.org/2000/svg',sv=document.createElementNS(NS,'svg');sv.setAttribute('class','dim');sv.setAttribute('viewBox','0 0 1600 900');sv.setAttribute('preserveAspectRatio','none');
      var mid='m'+Math.random().toString(36).slice(2),h='<defs><mask id="'+mid+'"><rect width="1600" height="900" fill="#fff"/>';
      var ib=PHONE.matches?[0,0,100,100]:s.img_box;pos(sv,ib);
      hbs.forEach(function(b){h+='<rect x="'+(b[0]-ib[0])/ib[2]*1600+'" y="'+(b[1]-ib[1])/ib[3]*900+'" width="'+b[2]/ib[2]*1600+'" height="'+b[3]/ib[3]*900+'" rx="10" fill="#000"/>';});
      sv.innerHTML=h+'</mask></defs><rect width="1600" height="900" mask="url(#'+mid+')"/>';
      stage.insertBefore(sv,stage.querySelector('.nav'));
    }
    hbs.forEach(function(b){var h=document.createElement('div');h.className='hl';pos(h,b);stage.insertBefore(h,stage.querySelector('.nav'));});
    if(s.card){
      var c=document.createElement('div');c.className='card'+(s.big?' big':'')+(s.step==null?' nostep':'');var cb=zb(s.card,s);pos(c,cb);c.style.height='';c.style.minHeight=cb[3]+'%';
      c.innerHTML=(s.step!=null?'<div class="head"><div class="badge">'+s.step+'</div><div class="lab">PASSO '+s.step+'</div></div>':'')+'<div class="txt">'+paras(s.testo)+'</div>';
      stage.insertBefore(c,stage.querySelector('.nav'));
      var sr=stage.getBoundingClientRect(),cr=c.getBoundingClientRect();
      if(cr.bottom>sr.bottom-2)c.style.top=Math.max(0,sr.height-cr.height-4)*100/sr.height+'%';
    }
    mtext.innerHTML=(s.step!=null?'<div class="lab">PASSO '+s.step+'</div>':'')+paras(s.testo);
    counter.textContent=pcount.textContent=(i+1)+' / '+D.slides.length;pprev.disabled=(i==0);pnext.disabled=(i==D.slides.length-1);
    bar.style.width=((i+1)*100/D.slides.length)+'%';
    bPrev.disabled=stage.querySelector('.nav.prev').disabled=(i==0);
    bNext.disabled=stage.querySelector('.nav.next').disabled=(i==D.slides.length-1);
    fit();wake();
    if(location.hash!=='#'+(i+1)) history.replaceState(null,'','#'+(i+1));
    [i-1,i+1].forEach(function(k){if(D.slides[k]){var p=new Image();p.src=D.slides[k].img;}});
    grid.querySelectorAll('a').forEach(function(a,k){a.classList.toggle('cur',k==i);});
  }
  function fit(){
    var wrap=stage.parentNode;wrap.style.width='';wrap.style.margin='';stage.style.transform='';
    if(!PHONE.matches)return;
    var s=D.slides[i],V=window.innerHeight,W=window.innerWidth,H=stage.getBoundingClientRect().height;
    if(H>V+1){
      var ys=[],sr=stage.getBoundingClientRect();
      stage.querySelectorAll('.hl,.card').forEach(function(e){var r=e.getBoundingClientRect();ys.push([r.top-sr.top,r.bottom-sr.top]);});
      var off=0;
      if(ys.length){var lo=Math.min.apply(null,ys.map(function(y){return y[0];}))-10,hi=Math.max.apply(null,ys.map(function(y){return y[1];}))+10;
        if(hi-lo>V){wrap.style.width=Math.floor(V*16/9)+'px';wrap.style.margin='0 auto';}  /* non entra: slide intera a tutta altezza */
        else{off=Math.max(0,hi-V);off=Math.min(off,Math.max(0,lo));}}
      off=Math.min(off,H-V);if(off>0)stage.style.transform='translateY('+(-off)+'px)';
    }
    placePill();
  }
  function placePill(){
    var p=document.querySelector('.pctl');if(!p)return;
    var ob=[];stage.querySelectorAll('.hl,.card').forEach(function(e){ob.push(e.getBoundingClientRect());});
    var pw=p.offsetWidth,ph=p.offsetHeight,W=window.innerWidth,V=window.innerHeight,m=8;
    var c=[['auto','auto',m,m],['auto',m,m,'auto'],[m,'auto','auto',m],[m,m,'auto','auto']]; /* top,right,bottom,left */
    function rect(k){var t=c[k][0]!=='auto'?m:V-m-ph,l=c[k][3]!=='auto'?m:W-m-pw;return {left:l,top:t,right:l+pw,bottom:t+ph};}
    function cost(R){var a=0;ob.forEach(function(o){var x=Math.max(0,Math.min(R.right,o.right)-Math.max(R.left,o.left)),y=Math.max(0,Math.min(R.bottom,o.bottom)-Math.max(R.top,o.top));a+=x*y;});return a;}
    var best=0,bc=1e12;for(var k=0;k<4;k++){var v=cost(rect(k));if(v<bc){bc=v;best=k;}if(v===0)break;}
    ['top','right','bottom','left'].forEach(function(n,j){p.style[n]=c[best][j]==='auto'?'auto':(c[best][j]+'px');});
  }
  var tdim;function wake(){var p=document.querySelector('.pctl');if(!p)return;p.classList.remove('dim');clearTimeout(tdim);tdim=setTimeout(function(){p.classList.add('dim');},2500);}
  function go(k){if(k<0||k>=D.slides.length)return;i=k;render();}
  function fromHash(){
    var h=decodeURIComponent(location.hash.slice(1));if(!h)return 0;
    var n=parseInt(h,10);if(String(n)===h&&n>=1&&n<=D.slides.length)return n-1;
    for(var k=0;k<D.slides.length;k++)if(D.slides[k].id===h)return k;return 0;
  }
  function toggleGrid(on){document.body.classList.toggle('gridmode',on);grid.classList.toggle('on',on);if(on){var c=grid.querySelector('.cur');if(c)c.scrollIntoView({block:'center'});}}
  function init(){
    document.title=D.titolo+' · Manuali Spedizioni Prime';
    document.body.innerHTML=
      '<div class="topbar"><a class="back" href="../">'+ICON.prev.replace('<svg','<svg width="18" height="18"')+'Manuali</a><h1>'+esc(D.titolo)+'</h1>'+
      '<span class="counter"></span><button class="btn" id="bgrid" title="Tutte le slide" aria-label="Tutte le slide">'+ICON.grid+'</button>'+
      '<button class="btn hidden-sm" id="bfull" title="Schermo intero" aria-label="Schermo intero">'+ICON.full+'</button></div>'+
      '<main><div class="stagewrap"><div class="stage" role="region" aria-label="Slide">'+
      '<button class="nav prev" aria-label="Slide precedente"><span>'+ICON.prev+'</span></button><button class="nav next" aria-label="Slide successiva"><span>'+ICON.next+'</span></button></div></div>'+
      '<div class="progress"><i></i></div><div class="mtext"></div>'+
      '<div class="controls"><button class="btn" id="bprev">'+ICON.prev+' Indietro</button><button class="btn primary" id="bnext">Avanti '+ICON.next+'</button></div></main>'+
      '<div class="grid"></div>'+
      '<div class="pctl"><a class="pback" href="../" aria-label="Manuali"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg></a><button class="pgrid" aria-label="Tutte le slide">'+ICON.grid+'</button>'+
      '<button class="pprev" aria-label="Indietro">'+ICON.prev+'</button><span class="pcount"></span><button class="pnext" aria-label="Avanti">'+ICON.next+'</button></div>'+
      '<div class="rotate"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></svg>'+
      '<p>Ruota il telefono in orizzontale per sfogliare il manuale</p><button class="btn" id="bland">Schermo intero orizzontale</button><a href="../">Torna ai manuali</a></div>';
    document.body.classList.add('viewer');
    pcount=document.querySelector('.pcount');pprev=document.querySelector('.pprev');pnext=document.querySelector('.pnext');
    pprev.onclick=function(){go(i-1);};pnext.onclick=function(){go(i+1);};
    document.querySelector('.pgrid').onclick=function(){toggleGrid(true);};
    var bl=document.getElementById('bland');
    if(!(document.documentElement.requestFullscreen&&screen.orientation&&screen.orientation.lock))bl.style.display='none';
    bl.onclick=function(){document.documentElement.requestFullscreen().then(function(){return screen.orientation.lock('landscape');}).catch(function(){});};
    if(PHONE.addEventListener)PHONE.addEventListener('change',function(){if(D)render();});window.addEventListener('resize',function(){if(D)fit();});document.addEventListener('touchstart',wake,{passive:true});
    stage=document.querySelector('.stage');mtext=document.querySelector('.mtext');counter=document.querySelector('.counter');
    bar=document.querySelector('.progress i');bPrev=document.getElementById('bprev');bNext=document.getElementById('bnext');grid=document.querySelector('.grid');
    grid.innerHTML=D.slides.map(function(s,k){return '<a href="#'+(k+1)+'"><img loading="lazy" src="'+s.img+'" alt=""><span>'+(k+1)+'. '+esc(s.testo.split('\n')[0])+'</span></a>';}).join('');
    grid.addEventListener('click',function(e){var a=e.target.closest('a');if(!a)return;e.preventDefault();go([].indexOf.call(grid.children,a));toggleGrid(false);});
    bPrev.onclick=stage.querySelector('.nav.prev').onclick=function(){go(i-1);};
    bNext.onclick=stage.querySelector('.nav.next').onclick=function(){go(i+1);};
    document.getElementById('bgrid').onclick=function(){toggleGrid(!grid.classList.contains('on'));};
    document.getElementById('bfull').onclick=function(){var w=document.querySelector('main');if(document.fullscreenElement)document.exitFullscreen();else if(w.requestFullscreen)w.requestFullscreen();};
    document.addEventListener('keydown',function(e){
      if(e.key==='ArrowRight'||e.key==='PageDown'||e.key===' '){e.preventDefault();go(i+1);}
      else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();go(i-1);}
      else if(e.key==='Home')go(0);else if(e.key==='End')go(D.slides.length-1);
      else if(e.key==='Escape'&&grid.classList.contains('on'))toggleGrid(false);
    });
    var x0=null;stage.addEventListener('touchstart',function(e){x0=e.touches[0].clientX;},{passive:true});
    stage.addEventListener('touchend',function(e){if(x0==null)return;var dx=e.changedTouches[0].clientX-x0;if(Math.abs(dx)>40)go(i+(dx<0?1:-1));x0=null;});
    window.addEventListener('hashchange',function(){var k=fromHash();if(k!==i)go(k);});
    i=fromHash();render();
  }
  fetch('manuale.json',{cache:'no-cache'}).then(function(r){return r.json();}).then(function(d){D=d;init();})
   .catch(function(){document.body.innerHTML='<p style="padding:24px">Impossibile caricare il manuale. <a href="../">Torna ai manuali</a></p>';});
})();
