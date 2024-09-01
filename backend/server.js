// backend/server.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const QRCode = require('qrcode');
const Jimp = require('jimp'); // Pour la manipulation des images
const path = require('path');
const fs = require('fs');
const archiver = require('archiver'); // Pour créer des fichiers ZIP

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

// Endpoint to generate QR codes
app.post('/generate-qrcode', upload.single('logo'), async (req, res) => {
  const { fields, contents, size, color, secure } = req.body;
  const logoPath = req.file ? req.file.path : null;

  try {
    const qrCodes = [];
    const zipPath = 'uploads/qrcodes.zip';
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);

    // Process each range
    for (const field of fields) {
      const range = generateRange(field.begin, field.end);
      for (const code of range) {
        const qrCodeData = `${contents}/${code}`;
        
        // Generate QR code
        const qrCodeImage = await generateQRCodeWithLogo(qrCodeData, size, color, logoPath);
        
        // Add QR code image to ZIP
        const qrCodeBuffer = Buffer.from(qrCodeImage.split(',')[1], 'base64');
        archive.append(qrCodeBuffer, { name: `QRCode_${code}.png` });
      }
    }

    // Finalize the ZIP file
    archive.finalize();

    // Wait for the ZIP file to be fully written before sending it
    output.on('close', () => {
      res.download(zipPath, 'qrcodes.zip', (err) => {
        if (err) {
          console.error('Erreur lors du téléchargement du fichier ZIP:', err);
        }
        // Clean up the ZIP file after download
        fs.unlink(zipPath, (err) => {
          if (err) console.error('Erreur lors de la suppression du fichier ZIP:', err);
        });
      });
    });

  } catch (error) {
    console.error('Erreur lors de la génération du QR code:', error);
    res.status(500).json({ error: 'Erreur lors de la génération du QR code' });
  }
});

// Function to generate QR code with optional logo
async function generateQRCodeWithLogo(text, size, color, logoPath) {
  const qrCodeBuffer = await QRCode.toBuffer(text, {
    width: parseInt(size, 10),
    color: {
      dark: color,
      light: '#FFFFFF'
    }
  });

  if (logoPath) {
    const qrImage = await Jimp.read(qrCodeBuffer);
    const logo = await Jimp.read(logoPath);
    logo.resize(qrImage.bitmap.width / 5, Jimp.AUTO); // Resize logo to fit

    // Calculate position for logo
    const x = qrImage.bitmap.width / 2 - logo.bitmap.width / 2;
    const y = qrImage.bitmap.height / 2 - logo.bitmap.height / 2;

    qrImage.composite(logo, x, y);

    return qrImage.getBase64Async(Jimp.MIME_PNG);
  } else {
    return `data:image/png;base64,${qrCodeBuffer.toString('base64')}`;
  }
}

// Function to generate range of values
function generateRange(begin, end) {
  const range = [];
  let start = parseInt(begin, 10);
  let finish = parseInt(end, 10);
  
  if (isNaN(start) || isNaN(finish)) {
    return range; // Return an empty list in case of error
  }
  
  for (let i = start; i <= finish; i++) {
    range.push(i.toString());
  }
  
  return range;
}

// Create uploads directory if not exists
if (!fs.existsSync('uploads')){
    fs.mkdirSync('uploads');
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
