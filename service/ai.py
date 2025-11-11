'''
This file can be changed to switch from internal
to external dependecy as I don't have to funds for
an AI API service, this will be internal and have 
preset responses for suggestions to users.
'''
from typing import Dict, Any, List

def outfit_from_now_and_hourly(now_period: Dict[str, Any],
                               hourly_periods: List[Dict[str, Any]]) -> Dict[str, Any]:
    '''
    Turns current and future weather into outfit advice for users.
    Inputs: NWS period dicts Ex:(degrees F, windSpeed like '10 to 20 mph').
    Returns: {'headline': str, 'items': [str], 'tips': [str]}
    '''
    temp_f = now_period.get('temperature')
    short = (now_period.get('shortForecast') or '').lower()
    wind_str = now_period.get("windSpeed") or ''
    wind_mph = _parse_wind_mph(wind_str)
    pop_6hr = _max_pop(hourly_periods[:6]) #for proabability of next 6 hours-ish

    items: List[str] = []
    tips: List[str] = []

    #temperature set in degrees F
    #adjust this section for difference clothing suggestions.
    t = temp_f if isinstance(temp_f, (int, float)) else 70
    if t < 23: 
        items += ["heavy coats", "thermal layers", "scarf", "gloves", "beanie", "thick hoodie"]
    elif t < 54:
        items += ["warm coat", "sweater", "scarf", "hoodie", "gloves (maybe)"]
    elif t < 70:
        items += ["light jacket", "long sleeves", "hoodie", "layer short /w long sleeve"]
    elif t < 80:
        items += ["t-shirts", "light long sleeves", "light jacket (maybe)"]
    else:
        items += ["short-sleeves", "tank tops", "t-shirts"]

    #Rain Conditions
    if 'rain' in short or pop_6hr > 0.40:
        items += ["waterproof clothing", "umbrella", "water-shoes"]
    if 'snow' in short:
        items += ["water-shoes", "snowpants"]
    
    #Wind Conditions
    if wind_mph >= 18:
        tips.append("Windy! Suggestion: Add windproof layer.")

    #Heat/Cold Warning
    if t >= 90:
        tips.append("Potential Heat Warning!!! Drink lots of water and choose breathable clothing.")
    if t <= 32:
        tips.append("Potential Freeze Warning!!! Layer up and stay warm!")

    headline = _make_headline(now_period, pop_6hr)

    return {
        'headline': headline,
        'items': sorted(set(items)),
        'tips': tips
    }

def _max_pop(hours: List[Dict[str, Any]]) -> float:
    '''
    Returns max probability of precipitation from hourly periods.
    '''
    vals = []
    for h in hours:
        v = (h.get('probabilityOfPrecipitation') or {}).get('value')
        if v is not None:
            try:
                vals.append(float(v) / 100.0)
            except (TypeError, ValueError):
                pass
    return max(vals) if vals else 0.0

def _parse_wind_mph(wind_speed: str) -> int:
    '''
    Parse NWS windSpeed such as '10 mph', '5 to 20 mph', '15 to 30 mph'.
    Returns: Observed max mph as int, or 0 if fails.
    '''
    if not wind_speed:
        return 0
    
    #Takes all wind speeds and gets max (safest for users as overpreparing is better than underpreparing)
    nums = []
    token = ''
    for ch in wind_speed:
        if ch.isdigit():
            token += ch
        else:
            if token:
                try:
                    nums.append(int(token))
                except ValueError:
                    pass
                token = ''
    if token:
        try:
            nums.append(int(token))
        except ValueError:
            pass
    
    return max(nums) if nums else 0

def _make_headline(now_period: Dict[str, Any], pop_6hr: float) -> str:
    '''
    Creates headline summary of the weather conditions.
    '''
    short = now_period.get('shortForecast') or ''
    temp_f = now_period.get('temperature')
    temp_part = f'around {temp_f}F' if isinstance(temp_f, (int, float)) else ''
    precip_part = ''
    if pop_6hr > 0.6:
        precip_part = ' -- high chance of rain: ' + round(pop_6hr*100) + '%'
    elif pop_6hr > 0.3:
        precip_part = ' -- possible rain: ' + round(pop_6hr*100) + '%'
    joiner = ' -- ' if temp_part else ''
    return f'{short}{joiner}{temp_part}{precip_part}'