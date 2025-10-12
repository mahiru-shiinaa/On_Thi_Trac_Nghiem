const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let db;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db('on_thi_trac_nghiem');
  }
  return db;
}

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

module.exports = async (req, res) => {
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  try {
    const database = await connectDB();
    const quizzes = database.collection('quizzes');

    const { method } = req;
    const path = req.url.split('?')[0];

    // GET /api - Lấy tất cả bài thi
    if (method === 'GET' && path === '/api') {
      const allQuizzes = await quizzes.find({}).sort({ createdAt: -1 }).toArray();
      return res.status(200).json(allQuizzes);
    }

    // GET /api/:id - Lấy một bài thi
    if (method === 'GET' && path.startsWith('/api/')) {
      const id = path.split('/')[2];
      const quiz = await quizzes.findOne({ _id: new ObjectId(id) });
      if (!quiz) {
        return res.status(404).json({ error: 'Không tìm thấy bài thi' });
      }
      return res.status(200).json(quiz);
    }

    // POST /api - Tạo bài thi mới
    if (method === 'POST' && path === '/api') {
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
      return res.status(201).json({ _id: result.insertedId, ...newQuiz });
    }

    // PUT /api/:id - Cập nhật bài thi
    if (method === 'PUT' && path.startsWith('/api/')) {
      const id = path.split('/')[2];
      const { title, questions } = req.body;

      if (!title || !questions || questions.length === 0) {
        return res.status(400).json({ error: 'Thiếu thông tin bài thi' });
      }

      const result = await quizzes.updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            title, 
            questions,
            updatedAt: new Date()
          } 
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Không tìm thấy bài thi' });
      }

      return res.status(200).json({ message: 'Cập nhật thành công' });
    }

    // DELETE /api/:id - Xóa bài thi
    if (method === 'DELETE' && path.startsWith('/api/')) {
      const id = path.split('/')[2];
      const result = await quizzes.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Không tìm thấy bài thi' });
      }

      return res.status(200).json({ message: 'Xóa thành công' });
    }

    return res.status(404).json({ error: 'Không tìm thấy endpoint' });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};