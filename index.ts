import express from "express";
import { engine } from "express-handlebars";
import Session from "./utils/session";
import Telegram from "./utils/telegram";
import config from "./configs/appConfig.json";
import path from "path";
import { log } from "console";
import Channels from "./utils/channels";
import Bans from "./utils/ban";

const PORT = process.env.PORT || 5000;

const app = express();
app.engine("handlebars", engine());
app.set("view engine", "handlebars");
app.set("views", path.resolve(__dirname, "./views"));
app.use(express.urlencoded({ extended: true }));

let isLaunched = true;

async function bootstrap() {
  try {
    const { apiId, apiHash, telegramPhone, telegramPassword, botToken } = config as any;

    const session = await Session.getSession();

    const client = new Telegram({
      apiId,
      apiHash,
      telegramPassword,
      telegramPhone,
      botToken,
      session,
    });

    await client.start();

    await client.getMe();

    let groupedMessages: { [key: number]: { file: Buffer; caption: string; filename: string }[] } = {};

    async function sendGroupedMessage(chat: number | string, groupedId: number, type: "photo" | "video" | "document", file: Buffer, filename: string, caption: string) {
      if (!groupedMessages[groupedId]) {
        groupedMessages[groupedId] = [{ file, caption, filename }];
      } else {
        groupedMessages[groupedId].push({ file, caption, filename });
      }

      setTimeout(() => {
        if (!groupedMessages[groupedId]) {
          return;
        }

        if (type === "video") {
          client.sendVideoMediaGroup(chat, groupedMessages[groupedId]).catch(console.log);
        }

        if (type === "photo") {
          client.sendPhotoMediaGroup(chat, groupedMessages[groupedId]).catch(console.log);
        }

        if (type === "document") {
          client.sendDocumentMediaGroup(chat, groupedMessages[groupedId]).catch(console.log);
        }

        delete groupedMessages[groupedId];
      }, 2000);
    }

    client.onMessage(async (e) => {
      try {
        const message = e.message;
        if (!isLaunched || (!e.isChannel && !e.isGroup) || !message.chatId) {
          return;
        }

        const bans = await Bans.getAll();

        for (let ban of bans) {
          if (message.text.toLowerCase().includes(ban.toLowerCase())) {
            return;
          }
        }

        const username = await client.getUsername(message.chatId);
        const channels = await Channels.getAll();

        for (let { from, to } of channels) {
          if (username === from) {
            if (message.media) {
              if (message.groupedId) {
                if (message.photo) {
                  const photo = (await client.downloadMedia(message)) as Buffer;
                  sendGroupedMessage(to, message.groupedId.toJSNumber(), "photo", photo, "photo", message.text);
                } else if (message.video) {
                  const video = (await client.downloadMedia(message)) as Buffer;
                  sendGroupedMessage(to, message.groupedId.toJSNumber(), "video", video, "video", message.text);
                } else if (message.document) {
                  const document = (await client.downloadMedia(message)) as Buffer;
                  sendGroupedMessage(to, message.groupedId.toJSNumber(), "document", document, (message.document.attributes[0] as any).fileName, message.text);
                }

                return;
              }

              if (message.photo) {
                const photo = (await client.downloadMedia(message)) as Buffer;
                await client.sendPhoto(to, photo, message.text);
              } else if (message.video) {
                const video = (await client.downloadMedia(message)) as Buffer;
                await client.sendVideo(to, video, message.text);
              } else if (message.document) {
                const document = (await client.downloadMedia(message)) as Buffer;
                await client.sendDocument(to, document, (message.document.attributes[0] as any).fileName, message.text);
              }
            } else {
              await client.sendMessage(to, message.text);
            }
          }
        }
      } catch (e) {
        console.log(e);
      }
    });

    const channelRegexp = /@.+->@.+/;
    app.all("/", async (req, res) => {
      try {
        const { channel_name } = req.body;

        if (channel_name && channelRegexp.test(channel_name)) {
          if (req.body["remove_channel"]) {
            const from = channel_name.split("->")[0];
            const to = channel_name.split("->")[1];

            await Channels.delete({
              from,
              to,
            });
          }

          if (req.body["add_channel"]) {
            const from = channel_name.split("->")[0];
            const to = channel_name.split("->")[1];

            await Channels.add({
              from,
              to,
            });
          }
        }

        if (req.body["stop_bot"]) {
          isLaunched = false;
        }

        if (req.body["start_bot"]) {
          isLaunched = true;
        }

        const channels = await Channels.getAll();

        res.status(200).render("admin", {
          bot_status: isLaunched,
          channels: channels.map(({ from, to }) => from + "->" + to),
        });
      } catch (e) {
        console.log(e);
      }
    });

    app.all("/ban", async (req, res) => {
      try {
        const { ban_word } = req.body;

        if (ban_word) {
          if (req.body["add_ban_word"]) {
            await Bans.add(ban_word);
          }

          if (req.body["remove_ban_word"]) {
            await Bans.delete(ban_word);
          }
        }

        const bans = await Bans.getAll();

        res.status(200).render("ban", {
          bans,
        });
      } catch (e) {
        console.log(e);
      }
    });

    app.listen(PORT, () => {
      console.log(`http://localhost:${PORT}`);
    });
  } catch (e) {
    console.log(e);
  }
}

bootstrap();
