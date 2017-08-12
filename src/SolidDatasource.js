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

  // Creates a new Solid datasource from the given location
  constructor({ url = '', file = '', ...options } = {}) {
    super(options);
    this._path = (url || file).replace(/\/?$/, '/');

    for (const method of ['_getDatasource'])
      this[method] = memoize(this[method], MEMOIZE_OPTIONS);
  }

  // Determine whether this is a single- or multi-user instance
  async _initialize(done) {
    // Multi-user instances do not have an index file in the root
    this._multiUser = await this._parseIndex(this._path)
                            .then(() => false, () => true)
    done();
  }

  // Writes the results of the query to the given destination
  async _executeQuery(query, destination) {
    // Process the hostname and user query features
    const user = query.user || EVERYONE
    const hostname = this._multiUser && query.hostname || '';
    delete query.features.user;
    delete query.features.hostname;

    // Execute the rest of the query on the hostname/user datasource
    try {
      const datasource = await this._getDatasource(hostname, user);
      const result = datasource.select(query, emitError);
      destination.copyProperties(result, ['metadata']);
      result.on('data', d => destination._push(d));
      result.on('end', () => destination.close());
    }
    catch (error) { emitError(error); }
    function emitError(error) { destination.emit('error', error); }
  }

  // Gets the relevant Solid datasource for the given hostname and user
  async _getDatasource(hostname, user) {
    // Retrieve the data file from the index
    const path = !hostname ? this._path : `${this._path}${hostname}/`;
    const index = await this._parseIndex(path).catch(e => ({}));
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

  // Parses the index file of the given path
  async _parseIndex(path) {
    return new Promise((resolve, reject) => {
      const stream = this._fetch({ url: path + 'index.json' });
      let json = '';
      stream.on('data', data => json += data);
      stream.on('end', () => resolve(json));
      stream.on('error', reject);
    })
    .then(JSON.parse);
  }
}

Object.defineProperty(SolidDatasource.prototype, 'supportedFeatures', {
  enumerable: true,
  value: SolidDatasource.supportedFeatures,
});
