$ = x$

# Feature detection
features =
    vendor:
        if (/webkit/i).test(navigator.appVersion) then		'webkit'
        else if (/firefox/i).test(navigator.userAgent) then 'Moz'
        else if 'opera' of window then						'O'
        else ''
    isAndroid: (/android/gi).test(navigator.appVersion)

features.useCssTransform = (!features.isAndroid) && (features.vendor + 'Transform' of document.documentElement.style)
features.cssTransformPrefix = "-" + features.vendor.toLowerCase() + "-"
features.transitionEndEvent =
    if features.vendor == 'webkit' then 'webkitTransitionEnd'
    else if features.vendor == 'O' then 'oTransitionEnd'
    else 'transitionend'
    
$.isTouch = 'ontouchstart' of document.documentElement
$.clickOrTouch = if $.isTouch then 'touchstart' else 'click'
features.supportsCssTouchScroll = (typeof document.body.style.webkitOverflowScrolling != "undefined") # Currently only iOS 5 can do native touch scrolling
features.supportsIScroll = (features.vendor == 'webkit' || features.vendor == "Moz")

# Utilities
findFirstChildWithClass = (elem, className) ->
    child = elem.firstChild
    while child
        if $(child).hasClass(className) then return child
        child = child.nextSibling
    return null

oppositeDirection = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' }
oppositeTransition = (transition) ->
    if transition
        for own key of transition
            if $.paneTransitionInverters.hasOwnProperty(key)
                return $.paneTransitionInverters[key](transition[key])
    null

# Implement $.getJSON and $.map like jQuery does
$.getJSON = (url, options) ->
    callback = if typeof options == "function" then options else options.callback
    $(null).xhr(url, {
        method: options.method,
        async: true,
        data: JSON.stringify(options.data),
        headers: options.headers,
        callback: ->
            callback(JSON.parse(this.responseText))
    })

$.map = (items, map) ->
    results = []
    for item in items
        mapped = map(item)
        if mapped != undefined
            results.push(mapped)
    results

# XUI extensions
$.fn.togglePane = (show) ->
    @each ->
        # Can't just toggle display:block/none, as that resets any scroll positions within the pane
        # Can't just toggle visibility:visible/hidden either, as Safari iOS still sends events (e.g., taps) into the element
        # So, just move it very far away
        if show
            @style.display = 'block'
            if @isOffScreen
                @isOffScreen = false
                @style.top = ''
                @style.bottom = ''
        else
            @isOffScreen = true
            @style.top = '10000px'
            @style.bottom = '-10000px'
        this

$.fn.afterNextTransition = (callback) ->
    @each ->
        elem = this
        handlerWrapper = () ->
            callback.apply(this, arguments)
            elem.removeEventListener(features.transitionEndEvent, handlerWrapper)
        elem.addEventListener(features.transitionEndEvent, handlerWrapper);

$.fn.animateTranslation = (finalPos, transition, callback) ->
    callback = callback || () -> { }
    @each ->		
        $this = $(this)
        if features.useCssTransform
            transform = {}
            transform[features.cssTransformPrefix + "transform"] = "translate(" + finalPos.left + ", " + finalPos.top + ")"
            transform[features.cssTransformPrefix + "transition"] = if transition then features.cssTransformPrefix + "transform 250ms ease-out" else null

            if transition
                $this.afterNextTransition(callback)

            $this.css(transform)
            if !transition
                callback()
        else
            if transition
                $this.tween(finalPos, callback)
            else
                $this.css(finalPos)
                callback()

$.fn.setPanePosition = (position, transition, callback) ->
    callback = callback || () -> { }
    
    @each ->
        $this = $(this).togglePane(true)
        x = 0
        y = 0
        width = @parentNode.offsetWidth
        height = @parentNode.offsetHeight

        switch position
            when 'right'  then x = width
            when 'left'   then x = -1 * width
            when 'top'    then y = -1 * height
            when 'bottom' then y = height

        finalPos = { left: x + 'px', right: (-1 * x) + 'px', top: y + 'px', bottom: (-1 * y) + 'px' }
        $this.animateTranslation(finalPos, transition, callback)

$.fn.slidePane = (options) ->
    @each ->
        $this = $(this)
        afterSlide = ->
            if options.to then $this.togglePane(false)
            if options.callback then options.callback()
        $this.setPanePosition(options.from, null)
             .setPanePosition(options.to, true, afterSlide)

$.fn.showPane = (options) ->
    options = options || {}
    @each ->
        activePane = findFirstChildWithClass(this.parentNode, "active")
        if activePane != this # Not already shown
            $(this).has(".scroll-y.autoscroll").touchScroll({ hScroll: false })
            $(this).has(".scroll-x.autoscroll").touchScroll({ yScroll: false })

            # Find and invoke the requested transition
            transitionToUse = 'default'
            for own transitionKey of $.paneTransitions
                if options.hasOwnProperty(transitionKey)
                    transitionToUse = transitionKey
                    break
            $.paneTransitions[transitionKey](this, activePane, options[transitionKey])

            # Keep track of which pane is active			
            $(this).addClass("active")
            if activePane
                $(activePane).removeClass("active")

$.fn.showBySlidingParent = ->
    @each ->                   
        targetPaneOffsetLeft = @style.left || '0px'
        targetPaneOffsetTop = @style.top || '0px'
        finalPos =
            left: '-' + targetPaneOffsetLeft
            right: targetPaneOffsetLeft
            top: '-' + targetPaneOffsetTop
            bottom: targetPaneOffsetTop
        $(@parentNode).animateTranslation(finalPos, true)
        this

$.fn.touchScroll = (options) ->
    if (!features.supportsCssTouchScroll) && features.supportsIScroll
        @each -> 
            if !@hasIScroll
                @hasIScroll = new iScroll(this, options)
            doRefresh = => @hasIScroll.refresh()
            setTimeout(doRefresh, 0) 
            this
    this

$.fn.clickOrTouch = (handler) ->
    @on($.clickOrTouch, handler)

# Create missing event shortcuts for IE version of XUI
for eventName in ['click']
    if (!$.fn[eventName])
        $.fn[eventName] = (handler) -> @on(eventName, handler)

# Transitions
$.paneTransitions =
    slideFrom: (incomingPane, outgoingPane, options) ->
        $(incomingPane).slidePane({ from: options })
        if outgoingPane
            $(outgoingPane).slidePane({ to: oppositeDirection[options] })

    coverFrom: (incomingPane, outgoingPane, options) ->
        outgoingZIndex = outgoingPane?.style.zIndex || 0
        $(incomingPane).css({ zIndex: outgoingZIndex + 1 })
                        .slidePane({
                            from: options,
                            callback: () -> $(outgoingPane).togglePane(false)
                        })
    
    uncoverTo: (incomingPane, outgoingPane, options) -> 
        incomingZIndex = incomingPane.style.zIndex || 0;
        $(incomingPane).togglePane(true).setPanePosition()
        $(outgoingPane).css({ zIndex: incomingZIndex + 1 }).slidePane({ to: options })
    
    default: (incomingPane, outgoingPane, options) ->
        # No transition - just show instantly, and hide the previously active pane
        $(incomingPane).togglePane(true).setPanePosition()
        $(outgoingPane).togglePane(false)

$.paneTransitionInverters =
    slideFrom: (direction) -> { slideFrom: oppositeDirection[direction] }
    coverFrom: (direction) -> { uncoverTo: direction }
    uncoverTo: (direction) -> { coverFrom: direction }

# Pane history - underlying non-URL-linked helper
class window.PaneHistory
    constructor: (initialEntries) ->
        @entries = initialEntries || []
        @position = @entries.length - 1
        if window.ko?.observable?
            @current = window.ko.observable()
            @refreshCurrent()

    relative: (offset) -> 
        @entries.slice(@position + offset, @position + offset + 1)[0]

    current: -> @relative(0)

    refreshCurrent: -> @current(@relative(0) || { paneData: {}, paneIndex: undefined })

    count: -> @entries.slice(0).length

    showCurrentPane: (transition) ->		
        $('#' + @current().paneId).showPane(transition || @current().transition)

    navigate: (paneId, paneData, transition) ->
        # Clear "forward" items
        deleteCount = @count() - (@position + 1)
        @entries.splice(@position + 1, deleteCount) 

        transitionToUse = 
            if transition != undefined then transition 
            else if @position >= 0 then { slideFrom: "right" }
            else null
        @entries.push({ paneId: paneId, paneData: paneData, paneIndex: @entries.slice(0).length, transition: transitionToUse })
        @position++
        @refreshCurrent()
        @showCurrentPane()

    back: (transition) ->
        if @position > 0
            currentTransition = @current().transition
            @position--
            @refreshCurrent()
            transitionToUse = 
                if transition != undefined then transition
                else oppositeTransition(currentTransition)
            @showCurrentPane(transitionToUse)

# Pane history - URL-linked version
class window.UrlLinkedPaneHistory extends window.PaneHistory
    constructor: (options) ->
        super(options.entries)
        @urlLinkOptions = options

        # Load initial state
        handleStateChange = => @navigate(@getCurrentUrlParams(), undefined, true)
        handleStateChange()
        History.Adapter.bind(window, 'statechange', handleStateChange)

    getCurrentUrlParams: ->
        allUrlParams = @_parseQueryString(History.getState().url)
        @_extractProperties(allUrlParams, @urlLinkOptions.params)

    setCurrentUrlParams: (params) ->
        # Construct an updated representation of the URL params
        urlValues = @_parseQueryString(History.getState().url)
        for own key of @urlLinkOptions.params
            # If you specify a nondefault value, put it in the URL. Otherwise, remove this param from the URL.
            if params.hasOwnProperty(key) && (params[key] != @urlLinkOptions.params[key])
                urlValues[key] = params[key]
            else
                delete urlValues[key]
        newUrl = @_formatQueryString(urlValues)
        History.pushState(null, null, newUrl)

    navigate: (params, transition, isExternalNavigation) ->
        # Are we already there?
        paneId = @_createPaneId(params)
        if @current()?.paneId == paneId
            return
            
        # Is this a "back"?
        if @relative(-1)?.paneId == paneId
            if isExternalNavigation
                UrlLinkedPaneHistory.__super__.back.call(this, transition)
            else
                History.back() # Convert programmatic "back" to a real "back"
            return

        # Is this a "forwards"? (If so, still load new data, but reuse its forwards transition)
        forwardsEntry = @relative(1)
        if forwardsEntry && (forwardsEntry.paneId == paneId)
            if transition == undefined
                transition = forwardsEntry.transition

        # Load data and go forwards to it
        onLoadedData = (data) =>
            UrlLinkedPaneHistory.__super__.navigate.call(this, paneId, data, transition)
            if !isExternalNavigation
                @setCurrentUrlParams(params)

        # Force asynchrony to ensure consistency between the Ajax-load and immediate-load scenarios
        setTimeout ( =>
            if @urlLinkOptions.loadPaneData
                @urlLinkOptions.loadPaneData(params, onLoadedData)
            else
                onLoadedData(null)
        ), 0

    back: ->
        throw new Error('Cannot use "back" on specific URL-linked history trackers, because URL history is global. Use History.back() instead.')

    _parseQueryString: (url) ->
        if url.indexOf('?') < 0 then return {}
        query = url.substring(url.lastIndexOf('?') + 1)
        result = {}
        for pair in query.split("&")
            tokens = pair.split("=")
            if (tokens.length == 2)
                result[tokens[0]] = decodeURIComponent(tokens[1])
        result

    _formatQueryString: (params) ->
        formattedUrl = '?'
        for own key, value of params
            if formattedUrl != '?'
                formattedUrl += '&'
            formattedUrl += key + '=' + encodeURIComponent(value)
        formattedUrl

    _createPaneId: (params) ->
        # A one-way function that constructs a legal unique element ID 
        # ("unique" in the injective sense, i.e. (x != y) implies (f(x) != f(y)))
        paramsWithDefaults = @_extractProperties(params, @urlLinkOptions.params)
        id = ''
        for own key of paramsWithDefaults
            if id then id += '_'
            id += key + '-' + paramsWithDefaults[key]
        (@urlLinkOptions.idPrefix || '') + id

    _extractProperties: (obj, propertiesWithDefaults) ->
        # Returns an object that has the same own properties as "propertiesWithDefaults", 
        # with values taken from "obj" where available and "propertiesWithDefaults" where not
        result = {}
        for own key of propertiesWithDefaults
            result[key] = if obj.hasOwnProperty(key) then obj[key] else propertiesWithDefaults[key]
        result