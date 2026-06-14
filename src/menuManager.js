/**
 * Encapsulates session-specific state for menu operations.
 * Allows multiple concurrent menu sessions within a single application.
 * @private
 */
class MenuSessionContext {
    /**
     * @param {string} sessionId - Unique identifier for this session
     */
    constructor(sessionId) {
        this.sessionId = sessionId;
        this.context = null;
        this.currentMessageId = null;
        this.mediaType = 'text';
        this.payload = null;
    }

    /**
     * Update context and related message information
     * @param {any} newContext - Telegraf context object
     * @param {number|null} [messageId] - Message ID for editing
     * @param {'text'|'media'|null} [mediaType] - Media type
     * @returns {any} The updated context
     */
    setContext(newContext, messageId = null, mediaType = null) {
        this.context = newContext;

        if (messageId) {
            this.currentMessageId = messageId;
        }

        if (mediaType) {
            this.mediaType = mediaType;
        }

        return this.context;
    }

    /**
     * Get the context
     * @returns {any}
     */
    getContext() {
        return this.context || null;
    }

    /**
     * Get the current message ID
     * @returns {number|null}
     */
    getCurrentMessageId() {
        return this.currentMessageId;
    }

    /**
     * Get the media type
     * @returns {'text'|'media'}
     */
    getMediaType() {
        return this.mediaType;
    }

    /**
     * Set navigation payload
     * @param {any} payload
     */
    setPayload(payload) {
        this.payload = payload === undefined ? null : payload;
        return this.payload;
    }

    /**
     * Get navigation payload
     * @returns {any}
     */
    getPayload() {
        return this.payload;
    }
}

/**
 * In-memory menu registry and session state manager.
 * Manages menu registration, session lifecycle, and state coordination.
 *
 * Supports concurrent menu sessions for multi-user bot scenarios.
 * Each session maintains isolated state (context, payload, message ID).
 *
 * @internal
 * @class MenuManager
 * @example
 * // Register a menu
 * MenuManager.registerMenu(menuInstance);
 *
 * // Set context for current session
 * MenuManager.setContext(ctx, messageId);
 *
 * // Navigate to a menu
 * const menu = MenuManager.getMenuById('main');
 * MenuManager.setPayload({ userId: 123 });
 * menu.update();
 */
class MenuManager {

    static #_menus = {};
    static #_sessions = new Map(); // sessionId -> MenuSessionContext
    static #_currentSessionId = '__default__'; // Default session for backward compatibility
    static #_sessionIdStack = []; // Stack for nested session context (e.g., in middleware)

    /**
     * Register a menu instance in the internal registry.
     * Required before using a menu with middleware.
     *
     * @param {Menu} menuClass - Menu instance to register
     * @throws {Error} If menuClass is not a valid Menu instance
     * @example
     * MenuManager.registerMenu(mainMenu);
     */
    static registerMenu(menuClass) {
        if (!menuClass || typeof menuClass !== 'object' || typeof menuClass.menuId !== 'string') {
            throw new Error('Only instances of Menu can be added.');
        }
        if (this.#_menus[menuClass.menuId]) {
            return;
        }
        this.#_menus[menuClass.menuId] = menuClass;
    }

    /**
     * Get a registered menu by id
     * @param {string} menuId
     */
    static getMenuById(menuId) {
        const menu = this.#_menus[menuId] || null;
        if (!menu) {
            const available = Object.keys(this.#_menus);
            throw new Error(
                `Menu with ID "${menuId}" does not exist. ` +
                (available.length > 0
                    ? `Available menus: ${available.join(', ')}`
                    : `No menus have been registered yet.`)
            );
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
     * Get or create a session context
     * @param {string} [sessionId] - If not provided, uses current session
     * @returns {MenuSessionContext}
     * @private
     */
    static #getOrCreateSession(sessionId) {
        const id = sessionId || this.#_currentSessionId;
        if (!this.#_sessions.has(id)) {
            this.#_sessions.set(id, new MenuSessionContext(id));
        }
        return this.#_sessions.get(id);
    }

    /**
     * Set the current active session (used internally during middleware execution)
     * @param {string} sessionId
     * @private
     */
    static #setCurrentSession(sessionId) {
        this.#_sessionIdStack.push(this.#_currentSessionId);
        this.#_currentSessionId = sessionId;
    }

    /**
     * Restore the previous session
     * @private
     */
    static #restoreSession() {
        if (this.#_sessionIdStack.length > 0) {
            this.#_currentSessionId = this.#_sessionIdStack.pop();
        }
    }

    /**
     * Set context and current message info for the active session.
     * Called automatically by middleware, but can be used manually for direct control.
     *
     * @param {any} newContext - Telegraf context object
     * @param {number|null} [messageId] - Message ID for editing
     * @param {'text'|'media'|null} [mediaType] - Hint about message type (text or media)
     * @param {string} [sessionId] - Session identifier for concurrent use (auto-generated if not provided)
     * @returns {any} The updated context
     * @example
     * MenuManager.setContext(ctx, ctx.callbackQuery?.message.message_id);
     */
    static setContext(newContext, messageId = null, mediaType = null, sessionId = null) {
        const session = this.#getOrCreateSession(sessionId);
        return session.setContext(newContext, messageId, mediaType);
    }

    /**
     * Get context from current session
     * @returns {any}
     */
    static getContext() {
        const session = this.#getOrCreateSession();
        return session.getContext();
    }

    /**
     * Get current message id from current session (used for edits)
     * @returns {number|null}
     */
    static getCurrentMessageId() {
        const session = this.#getOrCreateSession();
        return session.getCurrentMessageId();
    }

    /**
     * Get media type from current session for edit (text/media)
     * @returns {'text'|'media'}
     */
    static getMediaType() {
        const session = this.#getOrCreateSession();
        return session.getMediaType();
    }

    /**
     * Set navigation payload in current session
     * @param {any} payload
     */
    static setPayload(payload) {
        const session = this.#getOrCreateSession();
        return session.setPayload(payload);
    }

    /**
     * Get navigation payload from current session
     * @returns {any}
     */
    static getPayload() {
        const session = this.#getOrCreateSession();
        return session.getPayload();
    }

    /**
     * Clear a session from memory (useful for cleanup in long-running bots).
     * Call this after handling a user interaction to prevent memory leaks.
     *
     * @param {string} [sessionId] - Session to clear. If not provided, clears default session.
     * @returns {boolean} True if session was cleared, false if not found
     */
    static clearSession(sessionId) {
        const id = sessionId || this.#_currentSessionId;
        return this.#_sessions.delete(id);
    }

    /**
     * Clear all sessions (useful for testing or shutdown).
     * WARNING: This is a destructive operation.
     */
    static clearAllSessions() {
        this.#_sessions.clear();
    }

    /**
     * Generate a session ID from context (for automatic session management)
     * @param {any} ctx - Telegraf context
     * @returns {string}
     * @private
     */
    static #generateSessionId(ctx) {
        if (!ctx || !ctx.chat || !ctx.from) return '__default__';
        return `${ctx.chat.id}_${ctx.from.id}`;
    }

    /**
     * Execute a callback within a specific session context
     * Used internally by middleware to manage session state
     * @param {any} ctx - Telegraf context
     * @param {Function} callback
     * @returns {any}
     * @private
     */
    static async executeInSessionContext(ctx, callback) {
        const sessionId = this.#generateSessionId(ctx);
        this.#setCurrentSession(sessionId);
        try {
            return await callback();
        } finally {
            this.#restoreSession();
        }
    }
}

export default MenuManager;