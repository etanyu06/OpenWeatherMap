#Creates Blueprint for Front-end UI
from flask import Blueprint, render_template, request, jsonify
from service.weather import forecast, alerts_by_state
from service.ai import outfit_from_now_and_hourly

ui_bp = Blueprint('ui', __name__, 
                   template_folder = 'templates',
                   static_folder = 'static',
                   static_url_path='/ui/static')

@ui_bp.get('/')
def home():
    return render_template('index.html')

@ui_bp.get('/api/weather')
def api_weather():
    #defaults loc to Irvine, CA
    lat = request.args.get('lat', '33.6846')
    lon = request.args.get('lon', '-117.8265')

    data = forecast(lat, lon)
    periods = data['periods']
    hourly = data['hourly'][:24]
    
    outfit = outfit_from_now_and_hourly(periods[0], hourly)

    return jsonify({
        'location': data['location'],
        'current': periods[0],
        'hourly': hourly,
        'outfit': outfit
    })

@ui_bp.get('/api/alerts')
def api_alerts():
    state = request.args.get('state', 'CA')
    feats = alerts_by_state(state)
    alerts = [{
        'event': f['properties'].get('event'),
        'headline': f['properties'].get('headline'),
        'severity': f['properties'].get('severity'),
        'effective': f['properties'].get('effective'),
        'ends': f['properties'].get('ends'),
    } for f in feats]
    return jsonify({'alerts': alerts})