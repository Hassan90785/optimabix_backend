const successResponse = (res, data, message = 'Operation successful') => {
    return res.status(200).json({ success: true, message, data });
};

const errorResponse = (res, error, statusCode = 500) => {
    return res.status(statusCode).json({ success: false, message: error || 'An error occurred' });
};

export { successResponse, errorResponse };
