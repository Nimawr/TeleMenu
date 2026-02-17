// Type definitions for telegram-menu-creator

export type ParseMode = 'Markdown' | 'MarkdownV2' | 'HTML' | string;

export interface Requirement {
  require?: (ctx: any) => boolean | Promise<boolean>;
  disable?: boolean;
  doWhenDisable?: (ctx: any, menuApi: MenuApi) => any | Promise<any>;
  hidden?: boolean;
}

export interface ButtonOptions {
  type: 'action' | 'url' | 'webApp' | 'placeholder';
  url?: string | null;
  middleware?: (ctx: any, menuApi: MenuApi) => any | Promise<any> | null;
  requirement?: Requirement;
}

export interface InlineKeyboardButtonJSON {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface InlineKeyboardMarkupJSON {
  inline_keyboard: InlineKeyboardButtonJSON[][];
}

export interface MenuApi {
  update: () => Promise<void> | void;
  nav: (menuId: string, payload?: any) => any;
  back: (menuId?: string | null, payload?: any) => any;
  getPayload: () => any;
}

export class Menu {
  constructor(menuId: string);

  readonly menuId: string;
  readonly parentMenuId: string | null;

  text(
    label: string | ((ctx: any) => string),
    middleware?: (ctx: any, menuApi: MenuApi) => any | Promise<any>,
    requirement?: Requirement
  ): this;

  url(
    label: string | ((ctx: any) => string),
    url: string,
    requirement?: Requirement
  ): this;

  webApp(
    label: string | ((ctx: any) => string),
    webAppUrl: string,
    requirement?: Requirement
  ): this;

  dynamic(
    generator: (ctx: any, range: MenuRange, payload: any) => any | Promise<any>
  ): this;

  submenu(
    label: string | ((ctx: any) => string),
    submenuId: string,
    payload?: any | ((ctx: any, menuApi: MenuApi) => any)
  ): this;

  back(
    label: string | ((ctx: any) => string),
    menuId?: string,
    payload?: any | ((ctx: any, menuApi: MenuApi) => any)
  ): this;

  row(): this;

  nav(menuId: string, payload?: any): any;

  setCaption(caption: string | ((ctx: any, payload: any) => string), format?: ParseMode): this;
  readonly caption: string | undefined;
  readonly format: ParseMode | undefined;

  update(): Promise<void>;
  register(submenu: Menu): void;
  toJSON(ctx?: any): InlineKeyboardMarkupJSON;
  middleware(): (ctx: any, next: () => Promise<any>) => Promise<any>;
}

export default Menu;

export interface MenuRange {
  text(
    label: string | ((ctx: any) => string),
    middleware?: (ctx: any, menuApi: MenuApi) => any | Promise<any>,
    requirement?: Requirement
  ): this;
  url(
    label: string | ((ctx: any) => string),
    url: string,
    requirement?: Requirement
  ): this;
  webApp(
    label: string | ((ctx: any) => string),
    webAppUrl: string,
    requirement?: Requirement
  ): this;
  row(): this;
  submenu(
    label: string | ((ctx: any) => string),
    submenuId: string,
    payload?: any | ((ctx: any, menuApi: MenuApi) => any)
  ): this;
}