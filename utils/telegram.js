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
const telegram_1 = require("telegram");
const events_1 = require("telegram/events");
const sessions_1 = require("telegram/sessions");
const telegraf_1 = require("telegraf");
const Logger_1 = require("telegram/extensions/Logger");
const os_1 = __importDefault(require("os"));
const input_1 = __importDefault(require("./input"));
const session_1 = __importDefault(require("./session"));
class Telegram {
    constructor(props) {
        var _a;
        this.telegramPhone = props.telegramPhone;
        this.telegramPassword = props.telegramPassword;
        const session = new sessions_1.StringSession((_a = props.session) !== null && _a !== void 0 ? _a : "");
        this.client = new telegram_1.TelegramClient(session, props.apiId, props.apiHash, {
            connectionRetries: 5,
            baseLogger: new telegram_1.Logger(Logger_1.LogLevel.NONE),
            deviceModel: `bot@${os_1.default.hostname()}`,
            systemVersion: os_1.default.version() || "Unknown node",
            appVersion: "1.0.0",
        });
        this.bot = new telegraf_1.Telegram(props.botToken);
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.client.start({
                phoneNumber: this.telegramPhone,
                password: () => __awaiter(this, void 0, void 0, function* () { return this.telegramPassword; }),
                phoneCode: () => __awaiter(this, void 0, void 0, function* () { return yield (0, input_1.default)("Введите код который пришел вам в Telegram"); }),
                onError: (err) => console.log(err),
            });
            yield session_1.default.setSession(this.client.session);
        });
    }
    getUsername(entity) {
        return __awaiter(this, void 0, void 0, function* () {
            const entityObj = (yield this.client.getEntity(entity));
            return (entityObj === null || entityObj === void 0 ? void 0 : entityObj.username) ? "@" + (entityObj === null || entityObj === void 0 ? void 0 : entityObj.username) : null;
        });
    }
    downloadMedia(media) {
        return __awaiter(this, void 0, void 0, function* () {
            const file = yield this.client.downloadMedia(media);
            return file;
        });
    }
    getMe() {
        return __awaiter(this, void 0, void 0, function* () {
            const me = yield this.client.getMe();
            return me;
        });
    }
    onMessage(callback) {
        this.client.addEventHandler(callback, new events_1.NewMessage({ incoming: true, outgoing: false }));
    }
    sendPhoto(chat, photo, caption) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.bot.sendPhoto(chat, {
                source: photo,
            }, {
                caption,
            });
        });
    }
    sendVideo(chat, video, caption) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.bot.sendVideo(chat, {
                source: video,
            }, {
                caption,
            });
        });
    }
    sendDocument(chat, document, filename, caption) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.bot.sendDocument(chat, {
                source: document,
                filename,
            }, {
                caption,
            });
        });
    }
    sendMessage(chat, message) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.bot.sendMessage(chat, message);
        });
    }
    getChats() {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield this.client.getDialogs();
            return res;
        });
    }
}
exports.default = Telegram;
