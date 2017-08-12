export default class SolidRouter {
  // Extracts Solid parameters from the request
  extractQueryParams(request, query) {
    const { headers } = request;

    // Extract the user
    const { user } = headers;
    if (user) {
      query.user = user;
      query.features.user = true;
    }

    // Extract the original hostname
    const host = this._getForwardedHost(headers) || headers.host;
    if (host) {
      query.hostname = host.replace(/:.*/, '');
      query.features.hostname = true;
    }
  }

  // Gets the host of the Solid instance that proxies to this server
  _getForwardedHost({ forwarded = '' }) {
    const hostMatch = forwarded.match(/^(?:.*[;,]\s*)?host="?([^";,]+)/);
    return hostMatch ? hostMatch[1] : '';
  }
}
