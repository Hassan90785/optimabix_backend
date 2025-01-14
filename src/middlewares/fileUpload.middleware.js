import multer from 'multer';
import path from 'path';

// Define allowed file types
const allowedFileTypes = ['.png', '.jpg', '.jpeg', '.pdf'];

// Define storage strategy (saving to `uploads/` folder)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
});

// File filter for validation
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedFileTypes.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PNG, JPG, JPEG, and PDF are allowed!'), false);
    }
};

// Middleware instance with file size limit
const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
});

// Middleware for single and multiple file uploads
const singleFileUpload = upload.single('file');
const multipleFileUpload = upload.array('files', 5); // Max 5 files

export { singleFileUpload, multipleFileUpload };
