let [ http, https, fs, path ] = [ 'http', 'https', 'fs', 'path' ].map(require);

let argv = process.argv[2] || 'http://localhost:80';
let [ hosting, ...more ] = argv.split(' ');
let args = more.join(' ');

let [ protocol, host, port ] = hosting.split(/:[/][/]|:|[ ]/);
port = parseInt(port, 10);
args = args ? eval(`(${args})`) : null;
console.log('Params:', { protocol, host, port, args });

let createProtocolServer = {
  http: async fn => {
    let server = http.createServer(fn);
    server.listen(port, host);
  },
  https: async fn => {
    
    if (port !== 443) throw new Error('Server must use port 443 for https');
    
    let certDir = [ '/', 'etc', 'letsencrypt', 'live', 'chickenisparve.org' ];
    
    let initHttpsServer = async () => {
      
      // TLS server on given port (probably 443)
      let [ key, cert ] = await Promise.all([
        fs.promises.readFile(path.join(...certDir, 'privkey.pem')),
        fs.promises.readFile(path.join(...certDir, 'fullchain.pem'))
      ]);
      
      let server = https.createServer({ key, cert }, fn);
      server.listen(port, host);
      
      await new Promise((rsv, rjc) => { server.on('listening', rsv); server.on('error', rjc); });
      
      return server;
      
    };
    let initHttpServer = async () => {
      
      // Http simply redirects to http
      let server = http.createServer((req, res) => {
        res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
        res.end();
      }).listen(80, host);
      
      await new Promise((rsv, rjc) => { server.on('listening', rsv); server.on('error', rjc); });
      
      return server;
      
    };
    
    let [ httpsServer, httpServer ] = await Promise.all([ initHttpsServer(), initHttpServer() ]);
    
    // Cert renewal loop:
    let certRenewalDelayMs = 12 * 60 * 60 * 1000; // 12hrs
    let delay = (args?.renewImmediately ?? false) ? 500 : certRenewalDelayMs;
    (async () => {
      
      console.log('Cert renewal loop active');
      let certRenewLog = str => console.log(str.replace(/\r/g, '').split('\n').map(ln => `CERT: ${ln}`).join('\n'));
      
      while (true) {
        
        await new Promise(r => setTimeout(r, delay));
        delay = certRenewalDelayMs;
        
        certRenewLog('Performing cert renewal...');
        
        // The renewal process is:
        // 1. Release ports 443 and 80 (certbot needs these ports)
        // 2. Run certbot script
        // 3. Resume listening on these ports
        
        try {
          
          // Step 1
          certRenewLog('Freeing ports 80 and 443...');
          let closePromise = Promise.all([
            new Promise(r => httpsServer.on('close', r) + httpsServer.on('error', r)),
            new Promise(r => httpServer.on('close', r) + httpServer.on('error', r))
          ]);
          [ httpsServer, httpServer ].map(server => server.close());
          await closePromise;
          [ httpsServer, httpServer ] = [ null, null ];
          certRenewLog('Freed!');
          
          // Step 2
          certRenewLog('Running certbot script...');
          let certbotPrc = require('child_process').spawn('certbot', [ 'renew' ]);
          let stdout = [];
          let stderr = [];
          certbotPrc.stdout.on('data', data => stdout.push(data));
          certbotPrc.stderr.on('data', data => stderr.push(data));
          let exitCode = await new Promise((rsv, rjc) => certbotPrc.on('close', rsv) + certbotPrc.on('error', rjc));
          
          // Show certbot output
          [ stdout, stderr ] = [ stdout, stderr ].map(arr => Buffer.concat(arr).toString('utf8').split('\n').map(ln => '>>  ' + ln).join('\n'));
          if (stdout) console.log(`Certbot stdout:\n${stdout}`);
          if (stderr) console.log(`Certbot stderr:\n${stderr}`);
          
          if (exitCode !== 0) throw new Error(`Certbot process had exit-code ${exitCode}`);
          certRenewLog('Certbot script complete!');
          
        } finally {
          
          // Step 3
          try {
            // Ensure servers restart successfully (ideally trigger alert
            // if this fails)
            certRenewLog('Restarting servers...');
            [ httpsServer, httpServer ] = await Promise.all([ initHttpsServer(), initHttpServer() ]);
            certRenewLog('Servers restarted successfully!');
          } catch(err) {
            certRenewLog(`Fatal error; unable to restart servers`, err.stack);
            process.exit(0);
          }
          
        }
        
        certRenewLog('Cert renewal success!');
        
      }
      
    })()
      .catch(err => console.log('Cert renewal failed (renewal loop exited)', err.stack));
    
  }
};
if (!createProtocolServer.hasOwnProperty(protocol)) throw new Error(`Invalid protocol: ${protocol}`);

(async () => {
  
  // Send response
  let serve = (res, status, content, type) => {
    res.writeHead(status, {
      'Content-Type': type,
      'Content-Length': Buffer.byteLength(content),
      'Cache-Control': `max-age=${1 * 60 * 60}`
    });
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
  
  let assets = null;
  await createProtocolServer[protocol](async (req, res) => {
    
    let reqMsg = [];
    let addReqMsg = ln => reqMsg.push(...ln.split('\n'));
    let serveReq = (...args) => {
      console.log(`${req.connection.remoteAddress} <- ${req.url}${reqMsg.length ? ':' : ''}`);
      if (reqMsg.length) console.log(reqMsg.map(ln => `> ${ln}`).join('\n'));
      console.log('');
      serve(...args);
    };
    
    try {
      
      // Current content of assets.json stays valid for 1min
      if (assets === null) {
        assets = JSON.parse(await readFile('asset', 'assets.json'));
        setTimeout(() => assets = null, 1 * 60 * 1000);
      }
      
      let assetName = req.url.slice(1);
      let [ contentType=null, ...fp ] = assets.hasOwnProperty(assetName) ? assets[assetName] : [];
      if (!contentType) throw new Error(`Unknown asset: ${req.url}`);
      serveReq(res, 200, await readFile(...fp), contentType);
      
    } catch(err) {
      
      addReqMsg(`Error occurred: ${err.stack}`);
      serveReq(res, 400, 'Your request is as invalid as the assertion that chicken is fleishig', 'text/plain');
      
    }
    
  });
  console.log(`Listening on ${protocol}://${host}:${port}`);
  
})();
