'use strict';
let app = require('../../server/server.js');
var path = require('path');
var config = require('../../server/config.json');
var loopback = require('loopback');
var schedule = require('node-schedule');
var _ = require('lodash');
var moment = require('moment');
moment().format();

module.exports = function (Forms) {
    var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    Forms.validatesFormatOf('email', { with: re, message: 'Must provide a valid email' });
    Forms.validatesUniquenessOf('mobileNo');
    Forms.validatesUniquenessOf('email');

    Forms.sendEmail = function (emailReciver, sub, ht, cb) {
        Forms.app.models.Email.send({
            to: emailReciver,
            from: 'bsher.ramadan@gmail.com',
            subject: sub,
            html: ht

        }, function (err, mail) {
            console.log('email sent!');
            cb(err);
        });
    }

    Forms.beforeRemote('create', function (context, form, next) {
        context.args.data.dateOfArr = Date.now();
        if (context.args.data.status == " ") {
            //context.args.data.dateOfProc = " ";
            context.args.data.adminId = " ";
            context.args.data.textBoxAdmin = " ";
        }
        next();
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
            client.login({ email: resClient.email, password: '0000', ttl: 1209600 }, function (err, t) {
                if (err) throw err;
                //console.log(t.id);
                Forms.updateAll({ id: form.id }, { clientId: resClient.id }, function (err, info) {
                    if (err) throw err;

                    var sub = "confirming the receipt";
                    var email1 = {
                        txt1: "Dear Client ",
                        clientName: form.nameEnglish,
                        txt2: "     Client Number: ",
                        clientNumber: resClient.clientNumber,
                        txt3: "Thank you for sending your information through our application form.",
                        txt4: "Our team is carefully processing all applications and will get back to you as soon as possible, which might take up to 14 working days. Within this time for any change or update of your submitted information, you can access your form by this link:",
                        formLink: config.baseURL + '/forms/' + form.id + '?token=' + t.id,
                        txt5: "We thank you in advance for being patient.",
                        txt6: "Best regards",
                        txt7: "Azzy Immigration"
                    };
                    var renderer = loopback.template(path.resolve(__dirname, '../../common/views/email1.ejs'));
                    var html_body = renderer(email1);

                    Forms.sendEmail(form.email, sub, html_body, function (err) {
                        if (err) throw err;
                    });
                });
            });
        });
        next();
    });

    /*Forms.updateOwnForm = function ( id, updates, cb) {
        Forms.updateAll({
         id: id
        }, updates, cb);
    }

    Forms.remoteMethod('updateOwnForm', {
        accepts: [
            {
                arg: 'id', type: 'any', description: 'Model id', required: true,
                http: { source: 'path' }
            },
            {
                arg: 'data', type: 'object', model: 'forms', http: { source: 'body' }, description:
                    'Model instance data'
            }
        ],
        returns: { arg: 'updateOwnForm', type: 'array' },
        http: { path: '/updateOwnForm/:id', verb: 'put' }
    });
    */

    Forms.getUnprocessedForms = function (cb) {
        Forms.find({ where: { status: " " }, order: 'dateOfArr' }, cb);
    }
    Forms.remoteMethod('getUnprocessedForms', {
        returns: { arg: 'unprocessedForms', type: 'array' },
        http: { path: '/getUnprocessedForms', verb: 'get' }
    });

    Forms.getProcessedForms = function (cb) {
        Forms.find({ where: { status: { nin: [" ", "Contracts"] } }, order: 'dateOfArr DESC' }, cb);
    }
    Forms.remoteMethod('getProcessedForms', {
        returns: { arg: 'processedForms', type: 'array' },
        http: { path: '/getProcessedForms', verb: 'get' }
    });

    Forms.getContracts = function (cb) {
        Forms.find({ where: { status: "Contracts" }, order: 'dateOfArr' }, cb);
    }
    Forms.remoteMethod('getContracts', {
        returns: { arg: 'contracts', type: 'array' },
        http: { path: '/getContracts', verb: 'get' }
    });

    Forms.changeStatusToProc = function (formId, statusName, textbox, cb) {
        Forms.updateAll({ id: formId }, { status: statusName, dateOfProc: new Date(), textBoxAdmin: textbox }, function (err, res) {
            if (err) cb(err);
            Forms.findById(formId, function (err, form) {
                if (err) cb(err);

                var client = app.models.client;
                client.findById(form.clientId, function (err, resClient) {
                    if (err) throw err;
                    var act = app.models.AccessToken;
                    act.find({ where: { userId: resClient.id } }, function (err, res) {
                        if (err) throw err;

                        if (form.status == "Not eligible") {
                            if (!_.isEmpty(res))
                                client.logout(res[0].id);

                            var sub = "Request Declined, " + form.nameEnglish + ", " + resClient.clientNumber;
                            var email2 = {
                                txt1: "Dear ",
                                clientName: form.nameEnglish,
                                clientSurname: form.surnameEnglish,
                                txt2: "Thank you for sending your information through our application form.",
                                txt3: "Regretfully we have to inform you that you are not eligible to apply for immigration to Australia:",
                                textbox: form.textBoxAdmin,
                                txt4: "Best regards",
                                txt5: "Azzy Immigration"
                            };
                            var renderer = loopback.template(path.resolve(__dirname, '../../common/views/email2.ejs'));
                            var html_body = renderer(email2);
                            Forms.sendEmail(form.email, sub, html_body, function (err) {
                                if (err) throw err;
                            });
                        }
                        else if (form.status == "more info") {

                            var client = app.models.client;
                            client.login({ email: resClient.email, password: '0000', ttl: 1209600 }, function (err, t) {
                                if (err) throw err;
                                var sub = "Further Information Request, " + form.nameEnglish + ", " + resClient.clientNumber;
                                var email3 = {
                                    txt1: "Dear ",
                                    clientName: form.nameEnglish,
                                    clientSurname: form.surnameEnglish,
                                    txt2: "Thank you for sending your information through our application form.",
                                    txt3: "However we need further Information from you as below:",
                                    textbox: form.textBoxAdmin,
                                    txt4: "Please click on this link to re-open your form and complete your form accordingly:",
                                    formLink: config.baseURL + '/forms/' + form.id + '?token=' + t.id,
                                    txt5: "Best regards",
                                    txt6: "Azzy Immigration"
                                };
                                var renderer = loopback.template(path.resolve(__dirname, '../../common/views/email3.ejs'));
                                var html_body = renderer(email3);

                                Forms.sendEmail(form.email, sub, html_body, function (err) {
                                    if (err) cb(err);
                                });
                            });
                        }
                    });

                });
                cb(null, form);
            });
        });
    }

    Forms.remoteMethod('changeStatusToProc', {
        accepts: [
            { arg: 'formId', type: 'string' },
            { arg: 'statusName', type: 'string' },
            { arg: 'textbox', type: 'string' }
        ],
        returns: { arg: 'changeStatusToProc', type: 'object' },
        http: { path: '/changeStatusToProc', verb: 'put' }
    });

    Forms.changeStatusToConsultation = function (formId, textbox, consId, cb) {
        Forms.updateAll({ id: formId }, { status: "consultation", dateOfProc: new Date(), textBoxAdmin: textbox, consId: consId }, function (err, res) {
            if (err) cb(err);
            Forms.findById(formId, function (err, form) {
                if (err) cb(err);

                var client = app.models.client;
                client.findById(form.clientId, function (err, resClient) {
                    if (err) throw err;
                    client.login({ email: resClient.email, password: '0000', ttl: 1209600 }, function (err, t) {
                        if (err) throw err;

                        var sub = "Your Appointment Request, " + form.nameEnglish + ", " + resClient.clientNumber;
                        var email4 = {
                            txt1: "Dear ",
                            clientName: form.nameEnglish,
                            clientSurname: form.surnameEnglish,
                            txt2: "Thank you for sending your information through our application form.",
                            txt3: "In order to discuss further steps and possibilities for your immigration, please select one available appointment which is suitable for you in our appointment calendar by using below link:",
                            calandarLink: config.baseURL + '/calandar/' + form.consId + '?token=' + t.id,
                            txt4: "You will receive an email for appointment confirmation and another email 2 days prior to your appointment as a reminder. You can still change this appointment if necessary, but not later than 2 days prior to the appointment.",
                            textbox: form.textBoxAdmin,
                            txt5: "Best regards",
                            txt6: "Azzy Immigration"
                        };
                        var renderer = loopback.template(path.resolve(__dirname, '../../common/views/email4.ejs'));
                        var html_body = renderer(email4);

                        Forms.sendEmail(form.email, sub, html_body, function (err) {
                            if (err) throw err;
                        });
                    });

                });
                cb(null, form);
            });
        });

    }

    Forms.remoteMethod('changeStatusToConsultation', {
        accepts: [
            { arg: 'formId', type: 'string' },
            { arg: 'textbox', type: 'string' },
            { arg: 'consId', type: 'string' }
        ],
        returns: { arg: 'changeStatusToConsultation', type: 'object' },
        http: { path: '/changeStatusToConsultation', verb: 'put' }
    });

    var j = schedule.scheduleJob('23 * * *', function () {

        var d = new Date();
        Forms.find({
            include: [{
                relation: 'consTimes',
                scope: {
                    include: {
                        relation: 'consultant'
                    },
                    where: { startDate: { lte: moment(d).add(3, 'd').toDate() }, reminder: false }
                }
            }, {
                relation: 'Client'
            }],
            where: { status: "consultation" }
        }, function (err, res) {
            if (err) throw err;

            res.forEach(function (form) {
                var f = form.toJSON();
                if (!_.isEmpty(f.consTimes)) {
                    var act = app.models.AccessToken;
                    act.findOne({ where: { userId: f.Client.id } }, function (err, t) {
                        var sub = "Your Appointment Reminder, " + f.nameEnglish + ", " + f.Client.clientNumber;
                        var email6 = {
                            txt1: "Dear ",
                            clientName: f.nameEnglish,
                            clientSurname: f.surnameEnglish,
                            txt2: "This is a Reminder for your Consultation with us:",
                            txt3: "Location: " + f.consTimes.location,
                            txt4: "Your Contact Partner: " + f.consTimes.consultant.username,
                            txt5: "Date: " + f.consTimes.startDate.toDateString(),
                            txt6: "Time: " + f.consTimes.startDate.toTimeString() + " till " + f.consTimes.endDate.toTimeString(),
                            txt7: "If you might not be able to attend, please, re-schedule or cancel your appointment within the next 24 hours.",
                            txt8: "You can change your appointment by clicking on below link:",
                            calandarLink: config.baseURL + '/calandar/' + form.consId + '?token=' + t.id,
                            txt9: "You will receive an email 2 days prior to your appointment as a reminder.",
                            txt10: "You can cancel your Appointment by clicking on below link:",
                            cancelLink: 'http://' + config.host + ':' + config.port + '/appointment/' + f.consTimes.id,
                            txt11: "Best regards",
                            txt12: "Azzy Immigration"
                        };
                        var renderer = loopback.template(path.resolve(__dirname, '../../common/views/email6.ejs'));
                        var html_body = renderer(email6);

                        Forms.sendEmail(f.email, sub, html_body, function (err) {
                            if (err) throw err;
                            console.log("reminder: " + f.email);
                        });
                        var cons = app.models.consTime;
                        cons.updateAll({ startDate: { lte: moment(d).add(3, 'd').toDate() }, reminder: false }, { reminder: true });
                    });

                }
            });

        });

    });


    Forms.cancelAp = function (formId, cb) {
        Forms.updateAll({ id: formId }, { appointmentId: " " }, function (err, info) {
            if (err) cb(err);

            Forms.findById(formId, function (err2, f) {
                if (err2) cb(err2)
                var client = app.models.client;
                client.findById(f.clientId, function (err, resClient) {
                    if (err) cb(err);

                    client.login({ email: resClient.email, password: '0000', ttl: 3600 * 24 * 365 * 2 }, function (err, t) {

                        if (err) cb(err);
                        var sub = "Your Appointment cancel, " + f.nameEnglish + ", " + resClient.clientNumber;

                        var email7 = {
                            txt1: "Dear " + f.nameEnglish + ", your appointment has been cancelled.",
                            txt2: "You can re-schedule an Appointment by clicking on below Link:",
                            calandarLink: config.baseURL + '/calandar/' + f.consId + '?token=' + t.id,
                            txt3: "Best regards",
                            txt4: "Azzy Immigration"
                        };
                        var renderer = loopback.template(path.resolve(__dirname, '../../common/views/email7.ejs'));
                        var html_body = renderer(email7);

                        Forms.sendEmail(f.email, sub, html_body, function (err) {
                            if (err) cb (err);
                            cb(null, f);
                        });
                    });

                });

                
            });
        });

    }
    Forms.remoteMethod('cancelAp', {
        accepts: [
            { arg: 'formId', type: 'string' }
        ],
        returns: { arg: 'cancelAp', type: 'object' },
        http: { path: '/cancelAp', verb: 'put' }
    });
    Forms.changeStatusToContracts = function (formId, cb) {
        Forms.updateAll({ id: formId }, { status: "Contracts", dateOfProc: new Date() }, cb);
    }
    Forms.remoteMethod('changeStatusToContracts', {
        accepts: [
            { arg: 'formId', type: 'string' }
        ],
        returns: { arg: 'changeStatusToContracts', type: 'object' },
        http: { path: '/changeStatusToContracts', verb: 'put' }
    });

    Forms.selectAp = function (formId, apId, cb) {
        var con = app.models.consTime;
        Forms.updateAll({ id: formId }, { appointmentId: apId }, function (err, info) {
            if (err) cb(err);
            Forms.findOne({
                where: { id: formId }, include: [{
                    relation: 'consTimes',
                    scope: {
                        include: {
                            relation: 'consultant'
                        }
                    }
                }, {
                    relation: 'Client'
                }]
            }, function (err, f) {
                if (err) cb(err);
                var form = f.toJSON();

                var d = new Date();
                var p = (form.consTimes.startDate.getTime() - d.getTime() - 2 * 1000 * 3600 * 24) / 1000;
                var client = app.models.client;
                client.login({ email: form.Client.email, password: '0000', ttl: p }, function (err, t) {

                    if (err) cb(err);
                    var sub = "Your Appointment Confirmation, " + form.nameEnglish + ", " + form.Client.clientNumber;
                    var email5 = {
                        txt1: "Dear ",
                        clientName: form.nameEnglish,
                        clientSurname: form.surnameEnglish,
                        txt2: "Thank you scheduling a Consultation with us:",
                        txt3: "Location: " + form.consTimes.location,
                        txt4: "Your Contact Partner: " + form.consTimes.consultant.username,
                        txt5: "Date: " + form.consTimes.startDate.toDateString(),
                        txt6: "Time: " + form.consTimes.startDate.toTimeString() + " till " + form.consTimes.endDate.toTimeString(),
                        txt7: "You can change your appointment by clicking on below link:",
                        calandarLink: config.baseURL + '/calandar/' + form.consId + '?token=' + t.id,
                        txt8: "You will receive an email prior to your appointment as a reminder",
                        txt9: "You can cancel your Appointment by clicking on below link:",
                        cancelLink: config.baseURL + '/cancelappointment/' + form.id + '?token=' + t.id,
                        txt10: "Best regards",
                        txt11: "Azzy Immigration"
                    };
                    var renderer = loopback.template(path.resolve(__dirname, '../../common/views/email5.ejs'));
                    var html_body = renderer(email5);

                    Forms.sendEmail(form.email, sub, html_body, function (err) {
                        if (err) throw err;
                    });
                })

                cb(null, form);
            });
        });


    }
    Forms.remoteMethod('selectAp', {
        accepts: [
            { arg: 'formId', type: 'string' },
            { arg: 'apId', type: 'string' }
        ],
        returns: { arg: 'selectAp', type: 'object' },
        http: { path: '/selectAp', verb: 'put' }
    });

    Forms.readForms = function (cb) {
        Forms.find({
            fields: {
                adminId: false,
                clientId: false,
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





    Forms.writeForms = function () { };

};
