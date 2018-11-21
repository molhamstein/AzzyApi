'use strict';
const path = require('path');
var loopback = require('loopback');
var boot = require('loopback-boot');

var app = module.exports = loopback();

app.use(loopback.token());
app.use(function(req, res, next) {
    var token = req.accessToken;
    if (!token) {
        return next();
    }
    var now = new Date();
    if ( now.getTime() - token.created.getTime() < 1000 ) {
        return next();
    }
    req.accessToken.created = now;
    req.accessToken.ttl     = 94608000; //three years
    req.accessToken.save(next);
});
app.use('/contractPdf/:name', function(req, res, next) {
  console.log(path.join('file://', __dirname, '../contractsPDF', req.params.name))
  res.sendFile(path.join('file://', __dirname, '../contractsPDF', req.params.name));
});


app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module)
    app.start();
});
