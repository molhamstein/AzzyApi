'use strict';
let app = require('../../server/server.js');

module.exports = function (Forms) {
    
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    Forms.validatesFormatOf('Email', { with: re, message: 'Must provide a valid email' });
    Forms.validatesUniquenessOf('MobileNo');
    Forms.validatesUniquenessOf('Email');
    Forms.readForms = function (cb) {
        Forms.find({
            fields: {
                AdminId: false,
                ClientID: false,
                TextBoxAdmin: false,
                Deleted: false,
                DateOfProc: false,
                Id: false
            }
        }, cb);
    };
    Forms.remoteMethod('readForms', {
        returns: { arg: 'Forms', type: 'array' },
        http: { path: '/readForms', verb: 'get' }
    });



    Forms.afterRemote('create', function (ctx, form, next) {
        let client = app.models.client;
        client.create({
            Mobile: form.MobileNo,
            FormID: form.id,
            password: "0000",
            email: form.Email
        }, function (err, resClient) {
            if (err) throw err;

            let formClient = app.models.formClient;
            formClient.create({
                formID: form.id,
                clientID: resClient.id
            });
        });
        /*
        client.find({ where: { Mobile: form.MobileNo } },
            function (err, resClient) {
                if (err) throw err;
                
                Forms.updateAll({ MobileNo: resClient.Mobile }, {  ClientID: resClient.id },
                    function (err, result) {
                        if (err) throw err;
                        console.log(result);
                    });
            });
            */
        next();
    });


    Forms.writeForms = function () { };

};
