import * as fs from 'fs';
import { join } from 'path';
import promisify from 'promisify-node';

const { lstat, readdir } = promisify(fs);

const ACL_EXTENSION = '.acl';

export default class SolidDataReader {
  constructor({ path = '' } = {}) {
    this.path = path;
  }

  // Gets all files in this Solid instance
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

  // Gets all possible ACL files for the given file
  async * getAclFiles(file) {
    // Ensure the file is within this Solid instance
    if (file.indexOf(this.path) !== 0)
      return;

    // An item without trailing slash could be a file or a folder
    if (!/\/$/.test(file)) {
      // Ensure folders always end in a slash
      if ((await lstat(file)).isDirectory())
        file += '/';
      // Files can have a file-specific ACL
      else {
        yield file + ACL_EXTENSION;
        file = file.replace(/[^\/]+$/, '');
      }
    }

    // Return ACLs for the current folder and all parent folders
    while (file.length >= this.path.length) {
      yield file + ACL_EXTENSION;
      file = file.replace(/[^\/]*\/$/, '');
    }
  }
}
