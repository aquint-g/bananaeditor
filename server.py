import mimetypes
mimetypes.add_type('application/javascript', '.js')

import os
import io
from flask import Flask, render_template, request, jsonify, send_file
from google import genai
from google.genai import types
import google.auth

# --- Gemini Nano Banana Model ---
NANO_BANANA_MODEL_NAME = "gemini-2.5-flash-image-preview"
#DO NOT EDIT THIS CODE, THIS IS VERY SPECIFIC AND SHOULD NOT CHANGE. DO NOT CHANGE THE IMPORTS, IF YOU NEED TO EDIT IT, CREATE A NEW FUNCTION THAT USES THE EXACT SAME CODE AS THIS ONE.

def create_masterpiece(
    image_paths: list[str],
    prompt: str,
):
    """
    Creates a masterpiece using the Google Generative AI model, generating one image.
    """
    api_key = os.environ.get("GOOGLE_CLOUD_API_KEY")
    print(f"--- DEBUG: API Key found in env: {'Y' if api_key else 'N'}")

    try:
        credentials, project_id = google.auth.default()
        print(f"--- DEBUG: ADC Credentials found. Project: {project_id}")
        if hasattr(credentials, 'service_account_email'):
            print(f"--- DEBUG: ADC Service Account: {credentials.service_account_email}")
    except google.auth.exceptions.DefaultCredentialsError:
        print("--- DEBUG: ADC Credentials not found.")

    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set.")

    client = genai.Client(vertexai=True,project='banana-canvas-editor',location='global')

    contents = _load_image_parts(image_paths)
    contents.append(genai.types.Part.from_text(text=prompt))

    generate_content_config = types.GenerateContentConfig(
        response_modalities=["IMAGE", "TEXT"],
    )

    stream = client.models.generate_content_stream(
        model=NANO_BANANA_MODEL_NAME,
        contents=contents,
        config=generate_content_config,
    )

    return _process_api_stream_response(stream)


def remove_background_from_image(
    image_paths: list[str],
    prompt: str,
):
    """
    Removes the background from an image using the Google Generative AI model.
    """
    api_key = os.environ.get("GOOGLE_CLOUD_API_KEY")
    print(f"--- DEBUG: API Key found in env: {'Y' if api_key else 'N'}")

    try:
        credentials, project_id = google.auth.default()
        print(f"--- DEBUG: ADC Credentials found. Project: {project_id}")
        if hasattr(credentials, 'service_account_email'):
            print(f"--- DEBUG: ADC Service Account: {credentials.service_account_email}")
    except google.auth.exceptions.DefaultCredentialsError:
        print("--- DEBUG: ADC Credentials not found.")

    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set.")

    client = genai.Client(vertexai=True,project='banana-canvas-editor',location='global')

    contents = _load_image_parts(image_paths)
    contents.append(genai.types.Part.from_text(text=prompt))

    generate_content_config = types.GenerateContentConfig(
        response_modalities=["IMAGE", "TEXT"],
    )

    stream = client.models.generate_content_stream(
        model=NANO_BANANA_MODEL_NAME,
        contents=contents,
        config=generate_content_config,
    )

    return _process_api_stream_response(stream)


def remix_images(
    image_paths: list[str],
    prompt: str,
):
    """
    Remixes images using the Google Generative AI model, generating one image.
    """
    api_key = os.environ.get("GOOGLE_CLOUD_API_KEY")
    print(f"--- DEBUG: API Key found in env: {'Y' if api_key else 'N'}")

    try:
        credentials, project_id = google.auth.default()
        print(f"--- DEBUG: ADC Credentials found. Project: {project_id}")
        if hasattr(credentials, 'service_account_email'):
            print(f"--- DEBUG: ADC Service Account: {credentials.service_account_email}")
    except google.auth.exceptions.DefaultCredentialsError:
        print("--- DEBUG: ADC Credentials not found.")

    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set.")

    client = genai.Client(vertexai=True,project='banana-canvas-editor',location='global')

    contents = _load_image_parts(image_paths)
    contents.append(genai.types.Part.from_text(text=prompt))

    generate_content_config = types.GenerateContentConfig(
        response_modalities=["IMAGE", "TEXT"],
    )

    stream = client.models.generate_content_stream(
        model=NANO_BANANA_MODEL_NAME,
        contents=contents,
        config=generate_content_config,
    )

    return _process_api_stream_response(stream)


def _load_image_parts(image_paths: list[str]) -> list[types.Part]:
    """Loads image files and converts them into GenAI Part objects."""
    parts = []
    for image_path in image_paths:
        with open(image_path, "rb") as f:
            image_data = f.read()
        mime_type = _get_mime_type(image_path)
        parts.append(
            types.Part(inline_data=types.Blob(data=image_data, mime_type=mime_type))
        )
    return parts


def _process_api_stream_response(stream):
    """
    Processes the streaming response from the GenAI API, returning the first image found.
    """
    for chunk in stream:
        if chunk.candidates and chunk.candidates[0].content and chunk.candidates[0].content.parts:
            for part in chunk.candidates[0].content.parts:
                if part.inline_data and part.inline_data.data:
                    return {
                        "data": part.inline_data.data,
                        "mime_type": part.inline_data.mime_type,
                    }
                elif part.text:
                    print(part.text)
    return None


def _get_mime_type(file_path: str) -> str:
    """Guesses the MIME type of a file based on its extension."""
    mime_type, _ = mimetypes.guess_type(file_path)
    if mime_type is None:
        raise ValueError(f"Could not determine MIME type for {file_path}")
    return mime_type

# --- Flask App ---

app = Flask(__name__, static_folder='static', template_folder='.')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/remove_background', methods=['POST'])
def remove_background():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    # Create a temporary directory if it doesn't exist
    temp_dir = 'temp_uploads'
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)

    temp_filepath = os.path.join(temp_dir, file.filename)

    try:
        file.save(temp_filepath)

        # The prompt is fixed for this operation
        prompt = "Replace the background of this image with the solid color magenta (RGB: 255, 0, 255)."
        result = remove_background_from_image([temp_filepath], prompt)

        if result:
            return send_file(
                io.BytesIO(result['data']),
                mimetype=result['mime_type']
            )
        else:
            return jsonify({"error": "Failed to remove background"}), 500

    except Exception as e:
        print(f"Error during background removal: {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        # Clean up the uploaded file
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)


@app.route('/remix', methods=['POST'])
def remix():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    prompt = request.form.get('prompt')

    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400

    # Create a temporary directory if it doesn't exist
    temp_dir = 'temp_uploads'
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)

    temp_filepath = os.path.join(temp_dir, file.filename)

    try:
        file.save(temp_filepath)

        remix_result = remix_images([temp_filepath], prompt)

        if remix_result:
            return send_file(
                io.BytesIO(remix_result['data']),
                mimetype=remix_result['mime_type']
            )
        else:
            return jsonify({"error": "Failed to generate image"}), 500

    except Exception as e:
        print(f"Error during remix: {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        # Clean up the uploaded file
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)


@app.route('/masterpiece', methods=['POST'])
def masterpiece():
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    prompt = request.form.get('prompt')

    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if not prompt:
        return jsonify({"error": "No prompt provided"}), 400

    # Create a temporary directory if it doesn't exist
    temp_dir = 'temp_uploads'
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)

    temp_filepath = os.path.join(temp_dir, file.filename)

    try:
        file.save(temp_filepath)

        masterpiece_result = create_masterpiece([temp_filepath], prompt)

        if masterpiece_result:
            return send_file(
                io.BytesIO(masterpiece_result['data']),
                mimetype=masterpiece_result['mime_type']
            )
        else:
            return jsonify({"error": "Failed to generate image"}), 500

    except Exception as e:
        print(f"Error during masterpiece creation: {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        # Clean up the uploaded file
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)


if __name__ == '__main__':
    app.run(debug=True)
