/**
 * Example 1: Simple Menu System
 *
 * A basic multi-level menu system with main menu and submenus.
 * Run: BOT_TOKEN=your_token node examples/simple-menu.js
 */

import { Telegraf } from 'telegraf';
import Menu from '../src/index.js';

const MAIN_MENU_TEXT = '📱 Main Menu\n\nWhat would you like to do?';
const SETTINGS_TEXT = '⚙️ Settings';
const LANGUAGE_TEXT = 'Choose your language:';

// Get bot token from environment
const token = process.env.BOT_TOKEN;
if (!token) {
    console.error('Please set BOT_TOKEN environment variable');
    process.exit(1);
}

const bot = new Telegraf(token);

// ============================================
// Menu Definitions
// ============================================

const mainMenu = new Menu('main');
const settingsMenu = new Menu('settings');
const languageMenu = new Menu('language');

mainMenu
    .setCaption(MAIN_MENU_TEXT)
    .text('⚙️ Settings', (ctx, menu) => menu.nav('settings'))
    .row()
    .text('ℹ️ About', (ctx) => ctx.reply('TeleMenu v1.0.0\nA lightweight Telegram menu library.'))
    .row()
    .text('🚀 Start', (ctx) => ctx.reply('Bot started!'));

settingsMenu
    .setCaption(SETTINGS_TEXT)
    .text('🌐 Language', (ctx, menu) => menu.nav('language'))
    .row()
    .text('🔔 Notifications', (ctx) => ctx.reply('Notifications: ON'))
    .row()
    .text('← Back', (ctx, menu) => menu.back());

languageMenu
    .setCaption(LANGUAGE_TEXT)
    .text('🇺🇸 English', (ctx) => ctx.reply('Language set to English'))
    .row()
    .text('🇪🇸 Español', (ctx) => ctx.reply('Idioma establecido en Español'))
    .row()
    .text('🇫🇷 Français', (ctx) => ctx.reply('Langue définie sur Français'))
    .row()
    .text('← Back', (ctx, menu) => menu.back());

mainMenu.register(settingsMenu);
mainMenu.register(languageMenu);

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

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
