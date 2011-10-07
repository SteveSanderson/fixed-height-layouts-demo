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

    $.fn.setPanePosition = function (position, transition) {
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

                if (transition && position)
                    $this.afterNextTransition(function () { $this.togglePane(false) });
                $this.css(transform);
            } else {
                var afterTransition = function () {
                    if (position) {
                        $this.togglePane(false);
                    }
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
                               .setPanePosition(options.to, true);
        });
    };

    $.fn.showPane = function (options) {
        return this.each(function () {
            var activePane = findFirstChildWithClass(this.parentNode, "active");
            if (activePane === this) // Already shown
                return;

            if (options && options.slideFrom) {
                $(this).slidePane({ from: options.slideFrom });
                if (activePane)
                    $(activePane).slidePane({ to: oppositeDirection(options.slideFrom) });
            } else {
                // No transition - just show instantly, and hide the previously active pane
                $(this).togglePane(true);
                $(activePane).togglePane(false);
            }

            // Keep track of which pane is active
            $(this).addClass("active");
            if (activePane)
                $(activePane).removeClass("active");
        });
    };

    $.fn.delegateClass = function (matchClass, eventName, handler) {
        this.on(eventName, function (evt) {
            var elem = evt.target || evt.srcElement;
            while (elem) {
                if ($(elem).hasClass(matchClass)) {
                    return handler.call(elem, evt);
                }

                elem = elem.parentNode;
            }
        })
    }

    $.fn.touchScroll = function (options) {
        if (vendor === "webkit" || vendor === "Moz") {
            this.each(function () {
                new iScroll(this, options);
            });
        }
        return this;
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

    // Elements with class "pane-nav" and attribute "rel" cause the specified pane to be shown
    function handleDeclarativePaneNav() {
        var rel = this.getAttribute("rel");
        if (rel) {
            var transitionAttrib = this.getAttribute("data-transition"), transition = {};
            if (transitionAttrib) {
                var tokens = transitionAttrib.split("-");
                transition[tokens[0]] = tokens[1];
            }
            $(rel).showPane(transition);
        }
        return false;
    }

    $(document).delegateClass("pane-nav", $.clickOrTouch, handleDeclarativePaneNav);
})(x$, window);