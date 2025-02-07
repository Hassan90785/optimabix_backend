// Utility function for formatting category and brand names
export const formatName = (name) => {
    if (!name) return '';
    return name
        .trim() // Remove leading and trailing spaces
        .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
        .split(' ') // Split words
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize each word
        .join(' '); // Rejoin words with spaces
};
