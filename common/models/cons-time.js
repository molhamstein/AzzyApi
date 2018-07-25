'use strict';

let app = require('../../server/server.js');
var _ = require('lodash');
var moment = require('moment');
moment().format();

module.exports = function (Constime) {

    Constime.readCalander = function (dateStart, dateEnd, ids, cb) {

        Constime.find({
            where: { startDate: { gte: dateStart }, endDate: { lte: dateEnd }, consID: { inq: ids }, open: true },
            order: 'startDate'
        }, cb);

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

    function dst(s,e,id) {
        Constime.destroyAll({startDate: { gte: s }, endDate: { lte: e }, consID: id });
    }

    function updt(s,e,id){
        Constime.updateAll({ startDate: { gte: s , lt: e }, endDate: { gt: e }, consID: id },
            { startDate: e });

        Constime.updateAll({ startDate: { lt: s }, endDate: { lte: e , gt: s }, consID: id },
            { endDate: s });

    }
    Constime.beforeRemote('create', function (ctx, ctime, next) {
        var s, e;
        s = new Date(ctx.args.data.startDate);
        e = new Date(ctx.args.data.endDate);
        
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

        ctx.args.data.startDate = s;
        ctx.args.data.endDate = e;
        var id = ctx.args.data.consID;
        dst(s,e,id);
        updt(s,e,id);
        next();
    })
    function cc(elm) {
        Constime.create(elm, function (err, ob) {
            if (err) throw err;
        });
    }
    
    Constime.afterRemote('create', function (ctx, ctime, next) {

        var d = ctime.startDate;
        var d1 = moment(d).add(30, 'm').toDate();

        while (d1 <= ctime.endDate) {

            if (d.getHours() == 23) {


                var tmp = moment(d);
                tmp.add(1, 'd');

                tmp.hour(10);
                tmp.minute(0);
                d = tmp.toDate();




            }
            else if (d.getHours() < 10) {
                d.setHours(10);
                d.setMinutes(0);
            }
            d1 = moment(d).add(30, 'm').toDate();
            var elm = {
                startDate: d,
                endDate: d1,
                location: ctime.location,
                open: ctime.open,
                consID: ctime.consID,
                clientID: ctime.clientID

            }
            if (d1<=ctime.endDate)
                cc(elm);
            d = d1;
        }
        Constime.destroyById(ctime.id, function (err, ob) {
            if (err) throw err;
        });
        next();

    })

    Constime.writeCalander = function () { };
    Constime.ocCalander = function () { };



};
