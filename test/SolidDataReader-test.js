import SolidDataReader from '../src/SolidDataReader';
import { join } from 'path';
import { expect } from 'chai';

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
        .to.be.rejectedWith(/path does not exist/);
      });
    });
  });

  describe('with an empty folder', () => {
    const path = join(DATA_FOLDER, 'empty');
    let reader;
    before(() => {
      reader = new SolidDataReader({ path });
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
});
