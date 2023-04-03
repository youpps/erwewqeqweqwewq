import { Api, Logger, TelegramClient } from "telegram";
import { NewMessage, NewMessageEvent } from "telegram/events";
import { StringSession } from "telegram/sessions";
import { Telegram as TelegramBot } from "telegraf";
import { LogLevel } from "telegram/extensions/Logger";
import os from "os";
import fs from "fs/promises";
import input from "./input";
import Session from "./session";
import { EntityLike } from "telegram/define";
import { log } from "console";

interface ITelegram {
  apiId: number;
  apiHash: string;
  telegramPhone: string;
  telegramPassword: string;
  botToken: string;
  session?: string;
}

class Telegram {
  private telegramPhone: string;
  private telegramPassword: string;
  public client: TelegramClient;
  private bot: TelegramBot;

  constructor(props: ITelegram) {
    this.telegramPhone = props.telegramPhone;
    this.telegramPassword = props.telegramPassword;

    const session = new StringSession(props.session ?? "");

    this.client = new TelegramClient(session, props.apiId, props.apiHash, {
      connectionRetries: 5,
      baseLogger: new Logger(LogLevel.NONE),
      deviceModel: `bot@${os.hostname()}`,
      systemVersion: os.version() || "Unknown node",
      appVersion: "1.0.0",
    });

    this.bot = new TelegramBot(props.botToken);
  }

  async start() {
    await this.client.start({
      phoneNumber: this.telegramPhone,
      password: async () => this.telegramPassword,
      phoneCode: async () => await input("Введите код который пришел вам в Telegram"),
      onError: (err) => console.log(err),
    });

    await Session.setSession(this.client.session as StringSession);
  }

  async getUsername(entity: EntityLike) {
    const entityObj = (await this.client.getEntity(entity)) as any;
    return entityObj?.username ? "@" + entityObj?.username : (null as string | null);
  }

  async downloadMedia(media: Api.Message | Api.TypeMessageMedia) {
    const file = await this.client.downloadMedia(media);
    return file;
  }

  async getMe() {
    const me = await this.client.getMe();
    return me;
  }

  onMessage(callback: (e: NewMessageEvent) => any) {
    this.client.addEventHandler(callback, new NewMessage({ incoming: true, outgoing: false }));
  }

  async sendPhoto(chat: number | string, photo: Buffer, caption: string) {
    await this.bot.sendPhoto(
      chat,
      {
        source: photo,
      },
      {
        caption,
      }
    );
  }

  async sendVideo(chat: number | string, video: Buffer, caption: string) {
    await this.bot.sendVideo(
      chat,
      {
        source: video,
      },
      {
        caption,
      }
    );
  }

  async sendDocument(chat: number | string, document: Buffer, filename: string, caption: string) {
    await this.bot.sendDocument(
      chat,
      {
        source: document,
        filename,
      },
      {
        caption,
      }
    );
  }

  async sendMessage(chat: number | string, message: string) {
    await this.bot.sendMessage(chat, message);
  }

  async getChats() {
    const res = await this.client.getDialogs();
    return res;
  }
}

export default Telegram;
