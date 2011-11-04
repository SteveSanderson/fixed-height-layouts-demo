(function() {
  var $, eventName, features, findFirstChildWithClass, oppositeDirection, oppositeTransition, _i, _len, _ref;
  var __hasProp = Object.prototype.hasOwnProperty, __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; }, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  };
  $ = x$;
  features = {
    vendor: /webkit/i.test(navigator.appVersion) ? 'webkit' : /firefox/i.test(navigator.userAgent) ? 'Moz' : 'opera' in window ? 'O' : '',
    isAndroid: /android/gi.test(navigator.appVersion)
  };
  features.useCssTransform = (!features.isAndroid) && (features.vendor + 'Transform' in document.documentElement.style);
  features.cssTransformPrefix = "-" + features.vendor.toLowerCase() + "-";
  features.transitionEndEvent = features.vendor === 'webkit' ? 'webkitTransitionEnd' : features.vendor === 'O' ? 'oTransitionEnd' : 'transitionend';
  $.isTouch = 'ontouchstart' in document.documentElement;
  $.clickOrTouch = $.isTouch ? 'touchstart' : 'click';
  features.supportsCssTouchScroll = typeof document.body.style.webkitOverflowScrolling !== "undefined";
  features.supportsIScroll = features.vendor === 'webkit' || features.vendor === "Moz";
  findFirstChildWithClass = function(elem, className) {
    var child;
    child = elem.firstChild;
    while (child) {
      if ($(child).hasClass(className)) {
        return child;
      }
      child = child.nextSibling;
    }
    return null;
  };
  oppositeDirection = {
    left: 'right',
    right: 'left',
    top: 'bottom',
    bottom: 'top'
  };
  oppositeTransition = function(transition) {
    var key;
    if (transition) {
      for (key in transition) {
        if (!__hasProp.call(transition, key)) continue;
        if ($.paneTransitionInverters.hasOwnProperty(key)) {
          return $.paneTransitionInverters[key](transition[key]);
        }
      }
    }
    return null;
  };
  $.getJSON = function(url, options) {
    var callback;
    callback = typeof options === "function" ? options : options.callback;
    return $(null).xhr(url, {
      method: options.method,
      async: true,
      data: JSON.stringify(options.data),
      headers: options.headers,
      callback: function() {
        return callback(JSON.parse(this.responseText));
      }
    });
  };
  $.map = function(items, map) {
    var item, mapped, results, _i, _len;
    results = [];
    for (_i = 0, _len = items.length; _i < _len; _i++) {
      item = items[_i];
      mapped = map(item);
      if (mapped !== void 0) {
        results.push(mapped);
      }
    }
    return results;
  };
  $.fn.togglePane = function(show) {
    return this.each(function() {
      if (show) {
        this.style.display = 'block';
        if (this.isOffScreen) {
          this.isOffScreen = false;
          this.style.top = '';
          this.style.bottom = '';
        }
      } else {
        this.isOffScreen = true;
        this.style.top = '10000px';
        this.style.bottom = '-10000px';
      }
      return this;
    });
  };
  $.fn.afterNextTransition = function(callback) {
    return this.each(function() {
      var elem, handlerWrapper;
      elem = this;
      handlerWrapper = function() {
        callback.apply(this, arguments);
        return elem.removeEventListener(features.transitionEndEvent, handlerWrapper);
      };
      return elem.addEventListener(features.transitionEndEvent, handlerWrapper);
    });
  };
  $.fn.animateTranslation = function(finalPos, transition, callback) {
    callback = callback || function() {
      return {};
    };
    return this.each(function() {
      var $this, transform;
      $this = $(this);
      if (features.useCssTransform) {
        transform = {};
        transform[features.cssTransformPrefix + "transform"] = "translate(" + finalPos.left + ", " + finalPos.top + ")";
        transform[features.cssTransformPrefix + "transition"] = transition ? features.cssTransformPrefix + "transform 250ms ease-out" : null;
        if (transition) {
          $this.afterNextTransition(callback);
        }
        $this.css(transform);
        if (!transition) {
          return callback();
        }
      } else {
        if (transition) {
          return $this.tween(finalPos, callback);
        } else {
          $this.css(finalPos);
          return callback();
        }
      }
    });
  };
  $.fn.setPanePosition = function(position, transition, callback) {
    callback = callback || function() {
      return {};
    };
    return this.each(function() {
      var $this, finalPos, height, width, x, y;
      $this = $(this).togglePane(true);
      x = 0;
      y = 0;
      width = this.parentNode.offsetWidth;
      height = this.parentNode.offsetHeight;
      switch (position) {
        case 'right':
          x = width;
          break;
        case 'left':
          x = -1 * width;
          break;
        case 'top':
          y = -1 * height;
          break;
        case 'bottom':
          y = height;
      }
      finalPos = {
        left: x + 'px',
        right: (-1 * x) + 'px',
        top: y + 'px',
        bottom: (-1 * y) + 'px'
      };
      return $this.animateTranslation(finalPos, transition, callback);
    });
  };
  $.fn.slidePane = function(options) {
    return this.each(function() {
      var $this, afterSlide;
      $this = $(this);
      afterSlide = function() {
        if (options.to) {
          $this.togglePane(false);
        }
        if (options.callback) {
          return options.callback();
        }
      };
      return $this.setPanePosition(options.from, null).setPanePosition(options.to, true, afterSlide);
    });
  };
  $.fn.showPane = function(options) {
    options = options || {};
    return this.each(function() {
      var activePane, transitionKey, transitionToUse, _ref;
      activePane = findFirstChildWithClass(this.parentNode, "active");
      if (activePane !== this) {
        $(this).has(".scroll-y.autoscroll").touchScroll({
          hScroll: false
        });
        $(this).has(".scroll-x.autoscroll").touchScroll({
          yScroll: false
        });
        transitionToUse = 'default';
        _ref = $.paneTransitions;
        for (transitionKey in _ref) {
          if (!__hasProp.call(_ref, transitionKey)) continue;
          if (options.hasOwnProperty(transitionKey)) {
            transitionToUse = transitionKey;
            break;
          }
        }
        $.paneTransitions[transitionKey](this, activePane, options[transitionKey]);
        $(this).addClass("active");
        if (activePane) {
          return $(activePane).removeClass("active");
        }
      }
    });
  };
  $.fn.showBySlidingParent = function() {
    return this.each(function() {
      var finalPos, targetPaneOffsetLeft, targetPaneOffsetTop;
      targetPaneOffsetLeft = this.style.left || '0px';
      targetPaneOffsetTop = this.style.top || '0px';
      finalPos = {
        left: '-' + targetPaneOffsetLeft,
        right: targetPaneOffsetLeft,
        top: '-' + targetPaneOffsetTop,
        bottom: targetPaneOffsetTop
      };
      $(this.parentNode).animateTranslation(finalPos, true);
      return this;
    });
  };
  $.fn.touchScroll = function(options) {
    if ((!features.supportsCssTouchScroll) && features.supportsIScroll) {
      this.each(function() {
        var doRefresh;
        if (!this.hasIScroll) {
          this.hasIScroll = new iScroll(this, options);
        }
        doRefresh = __bind(function() {
          return this.hasIScroll.refresh();
        }, this);
        setTimeout(doRefresh, 0);
        return this;
      });
    }
    return this;
  };
  $.fn.clickOrTouch = function(handler) {
    return this.on($.clickOrTouch, handler);
  };
  _ref = ['click'];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    eventName = _ref[_i];
    if (!$.fn[eventName]) {
      $.fn[eventName] = function(handler) {
        return this.on(eventName, handler);
      };
    }
  }
  $.paneTransitions = {
    slideFrom: function(incomingPane, outgoingPane, options) {
      $(incomingPane).slidePane({
        from: options
      });
      if (outgoingPane) {
        return $(outgoingPane).slidePane({
          to: oppositeDirection[options]
        });
      }
    },
    coverFrom: function(incomingPane, outgoingPane, options) {
      var outgoingZIndex;
      outgoingZIndex = (outgoingPane != null ? outgoingPane.style.zIndex : void 0) || 0;
      return $(incomingPane).css({
        zIndex: outgoingZIndex + 1
      }).slidePane({
        from: options,
        callback: function() {
          return $(outgoingPane).togglePane(false);
        }
      });
    },
    uncoverTo: function(incomingPane, outgoingPane, options) {
      var incomingZIndex;
      incomingZIndex = incomingPane.style.zIndex || 0;
      $(incomingPane).togglePane(true).setPanePosition();
      return $(outgoingPane).css({
        zIndex: incomingZIndex + 1
      }).slidePane({
        to: options
      });
    },
    "default": function(incomingPane, outgoingPane, options) {
      $(incomingPane).togglePane(true).setPanePosition();
      return $(outgoingPane).togglePane(false);
    }
  };
  $.paneTransitionInverters = {
    slideFrom: function(direction) {
      return {
        slideFrom: oppositeDirection[direction]
      };
    },
    coverFrom: function(direction) {
      return {
        uncoverTo: direction
      };
    },
    uncoverTo: function(direction) {
      return {
        coverFrom: direction
      };
    }
  };
  window.PaneHistory = (function() {
    function PaneHistory(initialEntries) {
      var _ref2;
      this.entries = initialEntries || [];
      this.position = this.entries.length - 1;
      if (((_ref2 = window.ko) != null ? _ref2.observable : void 0) != null) {
        this.current = window.ko.observable();
        this.refreshCurrent();
      }
    }
    PaneHistory.prototype.relative = function(offset) {
      return this.entries.slice(this.position + offset, this.position + offset + 1)[0];
    };
    PaneHistory.prototype.current = function() {
      return this.relative(0) || {
        paneData: {},
        paneIndex: void 0
      };
    };
    PaneHistory.prototype.currentData = function() {
      return this.current().paneData;
    };
    PaneHistory.prototype.refreshCurrent = function() {
      return this.current(this.relative(0) || {
        paneData: {},
        paneIndex: void 0
      });
    };
    PaneHistory.prototype.count = function() {
      return this.entries.slice(0).length;
    };
    PaneHistory.prototype.showCurrentPane = function(transition) {
      return $('#' + this.current().paneId).showPane(transition || this.current().transition);
    };
    PaneHistory.prototype.navigate = function(paneId, paneData, transition) {
      var deleteCount, transitionToUse;
      deleteCount = this.count() - (this.position + 1);
      this.entries.splice(this.position + 1, deleteCount);
      transitionToUse = transition !== void 0 ? transition : this.position >= 0 ? {
        slideFrom: "right"
      } : null;
      this.entries.push({
        paneId: paneId,
        paneData: paneData,
        paneIndex: this.entries.slice(0).length,
        transition: transitionToUse
      });
      this.position++;
      this.refreshCurrent();
      return this.showCurrentPane();
    };
    PaneHistory.prototype.back = function(transition) {
      var currentTransition, transitionToUse;
      if (this.position > 0) {
        currentTransition = this.current().transition;
        this.position--;
        this.refreshCurrent();
        transitionToUse = transition !== void 0 ? transition : oppositeTransition(currentTransition);
        return this.showCurrentPane(transitionToUse);
      }
    };
    return PaneHistory;
  })();
  window.UrlLinkedPaneHistory = (function() {
    __extends(UrlLinkedPaneHistory, window.PaneHistory);
    function UrlLinkedPaneHistory(options) {
      var handleStateChange;
      UrlLinkedPaneHistory.__super__.constructor.call(this, options.entries);
      this.urlLinkOptions = options;
      handleStateChange = __bind(function() {
        return this.navigate(this.getCurrentUrlParams(), void 0, true);
      }, this);
      handleStateChange();
      History.Adapter.bind(window, 'statechange', handleStateChange);
    }
    UrlLinkedPaneHistory.prototype.getCurrentUrlParams = function() {
      var allUrlParams;
      allUrlParams = this._parseQueryString(History.getState().url);
      return this._extractProperties(allUrlParams, this.urlLinkOptions.params);
    };
    UrlLinkedPaneHistory.prototype.setCurrentUrlParams = function(params) {
      var key, newUrl, urlValues, _ref2;
      urlValues = this._parseQueryString(History.getState().url);
      _ref2 = this.urlLinkOptions.params;
      for (key in _ref2) {
        if (!__hasProp.call(_ref2, key)) continue;
        if (params.hasOwnProperty(key) && (params[key] !== this.urlLinkOptions.params[key])) {
          urlValues[key] = params[key];
        } else {
          delete urlValues[key];
        }
      }
      newUrl = this._formatQueryString(urlValues);
      return History.pushState(null, null, newUrl);
    };
    UrlLinkedPaneHistory.prototype.navigate = function(params, transition, isExternalNavigation) {
      var forwardsEntry, onLoadedData, paneId, _ref2, _ref3;
      paneId = this._createPaneId(params);
      if (((_ref2 = this.current()) != null ? _ref2.paneId : void 0) === paneId) {
        return;
      }
      if (((_ref3 = this.relative(-1)) != null ? _ref3.paneId : void 0) === paneId) {
        if (isExternalNavigation) {
          UrlLinkedPaneHistory.__super__.back.call(this, transition);
        } else {
          History.back();
        }
        return;
      }
      forwardsEntry = this.relative(1);
      if (forwardsEntry && (forwardsEntry.paneId === paneId)) {
        if (transition === void 0) {
          transition = forwardsEntry.transition;
        }
      }
      onLoadedData = __bind(function(data, transitionOverride) {
        UrlLinkedPaneHistory.__super__.navigate.call(this, paneId, data, transitionOverride || transition);
        if (!isExternalNavigation) {
          return this.setCurrentUrlParams(params);
        }
      }, this);
      return setTimeout((__bind(function() {
        if (this.urlLinkOptions.loadPaneData) {
          return this.urlLinkOptions.loadPaneData.call(this, params, onLoadedData);
        } else {
          return onLoadedData(null);
        }
      }, this)), 0);
    };
    UrlLinkedPaneHistory.prototype.back = function() {
      throw new Error('Cannot use "back" on specific URL-linked history trackers, because URL history is global. Use History.back() instead.');
    };
    UrlLinkedPaneHistory.prototype._parseQueryString = function(url) {
      var pair, query, result, tokens, _j, _len2, _ref2;
      if (url.indexOf('?') < 0) {
        return {};
      }
      query = url.substring(url.lastIndexOf('?') + 1);
      result = {};
      _ref2 = query.split("&");
      for (_j = 0, _len2 = _ref2.length; _j < _len2; _j++) {
        pair = _ref2[_j];
        tokens = pair.split("=");
        if (tokens.length === 2) {
          result[tokens[0]] = decodeURIComponent(tokens[1]);
        }
      }
      return result;
    };
    UrlLinkedPaneHistory.prototype._formatQueryString = function(params) {
      var formattedUrl, key, value;
      formattedUrl = '?';
      for (key in params) {
        if (!__hasProp.call(params, key)) continue;
        value = params[key];
        if (formattedUrl !== '?') {
          formattedUrl += '&';
        }
        formattedUrl += key + '=' + encodeURIComponent(value);
      }
      return formattedUrl;
    };
    UrlLinkedPaneHistory.prototype._createPaneId = function(params) {
      var id, key, paramsWithDefaults;
      paramsWithDefaults = this._extractProperties(params, this.urlLinkOptions.params);
      id = '';
      for (key in paramsWithDefaults) {
        if (!__hasProp.call(paramsWithDefaults, key)) continue;
        if (id) {
          id += '_';
        }
        id += key + '-' + paramsWithDefaults[key];
      }
      return (this.urlLinkOptions.idPrefix || '') + id;
    };
    UrlLinkedPaneHistory.prototype._extractProperties = function(obj, propertiesWithDefaults) {
      var key, result;
      result = {};
      for (key in propertiesWithDefaults) {
        if (!__hasProp.call(propertiesWithDefaults, key)) continue;
        result[key] = obj.hasOwnProperty(key) ? obj[key] : propertiesWithDefaults[key];
      }
      return result;
    };
    return UrlLinkedPaneHistory;
  })();
}).call(this);
