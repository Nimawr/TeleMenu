/**
 * Example 3: Dynamic Content with Rules
 *
 * Demonstrates:
 * - Async data loading in dynamic blocks
 * - Conditional buttons based on user state
 * - Hidden/locked buttons based on rules
 * Run: BOT_TOKEN=your_token node examples/dynamic-content.js
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
// Simulated User Database
// ============================================

const userProfiles = new Map();

function getUserProfile(userId) {
    if (!userProfiles.has(userId)) {
        userProfiles.set(userId, {
            id: userId,
            name: `User ${userId}`,
            isPremium: false,
            points: 100,
            joinedAt: new Date(),
        });
    }
    return userProfiles.get(userId);
}

async function fetchUserNotifications(userId) {
    await new Promise(resolve => setTimeout(resolve, 500));
    return [
        { id: 1, text: 'New message from admin' },
        { id: 2, text: 'You earned 50 points!' },
        { id: 3, text: 'Premium offer available' },
    ];
}

// ============================================
// Rules
// ============================================

const notPremiumRule = rule((ctx) => {
    const profile = getUserProfile(ctx.from.id);
    return !profile.isPremium;
}).hide();

// ============================================
// Menu Definitions
// ============================================

const mainMenu = new Menu('main');
const profileMenu = new Menu('profile');
const notificationsMenu = new Menu('notifications');
const premiumMenu = new Menu('premium');

mainMenu
    .setCaption((ctx) => {
        const profile = getUserProfile(ctx.from.id);
        return `Welcome, ${profile.name}!\n\n` +
               `Points: ${profile.points}\n` +
               `${profile.isPremium ? 'Premium member' : 'Free member'}`;
    })
    .text('Profile', (ctx, menu) => menu.nav('profile'))
    .row()
    .text('Notifications', (ctx, menu) => menu.nav('notifications'))
    .row()
    .text('Upgrade to Premium', (ctx, menu) => menu.nav('premium'), {
        rule: notPremiumRule,
        style: 'primary'
    });

profileMenu
    .setCaption((ctx) => {
        const profile = getUserProfile(ctx.from.id);
        return `Your Profile\n\n` +
               `ID: ${profile.id}\n` +
               `Name: ${profile.name}\n` +
               `Points: ${profile.points}\n` +
               `Status: ${profile.isPremium ? 'Premium' : 'Free'}`;
    })
    .text('Edit Profile', (ctx) => {
        ctx.reply('Edit profile feature coming soon...');
    })
    .row()
    .text('Contact Support', (ctx) => {
        ctx.reply('support@example.com');
    })
    .row()
    .text('← Back', (ctx, menu) => menu.back());

notificationsMenu
    .setCaption('Your Notifications')
    .dynamic(async (ctx, range) => {
        const notifications = await fetchUserNotifications(ctx.from.id);
        for (const notif of notifications) {
            range
                .text(notif.text, (ctx) => {
                    ctx.reply(`Clicked: ${notif.text}`);
                })
                .row();
        }
    })
    .text('Clear All', (ctx, menu) => {
        ctx.reply('All notifications cleared');
        menu.update();
    })
    .row()
    .text('← Back', (ctx, menu) => menu.back());

premiumMenu
    .setCaption((ctx) => {
        const profile = getUserProfile(ctx.from.id);
        if (profile.isPremium) {
            return 'You are already a Premium member.\n\nEnjoy exclusive benefits and features.';
        }
        return 'Upgrade to Premium\n\n' +
               '- Unlock exclusive features\n' +
               '- Priority support\n' +
               '- Special rewards\n\n' +
               'Price: $4.99/month';
    })
    .text('Subscribe Now', (ctx, menu) => {
        const profile = getUserProfile(ctx.from.id);
        profile.isPremium = true;
        ctx.reply('Welcome to Premium!');
        menu.update();
    }, {
        rule: notPremiumRule,
        style: 'success'
    })
    .row()
    .text('View Benefits', (ctx) => {
        ctx.reply('Premium includes:\n- Ad-free experience\n- 2x points\n- Early access to new features\n- Priority support');
    }, {
        rule: notPremiumRule,
    })
    .row()
    .text('← Back', (ctx, menu) => menu.back());

mainMenu.register(profileMenu);
mainMenu.register(notificationsMenu);
mainMenu.register(premiumMenu);

// ============================================
// Bot Setup
// ============================================

bot.use(mainMenu);

bot.start(async (ctx) => {
    const { text, parse_mode, reply_markup } = await mainMenu.render(ctx);
    ctx.reply(text, { parse_mode, reply_markup });
});

bot.command('menu', async (ctx) => {
    const { text, parse_mode, reply_markup } = await mainMenu.render(ctx);
    ctx.reply(text, { parse_mode, reply_markup });
});

bot.launch();
console.log('Bot started. Press Ctrl+C to stop.');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
