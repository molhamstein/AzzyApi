'use strict';

let app = require('../../server/server.js');

module.exports = function (Fee) {
    Fee.beforeRemote('create', function (ctx, fee, next) {
        var User = app.models.staffuser;
        var Form = app.models.forms;
        if (ctx.args.options.authorizedRoles.consultant) {
            Form.findById(ctx.args.data.formId, function (err, form) {
                if (err) return next(err);
                var f = "" + form.consId;
                var c = "" + ctx.args.options.accessToken.userId
                if (f != c) {
                    var error = new Error("Authorization Required");
                    error.status = 401;
                    error.code = 'AUTHORIZATION_REQUIRED';
                    return next(error);
                }
                next();
            })
        }
        next();
    });

    Fee.beforeRemote('update', function (ctx, fee, next) {
        var User = app.models.staffuser;
        var Form = app.models.forms;
        if (ctx.args.options.authorizedRoles.consultant) {
            Form.findById(ctx.args.data.formId, function (err, form) {
                if (err) return next(err);
                var f = "" + form.consId;
                var c = "" + ctx.args.options.accessToken.userId
                if (f != c) {
                    var error = new Error("Authorization Required");
                    error.status = 401;
                    error.code = 'AUTHORIZATION_REQUIRED';
                    return next(error);
                }
                next();
            })
        }
        next();
    });

    Fee.beforeRemote('findById', function (ctx, fee, next) {
        var User = app.models.staffuser;
        var Form = app.models.forms;
        if (ctx.args.options.authorizedRoles.consultant) {
            Form.findById(ctx.args.data.formId, function (err, form) {
                if (err) return next(err);
                var f = "" + form.consId;
                var c = "" + ctx.args.options.accessToken.userId
                if (f != c) {
                    var error = new Error("Authorization Required");
                    error.status = 401;
                    error.code = 'AUTHORIZATION_REQUIRED';
                    return next(error);
                }
                next();
            })
        }
        next();
    });
};
