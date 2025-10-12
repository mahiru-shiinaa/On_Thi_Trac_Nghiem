import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let cachedClient = null;
let cachedDb = null;

async function connectDB() {
  if (cachedDb) {
    return cachedDb;
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(uri);
    await cachedClient.connect();
  }

  cachedDb = cachedClient.db('on_thi_trac_nghiem');
  return cachedDb;
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = await connectDB();
    const quizzes = db.collection('quizzes');

    // GET - Lấy tất cả bài thi
    if (req.method === 'GET') {
      const allQuizzes = await quizzes.find({}).sort({ createdAt: -1 }).toArray();
      return res.status(200).json(allQuizzes);
    }

    // POST - Tạo bài thi mới
    if (req.method === 'POST') {
      const { title, questions } = req.body;
      
      if (!title || !questions || questions.length === 0) {
        return res.status(400).json({ error: 'Thiếu thông tin bài thi' });
      }

      const newQuiz = {
        title,
        questions,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await quizzes.insertOne(newQuiz);
      const insertedQuiz = { 
        _id: result.insertedId.toString(), 
        ...newQuiz 
      };
      return res.status(201).json(insertedQuiz);
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Lỗi server', 
      message: error.message
    });
  }
}