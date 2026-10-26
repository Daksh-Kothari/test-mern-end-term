const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png|gif|svg|pdf|txt|csv|json|md|doc|docx|xls|xlsx|zip|tar|gz/;
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  
  if (allowedExtensions.test(ext)) {
    return cb(null, true);
  }
  cb(new Error('Invalid file type. Allowed: Images, PDF, Docs, Code/Text, Archives.'));
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: fileFilter
});

module.exports = upload;
