import traceback
import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from reviewer import review_code

app = Flask(__name__, static_folder=None)
CORS(app)

@app.route("/review", methods=["POST"])
def review():
    try:
        data = request.get_json()
        code = data.get("code", "")
        dimensions = data.get("dimensions", ["bug", "performance", "security", "readability"])
        result = review_code(code, dimensions)
        return jsonify(result)
    except Exception as e:
        print("=== ERROR ===")
        traceback.print_exc()
        return jsonify({
            "summary": f"服务器错误: {str(e)}",
            "issues": [],
        })


# 托管前端
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")

@app.route("/")
def index():
    return send_from_directory(frontend_dir, "index.html")

@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(frontend_dir, filename)


if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=False)
