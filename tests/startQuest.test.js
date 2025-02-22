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

// Yes/No 
// 1. By Default
describe('POST /startQuest/createStartQuest', () => {
  it('Yes/No By Default', async () => {
    const res = await request(app)
      .get('/startQuest/createStartQuest')
      .send({
        "questForeignKey": "655611c2a52caeb657f787ff",
        "data": {
            "selected": "Yes",
            "created": "2023-11-16T12:09:23.925Z"
        },
        "addedAnswer": "",
        "uuid": "291a87312023f9013a4e10"
    })
    expect(res.statusCode).toBe(201)
  })
})
// 2. With Correct Option
describe('POST /startQuest/createStartQuest', () => {
  it('Yes/No With Correct Option', async () => {
    const res = await request(app)
      .post('/startQuest/createStartQuest')
      .send({
        "questForeignKey": "65561a2d324f85fc14c8d9d3",
        "data": {
            "selected": "Yes",
            "created": "2023-11-16T13:28:17.322Z"
        },
        "addedAnswer": "",
        "uuid": "291a87312023f9013a4e10"
    })
    expect(res.statusCode).toBe(201)
  })
})
// 3. With Custom Change Option
describe('POST /startQuest/createStartQuest', () => {
  it('Yes/No With Custom Change Option', async () => {
    const res = await request(app)
      .post('/startQuest/createStartQuest')
      .send({
        "questForeignKey": "65561bb394b094e698b58ffa",
        "data": {
            "selected": "Yes",
            "created": "2023-11-16T13:28:17.322Z"
        },
        "addedAnswer": "",
        "uuid": "291a87312023f9013a4e10"
    })
    expect(res.statusCode).toBe(201)
  })
})