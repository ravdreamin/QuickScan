"""
Haversine formula for geofencing validation.
Computes the great-circle distance between two points on Earth
and checks whether the scan location is within the allowed radius.
"""

import math

# Earth's mean radius in meters (WGS-84)
_EARTH_RADIUS_M = 6_371_000.0


def haversine_distance(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """
    Calculate the great-circle distance in meters between two GPS coordinates.

    Uses the Haversine formula – numerically stable for short distances
    (which is the only case we care about for attendance geofencing).
    """
    lat1_r, lon1_r = math.radians(lat1), math.radians(lon1)
    lat2_r, lon2_r = math.radians(lat2), math.radians(lon2)

    dlat = lat2_r - lat1_r
    dlon = lon2_r - lon1_r

    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    return _EARTH_RADIUS_M * c


def is_within_radius(
    target_lat: float,
    target_lon: float,
    scan_lat: float,
    scan_lon: float,
    radius_meters: int,
) -> bool:
    """Return True if the scan point is within *radius_meters* of the target."""
    return haversine_distance(target_lat, target_lon, scan_lat, scan_lon) <= radius_meters
