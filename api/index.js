import { MongoClient, ObjectId } from 'mongodb';

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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  try {
    const db = await connectDB();
    const quizzes = db.collection('quizzes');

    // GET - Lấy một bài thi (kiểm tra quyền sở hữu)
    if (req.method === 'GET') {
      const { username } = req.query;
      
      const quiz = await quizzes.findOne({ _id: new ObjectId(id) });
      if (!quiz) {
        return res.status(404).json({ error: 'Không tìm thấy bài thi' });
      }

      // Kiểm tra quyền truy cập
      if (username && quiz.username !== username.toLowerCase()) {
        return res.status(403).json({ error: 'Không có quyền truy cập' });
      }

      return res.status(200).json(quiz);
    }

    // PUT - Cập nhật bài thi (chỉ chủ sở hữu)
    if (req.method === 'PUT') {
      const { title, questions, username } = req.body;

      if (!username) {
        return res.status(400).json({ error: 'Thiếu username' });
      }

      if (!title || !questions || questions.length === 0) {
        return res.status(400).json({ error: 'Thiếu thông tin bài thi' });
      }

      // Kiểm tra quyền sở hữu
      const quiz = await quizzes.findOne({ _id: new ObjectId(id) });
      if (!quiz) {
        return res.status(404).json({ error: 'Không tìm thấy bài thi' });
      }

      if (quiz.username !== username.toLowerCase()) {
        return res.status(403).json({ error: 'Không có quyền chỉnh sửa' });
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

    // DELETE - Xóa bài thi (chỉ chủ sở hữu)
    if (req.method === 'DELETE') {
      const { username } = req.query;

      if (!username) {
        return res.status(400).json({ error: 'Thiếu username' });
      }

      // Kiểm tra quyền sở hữu
      const quiz = await quizzes.findOne({ _id: new ObjectId(id) });
      if (!quiz) {
        return res.status(404).json({ error: 'Không tìm thấy bài thi' });
      }

      if (quiz.username !== username.toLowerCase()) {
        return res.status(403).json({ error: 'Không có quyền xóa' });
      }

      const result = await quizzes.deleteOne({ _id: new ObjectId(id) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Không tìm thấy bài thi' });
      }

      return res.status(200).json({ message: 'Xóa thành công' });
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