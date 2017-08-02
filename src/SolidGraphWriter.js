import * as fs from 'fs';
import { join } from 'path';
import rimraf from 'rimraf';
import { createHash } from 'crypto';
import promisify from 'promisify-node';
import rdfFormats from 'rdf-formats-common';

const rmrf = promisify(rimraf);
const { serializers } = rdfFormats();
const { mkdir, writeFile, appendFile } = promisify(fs, null, true);

const RDF_FILES = /\.(ttl|nt|n3|json|jsonld)$/;
const OUTPUT_TYPE = 'application/n-triples';

export default class SolidGraphWriter {
  constructor({ url = '', reader, destination } = {}) {
    this.url = url;
    this.reader = reader;
    this.destination = destination;
  }

  // Writes RDF files per agent, based on their read permissions
  async writeGraphs({ filter = RDF_FILES } = {}) {
    // Empty and recreate the destination folder
    await rmrf(this.destination).catch(e => null);
    mkdir(this.destination);

    // Append each RDF graph to a combined file per agent
    const agentFiles = {};
    for await (const file of this.reader.getFiles({ filter })) {
      // Create a string representation of the graph
      const serialized = await this._serializeGraph(file);

      // Append the graph to the files of all agents that may read it
      for await (const agent of this.reader.getReadAgents(file)) {
        const target = this._getAgentFile(agent);
        if (!(agent in agentFiles))
          agentFiles[agent] = target.replace(/.*\//, '');
        await appendFile(target, serialized);
      }
    }

    // Write the index file
    await writeFile(this._getIndexFile(), JSON.stringify(agentFiles));
  }

  // Returns the name of the file corresponding to the given agent
  _getAgentFile(agent) {
    const hash = createHash('md5').update(agent).digest('hex');
    return join(this.destination, hash + '.nt');
  }

  // Returns the name of the index file
  _getIndexFile() {
    return join(this.destination, 'index.json');
  }

  // Parses and re-serializes the graph in the given file
  async _serializeGraph(file) {
    // Read the graph
    let graph;
    try { graph = await this.reader.readFileGraph(file); }
    // Ignore unparseable files
    catch (e) { return ''; }

    // Serialize the graph
    const serializer = serializers.find(OUTPUT_TYPE);
    return new Promise((resolve, reject) => {
      let result = '';
      serializer.import(graph.toStream())
        .on('error', reject)
        .on('data', d => { result += d.toString(); })
        .on('end', () => resolve(result));
    });
  }
}
