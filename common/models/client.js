'use strict';
var _ = require('lodash');
let app = require('../../server/server.js');
var Role = app.models.Role;
var RoleMapping = app.models.RoleMapping;
var ACL = app.models.ACL;

module.exports = function (client) {

    client.observe('before save', function (ctx, next) {

        var app = ctx.Model.app;

        //Apply this hooks for save operation only..
        if (ctx.isNewInstance) {
            //suppose my datasource name is mongodb
            var mongoDb = app.dataSources.mongoDS;
            var mongoConnector = app.dataSources.mongoDS.connector;
            mongoConnector.collection("counters").findAndModify({ collection: 'client' }, [['_id', 'asc']], { $inc: { value: 1 } }, { new: true }, function (err, sequence) {
                if (err) {
                    throw err;
                } else {
                    // Do what I need to do with new incremented value sequence.value
                    //Save the tweet id with autoincrement..
                    ctx.instance.clientNumber = sequence.value.value;

                    next();

                } //else
            });
        } //ctx.isNewInstance
        else {
            next();
        }
    }); //Observe before save..


    /**
* Add a user to the given role.
* @param {string} userId
* @param {string} roleId
* @param {Function} cb
*/
    client.addRole = function (userId, roleId, cb) {
        var error;
        var Role = app.models.Role;
        var RoleMapping = app.models.RoleMapping;

        client.findOne({ where: { id: userId } }, function (err, user) { // Find the user...
            if (err) return cb(err);

            if (!_.isEmpty(user)) {
                Role.findOne({ where: { id: roleId } }, function (err, role) { // Find the role...
                    if (err) return cb(err);

                    if (!_.isEmpty(role)) {
                        RoleMapping.findOne({ where: { principalId: userId, roleId: roleId } }, function (err, roleMapping) { // Find the role mapping...
                            if (err) return cb(err);

                            if (_.isEmpty(roleMapping)) { // Only create if one doesn't exist to avoid duplicates
                                role.principals.create({
                                    principalType: RoleMapping.USER,
                                    principalId: user.id
                                }, function (err, principal) {
                                    if (err) return cb(err);

                                    return cb(null, role); // Success, return role object

                                });
                            } else {
                                return cb(null, role); // Success, return role object

                            }
                        });

                    } else {
                        error = new Error('Role.' + roleId + ' was not found.');
                        error.http_code = 404;
                        return cb(error); // Error
                    }
                });
            } else {
                error = new Error('User.' + userId + ' was not found.');
                error.http_code = 404;
                return cb(error); // Error
            }
        });
    };

    client.remoteMethod(
        'addRole',
        {
            accepts: [
                { arg: 'userId', type: 'string' },
                { arg: 'roleId', type: 'string' }
            ],
            http: {
                path: '/add-role',
                verb: 'post'
            },
            returns: { type: 'object', root: true }
        }
    );


    /**
    * Remove a user from the given role.
    * @param {string} userId
    * @param {string} roleId
    * @param {Function} cb
    */
   client.removeRole = function (userId, roleId, cb) {
        var error;
        var Role = app.models.Role;
        var RoleMapping = app.models.RoleMapping;

        client.findOne({ where: { id: userId } }, function (err, user) { // Find the user...
            if (err) cb(err);

            if (!_.isEmpty(user)) {
                Role.findOne({ where: { id: roleId } }, function (err, role) { // Find the role...
                    if (err) cb(err);

                    if (!_.isEmpty(role)) {
                        RoleMapping.findOne({ where: { principalId: userId, roleId: roleId } }, function (err, roleMapping) { // Find the role mapping...
                            if (err) cb(err);

                            if (!_.isEmpty(roleMapping)) {
                                roleMapping.destroy(function (err) {
                                    if (err) cb(err);

                                    cb(null, role); // Success, return role object
                                });
                            } else {
                                cb(null, role); // Success, return role object
                            }
                        });
                    } else {
                        error = new Error('Role.' + roleId + ' was not found.');
                        error.http_code = 404;
                        cb(error);
                    }
                });
            } else {
                error = new Error('User.' + userId + ' was not found.');
                error.http_code = 404;
                cb(error);
            }
        });
    };

    client.remoteMethod(
        'removeRole',
        {
            accepts: [
                { arg: 'userId', type: 'string' },
                { arg: 'roleId', type: 'string' }
            ],
            http: {
                path: '/remove-role',
                verb: 'post'
            }
        }
    );

};
