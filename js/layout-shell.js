/*
 |--------------------------------------------------------------------------
 | Viewport-locked app shell — behaviour
 |--------------------------------------------------------------------------
 |
 | Companion to css/layout-shell.css. Loaded by resources/views/app.blade.php
 | immediately after dist/js/app.js, and it must stay in that order: the
 | override below has to be in place before AdminLTE's own $(document).ready
 | runs.
 */

(function ($) {
    'use strict';

    $(function () {

        /* ------------------------------------------------------------------
         | 1. Stop AdminLTE from sizing the shell
         |------------------------------------------------------------------*/

        /*
         | $.AdminLTE.layout.fix() (dist/js/app.js:247) writes an inline
         | min-height onto .content-wrapper on load and on every resize, set to
         | the taller of the window and the sidebar. With 16 top-level menu
         | entries the sidebar always won, which is what left the empty block
         | below the content and the single document scrollbar.
         |
         | The object is built by _init() (dist/js/app.js:226), which AdminLTE
         | only calls from its own $(document).ready — so $.AdminLTE.layout does
         | not exist yet while this file is being parsed and cannot be patched
         | there. jQuery runs ready callbacks in registration order and this
         | script is loaded after app.js, so by the time we get here activate()
         | has run once and bound its resize handler. That handler resolves
         | _this.fix at call time, so replacing the property now covers every
         | later resize, and every pushMenu toggle (app.js:421) too. The one
         | value activate() already wrote is cleared below; it never had a
         | visible effect, because .content-wrapper's min-height is !important
         | in layout-shell.css precisely so an inline value cannot win.
         |
         | fixSidebar() goes with it: its only job is attaching or destroying
         | slimScroll on .sidebar depending on the .fixed body class. The sidebar
         | now scrolls natively via overflow-y, and leaving slimScroll to also
         | measure and set a pixel height would fight the CSS on every resize.
         */
        if ($.AdminLTE && $.AdminLTE.layout) {
            $.AdminLTE.layout.fix = function () {};
            $.AdminLTE.layout.fixSidebar = function () {};
        }

        $('.content-wrapper, .right-side').css('min-height', '');

        var $content = $('.content-wrapper > .content');

        if (!$content.length) {
            return;
        }

        /* ------------------------------------------------------------------
         | 2. Dropdowns that live in <body> while their field scrolls away
         |------------------------------------------------------------------*/

        /*
         | bootstrap-datepicker and daterangepicker both append their panel to
         | <body> and position it once, in page coordinates, when it opens. That
         | worked while the page itself was the scroll container. Now that the
         | scrolling happens inside .content the field moves and the panel does
         | not, so it ends up floating over unrelated rows. Closing it is the
         | honest behaviour — reopening is one click, and a panel pinned to the
         | wrong field is worse than no panel.
         |
         | Deliberately not handled here:
         |   - select2 (4.0.3) already listens for scroll on its scrollable
         |     ancestors and repositions itself;
         |   - bootstrap-select and every plain Bootstrap dropdown render inline
         |     next to their trigger, so they travel with it. No view outside
         |     the header and the sidebar uses a raw .dropdown-menu anyway.
         */
        var closePanels = function () {
            $content.find('input, .input-group.date, .input-daterange').each(function () {
                var $el = $(this),
                    datepicker = $el.data('datepicker'),
                    daterangepicker = $el.data('daterangepicker');

                if (datepicker && datepicker.picker && datepicker.picker.is(':visible')) {
                    $el.datepicker('hide');
                }

                if (daterangepicker && daterangepicker.container && daterangepicker.container.is(':visible')) {
                    daterangepicker.hide();
                }
            });
        };

        /*
         | Coalesced into one frame: scroll fires far more often than the DOM
         | needs touching, and the handler walks every input in the content.
         */
        var pending = false;

        $content.on('scroll', function () {
            if (pending) {
                return;
            }

            pending = true;

            window.requestAnimationFrame(function () {
                pending = false;
                closePanels();
            });
        });

        /* ------------------------------------------------------------------
         | 3. Modals climb out of the scroll container before they show
         |------------------------------------------------------------------*/

        /*
         | Almost every view declares its modals inside @section('content'),
         | which now lives inside the .content scroll container. On desktop
         | engines that is survivable - the modal is position:fixed and
         | .content-wrapper's z-index was handed back to auto for exactly this
         | - but iOS Safari composites the touch scroller into a stacking
         | context of its own, and a fixed modal caught inside one ranks below
         | the backdrop Bootstrap appends to <body>. The dialog then shows
         | dimmed under the grey and every tap lands on the backdrop, which in
         | Bootstrap 3 carries no click handler at all: the modal cannot be
         | closed. Seen on the client shipment list's tracking modal on an
         | iPhone.
         |
         | Moving the modal to <body> at show time takes every ancestor out of
         | the question on every engine, once, for all of them. show.bs.modal
         | fires before Bootstrap measures or paints anything, and moving a
         | node does not disturb its id, its data, or the dismiss handler the
         | plugin binds on the element itself.
         |
         | The one exception stands from when this was first considered and
         | rejected as a blanket rule: three admin views (renderlists,
         | clients/options, shippinglists) declare their modal inside the page
         | <form>, where reparenting would silently drop the modal's fields
         | from the submit. Those stay where they are - none of them is the
         | kind that gets opened from a phone's shipment list.
         */
        $(document).on('show.bs.modal', '.modal', function () {
            var $modal = $(this);

            if (!$modal.closest('form').length && !$modal.parent().is('body')) {
                $modal.appendTo('body');
            }
        });
    });

})(jQuery);
