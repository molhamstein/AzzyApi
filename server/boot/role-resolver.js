module.exports = function (app) {
    var Role = app.models.Role;

    Role.registerResolver('formEditer', function (role, context, cb) {

        if (context.modelName !== 'forms') {
            return process.nextTick(() => cb(null, false));
        }

        var userId = context.accessToken.userId;
        if (!userId) {

            return process.nextTick(() => cb(null, false));
        }

        context.model.findById(context.modelId, function (err, form) {
            
            if (err) return cb(err);
            
            if (!form) return cb(new Error("form not found"));

            context.model.count({ id: form.id, clientId: userId }, function (err, count) {
                if (err) return cb(err);

                if (count > 0) {
                    return cb(null, true);
                }
                else {
                    
                    return cb(null, false);
                }
            });

        });
    });

    Role.registerResolver('appSelecter', function (role, context, cb) {
        if (context.modelName !== 'forms') {
            return process.nextTick(() => cb(null, false));
        }
        var userId = context.accessToken.userId;
        if (!userId) {
            return process.nextTick(() => cb(null, false));
        }

        context.model.findById(context.modelId, function (err, form) {
            if (err) return cb(err);

            if (!form) return cb(new Error("form not found"));

            context.model.count({ id: form.id, clientId: userId }, function (err, count) {
                if (err) return cb(err);
                if (count > 0) {
                    var con = app.models.consTime;
                    var apId = context.remotingContext.args.apId;
                    con.count({ id: apId, consId: form.consId }, function (err, count) {
                        if (err) cb(err);
                        if (count > 0) {
                            return cb(null, true);
                        }
                        else {
                            return cb(null, false);
                        }
                    });
                }

                else {
                    return cb(null, false);
                }
            });

        });
    });

    Role.registerResolver('appCanceler', function (role, context, cb) {

        if (context.modelName !== 'forms') {
            
            return process.nextTick(() => cb(null, false));
        }

        var userId = context.accessToken.userId;
        if (!userId) {
            
            return process.nextTick(() => cb(null, false));
        }

        context.model.findById(context.modelId, function (err, form) {
            
            if (err) return cb(err);
            
            if (!form) return cb(new Error("form not found"));

            context.model.count({ id: form.id, clientId: userId }, function (err, count) {
                if (err) return cb(err);

                if (count > 0) {
                    return cb(null, true);
                }
                else {
                    
                    return cb(null, false);
                }
            });

        });
    });

};
