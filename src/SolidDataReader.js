import * as fs from 'fs';
import promisify from 'promisify-node';

const { access } = promisify(fs);

export default class SolidDataReader {
  constructor({ path = '' } = {}) {
    this.path = path;
  }

  async * getFiles() {
    await access(this.path).catch(() => { throw new Error('path does not exist') });
  }
}
