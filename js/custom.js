/**
 * Created by Marius on 03/10/2017.
 */
function preview_costs(contractId){
    $('.overlay').show();
    $('#preview_costs').hide();
    $('#error_message').hide();
    var client_id		=	$('select[name=client_id]').val();
    var vector_service_id	=	$('#vector_services').val();
    var country_id	=	$('#country').val();
    var cap			=	$('input[name=cap]').val();
    var provincia		=	$('#province').val();
    var citta			=	$('input[name=citta]').val();
    var colli		=	$('input[name=colli]').val();
    var weight		=	parseFloat($('input[name=weight]').val());
    var contrassegno	=	parseFloat($('input[name=contrassegno]').val());
    var insurance_value=	parseFloat($('input[name=insurance_value]').val());
    var pickup_from_address = 0;
    var pickup_payment_type = 0;
    var show_only_pickup_price = 0;
    if($('input[name="pickup_from_address"]:checked').val()==1)
    {
        var pickup_from_address = 1;
        var pickup_payment_type = $('#pickup_payment_type').val();
    }
    if($('input[name="show_only_pickup_price"]').val()==1)
    {
        var show_only_pickup_price = 1;
    }

    var parcels = {};
    var arr = {}
    var arr2 = {}
    var arr3 = {};
    $('input.lu').each(function(i, value) {
        arr[i] = {};
        arr[i]={'lenght':$(this).val()};
    });
    $('input.la').each(function(i, value) {
        arr2[i] = {};
        arr2[i]={'width':$(this).val()};

    });
    $('input.h').each(function(i, value) {
        arr3[i] = {};
        arr3[i]={'height':$(this).val()};

    });
    $.extend(true, arr, arr2);
    $.extend(true, arr, arr3);
    parcels = arr;

    if(!weight)
    { weight=1;}

    var shipfrom_city = $('#autocomplete-shipfrom-city').val();
    var shipfrom_zip = $('#shipfrom-cap').val();
    var shipfrom_state = $('#shipfrom-province').val();


    $('.zone_name_row').hide();
    $('.weight_price_row').hide();
    $('.cod_price_row').hide();
    $('.insurance_price_row').hide();
    $('.services_price_row').hide();
    $('.fuel_price_row').hide();
    $('.extra_price_row').hide();
    $('.pickup_price_row').hide();
    $('.total_price_row').hide();

    $('#destination_zone').val('');
    $('#weight_price').val('');
    $('#cod_price').val('');
    $('#insurance_price').val('');
    $('#fuel_price').val('');
    $('#services_price').val('');
    $('#extra_price').val('');
    $('#pickup_price').val('');
    $('#total_price').val('');

    $.ajax({
        url: '/shippings/preview_cost',
        type: "post",
        dataType: 'json',
        data: {'client_id':client_id,
            'client_warehouse_id': $('select[name=client_warehouse_id]').val() || '',
            'vector_contract_id':contractId,
            'vector_service_id':vector_service_id,
            'country_id':country_id,
            'provincia':provincia,
            'cap':cap,
            'citta':citta,
            'colli':colli,
            'weight':weight,
            'parcels':parcels,
            'contrassegno':contrassegno,
            'insurance_value':insurance_value,
            'pickup_from_address': pickup_from_address,
            'pickup_payment_type': pickup_payment_type,
            'shipfrom_city': shipfrom_city,
            'shipfrom_zip': shipfrom_zip,
            'shipfrom_state': shipfrom_state,
            '_token': $('input[name=_token]').val()
        },
        success: function(data){
            if(data["zone_name"])
            {
                $('.zone_name_row').show();
            }
            if(data["weight"] > 0)
            {
                $('.weight_price_row').show();
            }
            if(data["check"] > 0)
            {
                $('.cod_price_row').show();
            }
            if(data["insurance"] > 0)
            {
                $('.insurance_price_row').show();
            }
            if(data["fuel"]>0)
            {
                $('.fuel_price_row').show();
            }
            if(data["services_price"] > 0)
            {
                $('.services_price_row').show();
            }
            if(data["extra"] > 0)
            {
                $('.extra_price_row').show();
            }
            if(pickup_from_address)
            {
                $('.pickup_price_row').show();
            }
            if(data['total'] > 0)
            {
                $('.total_price_row').show();
            }

            if(show_only_pickup_price == 1) {
                $('.pickup_price_row').show();
                $('.zone_name_row').hide();
                $('.weight_price_row').hide();
                $('.cod_price_row').hide();
                $('.insurance_price_row').hide();
                $('.fuel_price_row').hide();
                $('.services_price_row').hide();
                $('.extra_price_row').hide();
                $('.total_price_row').hide();
            }
            $('#destination_zone').val(data["zone_name"] || '');
            $('#weight_price').val(data["weight"]);
            $('#cod_price').val(data["check"]);
            $('#insurance_price').val(data["insurance"]);
            $('#fuel_price').val(data["fuel"]);
            $('#services_price').val(data["services_price"]);
            $('#extra_price').val(data["extra"]);
            $('#pickup_price').val(data["pickup"]);
            $('#total_price').val(data["total"]);

            $('#preview_costs').show();

            $('.overlay').hide();
        },
        error: function(data) {
            response=JSON.parse(data.responseText);
            $('#preview_costs').hide();
            $('#error_message').html('<div class="callout callout-danger"><h4>Errore!</h4> <p> '+ response.message +' </p></div>');
            $('#error_message').show();
            $('.overlay').hide();
        }
    });
}

function get_rates(){
    $('.overlay').show();

    var client_id		=	$('select[name=client_id]').val();
    var pickup_from_address = 0;
    var pickup_payment_type = 0;
    var show_only_pickup_price = 0;
    if($('input[name="pickup_from_address"]:checked').val()==1)
    {
        var pickup_from_address = 1;
        var pickup_payment_type = $('select[name=pickup_payment_type]').val();
    }
    if($('input[name="show_only_pickup_price"]').val()==1)
    {
        var show_only_pickup_price = 1;
    }
   // var vector_services_ids	=	$('#vector_services').val();
    var country_id	=	$('#country').val();
    var cap			=	$('input[name=cap]').val();
    var provincia		=	$('#province').val();
    var citta			=	$('input[name=citta]').val();
    var colli		=	$('input[name=colli]').val();
    var weight		=	parseFloat($('input[name=weight]').val());
    var contrassegno	=	parseFloat($('input[name=contrassegno]').val());
    var insurance_value=	parseFloat($('input[name=insurance_value]').val());

    var shipfrom_city = $('#autocomplete-shipfrom-city').val();
    var shipfrom_zip = $('#shipfrom-cap').val();
    var shipfrom_state = $('#shipfrom-province').val();

    var parcels = {};
    var arr = {}
    var arr2 = {}
    var arr3 = {};
    $('input.lu').each(function(i, value) {
       arr[i] = {};
       arr[i]={'lenght':$(this).val()};
    });
    $('input.la').each(function(i, value) {
        arr2[i] = {};
        arr2[i]={'width':$(this).val()};

    });
    $('input.h').each(function(i, value) {
        arr3[i] = {};
        arr3[i]={'height':$(this).val()};

    });
    $.extend(true, arr, arr2);
    $.extend(true, arr, arr3);
    parcels = arr;


    if(!weight)
    { weight=1;}

    $.ajax({
        url: '/api/rates',
        type: "post",
        dataType: 'json',
        data: {'client_id':client_id,
           // 'vector_service_id':vector_services_ids,
            'country_id':country_id,
            'provincia':provincia,
            'cap':cap,
            'citta':citta,
            'colli':colli,
            'weight':weight,
            'parcels':parcels,
            'contrassegno':contrassegno,
            'insurance_value':insurance_value,
            'pickup_from_address': pickup_from_address,
            'pickup_payment_type': pickup_payment_type,
            'shipfrom_city': shipfrom_city,
            'shipfrom_zip': shipfrom_zip,
            'shipfrom_state': shipfrom_state,
            '_token': $('input[name=_token]').val()
        },
        success: function(data){

            var radio_html ="";
            var services = null;
            var count = 0;
            var tot_contracts = Object.keys(data).length;
            $.each(data,function(i,v){
                if(show_only_pickup_price == 1)
                {
                    v.total_price=v.pickup;
                }
                if(count == 0){
                    radio_html =radio_html+'<input type="radio" checked name="vector_contract_id" data-conversion="'+v.conversion+'" value="'+v.vector_contract_id+'"  /><b> '+v.real_weight+' kg - '+v.total_price+' &euro; </b><img src="'+v.logo_url+'" style="padding: 10px; width:100px;" /> <span> ' +v.contract_name+' </span><br>';
                    get_accessories(v.vector_contract_id);
                    preview_costs(v.vector_contract_id);
                }
                else {
                    radio_html =radio_html+'<input type="radio" name="vector_contract_id" data-conversion="'+v.conversion+'" value="'+v.vector_contract_id+'"  /><b> '+v.real_weight+' kg - '+v.total_price+' &euro; </b><img src="'+v.logo_url+'" style="padding: 10px; width:100px;" /> <span> ' +v.contract_name+'</span><br>';
                }

                count++;
            });

            $('#vector_contracts').html(radio_html);
            $('.overlay').hide();
        },
        error: function(data) {
            response=JSON.parse(data.responseText);
            $('#preview_costs').hide();
            $('#error_message').html('<div class="callout callout-danger"><h4>Errore!</h4> <p>'+ response.message +'</p></div>');
            $('#error_message').show();
            $('#contrassegno_type').find('option').remove();
            $('#vector_services').find('option').remove();
            $('#contrassegno_type_div').hide();
            $('#accessories_div').hide();
            $('.overlay').hide();
        }
    });
}

function get_accessories(contract_id) {
    $('#contrassegno_type').find('option').remove();
    $('#vector_services').find('option').remove();

    $.ajax({
        url: '/api/courier/contrassegnotype/' + contract_id,
        type: 'GET',
        dataType: 'json',
        success: function (json) {
            var count_contrassegni = Object.keys(json.contrassegno_type).length;
            var count_sevices =  Object.keys(json.services).length;
            $.each(json.contrassegno_type, function (key, value) {
                $('#contrassegno_type').append($('<option>').text(value).attr('value', key));
            });
            $.each(json.services, function (key, value) {
                $('#vector_services').append($('<option>').text(value).attr('value', key));
            });

            if(count_contrassegni > 0 && $('#contrassegno').val() > 0)
            {
                $('#contrassegno_type_div').show();
            }
            else
            {
                $('#contrassegno_type_div').hide();
            }
            if(count_sevices > 0)
            {
                $('#accessories_div').show();
            }
            else
            {
                $('#accessories_div').hide();
            }

        }
    });
}

function addPack(actual, target)
{
    for(i = actual +1;i<=target;i++)
    {

        var tabela=$('#table-packs');
        var lastrow=$(tabela).find('tr:last');
        var tabbody=$(tabela).find('tbody');
        //console.log(lastrow);
        //$('tr:last').clone().append('table tr').find("input[type='text']").val("");
        var newa=lastrow.clone(true);
        var packnr=newa.find('.pack_nr').html(i);
        $(newa).appendTo(tabbody);
    }
}

function removePack(actual, target)
{

    if(actual < target)
    {
        var steps=target-actual;
    }
    else
    {
        var steps=actual-target;
    }

    for(i = 1;i<=steps;i++)
    {
        var tabela=$('#table-packs');
        var lastrow=$(tabela).find('tr:last');
        lastrow.remove();
    }

}

function checkMissuresInput()
{
    nrPacks = $('#totale_colli').val();
    rebuildMissuresTable(nrPacks);
}
$("#totale_colli").on('change', function() {
    nrPacks = $.trim($(this).val()).match(/^\d*$/);

    rebuildMissuresTable(nrPacks);

    return false;

});

function rebuildMissuresTable(nrPacks) //numero colli
{

    curVal = nrPacks;
    curFloors = $('.dimensioni').length;
    if(curVal>0)
    {
        if(curVal > curFloors)
        {
            addPack(curFloors, curVal);
        }else if(curVal < curFloors)
        {
            removePack(curFloors, curVal);
        }

    }

    return false;
}
