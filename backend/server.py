
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

LYRICS_FILE_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '../video/public/lyrics.json'))

@app.route('/save-lyrics', methods=['POST'])
def save_lyrics():
    try:
        data = request.json
        if not data:
            return jsonify({"error": "No data provided"}), 400
        
        # Write to file
        with open(LYRICS_FILE_PATH, 'w') as f:
            json.dump(data, f, indent=2)
            
        return jsonify({"success": True, "message": "Lyrics saved successfully"}), 200
    except Exception as e:
        print(f"Error saving lyrics: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print(f"Server running. Saving to: {LYRICS_FILE_PATH}")
    app.run(port=3001, debug=True)
