/*
 * Demo tutorial guidata "Primi passi" (sovrapposta alla sandbox).
 * Si attiva da tutorial.html (imposta lo stato e apre la dashboard). Stato in localStorage 'spedisci_tutorial'.
 * Ogni passo: pagina (route), elemento da evidenziare, testo, condizione per andare avanti.
 * Nessuna funzione del portale viene aggiunta o modificata: il livello guida solo l'utente.
 */
(function () {
    var KEY = 'spedisci_tutorial';
    var BASE = (function () {
        var s = document.currentScript && document.currentScript.src;
        return s ? s.replace(/tutorial\.js(\?.*)?$/, '') : '';
    })();
    function abs(u) { try { return new URL(u, document.baseURI).href; } catch (e) { return u; } }
    var BASEABS = abs(BASE);
    var route = abs(location.href).split('?')[0].split('#')[0];
    route = route.indexOf(BASEABS) === 0 ? route.slice(BASEABS.length) : route;
    route = route.replace(/index\.html$/, '').replace(/\/$/, '');

    function load() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
    function save(st) { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
    var st = load();
    if (!st || !st.active) return;

    var MANUALE = 'https://docs.spedisci.online';
    var $ = window.jQuery;

    // ---- definizione dei passi (in ordine) ----
    var STEPS = [
        { page: '', center: true, title: 'Benvenuto nella demo guidata', text: 'In pochi minuti creerai la tua prima spedizione, la stamperai, la seguirai con il tracking e chiuderai la giornata con la distinta. Tutto quello che vedi funziona con dati dimostrativi: puoi cliccare senza timore.', next: 'Iniziamo' },
        { page: '', sel: '.pipeline-step', all: true, text: 'Questa è la Dashboard: riassume le spedizioni in attesa, in lavorazione, spedite, in transito e bloccate. Più in basso trovi flusso di cassa e contrassegni.' },
        { page: '', sel: 'a[href$="shippings/create/index.html"]', menu: 'shippings/create/index.html', text: 'Per creare una spedizione clicca su "Nuova Spedizione" nel menu Spedizioni.', advance: 'navigate' },
        { page: 'shippings/create', sel: '#autocomplete-shipfrom, #shipfrom-phone', all: true, text: 'In "Dati mittente" ci sono i tuoi dati, cioè il punto di ritiro dove passerà il corriere. Per una spedizione normale non li tocchi.' },
        { page: 'shippings/create', sel: 'label[for=pickup_from_address], #pickup_time', all: true, text: 'Spunta "Richiedi ritiro" se vuoi che il corriere passi a ritirare, e imposta data e fascia oraria (indicativa). Nota: disponibile per i contratti Poste Italiane.' },
        { page: 'shippings/create', sel: '#autocomplete-client', text: 'Ora il destinatario. Scrivi nel campo "Nominativo" il nome sul citofono, oppure "C/O NomeAttività" se consegni a un negozio.', when: function () { return $('#autocomplete-client').val().trim().length > 1; } },
        { page: 'shippings/create', sel: '#autocomplete-city', text: 'Digita la città (es. NAPOLI) e scegli il suggerimento: CAP e Provincia si compilano da soli.', when: function () { return $('#cap').val().trim().length >= 5; } },
        { page: 'shippings/create', sel: '#autocomplete-street', text: 'Nel campo "Indirizzo" solo via e numero civico. Scala, interno, ecc. vanno in "Note".', when: function () { return $('#autocomplete-street').val().trim().length > 2; } },
        { page: 'shippings/create', sel: '#email_dest, #tel_dest', all: true, text: 'Una sola email e un solo telefono: servono per le notifiche del corriere.', when: function () { return $('#email_dest').val().trim().length > 3 && $('#tel_dest').val().trim().length > 5; } },
        { page: 'shippings/create', sel: '#totale_colli, #insurance_value, input[name="h[]"]', all: true, text: 'In "Dati spedizione" indica colli, peso e le misure in cm di ogni collo. Dati precisi = preventivo preciso.', when: function () { return parseFloat($('#weight').val()) > 0 && $('input[name="lu[]"]').first().val() && $('input[name="h[]"]').first().val(); } },
        { page: 'shippings/create', sel: '#show-corriers', text: 'Clicca su "Seleziona Corriere" per vedere il preventivo dei corrieri disponibili.', advance: 'click' },
        { page: 'shippings/create', sel: '#vector_contracts', text: 'Ecco i corrieri con il prezzo (qui censurato). Scegli il contratto che preferisci; sotto puoi aggiungere i servizi accessori.', wait: function () { return $('#vector_contracts input[type=radio]').length > 0; } },
        { page: 'shippings/create', sel: 'button[type=submit]:has(i.fa-check), button[type=submit]', text: 'Clicca su "Crea Spedizione": la lettera di vettura viene creata e vai all\'elenco.', advance: 'navigate' },
        { page: 'shippings', sel: '#shippings-table', text: 'Questo è l\'Elenco Spedizioni. La colonna "Stato" mostra l\'avanzamento: una spedizione appena creata è "In Lavorazione" finché non crei la distinta.' },
        { page: 'shippings', sel: '#shippings-table tbody tr:first-child a.track', text: 'Clicca sul numero di spedizione in blu per aprire il tracking.', advance: 'click' },
        { page: 'shippings', sel: '.modal.in .modal-content', text: 'Qui vedi destinatario e cronologia degli eventi. Chiudi la finestra per continuare.', wait: function () { return $('.modal.in').length > 0; }, when: function () { return $('.modal.in').length === 0; }, hint: 'Chiudi la finestra del tracking: il pulsante Avanti si attiva da solo.' },
        { page: 'shippings', sel: '#shippings-table thead th:nth-child(2), .print_multiple', all: true, text: 'Per stampare le etichette: l\'icona della stampante sulla riga, oppure seleziona più spedizioni e clicca "Stampa PDF".' },
        { page: 'shippings', sel: 'a[href$="shippinglists/create/index.html"]', menu: 'shippinglists/create/index.html', text: 'A fine giornata i dati vanno trasmessi al corriere: clicca su "Crea Distinta".', advance: 'navigate' },
        { page: 'shippinglists/create', sel: '#contract_id, [data-original-title="Seleziona tutto"]', all: true, text: 'Scegli il contratto, poi clicca sul quadratino "Seleziona tutto" per includere tutte le spedizioni in attesa.', when: function () { return $('#shippings-table tbody input[type=checkbox]:checked').length > 0; } },
        { page: 'shippinglists/create', sel: 'input[type=submit][value="Crea Distinta"]', text: 'Clicca su "Crea Distinta". Ripeti per ogni contratto con spedizioni in attesa.', advance: 'navigate' },
        { page: 'shippinglists', sel: '#bordero-table', text: 'In "Lista Distinte" trovi le distinte create: puoi stamparle o esportarle in Excel.' },
        { page: 'shippinglists', sel: 'a[href$="pickups/index.html"]', menu: 'pickups/index.html', text: 'Ultimo controllo: verifica il ritiro del corriere in Ritiri → "Elenco Ritiri".', advance: 'navigate' },
        { page: 'pickups', sel: '#shippings-table', text: 'Qui vedi codice del ritiro, data di inserimento e data prevista.' },
        { page: 'pickups', center: true, title: 'Complimenti, hai completato i primi passi!', text: 'Ora puoi esplorare liberamente tutte le sezioni della demo: negozi online, contrassegni, report, giacenze. Per ogni dettaglio c\'è il manuale.', final: true }
    ];

    var idx = Math.min(st.step || 0, STEPS.length - 1);

    // ---- stile ----
    var css = '\
#tut-mask{position:fixed;left:0;top:0;width:100%;height:100%;background:rgba(15,25,35,.55);z-index:2147483000;pointer-events:none}\
#tut-hl{position:absolute;border:3px solid #FFEB3B;border-radius:8px;box-shadow:0 0 0 9999px rgba(15,25,35,.55);z-index:2147483001;pointer-events:none;transition:all .25s}\
#tut-card{position:absolute;z-index:2147483002;width:380px;background:#fff;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.35);font:14px/1.45 Arial,Helvetica,sans-serif;color:#333;overflow:hidden}\
#tut-card .bar{height:6px;background:#e3e8ec}#tut-card .bar i{display:block;height:100%;background:#3c8dbc;transition:width .3s}\
#tut-card .body{padding:16px 18px 14px 18px;border-left:6px solid #3c8dbc}\
#tut-card .step{color:#3c8dbc;font-weight:bold;font-size:11px;letter-spacing:.5px;margin-bottom:6px}\
#tut-card h4{margin:0 0 8px 0;font-size:17px;color:#222}\
#tut-card .btns{display:flex;gap:8px;justify-content:flex-end;align-items:center;margin-top:14px}\
#tut-card button{border:0;border-radius:6px;padding:8px 14px;font:bold 13px Arial;cursor:pointer}\
#tut-card .next{background:#3c8dbc;color:#fff}#tut-card .next[disabled]{background:#b9cdd9;cursor:default}\
#tut-card .prev{background:#eef2f5;color:#333}#tut-card .exit{background:none;color:#888;margin-right:auto;padding-left:0;font-weight:normal}\
#tut-card .hint{font-size:12px;color:#777;margin-top:8px}\
#tut-card.center{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:520px}\
#tut-card.center .body{padding:26px 28px}\
#tut-card a{color:#3c8dbc}\
body.tut-on .sidebar-menu > li:not(.tut-ok){opacity:.35;pointer-events:none}\
body.tut-on .sidebar-menu > li.tut-ok .treeview-menu > li:not(.tut-ok){opacity:.35;pointer-events:none}\
';
    var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

    var mask, hl, card, poller;
    function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstChild; }

    function allowedMenu() {
        // nel tutorial restano attive solo le voci del percorso "primi passi"
        var hrefs = ['shippings/create/index.html', 'shippings/index.html', 'shippinglists/create/index.html', 'shippinglists/index.html', 'pickups/index.html', 'index.html'];
        $('.sidebar-menu > li').each(function () {
            var li = $(this), ok = false;
            li.find('a').each(function () { var h = $(this).attr('href') || ''; hrefs.forEach(function (x) { if (h.slice(-x.length) === x && !/pickups\/create|shippings\/contrassegni|cancelled|stocks/.test(h)) ok = true; }); });
            if (li.is(':first-child') || /Dashboard/.test(li.text())) ok = true;
            li.toggleClass('tut-ok', ok);
            li.find('.treeview-menu > li').each(function () {
                var h = $(this).find('a').attr('href') || '', ok2 = false;
                hrefs.forEach(function (x) { if (h.slice(-x.length) === x && !/pickups\/create|shippings\/contrassegni|cancelled|stocks/.test(h)) ok2 = true; });
                $(this).toggleClass('tut-ok', ok2);
            });
        });
        document.body.classList.add('tut-on');
    }

    function target(step) {
        if (!step.sel) return null;
        var els = $(step.sel).filter(':visible');
        if (!els.length) return null;
        if (!step.all) return els.first()[0].getBoundingClientRect();
        var r = null;
        els.each(function () {
            var b = this.getBoundingClientRect();
            if (!r) r = { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
            else { r.left = Math.min(r.left, b.left); r.top = Math.min(r.top, b.top); r.right = Math.max(r.right, b.right); r.bottom = Math.max(r.bottom, b.bottom); }
        });
        return r;
    }

    function place(step) {
        var r = target(step);
        var sx = window.pageXOffset, sy = window.pageYOffset;
        if (!r || step.center) {
            hl.style.display = 'none'; mask.style.display = 'block';
            card.className = 'center';
            card.style.left = card.style.top = '';
            return;
        }
        mask.style.display = 'none'; hl.style.display = 'block';
        var pad = 6;
        hl.style.left = (r.left + sx - pad) + 'px'; hl.style.top = (r.top + sy - pad) + 'px';
        hl.style.width = (r.right - r.left + 2 * pad) + 'px'; hl.style.height = (r.bottom - r.top + 2 * pad) + 'px';
        card.className = '';
        var cw = 380, ch = card.offsetHeight || 180, vw = window.innerWidth, vh = window.innerHeight;
        var left, top;
        if (r.right + 20 + cw < vw) { left = r.right + 20; top = r.top; }
        else if (r.left - 20 - cw > 0) { left = r.left - 20 - cw; top = r.top; }
        else { left = Math.max(10, Math.min(r.left, vw - cw - 10)); top = r.bottom + 16; }
        if (top + ch > vh - 10) top = Math.max(10, vh - ch - 10);
        if (top < 10) top = 10;
        card.style.left = (left + sx) + 'px'; card.style.top = (top + sy) + 'px';
    }

    function scrollTo(step) {
        var r = target(step); if (!r) return;
        var y = r.top + window.pageYOffset - Math.max(40, (window.innerHeight - (r.bottom - r.top)) / 2);
        window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }

    function go(n) {
        idx = Math.max(0, Math.min(n, STEPS.length - 1));
        st.step = idx; save(st);
        render();
    }
    function exitTutorial() {
        st.active = false; save(st);
        location.href = BASE + 'index.html';
    }

    function render() {
        var step = STEPS[idx];
        if (step.page !== route) {
            // il visitatore è su un'altra pagina: card centrale con il link alla pagina giusta
            var url = BASE + (step.page ? step.page + '/index.html' : 'index.html');
            mask.style.display = 'block'; hl.style.display = 'none'; card.className = 'center';
            card.innerHTML = '<div class="bar"><i style="width:' + Math.round(100 * idx / (STEPS.length - 1)) + '%"></i></div><div class="body"><div class="step">PASSO ' + (idx + 1) + ' DI ' + STEPS.length + '</div><h4>Torniamo al percorso</h4><p>Il passo successivo si svolge in un\'altra pagina.</p><div class="btns"><button class="exit">Esci dal tutorial</button><button class="prev">Indietro</button><button class="next">Vai alla pagina</button></div></div>';
            card.querySelector('.next').onclick = function () { location.href = url; };
            card.querySelector('.prev').onclick = function () { go(idx - 1); };
            card.querySelector('.exit').onclick = exitTutorial;
            return;
        }
        if (step.menu) $('ul.treeview-menu').has('a[href$="' + step.menu + '"]').show().parent().addClass('active menu-open');
        var manual = step.final ? '<button class="prev">Indietro</button><a class="btn-link" href="' + MANUALE + '" target="_blank" rel="noopener">Manuale</a>' : '';
        card.innerHTML = '<div class="bar"><i style="width:' + Math.round(100 * idx / (STEPS.length - 1)) + '%"></i></div><div class="body">'
            + '<div class="step">PASSO ' + (idx + 1) + ' DI ' + STEPS.length + '</div>'
            + (step.title ? '<h4>' + step.title + '</h4>' : '')
            + '<div>' + step.text + '</div>'
            + (step.hint ? '<div class="hint">' + step.hint + '</div>' : (step.advance === 'click' || step.advance === 'navigate' ? '<div class="hint">Clicca sull\'elemento evidenziato per continuare.</div>' : (step.when ? '<div class="hint">Compila il campo evidenziato: il pulsante Avanti si attiva da solo.</div>' : '')))
            + '<div class="btns">' + (step.final ? '' : '<button class="exit">Esci dal tutorial</button>')
            + (idx > 0 && !step.final ? '<button class="prev">Indietro</button>' : '')
            + (step.final ? '<button class="prev">Indietro</button><button class="next">Esplora la demo</button>' : '<button class="next">' + (step.next || 'Avanti') + '</button>')
            + '</div>' + (step.final ? '<div class="hint">Manuale completo: <a href="' + MANUALE + '" target="_blank" rel="noopener">docs.spedisci.online</a></div>' : '') + '</div>';
        var next = card.querySelector('.next'), prev = card.querySelector('.prev'), exit = card.querySelector('.exit');
        if (prev) prev.onclick = function () { go(idx - 1); };
        if (exit) exit.onclick = exitTutorial;
        if (step.final) next.onclick = exitTutorial;
        else if (step.advance === 'click' || step.advance === 'navigate') {
            next.style.display = 'none';
            var $t = $(step.sel).filter(':visible').first();
            $t.one('click.tut', function () { st.step = idx + 1; save(st); if (step.advance === 'click') setTimeout(function () { go(idx + 1); }, 300); });
        } else {
            next.onclick = function () { go(idx + 1); };
            if (step.when) next.disabled = !step.when();
        }
        clearInterval(poller);
        var seen = !step.wait || step.wait();
        poller = setInterval(function () {
            if (!seen) { if (step.wait()) seen = true; else { card.style.visibility = 'hidden'; hl.style.display = 'none'; return; } }
            card.style.visibility = 'visible';
            if (step.when && next) next.disabled = !step.when();
            place(step);
        }, 250);
        if (!seen) { card.style.visibility = 'hidden'; }
        setTimeout(function () { scrollTo(step); place(step); }, 60);
    }

    $(function () {
        mask = el('<div id="tut-mask"></div>'); hl = el('<div id="tut-hl"></div>'); card = el('<div id="tut-card"></div>');
        document.body.appendChild(mask); document.body.appendChild(hl); document.body.appendChild(card);
        allowedMenu();
        window.addEventListener('resize', function () { place(STEPS[idx]); });
        render();
    });
})();
