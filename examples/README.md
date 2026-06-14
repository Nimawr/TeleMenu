# TeleMenu Examples

This directory contains runnable examples for the main TeleMenu features.

## Prerequisites

- Node.js 18+
- `telegraf` installed in a test project
- A Telegram bot token from [@BotFather](https://t.me/botfather)

## Files

- `simple-menu.js` — basic nested menus and back navigation
- `advanced-navigation.js` — payload-based navigation between menus
- `dynamic-content.js` — dynamic buttons with rules and async data
- `rules-and-conditions.js` — rule API with failStyle, failIcon, lock, hide, onFail
- `options-object.js` — options object pattern for button configuration
- `practical-use-cases.js` — real-world examples: e-commerce, admin dashboard, settings

## Running an example

From the repository root:

```bash
BOT_TOKEN=your_token node examples/simple-menu.js
```

You can swap the filename with any other example:

```bash
BOT_TOKEN=your_token node examples/rules-and-conditions.js
BOT_TOKEN=your_token node examples/options-object.js
```

## What to test

1. Send `/start`
2. Use the inline buttons to navigate
3. Send `/menu` to render the main menu again
4. For `dynamic-content.js`, try the premium flow and observe the inline update
5. For `rules-and-conditions.js`, test admin/premium buttons with different user IDs
6. For `options-object.js`, see how options object simplifies button config

## Common issues

**`Please set BOT_TOKEN environment variable`**
- Run the command with `BOT_TOKEN=...`

**Bot token not recognized**
- Verify the token from `@BotFather`

**Bot does not respond**
- Start a chat with the bot in Telegram first

## See also

- Main docs: [`../README.md`](../README.md)
