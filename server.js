let [ https, fs, path ] = [ 'https', 'fs', 'path' ].map(require);
let [ host, port ] = (process.argv[2] || 'localhost:80').split(':');

(async () => {

  // Send response
  let serve = (res, status, content, type) => {
    res.writeHead(status, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(content) });
    res.end(content);
  };

  // Read (potentially cached) file
  let cacheMs = 2000;
  let fileCache = new Map();
  let readFile = (...fp) => {
    fp = path.join(...fp);
    if (!fileCache.has(fp)) {
      fileCache.set(fp, fs.promises.readFile(path.join(__dirname, fp)));
      setTimeout(() => fileCache.delete(fp), cacheMs);
    }
    return fileCache.get(fp);
  };

  const options = {
    key: fs.readFileSync("/etc/letsencrypt/live/chickenisparve.org/privkey.pem"),
    cert: fs.readFileSync("/etc/letsencrypt/live/chickenisparve.org/fullchain.pem")
  };

  https.createServer(options, async (req, res) => {

    let reqMsg = [];
    let addReqMsg = ln => reqMsg.push(...ln.split('\n'));
    let serveReq = (...args) => {
      console.log(`${req.connection.remoteAddress} <- ${req.url}${reqMsg.length ? ':' : ''}`);
      if (reqMsg.length) console.log(reqMsg.map(ln => `> ${ln}`).join('\n'));
      console.log('');
      serve(...args);
    };

    try {

      let servables = JSON.parse(await readFile('asset', 'assets.json'));
      let [ contentType=null, ...fp ] = servables[req.url.slice(1)] || [];
      if (!contentType) throw new Error(`Unknown asset: ${req.url}`);
      serveReq(res, 200, await readFile(...fp), contentType);

    } catch(err) {

      addReqMsg(`Error occurred: ${err.stack}`);
      serveReq(res, 400, 'Your request is as invalid as the assertion that chicken is fleishig', 'text/plain');

    }

  }).listen(port, host);
  console.log(`Listening on ${host}:${port}`);

})();
