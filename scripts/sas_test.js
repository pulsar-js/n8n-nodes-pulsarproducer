// SAS test script for Azure Notification Hubs
// Reads env vars: AZ_ENDPOINT, AZ_HUB, AZ_KEY_NAME, AZ_KEY or AZ_CONNECTION_STRING
// Generates a SAS token and performs a GET on the hub's /registrations endpoint.

const crypto = require('crypto');
const https = require('https');

function parseConnectionString(conn) {
  const parts = conn.split(';');
  const out = {};
  parts.forEach(p => {
    if (p.startsWith('Endpoint=')) out.endpoint = p.replace('Endpoint=', '');
    else if (p.startsWith('SharedAccessKeyName=')) out.keyName = p.replace('SharedAccessKeyName=', '');
    else if (p.startsWith('SharedAccessKey=')) out.key = p.replace('SharedAccessKey=', '');
  });
  return out;
}

(async function main(){
  const env = process.env;
  let endpoint = env.AZ_ENDPOINT;
  let hub = env.AZ_HUB;
  let keyName = env.AZ_KEY_NAME;
  let key = env.AZ_KEY;
  const conn = env.AZ_CONNECTION_STRING || env.CONNECTION_STRING;

  if (conn && (!endpoint || !key || !keyName)) {
    const parsed = parseConnectionString(conn);
    if (parsed.endpoint) endpoint = endpoint || parsed.endpoint;
    keyName = keyName || parsed.keyName;
    key = key || parsed.key;
  }

  if (!endpoint || !hub || !keyName || !key) {
    console.error('Missing required inputs. Provide AZ_ENDPOINT, AZ_HUB, AZ_KEY_NAME, AZ_KEY or AZ_CONNECTION_STRING + AZ_HUB.');
    process.exit(2);
  }

  // Normalize endpoint -> host
  // support sb://namespace.servicebus.windows.net/ or https://...
  let host = endpoint.replace(/^sb:\/\//i, '');
  host = host.replace(/^https?:\/\//i, '');
  host = host.replace(/\/+$/,'');

  const baseUri = `https://${host}/${hub}`; // used for sr
  const requestUri = `${baseUri}/registrations`;

  // Helper to generate a SAS token for a given resource URI
  function generateSas(resourceUri, doEncode = true) {
    const expiry = Math.floor(Date.now()/1000) + 3600;
    const encodedUri = doEncode ? encodeURIComponent(resourceUri) : resourceUri;
    const stringToSign = `${encodedUri}\n${expiry}`;

    // Key is base64-encoded in Azure. Decode before HMAC.
    let keyBuf;
    try {
      keyBuf = Buffer.from(key, 'base64');
    } catch (e) {
      console.error('Failed to base64-decode key. Ensure AZ_KEY contains the Base64 SharedAccessKey.');
      process.exit(3);
    }

    // small prefix for diagnostics (hex)
    const keyHexPrefix = keyBuf.slice(0, 8).toString('hex');

    const hmac = crypto.createHmac('sha256', keyBuf);
    hmac.update(stringToSign);
    const signature = hmac.digest('base64');
    const encodedSig = encodeURIComponent(signature);

    const token = `SharedAccessSignature sr=${encodedUri}&sig=${encodedSig}&se=${expiry}&skn=${encodeURIComponent(keyName)}`;

    return {
      token,
      meta: { sr: encodedUri, se: expiry, skn: keyName },
      debug: { keyHexPrefix, stringToSign, signature }
    };
  }

  // We'll try three resource forms: namespace (https://{host}), the hub base URI, and the full registrations URI.
  const namespaceUri = `https://${host}`;
  const rawAttempts = [namespaceUri, baseUri, requestUri];
  // For each resource, try both encoded (encodeURIComponent) and unencoded forms.
  const attempts = [];
  for (const a of rawAttempts) {
    attempts.push({ uri: a, encode: true });
    attempts.push({ uri: a, encode: false });
  }

  (async function tryAll() {
    for (const r of attempts) {
      const { token, meta, debug } = generateSas(r.uri, r.encode);
        console.log('\nTrying SAS for resource:', r.uri, 'encoded?', r.encode);
        console.log('Token meta:', meta);
        console.log('DEBUG keyHexPrefix:', debug.keyHexPrefix);
        console.log('DEBUG stringToSign:', debug.stringToSign);
        console.log('DEBUG base64 signature:', debug.signature);
        const masked = token.length > 24 ? token.slice(0, 12) + '...' + token.slice(-12) : token;
        console.log('DEBUG masked token:', masked);

      try {
        await new Promise((resolve, reject) => {
          const opts = new URL(requestUri);
          opts.method = 'GET';
          opts.headers = {
            'Authorization': token,
            'x-ms-version': '2015-01'
          };

          const req = https.request(opts, (res) => {
            console.log('HTTP status:', res.statusCode);
            let body = '';
            res.on('data', (d) => { body += d.toString(); });
            res.on('end', () => {
              console.log('Response body (first 2000 chars):\n', body.slice(0, 2000));
              resolve();
            });
          });
          req.on('error', (err) => {
            console.error('Request error:', err.message);
            resolve();
          });
          req.end();
        });
      } catch (e) {
        console.error('Unexpected error while trying resource', r, e && e.message);
      }
    }
    process.exit(0);
  })();
})();
