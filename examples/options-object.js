/**
 * Example: Options Object Pattern
 *
 * Demonstrates:
 * - Options object with inline rule config
 * - Options object with pre-built Rule
 * - Button style and icon options
 * Run: BOT_TOKEN=your_token node examples/options-object.js
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
// Pre-built Rules
// ============================================

const adminRule = rule((ctx) => ctx.from.id === 123456789)
    .lock()
    .failLabel('⛔ Admin Only')
    .failStyle('danger')
    .onFail((ctx) => ctx.reply('Access denied'));

// ============================================
// Menu Definitions
// ============================================

const mainMenu = new Menu('main');

mainMenu
    .setCaption('Options Object Demo')

    // Simple button with style
    .text('Danger Button', (ctx) => ctx.reply('Clicked!'), {
        style: 'danger'
    })
    .row()

    // Button with pre-built Rule
    .text('Admin Only', (ctx) => ctx.reply('Admin action!'), {
        rule: adminRule,
        style: 'danger'
    })
    .row()

    // Button with inline rule config
    .text('Premium Only', (ctx) => ctx.reply('Premium!'), {
        rule: {
            when: (ctx) => ctx.from.is_premium,
            lock: true,
            failLabel: '⭐ Premium Required',
            failStyle: 'danger',
            onFail: (ctx) => ctx.reply('Premium only')
        },
        style: 'primary'
    })
    .row()

    // Submenu with options
    .submenu('Settings', 'settings', null, {
        style: 'primary'
    })
    .row()

    // Back with options
    .text('← Back', (ctx) => ctx.reply('Back!'), {
        style: 'primary'
    });

const settingsMenu = new Menu('settings');
settingsMenu
    .setCaption('Settings')
    .text('Language', (ctx) => ctx.reply('English'))
    .row()
    .text('Notifications', (ctx) => ctx.reply('ON'))
    .row()
    .text('← Back', (ctx, menu) => menu.back());

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
