/*
 * Pickup point selector of the sender block
 * (resources/views/shippings/include/shipfrom_client.blade.php and
 * shipfrom_admin.blade.php). Changing the point rewrites the sender fields
 * from the option's data-* attributes. Plain JS on purpose: the include
 * renders inside the content, before jQuery loads. The province select is
 * chained to the country (jquery.chained, remote reload), so after a
 * country change the province is set once its option shows up.
 */
var PickupPointSelect = (function () {
    function byId(id) { return document.getElementById(id); }

    function setInput(id, value) {
        var el = byId(id);
        if (el) { el.value = value || ''; }
    }

    function fire(el) {
        if (!el) { return; }
        if (window.jQuery) { window.jQuery(el).trigger('change'); }
        else { el.dispatchEvent(new Event('change', { bubbles: true })); }
    }

    function setSelect(id, value, retries) {
        var el = byId(id);
        if (!el) { return; }
        var found = false;
        for (var i = 0; i < el.options.length; i++) {
            if (el.options[i].value === value) { found = true; break; }
        }
        if (found) {
            el.value = value;
            fire(el);
        } else if (retries > 0) {
            setTimeout(function () { setSelect(id, value, retries - 1); }, 300);
        } else if (value) {
            var opt = document.createElement('option');
            opt.value = value; opt.text = value; opt.selected = true;
            el.appendChild(opt);
            fire(el);
        }
    }

    function apply(select) {
        var option = select.options[select.selectedIndex];
        if (!option) { return; }
        var d = option.dataset;
        var country = byId('shipfrom-country');
        var countryChanged = country && country.value !== (d.country || 'IT');
        if (countryChanged) { setSelect('shipfrom-country', d.country || 'IT', 0); }
        setInput('shipfrom-street', d.street);
        setInput('shipfrom-cap', d.zip);
        setInput('autocomplete-shipfrom-city', d.city);
        setInput('shipfrom-phone', d.phone);
        setInput('shipfrom-email', d.email);
        // the chained province list reloads after a country change
        setSelect('shipfrom-province', d.state, countryChanged ? 10 : 0);
        if (d.reference) {
            var reference = document.querySelector('input[name="rif_mitt"]');
            if (reference) { reference.value = d.reference; }
        }
    }

    // Admin forms: build the options from the client JSON (client_warehouses rows).
    function populate(points) {
        var select = document.querySelector('.pickup-point-select');
        if (!select) { return; }
        select.innerHTML = '';
        (points || []).forEach(function (p) {
            var opt = document.createElement('option');
            opt.value = p.id;
            var street = ((p.origin_street1 || '') + ' ' + (p.origin_street2 || '')).trim();
            opt.text = p.title + ' — ' + [street, ((p.origin_zip || '') + ' ' + (p.origin_city || '')).trim(), p.origin_state ? '(' + p.origin_state + ')' : ''].filter(Boolean).join(', ');
            opt.dataset.street = street;
            opt.dataset.zip = p.origin_zip || '';
            opt.dataset.city = p.origin_city || '';
            opt.dataset.state = p.origin_state || '';
            opt.dataset.country = p.origin_country || 'IT';
            opt.dataset.phone = p.origin_phone || '';
            opt.dataset.email = p.origin_email || '';
            opt.dataset.reference = p.sender_reference || '';
            if (p.default) { opt.selected = true; }
            select.appendChild(opt);
        });
        var field = select.closest('.pickup-point-field');
        if (field) { field.style.display = select.options.length > 1 ? '' : 'none'; }
        if (select.options.length) { apply(select); }
    }

    document.addEventListener('DOMContentLoaded', function () {
        var select = document.querySelector('.pickup-point-select');
        if (select) {
            select.addEventListener('change', function () { apply(select); });
        }
    });

    return { apply: apply, populate: populate };
})();
