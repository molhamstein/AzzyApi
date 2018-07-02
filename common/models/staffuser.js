'use strict';
var _ = require('lodash');
let app = require('../../server/server.js');
var Role = app.models.Role;
var RoleMapping = app.models.RoleMapping;
var ACL = app.models.ACL;

module.exports = function (Staffuser) {
    Staffuser.userDef = function () { };
    /*Staffuser.afterRemote('create', function (ctx, user, next) {
        let Role = app.models.Role;
        let RoleMapping = app.models.RoleMapping;
        Role.find({where: {name: user.Type}}
        , function (err, role) {
            if (err) throw err;

            console.log('finded role:', role);

            //make manager
            RoleMapping.create({
                principalType: "USER",
                principalId: user.id,
                roleId: role.id      
            }, function (err, principal) {
                if (err) throw err;

                console.log('Created principal:', principal);
            });

        });
        next();
    });
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

        Staffuser.findOne({ where: { id: userId } }, function (err, user) { // Find the user...
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

    Staffuser.remoteMethod(
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
  Staffuser.removeRole = function(userId, roleId, cb) {
    var error;
    var Role = app.models.Role;
    var RoleMapping = app.models.RoleMapping;

    Staffuser.findOne({ where: { id: userId } }, function(err, user) { // Find the user...
      if (err) cb(err); 

      if (!_.isEmpty(user)) {
        Role.findOne({ where: { id: roleId } }, function(err, role) { // Find the role...
          if (err) cb(err); 

          if (!_.isEmpty(role)) {
            RoleMapping.findOne({ where: { principalId: userId, roleId: roleId } }, function(err, roleMapping) { // Find the role mapping...
              if (err) cb(err); 

              if (!_.isEmpty(roleMapping)) {
                roleMapping.destroy(function(err) {
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

  Staffuser.remoteMethod(
    'removeRole',
    {
      accepts: [
        {arg: 'userId', type: 'string'},
        {arg: 'roleId', type: 'string'}
      ],
      http: {
        path: '/remove-role',
        verb: 'post'
      }
    }
  );
};


