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

# Load API key from .env file
load_dotenv()
ORS_API_KEY = os.getenv("ORS_API_KEY")

# Initialize ORS client
ors_client = openrouteservice.Client(key=ORS_API_KEY)

def get_distance(client, start_coords, end_coords):
    """
    Fetches the driving distance between two coordinates using the ORS API.
    
    Args:
        client (openrouteservice.Client): An initialized ORS client.
        start_coords (tuple): (longitude, latitude) of the starting point.
        end_coords (tuple): (longitude, latitude) of the ending point.
        
    Returns:
        float: The distance in kilometers, or float('inf') if an error occurs.
    """
    try:
        route = client.directions(
            coordinates=[list(start_coords), list(end_coords)],
            profile="driving-car",
            format="json"
        )
        if route and route["routes"]:
            return route["routes"][0]["summary"]["distance"] / 1000.0  # Return in km
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
        numpy.ndarray: A symmetric cost matrix of distances in meters.
    """
    try:
        matrix = ors_client.distance_matrix(
            locations=city_coords,
            profile='driving-car',
            metrics=['distance'],
            units='m'
        )
        distances = np.array(matrix['distances'])
        cost_matrix = (distances + distances.T) / 2
        return cost_matrix
    except Exception as e:
        print(f"Error fetching distance matrix from ORS: {e}")
        return None

def solve_tsp(cities: dict):
    """
    Solves the Traveling Salesperson Problem (TSP) for a given set of cities
    using the QAOA algorithm.
    
    Args:
        cities (dict): A dictionary mapping city names to their coordinates in (lon, lat) format.
    
    Returns:
        tuple: A tuple containing the named route (list of city names) and the total
               optimized distance in kilometers.
    """
    city_names = list(cities.keys())
    city_coords = [[lon, lat] for lon, lat in cities.values()]
    n = len(city_names)

    # Get the cost matrix from ORS in meters
    cost_matrix_meters = get_distance_matrix(city_coords)
    if cost_matrix_meters is None:
        return None, 0

    # Convert cost matrix to kilometers for TSP application
    cost_matrix_km = cost_matrix_meters / 1000.0

    # QAOA setup
    tsp = Tsp(cost_matrix_km)
    qp = tsp.to_quadratic_program()
    qubo = QuadraticProgramToQubo().convert(qp)

    optimizer = COBYLA(maxiter=50) # Keep maxiter reasonable for quick execution
    sampler = Sampler()
    qaoa = QAOA(sampler=sampler, optimizer=optimizer, reps=1)
    meo = MinimumEigenOptimizer(qaoa)

    # Solve the QUBO
    result = meo.solve(qubo)
    
    # Interpret the result to get the optimized tour (indices)
    decoded_tour = tsp.interpret(result)
    
    # Ensure decoded_tour is a list for consistent processing
    if not isinstance(decoded_tour, list):
        decoded_tour = decoded_tour.tolist()

    # Normalize the tour to always start from the first city in the input list (index 0)
    def rotate_tour_to_start(tour_indices, start_city_index=0):
        if start_city_index in tour_indices:
            idx = tour_indices.index(start_city_index)
            return tour_indices[idx:] + tour_indices[:idx]
        return tour_indices

    normalized_tour_indices = rotate_tour_to_start(decoded_tour, start_city_index=0)
    
    # Add the starting city again to close the cycle for the final displayed route
    normalized_tour_indices_cycle = normalized_tour_indices + [normalized_tour_indices[0]]

    # Map indices back to city names
    named_route = [city_names[i] for i in normalized_tour_indices_cycle]

    # The result.fval is the optimized cost in the unit of the input cost_matrix (kilometers)
    final_optimized_distance_km = result.fval

    # Return the named route and the total optimized distance in kilometers
    return named_route, final_optimized_distance_km