print("Starting import test...")
import mimetypes
print("Successfully imported mimetypes")
import os
print("Successfully imported os")
import io
print("Successfully imported io")
from flask import Flask, render_template, request, jsonify, send_file
print("Successfully imported flask")
import google.auth
print("Successfully imported google.auth")
# The following genai import is the most likely suspect
print("Attempting to import google.genai...")
from google import genai
print("Successfully imported google.genai")
from google.genai import types
print("Successfully imported google.genai.types")
print("All imports successful!")