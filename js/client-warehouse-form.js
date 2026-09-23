/*
 * Pickup point form (resources/views/clients/warehouses/partials/form.blade.php).
 *
 * Three jobs: reload the province select when a party's country changes,
 * hide the return address while "same as sender" is checked, and run the
 * Google map whose draggable pin corrects the coordinates. The map never
 * writes address fields: the address is what the user typed, the pin is
 * where the parcels really are. Google calls initClientWarehouseMap once
 * its script has loaded (callback= in the script URL).
 */
var ClientWarehouseForm = (function ($) {
    var options = {};
    var map = null;
    var marker = null;
    var geocoder = null;
    var mapReady = false;

    function setStatus(text) {
        $('#warehouse-map-status').text(text || '');
    }

    // commit=false only shows where the address seems to be; the hidden
    // inputs are written when the user drags the pin or the lookup is a
    // street-level match, never from an approximate preview.
    function setPin(latLng, pan, commit) {
        if (commit) {
            $('#warehouse_latitude').val(latLng.lat().toFixed(7));
            $('#warehouse_longitude').val(latLng.lng().toFixed(7));
        }
        if (marker) {
            marker.setPosition(latLng);
        } else {
            marker = new google.maps.Marker({map: map, position: latLng, draggable: true});
            marker.addListener('dragend', function (event) {
                setPin(event.latLng, false, true);
                setStatus(options.labels.located);
            });
        }
        if (pan) {
            map.panTo(latLng);
            if (map.getZoom() < 15) {
                map.setZoom(16);
            }
        }
    }

    function typedAddress() {
        return [
            $('#origin_street1').val(),
            $('#origin_zip').val() + ' ' + $('#origin_city').val(),
            $('#origin_state').val()
        ].filter(function (part) { return $.trim(part) !== ''; }).join(', ');
    }

    // Same rule as the server: only a street-level match is a position.
    function isPrecise(result) {
        var locationType = result.geometry && result.geometry.location_type;
        if (locationType === 'ROOFTOP' || locationType === 'RANGE_INTERPOLATED') {
            return true;
        }
        var streetLevel = ['street_address', 'premise', 'subpremise', 'route', 'intersection', 'establishment', 'point_of_interest'];
        return (result.types || []).some(function (t) { return streetLevel.indexOf(t) !== -1; });
    }

    function locate(address, country, commit) {
        if (!mapReady || !address) {
            return;
        }
        setStatus(options.labels.searching);
        var request = {address: address};
        if (country) {
            request.componentRestrictions = {country: country};
        }
        geocoder.geocode(request, function (results, status) {
            if (status === 'OK' && results[0] && isPrecise(results[0])) {
                setPin(results[0].geometry.location, true, commit);
                setStatus(commit ? options.labels.located : options.labels.preview);
            } else if (status === 'OK' && results[0]) {
                setPin(results[0].geometry.location, true, false);
                setStatus(options.labels.notFound);
            } else {
                setStatus(options.labels.notFound);
            }
        });
    }

    function initMap() {
        var $el = $('#warehouse-map');
        if (!$el.length || typeof google === 'undefined') {
            return;
        }
        geocoder = new google.maps.Geocoder();
        var lat = parseFloat($el.data('lat'));
        var lng = parseFloat($el.data('lng'));
        var hasPin = !isNaN(lat) && !isNaN(lng);
        map = new google.maps.Map($el[0], {
            zoom: hasPin ? 16 : 6,
            center: hasPin ? {lat: lat, lng: lng} : {lat: 41.9028, lng: 12.4964},
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            streetViewControl: false,
            mapTypeControl: false
        });
        mapReady = true;
        if (hasPin) {
            setPin(new google.maps.LatLng(lat, lng), false, true);
        } else if ($el.data('address')) {
            // Saved without coordinates: show where the lookup would put it
            // as a preview only; the user drags the pin to make it real.
            locate($el.data('address'), $('#origin_country').val(), false);
        }
    }

    // Only Italy has provinces; elsewhere the field is optional and the list
    // may well come back empty. The client form does the same.
    function applyProvinceRequirement($country) {
        var $select = $($country.data('provinces'));
        if ($select.length) {
            $select.prop('required', $country.val() === 'IT' && $select.attr('id') === 'origin_state');
        }
    }

    function reloadProvinces($country) {
        var target = $country.data('provinces');
        var $select = $(target);
        if (!$select.length) {
            return;
        }
        applyProvinceRequirement($country);
        var current = $select.val();
        $.getJSON(options.provincesUrl, {country_id: $country.val()}, function (provinces) {
            $select.empty();
            $.each(provinces, function (code, name) {
                $select.append($('<option>', {value: $.trim(code), text: name}));
            });
            if (current && $select.find('option[value="' + current + '"]').length) {
                $select.val(current);
            }
            $select.trigger('change.select2');
        });
    }

    function initProvinces() {
        $('.province-select').each(function () {
            $(this).select2({tags: true, placeholder: options.provincePlaceholder, width: '100%'});
        });
        $('select[data-provinces]').on('change', function () {
            reloadProvinces($(this));
        });
        $('select[data-provinces]').each(function () { applyProvinceRequirement($(this)); });
    }

    function initReturnToggle() {
        var $same = $('#return_same');
        var $fields = $('#return-fields');
        function apply() {
            $fields.toggle(!$same.is(':checked'));
        }
        $same.on('change', apply);
        apply();
    }

    function init(opts) {
        options = opts;
        initProvinces();
        initReturnToggle();
        $('#warehouse-map-locate').on('click', function () {
            locate(typedAddress(), $('#origin_country').val(), true);
        });
        if (typeof google !== 'undefined' && google.maps && !mapReady) {
            initMap();
        }
    }

    return {init: init, initMap: initMap};
})(jQuery);

function initClientWarehouseMap() {
    ClientWarehouseForm.initMap();
}
