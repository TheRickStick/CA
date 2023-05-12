var express = require('express');
var router = express.Router();
const { requiresAuth } = require('express-openid-connect');
const CyclicDB = require('@cyclic.sh/dynamodb');
const db = CyclicDB(process.env.CYCLIC_DB);
let participants = db.collection('participants');

// Get personal details of all active participants
router.get('/details', requiresAuth(), async function (req, res, next) {
  let list = await participants.list({ active: true });
  let personalDetails = list.map(participant => ({
    email: participant.email,
    firstname: participant.firstname,
    lastname: participant.lastname,
    active: participant.active,
  }));
  res.send(personalDetails);
});

// Get personal details of all deleted participants
router.get('/details/deleted', requiresAuth(), async function (req, res, next) {
  let list = await participants.list({ active: false });
  let personalDetails = list.map(participant => ({
    email: participant.email,
    firstname: participant.firstname,
    lastname: participant.lastname,
    active: participant.active,
  }));
  res.send(personalDetails);
});

// Get work details of the specified participant (not deleted)
router.get('/work/:email', requiresAuth(), async function (req, res, next) {
  let participant = await participants.get(req.params.email);
  if (!participant || !participant.active) {
    return res.status(404).json({ error: 'Participant not found or deleted' });
  }
  res.send(participant.work);
});

// Get home details of the specified participant (not deleted)
router.get('/home/:email', requiresAuth(), async function (req, res, next) {
  let participant = await participants.get(req.params.email);
  if (!participant || !participant.active) {
    return res.status(404).json({ error: 'Participant not found or deleted' });
  }
  res.send(participant.home);
});

module.exports = router;
