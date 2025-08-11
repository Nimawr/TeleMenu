import MenuManager from './menuManager.js';
import ButtonManager from './buttonManager.js';
import Button from './button.js';
import MenuRange from './menuRange.js';

/**
 * Menu builder and updater for Telegram inline keyboards
 */
class Menu {

    #_caption;
    #_format;
    #_dynamicGenerators = [];
    #_temporaryButtons = null;

    /**
     * @param {string} menuId Menu identifier
     */
    constructor(menuId = null) {
        if (!menuId) throw new Error('Menu ID is required.');

        this.menuId = menuId;
        this.buttons = new ButtonManager();
        this.parentMenuId = null;
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
     * Add an action button
     * @param {string|((ctx:any)=>string)} label
     * @param {(ctx:any, menuApi:any)=>any|Promise<any>} [middleware]
     * @param {import('./button.js').Requirement} [requirement]
     * @returns {this}
     */
    text(label, middleware, requirement) {
        const button = new Button(label, { type: 'action', middleware, requirement });
        this.buttons.addButton(button);
        return this;
    }

    /**
     * Add a URL button
     * @param {string|((ctx:any)=>string)} label
     * @param {string} url
     * @param {import('./button.js').Requirement} [requirement]
     * @returns {this}
     */
    url(label, url, requirement) {
        const button = new Button(label, { type: 'url', url, requirement });
        this.buttons.addButton(button);
        return this;
    }

    /**
     * Add a WebApp button
     * @param {string|((ctx:any)=>string)} label
     * @param {string} webAppUrl
     * @param {import('./button.js').Requirement} [requirement]
     * @returns {this}
     */
    webApp(label, webAppUrl, requirement) {
        const button = new Button(label, { type: 'webApp', url: webAppUrl, requirement });
        this.buttons.addButton(button);
        return this;
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
            requirement: { hidden: true } 
        });
        
        // Add the placeholder marker
        this.buttons.addButton(placeholderButton);
        
        return this;
    }

    /**
     * Add a submenu navigation button
     * @param {string|((ctx:any)=>string)} label
     * @param {string} submenuId
     * @param {any|((ctx:any, menuApi:any)=>any)} [payload]
     * @returns {this}
     */
    submenu(label, submenuId, payload) {
        return this.text(label, (ctx, menu) => {
            const resolvedPayload = typeof payload === 'function' ? payload(ctx, menu) : payload;
            return menu.nav(submenuId, resolvedPayload);
        });
    }

    /**
     * Add a back navigation button
     * @param {string|((ctx:any)=>string)} label
     * @param {string} [menuId]
     * @param {any|((ctx:any, menuApi:any)=>any)} [payload]
     * @returns {this}
     */
    back(label, menuId, payload) {
        return this.text(label, (ctx, menu) => {
            const targetMenuId = menuId || this.parentMenuId;
            const resolvedPayload = typeof payload === 'function' ? payload(ctx, menu) : payload;
            return menu.nav(targetMenuId, resolvedPayload);
        });
    }

    /**
     * Start a new row
     * @returns {this}
     */
    row() {
        this.buttons.newRow();
        return this;
    }

    /**
     * Navigate to another menu and set payload
     * @param {string} menuId
     * @param {any} [payload]
     */
    nav(menuId, payload = null) {
        const menu = MenuManager.getMenuById(menuId);
        MenuManager.setPayload(payload);
        menu.update();
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
     * Computed caption (readonly)
     * @returns {string|undefined}
     */
    get caption() {
        return typeof this.#_caption === 'function'
            ? this.#_caption(MenuManager.getContext(), MenuManager.getPayload())
            : this.#_caption;
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
        try {
            await this.#evaluate();
            
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
                reply_markup: this.toJSON(ctx)
            };
            
            try {
                if (mediaType === 'media') {
                    await ctx.telegram.editMessageCaption(
                        ctx.chat.id,
                        messageId,
                        undefined,
                        this.caption,
                        options
                    );
                } else {
                    await ctx.telegram.editMessageText(
                        ctx.chat.id,
                        messageId,
                        undefined,
                        this.caption,
                        options
                    );
                }
            } catch (editError) {
                try {
                    if (mediaType === 'media') {
                        await ctx.telegram.editMessageText(
                            ctx.chat.id,
                            messageId,
                            undefined,
                            this.caption,
                            options
                        );
                    } else {
                        await ctx.telegram.editMessageCaption(
                            ctx.chat.id,
                            messageId,
                            undefined,
                            this.caption,
                            options
                        );
                    }
                } catch (altError) {
                    console.error('Both update methods failed:', altError.message);
                }
            }
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
    }

    /**
     * Build the final button structure taking dynamic sections into account
     * @private
     */
    async #evaluate() {
        this.#_temporaryButtons = new ButtonManager();
        
        const originalButtons = this.buttons.getButtons();
        const ctx = MenuManager.getContext();
        
            const generatedContent = new Map();
            const payload = MenuManager.getPayload();
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
     * @returns {{inline_keyboard: Array<Array<{text:string, url?:string, callback_data?:string}>>}}
     */
    toJSON(ctx) {
        const context = ctx || MenuManager.getContext();
        const buttonManager = this.#_temporaryButtons || this.buttons;
        return buttonManager.toJSON(context);
    }

    /**
     * Middleware to route callback_data to the correct button
     * @returns {(ctx:any, next:()=>Promise<any>)=>Promise<any>}
     */
    middleware() {
        return async (ctx, next) => {
            MenuManager.registerMenu(this);
            ctx = MenuManager.setContext(ctx, ctx.callbackQuery?.message.message_id);

            await this.#evaluate();

            const callbackData = ctx.callbackQuery?.data;
            if (!callbackData) return next();
            
            let foundButton = null;
            let foundMenu = null;
            
            const allMenus = MenuManager.getMenus();
            for (const menuId in allMenus) {
                const menu = allMenus[menuId];
                const menuButtonManager = menu.#_temporaryButtons || menu.buttons;
                const buttons = menuButtonManager.getButtons();
                
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
            
            if (foundButton && foundMenu) {
                const menuApi = this.#createMenuApi(foundMenu);
                await foundButton.handler(ctx, menuApi);
            } else {
                console.log(`No button found for callback data: ${callbackData}`);
            }

            await ctx.answerCbQuery().catch(() => { });

            return next();
        }
    }
}

export default Menu;