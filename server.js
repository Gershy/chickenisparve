let [ http, https, fs, path ] = [ 'http', 'https', 'fs', 'path' ].map(require);
let [ protocol, host, port ] = (process.argv[2] || 'http://localhost:80').split(/:[/][/]|:/);
console.log('Params:', { protocol, host, port });

let createProtocolServer = {
  http: async fn => {
    let server = http.createServer(fn);
    server.listen(port, host);
  },
  https: async fn => {
    
    // Port 80 redirects to http
    http.createServer((req, res) => {
      res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
      res.end();
    }).listen(80);
    
    let certDir = [ '/', 'etc', 'letsencrypt', 'live', 'chickenisparve.org' ];
    
    let initHttpsServer = async () => {
      
      // TLS server on given port (probably 443)
      let [ key, cert ] = await Promise.all([
        fs.promises.readFile(path.join(...certDir, 'privkey.pem')),
        fs.promises.readFile(path.join(...certDir, 'fullchain.pem'))
      ]);
      
      let server = https.createServer({ key, cert }, fn);
      server.listen(port, host);
      
      return server;
      
    };
    
    let httpsServer = await initHttpsServer();
    
    // Cert renewal loop:
    let certRenewalDelayMs = 12 * 60 * 60 * 1000; // 12hrs
    (async () => {
      
      console.log('Cert renewal loop active');
      
      while (true) {
        
        await new Promise(r => setTimeout(r, certRenewalDelayMs));
        
        console.log('Performing cert renewal...');
        
        // Two-step process: renew cert, restart https server
        
        let certbotPrc = require('child_process').spawn('certbot', [ 'renew' ]);
        
        let stdout = [];
        let stderr = [];
        certbotPrc.stdout.on('data', data => stdout.push(data.toString('utf8')));
        certbotPrc.stderr.on('data', data => stderr.push(data.toString('utf8')));
        
        let exitCode = await new Promise((rsv, rjc) => (certbotPrc.on('close', rsv), certbotPrc.on('error', rjc)));
        
        console.log('Cert renewal process finished');
        
        [ stdout, stderr ] = [ stdout, stderr ].map(arr => arr.join('').split('\n').map(ln => '>>  ' + ln).join('\n'));
        if (stdout) console.log(`Certbot stdout:\n${stdout}`);
        if (stderr) console.log(`Certbot stderr:\n${stderr}`);
        
        if (exitCode !== 0) throw new Error(`Certbot process had exit-code ${exitCode}`);
        
        console.log('Cert renewed successfully! Restarting http server...');
        
        // Note errors are tolerated! The error is only real if we can't
        // restart the server in a moment.
        httpsServer.close();
        console.log('Https server closing...');
        await new Promise(r => (httpsServer.on('close', r), httpsServer.on('error', r)));
        
        console.log('Https server closed; restarting...');
        httpsServer = await initHttpsServer();
        try {
          await new Promise((rsv, rjc) => (httpsServer.on('listening', rsv), httpsServer.on('error', rjc)));
        } catch(err) {
          console.log(`Fatal error; unable to restart https server`, err.stack);
          process.exit(0);
        }
        
        console.log(`Https server successfully restarted using renewed tls cert!`);
        
      }
      
    })()
      .catch(err => {
        console.log('Cert renewal failed (renewal loop exited)', err.stack);
      });
    
  }
};
if (!createProtocolServer.hasOwnProperty(protocol)) throw new Error(`Invalid protocol: ${protocol}`);

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
      
      let servables = JSON.parse(await readFile('asset', 'assets.json'));
      let [ contentType=null, ...fp ] = servables[req.url.slice(1)] || [];
      if (!contentType) throw new Error(`Unknown asset: ${req.url}`);
      serveReq(res, 200, await readFile(...fp), contentType);
      
    } catch(err) {
      
      addReqMsg(`Error occurred: ${err.stack}`);
      serveReq(res, 400, 'Your request is as invalid as the assertion that chicken is fleishig', 'text/plain');
      
    }
    
  });
  console.log(`Listening on ${protocol}://${host}:${port}`);
  
})();
