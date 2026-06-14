/**
 * Builder for conditional button behavior and appearance.
 */
class Rule {
    /**
     * Create a new Rule.
     * @param {(ctx:any)=>boolean|Promise<boolean>} predicate - Condition to evaluate
     */
    constructor(predicate = () => true) {
        this.predicate = predicate;
        this.failureMode = 'none';
        this.falseAppearance = {};
        this.falseHandler = null;
        this.falseLabel = null;
    }

    /**
     * Check if a value is a Rule instance.
     * @param {any} value
     * @returns {boolean}
     */
    static isRuleLike(value) {
        return value instanceof Rule;
    }

    /**
     * Show lock icon when rule fails. Button stays visible but action is blocked.
     * @returns {this}
     */
    lock() {
        this.failureMode = 'lock';
        return this;
    }

    /**
     * Hide button completely when rule fails.
     * @returns {this}
     */
    hide() {
        this.failureMode = 'hide';
        return this;
    }

    /**
     * Set button style when rule fails.
     * @param {'danger'|'success'|'primary'} value - Button style
     * @returns {this}
     */
    failStyle(value) {
        this.falseAppearance.style = value;
        return this;
    }

    /**
     * Set custom emoji icon when rule fails.
     * @param {string} value - Telegram custom emoji ID
     * @returns {this}
     */
    failIcon(value) {
        this.falseAppearance.iconCustomEmojiId = value;
        return this;
    }

    /**
     * Set custom label text when rule fails.
     * If not set, 🔒 is appended to the original label when locked.
     * @param {string} value - Replacement label text
     * @returns {this}
     */
    failLabel(value) {
        this.falseLabel = value;
        return this;
    }

    /**
     * Run a handler when rule fails (e.g., show error message).
     * @param {(ctx:any, menuApi:any)=>any|Promise<any>} handler
     * @returns {this}
     */
    onFail(handler) {
        this.falseHandler = handler;
        return this;
    }

    /**
     * Evaluate the rule predicate and return the resolved state.
     * @param {any} ctx - Telegraf context
     * @param {Object} [baseAppearance] - Base appearance to merge with
     * @returns {Promise<{passed:boolean, hidden:boolean, disabled:boolean, appearance:Object, failLabel:string|null, onFalse:Function|null}>}
     */
    async resolve(ctx, baseAppearance = {}) {
        const passed = await this.predicate(ctx);
        const appearance = {
            ...baseAppearance,
            ...(passed ? {} : this.falseAppearance),
        };

        return {
            passed,
            hidden: !passed && this.failureMode === 'hide',
            disabled: !passed && this.failureMode === 'lock',
            appearance,
            failLabel: !passed ? this.falseLabel : null,
            onFalse: this.falseHandler,
        };
    }
}

/**
 * Create a new Rule with the given predicate.
 * @param {(ctx:any)=>boolean|Promise<boolean>} predicate
 * @returns {Rule}
 */
function rule(predicate) {
    return new Rule(predicate);
}

export default Rule;
export { rule };
