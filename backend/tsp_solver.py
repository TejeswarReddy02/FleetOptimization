import numpy as np
import openrouteservice
from qiskit_optimization.applications import Tsp
from qiskit_optimization.converters import QuadraticProgramToQubo
from qiskit_optimization.algorithms import MinimumEigenOptimizer
from qiskit_algorithms import QAOA
from qiskit_algorithms.optimizers import COBYLA
from qiskit.primitives import Sampler
import os
from dotenv import load_dotenv
import math
import sys

# Load API key from .env file
load_dotenv()
ORS_API_KEY = os.getenv("ORS_API_KEY")

# Initialize ORS client
ors_client = openrouteservice.Client(key=ORS_API_KEY)

# Define a small epsilon for comparing coordinates (in degrees)
COORD_EPSILON = 1e-5 

def get_distance(client, start_coords, end_coords):
    """
    Fetches the driving distance between two coordinates using the ORS API.
    Handles cases where start and end coordinates are essentially the same.
    
    Args:
        client (openrouteservice.Client): An initialized ORS client.
        start_coords (tuple): (longitude, latitude) of the starting point.
        end_coords (tuple): (longitude, latitude) of the ending point.
        
    Returns:
        float: The distance in kilometers, or float('inf') if an error occurs.
    """
    if math.sqrt((start_coords[0] - end_coords[0])**2 + (start_coords[1] - end_coords[1])**2) < COORD_EPSILON:
        return 0.0

    try:
        route = client.directions(
            coordinates=[list(start_coords), list(end_coords)],
            profile="driving-car",
            format="json",
            # Increased radius to 5000 meters (5 km) for better snapping
            radiuses=[5000, 5000] 
        )
        if route and route["routes"]:
            return route["routes"][0]["summary"]["distance"] / 1000.0
        return float('inf')
    except Exception as e:
        print(f"Error fetching route from ORS: {e}")
        return float('inf')


def get_distance_matrix(city_coords):
    """
    Fetches a distance matrix from the ORS API for the given city coordinates.
    
    Args:
        city_coords (list): A list of city coordinates in [lon, lat] format.
    
    Returns:
        numpy.ndarray: A symmetric cost matrix of distances in meters, or None if an error occurs.
    """
    try:
        matrix = ors_client.distance_matrix(
            locations=city_coords,
            profile='driving-car',
            metrics=['distance'],
            units='m',
            # REMOVED: 'radiuses' is not a valid argument for distance_matrix in this ORS client version
        )
        if not matrix or 'distances' not in matrix or matrix['distances'] is None:
            print("ORS distance_matrix did not return valid 'distances' data.")
            return None

        distances = np.array(matrix['distances'])
        cost_matrix = (distances + distances.T) / 2
        return cost_matrix
    except Exception as e:
        print(f"Error fetching distance matrix from ORS: {e}")
        return None

def solve_tsp(cities: dict):
    """
    Solves the Traveling Salesperson Problem (TSP) for a given set of cities
    using the QAOA algorithm (quantum-inspired).
    
    Args:
        cities (dict): A dictionary mapping city names to their coordinates in (lon, lat) format.
    
    Returns:
        tuple: A tuple containing the named route (list of city names) and the total
               optimized distance in kilometers, or (None, float('inf')) if calculation fails.
    """
    city_names = list(cities.keys())
    city_coords_map = {name: coords for name, coords in cities.items()} # Map city name to (lng, lat)
    n = len(city_names)

    if n < 2:
        return city_names, 0.0 if n == 1 else float('inf')

    # FIX: Convert dict_values to a list before passing to get_distance_matrix
    cost_matrix_meters = get_distance_matrix(list(city_coords_map.values())) 
    if cost_matrix_meters is None:
        return None, float('inf')

    cost_matrix_km = cost_matrix_meters / 1000.0

    tsp = Tsp(cost_matrix_km)
    qp = tsp.to_quadratic_program()
    qubo = QuadraticProgramToQubo().convert(qp)

    optimizer = COBYLA(maxiter=50)
    sampler = Sampler()
    qaoa = QAOA(sampler=sampler, optimizer=optimizer, reps=1)
    meo = MinimumEigenOptimizer(qaoa)

    result = meo.solve(qubo)
    decoded_tour = tsp.interpret(result)
    
    if not isinstance(decoded_tour, list):
        decoded_tour = decoded_tour.tolist()

    def rotate_tour_to_start(tour_indices, start_city_index=0):
        if not tour_indices:
            return []
        if start_city_index in tour_indices:
            idx = tour_indices.index(start_city_index)
            return tour_indices[idx:] + tour_indices[:idx]
        return tour_indices 

    normalized_tour_indices = rotate_tour_to_start(decoded_tour, start_city_index=0)
    
    named_route = [city_names[i] for i in normalized_tour_indices]

    final_optimized_distance_km = 0.0
    if len(named_route) > 1:
        for i in range(len(named_route) - 1):
            start_city_name = named_route[i]
            end_city_name = named_route[i+1]
            
            start_coords = city_coords_map[start_city_name]
            end_coords = city_coords_map[end_city_name]
            
            dist = get_distance(ors_client, start_coords, end_coords)
            
            if math.isinf(dist):
                return None, float('inf')
            final_optimized_distance_km += dist

    return named_route, final_optimized_distance_km


def solve_tsp_classical(cities: dict):
    """
    Solves the Traveling Salesperson Problem (TSP) for a given set of cities
    using the Nearest Neighbor classical heuristic.
    
    Args:
        cities (dict): A dictionary mapping city names to their coordinates in (lon, lat) format.
    
    Returns:
        tuple: A tuple containing the named route (list of city names) and the total
               optimized distance in kilometers, or (None, float('inf')) if calculation fails.
    """
    city_names = list(cities.keys())
    # FIX: Convert dict_values to a list before passing to get_distance_matrix
    city_coords = list(cities.values()) 
    city_coords_map = {name: coords for name, coords in cities.items()} # Map city name to (lng, lat)
    n = len(city_names)

    if n < 2:
        return city_names, 0.0 if n == 1 else float('inf')

    cost_matrix_meters = get_distance_matrix(city_coords)
    if cost_matrix_meters is None:
        return None, float('inf')

    cost_matrix_km = cost_matrix_meters / 1000.0

    # Nearest Neighbor Algorithm Implementation
    start_city_idx = 0
    
    visited = [False] * n
    tour_indices = [start_city_idx]
    visited[start_city_idx] = True
    current_city_idx = start_city_idx
    
    total_cost_path = 0.0 

    for _ in range(n - 1):
        min_dist = float('inf')
        next_city_idx = -1

        for i in range(n):
            if not visited[i] and cost_matrix_km[current_city_idx][i] < min_dist:
                min_dist = cost_matrix_km[current_city_idx][i]
                next_city_idx = i
        
        if next_city_idx == -1:
            print(f"Warning: Nearest Neighbor could not find a path from {city_names[current_city_idx]}.")
            return None, float('inf')

        total_cost_path += min_dist
        current_city_idx = next_city_idx
        tour_indices.append(current_city_idx)
        visited[current_city_idx] = True

    named_route = [city_names[i] for i in tour_indices]

    final_classical_distance_km = 0.0
    if len(named_route) > 1:
        for i in range(len(named_route) - 1):
            start_city_name = named_route[i]
            end_city_name = named_route[i+1]
            
            start_coords = city_coords_map[start_city_name]
            end_coords = city_coords_map[end_city_name]
            
            dist = get_distance(ors_client, start_coords, end_coords)
            
            if math.isinf(dist):
                return None, float('inf')
            final_classical_distance_km += dist
    else:
        final_classical_distance_km = 0.0

    return named_route, final_classical_distance_km
