import MenuManager from './menuManager.js';
import ButtonManager from './buttonManager.js';
import MessageUpdater from './messageUpdater.js';
import Button from './button.js';
import Rule from './rule.js';

/**
 * Check if value is a new-style options object.
 * @param {any} value
 * @returns {boolean}
 */
function isOptionsObject(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    return 'rule' in value || 'style' in value || 'icon' in value;
}

/**
 * Parse options object into {requirement, appearance}.
 * @param {Object} options
 * @returns {{requirement: Rule, appearance: Object}}
 */
function parseOptions(options) {
    let requirement = undefined;
    const appearance = {};

    if (options.style !== undefined) appearance.style = options.style;
    if (options.icon !== undefined) appearance.iconCustomEmojiId = options.icon;

    if (options.rule !== undefined) {
        if (Rule.isRuleLike(options.rule)) {
            requirement = options.rule;
        } else if (typeof options.rule === 'object' && options.rule !== null) {
            const r = new Rule(options.rule.when || (() => true));
            if (options.rule.failStyle !== undefined) r.failStyle(options.rule.failStyle);
            if (options.rule.failIcon !== undefined) r.failIcon(options.rule.failIcon);
            if (options.rule.failLabel !== undefined) r.failLabel(options.rule.failLabel);
            if (options.rule.lock) r.lock();
            if (options.rule.hide) r.hide();
            if (options.rule.onFail) r.onFail(options.rule.onFail);
            requirement = r;
        }
    }

    return { requirement, appearance };
}

/**
 * Normalize options argument into {requirement, appearance}.
 * @param {any} options - Options object with rule, style, icon
 * @returns {{requirement: Rule|undefined, appearance: Object}}
 */
function normalizeButtonOptions(options) {
    if (!options || typeof options !== 'object') {
        return { requirement: undefined, appearance: undefined };
    }

    if (isOptionsObject(options)) {
        return parseOptions(options);
    }

    // If it's a Rule instance directly
    if (Rule.isRuleLike(options)) {
        return { requirement: options, appearance: undefined };
    }

    return { requirement: undefined, appearance: options };
}

/**
 * Menu builder and updater for Telegram inline keyboards.
 * Provides a fluent API for building menus with buttons, navigation, and dynamic content.
 */
class Menu {

    #_caption;
    #_format;
    #_dynamicGenerators = [];
    #_temporaryButtons = null;

    /**
     * Creates a new Menu.
     * @param {string} menuId - Unique identifier for this menu
     * @throws {Error} If menuId is not provided
     */
    constructor(menuId = null) {
        if (!menuId) throw new Error('Menu ID is required. Example: new Menu("main_menu")');

        this.buttonManager = new ButtonManager();
        this.menuId = menuId;
        this.buttons = this.buttonManager;
        this.parentMenuId = null;

        const mw = this.middleware();
        return new Proxy(this, {
            apply: (target, thisArg, args) => mw(args[0], args[1]),
            get: (target, prop) => {
                const value = target[prop];
                return typeof value === 'function' ? value.bind(target) : value;
            }
        });
    }

    /**
     * Resolve caption text from static or dynamic input.
     * @param {any} [ctx]
     * @param {any} [payload]
     * @returns {string|undefined}
     */
    getCaption(ctx = MenuManager.getContext(), payload = MenuManager.getPayload()) {
        return typeof this.#_caption === 'function'
            ? this.#_caption(ctx, payload)
            : this.#_caption;
    }

    /**
     * Add an action button that executes a callback when clicked.
     * @param {string|Function} label - Button text or function returning text
     * @param {Function} [middleware] - Handler invoked when button is clicked
     * @param {Object} [options] - Button options (rule, style, icon)
     * @returns {this} For method chaining
     */
    text(label, middleware, options) {
        const parsed = normalizeButtonOptions(options);
        const button = new Button(label, { type: 'action', middleware, ...parsed });
        this.buttonManager.addButton(button);
        return this;
    }

    /**
     * Add a URL button that opens a link when clicked.
     * @param {string|Function} label - Button text or function returning text
     * @param {string} url - URL to open
     * @param {Object} [options] - Button options (rule, style, icon)
     * @returns {this} For method chaining
     */
    url(label, url, options) {
        const parsed = normalizeButtonOptions(options);
        const button = new Button(label, { type: 'url', url, ...parsed });
        this.buttonManager.addButton(button);
        return this;
    }

    /**
     * Add a WebApp button that opens a Telegram Web App.
     * @param {string|Function} label - Button text or function returning text
     * @param {string} webAppUrl - Web App URL
     * @param {Object} [options] - Button options (rule, style, icon)
     * @returns {this} For method chaining
     */
    webApp(label, webAppUrl, options) {
        const parsed = normalizeButtonOptions(options);
        const button = new Button(label, { type: 'webApp', url: webAppUrl, ...parsed });
        this.buttonManager.addButton(button);
        return this;
    }

    /**
     * Add a copy button that copies text to the clipboard.
     * @param {string|Function} label
     * @param {string} copyText
     * @param {Object} [options] - Button options (rule, style, icon)
     * @returns {this}
     */
    copy(label, copyText, options) {
        const parsed = normalizeButtonOptions(options);
        const button = new Button(label, { type: 'copy', copyText, ...parsed });
        this.buttonManager.addButton(button);
        return this;
    }



    /**
     * Start a new row in the keyboard layout.
     * Subsequent buttons will appear on a new row.
     * @returns {this} For method chaining
     */
    row() {
        this.buttonManager.newRow();
        return this;
    }

    /**
     * Add a submenu navigation button.
     * Clicking this button navigates to another menu.
     * @param {string|Function} label - Button text or function returning text
     * @param {string} submenuId - ID of the menu to navigate to
     * @param {any|Function} [payload] - Data to pass to the submenu
     * @param {Object} [options] - Rule/appearance options
     * @returns {this} For method chaining
     */
    submenu(label, submenuId, payload, options) {
        return this.text(label, (ctx, menu) => {
            const resolvedPayload = typeof payload === 'function' ? payload(ctx, menu) : payload;
            return menu.nav(submenuId, resolvedPayload);
        }, options);
    }

    /**
     * Create an API object used by button handlers for navigation/update
     * @param {Menu} [targetMenu]
     * @returns {{update:()=>Promise<void>|void, nav:(menuId:string, payload?:any)=>any, back:(menuId?:string|null, payload?:any)=>any, getPayload:()=>any}}
     * @private
     */
    #createMenuApi(targetMenu) {
        const menu = targetMenu || this;
        return {
            update: () => menu.update(),
            nav: (menuId, payload = null) => menu.nav(menuId, payload),
            back: (menuId, payload = null) => menu.nav(menuId || menu.parentMenuId, payload),
            getPayload: () => MenuManager.getPayload()
        };
    }

    /**
     * Insert dynamic buttons at the exact call location
     * @param {Function} generator Function that receives (ctx, range, payload)
     */
    dynamic(generator) {
        // Create a unique id for this dynamic block
        const dynamicId = `dynamic_${this.#_dynamicGenerators.length}`;

        // Store the generator alongside its id
        this.#_dynamicGenerators.push({
            id: dynamicId,
            generator: generator
        });

        // Add an invisible placeholder button as an injection marker
        const placeholderButton = new Button(`__placeholder_${dynamicId}__`, {
            type: 'placeholder',
            middleware: null,
            requirement: new Rule(() => false).hide()
        });

        // Add the placeholder marker
        this.buttons.addButton(placeholderButton);

        return this;
    }

    /**
     * Add a back navigation button
     * @param {string|((ctx:any)=>string)} label
     * @param {string} [menuId]
     * @param {any|((ctx:any, menuApi:any)=>any)} [payload]
     * @param {Object} [options] - Rule/appearance options
     * @returns {this}
     */
    back(label, menuId, payload, options) {
        return this.text(label, (ctx, menu) => {
            const targetMenuId = menuId || this.parentMenuId;
            const resolvedPayload = typeof payload === 'function' ? payload(ctx, menu) : payload;
            return menu.nav(targetMenuId, resolvedPayload);
        }, options);
    }

    /**
     * Navigate to another menu and set payload
     * @param {string} menuId
     * @param {any} [payload]
     */
    async nav(menuId, payload = null) {
        if (!menuId) {
            console.error(`Cannot navigate from menu "${this.menuId}" without a target menu ID.`);
            return false;
        }

        let menu;
        try {
            menu = MenuManager.getMenuById(menuId);
        } catch (error) {
            console.error(error.message);
            return false;
        }

        MenuManager.setPayload(payload);
        await menu.update();
        return true;
    }

    /**
     * Set caption and parse mode
     * @param {string|((ctx:any, payload:any)=>string)} caption
     * @param {'Markdown'|'MarkdownV2'|'HTML'|string} [format]
     * @returns {this}
     */
    setCaption(caption, format = 'Markdown') {
        this.#_caption = caption;
        this.#_format = format;
        return this;
    }

    /**
     * Caption parse mode
     * @returns {'Markdown'|'MarkdownV2'|'HTML'|string|undefined}
     */
    get format() {
        return this.#_format;
    }

    /**
     * Evaluate buttons and update Telegram message
     */
    async update() {
        const ctx = MenuManager.getContext();
        const payload = MenuManager.getPayload();
        try {
            await this.#evaluate(ctx, payload);

            if (!ctx || !ctx.chat || !ctx.telegram) {
                console.error('Invalid context for menu update');
                return;
            }

            const messageId = MenuManager.getCurrentMessageId();
            if (!messageId) {
                console.error('No message ID available for update');
                return;
            }

            const mediaType = MenuManager.getMediaType();
            const options = {
                parse_mode: this.format,
                reply_markup: await this.toJSON(ctx, payload)
            };

            await MessageUpdater.updateMessage(
                ctx,
                messageId,
                this.getCaption(ctx, payload),
                options,
                mediaType
            );
        } catch (error) {
            console.error('Error updating menu:', error.message);
        }
    }

    /**
     * Register a submenu and set its parent
     * @param {Menu} submenu
     */
    register(submenu) {
        submenu.parentMenuId = this.menuId;
        MenuManager.registerMenu(submenu);
        return this;
    }

    /**
     * Evaluate dynamic content and return send-ready data for first render.
     * @param {any} ctx
     * @param {any} [payload]
     * @returns {Promise<{text:string|undefined, parse_mode:string|undefined, reply_markup:{inline_keyboard:Array<Array<{text:string, url?:string, web_app?:{url:string}, copy_text?:{text:string}, icon_custom_emoji_id?:string, style?:string, callback_data?:string}>>}}>} 
     */
    async render(ctx, payload = MenuManager.getPayload()) {
        await this.#evaluate(ctx, payload);

        return {
            text: this.getCaption(ctx, payload),
            parse_mode: this.format,
            reply_markup: await this.toJSON(ctx, payload)
        };
    }

    /**
     * Send menu to a chat.
     * @param {any} ctx - Telegraf context (needs ctx.telegram and ctx.chat.id)
     * @param {any} [payload] - Optional payload for dynamic captions
     * @returns {Promise<Object>} Sent message info from Telegram API
     */
    async sendToChat(ctx, payload) {
        const { text, parse_mode, reply_markup } = await this.render(ctx, payload);
        return ctx.telegram.sendMessage(ctx.chat.id, text, { parse_mode, reply_markup });
    }

    /**
     * Build the final button structure taking dynamic sections into account
     * @private
     */
    async #evaluate(ctx = MenuManager.getContext(), payload = MenuManager.getPayload()) {
        this.#_temporaryButtons = new ButtonManager();

        const originalButtons = this.buttons.getButtons();

        const generatedContent = new Map();
        for (const dynItem of this.#_dynamicGenerators) {
            const tempManager = new ButtonManager();
            const range = new MenuRange(tempManager);
            await dynItem.generator(ctx, range, payload);
            generatedContent.set(dynItem.id, tempManager.getButtons());
        }

        for (let rowIndex = 0; rowIndex < originalButtons.length; rowIndex++) {
            const row = originalButtons[rowIndex];

            for (let colIndex = 0; colIndex < row.length; colIndex++) {
                const button = row[colIndex];

                if (button.type === 'placeholder' && button.rawLabel && button.rawLabel.startsWith('__placeholder_')) {
                    const dynamicId = button.rawLabel.replace('__placeholder_', '').replace('__', '');

                    const dynamicButtons = generatedContent.get(dynamicId);
                    if (dynamicButtons && dynamicButtons.length > 0) {
                        for (let i = 0; i < dynamicButtons.length; i++) {
                            const dynRow = dynamicButtons[i];

                            for (const dynButton of dynRow) {
                                this.#_temporaryButtons.addButton(dynButton);
                            }

                            if (i < dynamicButtons.length - 1) {
                                this.#_temporaryButtons.newRow();
                            }
                        }
                    }
                } else {
                    this.#_temporaryButtons.addButton(button);
                }
            }

            if (rowIndex < originalButtons.length - 1) {
                this.#_temporaryButtons.newRow();
            }
        }

        await this.#_temporaryButtons.evaluateAll(ctx);
    }

    /**
     * Get inline keyboard JSON for Telegram API
     * @param {any} [ctx]
     * @param {any} [payload]
     * @returns {Promise<{inline_keyboard: Array<Array<{text:string, url?:string, web_app?:{url:string}, copy_text?:{text:string}, icon_custom_emoji_id?:string, style?:string, callback_data?:string}>>>}
     */
    async toJSON(ctx, payload) {
        const context = ctx || MenuManager.getContext();
        const pload = payload !== undefined ? payload : MenuManager.getPayload();
        if (!this.#_temporaryButtons) {
            await this.#evaluate(context, pload);
        }
        const buttonManager = this.#_temporaryButtons || this.buttons;
        return buttonManager.toJSON(context, pload);
    }

    /**
     * Evaluate dynamic content and populate active buttons.
     * @param {any} [ctx]
     * @param {any} [payload]
     */
    async evaluate(ctx, payload) {
        await this.#evaluate(ctx, payload);
    }

    /**
     * Get the active ButtonManager (evaluated temporary or original static).
     * @returns {ButtonManager}
     */
    get activeButtons() {
        return this.#_temporaryButtons || this.buttons;
    }

    /**
     * Middleware to route callback_data to the correct button
     * @returns {(ctx:any, next:()=>Promise<any>)=>Promise<any>}
     */
    middleware() {
        return async (ctx, next) => {
            return MenuManager.executeInSessionContext(ctx, async () => {
                MenuManager.registerMenu(this);
                ctx = MenuManager.setContext(ctx, ctx.callbackQuery?.message.message_id);

                const callbackData = ctx.callbackQuery?.data;
                const payload = MenuManager.getPayload();

                let foundButton = null;
                let foundMenu = null;

                if (callbackData) {
                    const allMenus = MenuManager.getMenus();
                    for (const menuId in allMenus) {
                        const menu = allMenus[menuId];
                        await menu.evaluate(ctx, payload);
                        const buttons = menu.activeButtons.getButtons();

                        for (const row of buttons) {
                            for (const button of row) {
                                if (button.callbackData === callbackData) {
                                    foundButton = button;
                                    foundMenu = menu;
                                    break;
                                }
                            }
                            if (foundButton) break;
                        }
                        if (foundButton) break;
                    }
                }

                if (!callbackData) return next();

                if (foundButton && foundMenu) {
                    const menuApi = this.#createMenuApi(foundMenu);
                    await foundButton.handler(ctx, menuApi);
                } else {
                    console.log(`No button found for callback data: ${callbackData}`);
                }

                await ctx.answerCbQuery().catch(() => { });

                return next();
            });
        };
    }
}

/**
 * Temporary builder used within dynamic() blocks to add buttons inline.
 * Provides the same button-building API as Menu.
 * @internal
 */
class MenuRange {
    /**
     * Creates a new MenuRange (used internally by dynamic()).
     * @param {ButtonManager} buttonManager - Button manager to add buttons into
     * @private
     */
    constructor(buttonManager) {
        this.buttonManager = buttonManager;
    }

    /**
     * Add an action button that executes a callback when clicked.
     * @param {string|Function} label - Button text or function returning text
     * @param {Function} [middleware] - Handler invoked when button is clicked
     * @param {Object} [options] - Button options (rule, style, icon)
     * @returns {this} For method chaining
     */
    text(label, middleware, options) {
        const parsed = normalizeButtonOptions(options);
        const button = new Button(label, { type: 'action', middleware, ...parsed });
        this.buttonManager.addButton(button);
        return this;
    }

    /**
     * Add a URL button that opens a link when clicked.
     * @param {string|Function} label - Button text or function returning text
     * @param {string} url - URL to open
     * @param {Object} [options] - Button options (rule, style, icon)
     * @returns {this} For method chaining
     */
    url(label, url, options) {
        const parsed = normalizeButtonOptions(options);
        const button = new Button(label, { type: 'url', url, ...parsed });
        this.buttonManager.addButton(button);
        return this;
    }

    /**
     * Add a WebApp button that opens a Telegram Web App.
     * @param {string|Function} label - Button text or function returning text
     * @param {string} webAppUrl - Web App URL
     * @param {Object} [options] - Button options (rule, style, icon)
     * @returns {this} For method chaining
     */
    webApp(label, webAppUrl, options) {
        const parsed = normalizeButtonOptions(options);
        const button = new Button(label, { type: 'webApp', url: webAppUrl, ...parsed });
        this.buttonManager.addButton(button);
        return this;
    }

    /**
     * Add a copy button that copies text to the clipboard.
     * @param {string|Function} label
     * @param {string} copyText
     * @param {Object} [options] - Button options (rule, style, icon)
     * @returns {this}
     */
    copy(label, copyText, options) {
        const parsed = normalizeButtonOptions(options);
        const button = new Button(label, { type: 'copy', copyText, ...parsed });
        this.buttonManager.addButton(button);
        return this;
    }



    /**
     * Start a new row in the keyboard layout.
     * Subsequent buttons will appear on a new row.
     * @returns {this} For method chaining
     */
    row() {
        this.buttonManager.newRow();
        return this;
    }

    /**
     * Add a submenu navigation button.
     * Clicking this button navigates to another menu.
     * @param {string|Function} label - Button text or function returning text
     * @param {string} submenuId - ID of the menu to navigate to
     * @param {any|Function} [payload] - Data to pass to the submenu
     * @param {Object} [options] - Rule/appearance options
     * @returns {this} For method chaining
     */
    submenu(label, submenuId, payload, options) {
        return this.text(label, (ctx, menu) => {
            const resolvedPayload = typeof payload === 'function' ? payload(ctx, menu) : payload;
            return menu.nav(submenuId, resolvedPayload);
        }, options);
    }
}

export default Menu;
export { MenuRange };
