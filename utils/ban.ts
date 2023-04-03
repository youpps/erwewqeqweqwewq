import { log } from "console";
import fs from "fs/promises";
import path from "path";

class Bans {
  static async getAll(): Promise<string[]> {
    const bansFile = await fs.readFile(path.resolve(__dirname, "../configs/bans.json"));
    const bans = JSON.parse(bansFile.toString("utf8"));
    return bans;
  }

  static async add(ban: string) {
    const bans = await Bans.getAll();
    bans.push(ban);

    await fs.writeFile(path.resolve(__dirname, "../configs/bans.json"), JSON.stringify(bans));
  }

  static async delete(ban: string) {
    let bans = await Bans.getAll();
    bans = bans.filter((item) => item !== ban);

    await fs.writeFile(path.resolve(__dirname, "../configs/bans.json"), JSON.stringify(bans));
  }
}

export default Bans;
