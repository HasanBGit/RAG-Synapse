/**
 * Citation Parser Utility
 * Parses citation format [source:filename | page X | chunk Y] from text
 * and replaces them with numbered badges [1], [2], etc.
 */

/**
 * Parse citations from text and replace with numbered badges
 * @param {string} text - Text containing citations in format [source:filename | page X | chunk Y]
 * @param {Array} sources - Array of source objects from backend
 * @returns {Object} - { text: string with badges, citations: Array of citation objects }
 */
export function parseCitations(text, sources = []) {
  if (!text) return { text: '', citations: [] };

  // Regex to match citation format: [source:filename | page X | chunk Y]
  const citationRegex = /\[source:([^|]+)\s*\|\s*page\s+(\d+)\s*\|\s*chunk\s+(\d+)\]/gi;
  
  const citations = [];
  const citationMap = new Map(); // Map to track unique citations and their numbers
  
  // Find all citations and extract information
  let match;
  const matches = [];
  while ((match = citationRegex.exec(text)) !== null) {
    matches.push({
      fullMatch: match[0],
      filename: match[1].trim(),
      page: parseInt(match[2], 10),
      chunk: parseInt(match[3], 10),
      index: match.index
    });
  }

  // Create citation map and assign numbers
  matches.forEach((match) => {
    const key = `${match.filename}|${match.page}|${match.chunk}`;
    
    if (!citationMap.has(key)) {
      const citationNumber = citationMap.size + 1;
      citationMap.set(key, citationNumber);
      
      // Try to find matching source from backend sources array
      const source = sources.find(s => 
        s.file_name === match.filename && 
        s.page === match.page && 
        s.chunk_id === match.chunk
      );
      
      citations.push({
        number: citationNumber,
        filename: match.filename,
        page: match.page,
        chunk: match.chunk,
        source: source || null
      });
    }
  });

  // Replace citations with numbered badges
  let processedText = text;
  matches.reverse().forEach((match) => {
    const key = `${match.filename}|${match.page}|${match.chunk}`;
    const citationNumber = citationMap.get(key);
    processedText = processedText.substring(0, match.index) + 
                   `[${citationNumber}]` + 
                   processedText.substring(match.index + match.fullMatch.length);
  });

  return {
    text: processedText,
    citations: citations.sort((a, b) => a.number - b.number)
  };
}

/**
 * Extract citation information from a citation badge click
 * @param {number} citationNumber - The citation number clicked
 * @param {Array} citations - Array of citation objects from parseCitations
 * @returns {Object|null} - Citation object or null if not found
 */
export function getCitationByNumber(citationNumber, citations) {
  return citations.find(c => c.number === citationNumber) || null;
}
