/* Hub dei manuali: legge elenco.json (gruppi e manuali) e il manuale.json di ciascuno. */
(function(){
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  var root=document.getElementById('elenco');
  fetch('elenco.json',{cache:'no-cache'}).then(function(r){return r.json();}).then(function(E){
    var slugs=[];E.gruppi.forEach(function(g){slugs=slugs.concat(g.manuali);});
    return Promise.all(slugs.map(function(s){return fetch(s+'/manuale.json',{cache:'no-cache'}).then(function(r){return r.json();}).catch(function(){return null;});}))
      .then(function(list){
        var by={};list.forEach(function(m,k){if(m)by[slugs[k]]=m;});
        root.innerHTML=E.gruppi.map(function(g){
          return (g.nome?'<h2>'+esc(g.nome)+'</h2>':'')+'<div class="cards">'+g.manuali.filter(function(s){return by[s];}).map(function(s){
            var m=by[s];var cover=m.copertina||m.slides[0].img;
            return '<a class="mcard" href="'+s+'/"><img loading="lazy" src="'+s+'/'+cover+'" alt=""><div class="b"><h3>'+esc(m.titolo)+'</h3>'+
              (m.descrizione?'<p>'+esc(m.descrizione)+'</p>':'')+'<div class="n">'+m.slides.length+' slide</div></div></a>';
          }).join('')+'</div>';
        }).join('');
      });
  }).catch(function(){root.innerHTML='<p>Impossibile caricare l\'elenco dei manuali.</p>';});
})();
