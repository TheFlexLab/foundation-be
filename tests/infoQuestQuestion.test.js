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
describe('POST /infoquestions/createInfoQuestQuest', () => {
  it('Yes/No By Default', async () => {
    const res = await request(app)
      .post('/infoquestions/createInfoQuestQuest')
      .send({
        "Question": "How are you?",
        "whichTypeQuestion": "yes/no",
        "usersChangeTheirAns": "Daily",
        "QuestionCorrect": "Not Selected",
        "uuid": "291a87312023f9013a4e10"
    })
    expect(res.statusCode).toBe(201)
  })
})
// 2. With Correct Option
describe('POST /infoquestions/createInfoQuestQuest', () => {
  it('Yes/No With Correct Option', async () => {
    const res = await request(app)
      .post('/infoquestions/createInfoQuestQuest')
      .send({
        "Question": "How are you, Ali?",
        "whichTypeQuestion": "yes/no",
        "usersChangeTheirAns": "Daily",
        "QuestionCorrect": "no",
        "uuid": "291a87312023f9013a4e10"
    })
    expect(res.statusCode).toBe(201)
  })
})
// 3. With Custom Change Option
describe('POST /infoquestions/createInfoQuestQuest', () => {
  it('Yes/No With Custom Change Option', async () => {
    const res = await request(app)
      .post('/infoquestions/createInfoQuestQuest')
      .send({
        "Question": "How are you, Alims?",
        "whichTypeQuestion": "yes/no",
        "usersChangeTheirAns": "Monthly",
        // Daily, Weekly, Monthly, Yearly, TwoYears, FourYears
        "QuestionCorrect": "Not Selected",
        "uuid": "291a87312023f9013a4e10"
    })
    expect(res.statusCode).toBe(201)
  })
})

// Agree/Disagree 
// 1. By Default
describe('POST /infoquestions/createInfoQuestQuest', () => {
  it('Agree/Disagree By Default', async () => {
    const res = await request(app)
      .post('/infoquestions/createInfoQuestQuest')
      .send({
        "Question": "How are you?",
        "whichTypeQuestion": "agree/disagree",
        "usersChangeTheirAns": "Daily",
        "QuestionCorrect": "Not Selected",
        "uuid": "291a87312023f9013a4e10"
    })
    expect(res.statusCode).toBe(201)
  })
})
// 2. With Correct Option
describe('POST /infoquestions/createInfoQuestQuest', () => {
  it('Agree/Disagree With Correct Option', async () => {
    const res = await request(app)
      .post('/infoquestions/createInfoQuestQuest')
      .send({
        "Question": "How are you, Ali?",
        "whichTypeQuestion": "agree/disagree",
        "usersChangeTheirAns": "Daily",
        "QuestionCorrect": "agree",
        "uuid": "291a87312023f9013a4e10"
    })
    expect(res.statusCode).toBe(201)
  })
})
// 3. With Custom Change Option
describe('POST /infoquestions/createInfoQuestQuest', () => {
  it('Agree/Disagree With Custom Change Option', async () => {
    const res = await request(app)
      .post('/infoquestions/createInfoQuestQuest')
      .send({
        "Question": "How are you, Alims?",
        "whichTypeQuestion": "agree/disagree",
        "usersChangeTheirAns": "Monthly",
        // Daily, Weekly, Monthly, Yearly, TwoYears, FourYears
        "QuestionCorrect": "Not Selected",
        "uuid": "291a87312023f9013a4e10"
    })
    expect(res.statusCode).toBe(201)
  })
})

// Multiple Choice 
// 1. By Default
describe('POST /infoquestions/createInfoQuestQuest', () => {
  it('Multiple Choice By Default', async () => {
    const res = await request(app)
      .post('/infoquestions/createInfoQuestQuest')
      .send({
        "Question": "How are you?",
        "whichTypeQuestion": "multiple choise",
        "QuestionCorrect": "Not Selected",
        "QuestAnswers": [
            {
                "question": "Normal",
                "selected": false
            },
            {
                "question": "Good",
                "selected": false
            },
            {
                "question": "Not good",
                "selected": false
            }
        ],
        "usersAddTheirAns": false,
        "usersChangeTheirAns": "Daily",
        "QuestAnswersSelected": [],
        "uuid": "291a87312023f9013a4e10"
    })
    expect(res.statusCode).toBe(201)
  })
})
// 2. With Correct Option
describe('POST /infoquestions/createInfoQuestQuest', () => {
  it('Multiple Choice With Correct Option', async () => {
    const res = await request(app)
      .post('/infoquestions/createInfoQuestQuest')
      .send({
        "Question": "What is your name?",
        "whichTypeQuestion": "multiple choise",
        "QuestionCorrect": "Selected",
        "QuestAnswers": [
            {
                "question": "Ali",
                "selected": true
            },
            {
                "question": "Ahmad",
                "selected": false
            }
        ],
        "usersAddTheirAns": "",
        "usersChangeTheirAns": "Daily",
        "QuestAnswersSelected": [
            {
                "answers": "Ali"
            }
        ],
        "uuid": "291a87312023f9013a4e10"
    })
    expect(res.statusCode).toBe(201)
  })
})
// 3. With Correct & Multiple Option
describe('POST /infoquestions/createInfoQuestQuest', () => {
  it('Multiple Choice With Correct & Multiple Option', async () => {
    const res = await request(app)
      .post('/infoquestions/createInfoQuestQuest')
      .send({
        "Question": "How are you?",
        "whichTypeQuestion": "multiple choise",
        "QuestionCorrect": "Selected",
        "QuestAnswers": [
            {
                "question": "Good",
                "selected": true
            },
            {
                "question": "Bad",
                "selected": true
            }
        ],
        "usersAddTheirAns": "",
        "usersChangeTheirAns": "Daily",
        "QuestAnswersSelected": [
            {
                "answers": "Good"
            },
            {
                "answers": "Bad"
            }
        ],
        "uuid": "291a87312023f9013a4e10"
    })
    expect(res.statusCode).toBe(201)
  })
})
// 4. With Add Option
describe('POST /infoquestions/createInfoQuestQuest', () => {
  it('Multiple Choice With Add Option', async () => {
    const res = await request(app)
      .post('/infoquestions/createInfoQuestQuest')
      .send({
        "Question": "How are you?",
        "whichTypeQuestion": "multiple choise",
        "QuestionCorrect": "Not Selected",
        "QuestAnswers": [
            {
                "question": "Good",
                "selected": false
            },
            {
                "question": "Not good",
                "selected": false
            }
        ],
        "usersAddTheirAns": true,
        "usersChangeTheirAns": "Daily",
        "QuestAnswersSelected": [],
        "uuid": "291a87312023f9013a4e10"
    })
    expect(res.statusCode).toBe(201)
  })
})
// 4. With Custom Change Option
describe('POST /infoquestions/createInfoQuestQuest', () => {
  it('Multiple Choice With Custom Change Option', async () => {
    const res = await request(app)
      .post('/infoquestions/createInfoQuestQuest')
      .send({
        "Question": "How are you?",
        "whichTypeQuestion": "multiple choise",
        "QuestionCorrect": "Not Selected",
        "QuestAnswers": [
            {
                "question": "Normal",
                "selected": false
            },
            {
                "question": "Good",
                "selected": false
            },
            {
                "question": "Not good",
                "selected": false
            }
        ],
        "usersAddTheirAns": false,
        "usersChangeTheirAns": "Daily",
        // Daily, Weekly, Monthly, Yearly, TwoYears, FourYears
        "QuestAnswersSelected": [],
        "uuid": "291a87312023f9013a4e10"
    })
    expect(res.statusCode).toBe(201)
  })
})


// Ranked Choice 
// 1. By Default
describe('POST /infoquestions/createInfoQuestQuest', () => {
    it('Ranked Choice By Default', async () => {
      const res = await request(app)
        .post('/infoquestions/createInfoQuestQuest')
        .send({
            "Question": "How are you?",
            "whichTypeQuestion": "ranked choise",
            "usersAddTheirAns": false,
            "usersChangeTheirAns": "Daily",
            "QuestionCorrect": "No Option",
            "QuestAnswers": [
                {
                    "question": "Not good"
                },
                {
                    "question": "Good"
                }
            ],
            "uuid": "291a87312023f9013a4e10"
        })
      expect(res.statusCode).toBe(201)
    })
  })
  // 2. With Add Answer
  describe('POST /infoquestions/createInfoQuestQuest', () => {
    it('Ranked Choice With Add Answer', async () => {
      const res = await request(app)
        .post('/infoquestions/createInfoQuestQuest')
        .send({
            "Question": "How are you?",
            "whichTypeQuestion": "ranked choise",
            "usersAddTheirAns": true,
            "usersChangeTheirAns": "Daily",
            "QuestionCorrect": "No Option",
            "QuestAnswers": [
                {
                    "question": "Not good"
                },
                {
                    "question": "Good"
                }
            ],
            "uuid": "291a87312023f9013a4e10"
        })
      expect(res.statusCode).toBe(201)
    })
  })
  // 3. With Custom Change Option
  describe('POST /infoquestions/createInfoQuestQuest', () => {
    it('Ranked Choice With Custom Change Option', async () => {
      const res = await request(app)
        .post('/infoquestions/createInfoQuestQuest')
        .send({
            "Question": "How are you?",
            "whichTypeQuestion": "ranked choise",
            "usersAddTheirAns": true,
            "usersChangeTheirAns": "Daily",
            // Daily, Weekly, Monthly, Yearly, TwoYears, FourYears
            "QuestionCorrect": "No Option",
            "QuestAnswers": [
                {
                    "question": "Not good"
                },
                {
                    "question": "Good"
                }
            ],
            "uuid": "291a87312023f9013a4e10"
        })
      expect(res.statusCode).toBe(201)
    })
  })