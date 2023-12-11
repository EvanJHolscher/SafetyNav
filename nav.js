'use strict'

// process.env.NODE_ENV = 'production';  <<-- Causing issues with express-session

// Import express
const  express = require('express');

//
const { exec } = require('child_process');

// Import client sessions
const sessions = require('express-session');

// The body parser
const bodyParser = require("body-parser");

// The mysql library
const mysql = require('mysql');

// CryptoJS used for generating secret
const crypto = require('crypto');
// Instantiate an express app
const app = express();

const https = require('https');

const fs = require('fs');

const path = require('path');

const saltRounds = 10;

// Set the view engine
app.set('view engine', 'ejs');

app.use(express.static('public'));

// Setup https
const options = {
	key: fs.readFileSync('private_key.pem'),
	cert: fs.readFileSync('secure_cert.crt')
};


// Needed to parse the request body
// Note that in version 4 of express, express.bodyParser() was
// deprecated in favor of a separate 'body-parser' module.
app.use(bodyParser.urlencoded({ extended: true })); 


// This generates a random base64 string of size length
function makeSecret(length){
	const randomBytes = crypto.randomBytes(Math.ceil((3 * length) / 4));
	return randomBytes.toString('base64').slice(0, length);
}
// Generates secret
const secretString = makeSecret(32);

// The session settings middleware	
app.use(sessions({
  cookieName: 'session',
  secret: secretString,
  resave: false,
  saveUninitialized: true,
  cookie:{
	httpOnly: true,
	maxAge: 60 * 60 * 1000,
	secure: true,
  }
})); 

app.get('/error',(req,res)=>{
	throw new Error('Something went wrong!');
});

app.use((err,req,res,next)=>{
	console.log(err.stack);
	res.status(500).send('Internal Server Error');
});


// The default page
// @param req - the request
// @param res - the response
app.get('/', function(req, res){
		const filePath = path.join(__dirname, 'public', 'index2.html');
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                res.status(404).send('Not Found');
            } else {
                res.status(200).send(data);
            }
        });
});


const httpsServer = https.createServer(options, app).listen(3000);
httpsServer.on('listening', () => {
  import('open').then((open) => {
    open.default('https://localhost:3000').then(() => {
      console.log('Browser opened to localhost:3000');
    }).catch(err => {
      console.error(`Unable to open the browser: ${err}`);
    });
  }).catch(err => {
    console.error(`Error loading 'open' module: ${err}`);
  });
});