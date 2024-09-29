from flask import Flask, jsonify, request, render_template
import numpy as np
import random

app = Flask(__name__)

# Global variables for tracking KMeans state
dataset = []
centroids = []
clusters = []
iteration = 0
max_iterations = 10


def initialize_random(data, k):
    """ Randomly choose k centroids from the dataset """
    if len(data) == 0:
        raise ValueError("Empty dataset provided.")
    return random.sample(data, k)


def initialize_kmeans_plus_plus(data, k):
    """ Initialize centroids using the KMeans++ method """
    if len(data) == 0:
        raise ValueError("Empty dataset.")
    
    # Start with one random centroid
    centroids = [random.choice(data)]
    print(f"First centroid (KMeans++): {centroids}")
    
    for _ in range(1, k):
        # Calculate distances for every point to the nearest centroid
        distances = [min([np.linalg.norm(np.array(p) - np.array(c)) for c in centroids]) for p in data]
        
        # Ensure that distances are calculated correctly
        print(f"Distances for centroid {_}: {distances}")
        
        # Select a new centroid based on the weighted probability distribution
        new_centroid = random.choices(data, weights=distances, k=1)[0]
        centroids.append(new_centroid)
        print(f"New centroid added (KMeans++): {new_centroid}")
    
    print(f"Final centroids after KMeans++ initialization: {centroids}")
    return centroids


def initialize_farthest_first(data, k):
    """ Initialize centroids such that they are farthest apart """
    centroids = [random.choice(data)]  # Start with a random point
    for _ in range(1, k):
        farthest_point = max(data, key=lambda p: min([np.linalg.norm(np.array(p) - np.array(c)) for c in centroids]))
        centroids.append(farthest_point)
    return centroids


def assign_clusters(data, centroids):
    """ Assign each point to the nearest centroid """
    if len(centroids) == 0:
        raise ValueError("No centroids provided.")
    
    clusters = [[] for _ in centroids]
    for point in data:
        distances = [np.linalg.norm(np.array(point) - np.array(centroid)) for centroid in centroids]
        cluster_index = np.argmin(distances)
        clusters[cluster_index].append(point)
    return clusters


def recompute_centroids(clusters):
    """ Recompute centroids as the mean of the points in each cluster """
    new_centroids = [np.mean(cluster, axis=0).tolist() for cluster in clusters if len(cluster) > 0]
    return new_centroids


@app.route('/')
def index():
    """ Serve the main HTML page """
    return render_template('index.html')


@app.route('/generate_dataset', methods=['POST'])
def generate_dataset():
    """ Generate a new random dataset and store it globally """
    global dataset, iteration
    num_points = int(request.json['num_points'])
    dataset = np.random.rand(num_points, 2).tolist()  # Generate random 2D points
    iteration = 0  # Reset iteration
    print(f"New dataset generated with {num_points} points.")
    
    return jsonify({'dataset': dataset})  # Return the dataset to the frontend


@app.route('/start_kmeans', methods=['POST'])
def start_kmeans():
    """ Initialize KMeans with centroids and reset the step-through process """
    global centroids, clusters, iteration
    k = int(request.json['k'])
    init_method = request.json['init_method']

    print(f"Received initialization method: {init_method}")
    print(f"Received manual centroids nada aqui: {centroids}")
    print(f"Received initialization method: {init_method}, k = {k}")
    
    # Ensure dataset exists
    if len(dataset) == 0:
        return jsonify({'status': 'error', 'message': 'No dataset available. Please generate the dataset first.'}), 400
    
    # Handle manual centroids
    if init_method == 'manual':
        centroids = request.json.get('manual_centroids', [])
        print(f"Manual centroids provided: {centroids}")
        if len(centroids) != k:
            return jsonify({'status': 'error', 'message': 'Incorrect number of manual centroids.'}), 400
    else:
        # Other initialization methods
        if init_method == 'random':
            centroids = initialize_random(dataset, k)
        elif init_method == 'kmeans++':
            centroids = initialize_kmeans_plus_plus(dataset, k)
        elif init_method == 'farthest_first':
            centroids = initialize_farthest_first(dataset, k)

    # Assign initial clusters
    clusters = assign_clusters(dataset, centroids)
    iteration = 1  # Reset iteration
    
    return jsonify({'centroids': centroids, 'clusters': clusters})

@app.route('/step_kmeans', methods=['POST'])
def step_kmeans():
    global centroids, clusters, iteration, dataset
    k = int(request.json['k'])
    init_method = request.json['init_method']
    
    print(f"Step Through KMeans called with k={k}, init_method={init_method}")  # Debug log

    # Initialize KMeans if no centroids are available
    if len(centroids) == 0:
        print(f"No centroids found. Initializing centroids using {init_method}.")

        # Ensure dataset exists
        if len(dataset) == 0:
            return jsonify({'status': 'error', 'message': 'No dataset available. Please generate the dataset first.'}), 400

        # Initialize centroids based on the chosen method
        if init_method == 'random':
            centroids = initialize_random(dataset, k)
        elif init_method == 'kmeans++':
            centroids = initialize_kmeans_plus_plus(dataset, k)
        elif init_method == 'farthest_first':
            centroids = initialize_farthest_first(dataset, k)
        elif init_method == 'manual':
            centroids = request.json.get('manual_centroids', [])
            if len(centroids) != k:
                return jsonify({'status': 'error', 'message': 'Incorrect number of manual centroids.'}), 400

        print(f"Centroids initialized: {centroids}")

        # Assign initial clusters based on the new centroids
        clusters = assign_clusters(dataset, centroids)
        iteration = 1  # Reset iteration
        return jsonify({'centroids': centroids, 'clusters': clusters, 'status': 'stepping', 'iteration': iteration})

    # Step through the algorithm by reassigning clusters and recomputing centroids
    clusters = assign_clusters(dataset, centroids)
    new_centroids = recompute_centroids(clusters)

    # Check for convergence
    if new_centroids == centroids or iteration >= max_iterations:
        print("Convergence reached during step-through.")
        return jsonify({'status': 'converged', 'centroids': centroids, 'clusters': clusters})

    # Update centroids and increment iteration count
    centroids = new_centroids
    iteration += 1

    print(f"Step-through complete. Iteration {iteration}.")
    return jsonify({'status': 'stepping', 'centroids': centroids, 'clusters': clusters, 'iteration': iteration})

# @app.route('/step_kmeans', methods=['POST'])
# def step_kmeans():
#     """ Perform one step of the KMeans algorithm or initialize if centroids are not available """
#     global centroids, clusters, iteration, dataset
#     k = int(request.json['k'])
#     init_method = request.json['init_method']
    
#     print(f"Step Through KMeans called with k={k}, init_method={init_method}")  # Debug log

#     # Initialize KMeans if no centroids are available
#     if len(centroids) == 0:
#         # Ensure dataset exists
#         if len(dataset) == 0:
#             return jsonify({'status': 'error', 'message': 'No dataset available. Please generate the dataset first.'}), 400

#         # Initialize centroids based on the chosen method
#         if init_method == 'random':
#             centroids = initialize_random(dataset, k)
#         elif init_method == 'kmeans++':
#             centroids = initialize_kmeans_plus_plus(dataset, k)
#         elif init_method == 'farthest_first':
#             centroids = initialize_farthest_first(dataset, k)
#         elif init_method == 'manual':
#             centroids = request.json.get('manual_centroids', [])
#             if len(centroids) != k:
#                 return jsonify({'status': 'error', 'message': 'Incorrect number of manual centroids.'}), 400

#         # Assign initial clusters based on the new centroids
#         clusters = assign_clusters(dataset, centroids)
#         iteration = 1  # Reset iteration
#         print(f"Centroids initialized with {init_method}: {centroids}")

    # Step through the algorithm by reassigning clusters and recomputing centroids
    clusters = assign_clusters(dataset, centroids)
    new_centroids = recompute_centroids(clusters)

    # Check for convergence
    if new_centroids == centroids or iteration >= max_iterations:
        print("Convergence reached during step-through.")
        return jsonify({'status': 'converged', 'centroids': centroids, 'clusters': clusters})

    # Update centroids and increment iteration count
    centroids = new_centroids
    iteration += 1

    print(f"Step-through complete. Iteration {iteration}.")
    return jsonify({'status': 'stepping', 'centroids': centroids, 'clusters': clusters, 'iteration': iteration})


@app.route('/reset', methods=['POST'])
def reset():
    """ Reset the algorithm and state """
    global dataset, centroids, clusters, iteration
    dataset = []  # Clear dataset
    centroids = []  # Clear centroids
    clusters = []  # Clear clusters
    iteration = 0  # Reset iteration count
    print("State reset: Dataset, centroids, clusters, and iteration cleared.")
    
    return jsonify({'status': 'reset'})



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=True)