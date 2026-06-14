/**
 * Handles updating Telegram messages with retry logic.
 * Supports both text and media message updates with automatic fallback.
 */
class MessageUpdater {
    /**
     * Update a Telegram message, attempting both text and caption edits with fallback.
     *
     * @param {any} ctx - Telegraf context
     * @param {number} messageId - Telegram message ID to update
     * @param {string} caption - New caption/text
     * @param {Object} options - Telegram API options (parse_mode, reply_markup, etc.)
     * @param {'text'|'media'} mediaType - Hint about whether message contains media
     * @returns {Promise<void>}
     */
    static async updateMessage(ctx, messageId, caption, options, mediaType = 'text') {
        if (!ctx || !ctx.chat || !ctx.telegram) {
            throw new Error('Invalid context for message update');
        }

        const chatId = ctx.chat.id;

        try {
            if (mediaType === 'media') {
                await this.#editCaption(ctx, chatId, messageId, caption, options);
            } else {
                await this.#editText(ctx, chatId, messageId, caption, options);
            }
        } catch (primaryError) {
            try {
                if (mediaType === 'media') {
                    await this.#editText(ctx, chatId, messageId, caption, options);
                } else {
                    await this.#editCaption(ctx, chatId, messageId, caption, options);
                }
            } catch (fallbackError) {
                throw new Error(
                    `Failed to update message: ${primaryError.message}. ` +
                    `Fallback also failed: ${fallbackError.message}`
                );
            }
        }
    }

    /**
     * Edit message text
     * @private
     */
    static async #editText(ctx, chatId, messageId, text, options) {
        return await ctx.telegram.editMessageText(
            chatId,
            messageId,
            undefined,
            text,
            options
        );
    }

    /**
     * Edit message caption
     * @private
     */
    static async #editCaption(ctx, chatId, messageId, caption, options) {
        return await ctx.telegram.editMessageCaption(
            chatId,
            messageId,
            undefined,
            caption,
            options
        );
    }
}

export default MessageUpdater;
