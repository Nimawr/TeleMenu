/**
 * Example: Practical Use Cases
 *
 * Real-world examples:
 * - E-commerce bot with product categories
 * - Admin dashboard with user management
 * - Notification system with settings
 * Run: BOT_TOKEN=your_token node examples/practical-use-cases.js
 */

import { Telegraf } from 'telegraf';
import Menu, { rule } from '../src/index.js';

const token = process.env.BOT_TOKEN;
if (!token) {
    console.error('Please set BOT_TOKEN environment variable');
    process.exit(1);
}

const bot = new Telegraf(token);

// ============================================
// Mock Data
// ============================================

const products = [
    { id: 1, name: 'iPhone 15', price: 999, stock: 10 },
    { id: 2, name: 'MacBook Pro', price: 2499, stock: 5 },
    { id: 3, name: 'AirPods', price: 249, stock: 20 },
];

const users = [
    { id: 101, name: 'Ali', role: 'admin', active: true },
    { id: 102, name: 'Sara', role: 'user', active: true },
    { id: 103, name: 'Reza', role: 'user', active: false },
];

// ============================================
// Rules
// ============================================

const isAdmin = (ctx) => ctx.from.id === 101;
const isPremium = (ctx) => ctx.from.is_premium;

const adminRule = rule(isAdmin)
    .lock()
    .failLabel('⛔ Admin Only')
    .failStyle('danger')
    .onFail((ctx) => ctx.reply('You need admin access'));

const premiumRule = rule(isPremium)
    .lock()
    .failLabel('⭐ Premium Required')
    .failStyle('danger')
    .onFail((ctx) => ctx.reply('Upgrade to premium'));

// ============================================
// 1. E-commerce Menu
// ============================================

const shopMenu = new Menu('shop');
const productMenu = new Menu('product');
const cartMenu = new Menu('cart');

shopMenu
    .setCaption('🛍️ Online Store')
    .text('📦 Products', (ctx, menu) => menu.nav('product'))
    .row()
    .text('🛒 Cart (0)', (ctx, menu) => menu.nav('cart'))
    .row()
    .text('⭐ Premium Deals', (ctx) => ctx.reply('Premium deals coming soon!'), {
        rule: premiumRule,
        style: 'primary'
    });

productMenu
    .setCaption('Choose a product:')
    .dynamic(async (ctx, range) => {
        for (const product of products) {
            range
                .text(`${product.name} - $${product.price}`, (ctx, menu) => {
                    ctx.reply(`You selected: ${product.name}\nPrice: $${product.price}\nStock: ${product.stock}`);
                })
                .row();
        }
    })
    .row()
    .text('← Back', (ctx, menu) => menu.back());

cartMenu
    .setCaption('🛒 Your Cart')
    .text('Empty Cart', (ctx) => ctx.reply('Cart is empty'))
    .row()
    .text('← Back', (ctx, menu) => menu.back());

shopMenu.register(productMenu);
shopMenu.register(cartMenu);

// ============================================
// 2. Admin Dashboard
// ============================================

const adminMenu = new Menu('admin');
const userListMenu = new Menu('user_list');

adminMenu
    .setCaption('🔧 Admin Dashboard')
    .text('👥 Users', (ctx, menu) => menu.nav('user_list'), {
        rule: adminRule,
        style: 'primary'
    })
    .row()
    .text('📊 Statistics', (ctx) => ctx.reply('Stats: 100 users, 50 active'), {
        rule: adminRule,
        style: 'primary'
    })
    .row()
    .text('⚙️ Settings', (ctx) => ctx.reply('Bot settings'), {
        rule: adminRule,
        style: 'primary'
    });

userListMenu
    .setCaption('👥 User List')
    .dynamic(async (ctx, range) => {
        for (const user of users) {
            range
                .text(`${user.name} (${user.role})`, (ctx) => {
                    ctx.reply(`User: ${user.name}\nRole: ${user.role}\nActive: ${user.active}`);
                })
                .row();
        }
    })
    .row()
    .text('← Back', (ctx, menu) => menu.back());

adminMenu.register(userListMenu);

// ============================================
// 3. Settings Menu
// ============================================

const settingsMenu = new Menu('settings');
const langMenu = new Menu('language');

settingsMenu
    .setCaption('⚙️ Settings')
    .text('🌐 Language', (ctx, menu) => menu.nav('language'))
    .row()
    .text('🔔 Notifications', (ctx) => ctx.reply('Notifications: ON'))
    .row()
    .text('🎨 Theme', (ctx) => ctx.reply('Theme: Dark'))
    .row()
    .text('← Back', (ctx, menu) => menu.back());

langMenu
    .setCaption('🌐 Select Language')
    .text('🇺🇸 English', (ctx) => ctx.reply('Language set to English'))
    .row()
    .text('🇫🇷 Français', (ctx) => ctx.reply('Langue définie sur Français'))
    .row()
    .text('🇪🇸 Español', (ctx) => ctx.reply('Idioma establecido en Español'))
    .row()
    .text('← Back', (ctx, menu) => menu.back());

settingsMenu.register(langMenu);

// ============================================
// Main Menu
// ============================================

const mainMenu = new Menu('main');

mainMenu
    .setCaption('Welcome! Choose an option:')
    .text('🛍️ Shop', (ctx, menu) => menu.nav('shop'))
    .row()
    .text('🔧 Admin', (ctx, menu) => menu.nav('admin'), {
        rule: adminRule,
        style: 'danger'
    })
    .row()
    .text('⚙️ Settings', (ctx, menu) => menu.nav('settings'))
    .row()
    .text('❓ Help', (ctx) => ctx.reply('Help: Use the buttons to navigate'));

mainMenu.register(shopMenu);
mainMenu.register(adminMenu);
mainMenu.register(settingsMenu);

// ============================================
// Bot Setup
// ============================================

bot.use(mainMenu);

bot.start(async (ctx) => {
    const { text, parse_mode, reply_markup } = await mainMenu.render(ctx);
    ctx.reply(text, { parse_mode, reply_markup });
});

bot.launch();
console.log('Bot started. Press Ctrl+C to stop.');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
