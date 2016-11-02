tui.util.defineNamespace("fedoc.content", {});
fedoc.content["virtualScroll.js.html"] = "      <div id=\"main\" class=\"main\">\n\n\n\n    \n    <section>\n        <article>\n            <pre class=\"prettyprint source linenums\"><code>/**\n * @fileoverview Virtual scroll component.\n * @author NHN Ent.\n *         FE Development Lab &lt;dl_javascript@nhnent.com>\n */\n\n'use strict';\n\nvar eventListener = require('./eventListener');\n\nvar DEFAULT_CONTENT_HEIGHT = 50;\nvar DEFAULT_SPARE_ITEM_COUNT = 5;\nvar DEFAULT_THRESHOLD = 300;\nvar DEFAULT_LAYOUT_HEIGHT = 400;\nvar PUBLIC_EVENT_SCROLL = 'scroll';\nvar PUBLIC_EVENT_SCROLL_TOP = 'scrollTop';\nvar PUBLIC_EVENT_SCROLL_BOTTOM = 'scrollBottom';\nvar CSS_PX_PROP_MAP = {\n    'height': true,\n    'margin-top': true\n};\n\nvar VirtualScroll = tui.util.defineClass(/** @lends VirtualScroll.prototype */{\n    /**\n     * Virtual scroll component.\n     * @constructs VirtualScroll\n     * @param {HTMLElement|String} container - container element or id\n     * @param {object} options - virtual scroll component  options\n     *      @param {?Array.&lt;String>} options.items - items\n     *      @param {?Number} options.spareItemCount - count of spare items for display items\n     *      @param {?Number} options.itemHeight - item height\n     *      @param {?Number} options.threshold - pixel height from edge(start, end) of content\n     *                                           for determining need emit scrollTop, scrollBottom event\n     *      @param {?Number} options.layoutHeight - layout height\n     *      @param {?Number} options.scrollPosition - scroll position\n     *\n     */\n    init: function(container, options) {\n        options = options || {};\n        options.scrollPosition = options.scrollPosition || 0;\n\n        /**\n         * last rendered scroll position\n         * @type {Number}\n         */\n        this.lastRenderedScrollPosition = options.scrollPosition;\n\n        /**\n         * previous scroll position\n         * @type {?Number}\n         */\n        this.prevScrollPosition = options.scrollPosition;\n\n        /**\n         * the state being a public event occurs\n         * @type {boolean}\n         */\n        this.publicEventMode = false;\n\n        this._initData(options);\n\n        /**\n         * container element\n         * @type {HTMLElement}\n         */\n        this.container = tui.util.isString(container) ? document.getElementById(container) : container;\n\n        /**\n         * layout element\n         * @type {HTMLElement}\n         */\n        this.layout = this._renderLayout(this.container);\n\n        this._renderContents(options.scrollPosition);\n        this._attachEvent();\n    },\n\n    /**\n     * Make item position list.\n     * @param {Number} itemHeightList - item height list\n     * @returns {Array}\n     * @private\n     */\n    _makeItemPositionList: function(itemHeightList) {\n        var startPosition = 0;\n\n        return tui.util.map(itemHeightList, function(itemHeight) {\n            var itemPosition = {\n                start: startPosition,\n                end: startPosition + itemHeight\n            };\n\n            startPosition = itemPosition.end;\n\n            return itemPosition;\n        });\n    },\n\n    /**\n     * Update item data.\n     * @private\n     */\n    _updateItemData: function() {\n        this.itemHeightList = tui.util.pluck(this.items, 'height');\n        this.itemPositionList = this._makeItemPositionList(this.itemHeightList);\n    },\n\n    /**\n     * Whether plus number or not.\n     * @param {Number} value - value\n     * @returns {boolean}\n     * @private\n     */\n    _isPlusNumber: function(value) {\n        return tui.util.isNumber(value) &amp;&amp; !isNaN(value) &amp;&amp; (value >= 0);\n    },\n\n    /**\n     * Initialize data.\n     * @param {object} options - virtual scroll component options\n     *      @param {?Array.&lt;String>} options.items - items\n     *      @param {?Number} options.spareItemCount - count of spare items for display items\n     *      @param {?Number} options.itemHeight - default item height\n     *      @param {?Number} options.threshold - pixel height from edge(start, end) of content\n     *                                           for determining need emit scrollTop, scrollBottom event\n     *      @param {?Number} options.layoutHeight - layout height\n     *      @param {?Number} options.scrollPosition - scroll position\n     * @private\n     */\n    _initData: function(options) {\n        var spareItemCount = options.spareItemCount;\n        var itemHeight = options.itemHeight;\n        var layoutHeight = options.layoutHeight;\n        var threshold = options.threshold;\n\n        /**\n         * items for rendering contents.\n         * @type {Array.&lt;{height: Number, contents: String}>}\n         */\n        this.items = [];\n\n        /**\n         * item height list.\n         * @type {Array.&lt;Number>}\n         */\n        this.itemHeightList = [];\n\n        /**\n         * item position list.\n         * @type {Array.&lt;Number>}\n         */\n        this.itemPositionList = [];\n\n        /**\n         * item height for rendering item.\n         * @type {Number}\n         */\n        this.itemHeight = this._isPlusNumber(itemHeight) ? itemHeight : DEFAULT_CONTENT_HEIGHT;\n\n        /**\n         * spare item count for rendering margin of wrapper area\n         * @type {Number}\n         */\n        this.spareItemCount = this._isPlusNumber(spareItemCount) ? spareItemCount : DEFAULT_SPARE_ITEM_COUNT;\n\n        /**\n         * pixel height from edge(start, end) of content for determining need emit scrollTop, scrollBottom event\n         * @type {number}\n         */\n        this.threshold = this._isPlusNumber(threshold) ? threshold : DEFAULT_THRESHOLD;\n\n        /**\n         * layout height for rendering layout\n         * @type {Number}\n         */\n        this.layoutHeight = this._isPlusNumber(layoutHeight) ? layoutHeight : DEFAULT_LAYOUT_HEIGHT;\n\n        /**\n         * limit scroll value for rerender\n         * @type {number}\n         */\n        this.limitScrollValueForRerender = (this.spareItemCount / 2 * this.itemHeight);\n\n        this._insertItems(options.items || [], 0);\n        this._updateItemData();\n    },\n\n    /**\n     * Create cssText.\n     * @param {Object.&lt;String, Number>} cssMap - css map\n     * @returns {String}\n     * @private\n     */\n    _createCssText: function(cssMap) {\n        return tui.util.map(cssMap, function(value, property) {\n            var surffix = CSS_PX_PROP_MAP[property] ? 'px' : '';\n\n            return property + ':' + value + surffix;\n        }).join(';');\n    },\n\n    /**\n     * Create div html.\n     * @param {Object.&lt;String, String>} attrMap - attribute map\n     * @param {String} innerHtml - html string\n     * @returns {String}\n     * @private\n     */\n    _createDivHtml: function(attrMap, innerHtml) {\n        var attrString = tui.util.map(attrMap, function(value, property) {\n            return property + '=\"' + value + '\"';\n        }).join(' ');\n\n        return '&lt;div ' + attrString + '>' + innerHtml + '&lt;/div>';\n    },\n\n    /**\n     * Render layout.\n     * @param {HTMLElement} container - container element\n     * @returns {HTMLElement}\n     * @private\n     */\n    _renderLayout: function(container) {\n        var cssText;\n\n        if (!container) {\n            throw new Error('Not exist HTML container');\n        }\n\n        if (!tui.util.isHTMLTag(container)) {\n            throw new Error('This container is not a HTML element');\n        }\n\n        cssText = this._createCssText({\n            'width': '100%',\n            'height': this.layoutHeight,\n            'overflow-y': 'auto',\n            '-webkit-overflow-scrolling': 'touch'\n        });\n\n        container.innerHTML = this._createDivHtml({\n            'style': cssText\n        });\n\n        return container.firstChild;\n    },\n\n    /**\n     * Find actual start index in itemPositionList by scrollPosition.\n     * @param {Array.&lt;{start: number, end: number}>} itemPositionList - item position list\n     * @param {Number} scrollPosition - scroll position\n     * @returns {Number | null}\n     * @private\n     */\n    _findActualStartIndex: function(itemPositionList, scrollPosition) {\n        var foundIndex = null;\n\n        scrollPosition = scrollPosition || 0;\n        tui.util.forEachArray(itemPositionList, function(itemPosition, index) {\n            if (itemPosition.start &lt;= scrollPosition &amp;&amp; itemPosition.end > scrollPosition) {\n                foundIndex = index;\n            }\n\n            return tui.util.isEmpty(foundIndex);\n        });\n\n        if (itemPositionList.length &amp;&amp; tui.util.isNull(foundIndex)) {\n            foundIndex = itemPositionList.length - 1;\n        }\n\n        return foundIndex;\n    },\n\n    /**\n     * Calculate display count.\n     * @param {Array.&lt;Number>} displayItemHeights - item height list for display;\n     * @returns {number}\n     * @private\n     */\n    _calculateDisplayCount: function(displayItemHeights) {\n        var layoutHeight = this.layoutHeight;\n        var cumulativeHeight = 0;\n        var displayCount = 0;\n\n        tui.util.forEachArray(displayItemHeights, function(height) {\n            cumulativeHeight += height;\n            displayCount += 1;\n\n            return cumulativeHeight &lt; layoutHeight;\n        });\n\n        return displayCount;\n    },\n\n    /**\n     * Create index range.\n     * @param {Number} scrollPosition - scrollPosition for scroll\n     * @returns {{start: Number, end: Number}}\n     * @private\n     */\n    _createIndexRange: function(scrollPosition) {\n        var itemHeightList = this.itemHeightList;\n        var maximumEndIndex = itemHeightList.length;\n        var spareItemCount = this.spareItemCount;\n        var actualStartIndex = this._findActualStartIndex(this.itemPositionList, scrollPosition);\n        var displayCount = this._calculateDisplayCount(itemHeightList.slice(actualStartIndex));\n        var startIndex = Math.max(actualStartIndex - spareItemCount, 0);\n        var endIndex = Math.min(actualStartIndex + displayCount + spareItemCount, maximumEndIndex);\n\n        return {\n            start: startIndex,\n            end: endIndex\n        };\n    },\n\n    /**\n     * Create items html.\n     * @param {Number} startIndex - start index\n     * @param {Number} endIndex - end index\n     * @returns {String}\n     * @private\n     */\n    _createItemsHtml: function(startIndex, endIndex) {\n        var renderItems = this.items.slice(startIndex, endIndex);\n        var baseCssTextMap = {\n            'width': '100%',\n            'overflow-y': 'hidden'\n        };\n\n        return tui.util.map(renderItems, function(item) {\n            baseCssTextMap.height = item.height || this.itemHeight;\n\n            return this._createDivHtml({\n                'style': this._createCssText(baseCssTextMap)\n            }, item.contents);\n        }, this).join('');\n    },\n\n    /**\n     * Sum values.\n     * @param {Array.&lt;Number>} values - values\n     * @returns {number}\n     * @private\n     */\n    _sum: function(values) {\n        var copyValues = values.slice();\n\n        copyValues.unshift(0);\n        return tui.util.reduce(copyValues, function(base, add) {\n            return base + add;\n        });\n    },\n\n    /**\n     * Create cssText for item wrapper element.\n     * @param {Number} startIndex - start index\n     * @returns {String}\n     * @private\n     */\n    _createItemWrapperCssText: function(startIndex) {\n        var itemHeightList = this.itemHeightList;\n        var marginTop = this._sum(itemHeightList.slice(0, startIndex));\n        var height = this._sum(itemHeightList) - marginTop;\n\n        return this._createCssText({\n            'width': '100%',\n            'height': height,\n            'margin-top': marginTop,\n            'overflow-y': 'hidden'\n        });\n    },\n\n    /**\n     * Create html for item wrapper element\n     * @param {Number} scrollPosition - scroll position\n     * @returns {String}\n     * @private\n     */\n    _createItemWrapperHtml: function(scrollPosition) {\n        var indexRange = this._createIndexRange(scrollPosition);\n        var innerHtml = this._createItemsHtml(indexRange.start, indexRange.end);\n        var cssText = this._createItemWrapperCssText(indexRange.start);\n\n        return this._createDivHtml({'style': cssText}, innerHtml);\n    },\n\n    /**\n     * Render contents.\n     * @param {?Number} scrollPosition - scroll position\n     * @private\n     */\n    _renderContents: function(scrollPosition) {\n        var layout = this.layout;\n\n        layout.innerHTML = this._createItemWrapperHtml(scrollPosition || Math.max(this.layout.scrollTop, 0));\n\n        if (!tui.util.isExisty(scrollPosition)) {\n            return;\n        }\n\n        setTimeout(function() {\n            layout.scrollTop = scrollPosition;\n        });\n    },\n\n    /**\n     * Fire public event.\n     * @param {String} eventName - event name\n     * @param {{scrollPosition: Number, scrollHeight: number}} eventData - event data\n     * @private\n     */\n    _firePublicEvent: function(eventName, eventData) {\n        if (this.publicEventMode) {\n            return;\n        }\n\n        this.fire(eventName, eventData);\n        this.publicEventMode = true;\n    },\n\n    /**\n     * Handler for scroll event.\n     * @private\n     */\n    _onScroll: function() {\n        var scrollPosition = Math.max(this.layout.scrollTop, 0);\n        var scrollHeight = this.layout.scrollHeight - this.layout.offsetHeight;\n        var eventData = {\n            scrollPosition: scrollPosition,\n            scrollHeight: scrollHeight\n        };\n\n        /**\n         * Occurs when the scroll event.\n         * @api\n         * @event VirtualScroll#scroll\n         * @property {object} eventData - event data\n         *      @property {number} eventData.scrollPosition - current scroll position\n         *      @property {number} eventData.scrollHeight - scroll height\n         *      @property {number} eventData.movedPosition - moved position\n         */\n        this.fire(PUBLIC_EVENT_SCROLL, tui.util.extend({\n            movedPosition: this.prevScrollPosition - scrollPosition\n        }, eventData));\n\n        this.prevScrollPosition = scrollPosition;\n\n        if (scrollPosition >= (scrollHeight - this.threshold)) {\n            /**\n             * Occurs when the scroll position is arrived bottom.\n             * @api\n             * @event VirtualScroll#scrollBottom\n             * @property {object} eventData - event data\n             *      @property {number} eventData.scrollPosition - current scroll position\n             *      @property {number} eventData.scrollHeight - scroll height\n             */\n            this._firePublicEvent(PUBLIC_EVENT_SCROLL_BOTTOM, eventData);\n        } else if (scrollPosition &lt;= this.threshold) {\n            /**\n             * Occurs when the scroll position is arrived top.\n             * @api\n             * @event VirtualScroll#scrollTop\n             * @property {object} eventData - event data\n             *      @property {number} eventData.scrollPosition - current scroll position\n             *      @property {number} eventData.scrollHeight - scroll height\n             */\n            this._firePublicEvent(PUBLIC_EVENT_SCROLL_TOP, eventData);\n        } else {\n            this.publicEventMode = false;\n        }\n\n        if (Math.abs(this.lastRenderedScrollPosition - scrollPosition) &lt; this.limitScrollValueForRerender) {\n            return;\n        }\n\n        this.lastRenderedScrollPosition = scrollPosition;\n\n        this._renderContents();\n    },\n\n    /**\n     * Attach event.\n     * @private\n     */\n    _attachEvent: function() {\n        eventListener.on(this.layout, 'scroll', this._onScroll, this);\n    },\n\n    /**\n     * Correct items.\n     * @param {Array.&lt;Object | String>} items - items\n     * @returns {Array.&lt;{height: number, contents: String}>}\n     * @private\n     */\n    _correctItems: function(items) {\n        var correctedItems = [];\n\n        tui.util.forEachArray(items, function(item) {\n            if (tui.util.isObject(item)) {\n                item.height = tui.util.isNumber(item.height) ? item.height : this.itemHeight;\n                correctedItems.push(item);\n            } else if (tui.util.isExisty(item)) {\n                correctedItems.push({\n                    height: this.itemHeight,\n                    contents: String(item)\n                });\n            }\n        }, this);\n\n        return correctedItems;\n    },\n\n    /**\n     * Insert items.\n     * @param {Array.&lt;Object | String>} items - items\n     * @param {?Number} startIndex - start index for append\n     * @private\n     */\n    _insertItems: function(items, startIndex) {\n        items = this._correctItems(items);\n        this.items.splice.apply(this.items, [startIndex, 0].concat(items));\n    },\n\n    /**\n     * Append items.\n     * @param {Array.&lt;{height: ?Number, contents: String}>} items - items\n     * @api\n     */\n    append: function(items) {\n        this._insertItems(items, this.items.length);\n        this._updateItemData();\n        this._renderContents();\n    },\n\n    /**\n     * Prepend items.\n     * @param {Array.&lt;{height: ?Number, contents: String}>} items - items\n     * @api\n     */\n    prepend: function(items) {\n        var scrollPosition = this.layout.scrollTop + this._sum(tui.util.pluck(items, 'height'));\n\n        this._insertItems(items, 0);\n        this._updateItemData();\n        this._renderContents(scrollPosition);\n    },\n\n    /**\n     * Insert items.\n     * @param {Array.&lt;{height: ?Number, contents: String}>} items - items\n     * @param {number} index - index\n     * @api\n     */\n    insert: function(items, index) {\n        var lastIndex = this.items.length - 1;\n\n        index = Math.max(Math.min(index, lastIndex), 0);\n        this._insertItems(items, index);\n        this._updateItemData();\n        this._renderContents();\n    },\n\n    /**\n     * Remove item.\n     * @param {number} index - index\n     * @returns {?{height: Number, contents: String}}\n     * @private\n     */\n    _removeItem: function(index) {\n        var removedItem;\n\n        if (!this._isPlusNumber(index)) {\n            throw new Error('The index should be a plus number');\n        }\n\n        removedItem = this.items.splice(index, 1);\n\n        return removedItem[0];\n    },\n\n    /**\n     * Remove items.\n     * @param {Array.&lt;Number>} removeItemIndexList - list of item index for remove\n     * @returns {Array.&lt;?{height: Number, contents: String}>}\n     * @private\n     */\n    _removeItems: function(removeItemIndexList) {\n        var newItems = [];\n        var removedItems = [];\n\n        if (tui.util.isArray(removeItemIndexList)) {\n            tui.util.forEachArray(this.items, function(item, index) {\n                if (tui.util.inArray(index, removeItemIndexList) === -1) {\n                    newItems.push(item);\n                } else {\n                    removedItems.push(item);\n                }\n            }, this);\n\n            this.items = newItems;\n        }\n\n        return removedItems;\n    },\n\n    /**\n     * Remove item or items by index.\n     *  - If index type is number, remove one item.\n     *  - If index type is array of number, remove items.\n     *  - If second parameter is false, not rerendering.\n     * @param {Array.&lt;Number> | Number} index - remove item index or index list\n     * @param {boolean} shouldRerender - whether should rerender or not\n     * @returns {Array.&lt;{height: Number, contents: String}> | {height: Number, contents: String}}\n     * @api\n     */\n    remove: function(index, shouldRerender) {\n        var removed;\n\n        if (tui.util.isArray(index)) {\n            removed = this._removeItems(index);\n        } else {\n            removed = this._removeItem(index);\n        }\n\n        this._updateItemData();\n        shouldRerender = shouldRerender !== false;\n\n        if (shouldRerender &amp;&amp; removed &amp;&amp; (!tui.util.isArray(removed) || removed.length)) {\n            this._renderContents();\n        }\n\n        return removed;\n    },\n\n    /**\n     * Clear items.\n     * @api\n     */\n    clear: function() {\n        this.items = [];\n        this.itemHeightList = [];\n        this.itemPositionList = [];\n        this.layout.innerHTML = '';\n    },\n\n    /**\n     * Move scroll position.\n     * @param {Number} scrollPosition - scroll position\n     * @api\n     */\n    moveScroll: function(scrollPosition) {\n        scrollPosition = parseInt(scrollPosition, 10);\n\n        if (!this._isPlusNumber(scrollPosition)) {\n            throw new Error('The scroll position value should be a plus number');\n        }\n\n        this._renderContents(scrollPosition);\n    },\n\n    /**\n     * Resize layout height.\n     * @param {Number} height - layout height\n     * @api\n     */\n    resizeHeight: function(height) {\n        var prevScrollTop;\n\n        height = parseInt(height, 10);\n\n        if (!this._isPlusNumber(height)) {\n            throw new Error('The height value should be a plus number');\n        }\n\n        prevScrollTop = this.layout.scrollTop;\n\n        this.layoutHeight = height;\n        this.layout.style.height = height + 'px';\n        this._renderContents(prevScrollTop);\n    },\n\n    /**\n     * Get items.\n     * @returns {Array.&lt;String>}\n     * @api\n     */\n    getItems: function() {\n        return this.items.slice();\n    },\n\n    /**\n     * Get item count.\n     * @returns {Number}\n     * @api\n     */\n    getItemCount: function() {\n        return this.items.length;\n    },\n\n    /**\n     * Get current scroll position value.\n     * @returns {Number}\n     * @api\n     */\n    getScrollPosition: function() {\n        return this.layout.scrollTop;\n    },\n\n    /**\n     * Destroy.\n     * @api\n     */\n    destroy: function() {\n        eventListener.off(this.layout, 'scroll', this._onScroll, this);\n        this.container.innerHTML = '';\n        this.container = null;\n    }\n});\n\ntui.util.CustomEvents.mixin(VirtualScroll);\n\n/**\n * NHN Entertainment Toast UI Chart.\n * @namespace tui.chart\n */\ntui.util.defineNamespace('tui.component');\ntui.component.VirtualScroll = VirtualScroll;\n</code></pre>\n        </article>\n    </section>\n\n\n\n</div>\n\n"