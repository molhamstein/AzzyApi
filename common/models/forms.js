'use strict';
let app = require('../../server/server.js');
var path = require('path');
var config = require('../../server/config.json');
var loopback = require('loopback');
var schedule = require('node-schedule');
var _ = require('lodash');
var pdf = require('html-pdf');
let fs = require('fs');
var path = require('path')
var moment = require('moment');
const mongoXlsx = require('mongo-xlsx');

moment().format();

module.exports = function (Forms) {

  var urlFileRoot = "http://azzyimmigration.com:3000/api/uploadFiles";

  var urlFileRootexcel = urlFileRoot + '/excelFiles/download/';

  var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  Forms.validatesFormatOf('email', {
    with: re,
    message: 'Must provide a valid email'
  });
  Forms.validatesUniquenessOf('mobileNo');
  Forms.validatesUniquenessOf('email');
  Forms.validatesInclusionOf('status', {
    in: ['unprocessed', 'contracts', 'more info', 'not eligible', 'consultation'],
    message: 'not valid status',
    allowBlank: true
  });

  Forms.validatesInclusionOf('maritalStatus', {
    in: ['single', 'married', 'divorced', 'widowed'],
    message: 'not valid marital status',
    allowBlank: true
  });
  Forms.validatesInclusionOf('maritalStatusSp', {
    in: ['single', 'married', 'divorced', 'widowed'],
    message: 'not valid marital status Sp',
    allowBlank: true
  });

  Forms.validatesInclusionOf('goodEnglish', {
    in: ['Excellent', 'Good', 'Intermediate', 'Weak'],
    message: 'not valid goodEnglish'
  });
  Forms.validatesInclusionOf('goodEnglishSp', {
    in: ['Excellent', 'Good', 'Intermediate', 'Weak'],
    message: 'not valid goodEnglish',
    allowBlank: true
  });

  Forms.validatesInclusionOf('militaryStatus', {
    in: ['Finished', 'Exemption'],
    message: 'not valid military status',
    allowBlank: true
  });
  Forms.validatesInclusionOf('militaryStatusSp', {
    in: ['Finished', 'Exemption'],
    message: 'not valid military status Sp',
    allowBlank: true
  });

  Forms.validatesInclusionOf('australiaVisaType', {
    in: ['Citizen', 'Permanent Res.', 'Temporary Res.', 'Student-Assylum'],
    message: 'not valid Visa Type',
    allowBlank: true
  });
  Forms.validatesInclusionOf('australiaVisaTypeSp', {
    in: ['Citizen', 'Permanent Res.', 'Temporary Res.', 'Student-Assylum'],
    message: 'not valid Visa Type Sp',
    allowBlank: true
  });



  Forms.sendEmail = function (emailReciver, sub, ht, cb) {
    Forms.app.models.Email.send({
      to: emailReciver,
      from: 'bsher.ramadan@gmail.com',
      subject: sub,
      html: ht

    }, function (err, mail) {
      console.log('email sent!');
      return cb(err);
    });
  }

  Forms.beforeRemote('create', function (context, form, next) {
    context.args.data.dateOfArr = Date.now();
    context.args.data.status = "unprocessed";
    //context.args.data.dateOfProc = " ";
    delete context.args.data.dateOfProc;
    delete context.args.data.consId;
    delete context.args.data.textBoxAdmin;
    delete context.args.data.textBoxNotes;
    delete context.args.data.appointmentId;
    next();
  });

  Forms.beforeRemote('updateOwnForm', function (context, form, next) {
    context.args.data.status = "unprocessed";

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
      if (err) return next(err);
      client.login({
        email: resClient.email,
        password: '0000',
        ttl: 1209600
      }, function (err, t) {
        if (err) return next(err);
        //console.log(t.id);
        client.addRole(resClient.id, 5, function (err, res) {
          if (err) return next(err);
          Forms.updateAll({
            id: form.id
          }, {
            clientId: resClient.id
          }, function (err, info) {
            if (err) return next(err);

            var sub = "confirming the receipt";
            var email1 = {
              clientName: form.nameEnglish + " " + form.surnameEnglish,
              clientNameFarsi: form.nameFarsi + " " + form.surnameFarsi,
              clientNumber: resClient.clientNumber,
              formLink: config.baseURL + '/edit-client/' + form.id + '/' + t.id
            };
            var renderer = loopback.template(path.resolve(__dirname, '../../common/views/email1.ejs'));
            var html_body = renderer(email1);

            Forms.sendEmail(form.email, sub, html_body, function (err) {

            });
            form['token'] = t.id;
            form.clientNumber = resClient.clientNumber;
            next();
          });
        })

      });
    });
  });

  Forms.beforeRemote('deleteById', function (ctx, form, next) {
    Forms.findById(ctx.args.id, function (err, res) {
      if (err) return next(err);
      let Client = app.models.client;
      if (res && res.clientId) {
        Client.destroyById(res.clientId, function (err, res) {
          if (err) return next(err);
          next();
        })
      } else next();
    })

  })

  Forms.updateOwnForm = function (id, updates, cb) {
    Forms.updateAll({
      id: id
    }, updates, cb);
  }

  Forms.remoteMethod('updateOwnForm', {
    accepts: [{
        arg: 'id',
        type: 'any',
        description: 'Model id',
        required: true,
        http: {
          source: 'path'
        }
      },
      {
        arg: 'data',
        type: 'object',
        model: 'forms',
        http: {
          source: 'body'
        },
        description: 'Model instance data'
      }
    ],
    returns: {
      arg: 'updateOwnForm',
      type: 'array'
    },
    http: {
      path: '/updateOwnForm/:id',
      verb: 'put'
    }
  });


  Forms.getUnprocessedForms = function (cb) {
    Forms.find({
      where: {
        status: "unprocessed"
      },
      order: 'dateOfArr',
      include: "Client"
    }, cb);
  }
  Forms.remoteMethod('getUnprocessedForms', {
    returns: {
      arg: 'unprocessedForms',
      type: 'array'
    },
    http: {
      path: '/getUnprocessedForms',
      verb: 'get'
    }
  });

  Forms.getProcessedForms = function (cb) {
    Forms.find({
      where: {
        status: {
          nin: ["unprocessed", "contracts"]
        }
      },
      order: 'dateOfArr DESC',
      include: "Client"
    }, cb);
  }
  Forms.remoteMethod('getProcessedForms', {
    returns: {
      arg: 'processedForms',
      type: 'array'
    },
    http: {
      path: '/getProcessedForms',
      verb: 'get'
    }
  });

  Forms.getContracts = function (cb) {
    Forms.find({
      where: {
        status: "contracts"
      },
      order: 'dateOfArr',
      include: "Client",
    }, cb);
  }
  Forms.remoteMethod('getContracts', {
    returns: {
      arg: 'contracts',
      type: 'array'
    },
    http: {
      path: '/getContracts',
      verb: 'get'
    }
  });

  Forms.changeStatusToUnproc = function (formId, textBoxAdmin, cb) {
    Forms.updateAll({
      id: formId
    }, {
      status: "unprocessed",
      consId: null,
      dateOfProc: null,
      appointmentId: null
    }, function (err, info) {
      if (err) return cb(err);
      Forms.findById(formId, {
        include: "Client"
      }, function (err, form) {
        if (err) return cb(err);
        cb(null, form);
      });
    });

  }
  Forms.remoteMethod('changeStatusToUnproc', {
    accepts: [{
        arg: 'formId',
        type: 'string'
      },
      {
        arg: 'textBoxAdmin',
        type: 'string'
      }
    ],
    returns: {
      arg: 'changeStatusToUnproc',
      type: 'object'
    },
    http: {
      path: '/changeStatusToUnproc',
      verb: 'put'
    }
  });

  Forms.changeStatusToProc = function (formId, statusName, textBoxAdmin, cb) {
    var error;
    if (!(statusName === "more info" || statusName === "not eligible")) {
      error = new Error('not valid status');
      error.status = 404;
      error.code = "notValidStatus";
      return cb(error);
    }
    Forms.updateAll({
      id: formId
    }, {
      status: statusName,
      dateOfProc: new Date(),
      textBoxAdmin: textBoxAdmin,
      consId: null
    }, function (err, res) {
      if (err) return cb(err);
      Forms.findById(formId, {
        include: {
          relation: "Client"
        }
      }, function (err, form) {
        if (err) return cb(err);
        form = form.toJSON();
        var act = app.models.AccessToken;
        act.find({
          where: {
            userId: form.Client.id
          }
        }, function (err, res) {
          console.log(res);
          var client = app.models.client;
          if (err) return cb(err);
          if (form.status == "not eligible") {
            if (!_.isEmpty(res)) {
              for (var i in res)
                client.logout(res[i].id);
            }
            client.removeRole(form.Client.id, 5, function (err, res) {
              if (err) return cb(err);
              var sub = "Request Declined, Client Number" + form.Client.clientNumber;
              var email2 = {
                clientNumber: form.Client.clientNumber,
                clientName: form.nameEnglish + " " + form.surnameEnglish,
                clientNameFarsi: form.nameFarsi + " " + form.surnameFarsi,
                textbox: form.textBoxAdmin,
              };
              var renderer = loopback.template(path.resolve(__dirname, '../../common/views/email2.ejs'));
              var html_body = renderer(email2);

              Forms.sendEmail(form.email, sub, html_body, function (err) {
                if (err) return cb(err);
                return cb(null, form);
              });
            });

          } else if (form.status == "more info") {
            if (!_.isEmpty(res)) {
              for (var i in res)
                client.logout(res[i].id);
            }
            client.login({
              email: form.email,
              password: '0000',
              ttl: 1209600
            }, function (err, t) {
              if (err) throw err;
              var sub = "Further Information Request, " + form.nameEnglish + ", " + form.Client.clientNumber;
              var email3 = {
                clientNumber: form.Client.clientNumber,
                clientName: form.nameEnglish + " " + form.surnameEnglish,
                clientNameFarsi: form.nameFarsi + " " + form.surnameFarsi,
                textbox: form.textBoxAdmin,
                formLink: config.baseURL + '/edit-client/' + form.id + '/' + t.id,
              };
              var renderer = loopback.template(path.resolve(__dirname, '../../common/views/email3.ejs'));
              var html_body = renderer(email3);

              Forms.sendEmail(form.email, sub, html_body, function (err) {
                if (err) return cb(err);
                return cb(null, form);
              });
            });
          }
        });

      });
    });
  }

  Forms.remoteMethod('changeStatusToProc', {
    accepts: [{
        arg: 'formId',
        type: 'string'
      },
      {
        arg: 'statusName',
        type: 'string'
      },
      {
        arg: 'textBoxAdmin',
        type: 'string'
      }
    ],
    returns: {
      arg: 'changeStatusToProc',
      type: 'object'
    },
    http: {
      path: '/changeStatusToProc',
      verb: 'put'
    }
  });

  Forms.changeStatusToConsultation = function (formId, textBoxAdmin, consId, fee, cb) {
    Forms.updateAll({
      id: formId
    }, {
      status: "consultation",
      dateOfProc: new Date(),
      textBoxAdmin: textBoxAdmin,
      professionalInstallments: fee,
      consId: consId
    }, function (err, res) {
      if (err) return cb(err);
      Forms.findById(formId, {
        include: "Client"
      }, function (err, form) {
        if (err) return cb(err);

        var client = app.models.client;
        if (!form) {
          let error = new Error("form not found");
          error.status = 404;
          error.code = "formNotFound";
          return cb(error);
        }
        client.findById(form.clientId, function (err, resClient) {
          if (err) return cb(err);
          var act = app.models.AccessToken;
          act.find({
            where: {
              userId: resClient.id
            }
          }, function (err, res) {
            if (err) return cb(err);
            if (!_.isEmpty(res))
              client.logout(res[0].id);
            client.login({
              email: resClient.email,
              password: '0000',
              ttl: 1209600
            }, function (err, t) {
              if (err) return cb(err);
              client.removeRole(resClient.id, 5, function (err, res) {
                if (err) return cb(err);
                client.addRole(resClient.id, 6, function (err, res) {
                  if (err) return cb(err);
                  var sub = "Your Appointment Request, Client Number" + resClient.clientNumber;
                  var email4 = {
                    subject: sub,
                    clientNumber: resClient.clientNumber,
                    clientName: form.nameEnglish + " " + form.surnameEnglish,
                    clientNameFarsi: form.nameFarsi + " " + form.surnameFarsi,
                    calandarLink: config.baseURL + '/client-calendar/' + form.id + '/' + t.id,
                    textbox: form.textBoxAdmin,
                    fee: form.professionalInstallments,
                  };
                  var renderer = loopback.template(path.resolve(__dirname, '../../common/views/email4.ejs'));
                  var html_body = renderer(email4);

                  Forms.sendEmail(form.email, sub, html_body, function (err) {
                    if (err) return cb(err);
                    return cb(null, form);
                  });
                });
              });
            });
          });
        });
      });
    });
  }

  Forms.remoteMethod('changeStatusToConsultation', {
    accepts: [{
        arg: 'formId',
        type: 'string'
      },
      {
        arg: 'textBoxAdmin',
        type: 'string'
      },
      {
        arg: 'consId',
        type: 'string'
      },
      {
        arg: 'fee',
        type: 'number'
      }
    ],
    returns: {
      arg: 'changeStatusToConsultation',
      type: 'object'
    },
    http: {
      path: '/changeStatusToConsultation',
      verb: 'put'
    }
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
          where: {
            startDate: {
              lte: moment(d).add(3, 'd').toDate()
            },
            reminder: false
          }
        }
      }, {
        relation: 'Client'
      }],
      where: {
        status: "consultation"
      }
    }, function (err, res) {
      if (err) throw err;

      res.forEach(function (form) {
        var f = form.toJSON();
        if (!_.isEmpty(f.consTimes)) {
          var act = app.models.AccessToken;
          act.findOne({
            where: {
              userId: f.Client.id
            }
          }, function (err, t) {
            if (err) throw err;
            var sub = "Your Appointment Reminder, Client Number" + f.Client.clientNumber;
            var email6 = {
              subject: sub,
              clientNumber: f.Client.clientNumber,
              clientName: f.nameEnglish + " " + form.surnameEnglish,
              clientNameFarsi: f.nameFarsi + " " + form.surnameFarsi,
              calandarLink: config.baseURL + '/client-calendar/' + form.id + '/' + t.id,
              location: f.consTimes.location,
              consName: f.consTimes.consultant.username,
              fee: f.professionalInstallments,
              date: locolaizeDate(f.consTimes.startDate, f.timeZone).toDateString(),
              time: locolaizeDate(f.consTimes.startDate, f.timeZone).toTimeString() + " till " + locolaizeDate(form.consTimes.endDate, f.timeZone).toTimeString(),
              cancelLink: config.baseURL + '/cancel-appointment/' + f.id + '/' + t.id
            };
            var renderer = loopback.template(path.resolve(__dirname, '../../common/views/email6.ejs'));
            var html_body = renderer(email6);

            Forms.sendEmail(f.email, sub, html_body, function (err) {
              if (err) throw err;
              console.log("reminder: " + f.email);
            });
            var cons = app.models.consTime;
            cons.updateAll({
              startDate: {
                lte: moment(d).add(3, 'd').toDate()
              },
              reminder: false
            }, {
              reminder: true
            });
          });
        }
      });
    });
    Forms.find({
      include: [{
        relation: 'consTimes',
        scope: {
          include: {
            relation: 'consultant'
          },
          where: {
            startDate: {
              lte: moment(d).add(2, 'd').toDate()
            }
          }
        }
      }, {
        relation: 'Client'
      }],
      where: {
        status: "consultation"
      }
    }, function (err, res) {
      if (err) throw err;

      res.forEach(function (form) {
        var f = form.toJSON();
        if (!_.isEmpty(f.consTimes)) {
          var client = app.models.client;
          client.removeRole(f.Client.id, 6, function (err, res) {
            if (err) throw err;
          })
        }
      });
    });
  });

  Forms.remoteMethod('changeStatusToContracts', {
    accepts: [{
        arg: 'formId',
        type: 'any'
      },
      {
        arg: 'textBoxAdmin',
        type: 'string'
      }
    ],
    returns: {
      arg: 'changeStatusToContracts',
      type: 'object'
    },
    http: {
      path: '/changeStatusToContracts',
      verb: 'put'
    }
  });

  /**
   *
   * @param {number} timeZone
   * @param {Function(Error)} callback
   */

  Forms.testDate = function (timeZone, callback) {
    // create Date object for current location
    var d = new Date();
    console.log(d)
    // convert to msec
    // add local time zone offset
    // get UTC time in msec
    var utc = d.getTime() + (d.getTimezoneOffset() * 60000);

    // create new Date object for different city
    // using supplied offset
    var nd = new Date(utc + (3600000 * timeZone));

    // return time as a string
    console.log("The local time in  is " + nd);
    callback(null);
  };

  function locolaizeDate(date, timeZone) {
    var d = new Date(date);
    console.log(d)
    // convert to msec
    // add local time zone offset
    // get UTC time in msec
    var utc = d.getTime() + (d.getTimezoneOffset() * 60000);

    // create new Date object for different city
    // using supplied offset
    var nd = new Date(utc + (3600000 * timeZone));
    return nd;
    // return time as a string
  }

  Forms.selectAp = function (formId, apId, cb) {
    var error;
    Forms.findById(formId, {
      include: "Client"
    }, function (err, form) {
      if (err) return cb(err);
      if (!form) {
        error = new Error("form not found");
        error.status = 404;
        error.code = "formNotFound";
        return cb(error);
      }
      var consFormId = form.consId;
      var cons = app.models.consTime;
      cons.findById(apId, {
        where: {
          consId: consFormId
        }
      }, function (err, res) {
        if (err) return cb(err)
        if (!res) {
          error = new Error("slot not found");
          error.status = 404;
          error.code = "slotNotFound";
          return cb(error);
        }
        var d = new Date();
        var p = (res.startDate.getTime() - d.getTime() - 2 * 1000 * 3600 * 24) / 1000;
        if (p < -2 * 3600 * 24) {
          error = new Error("appointment is expired");
          error.status = 403;
          error.code = "expiredAppointment";
          return cb(error);
        }

        cons.updateAll({
          clientId: form.clientId
        }, {
          clientId: null,
          open: true
        }, function (err, info) {
          if (err) return cb(err);
          Forms.updateAll({
            id: formId
          }, {
            appointmentId: apId
          }, function (err, info) {
            if (err) return cb(err);
            cons.updateAll({
              id: apId
            }, {
              clientId: res.clientId
            }, function (err, info) {
              if (err) return cb(err);
              Forms.findOne({
                where: {
                  id: formId
                },
                include: [{
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
                if (err) return cb(err);
                var form = f.toJSON();
                console.log(form.consTimes.startDate.toDateString())

                var client = app.models.client;
                var act = app.models.AccessToken;
                if (!form.Client) {
                  error = new Error("client not found");
                  error.status = 404;
                  error.code = "client_not_found";
                  return cb(error);
                }

                act.find({
                  where: {
                    userId: form.Client.id
                  }
                }, function (err, res) {
                  if (err) return cb(err);

                  var d = new Date();
                  var p = (form.consTimes.startDate.getTime() - d.getTime() - 2 * 1000 * 3600 * 24) / 1000;
                  if (p < -2 * 3600 * 24) {
                    error = new Error("appointment is expired");
                    error.status = 403;
                    error.code = "expiredAppointment";
                    return cb(error);
                  } else if (p < 0) {
                    p = 0;
                  }
                  if (!_.isEmpty(res))
                    client.logout(res[0].id);
                  client.login({
                    email: form.Client.email,
                    password: '0000',
                    ttl: p
                  }, function (err, t) {
                    if (err) return cb(err);
                    client.addRole(form.Client.id, 7, function (err, res) {
                      if (err) return cb(err);
                      var con = app.models.consTime;
                      con.updateAll({
                        id: apId
                      }, {
                        clientId: form.Client.id,
                        open: false
                      }, function (err, info) {
                        if (err) return cb(err);
                        var sub = "Your Appointment Confirmation, Client Number " + form.Client.clientNumber;
                        var email5 = {
                          subject: sub,
                          clientNumber: form.Client.clientNumber,
                          clientName: form.nameEnglish + " " + form.surnameEnglish,
                          clientNameFarsi: form.nameFarsi + " " + form.surnameFarsi,
                          calandarLink: config.baseURL + '/client-calendar/' + form.id + '/' + t.id,
                          location: form.consTimes.location,
                          consName: form.consTimes.consultant.username,
                          fee: form.professionalInstallments,
                          date: locolaizeDate(form.consTimes.startDate, form.timeZone).toDateString(),
                          time: locolaizeDate(form.consTimes.startDate, form.timeZone).toTimeString() + " till " + locolaizeDate(form.consTimes.endDate, form.timeZone).toTimeString(),
                          cancelLink: config.baseURL + '/cancel-appointment/' + form.id + '/' + t.id
                        };
                        var renderer = loopback.template(path.resolve(__dirname, '../../common/views/email5.ejs'));
                        var html_body = renderer(email5);

                        Forms.sendEmail(form.email, sub, html_body, function (err) {
                          if (err) return cb(err);
                          return cb(null, form);
                        });
                      });
                    });
                  });
                });
              });
            })

          });
        });
      });

    });

  }
  Forms.remoteMethod('selectAp', {
    accepts: [{
        arg: 'id',
        type: 'any',
        description: 'Model id',
        required: true,
        http: {
          source: 'path'
        }
      },
      {
        arg: 'apId',
        type: 'string'
      }
    ],
    returns: {
      arg: 'selectAp',
      type: 'object'
    },
    http: {
      path: '/selectAp/:id',
      verb: 'put'
    }
  });


  Forms.cancelAp = function (formId, cb) {
    Forms.updateAll({
      id: formId
    }, {
      appointmentId: null
    }, function (err, info) {
      if (err) return cb(err);

      Forms.findById(formId, {
        include: "Client"
      }, function (err, f) {
        if (err) return cb(err)
        if (!f) {
          let error = new Error('form not found');
          error.status = 404;
          error.code = "FormNotFound";
          return cb(error);
        }
        var client = app.models.client;
        client.findById(f.clientId, function (err, resClient) {
          if (err) return cb(err);
          var act = app.models.AccessToken;
          if (!resClient) {
            let error = new Error("client not found");
            error.status = 404;
            error.code = "client_not_found";
            return cb(error);
          }
          act.find({
            where: {
              userId: resClient.id
            }
          }, function (err, res) {
            if (err) return cb(err);
            var cons = app.models.consTime;
            cons.updateAll({
              clientId: f.clientId
            }, {
              clientId: null,
              open: true
            }, function (err, info) {
              if (err) return cb(err);
              if (!_.isEmpty(res))
                client.logout(res[0].id);
              client.removeRole(resClient.id, 7, function (err, res) {
                if (err) return cb(err);
                client.login({
                  email: resClient.email,
                  password: '0000',
                  ttl: 3600 * 24 * 365 * 2
                }, function (err, t) {

                  if (err) return cb(err);

                  var sub = "Your Appointment cancel, " + f.nameEnglish + ", " + resClient.clientNumber;

                  var email7 = {
                    subject: sub,
                    clientNumber: resClient.clientNumber,
                    clientName: f.nameEnglish + " " + f.surnameEnglish,
                    clientNameFarsi: f.nameFarsi + " " + f.surnameFarsi,
                    calandarLink: config.baseURL + '/client-calendar/' + f.clientId + '/' + t.id,
                  };
                  var renderer = loopback.template(path.resolve(__dirname, '../../common/views/email7.ejs'));
                  var html_body = renderer(email7);

                  Forms.sendEmail(f.email, sub, html_body, function (err) {
                    if (err) return cb(err);
                    return cb(null, f);
                  });
                });
              });
            });


          });


        });


      });
    });

  }
  Forms.remoteMethod('cancelAp', {
    accepts: [{
      arg: 'id',
      type: 'any',
      description: 'form id',
      required: true,
      http: {
        source: 'path'
      }
    }],
    returns: {
      arg: 'cancelAp',
      type: 'object'
    },
    http: {
      path: '/cancelAp/:id',
      verb: 'put'
    }
  });
  Forms.changeStatusToContracts = function (formId, textBoxAdmin, cb) {
    Forms.updateAll({
      id: formId
    }, {
      status: "contracts",
      dateOfProc: new Date(),
      textBoxAdmin: textBoxAdmin
    }, cb);
  }


  Forms.readForms = function (cb) {
    Forms.find({
      fields: {
        adminId: false,
        clientId: false,
        textBoxAdmin: false,
        deleted: false,
        dateOfProc: false,
        id: false
      },
      include: "Client"
    }, cb);
  };
  Forms.remoteMethod('readForms', {
    returns: {
      arg: 'Forms',
      type: 'array'
    },
    http: {
      path: '/readForms',
      verb: 'get'
    }
  });

  Forms.getClientForm = function (id, cb) {
    Forms.findById(id, {
      fields: {
        dateOfArr: false,
        status: false,
        dateOfProc: false,
        deleted: false,
        textBoxAdmin: false,
        textBoxNotes: false
      }
    }, cb);
  }
  Forms.remoteMethod('getClientForm', {
    accepts: [{
      arg: 'id',
      type: 'any',
      description: 'form id',
      required: true,
      http: {
        source: 'path'
      }
    }],
    returns: {
      arg: 'getClientForm',
      type: 'object'
    },
    http: {
      path: '/getClientForm/:id',
      verb: 'get'
    }
  });

  Forms.getContractPdf = function (id, cb) {
    Forms.findById(id, function (err, form) {
      if (err) return cb(err);
      if (!form || form.status != "contracts") {
        let error = new Error('form not found');
        error.status = 404;
        error.code = "FormNotFound";
        return cb(error);
      }
      let Fee = app.models.fee;
      Fee.find({
        where: {
          formId: id
        }
      }, function (err, fee) {
        if (err) return cb(err);
        let clientData = {
          name: form.nameEnglish,
          email: form.email,
          phone: form.mobileNo,
          nameSp: form.nameEnglishSp,
          emailSp: form.emailSp,
          phoneSp: form.mobileNoSp,
          address: form.residentialAddressEnglish,
          fees: fee
        };
        var renderer = loopback.template(path.resolve(__dirname, '../../common/views/contract.ejs'));
        var html_body = renderer(clientData);
        const file = "contract-" + form.id + ".pdf";
        var image = path.join('file://', __dirname, '../views/image/1.jpg')
        html_body = html_body.split("{{image}}").join(image);
        var options = {
          renderDelay: 1000,
          format: "A4",
          orientation: "portrait",
          border: {
            top: "18px",
            right: "20px",
            bottom: "0px",
            left: "20px"
          },
          "header": {
            "height": "100",
            "contents": '<img src="' + image + '">'
          },
          "footer": {
            "height": "125",
            "contents": '    <div id="">      <table class="t2" cellspacing="0" cellpadding="0">        <tbody>          <tr height="0">            <td width="350px"></td>            <td width="88px"></td>            <td width="286px"></td>          </tr>          <tr>            <td class="tr3 td38">              <p class="p26 ft6">Signed by the Registered Migration Agent:</p>            </td>            <td colspan="2" class="tr3 td39">              <p class="p27 ft6">Signed by the Client:</p>            </td>          </tr>          <tr>            <td class="tr10 td38">              <p class="p26 ft6">_______________________________________</p>            </td>            <td colspan="2" class="tr10 td39">              <p class="p27 ft6">_______________________________________</p>            </td>          </tr>          <tr>            <td class="tr3 td38">              <p class="p26 ft6">Date: _ _ / _ _ / 20_ _</p>            </td>            <td colspan="2" class="tr3 td39">              <p class="p27 ft6">Date: _ _ / _ _ / 20_ _</p>            </td>          </tr>          <tr>            <td colspan="2" class="tr11 td40">              <p class="p2 ft3">&nbsp;</p>            </td>            <td class="tr11 td41">              <p class="p2 ft3">&nbsp;</p>            </td>          </tr>          <tr>            <td colspan="2" class="tr12 td42">              <p class="p28 ft23">Address: <nobr>31/1-3</nobr> Duff St., Turramurra 2074,</p>            </td>            <td class="tr12 td43">              <p class="p2 ft23">NSW, Australia</p>            </td>          </tr>          <tr>            <td colspan="2" class="tr13 td42">              <p class="p29 ft23">Email: info@azzyimmi.com Mob: +61 (0) 452 477750</p>            </td>            <td class="tr13 td43">              <p class="p30 ft23">Office: +61 (02) 89572137</p>            </td>          </tr>        </tbody>      </table>    </div>'
          }

        }
        pdf.create(html_body, options).toFile('./contractsPDF/' + file, function (err, res) {
          if (err) return cb(err);
          cb(null, {

            url: "http://azzyimmigration.com:3000" + "/contractPdf/" + file
            // url: "http://localhost:3000" + "/contractPdf/" + file
          });
        })
        /*
        const htmlToPDF = new HTMLToPDF({
            inputBody: html_body,
            outputPath: './contractsPDF/' + file,
            include: [{
                "type": "css",
                "filePath": "./common/views/css/style.css"
            }
            ],
            renderDelay: 1000,
            templatePath: './common/views'
        });

        htmlToPDF.build(error => {
            if (error != null) { return cb(error); }
            console.log("3");
            
        });
        */
      })
    })
  }

  Forms.remoteMethod('getContractPdf', {
    accepts: [{
      arg: 'id',
      type: 'any',
      description: 'form id',
      required: true,
      http: {
        source: 'path'
      }
    }],
    returns: {
      arg: 'getContractPdf',
      type: 'object'
    },
    http: {
      path: '/getContractPdf/:id',
      verb: 'get'
    }
  });


  Forms.writeForms = function () {};

  Forms.exportForms = function (filter, cb) {
    Forms.find(filter, function (err, data) {
      if (err)
        return cb(err, null);
      var config = {
        path: 'uploadFiles/excelFiles',
        save: true,
        fileName: 'form' + Date.now() + '.xlsx'
      };
      var exportData = []

      var militaryDurationFrom = ""
      var militaryDurationTo = ""
      var militaryDurationFromSp = ""
      var militaryDurationToSp = ""
      var dateOfBirthPerSp = ""
      data.forEach(element => {
        var object = {}
        var clientNumber
        element.Client(function (err, client) {
          if (client == null)
            clientNumber = ""
          else
            clientNumber = client.clientNumber
        })
        if (element.militaryDurationFromSp != null)
          militaryDurationFromSp = element.militaryDurationFromSp.toString()

        if (element.militaryDurationToSp != null)
          militaryDurationToSp = element.militaryDurationToSp.toString();

        if (element.militaryDurationFrom != null)
          militaryDurationFrom = element.militaryDurationFrom.toString()

        if (element.militaryDurationTo != null)
          militaryDurationTo = element.militaryDurationTo.toString();


        if (element.dateOfBirthPerSp != null)
          dateOfBirthPerSp = element.dateOfBirthPerSp.toString();


        object = {
          "Status": element.status,
          "Client Number": clientNumber,
          "English Name": element.nameEnglish + " " + element.surnameEnglish,
          "Farsi Name": element.nameFarsi + " " + element.surnameFarsi,
          "Mobile Phone": element.mobileNo,
          "Email": element.email,
          "Date Of Birth": element.dateOfBirthPer.toString(),
          "English Address": element.residentialAddressEnglish,
          "Farsi Address": element.residentialAddressFarsi,
          "Date Of Arrival": element.dateOfArr.toString(),
          "Marital Status": element.maritalStatus,
          "Number Of Children": element.numberOfChildren,
          "Line Phone Number": element.lLandlinePhoneNo,
          "Skype": element.skypeID,
          "English": element.goodEnglish,
          "Writing En": element.writingEn,
          "Listening En": element.listeningEn,
          "Reading En": element.readingEn,
          "Speaking En": element.speakingEn,
          "Overall En": element.overallEn,
          "Associate Field": element.assocField,
          "Associate University": element.assocUniversity,
          "Associate City Of University": element.assocCityOfUniversity,
          "Associate Year Of Graduation": element.assocYearOfGraduation,
          "Bachelor Field": element.bacField,
          "Bachelor University": element.bacUniversity,
          "Bachelor City Of University": element.bacCityOfUniversity,
          "Bachelor Year Of Graduation": element.bacYearOfGraduation,
          "Master Field": element.masterField,
          "Master University": element.masterUniversity,
          "Master City Of University": element.masterCityOfUniversity,
          "Master Year Of Graduation": element.masterYearOfGraduation,
          "PHD Field": element.PHDField,
          "PHD University": element.PHDUniversity,
          "PHD City Of University": element.PHDCityOfUniversity,
          "PHD Year Of Graduation": element.PHDYearOfGraduation,
          "Field Of Working": element.fieldOfWorking,
          "Relateded Years Paid": element.relatedEdYearsPaid,
          "Relateded Years Non Paid": element.relatedEdYearsNonPaid,
          "Non Relateded Years Paid": element.nonRelatedEdYearsPaid,
          "Non Relateded Years Non Paid": element.nonRelatedEdYearsNonPaid,
          "Military Status": element.militaryStatus,
          "Exemption Reason": element.exemptionReason,
          "Military Place": element.militaryPlace,
          "Military Duration From": militaryDurationFrom,
          "Military Duration To": militaryDurationTo,
          "Significant Current Sickness": element.significantCurrentSickness,
          "Surgery Past Or Future": element.surgeryPastOrFuture,
          "Australia Family Relation": element.australiaFamilyRelation,
          "Australia Living State": element.australiaLivingState,
          "Australia Living City": element.australiaLivingCity,
          "Australia Visa Type": element.australiaVisaType,

          "Spouse English Name": element.nameEnglishSp + " " + element.surnameEnglishSp,
          "Spouse Farsi Name": element.nameFarsiSp + " " + element.surnameFarsiSp,
          "Spouse Mobile Phone": element.mobileNoSp,
          "Spouse Email": element.emailSp,
          "Spouse Date Of Birth": dateOfBirthPerSp,
          "Spouse Marital Status": element.maritalStatusSp,
          "Spouse Number Of Children": element.numberOfChildrenSp,
          "Spouse Line Phone Number": element.lLandlinePhoneNoSp,
          "Spouse Skype": element.skypeIDSp,
          "Spouse English Address": element.residentialAddressEnglishSp,
          "Spouse Farsi Address": element.residentialAddressFarsiSp,
          "Spouse English": element.goodEnglishSp,
          "Spouse Writing En": element.writingEnSp,
          "Spouse Listening En": element.listeningEnSp,
          "Spouse Reading En": element.readingEnSp,
          "Spouse Speaking En": element.speakingEnSp,
          "Spouse Overall En": element.overallEnSp,
          "Spouse Associate Field": element.assocFieldSp,
          "Spouse Associate University": element.assocUniversitySp,
          "Spouse Associate City Of University": element.assocCityOfUniversitySp,
          "Spouse Associate Year Of Graduation": element.assocYearOfGraduationSp,
          "Spouse Bachelor Field": element.bacFieldSp,
          "Spouse Bachelor University": element.bacUniversitySp,
          "Spouse Bachelor City Of University": element.bacCityOfUniversitySp,
          "Spouse Bachelor Year Of Graduation": element.bacYearOfGraduationSp,
          "Spouse Master Field": element.masterFieldSp,
          "Spouse Master University": element.masterUniversitySp,
          "Spouse Master City Of University": element.masterCityOfUniversitySp,
          "Spouse Master Year Of Graduation": element.masterYearOfGraduationSp,
          "Spouse PHD Field": element.PHDFieldSp,
          "Spouse PHD University": element.PHDUniversitySp,
          "Spouse PHD City Of University": element.PHDCityOfUniversitySp,
          "Spouse PHD Year Of Graduation": element.PHDYearOfGraduationSp,
          "Spouse Field Of Working": element.fieldOfWorkingSp,
          "Spouse Relateded Years Paid": element.relatedEdYearsPaidSp,
          "Spouse Relateded Years Non Paid": element.relatedEdYearsNonPaidSp,
          "Spouse Non Relateded Years Paid": element.nonRelatedEdYearsPaidSp,
          "Spouse Non Relateded Years Non Paid": element.nonRelatedEdYearsNonPaidSp,

          "Spouse Military Status": element.militaryStatusSp,
          "Spouse Exemption Reason": element.exemptionReasonSp,
          "Spouse Military Place": element.militaryPlaceSp,
          "Spouse Military Duration From": militaryDurationFromSp,
          "Spouse Military Duration To": militaryDurationToSp,

          "Spouse Significant Current Sickness": element.significantCurrentSicknessSp,
          "Spouse Surgery Past Or Future": element.surgeryPastOrFutureSp,
          "Spouse Australia Family Relation": element.australiaFamilyRelationSp,
          "Spouse Australia Living State": element.australiaLivingStateSp,
          "Spouse Australia Living City": element.australiaLivingCitySp,
          "Spouse Australia Visa Type": element.australiaVisaTypeSp,
          "How Know": element.howKnow,
          "Main Applicant": element.mainApplicant,
          "Spouse Main Applicant": element.mainApplicantSp,
          "Dependant": element.dependant,
          "Spouse Dependant": element.dependantSp,

          "Occupation To Be Assessed": element.occupationToBeAssessed,
          "Years Of Work Experience": element.yearsOfWorkExperience,
          "Assessment Organization": element.assessmentOrganization,
          "Professional Installments": element.professionalInstallments,
          "Points From Education": element.pointsFromEducation,
          "Points From Work Experience": element.pointsFromWorkExperience,
          "Points From Spouse": element.pointsFromSpouse,
          "Points From English Test": element.pointsFromEnglishTest,
          "Points From NAATI Test": element.pointsFromNAATITest,
          "Points From State Sponsorship": element.pointsFromStateSponsorship,
          "Points From Family Sponsorship": element.pointsFromFamilySponsorship,
          "Total Points": element.totalPoints,

          "Spouse Occupation To Be Assessed": element.occupationToBeAssessedSp,
          "Spouse Years Of Work Experience": element.yearsOfWorkExperienceSp,
          "Spouse Assessment Organization": element.assessmentOrganizationSp,
          "Spouse Points From Education": element.pointsFromEducationSp,
          "Spouse Points From Work Experience": element.pointsFromWorkExperienceSp,
          "Spouse Points From Spouse": element.pointsFromSpouseSp,
          "Spouse Points From English Test": element.pointsFromEnglishTestSp,
          "Spouse Points From NAATI Test": element.pointsFromNAATITestSp,
          "Spouse Points From State Sponsorship": element.pointsFromStateSponsorshipSp,
          "Spouse Points From Family Sponsorship": element.pointsFromFamilySponsorshipSp,
          "Spouse Total Points": element.totalPointsSp,

          "Professional Total": element.professionalTotal


        }
        exportData.push(object);
      });
      var model = mongoXlsx.buildDynamicModel(exportData);
      mongoXlsx.mongoData2Xlsx(exportData, model, config, function (err, data) {
        console.log('File saved at:', data.fullPath);
        return cb(null, {
          'path': urlFileRootexcel + config['fileName']
        });

      })
    })
  }


};
