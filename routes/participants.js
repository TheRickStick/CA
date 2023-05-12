var express = require('express');
var router = express.Router();
const fs = require('fs');
var path = require('path');
const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const { requiresAuth } = require('express-openid-connect');
const CyclicDB = require('@cyclic.sh/dynamodb')
const db = CyclicDB(process.env.CYCLIC_DB)
let participants = db.collection('participants')



    router.get('/', requiresAuth(), async function(req, res, next) {
        let list = await participants.list();
        res.send(list);
      });
      
      router.get('/:key',requiresAuth(), async function(req, res, next) {
        let item = await participants.get(req.params.key);
        res.send(item);
      });
      
      router.post('/', requiresAuth(), validateParticipant, async function(req, res, next) {
        const {email, firstName, lastName, age} = req.body;
        await participants.set(email, {
          firstName: firstName,
          secondName: lastName,
          age: age
        })
        res.end();
      });
      
      router.put('/', requiresAuth(), validateParticipant, async function(req, res, next) {
        const {email, firstName, lastName, age} = req.body;
        await participants.set(email, {
          firstName: firstName,
          secondName: lastName,
          age: age
        })
        res.end();
      });
      
      router.delete('/:key', requiresAuth(), async function(req, res, next) {
        await participants.delete(req.params.key);
        res.end();
      });
  
  module.exports = router;