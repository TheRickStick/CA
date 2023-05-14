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
router.get('/',  async function (req, res, next) {
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

//List all active participants
router.get('/details', async function (req, res, next) {
    let list = await participants.list();
  
    console.log('All Participants:', list.results);
  
    const getEmails = list.results.map(item => item.key);
  
    const getParticipantsData = async () => {
      const participantsData = [];
  
      for (const email of getEmails) {
        const participantData = await participants.get(email);
        participantsData.push({
          email,
          ...participantData.props,
        });
      }
  
      return participantsData;
    };
  
    const allParticipants = await getParticipantsData();
    const activeParticipants = allParticipants.filter(participant => {
      const { active } = participant;
      return active === true || active === 'true' || active === 1;
    });
  
    console.log('Active Participants:', activeParticipants);
  
    res.send(activeParticipants);
  });


// Get participant details by email
router.get('/details/:email', async function (req, res, next) {
  let email = req.params.email;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  let item = await participants.get(email);
  if (!item || !isParticipantActive(item.props.active)) {
    return res.status(404).json({ error: 'Participant not found or deleted' });
  }

  const { firstname, lastname, active } = item.props;
  res.send({
    firstname,
    lastname,
    active
  });
});

function isParticipantActive(active) {
  return active === true || active === 'true' || active === 1;
}


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
router.get('/deleted', async function (req, res, next) {
  let list = await participants.list();

  console.log('All Participants:', list.results);

  const getEmails = list.results.map(item => item.key);

  const getParticipantsData = async () => {
    const participantsData = [];

    for (const email of getEmails) {
      const participantData = await participants.get(email);
      participantsData.push({
        email,
        ...participantData.props,
      });
    }

    return participantsData;
  };

  const allParticipants = await getParticipantsData();
  const deletedParticipants = allParticipants.filter(participant => {
    const { active } = participant;
    return active === false || active === 'false' || active === 0;
  });

  console.log('Deleted Participants:', deletedParticipants);

  res.send(deletedParticipants);
});




// Get work details of the specified participant (not deleted)
router.get('/work/:email', async function (req, res, next) {
  const email = req.params.email;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const participant = await participants.get(email);

  if (!participant || !isParticipantActive(participant.props.active)) {
    return res.status(404).json({ error: 'Participant not found or deleted' });
  }

  const { work } = participant.props;
  const { companyname, salary, currency } = work;

  res.send({
    companyname,
    salary,
    currency
  });
});

function isParticipantActive(active) {
  return active === true || active === 'true' || active === 1;
}


// Get home details of the specified participant (not deleted)
router.get('/home/:email', async function (req, res, next) {
  const email = req.params.email;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const participant = await participants.get(email);

  if (!participant || !isParticipantActive(participant.props.active)) {
    return res.status(404).json({ error: 'Participant not found or deleted' });
  }

  const { home } = participant.props;
  const { country, city } = home;

  res.send({
    country,
    city
  });
});

function isParticipantActive(active) {
  return active === true || active === 'true' || active === 1;
}



module.exports = router;
