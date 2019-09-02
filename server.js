'use strict';
require('dotenv').config({path: './.env.' + process.env.NODE_ENV});
const http = require('http');
const app = require('./app');

http.createServer(app)
    .on('error', err => console.error(err))
    .listen(3000, function() {
        console.info('listening on port', this.address().port);
    });
