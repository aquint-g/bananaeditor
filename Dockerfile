# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /app

# Copy the dependencies file to the working directory
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application's code to the working directory
COPY . .

# Make port 8080 available to the world outside this container
ENV PORT 8080
EXPOSE 8080

# Define environment variables for the application
# These will be passed in from the Cloud Run service configuration
ENV GOOGLE_CLOUD_API_KEY ""
ENV GOOGLE_PROJECT_ID ""
ENV GOOGLE_REGION ""

# Run app.py when the container launches
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 server:app