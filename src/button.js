import crypto from 'crypto';
import Rule from './rule.js';

/**
 * @typedef {Object} Requirement
 * @property {(ctx:any)=>boolean|Promise<boolean>} [require] Predicate to determine if the button is enabled
 * @property {boolean} [disable] When requirement fails, mark the button as disabled
 * @property {(ctx:any, menuApi:any)=>any|Promise<any>} [doWhenDisable] Handler invoked when the button is disabled
 * @property {boolean} [hidden] When requirement fails, hide the button
 */

/**
 * @typedef {'danger'|'success'|'primary'} ButtonStyle
 */

/**
 * @typedef {Object} ButtonAppearance
 * @property {string} [iconCustomEmojiId] Custom emoji identifier shown on the button
 * @property {ButtonStyle} [style] Telegram button style
 */

/**
 * @typedef {Object} ButtonOptions
 * @property {'action'|'url'|'webApp'|'copy'|'placeholder'} type Button type
 * @property {string|null} [url] URL for URL/WebApp buttons
 * @property {string|null} [copyText] Text copied by copy buttons
 * @property {ButtonAppearance} [appearance] Visual button options
 * @property {(ctx:any, menuApi:any)=>any|Promise<any>|null} [middleware] Button handler
 * @property {Requirement|Rule} [requirement] Requirement or rule configuration
 */

class Button {
    
    #isDisable;
    #isHidden;
    #_label;
    #_labelFunction;
    #_resolvedAppearance;
    #_resolvedRuleState;
    #_failLabel;

    /**
     * Button constructor
     * @param {string|((ctx:any)=>string)} label Button text or a function that returns the text
     * @param {ButtonOptions} options Button options
     */
    constructor(label, { type, url = null, copyText = null, appearance = {}, middleware = null, requirement = {} }) {
        if (!type) throw new Error('Button type is required. Valid types: "action", "url", "webApp", "copy", "placeholder".');

        if (typeof label === 'function') {
            this.#_labelFunction = label;
            this.#_label = null;
        } else {
            this.#_label = label;
            this.#_labelFunction = null;
        }
        
        this.type = type;
        this.url = url;
        this.copyText = copyText;
        this.middleware = middleware;
        this.baseAppearance = {
            iconCustomEmojiId: appearance.iconCustomEmojiId || null,
            style: appearance.style || null,
        };
        this.rule = Rule.isRuleLike(requirement) ? requirement : new Rule();
        this.#isDisable = false;
        this.#isHidden = false;
        this.#_resolvedAppearance = this.baseAppearance;
        this.#_resolvedRuleState = null;
        this.#_failLabel = null;

        this.callbackData = type === 'placeholder' ? null : this.#generateCallbackData(type);
    }

    /**
     * Get the button label from static text or label function
     * @param {any} ctx Context (e.g., Telegraf ctx)
     * @param {any} [payload] Optional payload
     * @returns {string}
     * @private
     */
    #getLabel(ctx, payload) {
        return this.#_labelFunction ? this.#_labelFunction(ctx, payload) : this.#_label;
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

        this.#_resolvedRuleState = await this.rule.resolve(ctx, this.baseAppearance);
        this.#isDisable = this.#_resolvedRuleState.disabled;
        this.#isHidden = this.#_resolvedRuleState.hidden;
        this.#_resolvedAppearance = this.#_resolvedRuleState.appearance;
        this.#_failLabel = this.#_resolvedRuleState.failLabel;
        return this.#_resolvedRuleState.passed;
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
                const result = await this.middleware(ctx, menuApi);
                if (this.#_resolvedRuleState?.onTrue) {
                    await this.#_resolvedRuleState.onTrue(ctx, menuApi);
                }
                return result;
            } catch (error) {
                console.error('Error in middleware:', error);
            }
        } else if (checkRequirement) {
            try {
                if (this.#_resolvedRuleState?.onTrue) {
                    return await this.#_resolvedRuleState.onTrue(ctx, menuApi);
                }
            } catch (error) {
                console.error('Error in doWhenTrue middleware:', error);
            }
        } else if (this.#isDisable || this.#_resolvedRuleState?.onFalse) {
            try {
                if (this.#_resolvedRuleState?.onFalse) {
                    return await this.#_resolvedRuleState.onFalse(ctx, menuApi);
                }
            } catch (error) {
                console.error('Error in doWhenFalse middleware:', error);
            }
        }
    }

    /**
     * Generate a deterministic callback_data string from type and label.
     * Stable across renders so Telegram can match button clicks.
     * @param {'action'|'url'|'webApp'|'copy'|'placeholder'} type
     * @returns {string}
     * @private
     */
    #generateCallbackData(type) {
        const labelSource = this.#_labelFunction ? this.#_labelFunction.toString() : this.#_label;
        const handlerSource = this.middleware ? this.middleware.toString() : '';
        const uniqueString = `${type}_${labelSource}_${handlerSource}`;
        return crypto.createHash('sha256').update(uniqueString).digest('hex').slice(0, 16);
    }

    /**
     * Return Telegram Inline Keyboard button JSON or null
     * @param {any} ctx
     * @param {any} [payload]
     * @returns {{text:string, url?:string, web_app?:{url:string}, copy_text?:{text:string}, icon_custom_emoji_id?:string, style?:ButtonStyle, callback_data?:string}|null}
     */
    toJSON(ctx, payload) {
        if (this.#isHidden) return null;
        
        if (this.type === 'placeholder') return null;

        if (this.#isDisable) {
            const failText = this.#_failLabel || this.#getLabel(ctx, payload);
            return this.#withVisualOptions({
                text: failText,
                callback_data: this.callbackData,
            });
        }

        if (this.type === 'webApp') {
            return this.#withVisualOptions({
                text: this.#getLabel(ctx, payload),
                web_app: { url: this.url },
            });
        }

        if (this.type === 'copy') {
            return this.#withVisualOptions({
                text: this.#getLabel(ctx, payload),
                copy_text: { text: this.copyText },
            });
        }

        return this.#withVisualOptions({
            text: this.#getLabel(ctx, payload),
            ...(this.type === 'url' && this.url ? { url: this.url } : {}),
            ...(this.type === 'action' && this.callbackData ? { callback_data: this.callbackData } : {}),
        });
    }

    /**
     * Attach visual options supported by Telegram buttons.
     * @param {Record<string, any>} button
     * @returns {Record<string, any>}
     * @private
     */
    #withVisualOptions(button) {
        return {
            ...button,
            ...(this.#_resolvedAppearance?.iconCustomEmojiId ? { icon_custom_emoji_id: this.#_resolvedAppearance.iconCustomEmojiId } : {}),
            ...(this.#_resolvedAppearance?.style ? { style: this.#_resolvedAppearance.style } : {}),
        };
    }
}

export default Button;
