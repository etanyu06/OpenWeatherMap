from flask import Flask
from config import settings
from ui import ui_bp

def create_app():
    '''
    Creates and configure Flask application.
    '''
    app = Flask(__name__)

    app.config.update(
        ENV = settings.ENV,
        DEBUG = settings.DEBUG
    )

    app.register_blueprint(ui_bp)

    return app

if __name__ == '__main__':
    #Runs the Flask development server
    app = create_app()
    app.run(debug = settings.DEBUG)