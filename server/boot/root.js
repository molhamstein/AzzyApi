'use strict';

module.exports = function(server) {
  // Install a `/` route that returns server status
  var router = server.loopback.Router();
  router.get('/', server.loopback.status());
  router.get('/contractPdf/:name' , function (req ,res){
    console.log('./contractsPDF/' + req.params.name)
    res.sendfile('./contractsPDF/' + req.params.name);
  });
  server.use(router);
};
