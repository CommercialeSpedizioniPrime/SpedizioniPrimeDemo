/*
 * Sandbox Spedisci Online — strato "risposte placeholder".
 * Le pagine sono l'HTML/JS originale del sito. Questo file intercetta le chiamate ajax/fetch
 * che sul sito vero vanno al server e risponde SOLO con dati presenti nella repo
 * (recorded/data.js generato da build_clone.py, cartella sandbox/). Nessuna richiesta esce dalla sandbox.
 *
 *  - qualsiasi URL presente in window.__SANDBOX_DATA (tabelle, tracking, api, lingue) -> dato incorporato
 *  - /cities?query=..                 -> capoluoghi con CAP generico (filtro per prefisso)
 *  - /shippings/taric?query=..        -> elenco TARIC (filtro "contiene")
 *  - /shippings/searches, /shippings/history/shipfrom -> []
 *  - POST /api/rates                  -> sandbox/rates/rates.json (Spedizioni Prime, PosteDelivery, GLS, prezzi XX.XX)
 *  - POST /shippings/preview_cost     -> sandbox/rates/preview_cost.json (prezzi XX.XX)
 *  - /api/courier/contrassegnotype/N  -> sandbox/rates/contrassegnotype_N.json
 *  - POST .../ajax_multipdf           -> ok (la pagina apre poi shippings/download_temp = etichette placeholder)
 *  - form Report Spedizioni           -> sandbox/reports/shippings.csv | .xlsx
 *  - form Nuova Spedizione            -> la spedizione compare in Elenco Spedizioni (stato nel browser); con "Andata & Ritorno" anche l'etichetta di reso
 *  - finestra "Genera etichetta di reso" (spedizioni Poste) -> LDV di ritorno + "Stampa etichetta di reso" sulla riga (stato nel browser)
 */
(function ($) {
    if (!$ || !$.ajaxTransport) return;
    var BASE = (function () {
        var s = document.currentScript && document.currentScript.src;
        return s ? s.replace(/sandbox\.js(\?.*)?$/, '') : '';
    })();
    var D = window.__SANDBOX_DATA || {};
    function abs(u) { try { return new URL(u, document.baseURI).href; } catch (e) { return u; } }
    var BASEABS = abs(BASE);
    function key(url) {
        var a = abs(url).split('?')[0].split('#')[0].replace(/\/index\.html\//g, '/');
        return a.indexOf(BASEABS) === 0 ? a.slice(BASEABS.length) : null;
    }
    var cache = {};
    function load(k) {
        if (D[k] !== undefined) return $.Deferred().resolve(D[k]);
        if (!cache[k]) cache[k] = $.ajax({ url: BASE + k, dataType: 'json', cache: true });
        return cache[k];
    }
    function parseQS(qs) {
        var o = {};
        (qs || '').split('&').forEach(function (kv) {
            if (!kv) return;
            var i = kv.indexOf('=');
            var k = decodeURIComponent((i < 0 ? kv : kv.slice(0, i)).replace(/\+/g, ' '));
            var v = decodeURIComponent((i < 0 ? '' : kv.slice(i + 1)).replace(/\+/g, ' '));
            o[k] = v;
        });
        return o;
    }
    function reqParams(options) {
        var p = parseQS(options.url.split('?')[1] || '');
        if (typeof options.data === 'string') $.extend(p, parseQS(options.data));
        else if (options.data && typeof options.data === 'object') $.extend(p, options.data);
        return p;
    }
    function fixLogo(r) {
        r = $.extend({}, r);
        if (r.logo_url && !/^https?:|^\.\.?\//.test(r.logo_url) && r.logo_url.indexOf(BASE) !== 0) r.logo_url = BASE + r.logo_url;
        return r;
    }
    function respond(options) {
        var url = options.url.split('?')[0];
        var k = key(url);
        if (k !== null && D[k] !== undefined) return $.Deferred().resolve(D[k]);
        var p = reqParams(options);
        var q = (p.query || '').toString();

        if (/\/cities(\/index\.html)?$/.test(url)) {
            if (p.country_id && p.country_id !== 'IT') return $.Deferred().resolve([]);
            var qq = q.toUpperCase();
            return load('recorded/cities.json').then(function (all) {
                return all.filter(function (c) { return c.value.indexOf(qq) === 0; });
            });
        }
        if (/\/shippings\/taric(\/index\.html)?$/.test(url)) {
            var ql = q.toLowerCase();
            return load('recorded/taric.json').then(function (all) {
                return all.filter(function (t) { return t.value.toLowerCase().indexOf(ql) >= 0; });
            });
        }
        if (/\/shippings\/(searches|history\/shipfrom)(\/index\.html)?$/.test(url)) {
            return $.Deferred().resolve([]);
        }
        var m = url.match(/\/api\/courier\/contrassegnotype\/(\d+)/);
        if (m) return load('sandbox/rates/contrassegnotype_' + m[1] + '.json');

        if (/\/api\/rates$/.test(url)) {
            return load('sandbox/rates/rates.json').then(function (arr) {
                return arr.map(function (r) {
                    r = fixLogo(r);
                    if (p.weight) r.real_weight = String(p.weight);
                    return r;
                });
            });
        }
        if (/\/shippings\/preview_cost$/.test(url)) {
            return load('sandbox/rates/preview_cost.json').then(function (r) {
                // i prezzi "XX.XX" non superano i controlli "> 0" della pagina: le righe dei costi vengono mostrate comunque
                setTimeout(function () { $('.zone_name_row, .weight_price_row, .total_price_row').show(); }, 50);
                return fixLogo(r);
            });
        }
        if (/\/clientstores\/\d+\/options(\/index\.html)?$/.test(url)) {
            return $.Deferred().resolve({ ok: true });
        }
        if (/\/(shippings|invoices)\/ajax_multipdf(\/index\.html)?$/.test(url)) {
            return $.Deferred().resolve({ ok: true });
        }
        if (/\/shippinglists\/session(\/index\.html)?$/.test(url)) {
            return $.Deferred().resolve({ draw: 1, recordsTotal: 0, recordsFiltered: 0, data: [] });
        }
        // Qualsiasi altra POST verso la sandbox: l'hosting statico risponderebbe 405.
        if ((options.type || 'GET').toUpperCase() === 'POST' && (!/^https?:\/\//.test(url) || url.indexOf(location.origin) === 0)) {
            return $.Deferred().resolve({ ok: true });
        }
        return null;
    }

    $.ajaxTransport('+*', function (options, originalOptions, jqXHR) {
        var promise = respond(options);
        if (!promise) return; // endpoint non gestito: trasporto normale
        return {
            send: function (headers, complete) {
                promise.then(function (data) {
                    complete(200, 'success', { text: JSON.stringify(data) }, 'Content-Type: text/plain');
                }, function () {
                    complete(404, 'error', { text: '' });
                });
            },
            abort: function () {}
        };
    });

    // fetch() nativo (usato dalla dashboard per le statistiche)
    if (window.fetch) {
        var nativeFetch = window.fetch.bind(window);
        window.fetch = function (input, init) {
            var u = typeof input === 'string' ? input : (input && input.url);
            var k = u ? key(u) : null;
            if (k !== null && D[k] !== undefined) {
                return Promise.resolve(new Response(JSON.stringify(D[k]), { status: 200, headers: { 'Content-Type': 'application/json' } }));
            }
            return nativeFetch(input, init);
        };
    }

    // ===================== Negozi Online: percorso guidato (stato nel browser del visitatore) =====================
    var PLATFORM_LOGOS = { ebay: 'ebay-logo.jpg', prestashop: 'prestashop-logo.jpg', amazon: 'amazon.jpg', magento: 'magento-logo.jpg', magento2: 'magento2-logo.jpg',
        woocommerce: 'woocommerce-logo.jpg', shopify: 'shopify-logo.jpg', manomano: 'manomano-logo.jpg', maxpho: 'maxpho-logo.jpg', squarespace: 'squarespace-logo.jpg',
        poleepo: 'poleepo-logo.jpg', storeden: 'storeden-logo.jpg', leroymerlin: 'leroymerlin-logo.jpg', wix: 'wix-logo.jpg', bigcommerce: 'bigcommerce-logo.jpg',
        bricobravo: 'bricobravo-logo.jpg', tiktok: 'tiktok-logo.jpg', temu: 'temu-logo.jpg', ecwid: 'ecwid-logo.jpg' };
    var PLATFORM_LABELS = { ebay: 'Ebay', prestashop: 'Prestashop', amazon: 'Amazon', magento: 'Magento 1.x', magento2: 'Magento 2.x', woocommerce: 'Woocommerce', shopify: 'Shopify',
        manomano: 'ManoMano', maxpho: 'Maxpho', squarespace: 'Squarespace', poleepo: 'Poleepo', storeden: 'Storeden', leroymerlin: 'Leroy Merlin', wix: 'Wix eCommerce',
        bigcommerce: 'BigCommerce', bricobravo: 'BricoBravo', tiktok: 'TikTok', temu: 'Temu', ecwid: 'Ecwid' };
    var OAUTH_PLATFORMS = ['shopify', 'amazon', 'ebay', 'tiktok', 'squarespace', 'wix', 'temu', 'bricobravo'];
    var ORDER_PAGES = ['shopify', 'woocommerce', 'prestashop', 'amazon', 'ebay', 'tiktok'];
    var KEY = 'spedisci_sandbox_v1';
    function loadState() { try { return JSON.parse(localStorage.getItem(KEY)) || { stores: [], shipped: {}, nextId: 310 }; } catch (e) { return { stores: [], shipped: {}, nextId: 310 }; } }
    function saveState(st) { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
    function esc(t) { return $('<div>').text(t == null ? '' : t).html(); }
    function alertBox(kind, html) { return '<div class="alert alert-' + kind + ' alert-dismissible"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>' + html + '</div>'; }
    function storeRow(s) {
        var logo = PLATFORM_LOGOS[s.platform];
        var orders = ORDER_PAGES.indexOf(s.platform) >= 0 ? ('<a href="' + BASE + 'orders/' + s.platform + '/index.html">' + (D['data/orders/' + s.platform + '/orders-table.json'] || { data: [] }).data.length + '</a>') : '0';
        return '<tr data-store-id="' + s.id + '"><td>' + s.id + '</td><td>' + (logo ? '<img src="' + BASE + 'dist/img/sources/' + logo + '" style="height:28px;margin-right:6px;vertical-align:middle;">' : '') + esc(PLATFORM_LABELS[s.platform] || s.platform) +
            '</td><td>' + esc(s.name) + '</td><td>' + esc(s.acct) + '</td><td>' + orders + '</td>' +
            '<td class="text-center"><button type="button" class="btn btn-default btn-sm" data-toggle="modal" data-target="#storeSettingsModal" data-store-id="' + s.id + '" data-store-name="' + esc(s.name) + '" data-options=\'{}\' title="Impostazioni"><i class="fa fa-cog"></i></button> ' +
            '<form method="POST" action="#" style="display:inline"><button type="submit" name="remove_store" class="btn btn-danger btn-sm" title="Scollega"><i class="fa fa-trash"></i></button></form></td></tr>';
    }
    // Sidebar: una voce "Ordini <Piattaforma>" per ogni negozio collegato (come sul portale reale)
    function renderSidebar(st) {
        var $csv = $('.sidebar-menu a').filter(function () { return /Ordini da File CSV/i.test($(this).text()); }).first().closest('li');
        if (!$csv.length) return;
        $('.sidebar-menu li.sandbox-store').remove();
        var seen = {};
        st.stores.forEach(function (s) {
            if (ORDER_PAGES.indexOf(s.platform) < 0 || seen[s.platform]) return; seen[s.platform] = 1;
            var active = location.pathname.indexOf('/orders/' + s.platform + '/') >= 0;
            $csv.before('<li class="sandbox-store' + (active ? ' active' : '') + '"><a href="' + BASE + 'orders/' + s.platform + '/index.html">Ordini ' + esc(PLATFORM_LABELS[s.platform]) + '</a></li>');
        });
        if (st.stores.length && ORDER_PAGES.some(function (p) { return seen[p]; }) && location.pathname.indexOf('/orders/') >= 0) {
            $csv.closest('ul.treeview-menu').show().closest('li.treeview').addClass('active');
        }
    }
    // Spedizioni create dagli ordini: aggiunte alle liste Elenco Spedizioni / Crea Distinta
    function shipmentsFromOrders(st) {
        var tplJ = D['data/shippings/shippings-table.json']; if (!tplJ || !tplJ.data.length) return [];
        var out = [];
        Object.keys(st.shipped).forEach(function (platform) {
            var orders = (D['data/orders/' + platform + '/orders-table.json'] || { data: [] }).data;
            st.shipped[platform].forEach(function (rec) {
                var o = orders.filter(function (x) { return x.id == rec.orderId; })[0]; if (!o) return;
                var r = $.extend({}, tplJ.data[0]);
                var name = $('<div>').html(o.nominativo).find('b').text() || 'DESTINATARIO';
                var addr = $('<div>').html(o.nominativo).text().split('\n');
                r.id = 90001000 + rec.n; r.increment_id = rec.n;
                r.ldv = "<a href='#' class='track' data-id='" + rec.ldv + "' >" + rec.ldv + "</a>";
                r.nominativo = esc(name) + '<br /><small>' + esc(($('<div>').html(o.nominativo).html().split('<br>')[2] || '')) + '</small>';
                r.order_number = o.order_id_raw; r.original_order_id = o.order_id_raw;
                r.created_at = rec.date; r.status = '<span class="label label-default" data-toggle="tooltip" title="' + rec.date.slice(0, 10) + '">In Lavorazione</span>';
                r.shipping_list_id = null; r.colli = o.colli || 1; r.weight = parseFloat(o.weight) || 1; r.contrassegno = '';
                r.checkbox = "<input type='checkbox' class='minimal'  value='" + r.id + "' name='shippings[]' print_format='PDF' />";
                r.action = '<div class="text-center"><a href="' + BASE + 'sandbox/labels/ECIT00000010.pdf" target="_blank" title="Stampa PDF" class="btn btn-primary btn-app-sm"><i class="fa fa-print"></i> </a></div>';
                out.push(r);
            });
        });
        return out;
    }
    // ===== Gestione giacenze (manuale: Enterprise/gestione_giacenze) — stato nel browser del visitatore =====
    (function stocksState() {
        var st0 = loadState(); var s = st0.stocks || {};
        var k = 'data/stocks/shippings-table.json';
        if (D[k]) { var j = $.extend(true, {}, D[k]); j.data.forEach(function (r) { if (s[r.id]) r.status = '<span class="label label-warning" data-stock="' + r.id + '">In gestione - Istruzioni inviate</span>'; }); D[k] = j; }
        $(function () {
            var $f = $('#stock-manage-form'); if (!$f.length) return;
            var id = String($f.data('stock-id'));
            function show(rec) {
                $('#stock-status').removeClass('label-danger').addClass('label-warning').text('In gestione - Istruzioni inviate');
                $('#stock-history tbody').html('<tr><td>' + rec.when + '</td><td>UTENTE DEMO</td><td>' + rec.azione + (rec.preavviso ? ' con preavviso telefonico (' + rec.phone + ')' : '') + (rec.note ? ' - ' + $('<div>').text(rec.note).html() : '') + '</td><td>' + (rec.cod ? 'Annullato' : '-') + '</td><td>Istruzioni inviate</td></tr>');
                $('#stock-alert').show();
            }
            if (s[id]) show(s[id]);
            $f.on('submit', function (e) {
                e.preventDefault();
                if ($('#stock_preavviso').is(':checked') && !$('#stock_phone').val().trim()) { $('#stock_phone').closest('.form-group').addClass('has-error'); $('#stock_phone').focus(); return; }
                var d = new Date(); var pad = function (n) { return (n < 10 ? '0' : '') + n; };
                var rec = { azione: $('#stock_action option:selected').text(), date: $('#stock_date').val(), preavviso: $('#stock_preavviso').is(':checked'), phone: $('#stock_phone').val().trim(), cod: $('input[name=annulla_cod]').is(':checked'), note: $('#stock_note').val(), when: pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) };
                var st = loadState(); st.stocks = st.stocks || {}; st.stocks[id] = rec; saveState(st);
                show(rec); window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });
    })();
    // Spedizioni create a mano da "Nuova Spedizione": come sul portale compaiono in cima all'Elenco Spedizioni
    // (stato "In Lavorazione") e in Crea Distinta. Con il servizio accessorio "Andata & Ritorno" (contratto Poste)
    // la riga mostra anche il numero della lettera di vettura di ritorno e il bottone "Stampa etichetta di reso" (v2026.30).
    var CONTRACTS = { 6: { vector_id: 5, name: 'Spedizioni Prime', slug: 'interno', contract: 'Spedizioni Prime' }, 86: { vector_id: 17, name: 'PosteDeliveryBusiness', slug: 'postedeliverybusiness', contract: 'Contratto Poste DEMO' }, 999: { vector_id: 99, name: 'GLS', slug: 'gls', contract: 'Contratto GLS DEMO' } };
    function manualShipments(st) {
        var tplJ = D['data/shippings/shippings-table.json']; if (!tplJ || !tplJ.data.length) return [];
        return (st.manual || []).map(function (m) {
            var r = $.extend({}, tplJ.data[0]); var c = CONTRACTS[m.contract] || CONTRACTS[6];
            r.id = 90002000 + m.n; r.increment_id = m.n;
            r.ldv = "<a href='#' class='track' data-id='" + m.ldv + "' >" + m.ldv + "</a>" + (m.ret ? '<br><small title="Etichetta di reso"><i class="fa fa-reply"></i> ' + m.ret + '</small>' : '');
            r.return_ldv = m.ret || null; r.vector_id = c.vector_id; r.vector_contract_id = m.contract;
            r.vector_service_id = m.ret ? 170000179 : null; r.vector_services = m.services || [];
            r.nominativo = esc(m.name) + '<br /><small>' + esc(m.city + ', ' + m.cap + ' (' + m.prov + '), IT') + '</small>';
            r.indirizzo = m.street; r.cap = m.cap; r.citta = m.city; r.provincia = m.prov; r.tel_dest = m.tel || '0000000000'; r.email_dest = m.email || '';
            r.order_number = m.order || ' '; r.original_order_id = m.order || null; r.rif_dest = m.rif || null;
            r.created_at = m.date; r.status = '<span class="label label-default" data-toggle="tooltip" title="' + m.date.slice(0, 10) + '">In Lavorazione</span>';
            r.shipping_list_id = null; r.colli = m.colli || 1; r.weight = m.weight || 1; r.contrassegno = m.cod || ''; r.contrassegno_type = m.cod ? 'CON' : null;
            r.shipped_at = null; r.consigned_at = null;
            r.checkbox = "<input type='checkbox' class='minimal'  value='" + r.id + "' name='shippings[]' print_format='PDF' />";
            var slot = m.ret ? '<span class="row-action-slot"><a href="' + BASE + 'sandbox/labels/ECIT00000102.pdf" target="_blank" title="Stampa etichetta di reso" class="row-action-teal"><i class="fa fa-reply"></i></a></span> '
                : (m.contract === 86 ? '<span class="row-action-slot"><button type="button" class="row-action-teal poste-reverse" data-id="' + r.id + '" data-ldv="' + m.ldv + '" title="Genera etichetta di reso"><i class="fa fa-undo"></i></button></span> ' : '');
            r.action = '<div class="row-actions">' + slot + '<a href="' + BASE + 'sandbox/labels/ECIT00000010.pdf" target="_blank" title="Stampa PDF" class="row-action-blue"><i class="fa fa-print"></i></a></div>';
            return r;
        }).reverse();
    }
    $(function () {
        var $f = $('form[action$="shippings/index.html"]').filter(function () { return $(this).find('#show-corriers').length > 0; });
        if (!$f.length) return;
        $f.on('submit', function () {
            var st = loadState(); st.manual = st.manual || [];
            var k = st.manual.length; var n = 201 + k;
            var pad = function (x) { return 'ECIT' + ('00000000' + x).slice(-8); };
            var services = $('#vector_services option:selected').map(function () { return $(this).text().trim(); }).get();
            var reso = $('#vector_services').val() ? $('#vector_services').val().indexOf('170000179') >= 0 : false;
            var d = new Date(); var date = ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear() + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
            var v = function (sel) { return ($(sel).val() || '').toString().trim(); };
            st.manual.push({ n: n, ldv: pad(n), ret: reso ? pad(n + 100) : null, date: date, contract: parseInt($('#vector_contracts input:radio:checked').val(), 10) || 6, services: services,
                name: v('[name=nominativo]') || 'DESTINATARIO DEMO', city: (v('[name=citta]') || 'ROMA').split(' (')[0], cap: v('[name=cap]') || '00100', prov: v('[name=provincia]') || 'RM', street: v('[name=indirizzo]') || 'VIA ESEMPIO 1',
                tel: v('[name=tel_dest]'), email: v('[name=email_dest]'), order: v('[name=original_order_id]'), rif: v('[name=rif_dest]'),
                colli: parseInt(v('[name=colli]'), 10) || 1, weight: parseFloat(v('[name=weight]')) || 1, cod: v('[name=contrassegno]') && parseFloat(v('[name=contrassegno]')) > 0 ? 'XX.XX' : '' });
            saveState(st);
        });
    });
    // ===== "Genera etichetta di reso" (portale v2026.30): per le spedizioni Poste senza LDV di ritorno. Stato nel browser del visitatore =====
    function applyReso(st) {
        var rs = st.reso || {}; if (!Object.keys(rs).length) return;
        ['data/shippings/shippings-table.json', 'data/shippinglists/create/shippings-table.json'].forEach(function (k) {
            if (!D[k]) return; var j = $.extend(true, {}, D[k]);
            j.data.forEach(function (r) {
                var rec = rs[r.id]; if (!rec || r.return_ldv) return;
                r.return_ldv = rec.ret; r.vector_services = ['Reverse'];
                r.ldv = r.ldv + '<br><small title="Etichetta di reso"><i class="fa fa-reply"></i> ' + rec.ret + '</small>';
                r.action = String(r.action).replace(/<span class="row-action-slot">[\s\S]*?<\/span>/, '<span class="row-action-slot"><a href="' + BASE + 'sandbox/labels/ECIT00000102.pdf" target="_blank" title="Stampa etichetta di reso" class="row-action-teal"><i class="fa fa-reply"></i></a></span>');
            });
            D[k] = j;
        });
    }
    $(function () {
        var $f = $('#posteReverseForm'); if (!$f.length) return;
        $f.on('submit', function (e) {
            e.preventDefault();
            var m = ($f.attr('action') || '').match(/shippings\/(\d+)\/reverse/); if (!m) return;
            var id = m[1], ldv = $('#posteReverseLdv').text();
            var st = loadState(); st.reso = st.reso || {};
            var ret = ldv.replace(/(\d+)$/, function (d) { return ('00000000' + (parseInt(d, 10) + 100)).slice(-d.length); });
            st.reso[id] = { ret: ret, channel: $('#posteReverseChannel').val(), channelName: $('#posteReverseChannel option:selected').text().trim(), paperless: $('#posteReversePaperless input').is(':checked'), when: new Date().toISOString() };
            saveState(st);
            $('#posteReverseModal').modal('hide');
            applyReso(st);
            var $t = $('#shippings-table'); if ($t.length && $.fn.DataTable && $.fn.DataTable.isDataTable($t[0])) $t.DataTable().ajax.reload(null, false);
            $('.content-header').first().after(alertBox('success', '<i class="icon fa fa-check"></i> Etichetta di reso generata per la spedizione <b>' + esc(ldv) + '</b>: lettera di vettura di ritorno <b>' + esc(ret) + '</b>' + (st.reso[id].paperless ? ' (paperless: il destinatario mostra il codice allo sportello)' : ', stampala con il bottone "Stampa etichetta di reso"') + '.'));
        });
    });
    (function mergeShipments() {
        var st = loadState(); var extra = manualShipments(st).concat(shipmentsFromOrders(st)); if (!extra.length) return;
        ['data/shippings/shippings-table.json', 'data/shippinglists/create/shippings-table.json'].forEach(function (k) {
            if (!D[k]) return; var j = $.extend(true, {}, D[k]);
            j.data = extra.concat(j.data); j.recordsTotal = j.data.length; j.recordsFiltered = j.data.length; D[k] = j;
        });
        extra.forEach(function (r) {
            var ldv = $('<div>').html(r.ldv).text();
            var c = CONTRACTS[r.vector_contract_id] || CONTRACTS[6];
            if (!D['tracking/' + ldv]) D['tracking/' + ldv] = { TrackingDettaglio: [{ Data: r.created_at, Stato: 'Spedizione generata. In attesa di ritiro.', Luogo: 'NAPOLI' }], pin_required: false, ldv: ldv, vector_id: c.vector_id, vector_name: c.name, statusCode: 0,
                shipping: { ldv: ldv, status: 0, nominativo: $('<div>').html(r.nominativo).find('b').text() || $('<div>').html(r.nominativo).text().split('\n')[0], indirizzo: r.indirizzo || '', tel_dest: r.tel_dest || '0000000000', email_dest: r.email_dest || '', contrassegno: r.contrassegno ? 1 : 0, insurance_value: 0, colli: String(r.colli), weight: String(r.weight), lu: 0, la: 0, h: 0, reference: null, vector_contract: { id: r.vector_contract_id, vector_id: c.vector_id, name: c.contract, slug: c.slug } },
                createdBy: 'UTENTE DEMO', order: { order_id: r.order_number }, packs: null };
        });
    })();
    applyReso(loadState());
    // Ordini gia' spediti nella demo: nella lista ordini mostrano il numero di spedizione
    (function markShippedOrders() {
        var st = loadState();
        Object.keys(st.shipped).forEach(function (platform) {
            var k = 'data/orders/' + platform + '/orders-table.json'; if (!D[k]) return;
            var j = $.extend(true, {}, D[k]);
            st.shipped[platform].forEach(function (rec) {
                j.data.forEach(function (o) { if (o.id == rec.orderId) { o.ldv = '<span class="label label-success">' + rec.ldv + '</span>'; o.fulfillment_status = '<span class="label label-success">Evaso</span>'; o.shipped_flag = 1; } });
            });
            D[k] = j;
        });
    })();
    $(function () {
        var st = loadState();
        renderSidebar(st);
        // --- Lista negozi ---
        if ($('#store-table').length) {
            var $tb = $('#store-table tbody');
            st.stores.forEach(function (s) { $tb.append(storeRow(s)); });
            var m = location.hash.match(/connected=([^&]+)&name=([^&]*)&acct=([^&]*)/);
            if (m) {
                var platform = decodeURIComponent(m[1]), name = decodeURIComponent(m[2]) || (PLATFORM_LABELS[platform] + ' DEMO'), acct = decodeURIComponent(m[3]);
                var s = { id: st.nextId++, platform: platform, name: name, acct: acct || (platform === 'shopify' ? 'negozio-demo.myshopify.com' : '') };
                st.stores.unshift(s); saveState(st);
                $tb.find('tr').first().after(storeRow(s)); $tb.find('tr[data-store-id="' + s.id + '"]').addClass('success');
                var extraMsg = ORDER_PAGES.indexOf(platform) >= 0 ? ' Trovi gli ordini importati nel menu <b>Importa Ordini &rarr; Ordini ' + esc(PLATFORM_LABELS[platform]) + '</b>.' : '';
                $('#store-table').closest('.box').before(alertBox('success', '<i class="icon fa fa-check"></i> Negozio <b>' + esc(name) + '</b> (' + esc(PLATFORM_LABELS[platform] || platform) + ') collegato correttamente.' + extraMsg));
                history.replaceState(null, '', location.pathname); renderSidebar(st);
            }
            if (!st.stores.length && !m) {
                $('#store-table').closest('.box').before(alertBox('info', '<i class="icon fa fa-info"></i> Nessun negozio collegato. Clicca su <b>Collega negozio online</b> per iniziare.'));
            }
            $('#store-table').on('submit', 'form', function (e) {
                e.preventDefault(); var $tr = $(this).closest('tr'); var id = $tr.data('store-id');
                st.stores = st.stores.filter(function (s) { return s.id != id; }); saveState(st); $tr.remove(); $('#confirm').modal('hide'); renderSidebar(st);
                $('#store-table').closest('.box').before(alertBox('success', '<i class="icon fa fa-check"></i> Negozio scollegato.'));
            });
        }
        // --- Pagina "Collega <piattaforma>" ---
        $('form[action*="clientstores/new/"]').on('submit', function (e) {
            e.preventDefault(); var $f = $(this);
            var platform = ($f.attr('action').match(/clientstores\/new\/([a-z0-9]+)/i) || [])[1] || 'store';
            var name = $f.find('[name=store_name],[name=name]').val() || '';
            var acct = $f.find('[name$=_url],[name=prestashop_url],[name=magento_url],[name=ecwid_store_id],[name=amazon_sellerid]').first().val() || '';
            var q = 'name=' + encodeURIComponent(name) + '&acct=' + encodeURIComponent(acct);
            if (OAUTH_PLATFORMS.indexOf(platform) >= 0) window.location.href = BASE + 'sandbox/auth/' + platform + '/index.html?' + q;
            else window.location.href = BASE + 'clientstores/index.html#connected=' + encodeURIComponent(platform) + '&' + q;
        });
        // --- Schermata di autorizzazione simulata ---
        if ($('.sandbox-auth-step').length) {
            var platform = (location.pathname.match(/sandbox\/auth\/([a-z0-9]+)/) || [])[1];
            var qs = {}; location.search.replace(/^\?/, '').split('&').forEach(function (kv) { var p = kv.split('='); if (p[0]) qs[p[0]] = decodeURIComponent(p[1] || ''); });
            $('#auth-store-name').text(qs.name || (PLATFORM_LABELS[platform] + ' DEMO'));
            var total = $('.sandbox-auth-step').length;
            $('.sandbox-auth-step').on('click', function () {
                if (!$('#auth-consent').is(':checked')) { $('#auth-consent').closest('.form-group').addClass('has-error'); return; }
                var i = $(this).data('step'); $(this).prop('disabled', true).removeClass('btn-primary btn-success').addClass('btn-default');
                $('.list-group-item').eq(i).addClass('list-group-item-success');
                if (i + 1 < total) $('.sandbox-auth-step[data-step="' + (i + 1) + '"]').prop('disabled', false);
                else setTimeout(function () { window.location.href = BASE + 'clientstores/index.html#connected=' + encodeURIComponent(platform) + '&name=' + encodeURIComponent(qs.name || '') + '&acct=' + encodeURIComponent(qs.acct || ''); }, 500);
            });
        }
        // --- Pagina ordini: "Spedisci selezionati" crea le spedizioni nella demo ---
        var om = location.pathname.match(/\/orders\/([a-z0-9]+)\//);
        if (om && $('#orders-table').length) {
            var platform = om[1];
            $('#orders_form').on('submit', function (e) {
                e.preventDefault();
                var action = $(document.activeElement).val();
                var ids = $('#orders-table input[name="orders[]"]:checked').map(function () { return $(this).val(); }).get();
                $('#loading-btn').hide(); $('#crea_ldv_button').show();
                if (!ids.length) { $('#orders-table').closest('.box').before(alertBox('warning', '<i class="icon fa fa-warning"></i> Seleziona almeno un ordine.')); return; }
                if (action === 'delete') { $('#confirm').modal('hide'); $('#orders-table').closest('.box').before(alertBox('info', '<i class="icon fa fa-info"></i> Nella demo gli ordini non vengono cancellati.')); return; }
                var j = D['data/orders/' + platform + '/orders-table.json']; st.shipped[platform] = st.shipped[platform] || [];
                var created = 0;
                ids.forEach(function (id) {
                    var o = j.data.filter(function (x) { return x.id == id; })[0]; if (!o || o.shipped_flag) return;
                    var n = 100 + Object.keys(st.shipped).reduce(function (a, k) { return a + st.shipped[k].length; }, 0);
                    var d = new Date(); var date = ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear() + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
                    st.shipped[platform].push({ orderId: o.id, ldv: 'ECIT' + ('00000000' + n).slice(-8), n: n, date: date }); created++;
                });
                saveState(st);
                if (created) {
                    $('#orders-table').closest('.box').before(alertBox('success', '<i class="icon fa fa-check"></i> ' + created + ' spedizion' + (created === 1 ? 'e creata' : 'i create') + ' con successo. Le trovi in <a href="' + BASE + 'shippings/index.html"><b>Spedizioni &rarr; Elenco Spedizioni</b></a>; per trasmetterle al corriere chiudi la distinta da <a href="' + BASE + 'shippinglists/create/index.html"><b>Crea Distinta</b></a>.'));
                    setTimeout(function () { location.reload(); }, 1800);
                } else {
                    $('#orders-table').closest('.box').before(alertBox('info', '<i class="icon fa fa-info"></i> Gli ordini selezionati hanno gi&agrave; una spedizione.'));
                }
            });
        }
        // --- Reset della demo (link nel footer) ---
        var $footer = $('.sidebar-footer'); if ($footer.length && !$footer.find('.sandbox-reset').length) {
            $footer.append('<a href="#" class="sandbox-reset" style="display:block;margin-top:4px;color:#8aa4af;font-size:11px" title="Riporta la demo allo stato iniziale (negozi e spedizioni create in questa sessione)"><i class="fa fa-refresh"></i> Ripristina demo</a>');
            $footer.on('click', '.sandbox-reset', function (e) { e.preventDefault(); try { localStorage.removeItem(KEY); } catch (x) {} window.location.href = BASE + 'index.html'; });
        }
    });

    // Report: il form POST restituisce il file placeholder nel formato scelto
    $(function () {
        $('form[action*="reports/"]').on('submit', function (e) {
            var m = ($(this).attr('action') || '').match(/reports\/(shippings|shippinglists|contrassegni|consumables|priceupdates)/);
            if (!m) return;
            e.preventDefault();
            var sel = $(this).find('select[name=file]').val();
            var fmt = sel === 'csv' ? 'csv' : (sel === 'xls' ? 'xlsx' : 'pdf');
            window.open(BASE + 'sandbox/reports/' + m[1] + '.' + fmt, '_blank');
        });
    });
    // Form POST (Crea Spedizione, Crea Distinta, Conferma Ritiro, filtri, ...): l'hosting statico
    // non accetta POST (405), quindi il form porta alla pagina di destinazione in GET.
    // I form gia' gestiti sopra (negozi, ordini, report) fermano l'evento prima e non passano di qui.
    $(function () {
        var FALLBACK = [
            [/orders\/bulkupdate/, 'imports/index.html'],
            [/subscription\/cancel/, 'subscription/index.html'],
            [/setoptions/, 'clientsettings/index.html'],
            [/packs\/\d+\/(delete|edit)/, 'packs/index.html'],
            [/shippinglists\/(confirmclosure|scanclosure)/, 'shippinglists/index.html'],
            [/imports\/upload/, 'imports/index.html'],
            [/warehouses\/\d+\//, 'warehouses/index.html'],
            [/clientstores\/new\//, 'clientstores/index.html']
        ];
        $(document).on('submit', 'form', function (e) {
            if (e.isDefaultPrevented()) return;
            var $f = $(this);
            if (($f.attr('method') || 'get').toLowerCase() !== 'post') return;
            var action = $f.attr('action') || '';
            if (!action || action === '#' || /^https?:\/\//.test(action)) return;
            e.preventDefault();
            var url = action;
            if (/privacy\/accept/.test(action)) { $f.closest('.modal').modal('hide'); return; }
            if (/login\/index\.html$/.test(action) && this.id !== 'logout-form') url = BASE + 'index.html';
            for (var i = 0; i < FALLBACK.length; i++) if (FALLBACK[i][0].test(action)) { url = BASE + FALLBACK[i][1]; break; }
            if ($f.attr('target') === '_blank') window.open(url, '_blank'); else window.location.href = url;
        });
    });
})(window.jQuery);
