
from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error


app = Flask(__name__)
# Enable CORS to allow requests from your frontend
CORS(app)

# --- IMPORTANT: Database Connection Details ---
# Replace these with your actual MySQL database credentials
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': 'ankit7486',
    'database': 'tasla'
}

# --- Create the Login API Endpoint ---
# This is where the frontend will send the email
@app.route('/login', methods=['POST'])
def login():
    # Get the email from the incoming JSON request
    data = request.get_json()
    email = data.get('email')

    # Check if email was provided
    if not email:
        return jsonify({"message": "Email is required."}), 400

    try:
        # Connect to the database
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True) # dictionary=True lets us get results as dictionaries

        # Query the database to find the user
        # Use a placeholder (%s) to prevent SQL injection
        sql = "SELECT * FROM users WHERE email = %s"
        cursor.execute(sql, (email,))
        
        user = cursor.fetchone() # Fetch one result

        if user:
            # User found
            print(f"User found: {email}")
            return jsonify({"message": "Login successful!", "user": user}), 200
        else:
            # User not found
            print(f"User not found: {email}")
            return jsonify({"message": "Email not found."}), 404

    except Error as e:
        print(f"Database error: {e}")
        return jsonify({"message": "Server error."}), 500
    finally:
        # Make sure to close the connection
        if conn.is_connected():
            cursor.close()
            conn.close()

# Start the server when the script is run
if __name__ == '__main__':
    app.run(debug=True, port=5000) # Flask runs on port 5000 by default