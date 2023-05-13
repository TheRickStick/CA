var express = require('express');
var router = express.Router();
const fs = require('fs');
var path = require('path');
const AWS = require("aws-sdk");
const s3 = new AWS.S3();
//const { requiresAuth } = require('express-openid-connect');
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
router.get('/',  async function (req, res, next) {
  let list = await participants.list({ includeData: true });
  
  const formattedParticipants = list.results.map(item => {
    return {
      email: item.key,
      firstname: item.data.firstname,
      lastname: item.data.lastname,
      dob: item.data.dob,
      active: item.data.active,
      work: item.data.work,
      home: item.data.home,
    };
  });

  res.send(formattedParticipants);
});




// Get participant details by email
router.get('/:email',  async function (req, res, next) {
  let item = await participants.get(req.params.email);
  if (!item) {
    return res.status(404).json({ error: 'Participant not found' });
  }
  res.send(item);
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
  await participants.update(req.params.email, { active: false });
  res.end();
});

module.exports = router;
