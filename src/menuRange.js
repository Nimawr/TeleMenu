import Button from './button.js';

/**
 * Temporary range object used by dynamic() to append buttons in-place
 */
class MenuRange {
    /**
     * @param {import('./buttonManager.js').default} buttonManager Button manager to add buttons into
     */
    constructor(buttonManager) {
        this.buttonManager = buttonManager;
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
        this.buttonManager.addButton(button);
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
        this.buttonManager.addButton(button);
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
        this.buttonManager.addButton(button);
        return this;
    }

    /**
     * Start a new row
     * @returns {this}
     */
    row() {
        this.buttonManager.newRow();
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
}

export default MenuRange; 