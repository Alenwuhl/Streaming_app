# StreamingApp

## Overview
StreamingApp is a personal project developed to explore the creation of a streaming platform. As a personal project, it does not feature a sophisticated design but focuses on functionality, scalability, and clean code practices.

This is the **Version 1** of the app, which is built using the following technologies:
- **Backend**: Django (Python)
- **Frontend**: HTML, CSS, and JavaScript

The app leverages:
- **Daphne** for running the ASGI server
- **Celery** for background task management

## Features

### Core Functionalities
1. **User Authentication**
   - User registration and login.
   - User profile with the ability to follow and unfollow other users.

2. **Streaming**
   - Create, manage, and watch live streams.
   - Recorded streams are saved and accessible for later viewing.

3. **Real-time Chat**
   - Integrated live chat during streams for hosts and viewers.

4. **Surveys** (Under Development)
   - Hosts can create surveys for viewers during live streams.
   - Not fully functional in Version 1.

5. **Screen Sharing** (Under Development)
   - Hosts can share their screen with viewers.
   - Currently, only the host can initiate screen sharing, but viewers cannot view the shared screen reliably.

### Additional Features
- **Search and Filter Streams**
  - View all active streams or filter by followed users.
- **Responsive Design**
  - Basic responsive elements for better usability on various devices.

## Architecture
The app is designed with a focus on:
- **Scalability**: Modular structure for future enhancements.
- **Clean Code**: Emphasis on readability and maintainability.

## Demo Video
A demo video showcasing the app's functionality can be viewed [here](https://youtu.be/yP1M6SmaTRM).

## Setup Instructions

### Prerequisites
- Python 3.8+
- Django 4.x
- Daphne
- Celery
- Redis (for Celery task queue)
- Node.js (for frontend dependencies if required)

### Steps to Run
1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd streamingapp
   ```

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Apply Migrations**
   ```bash
   python manage.py migrate
   ```

4. **Run Redis Server**
   Ensure that Redis is installed and running:
   ```bash
   redis-server
   ```

5. **Start Celery Worker**
   ```bash
   celery -A streaming_project worker --loglevel=info
   ```

6. **Run Daphne Server**
   ```bash
   daphne -b 127.0.0.1 -p 8000 streaming_project.asgi:application
   ```

7. **Enable HTTPS**
   To launch the app securely, configure HTTPS on your server. You can use tools like Let's Encrypt to generate SSL certificates and update your Daphne or proxy server configuration to support HTTPS. This ensures a secure connection for users accessing the app.

8. **Access the App**
   Visit `https://localhost:8000` in your browser.

## Known Issues
- **Screen Sharing**: Only partially functional for the host; viewers may not see the shared screen.
- **Surveys**: Surveys can be created, but their functionality is incomplete.

## Future Improvements
- Enhance the functionality of surveys and screen sharing.
- Refine the user interface and design.
- Add more robust error handling and testing.

## License
This project is for personal use and learning purposes. It is not intended for production deployment.
