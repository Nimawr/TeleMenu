/**
 * Example: Rules & Conditions
 *
 * Demonstrates:
 * - rule() with lock, hide, failStyle, failLabel, onFail
 * - Options object pattern
 * Run: BOT_TOKEN=your_token node examples/rules-and-conditions.js
 */

import { Telegraf } from 'telegraf';
import Menu, { rule } from '../src/index.js';

const token = process.env.BOT_TOKEN;
if (!token) {
    console.error('Please set BOT_TOKEN environment variable');
    process.exit(1);
}

const bot = new Telegraf(token);

const adminIds = [123456789];
const isAdmin = (ctx) => adminIds.includes(ctx.from.id);
const isPremium = (ctx) => ctx.from.is_premium;

// ============================================
// Rules
// ============================================

const adminRule = rule(isAdmin)
    .lock()
    .failLabel('⛔ Admin Only')
    .failStyle('danger')
    .onFail((ctx) => ctx.reply('Admin access required'));

const premiumRule = rule(isPremium)
    .lock()
    .failLabel('⭐ Premium Required')
    .failStyle('danger')
    .onFail((ctx) => ctx.reply('Premium feature'));

// ============================================
// Menu Definitions
// ============================================

const mainMenu = new Menu('main');

mainMenu
    .setCaption('Rules & Conditions Demo')

    // With pre-built Rule
    .text('Admin Panel', (ctx, menu) => menu.nav('admin'), {
        rule: adminRule,
        style: 'danger'
    })
    .row()

    // With pre-built Rule
    .text('Premium Feature', (ctx) => ctx.reply('Premium content!'), {
        rule: premiumRule,
        style: 'primary'
    })
    .row()

    // Inline rule config
    .text('Upgrade to Premium', (ctx, menu) => menu.nav('upgrade'), {
        rule: {
            when: isPremium,
            hide: true
        }
    })
    .row()

    // Simple lock
    .text('Simple Lock', (ctx) => ctx.reply('Action!'), {
        rule: { when: isAdmin, lock: true }
    })
    .row()

    // Simple hide
    .text('Simple Hide', (ctx) => ctx.reply('Secret!'), {
        rule: { when: () => false, hide: true }
    });

const adminMenu = new Menu('admin');
adminMenu
    .setCaption('Admin Panel')
    .text('Ban User', (ctx) => ctx.reply('Enter user ID'))
    .row()
    .text('Settings', (ctx) => ctx.reply('Bot settings'))
    .row()
    .text('← Back', (ctx, menu) => menu.back());

const upgradeMenu = new Menu('upgrade');
upgradeMenu
    .setCaption('Upgrade to Premium')
    .text('Subscribe $4.99/mo', (ctx) => ctx.reply('Subscribed!'))
    .row()
    .text('← Back', (ctx, menu) => menu.back());

mainMenu.register(adminMenu);
mainMenu.register(upgradeMenu);

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
