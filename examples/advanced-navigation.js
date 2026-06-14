/**
 * Example 2: Multi-level Navigation with Payload
 *
 * Demonstrates navigation between menus and passing data via payload.
 * Shows how to access context-specific information in menus.
 * Run: BOT_TOKEN=your_token node examples/advanced-navigation.js
 */

import { Telegraf } from 'telegraf';
import Menu from '../src/index.js';

const MAIN_MENU_TEXT = '🛍️ Online Store\n\nChoose a category:';

const token = process.env.BOT_TOKEN;
if (!token) {
    console.error('Please set BOT_TOKEN environment variable');
    process.exit(1);
}

const bot = new Telegraf(token);

// ============================================
// Mock Data
// ============================================

const categories = [
    { id: 'electronics', name: '📱 Electronics', products: ['Laptop', 'Phone', 'Tablet'] },
    { id: 'books', name: '📚 Books', products: ['Fiction', 'Non-fiction', 'Science'] },
    { id: 'food', name: '🍕 Food', products: ['Pizza', 'Burger', 'Sushi'] },
];

// ============================================
// Menu Definitions
// ============================================

const mainMenu = new Menu('main');
const categoryMenu = new Menu('category');
const productMenu = new Menu('product');

mainMenu
    .setCaption(MAIN_MENU_TEXT)
    .dynamic((ctx, range) => {
        for (const category of categories) {
            range
                .text(category.name, (ctx, menu) => {
                    menu.nav('category', category.id);
                })
                .row();
        }
    });

categoryMenu
    .setCaption((ctx, categoryId) => {
        const category = categories.find(c => c.id === categoryId);
        return category
            ? `${category.name}\n\nSelect a product:`
            : 'Category not found';
    })
    .dynamic((ctx, range, categoryId) => {
        const category = categories.find(c => c.id === categoryId);
        if (category) {
            for (const product of category.products) {
                range
                    .text(`• ${product}`, (ctx, menu) => {
                        menu.nav('product', {
                            categoryId: category.id,
                            categoryName: category.name,
                            product,
                        });
                    })
                    .row();
            }
        }
    })
    .text('← Back to Categories', (ctx, menu) => menu.back('main'));

productMenu
    .setCaption((ctx, payload) => {
        if (!payload) return 'Product not found';
        return `${payload.product}\n\n` +
               `Category: ${payload.categoryName}\n` +
               `Price: $19.99\n\n` +
               'Add to cart?';
    })
    .text('✅ Add to Cart', (ctx, menu) => {
        const payload = menu.getPayload();
        if (!payload) {
            return ctx.reply('Product not found.');
        }
        ctx.reply(`✅ Added ${payload.product} to cart!`);
    })
    .row()
    .text('👀 View Details', (ctx, menu) => {
        const payload = menu.getPayload();
        if (!payload) {
            return ctx.reply('Product not found.');
        }
        ctx.reply(`📄 ${payload.product} from ${payload.categoryName}`);
    })
    .row()
    .text('← Back', (ctx, menu) => {
        const payload = menu.getPayload();
        menu.back('category', payload?.categoryId);
    });

mainMenu.register(categoryMenu);
mainMenu.register(productMenu);

// ============================================
// Bot Setup
// ============================================

bot.use(mainMenu);

bot.start(async (ctx) => {
    ctx.reply(MAIN_MENU_TEXT, { reply_markup: await mainMenu.toJSON(ctx) });
});

bot.command('menu', async (ctx) => {
    ctx.reply(MAIN_MENU_TEXT, { reply_markup: await mainMenu.toJSON(ctx) });
});

bot.launch();
console.log('Bot started. Press Ctrl+C to stop.');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
