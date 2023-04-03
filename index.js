"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_handlebars_1 = require("express-handlebars");
const session_1 = __importDefault(require("./utils/session"));
const telegram_1 = __importDefault(require("./utils/telegram"));
const appConfig_json_1 = __importDefault(require("./configs/appConfig.json"));
const path_1 = __importDefault(require("path"));
const channels_1 = __importDefault(require("./utils/channels"));
const ban_1 = __importDefault(require("./utils/ban"));
const PORT = process.env.PORT || 5000;
const app = (0, express_1.default)();
app.engine("handlebars", (0, express_handlebars_1.engine)());
app.set("view engine", "handlebars");
app.set("views", path_1.default.resolve(__dirname, "./views"));
app.use(express_1.default.urlencoded({ extended: true }));
let isLaunched = true;
function bootstrap() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { apiId, apiHash, telegramPhone, telegramPassword, botToken } = appConfig_json_1.default;
            const session = yield session_1.default.getSession();
            const client = new telegram_1.default({
                apiId,
                apiHash,
                telegramPassword,
                telegramPhone,
                botToken,
                session,
            });
            yield client.start();
            yield client.getMe();
            client.onMessage((e) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const message = e.message;
                    if (!isLaunched || (!e.isChannel && !e.isGroup) || !message.chatId) {
                        return;
                    }
                    const bans = yield ban_1.default.getAll();
                    for (let ban of bans) {
                        if (message.text.toLowerCase().includes(ban.toLowerCase())) {
                            return;
                        }
                    }
                    const username = yield client.getUsername(message.chatId);
                    const channels = yield channels_1.default.getAll();
                    for (let { from, to } of channels) {
                        if (username === from) {
                            if (message.media) {
                                if (message.photo) {
                                    const photo = (yield client.downloadMedia(message));
                                    yield client.sendPhoto(to, photo, message.text);
                                }
                                else if (message.video) {
                                    const video = (yield client.downloadMedia(message));
                                    yield client.sendVideo(to, video, message.text);
                                }
                                else if (message.document) {
                                    const document = (yield client.downloadMedia(message));
                                    yield client.sendDocument(to, document, message.document.attributes[0].fileName, message.text);
                                }
                            }
                            else {
                                yield client.sendMessage(to, message.text);
                            }
                        }
                    }
                }
                catch (e) {
                    console.log(e);
                }
            }));
            const channelRegexp = /@.+->@.+/;
            app.all("/", (req, res) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const { channel_name } = req.body;
                    if (channel_name && channelRegexp.test(channel_name)) {
                        if (req.body["remove_channel"]) {
                            const from = channel_name.split("->")[0];
                            const to = channel_name.split("->")[1];
                            yield channels_1.default.delete({
                                from,
                                to,
                            });
                        }
                        if (req.body["add_channel"]) {
                            const from = channel_name.split("->")[0];
                            const to = channel_name.split("->")[1];
                            yield channels_1.default.add({
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
                    const channels = yield channels_1.default.getAll();
                    res.status(200).render("admin", {
                        bot_status: isLaunched,
                        channels: channels.map(({ from, to }) => from + "->" + to),
                    });
                }
                catch (e) {
                    console.log(e);
                }
            }));
            app.all("/ban", (req, res) => __awaiter(this, void 0, void 0, function* () {
                try {
                    const { ban_word } = req.body;
                    if (ban_word) {
                        if (req.body["add_ban_word"]) {
                            yield ban_1.default.add(ban_word);
                        }
                        if (req.body["remove_ban_word"]) {
                            yield ban_1.default.delete(ban_word);
                        }
                    }
                    const bans = yield ban_1.default.getAll();
                    res.status(200).render("ban", {
                        bans,
                    });
                }
                catch (e) {
                    console.log(e);
                }
            }));
            app.listen(PORT, () => {
                console.log(`http://localhost:${PORT}`);
            });
        }
        catch (e) {
            console.log(e);
        }
    });
}
bootstrap();
