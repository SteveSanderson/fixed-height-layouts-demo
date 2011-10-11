// (c) Microsoft Corporation

(function (x$, window, undefined) {
    var $ = x$;

    // Feature detection
    var vendor = (/webkit/i).test(navigator.appVersion) ? 'webkit' :
                 (/firefox/i).test(navigator.userAgent) ? 'Moz' :
                 'opera' in window ? 'O' : '',
        useCssTransform = vendor + 'Transform' in document.documentElement.style,
        cssTransformPrefix = "-" + vendor.toLowerCase() + "-",
        transitionEndEvent = vendor === 'webkit' ? 'webkitTransitionEnd' :
                             vendor === 'O' ? 'oTransitionEnd' :
                             'transitionend';

    $.isTouch = 'ontouchstart' in document.documentElement;
    $.clickOrTouch = $.isTouch ? "touchstart" : "click";

    function oppositeDirection(direction) {
        switch (direction) {
            case 'right': return 'left';
            case 'left': return 'right';
            case 'top': return 'bottom';
            case 'bottom': return 'top';
        }
    }

    function findFirstChildWithClass(elem, className) {
        var child = elem.firstChild;
        do {
            if ($(child).hasClass(className))
                return child;
        } while (child = child.nextSibling);
    }

    $.fn.togglePane = function (show) {
        return this.each(function () {
            // Can't just toggle display:block/none, as that resets any scroll positions within the pane
            // Todo: May need to set overflow:hidden on hide, and restore previous value on show
            // otherwise descendant panes with visibility: visible will still show up
            if (show) {
                this.style.display = "block";
                this.style.width = "";
                this.style.height = "";
                this.style.visibility = "visible";
            } else {
                this.style.width = "0px";
                this.style.height = "0px";
                this.style.visibility = "hidden";
            }
        });
    }

    $.fn.afterNextTransition = function (callback) {
        return this.each(function () {
            var elem = this;
            var handlerWrapper = function () {
                callback.apply(this, arguments);
                elem.removeEventListener(transitionEndEvent, handlerWrapper);
            }
            elem.addEventListener(transitionEndEvent, handlerWrapper);
        });
    }

    $.fn.setPanePosition = function (position, transition, callback) {
        callback = callback || function () { };
        return this.each(function () {
            $this = $(this).togglePane(true);

            var x = 0, y = 0, width = this.parentNode.offsetWidth, height = this.parentNode.offsetHeight;
            switch (position) {
                case 'right': x = width; break;
                case 'left': x = -1 * width; break;
                case 'top': y = -1 * height; break;
                case 'bottom': y = height; break;
            }
            var finalPos = { left: x + 'px', right: (-1 * x) + 'px', top: y + 'px', bottom: (-1 * y) + 'px' };

            if (useCssTransform) {
                var transform = {};
                transform[cssTransformPrefix + "transform"] = "translate(" + finalPos.left + ", " + finalPos.top + ")";
                transform[cssTransformPrefix + "transition"] = transition ? cssTransformPrefix + "transform 250ms ease-out" : null;

                if (transition) {
                    $this.afterNextTransition(function () {
                        if (position)
                            $this.togglePane(false)
                        callback();
                    });
                }
                $this.css(transform);
                if (!transition)
                    callback();
            } else {
                var afterTransition = function () {
                    if (position) {
                        $this.togglePane(false);
                    }
                    callback();
                }
                if (transition)
                    $this.tween(finalPos, afterTransition)
                else {
                    $this.css(finalPos);
                    afterTransition();
                }
            }
        });
    };

    $.fn.slidePane = function (options) {
        return this.each(function () {
            var $this = $(this).setPanePosition(options.from, null)
                               .setPanePosition(options.to, true, options.callback);
        });
    };

    $.paneTransitions = {
        slideFrom: function (incomingPane, outgoingPane, options) {
            $(incomingPane).slidePane({ from: options });
            if (outgoingPane)
                $(outgoingPane).slidePane({ to: oppositeDirection(options) });
        },
        coverFrom: function (incomingPane, outgoingPane, options) {
            var outgoingZIndex = outgoingPane ? outgoingPane.style.zIndex || 0 : 0;
            $(incomingPane).css({ zIndex: outgoingZIndex + 1 })
                           .slidePane({
                               from: options,
                               callback: function () { $(outgoingPane).togglePane(false) }
                           });
        },
        uncoverTo: function (incomingPane, outgoingPane, options) {
            var incomingZIndex = incomingPane.style.zIndex || 0;
            $(incomingPane).togglePane(true).setPanePosition();
            $(outgoingPane).css({ zIndex: incomingZIndex + 1 }).slidePane({ to: options });
        },
        'default': function (incomingPane, outgoingPane, options) {
            // No transition - just show instantly, and hide the previously active pane
            $(incomingPane).togglePane(true).setPanePosition();
            $(outgoingPane).togglePane(false);
        }
    };

    $.fn.showPane = function (options) {
        options = options || {};
        return this.each(function () {
            var activePane = findFirstChildWithClass(this.parentNode, "active");
            if (activePane === this) // Already shown
                return;

            // Find and invoke the requested transition
            var transitionToUse = 'default';
            for (var transitionKey in $.paneTransitions) {
                if ($.paneTransitions.hasOwnProperty(transitionKey) && options.hasOwnProperty(transitionKey)) {
                    transitionToUse = transitionKey;
                    break;
                }
            }
            $.paneTransitions[transitionKey](this, activePane, options[transitionKey]);

            // Keep track of which pane is active
            $(this).addClass("active");
            if (activePane)
                $(activePane).removeClass("active");
        });
    };

    $.fn.touchScroll = function (options) {
        if ($.isTouch && (vendor === "webkit" || vendor === "Moz")) {
            this.each(function () {
                new iScroll(this, options);
            });
        }
        return this;
    }

    $.fn.clickOrTouch = function (handler) {
        return this.on($.clickOrTouch, handler);
    }

    // Create missing event shortcuts for IE version of XUI
    var shortcuts = ['click'];
    for (var i = 0; i < shortcuts.length; i++) {
        var eventName = shortcuts[i];
        if (!$.fn[eventName]) {
            $.fn[eventName] = function (handler) {
                return this.on(eventName, handler);
            }
        }
    }
})(x$, window);