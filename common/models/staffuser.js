'use strict';
var _ = require('lodash');
let app = require('../../server/server.js');
var Role = app.models.Role;
var RoleMapping = app.models.RoleMapping;
var ACL = app.models.ACL;
var g = require('strong-globalize')();

module.exports = function (Staffuser) {
  Staffuser.userDef = function () {};
  Staffuser.validatesInclusionOf('type', {
    in: ['manager', 'consultant', 'adminstrator', 'secretary', 'reception'],
    message: 'not valid type'
  });
  Staffuser.validatesInclusionOf('status', {
    in: ['active', 'deactive'],
    message: 'not valid status',
    allowBlank: true
  });

  /*Staffuser.setPassword= function (userId , oldPassword , newPassword, cb){
      Staffuser.findById(userId , function(err , res){
          if (err) return cb(err);
          if (!res)
              return cb(new Error('user not found'));
          if (res.password === Staffuser.hashPassword(oldPassword)){
              Staffuser.updateAll({id:userId}, {password: newPassword}, function(err, info){
                  if (err) return cb (err);
                  cb(null,res);
              });
          }
          else {
              console.log(res.password)
              console.log(Staffuser.hashPassword(oldPassword))
              
              return cb(new Error('oldPassword does not match'));
          }
      });
      this.changePassword(userId , oldPassword, newPassword, function(err){
          if (err) return cb (err);
          cb (null, "done");
      });
  }
  Staffuser.remoteMethod(
      'setPassword',
      {
          accepts: [
              { arg: 'id', type: 'string',required: true, http: { source: 'path' } },
              { arg: 'oldPassword', type: 'string' },
              { arg: 'newPassword', type: 'string' }
              
          ],
          http: {
              path: '/setPassword/:id',
              verb: 'put'
          },
          returns: { type: 'object', root: true }
      }
  );
  */


  /**
   * Add a user to the given role.
   * @param {string} userId
   * @param {string} roleId
   * @param {Function} cb
   */
  Staffuser.addRole = function (userId, roleId, cb) {
    var error;
    var Role = app.models.Role;
    var RoleMapping = app.models.RoleMapping;

    Staffuser.findOne({
      where: {
        id: userId
      }
    }, function (err, user) { // Find the user...
      if (err) return cb(err);

      if (!_.isEmpty(user)) {
        Role.findOne({
          where: {
            id: roleId
          }
        }, function (err, role) { // Find the role...
          if (err) return cb(err);

          if (!_.isEmpty(role)) {
            RoleMapping.findOne({
              where: {
                principalId: userId,
                roleId: roleId
              }
            }, function (err, roleMapping) { // Find the role mapping...
              if (err) return cb(err);

              if (_.isEmpty(roleMapping)) { // Only create if one doesn't exist to avoid duplicates
                RoleMapping.destroyAll({
                  principalId: userId
                }, function (err, res) {
                  if (err) return cb(err);
                  role.principals.create({
                    principalType: RoleMapping.USER,
                    principalId: user.id
                  }, function (err, principal) {
                    if (err) return cb(err);
                    Staffuser.updateAll({
                      id: user.id
                    }, {
                      type: role.name
                    }, function (err, info) {
                      if (err) return cb(err);
                      return cb(null, role); // Success, return role object
                    })
                  });
                });

              } else {
                return cb(null, role); // Success, return role object
              }
            });

          } else {
            error = new Error('Role.' + roleId + ' was not found.');
            error.status = 404;
            return cb(error); // Error
          }
        });
      } else {
        error = new Error('User.' + userId + ' was not found.');
        error.status = 404;
        return cb(error); // Error
      }
    });
  };

  Staffuser.remoteMethod(
    'addRole', {
      accepts: [{
          arg: 'userId',
          type: 'string'
        },
        {
          arg: 'roleId',
          type: 'string'
        }
      ],
      http: {
        path: '/add-role',
        verb: 'post'
      },
      returns: {
        type: 'object',
        root: true
      }
    }
  );


  /**
   * Remove a user from the given role.
   * @param {string} userId
   * @param {string} roleId
   * @param {Function} cb
   */
  Staffuser.removeRole = function (userId, roleId, cb) {
    var error;
    var Role = app.models.Role;
    var RoleMapping = app.models.RoleMapping;

    Staffuser.findOne({
      where: {
        id: userId
      }
    }, function (err, user) { // Find the user...
      if (err) return cb(err);

      if (!_.isEmpty(user)) {
        Role.findOne({
          where: {
            id: roleId
          }
        }, function (err, role) { // Find the role...
          if (err) return cb(err);

          if (!_.isEmpty(role)) {
            RoleMapping.findOne({
              where: {
                principalId: userId,
                roleId: roleId
              }
            }, function (err, roleMapping) { // Find the role mapping...
              if (err) return cb(err);

              if (!_.isEmpty(roleMapping)) {
                roleMapping.destroy(function (err) {
                  if (err) return cb(err);

                  cb(null, role); // Success, return role object
                });
              } else {
                cb(null, role); // Success, return role object
              }
            });
          } else {
            error = new Error('Role.' + roleId + ' was not found.');
            error.status = 404;
            return cb(error);
          }
        });
      } else {
        error = new Error('User.' + userId + ' was not found.');
        error.status = 404;
        return cb(error);
      }
    });
  };

  Staffuser.remoteMethod(
    'removeRole', {
      accepts: [{
          arg: 'userId',
          type: 'string'
        },
        {
          arg: 'roleId',
          type: 'string'
        }
      ],
      http: {
        path: '/remove-role',
        verb: 'post'
      }
    }
  );
  Staffuser.afterRemote('create', function (ctx, user, next) {
    var Role = app.models.Role;
    Role.find({
      where: {
        name: user.type
      }
    }, function (err, res) {
      if (err) return next(err);
      if (!_.isEmpty(res)) {
        Staffuser.addRole(user.id, res[0].id, function (er, r) {
          if (er) return next(er);
          Staffuser.updateAll({
            id: user.id
          }, {
            emailVerified: true
          }, function (err, info) {
            if (err) return next(err);
            next();
          })
        });
      }
    });

  });

  Staffuser.afterRemote('update', function (ctx, user, next) {
    var Role = app.models.Role;
    Role.find({
      where: {
        name: user.type
      }
    }, function (err, res) {
      if (err) return next(err);
      if (!_.isEmpty(res)) {
        Staffuser.addRole(user.id, res[0].id, function (er, r) {
          if (er) return next(er);
          Staffuser.updateAll({
            id: user.id
          }, {
            emailVerified: true
          }, function (err, info) {
            if (err) return next(err);
            next();
          })
        });
      }
    });

  })

  Staffuser.login = function (credentials, include, fn) {
    var self = Staffuser;
    if (typeof include === 'function') {
      fn = include;
      include = undefined;
    }

    fn = fn || utils.createPromiseCallback();

    include = (include || '');
    if (Array.isArray(include)) {
      include = include.map(function (val) {
        return val.toLowerCase();
      });
    } else {
      include = include.toLowerCase();
    }


    var query = {
      email: credentials.email
    }

    if (!query.email) {
      var err2 = new Error(g.f('{{email}} is required'));
      err2.statusCode = 400;
      err2.code = 'EMAIL_REQUIRED';
      fn(err2);
      return fn.promise;
    }

    self.findOne({
      where: query
    }, function (err, user) {
      var defaultError = new Error(g.f('login failed'));
      defaultError.statusCode = 401;
      defaultError.code = 'LOGIN_FAILED';

      function tokenHandler(err, token) {
        if (err) return fn(err);
        if (Array.isArray(include) ? include.indexOf('user') !== -1 : include === 'user') {
          // NOTE(bajtos) We can't set token.user here:
          //  1. token.user already exists, it's a function injected by
          //     "AccessToken belongsTo User" relation
          //  2. ModelBaseClass.toJSON() ignores own properties, thus
          //     the value won't be included in the HTTP response
          // See also loopback#161 and loopback#162

          token.__data.user = user;
        }
        afterLogin({}, user, function (err) {
          if (err)
            fn(err, null)
          else
            fn(err, token);
        })
      }

      if (err) {
        debug('An error is reported from User.findOne: %j', err);
        fn(defaultError);
      } else if (user) {
        if (user.status != 'active') {
          fn(errors.account.notActive());
        }
        user.hasPassword(credentials.password, function (err, isMatch) {
          if (err) {
            debug('An error is reported from User.hasPassword: %j', err);
            fn(defaultError);
          } else if (isMatch) {

            if (user.createAccessToken.length === 2) {
              user.createAccessToken(credentials.ttl, tokenHandler);
            } else {
              user.createAccessToken(credentials.ttl, credentials, tokenHandler);
            }
          } else {
            debug('The password is invalid for user %s', query.email || query.username);
            fn(defaultError);
          }
        });
      } else {
        debug('No matching record is found for user %s', query.email || query.username);
        fn(defaultError);
      }
    });
    return fn.promise;
  }

  function afterLogin(context, client, next) {
    // console.log(client);
    // var clientM = app.models.client;
    var data = client;
    Staffuser.findOne({
      where: {
        id: client.id
      }
    }, function (err, user) {

      next();

    });

  };

  Staffuser.getConsultant = function (cb) {
    Staffuser.find({
      where: {
        type: "consultant"
      }
    }, cb);
  }
  Staffuser.remoteMethod('getConsultant', {
    returns: {
      arg: 'getConsultant',
      type: 'array'
    },
    http: {
      path: '/getConsultant',
      verb: 'get'
    }
  });

  Staffuser.remoteMethod('resetPassword', {
    accepts: [{
        arg: 'userId',
        type: 'string'
      },
      {
        arg: 'newPassword',
        type: 'string'
      }
    ],
    returns: {
      type: 'number'
    },
    http: {
      path: '/resetPassword',
      verb: 'post'
    }
  });

  Staffuser.resetPassword = function (userId, newPassword, callback) {
    var code = 200;
    Staffuser.findById(userId, function (err, userData) {
      console.log(userData);
      if (err)
        return callback(err, null)
      //   if (userData == null)
      //     return callback(errors.user.userNotFound());
      userData.updateAttributes({
        'password': Staffuser.hashPassword(newPassword),
      }, function (err) {
        if (err) {
          return callback(err, null)
        }
        return callback(null, code)
      })
    })
  };

};
