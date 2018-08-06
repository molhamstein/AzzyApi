'use strict';
let app = require('../../server/server.js');

module.exports = function (Forms) {

    Forms.beforeRemote('create', function(context, form, next) {
        context.args.data.dateOfArr = Date.now();
        next();
      });

    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    Forms.validatesFormatOf('email', { with: re, message: 'Must provide a valid email' });
    Forms.validatesUniquenessOf('mobileNo');
    Forms.validatesUniquenessOf('email');

    Forms.sendEmail = function (cb) {
        Forms.app.models.Email.send({
            to: 'bsher.ramadan@gmail.com',
            from: 'bshoor96@gmail.com',
            subject: 'my subject',
            text: 'my text',
            html: 'my <em>html</em>'
        }, function (err, mail) {
            console.log('email sent!');
            cb(err);
        });
    }

    Forms.getUnprocessedForms = function (cb){
        Forms.find({where: {status:""},order: 'dateOfArr'}, cb);
    }
    Forms.remoteMethod('getUnprocessedForms', {
        returns: { arg: 'unprocessedForms', type: 'array' },
        http: { path: '/getUnprocessedForms', verb: 'get' }
    });

    Forms.getProcessedForms = function (cb){
        Forms.find({where: {status: {nin: ["" , "Contracts"]}}, order: 'dateOfArr DESC'}, cb);
    }
    Forms.remoteMethod('getProcessedForms', {
        returns: { arg: 'processedForms', type: 'array' },
        http: { path: '/getProcessedForms', verb: 'get' }
    });

    Forms.getContracts = function (cb){
        Forms.find({where: {status: "Contracts"}, order: 'dateOfArr'}, cb);
    }
    Forms.remoteMethod('getContracts', {
        returns: { arg: 'Contracts', type: 'array' },
        http: { path: '/getContracts', verb: 'get' }
    });

    Forms.changeStatusToProc = function (formId , statusName , cb){
        Forms.updateAll({id: formId} , {status: statusName , dateOfProc: new Date()}, cb);
    }
    Forms.remoteMethod('changeStatusToProc', {
        accepts: [
            { arg: 'formId', type: 'string' },
            { arg: 'statusName', type: 'string' }
        ],
        returns: { arg: 'changeStatusToProc', type: 'object' },
        http: { path: '/changeStatusToProc', verb: 'put' }
    });

    Forms.changeStatusToContracts = function (formId  , cb){
        Forms.updateAll({id: formId} , {status: "Contracts" , dateOfProc: new Date()}, cb);
    }
    Forms.remoteMethod('changeStatusToContracts', {
        accepts: [
            { arg: 'formId', type: 'string' }
        ],
        returns: { arg: 'changeStatusToContracts', type: 'object' },
        http: { path: '/changeStatusToContracts', verb: 'put' }
    });

    Forms.readForms = function (cb) {
        Forms.sendEmail(function (err, res) {
            if (err) throw err;
        });
        Forms.find({
            fields: {
                adminId: false,
                clientID: false,
                textBoxAdmin: false,
                deleted: false,
                dateOfProc: false,
                id: false
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
            mobile: form.mobileNo,
            formID: form.id,
            password: "0000",
            email: form.email
        }, function (err, resClient) {
            if (err) throw err;

            Forms.updateAll({ id: form.id }, { clientId: resClient.id });
        });
        /*
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
