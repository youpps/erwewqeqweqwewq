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
class Bans {
    static getAll() {
        return __awaiter(this, void 0, void 0, function* () {
            const bansFile = yield promises_1.default.readFile(path_1.default.resolve(__dirname, "../configs/bans.json"));
            const bans = JSON.parse(bansFile.toString("utf8"));
            return bans;
        });
    }
    static add(ban) {
        return __awaiter(this, void 0, void 0, function* () {
            const bans = yield Bans.getAll();
            bans.push(ban);
            yield promises_1.default.writeFile(path_1.default.resolve(__dirname, "../configs/bans.json"), JSON.stringify(bans));
        });
    }
    static delete(ban) {
        return __awaiter(this, void 0, void 0, function* () {
            let bans = yield Bans.getAll();
            bans = bans.filter((item) => item !== ban);
            yield promises_1.default.writeFile(path_1.default.resolve(__dirname, "../configs/bans.json"), JSON.stringify(bans));
        });
    }
}
exports.default = Bans;
