import * as fs from 'fs';
import { join } from 'path';
import promisify from 'promisify-node';

const { lstat, readdir } = promisify(fs);

export default class SolidDataReader {
  constructor({ path = '' } = {}) {
    this.path = path;
  }

  async * getFiles() {
    const folders = [this.path];
    for (const folder of folders) {
      const items = (await readdir(folder)).map(f => join(folder, f));
      for (const item of items) {
        const stats = await lstat(item);
        if (stats.isFile())
          yield item;
        else if (stats.isDirectory())
          folders.push(item);
      }
    }
  }
}
