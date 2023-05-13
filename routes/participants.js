var express = require('express');
var router = express.Router();
const fs = require('fs');
var path = require('path');
const AWS = require("aws-sdk");
const s3 = new AWS.S3();
const CyclicDB = require('@cyclic.sh/dynamodb')
const db = CyclicDB(process.env.CYCLIC_DB)
let participants = db.collection('participants')


const { check, validationResult } = require('express-validator');

const validateParticipant = [
  check('email').isEmail().withMessage('Invalid email format'),
  check('firstname').notEmpty().withMessage('First name is required'),
  check('lastname').notEmpty().withMessage('Last name is required'),
  check('dob').isISO8601().withMessage('Invalid date format (YYYY-MM-DD)'),
  check('active').isBoolean().withMessage('Active must be a boolean value'),
  check('work').exists().withMessage('Work fragment is required'),
  check('home').exists().withMessage('Home fragment is required'),
];

// List all participants
router.get('/details',  async function (req, res, next) {
  let list = await participants.list();
  
  const getEmails = list.results.map(item => item.key);
  
  const getParticipantsData = async () => {
    const participantsData = [];

    for (const email of getEmails) {
      const participantData = await participants.get(email);
      participantsData.push({
        email,
        ...participantData,
      });
    }

    return participantsData;
  };

  const formattedParticipants = await getParticipantsData();
  
  res.send(formattedParticipants);
});

// Get participant details by email
router.get('/details/:email', async function (req, res, next) {
  let email = req.params.email;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  let item = await participants.get(email);
  if (!item || item.active !== true) {
    return res.status(404).json({ error: 'Participant not found or deleted' });
  }
  res.send({
    firstname: item.firstname,
    lastname: item.lastname,
    active: item.active
  });
});

// Add a new participant
router.post('/add', validateParticipant, async function (req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    email,
    firstname,
    lastname,
    dob,
    active,
    work,
    home,
  } = req.body;

  await participants.set(email, {
    firstname,
    lastname,
    dob,
    active,
    work,
    home,
  });

  res.end();
});

// Update a participant by email
router.put('/:email', validateParticipant, async function (req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const {
    email,
    firstname,
    lastname,
    dob,
    active,
    work,
    home,
  } = req.body;

  await participants.set(email, {
    firstname,
    lastname,
    dob,
    active,
    work,
    home,
  });

  res.end();
});

// Soft-delete a participant by email
router.delete('/:email',  async function (req, res, next) {
  let participant = await participants.get(req.params.email);
  if (!participant) {
    return res.status(404).json({ error: 'Participant not found' });
  }
  
  await participants.set(req.params.email, { ...participant, active: false });
  res.end();
});

// Get personal details of all deleted participants
router.get('/details/deleted',  async function (req, res, next) {
  let list = await participants.list({ active: false });
  let personalDetails = list.map(participant => ({
    email: participant.email,
    firstname: participant.firstname,
    lastname: participant.lastname,
    active: participant.active,
  }));
  res.send(personalDetails);
});

router.get('/work/:email',  async function (req, res, next) {
  console.log('Requested email:', req.params.email);
  
  let participant = await participants.get(req.params.email);
  console.log('Participant:', participant);
  
  if (!participant || !participant.active) {
    return res.status(404).json({ error: 'Participant not found or deleted' });
  }
  res.send(participant.work);
});

// Get home details of the specified participant (not deleted)
router.get('/home/:email',  async function (req, res, next) {
  let participant = await participants.get(req.params.email);
  if (!participant || !participant.active) {
    return res.status(404).json({ error: 'Participant not found or deleted' });
  }
  res.send(participant.home);
});


module.exports = router;
