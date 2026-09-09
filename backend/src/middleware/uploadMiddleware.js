import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directories exist
const uploadDirs = [
  'uploads/employee-documents',
  'uploads/employee-documents/gs-certificates',
  'uploads/employee-documents/education-certificates',
  'uploads/employee-documents/police-reports',
  'uploads/employee-documents/general',
  'uploads/user-documents'
];

uploadDirs.forEach(dir => {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Storage configuration for employee documents
const employeeDocumentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const documentType = req.body.documentType || 'general';
    let destDir = 'uploads/employee-documents/general';
    
    if (documentType === 'gsCertificate') {
      destDir = 'uploads/employee-documents/gs-certificates';
    } else if (documentType === 'educationCertificates') {
      destDir = 'uploads/employee-documents/education-certificates';
    } else if (documentType === 'policeReport') {
      destDir = 'uploads/employee-documents/police-reports';
    }
    
    cb(null, destDir);
  },
  filename: function (req, file, cb) {
    const employeeId = req.params.id || req.body.employeeId || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${employeeId}-${baseName}-${timestamp}${ext}`);
  }
});

// File filter for employee documents
const employeeDocumentFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, PNG, DOC, and DOCX files are allowed.'), false);
  }
};

// Multer configuration for employee documents
export const employeeDocumentUpload = multer({
  storage: employeeDocumentStorage,
  fileFilter: employeeDocumentFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Single file upload
export const uploadEmployeeDocument = employeeDocumentUpload.single('document');

// Multiple files upload (for general documents)
export const uploadEmployeeDocuments = employeeDocumentUpload.array('documents', 5);

// Storage configuration for user documents
const userDocumentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/user-documents');
  },
  filename: function (req, file, cb) {
    const userId = req.params.id || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${userId}-${baseName}-${timestamp}${ext}`);
  }
});

// File filter for user documents
const userDocumentFilter = (req, file, cb) => {
  const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, PNG, DOC, and DOCX files are allowed.'), false);
  }
};

// Multer configuration for user documents
export const userDocumentUpload = multer({
  storage: userDocumentStorage,
  fileFilter: userDocumentFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  }
});

// Single file upload for user documents
export const uploadUserDocument = userDocumentUpload.single('document');