const allowedFileTypes = ['image/jpeg', 'image/png'];

const validateFile = (file) => {
    if (!allowedFileTypes.includes(file.mimetype)) {
        throw new Error('Invalid file type');
    }
    if (file.size > 2 * 1024 * 1024) { // Max size 2MB
        throw new Error('File size exceeds limit');
    }
    return true;
};

export default validateFile;
