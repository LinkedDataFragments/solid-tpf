import SolidGraphWriter from '../src/SolidGraphWriter';
import SolidDataReader from '../src/SolidDataReader';
import * as fs from 'fs';
import { join } from 'path';
import rimraf from 'rimraf';
import { expect } from 'chai';
import promisify from 'promisify-node';

const { lstat, readFile } = promisify(fs, null, true);
const rmrf = promisify(rimraf);

const DATA_FOLDER = join(__dirname, 'assets/data');

const EVERYONE = 'http://xmlns.com/foaf/0.1/Agent';
const ALICE = 'https://example.org/agents/alice#me';

describe('SolidGraphWriter', () => {
  describe('with an valid destination', () => {
    const destination = join(__dirname, 'tmp');
    const path = join(DATA_FOLDER, 'default');
    const url = 'https://example.org/solid'
    let writer;
    before(async () => {
      await rmrf(destination);
      writer = new SolidGraphWriter({
        url,
        destination,
        reader: new SolidDataReader({ path, url }),
      });
    });
    after(async () => {
      await rmrf(destination);
    });

    describe('writeGraphs', () => {
      before(async () => {
        await writer.writeGraphs();
      });

      it('creates the destination folder', async () => {
        const stats = await lstat(destination);
        expect(stats.isDirectory()).to.be.true;
      });

      it('creates an index.json file', async () => {
        const indexFile = join(destination, 'index.json');
        const stats = await lstat(indexFile);
        expect(stats.isFile()).to.be.true;
      });

      describe('the index.json file', async () => {
        const indexFile = join(destination, 'index.json');
        let index;

        before(async () => {
          index = JSON.parse(await readFile(indexFile, 'utf8'));
        });

        it('contains keys for 2 agents in the JSON file', async () => {
          expect(Object.keys(index)).to.have.length(2);
          expect(index).to.have.all.keys(EVERYONE, ALICE);
        });

        it('points to a file for everyone with 4 triples', async () => {
          const file = join(destination, index[EVERYONE]);
          expect(file).to.match(/\.nt$/);
          const contents = await readFile(file, 'utf8');
          expect(contents.trim().split(/\n/)).to.have.length(4);
        });

        it('points to a file for Alice with 5 triples', async () => {
          const file = join(destination, index[ALICE]);
          expect(file).to.match(/\.nt$/);
          const contents = await readFile(file, 'utf8');
          expect(contents.trim().split(/\n/)).to.have.length(5);
        });
      });
    });
  });
});

