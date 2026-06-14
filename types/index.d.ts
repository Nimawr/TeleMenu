// Type definitions for TeleMenu
// Project: https://github.com/Nimawr/TeleMenu
// Definitions by: TeleMenu Contributors

/**
 * Parse mode for message formatting
 */
export type ParseMode = 'Markdown' | 'MarkdownV2' | 'HTML' | string;

/**
 * Options for creating a button
 */
export interface ButtonOptions {
  type: 'action' | 'url' | 'webApp' | 'copy' | 'placeholder';
  url?: string | null;
  copyText?: string | null;
  appearance?: ButtonAppearance;
  middleware?: (ctx: any, menuApi: MenuApi) => any | Promise<any> | null;
  requirement?: Rule;
}

export type ButtonStyle = 'danger' | 'success' | 'primary';

export interface ButtonAppearance {
  iconCustomEmojiId?: string;
  style?: ButtonStyle;
}

export class Rule {
  constructor(predicate?: (ctx: any) => boolean | Promise<boolean>);

  predicate: (ctx: any) => boolean | Promise<boolean>;

  /** Show lock icon when rule fails */
  lock(): this;
  /** Hide button when rule fails */
  hide(): this;
  /** Set button style when rule fails */
  failStyle(value: ButtonStyle): this;
  /** Set custom emoji when rule fails */
  failIcon(value: string): this;
  /** Set custom label when rule fails (replaces default 🔒 behavior) */
  failLabel(value: string): this;
  /** Run handler when rule fails */
  onFail(handler: (ctx: any, menuApi: MenuApi) => any | Promise<any>): this;
  resolve(
    ctx: any,
    baseAppearance?: ButtonAppearance
  ): Promise<{
    passed: boolean;
    hidden: boolean;
    disabled: boolean;
    appearance: ButtonAppearance;
    failLabel: string | null;
    onFalse: ((ctx: any, menuApi: MenuApi) => any | Promise<any>) | null;
  }>;
}

/**
 * Inline rule configuration for options object
 */
export interface RuleConfig {
  when?: (ctx: any) => boolean | Promise<boolean>;
  failStyle?: ButtonStyle;
  failIcon?: string;
  failLabel?: string;
  lock?: boolean;
  hide?: boolean;
  onFail?: (ctx: any, menuApi: MenuApi) => any | Promise<any>;
}

/**
 * Options object for button configuration
 */
export interface ButtonConfig {
  rule?: Rule | RuleConfig;
  style?: ButtonStyle;
  icon?: string;
}

export function rule(predicate: (ctx: any) => boolean | Promise<boolean>): Rule;

/**
 * Telegram inline keyboard button JSON format
 */
export interface InlineKeyboardButtonJSON {
  text: string;
  url?: string;
  web_app?: {
    url: string;
  };
  copy_text?: {
    text: string;
  };
  icon_custom_emoji_id?: string;
  style?: ButtonStyle;
  callback_data?: string;
}

/**
 * Telegram inline keyboard markup JSON format
 */
export interface InlineKeyboardMarkupJSON {
  inline_keyboard: InlineKeyboardButtonJSON[][];
}

/**
 * API object provided to button handlers for menu navigation and updates
 */
export interface MenuApi {
  /**
   * Update/refresh the current menu inline
   */
  update: () => Promise<void> | void;
  /**
   * Navigate to another menu with optional payload
   */
  nav: (menuId: string, payload?: any) => Promise<boolean>;
  /**
   * Go back to parent menu (or specific menu)
   */
  back: (menuId?: string | null, payload?: any) => Promise<boolean>;
  /**
   * Get the current navigation payload
   */
  getPayload: () => any;
}

/**
 * Builder for adding buttons within dynamic() blocks
 */
export class MenuRange {
  constructor(buttonManager: any);

  text(
    label: string | ((ctx: any, payload?: any) => string),
    middleware?: (ctx: any, menuApi: MenuApi) => any | Promise<any>,
    options?: ButtonConfig
  ): this;

  url(
    label: string | ((ctx: any, payload?: any) => string),
    url: string,
    options?: ButtonConfig
  ): this;

  webApp(
    label: string | ((ctx: any, payload?: any) => string),
    webAppUrl: string,
    options?: ButtonConfig
  ): this;

  copy(
    label: string | ((ctx: any, payload?: any) => string),
    copyText: string,
    options?: ButtonConfig
  ): this;

  row(): this;

  submenu(
    label: string | ((ctx: any, payload?: any) => string),
    submenuId: string,
    payload?: any | ((ctx: any, menuApi: MenuApi) => any),
    options?: ButtonConfig
  ): this;
}

/**
 * Main Menu class - provides fluent API for building Telegram inline keyboards
 *
 * @example
 * const menu = new Menu('main');
 * menu
 *   .text('Option 1', (ctx, api) => api.nav('submenu'))
 *   .text('Option 2', (ctx) => ctx.reply('Clicked!'))
 *   .row()
 *   .url('Visit', 'https://example.com');
 *
 * bot.use(menu.middleware());
 */
export class Menu {
  /**
   * Create a new Menu
   * @param menuId Unique identifier for this menu
   */
  constructor(menuId: string);

  readonly menuId: string;
  readonly parentMenuId: string | null;

  /**
   * Add an action button
   */
  text(
    label: string | ((ctx: any, payload?: any) => string),
    middleware?: (ctx: any, menuApi: MenuApi) => any | Promise<any>,
    options?: ButtonConfig
  ): this;

  /**
   * Add a URL button
   */
  url(
    label: string | ((ctx: any, payload?: any) => string),
    url: string,
    options?: ButtonConfig
  ): this;

  /**
   * Add a WebApp button
   */
  webApp(
    label: string | ((ctx: any, payload?: any) => string),
    webAppUrl: string,
    options?: ButtonConfig
  ): this;

  copy(
    label: string | ((ctx: any, payload?: any) => string),
    copyText: string,
    options?: ButtonConfig
  ): this;

  /**
   * Add a submenu navigation button
   */
  submenu(
    label: string | ((ctx: any, payload?: any) => string),
    submenuId: string,
    payload?: any | ((ctx: any, menuApi: MenuApi) => any),
    options?: ButtonConfig
  ): this;

  /**
   * Add a back navigation button
   */
  back(
    label: string | ((ctx: any, payload?: any) => string),
    menuId?: string,
    payload?: any | ((ctx: any, menuApi: MenuApi) => any),
    options?: ButtonConfig
  ): this;

  /**
   * Start a new row in the keyboard layout
   */
  row(): this;

  /**
   * Generate buttons dynamically
   * @param generator Function that adds buttons to the range
   */
  dynamic(
    generator: (ctx: any, range: MenuRange, payload: any) => any | Promise<any>
  ): this;

  /**
   * Navigate to another menu
   */
  nav(menuId: string, payload?: any): Promise<boolean>;

  /**
   * Set the caption text and parse mode
   */
  setCaption(
    caption: string | ((ctx: any, payload: any) => string),
    format?: ParseMode
  ): this;

  getCaption(ctx?: any, payload?: any): string | undefined;

  readonly format: ParseMode | undefined;

  /**
   * Update/refresh the menu inline
   */
  update(): Promise<void>;

  /**
   * Get send-ready data for first render
   */
  render(
    ctx: any,
    payload?: any
  ): Promise<{
    text: string | undefined;
    parse_mode: ParseMode | undefined;
    reply_markup: InlineKeyboardMarkupJSON;
  }>;

  /**
   * Send menu to a chat
   */
  sendToChat(
    ctx: any,
    payload?: any
  ): Promise<any>;

  /**
   * Register a submenu and establish parent-child relationship
   */
  register(submenu: Menu): this;

  /**
   * Get inline keyboard JSON for Telegram API
   */
  toJSON(ctx?: any, payload?: any): Promise<InlineKeyboardMarkupJSON>;

  /**
   * Get Telegraf middleware for handling callbacks
   */
  middleware(): (ctx: any, next: () => Promise<any>) => Promise<any>;
}

export default Menu;
export { Rule, rule };
export type { RuleConfig, ButtonConfig };
