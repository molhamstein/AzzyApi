'use strict';

let app = require('../../server/server.js');
var _ = require('lodash');
var moment = require('moment');
moment().format();

module.exports = function (Constime) {

    Constime.readCalander = function (dateStart, dateEnd, ids, cb) {
        if (_.isEmpty(ids)) {
            var stf = app.models.staffuser;
            stf.find([{
                include: {
                    relation: 'slots',
                    scope: {
                        include: {
                            relation: 'forms',
                            scope: {
                                fields: {id: true, clientId: true, nameEnglish: true, surnameEnglish: true}
                            }
                        },
                        where: { startDate: { gte: dateStart }, endDate: { lte: dateEnd } },
                        order: 'startDate'
                    }
                },
                where: { type: "consultant" }
            }], cb);
        }
        else {
            var stf = app.models.staffuser;
            stf.find({
                include: {
                    relation: 'slots',
                    scope: {
                        where: { startDate: { gte: dateStart }, endDate: { lte: dateEnd } },
                        order: 'startDate'
                    }
                },
                where: { id: { inq: ids }, type: "consultant" }
            }, cb);
        }

    };

    Constime.remoteMethod('readCalander', {
        accepts: [
            { arg: 'dateStart', type: 'date' },
            { arg: 'dateEnd', type: 'date' },
            { arg: 'ids', type: 'array' },
        ],
        http: {
            path: '/readCalander',
            verb: 'get'
        },
        returns: { arg: 'readCalander', type: 'array' }
    });

    Constime.beforeRemote('create', function (ctx, ctime, next) {
        var s, e;
        s = new Date(ctx.args.data.startDate);
        e = new Date(ctx.args.data.endDate);
       // console.log(e);
        if (s.getMinutes() < 15) {
            s.setMinutes(0);
        }
        else if (s.getMinutes() >= 15 && s.getMinutes() < 45) {
            s.setMinutes(30);
        }
        else {
            s.setMinutes(0);
            s = moment(s).add(1, 'h').toDate();
        }

        if (e.getMinutes() < 15) {
            e.setMinutes(0);
        }
        else if (e.getMinutes() >= 15 && e.getMinutes() < 45) {
            e.setMinutes(30);
        }
        else {
            e.setMinutes(0);
            e = moment(e).add(1, 'h').toDate();
        }
        s.setSeconds(0);
        s.setMilliseconds(0);
        e.setSeconds(0);
        e.setMilliseconds(0);
        //console.log(s);
        //console.log(e);
        
        ctx.args.data.startDate = s;
        ctx.args.data.endDate = e;
        
        var id = ctx.args.data.consId;
        Constime.destroyAll({ startDate: { gte: s }, endDate: { lte: e }, consId: id }, function (err, res) {
            if (err) throw err;
        });
        next();
    });

    Constime.afterRemote('create', function (ctx, ctime, next) {
        Constime.destroyById(ctime.id, function (err, ob) {
            if (err) throw err;
            var d = moment(ctime.startDate).utcOffset(0);
            console.log(d);
            var d1 = moment(d).add(30, 'm');
            var arr = new Array();
            while (d1 < moment(ctime.endDate).utcOffset(0)) {
                if (d.hour() == 20) {
                    var tmp = d;
                    tmp.add(1, 'd');
                    tmp.hour(7);
                    tmp.minute(0);
                    d = tmp;
                }
                else if (d.hour() < 7) {
                    d.hour(7);
                    d.minute(0);
                }
                d1 = moment(d).add(30, 'm');
                console.log(d);
                
                if (d1 < moment(ctime.endDate).utcOffset(0)) {
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
            });
        });


        next();

    })

    Constime.writeCalander = function () { };
    Constime.ocCalander = function () { };

    Constime.fetchApAct = function (token, cb) {
        var act = app.models.AccessToken;
        act.findById(token, function (err, res) {
            if (err) return cb(err);
            if (_.isEmpty(res)) return cb(new Error("token not found"));

            Constime.find({ where: { clientId: res[0].userId } }, function (err, res) {
                if (err) return cb(err);
                if (_.isEmpty(res)) return cb("the client does not have an appointment");
                return cb(null, res);
            })
        });
    }

    Constime.remoteMethod('fetchApAct', {
        accepts: [
            { arg: 'token', type: 'any' }
        ],
        returns: { arg: 'fetchApAct', type: 'object' },
        http: { path: '/fetchApAct', verb: 'get' }
    });


    Constime.fetchApClientNo = function (num, cb) {
        var client = app.models.client;
        client.find({ where: { clientNumber: num } }, function (err, res) {
            if (err) return cb(err);
            if (_.isEmpty(res)) return cb(new Error("client not found"));
            Constime.find({ where: { clientId: res[0].id } }, function (err, res) {
                if (err) return cb(err);
                if (_.isEmpty(res)) return cb("the client does not have an appointment");
                return cb(null, res);
            });
        });
    }

    Constime.remoteMethod('fetchApClientNo', {
        accepts: [
            { arg: 'clientNo', type: 'number' }
        ],
        returns: { arg: 'fetchApClientNo', type: 'object' },
        http: { path: '/fetchApClientNo', verb: 'get' }
    });

    Constime.deleteSlots = function(sDate, eDate, consId, cb){
        Constime.destroyAll({ startDate: { gte: sDate }, endDate: { lte: eDate }, consId: consId }, function (err, res) {
            if (err) return cb(err);
            cb(null , res);
        });
    }
    Constime.remoteMethod('deleteSlots', {
        accepts: [
            { arg: 'startDate', type: 'date' },
            { arg: 'endDate', type: 'date' },
            { arg: 'consId', type: 'string' }
        ],
        returns: { arg: 'deleteSlots', type: 'object' },
        http: { path: '/deleteSlots', verb: 'delete' }
    });

};
