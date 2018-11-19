'use strict';

module.exports = function(server) {
  // Install a `/` route that returns server status
  var router = server.loopback.Router();
  router.get('/', server.loopback.status());
  router.get('/ContractPdf/:name' , function (req ,res){
    res.sendFile('./azzyPortal/dist/#/contractsPDF/' + req.params.name);
  });
  server.use(router);
};
