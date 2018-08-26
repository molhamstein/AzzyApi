'use strict';
var _ = require('lodash');
let app = require('../../server/server.js');
var Role = app.models.Role;
var RoleMapping = app.models.RoleMapping;
var ACL = app.models.ACL;

module.exports = function(client) {

    client.observe('before save', function (ctx, next) {

        var app = ctx.Model.app;

        //Apply this hooks for save operation only..
        if(ctx.isNewInstance){
            //suppose my datasource name is mongodb
            var mongoDb = app.dataSources.mongoDS;
            var mongoConnector = app.dataSources.mongoDS.connector;
            mongoConnector.collection("counters").findAndModify({collection: 'client'}, [['_id','asc']], {$inc: { value: 1 }}, {new: true}, function(err, sequence) {
                if(err) {
                    throw err;
                } else {
                    // Do what I need to do with new incremented value sequence.value
                    //Save the tweet id with autoincrement..
                    ctx.instance.clientNumber = sequence.value.value;

                    next();

                } //else
            });
        } //ctx.isNewInstance
        else{
            next(); 
        }
    }); //Observe before save..


};
