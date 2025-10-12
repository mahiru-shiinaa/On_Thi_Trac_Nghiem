const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI;
let cachedClient = null;
let cachedDb = null;

async function connectDB() {
  if (cachedDb) {
    return cachedDb;
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await cachedClient.connect();
  }

  cachedDb = cachedClient.db('on_thi_trac_nghiem');
  return cachedDb;
}

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const db = await connectDB();
    const quizzes = db.collection('quizzes');

    const { method, url } = req;
    const urlParts = url.split('/').filter(p => p);
    
    // GET /api - Lấy tất cả bài thi
    if (method === 'GET' && urlParts.length === 1) {
      const allQuizzes = await quizzes.find({}).sort({ createdAt: -1 }).toArray();
      return res.status(200).json(allQuizzes);
    }

    // GET /api/:id - Lấy một bài thi
    if (method === 'GET' && urlParts.length === 2) {
      const id = urlParts[1];
      const quiz = await quizzes.findOne({ _id: new ObjectId(id) });
      if (!quiz) {
        return res.status(404).json({ error: 'Không tìm thấy bài thi' });
      }
      return res.status(200).json(quiz);
    }

    // POST /api - Tạo bài thi mới
    if (method === 'POST' && urlParts.length === 1) {
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
    if (method === 'PUT' && urlParts.length === 2) {
      const id = urlParts[1];
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
    if (method === 'DELETE' && urlParts.length === 2) {
      const id = urlParts[1];
      const result = await quizzes.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Không tìm thấy bài thi' });
      }

      return res.status(200).json({ message: 'Xóa thành công' });
    }

    return res.status(404).json({ error: 'Endpoint không tồn tại' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Lỗi server', 
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};