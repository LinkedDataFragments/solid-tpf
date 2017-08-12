import ldf from 'ldf-server';
import n3 from '@ldf/server-datasource-n3';
import memoize from 'memoizee';

const EVERYONE = 'http://xmlns.com/foaf/0.1/Agent';
const MEMOIZE_OPTIONS = { max: 10, primitive: true };
const EMPTY_DATASOURCE = new ldf.datasources.EmptyDatasource();

export default class SolidDatasource extends ldf.datasources.Datasource {
  static supportedFeatures = Object.freeze({
    user: true,
    hostname: true,
    triplePattern: true,
    limit: true,
    offset: true,
    totalCount: true,
  })

  constructor({ url = '', file = '', ...options } = {}) {
    super(options);
    this._path = (url || file).replace(/\/?$/, '/');

    for (const method of ['_getDatasource'])
      this[method] = memoize(this[method], MEMOIZE_OPTIONS);
  }

  // Writes the results of the query to the given destination
  async _executeQuery(query, destination) {
    // Process the hostname and user query features
    const { user = EVERYONE, hostname = '', ...rest } = query;
    delete query.features.user;
    delete query.features.hostname;

    // Execute the rest of the query on the hostname/user datasource
    try {
      const datasource = await this._getDatasource(hostname, user);
      const result = datasource.select(rest, e => destination.emit('error', e));
      destination.copyProperties(result, ['metadata']);
      result.on('data', d => destination._push(d));
      result.on('end', () => destination.close());
    }
    catch (error) {
      destination.emit('error', error);
    }
  }

  // Gets the relevant Solid datasource for the given hostname and user
  async _getDatasource(hostname, user) {
    // Retrieve the data file from the index
    const path = !hostname ? this._path : `${this._path}${hostname}/`;
    const indexFile = path + 'index.json';
    const index = await this._parseIndex(indexFile);
    const dataFile = user in index ? index[user] : index[EVERYONE];

    // Create a datasource with the data file
    const datasource = !dataFile ? EMPTY_DATASOURCE
      : new n3.datasources.N3Datasource({ url: path + dataFile });

    // Initialize and return the datasource
    if (datasource.initialized)
      return datasource;
    else {
      datasource.initialize();
      return new Promise((resolve, reject) => {
        datasource.on('initialized', () => resolve(datasource));
        datasource.on('error', reject);
      });
    }
  }

  // Parses the given index file
  async _parseIndex(url) {
    return new Promise((resolve, reject) => {
      const stream = this._fetch({ url });
      let json = '';
      stream.on('data', data => json += data);
      stream.on('end', () => resolve(json));
      stream.on('error', reject);
    })
    .then(JSON.parse)
    .catch(e => ({}));
  }
}

Object.defineProperty(SolidDatasource.prototype, 'supportedFeatures', {
  enumerable: true,
  value: SolidDatasource.supportedFeatures,
});
