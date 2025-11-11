import requests
from typing import Dict, Any
from config import settings

BASE = 'https://api.weather.gov'
HEADERS = {
    'User-Agent': settings.APP_USER_AGENT,
    'Accept': 'application/geo+json',
}

def _get(url: str, params: Dict[str, Any] | None = None) -> Dict[str, Any]:
    '''
    Helper function to get JSON with NWS headers.
    '''
    resp = requests.get(url, params=params, headers=HEADERS, timeout=12)
    resp.raise_for_status()
    return resp.json()

def points(lat: float | str, lon: float | str) -> Dict[str, Any]:
    '''
    Resolves forecasts endpoints for given latitude/longitude via /points.
    Returns: Properties Dict (forecast URLs, relative locations).
    '''
    data = _get(f'{BASE}/points/{lat},{lon}')
    return data['properties']

def forecast(lat: float | str, lon: float | str) -> Dict[str, Any]:
    '''
    Fetch human-readable forecast (12-hour).
    Returns: {location, periods, hourly}
    '''
    p = points(lat, lon)

    #User-Friendly name
    loc_props = p['relativeLocation']['properties']
    location = f"{loc_props['city']}, {loc_props['state']}"

    #Forecast endpoints discovered from points
    fc_url = p['forecast']              #12-hour format /w txt summary
    hourly_url = p['forecastHourly']    #hourly format

    fc = _get(fc_url)['properties']['periods']
    hourly = _get(hourly_url)['properties']['periods']

    return {'location': location, 'periods': fc, 'hourly': hourly}

def alerts_by_state(state_code: str) -> list[Dict[str, Any]]:
    '''
    Fetch active alerts for given state (e.g., 'CA', 'NY').
    Returns: List of GeoJSON features (alerts).
    '''
    data = _get(f'{BASE}/alerts/active', params = {'area': state_code.upper()})
    return data.get('features', [])
