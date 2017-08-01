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
        expect(toArray(reader.getFiles()))
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
        const files = await toArray(reader.getFiles());
        expect(files).to.be.empty;
      });
    });
  });

  describe('with the default test folder', () => {
    const path = join(DATA_FOLDER, 'default');
    const url = 'https://example.org/solid'
    let reader;
    before(() => {
      reader = new SolidDataReader({ path, url });
    });

    describe('getFiles', () => {
      describe('without filter', () => {
        it('returns all files', async () => {
          const files = await toArray(reader.getFiles());
          files.sort();
          expect(files).to.deep.equal([
            `${path}/.acl`,
            `${path}/everyone.ttl`,
            `${path}/everyone2.ttl`,
            `${path}/subfolder-a/everyone.ttl`,
            `${path}/subfolder-a/subfolder-aa/.acl`,
            `${path}/subfolder-a/subfolder-aa/alice.ttl`,
            `${path}/subfolder-b/everyone.ttl`,
          ]);
        });
      });

      describe('with filter', () => {
        it('returns only matching files', async () => {
          const filter = /\.ttl$/;
          const files = await toArray(reader.getFiles({ filter }));
          files.sort();
          expect(files).to.deep.equal([
            `${path}/everyone.ttl`,
            `${path}/everyone2.ttl`,
            `${path}/subfolder-a/everyone.ttl`,
            `${path}/subfolder-a/subfolder-aa/alice.ttl`,
            `${path}/subfolder-b/everyone.ttl`,
          ]);
        });
      });
    });

    describe('getAclFiles', () => {
      describe('for a file outside of the test folder', () => {
        const file = DATA_FOLDER;

        it('returns no ACL files', async () => {
          const files = await toArray(reader.getAclFiles(file));
          expect(files).to.be.empty;
        });
      });

      describe('for a first-level folder (without trailing slash)', () => {
        const file = path;

        it('returns a single ACL file', async () => {
          const files = await toArray(reader.getAclFiles(file));
          expect(files).to.deep.equal([
            `${path}/.acl`,
          ]);
        });
      });

      describe('for a first-level folder (with trailing slash)', () => {
        const file = path + '/';

        it('returns a single ACL file', async () => {
          const files = await toArray(reader.getAclFiles(file));
          expect(files).to.deep.equal([
            `${path}/.acl`,
          ]);
        });
      });

      describe('for a first-level file', () => {
        const file = join(path, 'everyone.ttl');

        it('returns all ACL files', async () => {
          const files = await toArray(reader.getAclFiles(file));
          expect(files).to.deep.equal([
            `${path}/everyone.ttl.acl`,
            `${path}/.acl`,
          ]);
        });
      });

      describe('for a second-level folder (without trailing slash)', () => {
        const file = join(path, 'subfolder-a');

        it('returns a single ACL file', async () => {
          const files = await toArray(reader.getAclFiles(file));
          expect(files).to.deep.equal([
            `${path}/subfolder-a/.acl`,
            `${path}/.acl`,
          ]);
        });
      });

      describe('for a second-level folder (with trailing slash)', () => {
        const file = join(path, 'subfolder-a');

        it('returns a single ACL file', async () => {
          const files = await toArray(reader.getAclFiles(file));
          expect(files).to.deep.equal([
            `${path}/subfolder-a/.acl`,
            `${path}/.acl`,
          ]);
        });
      });

      describe('for a second-level file', () => {
        const file = join(path, 'subfolder-a/everyone.ttl');

        it('returns all ACL files', async () => {
          const files = await toArray(reader.getAclFiles(file));
          expect(files).to.deep.equal([
            `${path}/subfolder-a/everyone.ttl.acl`,
            `${path}/subfolder-a/.acl`,
            `${path}/.acl`,
          ]);
        });
      });

      describe('for a third-level file', () => {
        const file = join(path, 'subfolder-a/subfolder-aa/alice.ttl');

        it('returns all ACL files', async () => {
          const files = await toArray(reader.getAclFiles(file));
          expect(files).to.deep.equal([
            `${path}/subfolder-a/subfolder-aa/alice.ttl.acl`,
            `${path}/subfolder-a/subfolder-aa/.acl`,
            `${path}/subfolder-a/.acl`,
            `${path}/.acl`,
          ]);
        });
      });
    });

    describe('getAclFile', () => {
      describe('for a third-level file', () => {
        const file = join(path, 'subfolder-a/subfolder-aa/alice.ttl');

        it('returns the most specific existing ACL file', async () => {
          const aclFile = await reader.getAclFile(file);
          expect(aclFile).to.equal(`${path}/subfolder-a/subfolder-aa/.acl`);
        });
      });
    });

    describe('getReaders', () => {
      describe('for everyone.ttl', () => {
        const file = join(path, 'everyone.ttl');

        it('returns the readers', async () => {
          const readers = await toArray(reader.getReaders(file));
          readers.sort();
          expect(readers).to.deep.equal([
            'http://xmlns.com/foaf/0.1/Agent',
            'https://example.org/agents/alice#me',
          ]);
        });
      });

      describe('for alice.ttl', () => {
        const file = join(path, 'subfolder-a/subfolder-aa/alice.ttl');

        it('returns the readers', async () => {
          const readers = await toArray(reader.getReaders(file));
          readers.sort();
          expect(readers).to.deep.equal([
            'https://example.org/agents/alice#me',
          ]);
        });
      });
    });
  });
});

async function toArray(asyncIterator) {
  const items = [];
  for await (const item of asyncIterator)
    items.push(item);
  return items;
}
