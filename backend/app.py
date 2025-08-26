from flask import Flask, request, jsonify
from flask_cors import CORS
from tsp_solver import solve_tsp, get_distance
import openrouteservice
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

app = Flask(__name__)
CORS(app)

ORS_API_KEY = os.getenv("ORS_API_KEY")
client = openrouteservice.Client(key=ORS_API_KEY)

def get_coordinates(city_name):
    """Fetch coordinates (lon, lat) for a given city using ORS Geocoding API"""
    try:
        geocode = client.pelias_search(text=city_name)
        if geocode and "features" in geocode and geocode["features"]:
            coords = geocode["features"][0]["geometry"]["coordinates"]
            return {"name": city_name, "lng": coords[0], "lat": coords[1], "city": city_name}
        return None
    except Exception as e:
        print(f"Error fetching coordinates for {city_name}: {e}")
        return None

@app.route("/solve-tsp", methods=["POST"])
def solve():
    try:
        data = request.get_json()
        city_names_from_frontend = data.get("cities", [])
        route_type = data.get("routeType", "multi-city")

        if not city_names_from_frontend:
            return jsonify({"error": "No city names provided"}), 400

        locations_with_coords = []
        cities_for_tsp_solver = {}
        
        for name in city_names_from_frontend:
            coords_data = get_coordinates(name)
            if coords_data:
                locations_with_coords.append(coords_data)
                cities_for_tsp_solver[name] = (coords_data["lng"], coords_data["lat"])
            else:
                return jsonify({"error": f"Could not find coordinates for city: {name}"}), 400

        if len(locations_with_coords) < 2:
            return jsonify({"error": "Need at least 2 valid cities with coordinates"}), 400

        named_route_order, total_cost = solve_tsp(cities_for_tsp_solver)

        optimized_locations_full_data = []
        for city_name_in_order in named_route_order:
            found_loc = next((loc for loc in locations_with_coords if loc["name"] == city_name_in_order), None)
            if found_loc:
                optimized_locations_full_data.append(found_loc)
        
        original_distance_val = 0
        if len(locations_with_coords) > 1:
            for i in range(len(locations_with_coords) - 1):
                original_distance_val += get_distance(
                    client,
                    (locations_with_coords[i]["lng"], locations_with_coords[i]["lat"]),
                    (locations_with_coords[i+1]["lng"], locations_with_coords[i+1]["lat"])
                )
        original_distance_val = round(original_distance_val, 2)
        
        distance_saved = round(original_distance_val - total_cost, 2)
        percent_improvement = round((distance_saved / original_distance_val) * 100, 2) if original_distance_val > 0 else 0
        time_saved = round(distance_saved / 50 * 60, 2)
        fuel_saved = round(distance_saved / 12, 2)

        response_data = {
            "route": named_route_order,
            "totalDistance": round(total_cost, 2),
            "originalDistance": original_distance_val,
            "distanceSaved": distance_saved,
            "percentImprovement": percent_improvement,
            "timeSaved": time_saved,
            "fuelSaved": fuel_saved,
            "optimizedAt": datetime.utcnow().isoformat(),
            "optimizedLocations": optimized_locations_full_data,
            "originalLocations": locations_with_coords
        }

        return jsonify(response_data)

    except Exception as e:
        print(f"Backend error: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)