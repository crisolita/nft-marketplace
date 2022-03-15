//IMPORTS
require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xss = require('xss-clean');
const path = require('path');
const cors = require("cors");

//CONFIG
const app = express();
const limit = rateLimit({
    max: 1000,// max requests
    windowMs: 60 * 60 * 1000, // 1 Hour of 'ban' / lockout 
    message: 'Too many requests, you are locked for 1hr' // message to send
});

//MIDDELWARES
app.use(express.urlencoded({extended: true ,limit: '1mb'}))
app.use(express.static(path.join(__dirname,'public'), {
	dotfiles: 'allow',
	maxage: 31557600000,
	setHeaders: function(res, path) {
		res.setHeader("Expires", new Date(Date.now() + 2592000000*30).toUTCString());
	}
}));
app.use(express.json({ limit: '1mb' }));
app.use(xss());
app.use(helmet());
app.use( '*', limit);
app.use(cors());
app.options("*", cors());

app.get('*.js', (req, res) => {
	req.url = req.url + '.gz';
	res.set('Content-Encoding', 'gzip');
	res.set('Content-Type', 'text/javascript');
	res.set("Expires", new Date(Date.now() + 2592000000*30).toUTCString());
	res.sendFile(path.join(__dirname,'/public'+req.url));
});
  
app.get('*.css', (req, res) => {
	req.url = req.url + '.gz';
	res.set('Content-Encoding', 'gzip');
	res.set('Content-Type', 'text/css');
	res.set("Expires", new Date(Date.now() + 2592000000*30).toUTCString());
	res.sendFile(path.join(__dirname,'/public'+req.url));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname,'/public/index.html'));
    return;
});

//CONNECTION
app.listen(process.env.PORT,() => {
    console.log(`Server running on port ${process.env.PORT}`);
});