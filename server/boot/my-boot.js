module.exports = function (app) {
  var User = app.models.staffuser;
  var Role = app.models.Role;
  var RoleMapping = app.models.RoleMapping;
  var _ = require('lodash');

  var counter= app.models.counters;
  counter.create({
    value: 0,
    collection: "client"
  }, function (err ,res){
    if (err) throw err;
  });

  Role.create({
    name: 'manager'
  }, function (err, role) {
    if (err) throw err;

    console.log('Created role:', role);
  });
  Role.create({
    name: 'secretary'
  }, function (err, role) {
    if (err) throw err;

    console.log('Created role:', role);
  });

  Role.create({
    name: 'consultant'
  }, function (err, role) {
    if (err) throw err;

    console.log('Created role:', role);
  });

  Role.create({
    name: 'adminstrator'
  }, function (err, role) {
    if (err) throw err;

    console.log('Created role:', role);
  });

  Role.create({
    name: 'formEdit'
  }, function (err, role) {
    if (err) throw err;

    console.log('Created role:', role);
  });

  Role.create({
    name: 'appSelect'
  }, function (err, role) {
    if (err) throw err;

    console.log('Created role:', role);
  });

  var managers = [{ username: 'manager', email: 'manager@foo.com', password: 'foo', emailVerified: true }];
  User.findOne({ where: { email: managers[0].email } }, function (err, manager) {
    if (err) throw err;

    if (_.isEmpty(manager)) {
      User.create(managers, function (err, users) {
        if (err) throw err;
        console.log('Created users:', users);
        User.addRole(users[0].id, 1, console.log);
      })
    }
    else {
      User.addRole(manager.id, 1, console.log);
    }

  });

};