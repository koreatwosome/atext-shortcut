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

// Parse atext file - supports multiple formats
function parseAtextFile(filePath) {
  try {
    // First try to read as UTF-8 text
    let fileContent;
    try {
      fileContent = fs.readFileSync(filePath, 'utf8');
    } catch (readError) {
      // If UTF-8 fails, read as binary
      const buffer = fs.readFileSync(filePath);
      fileContent = buffer.toString('utf8');
    }
    
    const ext = path.extname(filePath).toLowerCase();
    let shortcuts = [];
    
    // Try binary aText format (new format with embedded JSON)
    if (ext === '.atext') {
      try {
        // Read as buffer for binary parsing
        const buffer = fs.readFileSync(filePath);
        
        // Find all abbreviations with pattern "1":["..."]
        let abbrPos = 0;
        const abbreviations = [];
        
        while (true) {
          const pattern = Buffer.from('"1":["');
          abbrPos = buffer.indexOf(pattern, abbrPos);
          if (abbrPos === -1) break;
          
          // Find closing "]
          const closePos = buffer.indexOf(Buffer.from('"]'), abbrPos);
          if (closePos === -1) break;
          
          const abbr = buffer.slice(abbrPos + pattern.length, closePos).toString('utf8');
          abbreviations.push({ abbr, pos: abbrPos });
          abbrPos = closePos + 1;
        }
        
        // Find all phrases with pattern "4":
        let phrasePos = 0;
        const phrases = [];
        
        while (true) {
          const pattern = Buffer.from('"4":');
          phrasePos = buffer.indexOf(pattern, phrasePos);
          if (phrasePos === -1) break;
          
          // Skip "4": and look for the actual text
          let textStart = phrasePos + pattern.length;
          
          // Skip quote and control characters
          while (textStart < buffer.length && (buffer[textStart] < 32 || buffer[textStart] === 34)) {
            textStart++;
          }
          
          // Collect printable characters until we hit control char or closing bracket
          let textEnd = textStart;
          const phraseBytes = [];
          
          while (textEnd < buffer.length) {
            const byte = buffer[textEnd];
            if (byte >= 32 && byte < 127 && byte !== 125) { // printable and not }
              phraseBytes.push(byte);
              textEnd++;
            } else if (phraseBytes.length > 0) {
              // We found some text, stop here
              break;
            } else {
              // Still looking for text
              textEnd++;
              if (textEnd - textStart > 20) break; // Give up after 20 bytes
            }
          }
          
          if (phraseBytes.length > 0) {
            const phrase = Buffer.from(phraseBytes).toString('utf8').trim();
            phrases.push({ phrase, pos: phrasePos });
          }
          
          phrasePos = textEnd;
        }
        
        // Match abbreviations with their phrases based on order
        for (let i = 0; i < Math.min(abbreviations.length, phrases.length); i++) {
          if (abbreviations[i].abbr && phrases[i].phrase) {
            shortcuts.push({
              abbreviation: abbreviations[i].abbr,
              fullExpression: phrases[i].phrase
            });
          }
        }
        
        if (shortcuts.length > 0) {
          console.log(`Binary aText format: found ${shortcuts.length} shortcuts`);
          return shortcuts;
        }
      } catch (binaryError) {
        console.log('Not a binary aText format, trying other formats...', binaryError.message);
      }
    }
    
    // Try plist format (XML)
    if (ext === '.atext' || ext === '.plist' || fileContent.includes('<?xml')) {
      try {
        const data = plist.parse(fileContent);
        
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
        
        if (shortcuts.length > 0) {
          return shortcuts;
        }
      } catch (plistError) {
        console.log('Not a valid plist format, trying other formats...');
      }
    }
    
    // Try JSON format
    try {
      const data = JSON.parse(fileContent);
      
      // Support various JSON structures
      if (Array.isArray(data)) {
        // Direct array of shortcuts
        data.forEach(item => {
          if (item.abbreviation && (item.phrase || item.fullExpression)) {
            shortcuts.push({
              abbreviation: item.abbreviation,
              fullExpression: item.phrase || item.fullExpression
            });
          } else if (item.abbr && (item.text || item.expansion)) {
            shortcuts.push({
              abbreviation: item.abbr,
              fullExpression: item.text || item.expansion
            });
          }
        });
      } else if (data.shortcuts && Array.isArray(data.shortcuts)) {
        // JSON with shortcuts property
        data.shortcuts.forEach(item => {
          if (item.abbreviation && (item.phrase || item.fullExpression)) {
            shortcuts.push({
              abbreviation: item.abbreviation,
              fullExpression: item.phrase || item.fullExpression
            });
          }
        });
      }
      
      if (shortcuts.length > 0) {
        return shortcuts;
      }
    } catch (jsonError) {
      console.log('Not a valid JSON format, trying CSV...');
    }
    
    // Try CSV format (abbreviation,fullExpression)
    const lines = fileContent.split('\n');
    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith('#')) continue;
      
      // Try comma separator
      let parts = line.split(',');
      if (parts.length >= 2) {
        shortcuts.push({
          abbreviation: parts[0].trim(),
          fullExpression: parts.slice(1).join(',').trim()
        });
        continue;
      }
      
      // Try tab separator
      parts = line.split('\t');
      if (parts.length >= 2) {
        shortcuts.push({
          abbreviation: parts[0].trim(),
          fullExpression: parts.slice(1).join('\t').trim()
        });
      }
    }
    
    if (shortcuts.length > 0) {
      return shortcuts;
    }
    
    throw new Error('Unable to parse file. Supported formats: aText binary, plist (XML), JSON, CSV, or tab-separated text');
  } catch (error) {
    console.error('Error parsing file:', error);
    throw error;
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

// Routes - Support multiple file uploads
app.post('/api/upload', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    let allShortcuts = [];
    const fileResults = [];
    
    for (const file of req.files) {
      try {
        const shortcuts = parseAtextFile(file.path);
        allShortcuts = allShortcuts.concat(shortcuts);
        
        fileResults.push({
          filename: file.originalname,
          success: true,
          count: shortcuts.length
        });
        
        console.log(`Successfully parsed ${file.originalname}: ${shortcuts.length} shortcuts`);
      } catch (error) {
        fileResults.push({
          filename: file.originalname,
          success: false,
          error: error.message
        });
        console.error(`Failed to parse ${file.originalname}:`, error.message);
      }
      
      // Clean up uploaded file
      try {
        fs.unlinkSync(file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    
    // Remove duplicates based on abbreviation
    const uniqueShortcuts = [];
    const seen = new Set();
    
    for (const shortcut of allShortcuts) {
      const key = shortcut.abbreviation.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        uniqueShortcuts.push(shortcut);
      }
    }
    
    res.json({ 
      success: true, 
      shortcuts: uniqueShortcuts,
      count: uniqueShortcuts.length,
      totalParsed: allShortcuts.length,
      filesProcessed: fileResults
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
