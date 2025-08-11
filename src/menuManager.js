/**
 * In-memory menu registry and shared state manager
 */
class MenuManager {

    static #_menus = {};
    static #_context = {};
    static #_currentMessageId = null;
    static #_mediaType = 'text'; // Default media type is text
    static #_payload = null; // Optional navigation payload

    /**
     * Register a menu instance in the internal registry
     * @param {any} menuClass
     */
    static registerMenu(menuClass) {
        if (!menuClass || typeof menuClass !== 'object' || typeof menuClass.menuId !== 'string') {
            throw new Error('Only instances of Menu can be added.');
        }
        if (this.#_menus[menuClass.menuId]) {
            return;
        }
        this.#_menus[menuClass.menuId] = deepFreeze(menuClass);
    }

    /**
     * Get a registered menu by id
     * @param {string} menuId
     */
    static getMenuById(menuId) {
        const menu = this.#_menus[menuId] || null;
        if (!menu) {
            throw new Error(`Menu with ID ${menuId} does not exist.`);
        }
        return menu;
    }

    /**
     * Get all registered menus
     * @returns {Record<string, any>}
     */
    static getMenus() {
        return this.#_menus || null;
    }

    /**
     * Set global context and current message info
     * @param {any} newContext
     * @param {number|null} [messageId]
     * @param {'text'|'media'|null} [mediaType]
     * @returns {any}
     */
    static setContext(newContext, messageId = null, mediaType = null) {
        this.#_context = newContext;
        
        if (messageId) {
            this.#_currentMessageId = messageId;
        }
        
        if (mediaType) {
            this.#_mediaType = mediaType;
        }
        
        return this.#_context;
    }

    /**
     * Get global context
     * @returns {any}
     */
    static getContext() {
        return this.#_context || null;
    }
    
    /**
     * Get current message id (used for edits)
     * @returns {number|null}
     */
    static getCurrentMessageId() {
        return this.#_currentMessageId;
    }
    
    /**
     * Get media type for edit (text/media)
     * @returns {'text'|'media'}
     */
    static getMediaType() {
        return this.#_mediaType;
    }

    /**
     * Set navigation payload
     * @param {any} payload
     */
    static setPayload(payload) {
        this.#_payload = payload === undefined ? null : payload;
        return this.#_payload;
    }

    /**
     * Get navigation payload
     * @returns {any}
     */
    static getPayload() {
        return this.#_payload;
    }
}

function deepFreeze(obj) {
    Object.freeze(obj);
    Object.keys(obj).forEach(key => {
        if (typeof obj[key] === 'object' && obj[key] !== null && !Object.isFrozen(obj[key])) {
            deepFreeze(obj[key]);
        }
    });
    return obj;
}

export default MenuManager;