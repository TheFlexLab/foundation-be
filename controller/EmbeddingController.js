const Context = require("../models/Context");
const { MongoDBAtlasVectorSearch } = require("@langchain/mongodb");
const {
  HuggingFaceTransformersEmbeddings,
} = require("@langchain/community/embeddings/hf_transformers");
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const AWS = require("aws-sdk");
const fs = require("fs").promises;
const path = require("path");
const {
  AWS_S3_ACCESS_KEY,
  AWS_S3_SECRET_ACCESS_KEY,
  AWS_S3_REGION,
  MONGO_URI_KB,
  BACKEND_URL,
} = require("../config/env");
const mongoose = require("mongoose");
const { OpenAI } = require("openai");
const { Article } = require("../models/Article");
const InfoQuestQuestions = require("../models/InfoQuestQuestions");
const { generatePostJSON } = require("./DevScriptController");

AWS.config.update({
  accessKeyId: AWS_S3_ACCESS_KEY,
  secretAccessKey: AWS_S3_SECRET_ACCESS_KEY,
  region: AWS_S3_REGION,
});

const s3Client = new AWS.S3({
  region: AWS_S3_REGION,
  credentials: {
    accessKeyId: AWS_S3_ACCESS_KEY,
    secretAccessKey: AWS_S3_SECRET_ACCESS_KEY,
  },
});

const ai = new OpenAI({
  apiKey: process.env.OPEN_AI_KEY,
});

const postDataFolder = path.join(
  "C:",
  "Users",
  "Mahad",
  "Desktop",
  "participants"
); // Path to your PDF folder

// Specify the specific files to process first
const specificFiles = [
  "foundation_about.pdf",
  "foundation_did_you_know_dyk.pdf",
  "foundation_faqs.pdf",
];

async function readPdfFromS3(bucketName, fileName) {
  try {
    // Parameters for S3 getObject
    const params = {
      Bucket: bucketName,
      Key: fileName,
    };

    // Fetch the PDF file from S3
    const data = await s3Client.getObject(params).promise();

    // Save the PDF buffer to a temporary file
    const tempFilePath = path.join(__dirname, fileName);
    await fs.writeFile(tempFilePath, data.Body);

    // Load the PDF document using PDFLoader
    const loader = new PDFLoader(tempFilePath, { splitPages: false });
    const pdfDoc = await loader.load();

    // // console.log(`Loaded PDF from S3: ${fileName}`);

    // Clean up the temporary file
    await fs.unlink(tempFilePath);

    return pdfDoc;
  } catch (error) {
    // console.error(`Error reading PDF from S3: ${error.message}`);
    return null;
  }
}

async function splitPDFIntoChunks(pdfDocument) {
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });

  // Ensure that pdfDocument is an array of documents
  const documents = Array.isArray(pdfDocument) ? pdfDocument : [pdfDocument];

  // Use the splitDocuments function for an array
  const chunks = await textSplitter.splitDocuments(documents);

  // // console.log(`Split the document into ${chunks.length} chunks.`);
  return chunks;
}

const setEmbedding = async (req, res) => {
  try {
    // Set up SBERT embeddings
    const model = new HuggingFaceTransformersEmbeddings({
      model: "Xenova/all-MiniLM-L6-v2",
    });

    // Create a new connection to the second MongoDB database
    const connKnowledgeBase = mongoose.createConnection(MONGO_URI_KB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    connKnowledgeBase.once("open", () => {
      // console.log("Connected to MongoDB Knowledge Base");
    });

    connKnowledgeBase.once("error", (err) => {
      // console.error("Error connecting to MongoDB Knowledge Base:", err);
    });

    // Wait for the connection to be established
    await new Promise((resolve, reject) => {
      connKnowledgeBase.once("open", resolve);
      connKnowledgeBase.once("error", reject);
    });

    // Set up the vector store with MongoDBAtlasVectorSearch using the new connection
    const vectorStore = new MongoDBAtlasVectorSearch(model, {
      collection: connKnowledgeBase.collection("user"), // Use the new connection's collection
      indexName: "vector_index_about", // Use the index name you configured in Atlas
      textKey: "text", // Field for the original text
      embeddingKey: "embedding", // Field for the embedding vectors
    });

    // Read all files from the postData folder
    let files = await fs.readdir(postDataFolder);

    // Filter out only PDF files
    files = files.filter((file) => file.endsWith(".pdf"));

    // Ensure specific files (about.pdf, faqs.pdf) are processed first
    const orderedFiles = [
      // ...specificFiles, // Add specific files at the start
      ...files.filter((file) => !specificFiles.includes(file)), // Remaining files (excluding specific ones)
    ];

    let counter = 0;

    // Loop through each PDF file and process it
    for (const file of orderedFiles) {
      const filePath = path.join(postDataFolder, file); // Full path to the PDF file

      // Read the PDF file from the local filesystem
      const loader = new PDFLoader(filePath, { splitPages: false });
      const pdfData = await loader.load();
      // const pdfData = await fs.readFile(filePath);

      // Check if the PDF file was successfully loaded
      if (!pdfData) {
        // console.error(`Failed to load PDF document: ${file}`);
        continue; // Skip to the next file if loading failed
      }
      // Split the PDF document into chunks
      const splitDocs = await splitPDFIntoChunks(pdfData);

      // Add the split documents to the vector store
      const result = await vectorStore.addDocuments(splitDocs);
      counter++;
      // console.log(`${counter} Imported ${result.length} documents from ${file} into the MongoDB Atlas vector store.`);
    }

    // Close the connection once done
    connKnowledgeBase.close();

    res.status(200).send("All documents processed and imported successfully.");
  } catch (err) {
    // console.error("Error setting up MongoDBAtlasVectorSearch:", err);
    res.status(500).send(`Internal Server Error: ${err.message}`);
  }
};

const retrieveData = async (req, res) => {
  try {
    const {
      query,
      about,
      user,
      knowladgebaseone,
      fetchK,
      lambda,
      articleId,
      title,
      source,
      sourceRuntime,
    } = req.body; // Get the query from the request body

    if (articleId) {
      if (!source)
        return res
          .status(403)
          .json({ message: `Provide both Article Id and Source` });
      const article = await Article.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(articleId) },
        {
          prompt: query,
          title: title,
          source: source,
        },
        { new: true, runValidators: true }
      );
      if (!article)
        return res
          .status(404)
          .json({ message: `Article with Id: ${articleId} not found.` });
      const sourcedPosts = await InfoQuestQuestions.find({
        _id: { $in: article.source },
      });

      // Initialize sortedResults if not already defined
      const articleArray = await Promise.all(
        sourcedPosts.map(async (post) => {
          const postId = post._id.toString(); // Convert ObjectId to string
          const jsonData = await generatePostJSON(post);
          const formattedPost = {
            pageContent: JSON.stringify(jsonData), // Convert post to JSON string
            metadata: {
              _id: new mongoose.Types.ObjectId(), // Mongoose ObjectId
              source: `C:\\Users\\Mahad\\Desktop\\postData\\post_${postId}.pdf`, // Construct source path
              pdf: null, // Set pdf to null
              loc: null, // Set loc to null
            },
            id: null, // Set id to null
          };

          return formattedPost; // Return the formattedPost to be added to the array
        })
      );

      return res.status(200).json(articleArray);
    }

    if (sourceRuntime) {
      const sourcedPosts = await InfoQuestQuestions.find({
        _id: { $in: source },
      });

      // Initialize sortedResults if not already defined
      const articleArray = await Promise.all(
        sourcedPosts.map(async (post) => {
          const postId = post._id.toString(); // Convert ObjectId to string
          const jsonData = await generatePostJSON(post);
          const formattedPost = {
            pageContent: JSON.stringify(jsonData), // Convert post to JSON string
            metadata: {
              _id: new mongoose.Types.ObjectId(), // Mongoose ObjectId
              source: `C:\\Users\\Mahad\\Desktop\\postData\\post_${postId}.pdf`, // Construct source path
              pdf: null, // Set pdf to null
              loc: null, // Set loc to null
            },
            id: null, // Set id to null
          };

          return formattedPost; // Return the formattedPost to be added to the array
        })
      );
      return res.status(200).json(articleArray);
    }

    if (!query) {
      return res.status(400).send("Query is required.");
    }
    // Validation: Ensure at least one of the flags is true
    if (!(about || user || knowladgebaseone)) {
      throw new Error(
        "At least one of 'about', 'user', or 'knowladgebaseone' must be true."
      );
    }

    // Set up SBERT embeddings (same model used during embedding)
    const model = new HuggingFaceTransformersEmbeddings({
      model: "Xenova/all-MiniLM-L6-v2",
    });

    // // Create a new connection to the MongoDB Knowledge Base
    // const connKnowledgeBase = mongoose.createConnection(MONGO_URI_KB, {
    //   useNewUrlParser: true,
    //   useUnifiedTopology: true,
    // });

    // connKnowledgeBase.once("open", () => {
    //   // console.log("Connected to MongoDB Knowledge Base for retrieval");
    // });

    // connKnowledgeBase.once("error", (err) => {
    //   // console.error("Error connecting to MongoDB Knowledge Base:", err);
    // });

    // // Wait for the connection to be established
    // await new Promise((resolve, reject) => {
    //   connKnowledgeBase.once("open", resolve);
    //   connKnowledgeBase.once("error", reject);
    // });

    let searchResults = [];

    const vectorSearchParams = [
      { flag: about, collectionName: "about", indexName: "vector_index_about" },
      { flag: user, collectionName: "user", indexName: "vector_index_users" },
      {
        flag: knowladgebaseone,
        collectionName: "knowladgebaseone",
        indexName: "vector_index",
      },
    ];

    // Loop through each parameter and perform search if the flag is true
    for (const { flag, collectionName, indexName } of vectorSearchParams) {
      if (flag) {
        const vectorStore = new MongoDBAtlasVectorSearch(model, {
          collection: connKnowledgeBase.collection(collectionName), // Use the new connection's collection
          indexName: indexName, // Use the index name you configured in Atlas
          textKey: "text", // Field for the original text
          embeddingKey: "embedding", // Field for the embedding vectors
        });

        // Await the search result, which returns an array of documents
        const results = await vectorStore.maxMarginalRelevanceSearch(query, {
          fetchK: Number(fetchK), // Adjust this value to retrieve the top K most similar documents
          lambda: Number(lambda),
        });

        // Push each result (document) into searchResults
        searchResults.push(...results);
      }
    }

    // sort the results
    let sortedResults = searchResults.sort((a, b) => b.score - a.score);

    // // Close the connection once done
    // connKnowledgeBase.close();

    // Return the search results to the user
    res.status(200).json(sortedResults);
  } catch (error) {
    // console.error("Error retrieving data from MongoDBAtlasVectorSearch:",error.message);
    res
      .status(500)
      .json({ message: `Internal Server Error: ${error.message}` });
  }
};

const chatGptData = async (req, res) => {
  try {
    const {
      system,
      question,
      temperature,
      max_tokens,
      top_p,
      frequency_penalty,
      presence_penalty,
      knowledgebase,
      fetchK,
      lambda,
      finding,
      suggestion,
      debug,
      articleId,
      title,
      sources,
      isTitle,
    } = req.query;

    const knowledgebaseArray = knowledgebase ? knowledgebase.split(",") : [];
    const source = sources ? sources.split(",") : [];
    // const articleDocWithSamePrompt = await Article.findOne({ prompt: question });

    // if (articleDocWithSamePrompt) {
    //   const existingArticle = {
    //     response: {
    //       title: articleDocWithSamePrompt.title,
    //       abstract: articleDocWithSamePrompt.abstract,
    //       seoSummary: articleDocWithSamePrompt.seoSummary,
    //       findings: articleDocWithSamePrompt.findings,
    //       suggestions: articleDocWithSamePrompt.suggestions,
    //       articleId: articleDocWithSamePrompt._id,
    //     },
    //     debug: null,
    //     source: articleDocWithSamePrompt.source,
    //   }
    //   return res.status(200).json(existingArticle);
    // }

    // Dynamic Findings and Suggestions
    const findings = finding ? Number(finding) : 1;
    const suggestions = suggestion ? Number(suggestion) : 1;
    const findingsArray = [];
    const suggestionsArray = [];
    // Generate the array based on the count
    for (let i = 0; i < findings; i++) {
      findingsArray.push({
        heading: "Finding Header",
        content: "Findings",
      });
    }
    // Generate the array based on the count of suggestions
    for (let i = 0; i < suggestions; i++) {
      suggestionsArray.push({
        statement: `Suggestion ${i + 1}`,
        options: ["Option 1", "Option 2", "Option 3", "... so on"], // Follow the format with predefined options
      });
    }

    // Initialize the flags based on whether the values exist in knowledgebaseArray
    const about = knowledgebaseArray.includes("about") || false;
    const user = knowledgebaseArray.includes("user") || false;
    const knowladgebaseone =
      knowledgebaseArray.includes("knowladgebaseone") || false;

    const vectorSearch = await fetch(`${BACKEND_URL}/chatbot/retrieveData`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: question,
        about: about,
        user: user,
        knowladgebaseone: knowladgebaseone,
        fetchK: fetchK,
        lambda: lambda,
        articleId:
          articleId !== "false" &&
            articleId !== undefined &&
            articleId !== null &&
            articleId !== "undefined" &&
            articleId !== "null"
            ? articleId
            : false,
        title: title,
        source: source,
        sourceRuntime:
          (articleId === "false" ||
            articleId === undefined ||
            articleId === null ||
            articleId === "undefined" ||
            articleId === "null" ||
            !articleId) &&
            source.length > 0
            ? true
            : false,
      }), // Convert to JSON string
    }).then((res) => res.json());

    let prompt;

    if (debug === "true") {
      prompt = {
        role: "user",
        content: `Context sections: ${vectorSearch.map(
          (doc) => doc.pageContent
        )}
        
         From above context, answer the following question: ${question}.`,
      };
    } else if (title && isTitle && isTitle === "true") {
      prompt = {
        role: "user",
        content: `Context sections: ${vectorSearch.map(
          (doc) => doc.pageContent
        )}
        
        Please answer the question: ${question} using the above context in the JSON format provided below.
        
        Ensure that the number of findings is exactly ${findings} and the number of suggestions is exactly ${suggestions}. Respond in the following JSON Object, no extra content except formatted data:
        {
          "title": "${title}",
          "abstract": "Abstract here",
          "seoSummary": "SEO Summary here",
          "groundBreakingFindings": ${JSON.stringify(findingsArray, null, 2)},
          "suggestions": ${JSON.stringify(suggestionsArray, null, 2)},
          "discussion": "Discussion here",
          "conclusion": "Conclusion here",
        }`,
      };
    } else {
      prompt = {
        role: "user",
        content: `Context sections: ${vectorSearch.map(
          (doc) => doc.pageContent
        )}
        
        Please answer the question: ${question} using the above context in the JSON format provided below.
        
        Ensure that the number of findings is exactly ${findings} and the number of suggestions is exactly ${suggestions}. Respond in the following JSON Object, no extra content except formatted data:
        {
          "title": "Title here",
          "abstract": "Abstract here",
          "seoSummary": "SEO Summary here",
          "groundBreakingFindings": ${JSON.stringify(findingsArray, null, 2)},
          "suggestions": ${JSON.stringify(suggestionsArray, null, 2)},
          "discussion": "Discussion here",
          "conclusion": "Conclusion here",
        }`,
      };
    }

    const chat = await ai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `${system}`,
        },
        prompt,
      ],
      temperature: temperature ? Number(temperature) : 0,
      max_tokens: max_tokens ? Number(max_tokens) : 256,
      top_p: top_p ? Number(top_p) : 0.001,
      frequency_penalty: frequency_penalty ? Number(frequency_penalty) : 0,
      presence_penalty: presence_penalty ? Number(presence_penalty) : 0,
    });

    let response = chat.choices[0].message.content;
    if (debug === "true") {
      return res.status(200).json({
        debug: response,
        response: null,
        source: vectorSearch.map((doc) =>
          doc.metadata.source.split("\\").pop().split("/").pop()
        ),
      });
    } else {
      const resp = JSON.parse(response);
      const article = await Article.findOne({ title: resp.title });

      if (article) {
        resp.articleId = article._id;
        resp.articleInfo = article;
      }
      return res.status(200).json({
        response: resp,
        debug: null,
        source: vectorSearch.map((doc) =>
          doc.metadata.source.split("\\").pop().split("/").pop()
        ),
      });
    }
  } catch (error) {
    // console.error("Error:", error.message);
    res
      .status(500)
      .json({ message: `Internal Server Error: ${error.message}` });
  }
};

module.exports = {
  setEmbedding,
  retrieveData,
  chatGptData,
};
