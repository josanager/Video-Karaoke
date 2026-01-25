const fs = require('fs');
const path = require('path');

const txtPath = path.join(__dirname, '../public/lyrics.txt');
const jsonPath = path.join(__dirname, '../public/lyrics.json');

const rawText = fs.readFileSync(txtPath, 'utf8');

// REVERTED STRATEGY: Flatten everything.
// Split by any whitespace (newlines, spaces, tabs) and filter empty strings.
// This removes all paragraph structure and returns a single continuous stream of words.

const words = rawText.split(/\s+/).filter(w => w.length > 0);
const finalItems = [];

words.forEach(word => {
    finalItems.push({
        word: word,
        start: 0,
        end: 0,
        confidence: 0
    });
});

const lyricsJson = {
    duration: 153,
    lyrics: finalItems
};

fs.writeFileSync(jsonPath, JSON.stringify(lyricsJson, null, 2));
console.log(`Reset lyrics.json with ${finalItems.length} words (FLAT structure).`);
