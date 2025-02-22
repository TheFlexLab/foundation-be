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

describe('test the server up and running', () => {
  it('get server', async () => {
    const res = await request(app)
      .get('/');
    //   .send({
    //     userId: 1,
    //     title: 'test is cool',
    //   })
    expect(res.statusCode).toBe(200)
    // expect(res.text).toEqual('Foundation Serverss')
    // expect(res.body).toHaveProperty('post')
  })
})

describe('POST /user/signUpUser', () => {
  it('Create a new user', async () => {
    const res = await request(app)
      .post('/user/signUpUser')
      .send({
        "userEmail": "gajisefg62@gmail.com",
        "userPassword": "Pa$$w0rd!"
    })
    expect(res.statusCode).toBe(200)
  })
})

// describe('Post Endpoints', () => {
//   it('should create a new post', async () => {
//     const res = await request(app)
//       .post('/api/posts')
//       .send({
//         userId: 1,
//         title: 'test is cool',
//       })
//     expect(res.statusCode).toEqual(201)
//     expect(res.body).toHaveProperty('post')
//   })
// })