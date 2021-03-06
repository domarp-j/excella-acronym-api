// ====================
// Third-Party Modules
// ====================

let chai = require('chai');
let chaiHttp = require('chai-http');
let mongoose = require('mongoose');
let Mockgoose = require('mockgoose').Mockgoose;

require('dotenv-safe').load();

// ====================
// Internal Modules
// ====================

//
// Models
//
let Acronym = require('../../app/models/acronym');

//
// Server
//
let server = require('../../server');

// ====================
// Setup
// ====================

//
// Assertions
//
let should = chai.should();

//
// Port
//
let port = process.env.PORT;
let address = `http://localhost:${port}`;

//
// Chai HTTP
//
chai.use(chaiHttp);

//
// Mockgoose (Test Database Connection)
//
let mockgoose = new Mockgoose(mongoose);
before((done) => {
  mockgoose.prepareStorage().then(() => {
    mongoose.createConnection(process.env.MONGODB_URI_TEST, (err) => {
      done(err);
    });
  });
});

// ====================
// Test Parameters
// ====================

let slackReqParams = {
  token: process.env.SLACK_TOKEN,
  team_id: process.env.SLACK_TEAM_ID,
  team_domain: 'team_domain',
  channel_id: 'channel_id',
  channel_name: 'channel_name',
  user_id: 'user_id',
  user_name: 'user_name',
  command: '/command',
  text: '',
  response_url: ''
};

let slackReq = Object.assign({}, slackReqParams);

let testAcronyms = [
  {
    name: 'ATM',
    meaning: 'At The Moment',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }, {
    name: 'ATM',
    meaning: 'Automated Transaction Machine',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }, {
    name: 'IRL',
    meaning: 'In Real Life',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }, {
    name: 'LOL',
    meaning: 'Laughing Out Loud',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
];

// ====================
// Testing
// ====================

describe('Slack Controller', () => {
  beforeEach(done => {
    Acronym.remove({}, err => {
      testAcronyms.forEach((acronym, index) => {
        Acronym.collection.insert(acronym).then(() => {
          if (index === testAcronyms.length - 1) done();
        });
      });
    });
  });

  afterEach(done => {
    slackReq = Object.assign({}, slackReqParams);
    done();
  });

  describe('POST /slack (handle) - /acronym (no text)', () => {
    it('should return a welcome message if text is blank', done => {
      slackReq.text = '';
      chai.request(address)
        .post('/slack')
        .send(slackReq)
        .end((err, res) => {
          res.body.response_type.should.eq('ephemeral');
          res.body.text.should.eq('Not sure what an acronym at Excella stands for? Just ask /acronym! (Source: https://github.com/domarp-j/excella-acronym-api/).');
          res.body.attachments[0].text.should.eq('Enter "/acronym <acronym>" to get its meaning.');
          // res.body.attachments[X].text.should.eq('Enter "/acronym get all" to get all known Excella acronyms and their definitions.');
          res.body.attachments[1].text.should.eq('Enter "/acronym add <acronym> <meaning>" to add a new Excella acronym to the database.');
          res.body.attachments[2].text.should.eq('Enter "/acronym remove <acronym> <meaning>" to remove an existing Excella acronym from the database.');
          done();
        });
    });
  });

  // describe('POST /slack (handle) - /acronym get all', () => {
  //   it('should get all acronyms upon request', done => {
  //     slackReq.text = 'Get All';
  //     chai.request(address)
  //     .post('/slack')
  //     .send(slackReq)
  //     .end((err, res) => {
  //       res.body.response_type.should.eq('ephemeral');
  //       res.body.text.should.eq('Here are all of the acronyms currently in the database.');
  //       res.body.attachments.should.be.a('array');
  //       res.body.attachments.should.have.length(testAcronyms.length);
  //       done();
  //     });
  //   });
  // });

  describe('POST /slack (handle) - /acronym (name)', () => {
    it('should get a specific acronym upon request', done => {
      slackReq.text = 'IRL';
      chai.request(address)
      .post('/slack')
      .send(slackReq)
      .end((err, res) => {
        res.body.response_type.should.eq('ephemeral');
        res.body.text.should.eq('IRL means \"In Real Life\".');
        done();
      });
    });

    it('should get a specific acronym upon request, regardless of caps', done => {
      slackReq.text = 'irl';
      chai.request(address)
      .post('/slack')
      .send(slackReq)
      .end((err, res) => {
        res.body.response_type.should.eq('ephemeral');
        res.body.text.should.eq('IRL means \"In Real Life\".');
        done();
      });
    });

    it('should get a specific acronym upon request, even if it has multiple meanings', done => {
      slackReq.text = 'ATM';
      chai.request(address)
      .post('/slack')
      .send(slackReq)
      .end((err, res) => {
        res.body.response_type.should.eq('ephemeral');
        res.body.text.should.eq('ATM could mean one of the following:');
        res.body.attachments.should.be.a('array');
        res.body.attachments[0].text.should.include('At The Moment');
        res.body.attachments[1].text.should.include('Automated Transaction Machine');
        done();
      });
    });

    it('should respond properly when an acronym isn\'t in the database', done => {
      slackReq.text = 'GGG',
      chai.request(address)
      .post('/slack')
      .send(slackReq)
      .end((err, res) => {
        res.body.response_type.should.eq('ephemeral');
        res.body.text.should.include(`Sorry, we couldn\'t find the meaning of ${slackReq.text}.`);
        done();
      });
    });
  });

  describe('POST /slack (handle) - /acronyms add (name) (meaning)', () => {
    it('should be able to add an acronym to the database', done => {
      slackReq.text = 'add nba national basketball association';
      chai.request(address)
      .post('/slack')
      .send(slackReq)
      .end((err, res) => {
        res.body.response_type.should.eq('ephemeral');
        res.body.text.should.include('Success! Thanks for adding NBA ("National Basketball Association") to the database!');
        Acronym.find().exec((err, acronyms) => {
          acronyms.length.should.equal(testAcronyms.length + 1);
        });
        done();
      });
    });

    it('should not be able to add a duplicate acronym/meaning to the database', done => {
      let acro = testAcronyms[0];
      slackReq.text = `add ${acro.name} ${acro.meaning}`;
      chai.request(address)
      .post('/slack')
      .send(slackReq)
      .end((err, res) => {
        res.body.response_type.should.eq('ephemeral');
        res.body.text.should.include(`Thank you, but ${acro.name} with the definition "${acro.meaning}" is already in the database.`);
        Acronym.find().exec((err, acronyms) => {
          acronyms.length.should.equal(testAcronyms.length);
        });
        done();
      });
    });
    it('should not be able to add a duplicate acronym/meaning to the database, regardless of caps', done => {
      let acro = testAcronyms[0];
      slackReq.text = `ADD ${acro.name.toLowerCase()} ${acro.meaning.toLowerCase()}`;
      chai.request(address)
      .post('/slack')
      .send(slackReq)
      .end((err, res) => {
        res.body.response_type.should.eq('ephemeral');
        res.body.text.should.include(`Thank you, but ${acro.name} with the definition "${acro.meaning}" is already in the database.`);
        Acronym.find().exec((err, acronyms) => {
          acronyms.length.should.equal(testAcronyms.length);
        });
        done();
      });
    });

    it('should let the user know if they tried to add an acronym without a meaning', done => {
      let acro = testAcronyms[0];
      slackReq.text = `add ${acro.name}`;
      chai.request(address)
      .post('/slack')
      .send(slackReq)
      .end((err, res) => {
        res.body.response_type.should.eq('ephemeral');
        res.body.text.should.eq(`Please include the meaning of ${acro.name} to add it to the database.`);
        done();
      });
    });
  });

  describe('POST /slack (handle) - /acronyms remove (name) (meaning)', () => {
    it('should be able to remove an acronym from the database', done => {
      let acro = testAcronyms[0];
      slackReq.text = `remove ${acro.name} ${acro.meaning}`;
      chai.request(address)
      .post('/slack')
      .send(slackReq)
      .end((err, res) => {
        res.body.response_type.should.eq('ephemeral');
        res.body.text.should.include(`Success! You removed ${acro.name} ("${acro.meaning}") from the database.`);
        Acronym.find().exec((err, acronyms) => {
          acronyms.length.should.equal(testAcronyms.length - 1);
        });
        done();
      });
    });

    it('should let the user know if they tried to delete an acronym without a meaning', done => {
      let acro = testAcronyms[0];
      slackReq.text = `remove ${acro.name}`;
      chai.request(address)
      .post('/slack')
      .send(slackReq)
      .end((err, res) => {
        res.body.response_type.should.eq('ephemeral');
        res.body.text.should.eq(`Please include the meaning of ${acro.name} to remove it from the database.`);
        done();
      });
    });
  });

  describe('POST /slack (handle) - invalid submissions', () => {
    it('should respond with an error message if "token" is not present', done => {
      slackReq.token = undefined;
      chai.request(address)
        .post('/slack')
        .send(slackReq)
        .end((err, res) => {
          res.body.text.should.include('Sorry, the request couldn\'t be processed.');
          done();
        });
    });

    it('should respond with an error message if "team_id" is not present', done => {
      slackReq.team_id = undefined;
      chai.request(address)
        .post('/slack')
        .send(slackReq)
        .end((err, res) => {
          res.body.text.should.include('Sorry, the request couldn\'t be processed.');
          done();
        });
    });

    it('should respond with an error message if token does not match token on file', done => {
      slackReq.token = slackReq.token + 'invalid';
      chai.request(address)
        .post('/slack')
        .send(slackReq)
        .end((err, res) => {
          res.body.text.should.include('Sorry, the request couldn\'t be processed.');
          done();
        });
    });

    it('should respond with an error message if token does not match team ID on file', done => {
      slackReq.token = slackReq.team_id + 'invalid';
      chai.request(address)
        .post('/slack')
        .send(slackReq)
        .end((err, res) => {
          res.body.text.should.include('Sorry, the request couldn\'t be processed.');
          done();
        });
    });
  });
});
