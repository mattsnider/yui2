(function () {

    /**
    * Dialog is an implementation of Panel that can be used to submit form 
    * data. Built-in functionality for buttons with event handlers is included, 
    * and button sets can be build dynamically, or the preincluded ones for 
    * Submit/Cancel and OK/Cancel can be utilized. Forms can be processed in 3
    * ways -- via an asynchronous Connection utility call, a simple form 
    * POST or GET, or manually.
    * @namespace YAHOO.widget
    * @class Dialog
    * @extends YAHOO.widget.Panel
    * @constructor
    * @param {String} el The element ID representing the Dialog <em>OR</em>
    * @param {HTMLElement} el The element representing the Dialog
    * @param {Object} userConfig The configuration object literal containing 
    * the configuration that should be set for this Dialog. See configuration 
    * documentation for more details.
    */
    YAHOO.widget.Dialog = function (el, userConfig) {
    
        YAHOO.widget.Dialog.superclass.constructor.call(this, el, userConfig);
    
    };


    var Event = YAHOO.util.Event,
        CustomEvent = YAHOO.util.CustomEvent,
        Dom = YAHOO.util.Dom,
        KeyListener = YAHOO.util.KeyListener,
        Connect = YAHOO.util.Connect,
        Dialog = YAHOO.widget.Dialog,

        /**
        * Constant representing the name of the Dialog's events
        * @property EVENT_TYPES
        * @private
        * @final
        * @type Object
        */
        EVENT_TYPES = {
        
            "BEFORE_SUBMIT": "beforeSubmit",
            "SUBMIT": "submit",
            "MANUAL_SUBMIT": "manualSubmit",
            "ASYNC_SUBMIT": "asyncSubmit",
            "FORM_SUBMIT": "formSubmit",
            "CANCEL": "cancel"
        
        },
        
        /**
        * Constant representing the Dialog's configuration properties
        * @property DEFAULT_CONFIG
        * @private
        * @final
        * @type Object
        */
        DEFAULT_CONFIG = {
        
            "POST_METHOD": { 
                key: "postmethod", 
                value: "async" 
            },
            
            "BUTTONS": { 
                key: "buttons", 
                value: "none" 
            }
        
        };    


    /**
    * Constant representing the default CSS class used for a Dialog
    * @property Dialog.CSS_DIALOG
    * @static
    * @final
    * @type String
    */
    Dialog.CSS_DIALOG = "yui-dialog";
    
    
    YAHOO.extend(Dialog, YAHOO.widget.Panel, { 
    
        /**
        * Initializes the class's configurable properties which can be changed 
        * using the Dialog's Config object (cfg).
        * @method initDefaultConfig
        */
        initDefaultConfig: function () {
            Dialog.superclass.initDefaultConfig.call(this);
        
            /**
            * The internally maintained callback object for use with the 
            * Connection utility
            * @property callback
            * @type Object
            */
            this.callback = {
    
                /**
                * The function to execute upon success of the 
                * Connection submission
                * @property callback.success
                * @type Function
                */
                success: null,
    
                /**
                * The function to execute upon failure of the 
                * Connection submission
                * @property callback.failure
                * @type Function
                */
                failure: null,
    
                /**
                * The arbitraty argument or arguments to pass to the Connection 
                * callback functions
                * @property callback.argument
                * @type Object
                */
                argument: null
    
            };
        

            // Add form dialog config properties //
            
            /**
            * The method to use for posting the Dialog's form. Possible values 
            * are "async", "form", and "manual".
            * @config postmethod
            * @type String
            * @default async
            */
            this.cfg.addProperty(DEFAULT_CONFIG.POST_METHOD.key, {
                handler: this.configPostMethod, 
                value: DEFAULT_CONFIG.POST_METHOD.value, 
                validator: function (val) {
                    if (val != "form" && val != "async" && val != "none" && 
                        val != "manual") {
                        return false;
                    } else {
                        return true;
                    }
                }
            });
            
            /**
            * Object literal(s) defining the buttons for the Dialog's footer.
            * @config buttons
            * @type Object[]
            * @default "none"
            */
            this.cfg.addProperty(DEFAULT_CONFIG.BUTTONS.key, {
                handler: this.configButtons,
                value: DEFAULT_CONFIG.BUTTONS.value
            }); 
            
        },
        
        /**
        * Initializes the custom events for Dialog which are fired 
        * automatically at appropriate times by the Dialog class.
        * @method initEvents
        */
        initEvents: function () {
            Dialog.superclass.initEvents.call(this);
        
            var SIGNATURE = CustomEvent.LIST;
        
            /**
            * CustomEvent fired prior to submission
            * @event beforeSumitEvent
            */ 
            this.beforeSubmitEvent = 
                this.createEvent(EVENT_TYPES.BEFORE_SUBMIT);
            this.beforeSubmitEvent.signature = SIGNATURE;
            
            /**
            * CustomEvent fired after submission
            * @event submitEvent
            */
            this.submitEvent = this.createEvent(EVENT_TYPES.SUBMIT);
            this.submitEvent.signature = SIGNATURE;
        
            /**
            * CustomEvent fired prior to manual submission
            * @event manualSubmitEvent
            */
            this.manualSubmitEvent = 
                this.createEvent(EVENT_TYPES.MANUAL_SUBMIT);
            this.manualSubmitEvent.signature = SIGNATURE;
        
            /**
            * CustomEvent fired prior to asynchronous submission
            * @event asyncSubmitEvent
            */ 
            this.asyncSubmitEvent = this.createEvent(EVENT_TYPES.ASYNC_SUBMIT);
            this.asyncSubmitEvent.signature = SIGNATURE;
        
            /**
            * CustomEvent fired prior to form-based submission
            * @event formSubmitEvent
            */
            this.formSubmitEvent = this.createEvent(EVENT_TYPES.FORM_SUBMIT);
            this.formSubmitEvent.signature = SIGNATURE;
        
            /**
            * CustomEvent fired after cancel
            * @event cancelEvent
            */
            this.cancelEvent = this.createEvent(EVENT_TYPES.CANCEL);
            this.cancelEvent.signature = SIGNATURE;
        
        },
        
        /**
        * The Dialog initialization method, which is executed for Dialog and 
        * all of its subclasses. This method is automatically called by the 
        * constructor, and  sets up all DOM references for pre-existing markup, 
        * and creates required markup if it is not already present.
        * @method init
        * @param {String} el The element ID representing the Dialog <em>OR</em>
        * @param {HTMLElement} el The element representing the Dialog
        * @param {Object} userConfig The configuration object literal 
        * containing the configuration that should be set for this Dialog. 
        * See configuration documentation for more details.
        */
        init: function (el, userConfig) {

            /*
                 Note that we don't pass the user config in here yet because 
                 we only want it executed once, at the lowest subclass level
            */

            Dialog.superclass.init.call(this, el/*, userConfig*/); 
        
            this.beforeInitEvent.fire(Dialog);
        
            Dom.addClass(this.element, Dialog.CSS_DIALOG);
        
            this.cfg.setProperty("visible", false);
        
            if (userConfig) {
                this.cfg.applyConfig(userConfig, true);
            }
        
            this.showEvent.subscribe(this.focusFirst, this, true);
            this.beforeHideEvent.subscribe(this.blurButtons, this, true);
        
            this.beforeRenderEvent.subscribe(function () {
                var buttonCfg = this.cfg.getProperty("buttons");
                if (buttonCfg && buttonCfg != "none") {
                    if (! this.footer) {
                        this.setFooter("");
                    }
                }
            }, this, true);
        
            this.initEvent.fire(Dialog);
        },
        
        /**
        * Performs the submission of the Dialog form depending on the value of 
        * "postmethod" property.
        * @method doSubmit
        */
        doSubmit: function () {
    
            var pm = this.cfg.getProperty("postmethod"),
                method,
                cObj;
    
            switch (pm) {
    
            case "async":
                method = this.form.getAttribute("method") || 'POST';
                method = method.toUpperCase();
                Connect.setForm(this.form);
                cObj = Connect.asyncRequest(method, 
                    this.form.getAttribute("action"), this.callback);
                this.asyncSubmitEvent.fire();
                break;
            case "form":
                this.form.submit();
                this.formSubmitEvent.fire();
                break;
            case "none":
            case "manual":
                this.manualSubmitEvent.fire();
                break;
    
            }
    
        },
        
        
        /**
        * Prepares the Dialog's internal FORM object, creating one if one is
        * not currently present.
        * @method registerForm
        */
        registerForm: function () {
    
            var form = this.element.getElementsByTagName("form")[0],
                me = this,
                formHTML,
                firstElement,
                lastElement;
        
            if (! form) {
                formHTML = "<form name=\"frm_" + this.id + 
                    "\" action=\"\"></form>";
                this.body.innerHTML += formHTML;
                form = this.element.getElementsByTagName("form")[0];
            }
        
            this.firstFormElement = function () {
    
                var f, el, nElements = form.elements.length;
    
                for (f = 0; f < nElements; f++) {
                    el = form.elements[f];
                    if (el.focus && ! el.disabled) {
                        if (el.type && el.type != "hidden") {
                            return el;
                        }
                    }
                }
                return null;
            }();
        
            this.lastFormElement = function () {
    
                var f, el, nElements = form.elements.length;
    
                for (f = nElements - 1; f >= 0; f--) {
                    el = form.elements[f];
                    if (el.focus && ! el.disabled) {
                        if (el.type && el.type != "hidden") {
                            return el;
                        }
                    }
                }
                return null;
            }();
        
            this.form = form;
        
            if (this.cfg.getProperty("modal") && this.form) {
        
                firstElement = this.firstFormElement || this.firstButton;
    
                if (firstElement) {

                    this.preventBackTab = new KeyListener(firstElement, 
                        { shift: true, keys: 9 }, 
                        { fn: me.focusLast, scope: me, correctScope: true } );

                    this.showEvent.subscribe(this.preventBackTab.enable, 
                        this.preventBackTab, true);

                    this.hideEvent.subscribe(this.preventBackTab.disable, 
                        this.preventBackTab, true);
                }
        
                lastElement = this.lastButton || this.lastFormElement;

                if (lastElement) {

                    this.preventTabOut = new KeyListener(lastElement, 
                        { shift: false, keys: 9 }, 
                        { fn: me.focusFirst, scope: me, correctScope: true } );

                    this.showEvent.subscribe(this.preventTabOut.enable, 
                        this.preventTabOut, true);

                    this.hideEvent.subscribe(this.preventTabOut.disable, 
                        this.preventTabOut, true);

                }
            }
        },
        
        // BEGIN BUILT-IN PROPERTY EVENT HANDLERS //
        
        /**
        * The default event handler fired when the "close" property is 
        * changed. The method controls the appending or hiding of the close
        * icon at the top right of the Dialog.
        * @method configClose
        * @param {String} type The CustomEvent type (usually the property name)
        * @param {Object[]} args The CustomEvent arguments. For 
        * configuration handlers, args[0] will equal the newly applied value 
        * for the property.
        * @param {Object} obj The scope object. For configuration handlers, 
        * this will usually equal the owner.
        */
        configClose: function (type, args, obj) {
            var val = args[0];
        
            function doCancel(e, obj) {
                obj.cancel();
            }
        
            if (val) {
                if (! this.close) {
                    this.close = document.createElement("div");
                    Dom.addClass(this.close, "container-close");
        
                    this.close.innerHTML = "&#160;";
                    this.innerElement.appendChild(this.close);
                    Event.on(this.close, "click", doCancel, this);
                } else {
                    this.close.style.display = "block";
                }
            } else {
                if (this.close) {
                    this.close.style.display = "none";
                }
            }
        },
        
        /**
        * The default event handler for the "buttons" configuration property
        * @method configButtons
        * @param {String} type The CustomEvent type (usually the property name)
        * @param {Object[]} args The CustomEvent arguments. For configuration 
        * handlers, args[0] will equal the newly applied value for the property.
        * @param {Object} obj The scope object. For configuration handlers, 
        * this will usually equal the owner.
        */
        configButtons: function (type, args, obj) {
    
            var buttons = args[0],
                b,
                button,
                htmlButton,
                nButtons;
    
            if (buttons != "none") {
                this.buttonSpan = null;
                this.buttonSpan = document.createElement("span");
                this.buttonSpan.className = "button-group";

                nButtons = buttons.length;
        
                for (b = 0; b < nButtons; b++) {
                    button = buttons[b];
        
                    htmlButton = document.createElement("button");
                    htmlButton.setAttribute("type", "button");
        
                    if (button.isDefault) {
                        htmlButton.className = "default";
                        this.defaultHtmlButton = htmlButton;
                    }
        
                    htmlButton.appendChild(
                        document.createTextNode(button.text));

                    Event.on(htmlButton, "click", button.handler, this, true);
        
                    this.buttonSpan.appendChild(htmlButton);
                    button.htmlButton = htmlButton;
        
                    if (b === 0) {
                        this.firstButton = button.htmlButton;
                    }
        
                    if (b == (nButtons - 1)) {
                        this.lastButton = button.htmlButton;
                    }
        
                }
        
                this.setFooter(this.buttonSpan);
        
                this.cfg.refireEvent("iframe");
                this.cfg.refireEvent("underlay");
            } else { // Do cleanup
                if (this.buttonSpan) {
                    if (this.buttonSpan.parentNode) {
                        this.buttonSpan.parentNode.removeChild(this.buttonSpan);
                    }
        
                    this.buttonSpan = null;
                    this.firstButton = null;
                    this.lastButton = null;
                    this.defaultHtmlButton = null;
                }
            }
        },
        
        
        /**
        * The default event handler used to focus the first field of the form 
        * when the Dialog is shown.
        * @method focusFirst
        */
        focusFirst: function (type,args,obj) {
    
            var e;
    
            if (args) {
                e = args[1];
                if (e) {
                    Event.stopEvent(e);
                }
            }
        
            if (this.firstFormElement) {
                this.firstFormElement.focus();
            } else {
                this.focusDefaultButton();
            }
        },
        
        /**
        * Sets the focus to the last button in the button or form element in 
        * the Dialog
        * @method focusLast
        */
        focusLast: function (type,args,obj) {
    
            var e,
                buttons = this.cfg.getProperty("buttons");
    
            if (args) {
                e = args[1];
                if (e) {
                    Event.stopEvent(e);
                }
            }
            
            if (buttons && buttons instanceof Array) {
                this.focusLastButton();
            } else {
                if (this.lastFormElement) {
                    this.lastFormElement.focus();
                }
            }
        },
        
        /**
        * Sets the focus to the button that is designated as the default. By 
        * default, his handler is executed when the show event is fired.
        * @method focusDefaultButton
        */
        focusDefaultButton: function () {
            if (this.defaultHtmlButton) {
                this.defaultHtmlButton.focus();
            }
        },
        
        /**
        * Blurs all the html buttons
        * @method blurButtons
        */
        blurButtons: function () {
    
            var buttons = this.cfg.getProperty("buttons"),
                html;
    
            if (buttons && buttons instanceof Array) {
                html = buttons[0].htmlButton;
                if (html) {
                    html.blur();
                }
            }
        },
        
        /**
        * Sets the focus to the first button in the button list
        * @method focusFirstButton
        */
        focusFirstButton: function () {
    
            var buttons = this.cfg.getProperty("buttons"),
                html;
    
            if (buttons && buttons instanceof Array) {
                html = buttons[0].htmlButton;
                if (html) {
                    html.focus();
                }
            }
        },
        
        /**
        * Sets the focus to the first button in the button list
        * @method focusLastButton
        */
        focusLastButton: function () {
    
            var buttons = this.cfg.getProperty("buttons"),
                html;
    
            buttons = this.cfg.getProperty("buttons");
            if (buttons && buttons instanceof Array) {
                html = buttons[buttons.length - 1].htmlButton;
                if (html) {
                    html.focus();
                }
            }
        },
        
        /**
        * The default event handler for the "postmethod" configuration property
        * @method configPostMethod
        * @param {String} type The CustomEvent type (usually the property name)
        * @param {Object[]} args The CustomEvent arguments. For 
        * configuration handlers, args[0] will equal the newly applied value 
        * for the property.
        * @param {Object} obj The scope object. For configuration handlers, 
        * this will usually equal the owner.
        */
        configPostMethod: function (type, args, obj) {
    
            var postmethod = args[0];
        
            this.registerForm();
    
            Event.on(this.form, "submit", function (e) {
                Event.stopEvent(e);
                this.submit();
                this.form.blur();
    
            }, this, true);
    
        },
        
        // END BUILT-IN PROPERTY EVENT HANDLERS //
        
        /**
        * Built-in function hook for writing a validation function that will 
        * be checked for a "true" value prior to a submit. This function, as 
        * implemented by default, always returns true, so it should be 
        * overridden if validation is necessary.
        * @method validate
        */
        validate: function () {
            return true;
        },
        
        /**
        * Executes a submit of the Dialog followed by a hide, if validation 
        * is successful.
        * @method submit
        */
        submit: function () {
            if (this.validate()) {
                this.beforeSubmitEvent.fire();
                this.doSubmit();
                this.submitEvent.fire();
                this.hide();
                return true;
            } else {
                return false;
            }
        },
        
        /**
        * Executes the cancel of the Dialog followed by a hide.
        * @method cancel
        */
        cancel: function () {
            this.cancelEvent.fire();
            this.hide();
        },
        
        /**
        * Returns a JSON-compatible data structure representing the data 
        * currently contained in the form.
        * @method getData
        * @return {Object} A JSON object reprsenting the data of the 
        * current form.
        */
        getData: function () {
        
            var oForm = this.form,
                aElements,
                nTotalElements,
                oData,
                sName,
                oElement,
                nElements,
                sType,
                sTagName,
                aOptions,
                nOptions,
                aValues,
                oOption,
                sValue,
                oRadio,
                oCheckbox,
                i,
                n;    
    
            function isFormElement(p_oElement) {
            
                var sTag = p_oElement.tagName.toUpperCase();
                
                return ((sTag == "INPUT" || sTag == "TEXTAREA" || 
                        sTag == "SELECT") && p_oElement.name == sName);
    
            }
    
    
            if (oForm) {
        
                aElements = oForm.elements;
                nTotalElements = aElements.length;
                oData = {};
    
        
                for (i = 0; i < nTotalElements; i++) {
        
                    sName = aElements[i].name;
        
                    /*
                        Using "Dom.getElementsBy" to safeguard user from JS 
                        errors that result from giving a form field (or set of 
                        fields) the same name as a native method of a form 
                        (like "submit") or a DOM collection (such as the "item"
                        method). Originally tried accessing fields via the 
                        "namedItem" method of the "element" collection, but 
                        discovered that it won't return a collection of fields 
                        in Gecko.
                    */
        
                    oElement = Dom.getElementsBy(isFormElement, "*", oForm);
                    nElements = oElement.length;
        
                    if (nElements > 0) {
        
                        if (nElements == 1) {
        
                            oElement = oElement[0];
        
                            sType = oElement.type;
                            sTagName = oElement.tagName.toUpperCase();
        
                            switch (sTagName) {
        
                            case "INPUT":
    
                                if (sType == "checkbox") {
    
                                    oData[sName] = oElement.checked;
    
                                }
                                else if (sType != "radio") {
    
                                    oData[sName] = oElement.value;
    
                                }
    
                                break;
    
                            case "TEXTAREA":
    
                                oData[sName] = oElement.value;
    
                                break;
    
                            case "SELECT":
    
                                aOptions = oElement.options;
                                nOptions = aOptions.length;
                                aValues = [];
    
                                for (n = 0; n < nOptions; n++) {
    
                                    oOption = aOptions[n];
    
                                    if (oOption.selected) {
    
                                        sValue = oOption.value;
    
                                        if (!sValue || sValue === "") {
    
                                            sValue = oOption.text;
    
                                        }
    
                                        aValues[aValues.length] = sValue;
    
                                    }
    
                                }
    
                                oData[sName] = aValues;
    
                                break;
        
                            }
        
        
                        }
                        else {
        
                            sType = oElement[0].type;
        
                            switch (sType) {
        
                            case "radio":
    
                                for (n = 0; n < nElements; n++) {
    
                                    oRadio = oElement[n];
    
                                    if (oRadio.checked) {
    
                                        oData[sName] = oRadio.value;
                                        break;
    
                                    }
    
                                }
    
                                break;
    
                            case "checkbox":
    
                                aValues = [];
    
                                for (n = 0; n < nElements; n++) {
    
                                    oCheckbox = oElement[n];
    
                                    if (oCheckbox.checked) {
    
                                        aValues[aValues.length] = 
                                            oCheckbox.value;
    
                                    }
    
                                }
    
                                oData[sName] = aValues;
    
                                break;
        
                            }
        
                        }
        
                    }
        
                }
        
            }
        
        
            return oData;
        
        },
        
        /**
        * Removes the Panel element from the DOM and sets all child elements 
        * to null.
        * @method destroy
        */
        destroy: function () {
        
            var oForm = this.form,
                oFooter = this.footer,
                aButtons,
                i;
        
            if (oFooter) {
        
                aButtons = oFooter.getElementsByTagName("button");
        
                if (aButtons && aButtons.length > 0) {
        
                    i = aButtons.length - 1;
                    
                    do {
                    
                        Event.purgeElement(aButtons[i], false, "click");
                    
                    }
                    while (i--);
                
                }
        
            }
            
        
            if (oForm) {
               
                Event.purgeElement(oForm);
        
                this.body.removeChild(oForm);
                
                this.form = null;
        
            }
        
            Dialog.superclass.destroy.call(this);  
        
        },
        
        /**
        * Returns a string representation of the object.
        * @method toString
        * @return {String} The string representation of the Dialog
        */
        toString: function () {
            return "Dialog " + this.id;
        }
    
    });

}());