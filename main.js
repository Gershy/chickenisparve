console.log('Test boi');

require('http').createServer(async (req, res) => {
	let html = await require('fs').promises.readFile(require('path').join(__dirname, 'main.html'));
	res.writeHead(200, {
		'Content-Type': 'text/html',
		'Content-Length': Buffer.byteLength(html)
	});
	res.end(html);
}).listen(8080, '159.89.122.177')


