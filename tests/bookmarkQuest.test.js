const request = require('supertest')
const mongoose = require("mongoose");
const app = require('../server')

require("dotenv").config();

/* Connecting to the database before each test. */
beforeEach(async () => {
  await mongoose.connect(process.env.MONGO_DEVELOPMENT_URI);
});

/* Dropping the database and closing connection after each test. */
afterEach(async () => {
  // await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
});

// Bookmark Quest 
// 1. Create
describe('POST /bookmarkQuest/createBookmarkQuest', () => {
  it('Bookmark Quest Create', async () => {
    const res = await request(app)
      .post('/bookmarkQuest/createBookmarkQuest')
      .send({
        "Question": "How are you?",
        "uuid": "291a87312023f9013a4e10",
        "questForeignKey": "65538b3a74cbca284333065f",
        "whichTypeQuestion": "yes/no"
    })
    expect(res.statusCode).toBe(201)
  })
})
// 2. Remove
describe('POST /bookmarkQuest/deleteBookmarkQuest', () => {
  it('Bookmark Quest Remove', async () => {
    const res = await request(app)
      .post('/bookmarkQuest/deleteBookmarkQuest')
      .send({
        "uuid": "291a87312023f9013a4e10",
        "questForeignKey": "65538b3a74cbca284333065f",
    })
    expect(res.statusCode).toBe(201)
  })
})
// 3. Get All
describe('POST /bookmarkQuest/getAllBookmarkQuestions', () => {
  it('Bookmark Quest Get All', async () => {
    const res = await request(app)
      .post('/bookmarkQuest/getAllBookmarkQuestions')
      .send({
        "uuid": "291a87312023f9013a4e10",
        "_page": 1,
        "_limit": 5,
        "sort": "Newest First"
    })
    expect(res.statusCode).toBe(200)
  })
})