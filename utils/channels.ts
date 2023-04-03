import { log } from "console";
import fs from "fs/promises";
import path from "path";

interface IChannel {
  from: string;
  to: string;
}

class Channels {
  static async getAll(): Promise<IChannel[]> {
    const channelsFile = await fs.readFile(path.resolve(__dirname, "../configs/channels.json"));
    const channels = JSON.parse(channelsFile.toString("utf8"));
    return channels;
  }

  static async add(channel: IChannel) {
    const channels = await Channels.getAll();
    channels.push(channel);

    await fs.writeFile(path.resolve(__dirname, "../configs/channels.json"), JSON.stringify(channels));
  }

  static async delete(channel: IChannel) {
    let channels = await Channels.getAll();
    channels = channels.filter(({ from, to }) => channel.from !== from || channel.to !== to);

    await fs.writeFile(path.resolve(__dirname, "../configs/channels.json"), JSON.stringify(channels));
  }
}

export default Channels;
