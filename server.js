const express = require('express');
const multer = require('multer');
const cors = require('cors');
const axios = require('axios');
const nodemailer = require('nodemailer');
const plist = require('plist');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Multer configuration for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Parse atext file
function parseAtextFile(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const data = plist.parse(fileContent);
    
    const shortcuts = [];
    if (data && data.shortcuts && Array.isArray(data.shortcuts)) {
      data.shortcuts.forEach(shortcut => {
        if (shortcut.abbreviation && shortcut.phrase) {
          shortcuts.push({
            abbreviation: shortcut.abbreviation,
            fullExpression: shortcut.phrase
          });
        }
      });
    }
    
    return shortcuts;
  } catch (error) {
    console.error('Error parsing atext file:', error);
    throw new Error('Failed to parse atext file');
  }
}

// Generate examples using Claude API
async function generateExamples(fullExpression, count, claudeApiKey) {
  try {
    const response = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: `Generate exactly ${count} natural English example sentences using the phrase: "${fullExpression}". 
            
Requirements:
- Each sentence should be practical and conversational
- Number each example (1., 2., 3., etc.)
- Show diverse usage contexts
- Keep sentences clear and natural

Format:
1. [Example sentence 1]
2. [Example sentence 2]
3. [Example sentence 3]
...`
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeApiKey,
          'anthropic-version': '2023-06-01'
        }
      }
    );

    if (response.data && response.data.content && response.data.content[0]) {
      return response.data.content[0].text;
    } else {
      throw new Error('Invalid response from Claude API');
    }
  } catch (error) {
    console.error('Error generating examples:', error.response?.data || error.message);
    throw new Error('Failed to generate examples: ' + (error.response?.data?.error?.message || error.message));
  }
}

// Send email
async function sendEmail(to, subject, body) {
  // For development, we'll use console.log
  // In production, configure with real SMTP settings
  console.log('Email would be sent to:', to);
  console.log('Subject:', subject);
  console.log('Body:', body);
  
  // Simulated email sending for demo purposes
  return {
    success: true,
    message: 'Email sent successfully (simulated)',
    details: {
      to: to,
      subject: subject,
      preview: body.substring(0, 100) + '...'
    }
  };
  
  /* Uncomment and configure for actual email sending
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-app-password'
    }
  });

  const info = await transporter.sendMail({
    from: '"aText Example Generator" <your-email@gmail.com>',
    to: to,
    subject: subject,
    text: body,
    html: body.replace(/\n/g, '<br>')
  });

  return info;
  */
}

// Routes
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const shortcuts = parseAtextFile(req.file.path);
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    res.json({ 
      success: true, 
      shortcuts: shortcuts,
      count: shortcuts.length 
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate', async (req, res) => {
  try {
    const { fullExpression, count, claudeApiKey } = req.body;

    if (!fullExpression) {
      return res.status(400).json({ error: 'Full expression is required' });
    }

    if (!claudeApiKey) {
      return res.status(400).json({ error: 'Claude API key is required' });
    }

    if (![3, 5, 7].includes(count)) {
      return res.status(400).json({ error: 'Count must be 3, 5, or 7' });
    }

    const examples = await generateExamples(fullExpression, count, claudeApiKey);

    res.json({ 
      success: true, 
      examples: examples,
      fullExpression: fullExpression,
      count: count
    });
  } catch (error) {
    console.error('Generate error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/send-email', async (req, res) => {
  try {
    const { email, subject, body } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email address is required' });
    }

    if (!body) {
      return res.status(400).json({ error: 'Email body is required' });
    }

    const result = await sendEmail(
      email, 
      subject || 'English Example Sentences from aText', 
      body
    );

    res.json({ 
      success: true, 
      message: 'Email sent successfully',
      details: result
    });
  } catch (error) {
    console.error('Send email error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
