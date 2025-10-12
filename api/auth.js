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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const db = await connectDB();
    const users = db.collection('users');

    // POST - Tạo hoặc đăng nhập user
    if (req.method === 'POST') {
      const { username, action } = req.body;

      // Validate username
      if (!username || typeof username !== 'string') {
        return res.status(400).json({ error: 'Username không hợp lệ' });
      }

      const cleanUsername = username.trim().toLowerCase();

      // Kiểm tra độ dài
      if (cleanUsername.length < 5 || cleanUsername.length > 10) {
        return res.status(400).json({ error: 'Username phải từ 5-10 ký tự' });
      }

      // Kiểm tra không có khoảng trắng và dấu
      const validPattern = /^[a-z0-9]+$/;
      if (!validPattern.test(cleanUsername)) {
        return res.status(400).json({ 
          error: 'Username chỉ được chứa chữ cái không dấu và số, không có khoảng trắng' 
        });
      }

      // Tìm user
      const existingUser = await users.findOne({ username: cleanUsername });

      if (action === 'register') {
        // Đăng ký user mới
        if (existingUser) {
          return res.status(409).json({ error: 'Username đã tồn tại' });
        }

        const newUser = {
          username: cleanUsername,
          createdAt: new Date(),
          lastLogin: new Date()
        };

        await users.insertOne(newUser);
        return res.status(201).json({ 
          success: true, 
          username: cleanUsername,
          message: 'Đăng ký thành công'
        });
      } else {
        // Đăng nhập
        if (!existingUser) {
          return res.status(404).json({ error: 'Username không tồn tại' });
        }

        // Cập nhật lastLogin
        await users.updateOne(
          { username: cleanUsername },
          { $set: { lastLogin: new Date() } }
        );

        return res.status(200).json({ 
          success: true, 
          username: cleanUsername,
          message: 'Đăng nhập thành công'
        });
      }
    }

    // GET - Kiểm tra username có tồn tại không
    if (req.method === 'GET') {
      const { username } = req.query;
      
      if (!username) {
        return res.status(400).json({ error: 'Thiếu username' });
      }

      const cleanUsername = username.trim().toLowerCase();
      const user = await users.findOne({ username: cleanUsername });

      return res.status(200).json({ 
        exists: !!user,
        username: cleanUsername
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Auth Error:', error);
    return res.status(500).json({ 
      error: 'Lỗi server', 
      message: error.message
    });
  }
}