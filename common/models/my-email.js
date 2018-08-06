'use strict';
let app = require('../../server/server.js');
module.exports = function(Myemail) {

    Myemail.sendEmail = function(cb) {
        app.models.Email.send({
          to: 'bsher.ramadan@gmail.com',
          from: 'bshoor96@gmail.com',
          subject: 'my subject',
          text: 'my text',
          html: 'my <em>html</em>'
        }, function(err, mail) {
          console.log('email sent!');
          cb(err);
        });
      }
};
