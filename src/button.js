import crypto from 'crypto';

/**
 * @typedef {Object} Requirement
 * @property {(ctx:any)=>boolean|Promise<boolean>} [require] Predicate to determine if the button is enabled
 * @property {boolean} [disable] When requirement fails, mark the button as disabled
 * @property {(ctx:any, menuApi:any)=>any|Promise<any>} [doWhenDisable] Handler invoked when the button is disabled
 * @property {boolean} [hidden] When requirement fails, hide the button
 */

/**
 * @typedef {Object} ButtonOptions
 * @property {'action'|'url'|'webApp'|'placeholder'} type Button type
 * @property {string|null} [url] URL for URL/WebApp buttons
 * @property {(ctx:any, menuApi:any)=>any|Promise<any>|null} [middleware] Button handler
 * @property {Requirement} [requirement] Requirement configuration
 */

class Button {
    
    #isDisable;
    #isHidden;
    #_label;
    #_labelFunction;

    /**
     * Button constructor
     * @param {string|((ctx:any)=>string)} label Button text or a function that returns the text
     * @param {ButtonOptions} options Button options
     */
    constructor(label, { type, url = null, middleware = null, requirement = {} }) {
        if (!type) throw new Error('Button type is required.');

        if (typeof label === 'function') {
            this.#_labelFunction = label;
            this.#_label = null;
        } else {
            this.#_label = label;
            this.#_labelFunction = null;
        }
        
        this.type = type;
        this.url = url;
        this.middleware = middleware;
        this.requirement = {
            require: requirement.require || (() => true),
            disable: !!requirement.disable || false,
            doWhenDisable: requirement.doWhenDisable || (() => { }),
            hidden: !!requirement.hidden || false,
        };
        this.#isDisable = false;
        this.#isHidden = false;

        this.callbackData = type === 'action' ? this.#generateCallbackData(type) : null;
    }

    /**
     * Get the button label from static text or label function
     * @param {any} ctx Context (e.g., Telegraf ctx)
     * @returns {string}
     * @private
     */
    #getLabel(ctx) {
        return this.#_labelFunction ? this.#_labelFunction(ctx) : this.#_label;
    }

    /**
     * Raw label text if provided
     * @returns {string|null}
     */
    get rawLabel() {
        return this.#_label;
    }

    /**
     * Evaluate requirement and update hidden/disabled flags
     * @param {any} ctx
     * @returns {Promise<boolean>} Whether requirement passed
     */
    async evaluateRequirement(ctx) {
        if (this.type === 'placeholder') {
            this.#isHidden = true;
            return false;
        }
        
        const check = await this.requirement.require(ctx);
        this.#isDisable = !check && this.requirement.disable;
        this.#isHidden = !check && this.requirement.hidden;
        return check;
    }

    /**
     * Execute button handler if requirement passes; otherwise run disabled handler when applicable
     * @param {any} ctx
     * @param {any} menuApi Menu API for navigation/update
     * @returns {Promise<any>}
     */
    async handler(ctx, menuApi) {
        const checkRequirement = await this.evaluateRequirement(ctx);
        if (checkRequirement && this.middleware) {
            try {
                return await this.middleware(ctx, menuApi);
            } catch (error) {
                console.error('Error in middleware:', error);
            }
        } else if (this.#isDisable) {
            try {
                return await this.requirement.doWhenDisable(ctx, menuApi);
            } catch (error) {
                console.error('Error in doWhenDisable middleware:', error);
            }
        }
    }

    /**
     * Generate a unique callback_data string
     * @param {'action'|'url'|'webApp'|'placeholder'} type
     * @returns {string}
     * @private
     */
    #generateCallbackData(type) {
        const uniqueString = `${type}_${Date.now()}_${Math.random()}`;
        return crypto.createHash('sha256').update(uniqueString).digest('hex').slice(0, 16);
    }

    /**
     * Return Telegram Inline Keyboard button JSON or null
     * @param {any} ctx
     * @returns {{text:string, url?:string, callback_data?:string}|null}
     */
    toJSON(ctx) {
        if (this.#isHidden) return null;
        
        if (this.type === 'placeholder') return null;

        if (this.#isDisable)
            return {
                text: `${this.#getLabel(ctx)} 🔒`,
                callback_data: this.callbackData || this.#generateCallbackData('action'),
            };

        return {
            text: this.#getLabel(ctx),
            ...(this.url ? { url: this.url } : {}),
            ...(this.callbackData ? { callback_data: this.callbackData } : {}),
        };
    }
}

export default Button;