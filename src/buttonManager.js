import Button from './button.js';

/**
 * Manages layout and JSON generation of inline keyboard buttons
 */
class ButtonManager {
    
    /**
     * Create a new ButtonManager instance
     */
    constructor() {
        this.buttons = [];
        this.buttons.push([]);
    }

    /**
     * Add a button to the current row
     * @param {Button} button
     */
    addButton(button) {
        if (!(button instanceof Button)) {
            throw new Error('Only instances of Button can be added.');
        }
        this.buttons[this.buttons.length - 1].push(button);
    }

    /**
     * Start a new row
     */
    newRow() {
        if (this.buttons.length === 0 || this.buttons[this.buttons.length - 1].length > 0) {
            this.buttons.push([]);
        }
    }

    /**
     * Get the 2D button structure
     * @returns {Button[][]}
     */
    getButtons() {
        return this.buttons;
    }

    /**
     * Evaluate requirements for all buttons
     * @param {any} ctx
     */
    async evaluateAll(ctx) {
        for (const row of this.buttons) {
            for (const button of row) {
                await button.evaluateRequirement(ctx);
            }
        }
    }

    /**
     * Generate Telegram-compatible markup JSON
     * @param {any} ctx
     * @returns {{inline_keyboard: Array<Array<{text:string, url?:string, callback_data?:string}>>}}
     */
    toJSON(ctx) {
        const inlineKeyboard = [];
        for (const row of this.buttons) {
            const rowData = [];
            for (const button of row) {
                const json = button.toJSON(ctx);
                if (json) rowData.push(json);
            }
            if (rowData.length > 0) inlineKeyboard.push(rowData);
        }
        return { inline_keyboard: inlineKeyboard };
    }
}

export default ButtonManager;