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
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
class Channels {
    static getAll() {
        return __awaiter(this, void 0, void 0, function* () {
            const channelsFile = yield promises_1.default.readFile(path_1.default.resolve(__dirname, "../configs/channels.json"));
            const channels = JSON.parse(channelsFile.toString("utf8"));
            return channels;
        });
    }
    static add(channel) {
        return __awaiter(this, void 0, void 0, function* () {
            const channels = yield Channels.getAll();
            channels.push(channel);
            yield promises_1.default.writeFile(path_1.default.resolve(__dirname, "../configs/channels.json"), JSON.stringify(channels));
        });
    }
    static delete(channel) {
        return __awaiter(this, void 0, void 0, function* () {
            let channels = yield Channels.getAll();
            channels = channels.filter(({ from, to }) => channel.from !== from || channel.to !== to);
            yield promises_1.default.writeFile(path_1.default.resolve(__dirname, "../configs/channels.json"), JSON.stringify(channels));
        });
    }
}
exports.default = Channels;
