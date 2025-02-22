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

// Ledger 
// 1. Create
describe('GET /ledgerById', () => {
  it('Ledger Get By ID', async () => {
    const res = await request(app)
      .get('/ledgerById')
      .send({   
        "page": 1, 
        "limit": 3, 
        "uuid": "291a87312023f9013a4e10" 
    })
    expect(res.statusCode).toBe(200)
  })
})