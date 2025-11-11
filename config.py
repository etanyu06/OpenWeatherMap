import os

class Settings:
    #Environment mode:, 'development', 'production', etc.
    ENV = os.getenv('ENV', 'development')

    #Debug mode: enabled unless in production
    DEBUG = ENV != 'production'

    #User-Agent API restriction (weather.gov)
    APP_USER_AGENT = os.getenv(
        'APP_USER_AGENT',
        'OpenWeatherApp (ethankyu06@gmail.com)'
    )

#Instantiate one seeting object for global usage.
settings = Settings()