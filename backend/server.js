// backend/server.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage });

// Endpoint to generate QR code
app.post('/generate-qrcode', upload.single('logo'), async (req, res) => {
  const { fields, contents, size, color, secure } = req.body;
  const logo = req.file ? req.file.path : null;

  try {
    const qrCodeData = contents;

    // Generate QR code
    const qrCodeImageUrl = await QRCode.toDataURL(qrCodeData, {
      width: parseInt(size, 10),
      color: {
        dark: color,
        light: '#FFFFFF'
      }
    });

    res.json({ qrCodeImageUrl });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la génération du QR code' });
  }
});

// Create uploads directory if not exists
if (!fs.existsSync('uploads')){
    fs.mkdirSync('uploads');
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
