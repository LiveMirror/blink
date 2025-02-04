/*
 * Copyright (C) 2008 Apple Inc. All Rights Reserved.
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @constructor
 * @extends {WebInspector.PropertiesSection}
 * @param {!WebInspector.RemoteObject} object
 * @param {?string|!Element=} title
 * @param {string=} subtitle
 * @param {?string=} emptyPlaceholder
 * @param {boolean=} ignoreHasOwnProperty
 * @param {!Array.<!WebInspector.RemoteObjectProperty>=} extraProperties
 * @param {function(new:TreeElement, !WebInspector.RemoteObjectProperty)=} treeElementConstructor
 */
WebInspector.ObjectPropertiesSection = function(object, title, subtitle, emptyPlaceholder, ignoreHasOwnProperty, extraProperties, treeElementConstructor)
{
    this.emptyPlaceholder = (emptyPlaceholder || WebInspector.UIString("No Properties"));
    this.object = object;
    this.ignoreHasOwnProperty = ignoreHasOwnProperty;
    this.extraProperties = extraProperties;
    this.treeElementConstructor = treeElementConstructor || WebInspector.ObjectPropertyTreeElement;
    this.editable = true;
    this.skipProto = false;

    WebInspector.PropertiesSection.call(this, title || "", subtitle);
}

WebInspector.ObjectPropertiesSection._arrayLoadThreshold = 100;

WebInspector.ObjectPropertiesSection.prototype = {
    enableContextMenu: function()
    {
        this.element.addEventListener("contextmenu", this._contextMenuEventFired.bind(this), false);
    },

    _contextMenuEventFired: function(event)
    {
        var contextMenu = new WebInspector.ContextMenu(event);
        contextMenu.appendApplicableItems(this.object);
        contextMenu.show();
    },

    onpopulate: function()
    {
        this.update();
    },

    update: function()
    {
        if (this.object.arrayLength() > WebInspector.ObjectPropertiesSection._arrayLoadThreshold) {
            this.propertiesTreeOutline.removeChildren();
            WebInspector.ArrayGroupingTreeElement._populateArray(this.propertiesTreeOutline, this.object, 0, this.object.arrayLength() - 1);
            return;
        }

        /**
         * @param {?Array.<!WebInspector.RemoteObjectProperty>} properties
         * @param {?Array.<!WebInspector.RemoteObjectProperty>} internalProperties
         * @this {WebInspector.ObjectPropertiesSection}
         */
        function callback(properties, internalProperties)
        {
            if (!properties)
                return;
            this.updateProperties(properties, internalProperties);
        }

        WebInspector.RemoteObject.loadFromObject(this.object, !!this.ignoreHasOwnProperty, callback.bind(this));
    },

    updateProperties: function(properties, internalProperties, rootTreeElementConstructor, rootPropertyComparer)
    {
        if (!rootTreeElementConstructor)
            rootTreeElementConstructor = this.treeElementConstructor;

        if (!rootPropertyComparer)
            rootPropertyComparer = WebInspector.ObjectPropertiesSection.CompareProperties;

        if (this.extraProperties) {
            for (var i = 0; i < this.extraProperties.length; ++i)
                properties.push(this.extraProperties[i]);
        }

        this.propertiesTreeOutline.removeChildren();

        WebInspector.ObjectPropertyTreeElement.populateWithProperties(this.propertiesTreeOutline,
            properties, internalProperties,
            rootTreeElementConstructor, rootPropertyComparer,
            this.skipProto, this.object);

        this.propertiesForTest = properties;

        if (!this.propertiesTreeOutline.children.length) {
            var title = document.createElement("div");
            title.className = "info";
            title.textContent = this.emptyPlaceholder;
            var infoElement = new TreeElement(title, null, false);
            this.propertiesTreeOutline.appendChild(infoElement);
        }
    },

    __proto__: WebInspector.PropertiesSection.prototype
}

/**
 * @param {!WebInspector.RemoteObjectProperty} propertyA
 * @param {!WebInspector.RemoteObjectProperty} propertyB
 * @return {number}
 */
WebInspector.ObjectPropertiesSection.CompareProperties = function(propertyA, propertyB)
{
    var a = propertyA.name;
    var b = propertyB.name;
    if (a === "__proto__")
        return 1;
    if (b === "__proto__")
        return -1;
    return String.naturalOrderComparator(a, b);
}

/**
 * @constructor
 * @extends {TreeElement}
 * @param {!WebInspector.RemoteObjectProperty} property
 */
WebInspector.ObjectPropertyTreeElement = function(property)
{
    this.property = property;

    // Pass an empty title, the title gets made later in onattach.
    TreeElement.call(this, "", null, false);
    this.toggleOnClick = true;
    this.selectable = false;
}

WebInspector.ObjectPropertyTreeElement.prototype = {
    onpopulate: function()
    {
        var propertyValue = /** @type {!WebInspector.RemoteObject} */ (this.property.value);
        console.assert(propertyValue);
        WebInspector.ObjectPropertyTreeElement.populate(this, propertyValue);
    },

    /**
     * @override
     * @return {boolean}
     */
    ondblclick: function(event)
    {
        if (this.property.writable || this.property.setter)
            this.startEditing(event);
        return false;
    },

    /**
     * @override
     */
    onattach: function()
    {
        this.update();
    },

    update: function()
    {
        this.nameElement = document.createElement("span");
        this.nameElement.className = "name";
        var name = this.property.name;
        if (/^\s|\s$|^$|\n/.test(name))
            name = "\"" + name.replace(/\n/g, "\u21B5") + "\"";
        this.nameElement.textContent = name;
        if (!this.property.enumerable)
            this.nameElement.classList.add("dimmed");
        if (this.property.isAccessorProperty())
            this.nameElement.classList.add("properties-accessor-property-name");

        var separatorElement = document.createElement("span");
        separatorElement.className = "separator";
        separatorElement.textContent = ": ";

        if (this.property.value) {
            this.valueElement = document.createElement("span");
            this.valueElement.className = "value";
            var description = this.property.value.description;
            // Render \n as a nice unicode cr symbol.
            if (this.property.wasThrown) {
                this.valueElement.textContent = "[Exception: " + description + "]";
            } else if (this.property.value.type === "string" && typeof description === "string") {
                this.valueElement.textContent = "\"" + description.replace(/\n/g, "\u21B5") + "\"";
                this.valueElement._originalTextContent = "\"" + description + "\"";
            } else if (this.property.value.type === "function" && typeof description === "string") {
                this.valueElement.textContent = /.*/.exec(description)[0].replace(/ +$/g, "");
                this.valueElement._originalTextContent = description;
            } else if (this.property.value.type !== "object" || this.property.value.subtype !== "node") {
                this.valueElement.textContent = description;
            }

            if (this.property.wasThrown)
                this.valueElement.classList.add("error");
            if (this.property.value.subtype)
                this.valueElement.classList.add("console-formatted-" + this.property.value.subtype);
            else if (this.property.value.type)
                this.valueElement.classList.add("console-formatted-" + this.property.value.type);

            this.valueElement.addEventListener("contextmenu", this._contextMenuFired.bind(this, this.property.value), false);
            if (this.property.value.type === "object" && this.property.value.subtype === "node" && this.property.value.description) {
                WebInspector.DOMPresentationUtils.createSpansForNodeTitle(this.valueElement, this.property.value.description);
                this.valueElement.addEventListener("mousemove", this._mouseMove.bind(this, this.property.value), false);
                this.valueElement.addEventListener("mouseout", this._mouseOut.bind(this, this.property.value), false);
            } else {
                this.valueElement.title = description || "";
            }

            this.listItemElement.removeChildren();

            this.hasChildren = this.property.value.hasChildren && !this.property.wasThrown;
        } else {
            if (this.property.getter) {
                this.valueElement = WebInspector.ObjectPropertyTreeElement.createRemoteObjectAccessorPropertySpan(this.property.parentObject, [this.property.name], this._onInvokeGetterClick.bind(this));
            } else {
                this.valueElement = document.createElement("span");
                this.valueElement.className = "console-formatted-undefined";
                this.valueElement.textContent = WebInspector.UIString("<unreadable>");
                this.valueElement.title = WebInspector.UIString("No property getter");
            }
        }

        this.listItemElement.appendChild(this.nameElement);
        this.listItemElement.appendChild(separatorElement);
        this.listItemElement.appendChild(this.valueElement);
    },

    _contextMenuFired: function(value, event)
    {
        var contextMenu = new WebInspector.ContextMenu(event);
        this.populateContextMenu(contextMenu);
        contextMenu.appendApplicableItems(value);
        contextMenu.show();
    },

    /**
     * @param {!WebInspector.ContextMenu} contextMenu
     */
    populateContextMenu: function(contextMenu)
    {
    },

    _mouseMove: function(event)
    {
        this.property.value.highlightAsDOMNode();
    },

    _mouseOut: function(event)
    {
        this.property.value.hideDOMNodeHighlight();
    },

    updateSiblings: function()
    {
        if (this.parent.root)
            this.treeOutline.section.update();
        else
            this.parent.shouldRefreshChildren = true;
    },

    /**
     * @return {boolean}
     */
    renderPromptAsBlock: function()
    {
        return false;
    },

    /**
     * @param {!Event=} event
     * @return {!Array.<!Element|undefined>}
     */
    elementAndValueToEdit: function(event)
    {
        return [this.valueElement, (typeof this.valueElement._originalTextContent === "string") ? this.valueElement._originalTextContent : undefined];
    },

    /**
     * @param {!Event=} event
     */
    startEditing: function(event)
    {
        var elementAndValueToEdit = this.elementAndValueToEdit(event);
        var elementToEdit = elementAndValueToEdit[0];
        var valueToEdit = elementAndValueToEdit[1];

        if (WebInspector.isBeingEdited(elementToEdit) || !this.treeOutline.section.editable || this._readOnly)
            return;

        // Edit original source.
        if (typeof valueToEdit !== "undefined")
            elementToEdit.textContent = valueToEdit;

        var context = { expanded: this.expanded, elementToEdit: elementToEdit, previousContent: elementToEdit.textContent };

        // Lie about our children to prevent expanding on double click and to collapse subproperties.
        this.hasChildren = false;

        this.listItemElement.classList.add("editing-sub-part");

        this._prompt = new WebInspector.ObjectPropertyPrompt(this.editingCommitted.bind(this, null, elementToEdit.textContent, context.previousContent, context), this.editingCancelled.bind(this, null, context), this.renderPromptAsBlock());

        /**
         * @this {WebInspector.ObjectPropertyTreeElement}
         */
        function blurListener()
        {
            this.editingCommitted(null, elementToEdit.textContent, context.previousContent, context);
        }

        var proxyElement = this._prompt.attachAndStartEditing(elementToEdit, blurListener.bind(this));
        window.getSelection().setBaseAndExtent(elementToEdit, 0, elementToEdit, 1);
        proxyElement.addEventListener("keydown", this._promptKeyDown.bind(this, context), false);
    },

    /**
     * @return {boolean}
     */
    isEditing: function()
    {
        return !!this._prompt;
    },

    editingEnded: function(context)
    {
        this._prompt.detach();
        delete this._prompt;

        this.listItemElement.scrollLeft = 0;
        this.listItemElement.classList.remove("editing-sub-part");
        if (context.expanded)
            this.expand();
    },

    editingCancelled: function(element, context)
    {
        this.editingEnded(context);
        this.update();
    },

    editingCommitted: function(element, userInput, previousContent, context)
    {
        if (userInput === previousContent) {
            this.editingCancelled(element, context); // nothing changed, so cancel
            return;
        }

        this.editingEnded(context);
        this.applyExpression(userInput, true);
    },

    _promptKeyDown: function(context, event)
    {
        if (isEnterKey(event)) {
            event.consume(true);
            this.editingCommitted(null, context.elementToEdit.textContent, context.previousContent, context);
            return;
        }
        if (event.keyIdentifier === "U+001B") { // Esc
            event.consume();
            this.editingCancelled(null, context);
            return;
        }
    },

    applyExpression: function(expression, updateInterface)
    {
        expression = expression.trim();
        var expressionLength = expression.length;

        /**
         * @param {?Protocol.Error} error
         * @this {WebInspector.ObjectPropertyTreeElement}
         */
        function callback(error)
        {
            if (!updateInterface)
                return;

            if (error)
                this.update();

            if (!expressionLength) {
                // The property was deleted, so remove this tree element.
                this.parent.removeChild(this);
            } else {
                // Call updateSiblings since their value might be based on the value that just changed.
                this.updateSiblings();
            }
        };
        this.property.parentObject.setPropertyValue(this.property.name, expression.trim(), callback.bind(this));
    },

    /**
     * @return {string|undefined}
     */
    propertyPath: function()
    {
        if ("_cachedPropertyPath" in this)
            return this._cachedPropertyPath;

        var current = this;
        var result;

        do {
            if (current.property) {
                if (result)
                    result = current.property.name + "." + result;
                else
                    result = current.property.name;
            }
            current = current.parent;
        } while (current && !current.root);

        this._cachedPropertyPath = result;
        return result;
    },

    /**
     * @param {?WebInspector.RemoteObject} result
     * @param {boolean=} wasThrown
     */
    _onInvokeGetterClick: function(result, wasThrown)
    {
        if (!result)
            return;
        this.property.value = result;
        this.property.wasThrown = wasThrown;

        this.update();
        this.shouldRefreshChildren = true;
    },

    __proto__: TreeElement.prototype
}

/**
 * @param {!TreeElement} treeElement
 * @param {!WebInspector.RemoteObject} value
 */
WebInspector.ObjectPropertyTreeElement.populate = function(treeElement, value) {
    if (treeElement.children.length && !treeElement.shouldRefreshChildren)
        return;

    if (value.arrayLength() > WebInspector.ObjectPropertiesSection._arrayLoadThreshold) {
        treeElement.removeChildren();
        WebInspector.ArrayGroupingTreeElement._populateArray(treeElement, value, 0, value.arrayLength() - 1);
        return;
    }

    /**
     * @param {?Array.<!WebInspector.RemoteObjectProperty>} properties
     * @param {?Array.<!WebInspector.RemoteObjectProperty>} internalProperties
     */
    function callback(properties, internalProperties)
    {
        treeElement.removeChildren();
        if (!properties)
            return;
        if (!internalProperties)
            internalProperties = [];

        WebInspector.ObjectPropertyTreeElement.populateWithProperties(treeElement, properties, internalProperties,
            treeElement.treeOutline.section.treeElementConstructor, WebInspector.ObjectPropertiesSection.CompareProperties,
            treeElement.treeOutline.section.skipProto, value);
    }

    WebInspector.RemoteObject.loadFromObjectPerProto(value, callback);
}

/**
 * @param {!TreeElement|!TreeOutline} treeElement
 * @param {!Array.<!WebInspector.RemoteObjectProperty>} properties
 * @param {?Array.<!WebInspector.RemoteObjectProperty>} internalProperties
 * @param {function(new:TreeElement, !WebInspector.RemoteObjectProperty)} treeElementConstructor
 * @param {function (!WebInspector.RemoteObjectProperty, !WebInspector.RemoteObjectProperty): number} comparator
 * @param {boolean} skipProto
 * @param {?WebInspector.RemoteObject} value
 */
WebInspector.ObjectPropertyTreeElement.populateWithProperties = function(treeElement, properties, internalProperties, treeElementConstructor, comparator, skipProto, value) {
    properties.sort(comparator);

    for (var i = 0; i < properties.length; ++i) {
        var property = properties[i];
        if (skipProto && property.name === "__proto__")
            continue;
        if (property.isAccessorProperty()) {
            if (property.name !== "__proto__" && property.getter) {
                property.parentObject = value;
                treeElement.appendChild(new treeElementConstructor(property));
            }
            if (property.isOwn) {
                if (property.getter) {
                    var getterProperty = new WebInspector.RemoteObjectProperty("get " + property.name, property.getter);
                    getterProperty.parentObject = value;
                    treeElement.appendChild(new treeElementConstructor(getterProperty));
                }
                if (property.setter) {
                    var setterProperty = new WebInspector.RemoteObjectProperty("set " + property.name, property.setter);
                    setterProperty.parentObject = value;
                    treeElement.appendChild(new treeElementConstructor(setterProperty));
                }
            }
        } else {
            property.parentObject = value;
            treeElement.appendChild(new treeElementConstructor(property));
        }
    }
    if (value && value.type === "function") {
        // Whether function has TargetFunction internal property.
        // This is a simple way to tell that the function is actually a bound function (we are not told).
        // Bound function never has inner scope and doesn't need corresponding UI node.
        var hasTargetFunction = false;

        if (internalProperties) {
            for (var i = 0; i < internalProperties.length; i++) {
                if (internalProperties[i].name == "[[TargetFunction]]") {
                    hasTargetFunction = true;
                    break;
                }
            }
        }
        if (!hasTargetFunction)
            treeElement.appendChild(new WebInspector.FunctionScopeMainTreeElement(value));
    }
    if (internalProperties) {
        for (var i = 0; i < internalProperties.length; i++) {
            internalProperties[i].parentObject = value;
            treeElement.appendChild(new treeElementConstructor(internalProperties[i]));
        }
    }
}

/**
 * @param {!WebInspector.RemoteObject} object
 * @param {!Array.<string>} propertyPath
 * @param {function(?WebInspector.RemoteObject, boolean=)} callback
 * @return {!Element}
 */
WebInspector.ObjectPropertyTreeElement.createRemoteObjectAccessorPropertySpan = function(object, propertyPath, callback)
{
    var rootElement = document.createElement("span");
    var element = rootElement.createChild("span", "properties-calculate-value-button");
    element.textContent = WebInspector.UIString("(...)");
    element.title = WebInspector.UIString("Invoke property getter");
    element.addEventListener("click", onInvokeGetterClick, false);

    function onInvokeGetterClick(event)
    {
        event.consume();
        object.getProperty(propertyPath, callback);
    }

    return rootElement;
}

/**
 * @constructor
 * @extends {TreeElement}
 * @param {!WebInspector.RemoteObject} remoteObject
 */
WebInspector.FunctionScopeMainTreeElement = function(remoteObject)
{
    TreeElement.call(this, "<function scope>", null, false);
    this.toggleOnClick = true;
    this.selectable = false;
    this._remoteObject = remoteObject;
    this.hasChildren = true;
}

WebInspector.FunctionScopeMainTreeElement.prototype = {
    onpopulate: function()
    {
        if (this.children.length && !this.shouldRefreshChildren)
            return;

        /**
         * @param {?Protocol.Error} error
         * @param {!DebuggerAgent.FunctionDetails} response
         * @this {WebInspector.FunctionScopeMainTreeElement}
         */
        function didGetDetails(error, response)
        {
            if (error) {
                console.error(error);
                return;
            }
            this.removeChildren();

            var scopeChain = response.scopeChain;
            if (!scopeChain)
                return;
            for (var i = 0; i < scopeChain.length; ++i) {
                var scope = scopeChain[i];
                var title = null;
                var isTrueObject;

                switch (scope.type) {
                case DebuggerAgent.ScopeType.Local:
                    // Not really expecting this scope type here.
                    title = WebInspector.UIString("Local");
                    isTrueObject = false;
                    break;
                case DebuggerAgent.ScopeType.Closure:
                    title = WebInspector.UIString("Closure");
                    isTrueObject = false;
                    break;
                case DebuggerAgent.ScopeType.Catch:
                    title = WebInspector.UIString("Catch");
                    isTrueObject = false;
                    break;
                case DebuggerAgent.ScopeType.With:
                    title = WebInspector.UIString("With Block");
                    isTrueObject = true;
                    break;
                case DebuggerAgent.ScopeType.Global:
                    title = WebInspector.UIString("Global");
                    isTrueObject = true;
                    break;
                default:
                    console.error("Unknown scope type: " + scope.type);
                    continue;
                }

                var scopeRef = isTrueObject ? undefined : new WebInspector.ScopeRef(i, undefined, this._remoteObject.objectId);
                var remoteObject = WebInspector.ScopeRemoteObject.fromPayload(scope.object, scopeRef);
                if (isTrueObject) {
                    var property = WebInspector.RemoteObjectProperty.fromScopeValue(title, remoteObject);
                    property.parentObject = null;
                    this.appendChild(new this.treeOutline.section.treeElementConstructor(property));
                } else {
                    var scopeTreeElement = new WebInspector.ScopeTreeElement(title, null, remoteObject);
                    this.appendChild(scopeTreeElement);
                }
            }

        }
        DebuggerAgent.getFunctionDetails(this._remoteObject.objectId, didGetDetails.bind(this));
    },

    __proto__: TreeElement.prototype
}

/**
 * @constructor
 * @extends {TreeElement}
 * @param {!WebInspector.RemoteObject} remoteObject
 */
WebInspector.ScopeTreeElement = function(title, subtitle, remoteObject)
{
    // TODO: use subtitle parameter.
    TreeElement.call(this, title, null, false);
    this.toggleOnClick = true;
    this.selectable = false;
    this._remoteObject = remoteObject;
    this.hasChildren = true;
}

WebInspector.ScopeTreeElement.prototype = {
    onpopulate: function()
    {
        WebInspector.ObjectPropertyTreeElement.populate(this, this._remoteObject);
    },

    __proto__: TreeElement.prototype
}

/**
 * @constructor
 * @extends {TreeElement}
 * @param {!WebInspector.RemoteObject} object
 * @param {number} fromIndex
 * @param {number} toIndex
 * @param {number} propertyCount
 */
WebInspector.ArrayGroupingTreeElement = function(object, fromIndex, toIndex, propertyCount)
{
    TreeElement.call(this, String.sprintf("[%d \u2026 %d]", fromIndex, toIndex), undefined, true);
    this._fromIndex = fromIndex;
    this._toIndex = toIndex;
    this._object = object;
    this._readOnly = true;
    this._propertyCount = propertyCount;
    this._populated = false;
}

WebInspector.ArrayGroupingTreeElement._bucketThreshold = 100;
WebInspector.ArrayGroupingTreeElement._sparseIterationThreshold = 250000;

/**
 * @param {!TreeElement|!TreeOutline} treeElement
 * @param {!WebInspector.RemoteObject} object
 * @param {number} fromIndex
 * @param {number} toIndex
 */
WebInspector.ArrayGroupingTreeElement._populateArray = function(treeElement, object, fromIndex, toIndex)
{
    WebInspector.ArrayGroupingTreeElement._populateRanges(treeElement, object, fromIndex, toIndex, true);
}

/**
 * @param {!TreeElement|!TreeOutline} treeElement
 * @param {!WebInspector.RemoteObject} object
 * @param {number} fromIndex
 * @param {number} toIndex
 * @param {boolean} topLevel
 * @this {WebInspector.ArrayGroupingTreeElement}
 */
WebInspector.ArrayGroupingTreeElement._populateRanges = function(treeElement, object, fromIndex, toIndex, topLevel)
{
    object.callFunctionJSON(packRanges, [{value: fromIndex}, {value: toIndex}, {value: WebInspector.ArrayGroupingTreeElement._bucketThreshold}, {value: WebInspector.ArrayGroupingTreeElement._sparseIterationThreshold}], callback.bind(this));

    /**
     * @this {Object}
     * @param {number=} fromIndex // must declare optional
     * @param {number=} toIndex // must declare optional
     * @param {number=} bucketThreshold // must declare optional
     * @param {number=} sparseIterationThreshold // must declare optional
     */
    function packRanges(fromIndex, toIndex, bucketThreshold, sparseIterationThreshold)
    {
        var ownPropertyNames = null;

        /**
         * @this {Object}
         */
        function doLoop(iterationCallback)
        {
            if (toIndex - fromIndex < sparseIterationThreshold) {
                for (var i = fromIndex; i <= toIndex; ++i) {
                    if (i in this)
                        iterationCallback(i);
                }
            } else {
                ownPropertyNames = ownPropertyNames || Object.getOwnPropertyNames(this);
                for (var i = 0; i < ownPropertyNames.length; ++i) {
                    var name = ownPropertyNames[i];
                    var index = name >>> 0;
                    if (String(index) === name && fromIndex <= index && index <= toIndex)
                        iterationCallback(index);
                }
            }
        }

        var count = 0;
        function countIterationCallback()
        {
            ++count;
        }
        doLoop.call(this, countIterationCallback);

        var bucketSize = count;
        if (count <= bucketThreshold)
            bucketSize = count;
        else
            bucketSize = Math.pow(bucketThreshold, Math.ceil(Math.log(count) / Math.log(bucketThreshold)) - 1);

        var ranges = [];
        count = 0;
        var groupStart = -1;
        var groupEnd = 0;
        function loopIterationCallback(i)
        {
            if (groupStart === -1)
                groupStart = i;

            groupEnd = i;
            if (++count === bucketSize) {
                ranges.push([groupStart, groupEnd, count]);
                count = 0;
                groupStart = -1;
            }
        }
        doLoop.call(this, loopIterationCallback);

        if (count > 0)
            ranges.push([groupStart, groupEnd, count]);
        return ranges;
    }

    function callback(ranges)
    {
        if (ranges.length == 1)
            WebInspector.ArrayGroupingTreeElement._populateAsFragment(treeElement, object, ranges[0][0], ranges[0][1]);
        else {
            for (var i = 0; i < ranges.length; ++i) {
                var fromIndex = ranges[i][0];
                var toIndex = ranges[i][1];
                var count = ranges[i][2];
                if (fromIndex == toIndex)
                    WebInspector.ArrayGroupingTreeElement._populateAsFragment(treeElement, object, fromIndex, toIndex);
                else
                    treeElement.appendChild(new WebInspector.ArrayGroupingTreeElement(object, fromIndex, toIndex, count));
            }
        }
        if (topLevel)
            WebInspector.ArrayGroupingTreeElement._populateNonIndexProperties(treeElement, object);
    }
}

/**
 * @param {!TreeElement|!TreeOutline} treeElement
 * @param {!WebInspector.RemoteObject} object
 * @param {number} fromIndex
 * @param {number} toIndex
 * @this {WebInspector.ArrayGroupingTreeElement}
 */
WebInspector.ArrayGroupingTreeElement._populateAsFragment = function(treeElement, object, fromIndex, toIndex)
{
    object.callFunction(buildArrayFragment, [{value: fromIndex}, {value: toIndex}, {value: WebInspector.ArrayGroupingTreeElement._sparseIterationThreshold}], processArrayFragment.bind(this));

    /**
     * @this {Object}
     * @param {number=} fromIndex // must declare optional
     * @param {number=} toIndex // must declare optional
     * @param {number=} sparseIterationThreshold // must declare optional
     */
    function buildArrayFragment(fromIndex, toIndex, sparseIterationThreshold)
    {
        var result = Object.create(null);
        if (toIndex - fromIndex < sparseIterationThreshold) {
            for (var i = fromIndex; i <= toIndex; ++i) {
                if (i in this)
                    result[i] = this[i];
            }
        } else {
            var ownPropertyNames = Object.getOwnPropertyNames(this);
            for (var i = 0; i < ownPropertyNames.length; ++i) {
                var name = ownPropertyNames[i];
                var index = name >>> 0;
                if (String(index) === name && fromIndex <= index && index <= toIndex)
                    result[index] = this[index];
            }
        }
        return result;
    }

    /**
     * @param {?WebInspector.RemoteObject} arrayFragment
     * @param {boolean=} wasThrown
     * @this {WebInspector.ArrayGroupingTreeElement}
     */
    function processArrayFragment(arrayFragment, wasThrown)
    {
        if (!arrayFragment || wasThrown)
            return;
        arrayFragment.getAllProperties(false, processProperties.bind(this));
    }

    /** @this {WebInspector.ArrayGroupingTreeElement} */
    function processProperties(properties, internalProperties)
    {
        if (!properties)
            return;

        properties.sort(WebInspector.ObjectPropertiesSection.CompareProperties);
        for (var i = 0; i < properties.length; ++i) {
            properties[i].parentObject = this._object;
            var childTreeElement = new treeElement.treeOutline.section.treeElementConstructor(properties[i]);
            childTreeElement._readOnly = true;
            treeElement.appendChild(childTreeElement);
        }
    }
}

/**
 * @param {!TreeElement|!TreeOutline} treeElement
 * @param {!WebInspector.RemoteObject} object
 * @this {WebInspector.ArrayGroupingTreeElement}
 */
WebInspector.ArrayGroupingTreeElement._populateNonIndexProperties = function(treeElement, object)
{
    object.callFunction(buildObjectFragment, undefined, processObjectFragment.bind(this));

    /** @this {Object} */
    function buildObjectFragment()
    {
        var result = Object.create(this.__proto__);
        var names = Object.getOwnPropertyNames(this);
        for (var i = 0; i < names.length; ++i) {
            var name = names[i];
            // Array index check according to the ES5-15.4.
            if (String(name >>> 0) === name && name >>> 0 !== 0xffffffff)
                continue;
            var descriptor = Object.getOwnPropertyDescriptor(this, name);
            if (descriptor)
                Object.defineProperty(result, name, descriptor);
        }
        return result;
    }

    /**
     * @param {?WebInspector.RemoteObject} arrayFragment
     * @param {boolean=} wasThrown
     * @this {WebInspector.ArrayGroupingTreeElement}
     */
    function processObjectFragment(arrayFragment, wasThrown)
    {
        if (!arrayFragment || wasThrown)
            return;
        arrayFragment.getOwnProperties(processProperties.bind(this));
    }

    /**
     * @param {?Array.<!WebInspector.RemoteObjectProperty>} properties
     * @param {?Array.<!WebInspector.RemoteObjectProperty>=} internalProperties
     * @this {WebInspector.ArrayGroupingTreeElement}
     */
    function processProperties(properties, internalProperties)
    {
        if (!properties)
            return;
        properties.sort(WebInspector.ObjectPropertiesSection.CompareProperties);
        for (var i = 0; i < properties.length; ++i) {
            properties[i].parentObject = this._object;
            var childTreeElement = new treeElement.treeOutline.section.treeElementConstructor(properties[i]);
            childTreeElement._readOnly = true;
            treeElement.appendChild(childTreeElement);
        }
    }
}

WebInspector.ArrayGroupingTreeElement.prototype = {
    onpopulate: function()
    {
        if (this._populated)
            return;

        this._populated = true;

        if (this._propertyCount >= WebInspector.ArrayGroupingTreeElement._bucketThreshold) {
            WebInspector.ArrayGroupingTreeElement._populateRanges(this, this._object, this._fromIndex, this._toIndex, false);
            return;
        }
        WebInspector.ArrayGroupingTreeElement._populateAsFragment(this, this._object, this._fromIndex, this._toIndex);
    },

    onattach: function()
    {
        this.listItemElement.classList.add("name");
    },

    __proto__: TreeElement.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TextPrompt}
 * @param {boolean=} renderAsBlock
 */
WebInspector.ObjectPropertyPrompt = function(commitHandler, cancelHandler, renderAsBlock)
{
    WebInspector.TextPrompt.call(this, WebInspector.runtimeModel.completionsForTextPrompt.bind(WebInspector.runtimeModel));
    this.setSuggestBoxEnabled("generic-suggest");
    if (renderAsBlock)
        this.renderAsBlock();
}

WebInspector.ObjectPropertyPrompt.prototype = {
    __proto__: WebInspector.TextPrompt.prototype
}
