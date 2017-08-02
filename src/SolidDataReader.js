import * as fs from 'fs';
import { join } from 'path';
import { lookup } from 'mime-types';
import promisify from 'promisify-node';
import rdf from 'rdf-ext';
import rdfFormats from 'rdf-formats-common';
import { PermissionSet } from 'solid-permissions';

const { lstat, readdir } = promisify(fs, null, true);
const { parsers } = rdfFormats();

const ACL_EXTENSION = '.acl';
const DEFAULT_CONTENT_TYPE = 'text/turtle'

export default class SolidDataReader {
  constructor({ url = '', path = '' } = {}) {
    this.url = url.replace(/\/$/, '');
    this.path = path.replace(/\/$/, '');
  }

  // Gets all files in this Solid instance
  async * getFiles({ filter = /(?:)/ } = {}) {
    const folders = [this.path];
    for (const folder of folders) {
      const items = (await readdir(folder)).map(f => join(folder, f));
      for (const item of items) {
        const stats = await lstat(item);
        if (stats.isFile() && filter.test(item))
          yield item;
        else if (stats.isDirectory())
          folders.push(item);
      }
    }
  }

  // Gets all files grouped by the agents that can read them
  async getFilesByReadAgent(options) {
    const files = new Map();
    for await (const file of this.getFiles(options)) {
      for await (const agent of this.getReadAgents(file)) {
        if (!files.has(agent))
          files.set(agent, new Set());
        files.get(agent).add(file);
      }
    }
    return files;
  }

  // Gets all agents that can read the given file
  async * getReadAgents(file) {
    const aclFile = await this.getAclFile(file);
    const url = this.getUrlOf(file);
    const aclUrl = this.getUrlOf(aclFile);
    const graph = await this.readFileGraph(aclFile);
    const permissions = new PermissionSet(url, aclUrl, false, { graph, rdf });
    // Find all agents with any permission
    const agents = new Set();
    for (const { agent } of permissions.allAuthorizations())
      agents.add(agent);
    // Return those agents with read permissions
    for (const agent of agents) {
      if (await permissions.checkAccess(url, agent, 'Read'))
        yield agent;
    }
    // Only the first ACL file is valid
    return;
  }

  // Get the most specific ACL file for the given file
  async getAclFile(file) {
    for await (const aclFile of this.getAclFiles(file)) {
      const exists = await lstat(aclFile).then(f => f.isFile(), e => false);
      if (exists)
        return aclFile;
    }
    throw new Error(`No ACL file found for ${file}.`);
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

  // Gets the URL corresponding to the file
  getUrlOf(file) {
    if (file.indexOf(this.path) !== 0)
      return '';
    return this.url + file.substring(this.path.length);
  }

  // Loads and returns the graph in the given file
  async readFileGraph(file) {
    const graph = new Graph();

    // Create an appropriate parser
    const contentType = lookup(file) || DEFAULT_CONTENT_TYPE;
    const parser = parsers.find(contentType);
    if (!parser)
      return graph;

    // Collect parsed triples into an array
    const baseIRI = this.getUrlOf(file);
    const stream = fs.createReadStream(file, 'utf8');
    const triples = parser.import(stream, { baseIRI });
    return graph.import(triples);
  }
}

// solid-permissions expects `match` to return an array
class Graph extends rdf.defaults.Dataset {
  match(subject, predicate, object) {
    return super.match(subject, predicate, object)._quads;
  }
}
