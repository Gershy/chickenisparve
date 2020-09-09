let [ http, fs, path ] = [ 'http', 'fs', 'path' ].map(require);
let [ host, port ] = process.argv[2].split(':');

(async () => {
  
  let serve = (res, content, type) => {
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': Buffer.byteLength(content)
    });
    res.end(content);
  };
  let responses = {
    icon: async res => serve(res, await fs.promises.readFile(path.join(__dirname, 'asset', 'iamge', 'favicon.ico')), 'image/x-icon'),
    html: async res => serve(res, await fs.promises.readFile(path.join(__dirname, 'main.html')), 'text/html'),
    css: async res => serve(res, await fs.promises.readFile(path.join(__dirname, 'main.css')), 'text/css'),
    js: async res => serve(res, await fs.promises.readFile(path.join(__dirname, 'main.js')), 'text/javascript'),
    bg: async res => serve(res, await fs.promises.readFile(path.join(__dirname, 'asset', 'image', 'bg.png')), 'image/png')
  };
  
  http.createServer(async (req, res) => console.log(req.url) || (responses[req.url.slice(1)] || responses.html)(res)).listen(port, host);
  console.log(`Listening on ${host}:${port}`);
  
})();

