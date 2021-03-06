// ====================
// Third-Party Modules
// ====================

let _ = require('lodash');

require('dotenv-safe').load();

// ====================
// Helpers
// ====================

let appHelper = require('../helpers/app');

// ====================
// Models
// ====================

let Acronym = require('../models/acronym');

// ====================
// Setup
// ====================

let apiLink = 'https://excella-acronym-api.herokuapp.com/acronyms';

let acronymMap = {
  blank:    0,
  get:      1,
  // getAll:   2,
  add:      3,
  remove:   4,
  invalid:  5
};

let welcomeMessage = {
  response_type: 'ephemeral',
  text: 'Not sure what an acronym at Excella stands for? Just ask /acronym! (Source: https://github.com/domarp-j/excella-acronym-api/).',
  attachments: [
    { text: 'Enter "/acronym <acronym>" to get its meaning.' },
    // { text: 'Enter "/acronym get all" to get all known Excella acronyms and their definitions.' },
    { text: 'Enter "/acronym add <acronym> <meaning>" to add a new Excella acronym to the database. Example: "/acronym add nba national basketball association".' },
    { text: 'Enter "/acronym remove <acronym> <meaning>" to remove an existing Excella acronym from the database. Example: "/acronym remove nba national basketball association".' }
  ]
};

// ====================
// Helper Methods
// ====================

//
// Get words for a given text, filtering out white spaces
//
let getWords = text => {
  return text.split(' ').filter(value => { return !!value; });
};

//
// Parse Slack request text & determine what action was requested
// acronymMap shows the type of requests that are possible
//
let parse = text => {
  let words = getWords(text);

  if (!text) return acronymMap.blank;
  else if (words.length === 1) return acronymMap.get;
  // else if (text.toLowerCase() === 'get all') return acronymMap.getAll;
  else if (words[0].toLowerCase() === 'add') return acronymMap.add;
  else if (words[0].toLowerCase() === 'remove') return acronymMap.remove;
  else return acronymMap.invalid;
};

//
// Break down acronym objects into an array of strings with the format:
// <acronym> - <meaning>
// Sort acronyms in alphabetical order
//
let displayAcronyms = (acronyms, showName) => {
  let meanings = _.map(acronyms, acronym => {
    if (showName) return { text: `${acronym.name} - ${acronym.meaning}` };
    else return { text: `${acronym.meaning}` };
  });

  return meanings.sort((prev, curr) => {
    if (prev.text < curr.text) return -1;
    else return 1;
  });
};

//
// Get all acronyms & return object as Slack response
//
// let getAllAcronyms = next => {
//   Acronym.find((err, acronyms) => {
//     if (err) {
//       next({
//         response_type: 'ephemeral',
//         text: 'Sorry, we couldn\'t process the request. Something is preventing us from getting a list of all acronyms. Please contact admin for troubleshooting.'
//       });
//     } else {
//       next({
//         response_type: 'ephemeral',
//         text: 'Here are all of the acronyms currently in the database.',
//         attachments: displayAcronyms(acronyms, true)
//       });
//     }
//   });
// };

//
// Get a specific acronym & return object as Slack response
//
let getAcronym = (name, next) => {
  let nameUpper = name.toUpperCase();

  Acronym.find({ name: nameUpper }, (err, acronyms) => {
    if (err) {
      next({
        response_type: 'ephemeral',
        text: `Sorry, we couldn\'t process the request. Something is preventing us from getting the meaning of ${nameUpper}. Please contact admin for troubleshooting.`
      });
    } else if (acronyms.length === 0) {
      next({
        response_type: 'ephemeral',
        text: `Sorry, we couldn\'t find the meaning of ${nameUpper}.`
      });
    } else if (acronyms.length === 1) {
      next({
        response_type: 'ephemeral',
        text: `${nameUpper} means "${acronyms[0].meaning}".`
      });
    } else { // acronyms.length > 1
      next({
        response_type: 'ephemeral',
        text: `${nameUpper} could mean one of the following:`,
        attachments: displayAcronyms(acronyms)
      });
    }
  });
};

//
// Add an acronym to database & return Slack response
//
let addAcronym = (text, next) => {
  let words = getWords(text);

  let acronym = new Acronym();

  acronym.name = words[1].toUpperCase();
  acronym.meaning = appHelper.capitalize(words.slice(2).join(' '));

  Acronym.find({ name: acronym.name, meaning: acronym.meaning }, (err, acronyms) => {
    if (words.length === 2) {
      next({
        response_type: 'ephemeral',
        text: `Please include the meaning of ${acronym.name} to add it to the database.`
      });
    } else if (acronyms.length !== 0) {
      next({
        response_type: 'ephemeral',
        text: `Thank you, but ${acronym.name} with the definition "${acronym.meaning}" is already in the database.`
      });
    } else {
      acronym.save(err => {
        if (err) {
          next({
            response_type: 'ephemeral',
            text: 'Sorry, we couldn\'t process the request. Something is preventing us from adding a new acronym to the database. Please contact admin for troubleshooting.'
          });
        } else {
          next({
            response_type: 'ephemeral',
            text: `Success! Thanks for adding ${acronym.name} ("${acronym.meaning}") to the database!`
          });
        }
      });
    }
  });
};

//
// Delete an acronym to database & return Slack response
//
let removeAcronym = (text, next) => {
  let words = getWords(text);

  let acronym = new Acronym();

  acronym.name = words[1].toUpperCase();
  acronym.meaning = appHelper.capitalize(words.slice(2).join(' '));

  Acronym.remove({ name: acronym.name, meaning: acronym.meaning }, (err, acronyms) => {
    if (err) {
      next({
        response_type: 'ephemeral',
        text: 'Sorry, we couldn\'t process the request. Something is preventing us from removing the acronym from the database. Please contact admin for troubleshooting.'
      });
    } else if (words.length === 2) {
      next({
        response_type: 'ephemeral',
        text: `Please include the meaning of ${acronym.name} to remove it from the database.`
      });
    } else {
      next({
        response_type: 'ephemeral',
        text: `Success! You removed ${acronym.name} ("${acronym.meaning}") from the database.`
      });
    }
  });
};

// ====================
// Public Helpers
// ====================

//
// Check if Slack token & team ID match parameters on file
//
exports.match = (token, teamId) => {
  return token === process.env.SLACK_TOKEN && teamId === process.env.SLACK_TEAM_ID;
};

//
// Handle request & respond accordingly
//
exports.handleReq = (slackReq, done) => {
  let text = slackReq.text;
  let textType = parse(slackReq.text);

  switch (textType) {
  case acronymMap.blank:
    done(null, welcomeMessage);
    break;
  // case acronymMap.getAll:
  //   getAllAcronyms(slackRes => {
  //     done(null, slackRes);
  //   });
  //   break;
  case acronymMap.get:
    getAcronym(text, slackRes => {
      done(null, slackRes);
    });
    break;
  case acronymMap.add:
    addAcronym(text, slackRes => {
      done(null, slackRes);
    });
    break;
  case acronymMap.remove:
    removeAcronym(text, slackRes => {
      done(null, slackRes);
    });
    break;
  default:
    done(true, null);
  }
};
