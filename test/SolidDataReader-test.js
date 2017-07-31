import SolidDataReader from '../src/SolidDataReader';
import * as fs from 'fs';
import { join } from 'path';
import { expect } from 'chai';
import promisify from 'promisify-node';

const { open, close, unlink } = promisify(fs);

const DATA_FOLDER = join(__dirname, 'assets/data');

describe('SolidDataReader', () => {
  describe('with an invalid path', () => {
    let reader;
    before(() => {
      reader = new SolidDataReader();
    });

    describe('getFiles', () => {
      it('throws an error', async () => {
        await expect((async () => {
          for await (const file of reader.getFiles())
            throw file;
        })())
        .to.be.rejectedWith(/no such file or directory/);
      });
    });
  });

  describe('with an empty folder', () => {
    const path = join(DATA_FOLDER, 'empty');
    let reader;
    before(async () => {
      await unlink(join(path, '.gitkeep')).catch(e => e);
      reader = new SolidDataReader({ path });
    });
    after(async () => {
      await open(join(path, '.gitkeep'), 'w').then(close);
    });

    describe('getFiles', () => {
      it('returns no files', async () => {
        const files = []
        for await (const file of reader.getFiles())
          files.push(file);
        expect(files).to.be.empty;
      });
    });
  });

  describe('with the default test folder', () => {
    const path = join(DATA_FOLDER, 'default');
    let reader;
    before(() => {
      reader = new SolidDataReader({ path });
    });

    describe('getFiles', () => {
      it('returns all files', async () => {
        const files = []
        for await (const file of reader.getFiles())
          files.push(file);
        files.sort();
        expect(files).to.deep.equal([
          `${path}/everyone.ttl`,
          `${path}/everyone2.ttl`,
          `${path}/subfolder-a/everyone.ttl`,
          `${path}/subfolder-b/everyone.ttl`,
        ]);
      });
    });
  });
});
