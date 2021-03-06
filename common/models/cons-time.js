'use strict';

let app = require('../../server/server.js');
var _ = require('lodash');
var moment = require('moment');
moment().format();

const ObjectId = require('mongodb').ObjectId


module.exports = function (Constime) {

  Constime.readCalander = function (dateStart, dateEnd, ids, available = false, cb) {
    var whereSlotes = {}
    console.log("dateStart");
    console.log(new Date(dateStart));
    console.log("dateEnd");
    console.log(new Date(dateEnd))
    if (available) {
      whereSlotes = {
        "and": [{
            startDate: {
              gte: new Date(dateStart)
            }
          },
          {
            endDate: {
              lte: new Date(dateEnd)
            }
          },
          {
            "open": true
          }
        ]
      }
    } else {
      whereSlotes = {
        "and": [{
            startDate: {
              gte: dateStart
            }
          },
          {
            endDate: {
              lte: dateEnd
            }
          }
        ]
      }
    }
    if (_.isEmpty(ids)) {
      var stf = app.models.staffuser;
      stf.find({
        include: {
          relation: 'slots',
          scope: {
            include: {
              relation: 'forms',
              scope: {
                fields: {
                  id: true,
                  clientId: true,
                  nameEnglish: true,
                  surnameEnglish: true
                }
              }
            },
            where: whereSlotes,
            order: 'startDate'
          }
        },
        where: {
          type: "consultant"
        }
      }, cb);
    } else {
      var stf = app.models.staffuser;
      stf.find({
        include: {
          relation: 'slots',
          scope: {
            include: {
              relation: 'forms',
              scope: {
                fields: {
                  id: true,
                  clientId: true,
                  nameEnglish: true,
                  surnameEnglish: true
                }
              }
            },
            where: whereSlotes,
            order: 'startDate'
          }
        },
        where: {
          id: {
            inq: ids
          },
          type: "consultant"
        }
      }, cb);
    }

  };

  Constime.remoteMethod('readCalander', {
    accepts: [{
        arg: 'dateStart',
        type: 'date'
      },
      {
        arg: 'dateEnd',
        type: 'date'
      },
      {
        arg: 'ids',
        type: 'array'
      },
      {
        arg: 'available',
        type: 'boolean'
      }
    ],
    http: {
      path: '/readCalander',
      verb: 'get'
    },
    returns: {
      arg: 'readCalander',
      type: 'array'
    }
  });

  // Constime.beforeRemote('create', function (ctx, constime, next) {
  //   if (ctx.args.options.authorizedRoles.consultant) {
  //     var f = "" + ctx.args.data.consId;
  //     var c = "" + ctx.args.options.accessToken.userId
  //     if (f != c) {
  //       var error = new Error("Authorization Required");
  //       error.status = 401;
  //       error.code = 'AUTHORIZATION_REQUIRED';
  //       return next(error);
  //     }
  //     next();
  //   }
  //   next();
  // });

  Constime.beforeRemote('update', function (ctx, constime, next) {
    if (ctx.args.options.authorizedRoles.consultant) {
      var f = "" + ctx.args.data.consId;
      var c = "" + ctx.args.options.accessToken.userId
      if (f != c) {
        var error = new Error("Authorization Required");
        error.status = 401;
        error.code = 'AUTHORIZATION_REQUIRED';
        return next(error);
      }
      next();
    }
    next();
  });

  Constime.beforeRemote('findById', function (ctx, constime, next) {
    if (ctx.args.options.authorizedRoles.consultant) {
      var f = "" + ctx.args.data.consId;
      var c = "" + ctx.args.options.accessToken.userId
      if (f != c) {
        var error = new Error("Authorization Required");
        error.status = 401;
        error.code = 'AUTHORIZATION_REQUIRED';
        return next(error);
      }
      next();
    }
    next();
  });

  Constime.beforeRemote('create', function (ctx, ctime, next) {
    if (ctx.args.options.authorizedRoles.consultant) {
      var f = "" + ctx.args.data.consId;
      var c = "" + ctx.args.options.accessToken.userId
      if (f != c) {
        var error = new Error("Authorization Required");
        error.status = 401;
        error.code = 'AUTHORIZATION_REQUIRED';
        return next(error);
      }
    }
    var user = app.models.staffuser;
    user.findById(ctx.args.data.consId, function (err, res) {
      if (err) return next(err);

      if (!res) {
        var error = new Error("consultant not found");
        error.status = 404;
        error.code = "consultantNotFound";
        return next(error);
      }
      var s, e;
      s = new Date(ctx.args.data.startDate);
      e = new Date(ctx.args.data.endDate);
      if (s.getMinutes() < 30) {
        s.setMinutes(0);
      } else {
        s.setMinutes(30);
      }

      if (e.getMinutes() < 30) {
        e.setMinutes(0);
      }  else {
        e.setMinutes(30);
      }
      s.setSeconds(0);
      s.setMilliseconds(0);
      e.setSeconds(0);
      e.setMilliseconds(0);
      //console.log(s);
      //console.log(e);

      ctx.args.data.startDate = s;
      ctx.args.data.endDate = e;
      console.log("s")
      console.log(s)
      console.log("e")
      console.log(e)
      var id = ctx.args.data.consId;
      Constime.destroyAll({
        startDate: {
          gte: s
        },
        endDate: {
          lte: e
        },
        consId: id
      }, function (err, res) {
        if (err) return next(err);
        next();
      });
    });
    // console.log(e);





  });

  Constime.afterRemote('create', function (ctx, ctime, next) {
    Constime.destroyById(ctime.id, function (err, ob) {
      if (err) throw err;
      var d = moment(ctime.startDate);
      d.tz('Asia/Tehran').format('ha z');
      // console.log(d.hour());
      var d1 = moment(d).add(30, 'm');
      var arr = new Array();
      var end = moment(ctime.endDate);
      end.tz('Asia/Tehran').format('ha z');
      while (d1 <= end) {
        console.log("d.hour()")
        console.log(d.hour())
        // if (d.hour() >= 20) {
        //   var tmp = d;
        //   tmp.add(1, 'd');
        //   tmp.hour(7);
        //   tmp.minute(0);
        //   d = tmp;
        // } else if (d.hour() < 7) {
        //   d.hour(7);
        //   d.minute(0);
        // }
        d1 = moment(d).add(30, 'm');
        // console.log(d.hour());

        if (d1 <= end) {
          var elm = {
            startDate: d.toDate(),
            endDate: d1.toDate(),
            location: ctime.location,
            open: ctime.open,
            consId: ctime.consId,
            clientId: ctime.clientId

          }
          arr.push(elm);
          //cc(elm);
        }
        d = d1;
      }
      Constime.create(arr, function (err, res) {
        if (err) throw err;
        next();
      });
    });

  })

  Constime.writeCalander = function () {};
  Constime.ocCalander = function () {};

  Constime.fetchApAct = function (token, cb) {
    var act = app.models.AccessToken;
    act.findById(token, function (err, res) {
      if (err) return cb(err);
      if (_.isEmpty(res)) return cb(new Error("token not found"));

      Constime.find({
        where: {
          clientId: res[0].userId
        }
      }, function (err, res) {
        if (err) return cb(err);
        if (_.isEmpty(res)) return cb("the client does not have an appointment");
        return cb(null, res);
      })
    });
  }

  Constime.remoteMethod('fetchApAct', {
    accepts: [{
      arg: 'token',
      type: 'any'
    }],
    returns: {
      arg: 'fetchApAct',
      type: 'object'
    },
    http: {
      path: '/fetchApAct',
      verb: 'get'
    }
  });


  Constime.getCloserCons = function (consId, cb) {
    console.log("getCloserCons")
    Constime.findOne({
      where: {
        "startDate": {
          "gt": new Date()
        },
        "open": true,
        "consId": ObjectId(consId)
      },
      sort: {
        "startDate": 1
      }
    }, function (err, date) {
      if (err)
        return cb(err)
      return cb(err, date)
    })
  }


  Constime.getConsInMonth = function (startDate, timezone, consId, cb) {
    var now = new Date()
    var from = startDate
    from.setDate(1);
    from.setUTCHours(0);
    from.setMinutes(0);

    var tempFrom = new Date(from.getTime() + timezone * 60 * 60 * 1000)


    if (tempFrom.getTime() < now.getTime()) {
      from.setDate(now.getDate() + 1)
      from.setUTCHours(0)
      from.setMinutes(0)
      tempFrom = new Date(from.getTime() - timezone * 60 * 60 * 1000);
      console.log("tempFrom/////////")
      console.log(tempFrom)
    }

    // var to = new Date(startDate)
    var to = new Date(Date.UTC(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 0, 0));

    var tempTo = new Date(to.getTime() - timezone * 60 * 60 * 1000);

    console.log("startDate");
    console.log(startDate);
    console.log("from");
    console.log(from);
    console.log("tempFrom");
    console.log(tempFrom);
    console.log("now");
    console.log(now);
    console.log("to")
    console.log(to)
    console.log("tempTo")
    console.log(tempTo)
    console.log("consId")
    console.log(consId)

    Constime.getDataSource().connector.connect(function (err, db) {

      var collection = db.collection('consTime');
      var cursor = collection.aggregate([
        {
          $match: {
            "startDate": {
              $gte: tempFrom,
              $lt: tempTo
            },
            "open": true,
            "consId": ObjectId(consId)
          }
        },
        {
          $project: {
            'lts': {
              '$add': ['$startDate', timezone * 3600 * 1000]
            },
            "open": 1,
            "consId": 1
          }
        },
        {
          $group: {
            _id: {
              day: {
                $dayOfMonth: "$lts"
              },
              month: {
                $month: "$lts"
              },
              year: {
                $year: "$lts"
              }
            },
            count: {
              $sum: 1
            }
          }
        }
      ])
      cursor.get(function (err, data) {
        cb(null, data)
      })

    })
  }


  Constime.fetchApClientNo = function (num, cb) {
    var client = app.models.client;
    client.find({
      where: {
        clientNumber: num
      }
    }, function (err, res) {
      if (err) return cb(err);
      if (_.isEmpty(res)) return cb(new Error("client not found"));
      Constime.find({
        where: {
          clientId: res[0].id
        }
      }, function (err, res) {
        if (err) return cb(err);
        if (_.isEmpty(res)) return cb("the client does not have an appointment");
        return cb(null, res);
      });
    });
  }

  Constime.remoteMethod('fetchApClientNo', {
    accepts: [{
      arg: 'clientNo',
      type: 'number'
    }],
    returns: {
      arg: 'fetchApClientNo',
      type: 'object'
    },
    http: {
      path: '/fetchApClientNo',
      verb: 'get'
    }
  });

  Constime.deleteSlots = function (sDate, eDate, consId, cb) {
    Constime.destroyAll({
      startDate: {
        gte: sDate
      },
      endDate: {
        lte: eDate
      },
      consId: consId
    }, function (err, res) {
      if (err) return cb(err);
      cb(null, res);
    });
  }
  Constime.remoteMethod('deleteSlots', {
    accepts: [{
        arg: 'startDate',
        type: 'date'
      },
      {
        arg: 'endDate',
        type: 'date'
      },
      {
        arg: 'consId',
        type: 'string'
      }
    ],
    returns: {
      arg: 'deleteSlots',
      type: 'object'
    },
    http: {
      path: '/deleteSlots',
      verb: 'delete'
    }
  });

  Constime.remoteMethod('getCloserCons', {
    accepts: [{
      arg: 'consId',
      require: true,
      type: 'string'
    }],
    returns: {
      arg: 'CloserCons',
      type: 'object'
    },
    http: {
      path: '/getCloserCons',
      verb: 'get'
    }
  });

  Constime.remoteMethod('getConsInMonth', {
    accepts: [{
        arg: 'startDate',
        require: true,
        type: 'date'
      },
      {
        arg: 'timezone',
        require: true,
        type: 'number'
      },
      {
        arg: 'consId',
        require: true,
        type: 'string'
      }
    ],
    returns: {
      arg: 'getConsInMonth',
      type: 'object'
    },
    http: {
      path: '/getConsInMonth',
      verb: 'get'
    }
  });

};
