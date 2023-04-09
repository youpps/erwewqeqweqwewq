import express from "express";
import { engine } from "express-handlebars";
import Session from "./utils/session";
import Telegram from "./utils/telegram";
import config from "./configs/appConfig.json";
import path from "path";
import fs from "fs/promises";
import Channels from "./utils/channels";
import Bans from "./utils/ban";
import { log } from "console";

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

    async function sendGroupedMessage(chat: number | string, groupedId: number, type: "photo" | "video" | "document", file: Buffer, filename: string, caption: string, thread: number | undefined) {
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
          client.sendVideoMediaGroup(chat, groupedMessages[groupedId], thread).catch(console.log);
        }

        if (type === "photo") {
          client.sendPhotoMediaGroup(chat, groupedMessages[groupedId], thread).catch(console.log);
        }

        if (type === "document") {
          client.sendDocumentMediaGroup(chat, groupedMessages[groupedId], thread).catch(console.log);
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
        const messageText = message.rawText
          .replace(/\@\S+/g, "")
          .replace(/(?:https?|ftp):\/\/[\n\S]+/g, "")
          .replace(/\S+\.\S+\.\S+/, "");
        // .trim();

        const messageEntities = e.message.entities
          ?.map(({ className, length, ...rest }) => {
            if (className === "MessageEntityTextUrl") {
              return {
                ...rest,
                length: length - 1,
                type: "text_link",
              };
            }

            return {
              ...rest,
              length: length - 1,
              type: className
                .replace(/MessageEntity/, "")
                .replace(/[A-Z]/g, (str) => `_${str.toLowerCase()}`)
                .slice(1) as any,
            };
          })
          .filter(({ length, offset }) => {
            return length + offset <= messageText.length;
          });

        const username = await client.getUsername(message.chatId);
        const channels = await Channels.getAll();

        for (let { from, to } of channels) {
          if (username === from) {
            const thread = to.split("/").length === 2 ? Number(to.split("/")[1]) : undefined;
            const channelTo = to.split("/").length === 2 ? to.split("/")[0] : to;

            if (message.media && !message.webPreview) {
              if (message.groupedId) {
                if (message.photo) {
                  const photo = (await client.downloadMedia(message)) as Buffer;
                  sendGroupedMessage(channelTo, message.groupedId.toJSNumber(), "photo", photo, "photo", messageText, thread);
                } else if (message.video) {
                  const video = (await client.downloadMedia(message)) as Buffer;
                  sendGroupedMessage(channelTo, message.groupedId.toJSNumber(), "video", video, "video", messageText, thread);
                } else if (message.document) {
                  const document = (await client.downloadMedia(message)) as Buffer;
                  sendGroupedMessage(channelTo, message.groupedId.toJSNumber(), "document", document, (message.document.attributes[0] as any).fileName, messageText, thread);
                }

                return;
              }
              // 1AgAOMTQ5LjE1NC4xNjcuNDEBuwQkFLI7Vqacurd0NN6gNTtx22+ZZmj+zJws+u1eN9wGeTVjsgSh8FbwJNgUsPQOzJdHRKHeuQbflcfDjRKmxaTF5HKK1xzJd1dH4ovpBEPAMP1SN/ezEEgRCH/fRrRkPXcLApIRyGUcY3Gz7E2n7Xt7bGcr21fTUeXMx8+M/SJD0q1k2qIRlhT/dK02GsRB5oslUyAN3tTnrhEQhTzuh4VUjvfB31ot6/Op9wUYLqBlD4QHI3ezLXF5zWcztQYiM2iUNGslaYa8CoBItWlHgSnNEqP8dTyXOOBTf3cBDh2igNPTrshngjDq7vwQOCMQaHpa3OxInhXNw+FVyg3+kLk=
              if (message.photo) {
                const photo = (await client.downloadMedia(message)) as Buffer;
                await client.sendPhoto(channelTo, photo, messageText, messageEntities, thread);
              } else if (message.video) {
                const video = (await client.downloadMedia(message)) as Buffer;
                await client.sendVideo(channelTo, video, messageText, messageEntities, thread);
              } else if (message.document) {
                const document = (await client.downloadMedia(message)) as Buffer;
                await client.sendDocument(channelTo, document, (message.document.attributes[0] as any).fileName, messageText, messageEntities, thread);
              }
            } else {
              await client.sendMessage(channelTo, messageText, messageEntities, thread);
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
