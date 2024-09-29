from flask import Flask, jsonify, request, render_template
import numpy as np
import random

app = Flask(__name__)

# Global vars
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
    
    # initialize one centroid
    centroids = [random.choice(data)]

    
    for _ in range(1, k):
        # Calculate distances for every data point to the nearest centroid
        distances = [min([np.linalg.norm(np.array(p) - np.array(c)) for c in centroids]) for p in data]
         
        # New centroid based on the weighted probability distribution
        new_centroid = random.choices(data, weights=distances, k=1)[0]
        centroids.append(new_centroid)

    
    return centroids


def initialize_farthest_first(data, k):
    """ Pick centroids that are the farthest apart from eachother """
    centroids = [random.choice(data)]  # once again pick a random data point for the centroid
    for _ in range(1, k):
        farthest_point = max(data, key=lambda p: min([np.linalg.norm(np.array(p) - np.array(c)) for c in centroids]))
        centroids.append(farthest_point)
    return centroids


def assign_clusters(data, centroids):
    """ each point to nearest centroid """
    if len(centroids) == 0:
        raise ValueError("No centroids provided.")
    
    clusters = [[] for _ in centroids]
    for point in data:
        distances = [np.linalg.norm(np.array(point) - np.array(centroid)) for centroid in centroids]
        cluster_index = np.argmin(distances)
        clusters[cluster_index].append(point)
    return clusters


def recompute_centroids(clusters):
    """ Centroids are now the mean of the points in each cluster """
    new_centroids = [np.mean(cluster, axis=0).tolist() for cluster in clusters if len(cluster) > 0]
    return new_centroids


@app.route('/')
def index():
    """ give back to html """
    return render_template('index.html')


@app.route('/generate_dataset', methods=['POST'])
def generate_dataset():
    """ randomizing dataset """
    global dataset, iteration
    num_points = int(request.json['num_points'])
    dataset = np.random.rand(num_points, 2).tolist()  # Generate random 2D points
    iteration = 0  # Reset iteration
    
    return jsonify({'dataset': dataset})  # Return the dataset to the frontend


@app.route('/start_kmeans', methods=['POST'])
def start_kmeans():
    """ Initialize KMeans and reset  """
    global centroids, clusters, iteration
    k = int(request.json['k'])
    init_method = request.json['init_method']
    
    if len(dataset) == 0:
        return jsonify({'status': 'error', 'message': 'No dataset available. Please generate the dataset first.'}), 400
    
    # Manual centroids
    if init_method == 'manual':
        centroids = request.json.get('manual_centroids', [])
        print(f"Manual centroids provided: {centroids}")
        if len(centroids) != k:
            return jsonify({'status': 'error', 'message': 'Incorrect number of manual centroids.'}), 400
    else:
        # Initializations
        if init_method == 'random':
            centroids = initialize_random(dataset, k)
        elif init_method == 'kmeans++':
            centroids = initialize_kmeans_plus_plus(dataset, k)
        elif init_method == 'farthest_first':
            centroids = initialize_farthest_first(dataset, k)

    # original clusters
    clusters = assign_clusters(dataset, centroids)
    iteration = 1  # Reset 
    
    return jsonify({'centroids': centroids, 'clusters': clusters})

@app.route('/step_kmeans', methods=['POST'])
def step_kmeans():
    global centroids, clusters, iteration, dataset
    k = int(request.json['k'])
    init_method = request.json['init_method']

    # Ensure centroids are available
    if len(centroids) == 0:
        print(f"No centroids found. Initializing centroids using {init_method}.")

        if init_method == 'manual':
            # manual centroids
            centroids = request.json.get('manual_centroids', [])
            print(f"Manual centroids received: {centroids}")
            # error here
            if len(centroids) != k:
                return jsonify({'status': 'error', 'message': f'Please select exactly {k} centroids manually.'}), 400
        else:
            # initializations
            if init_method == 'random':
                centroids = initialize_random(dataset, k)
            elif init_method == 'kmeans++':
                centroids = initialize_kmeans_plus_plus(dataset, k)
            elif init_method == 'farthest_first':
                centroids = initialize_farthest_first(dataset, k)
        
        # original clusters based on centroids
        clusters = assign_clusters(dataset, centroids)
        iteration = 1  # Reset
        return jsonify({'centroids': centroids, 'clusters': clusters, 'status': 'stepping', 'iteration': iteration})

    # Step through 
    clusters = assign_clusters(dataset, centroids)
    new_centroids = recompute_centroids(clusters)

    # Check for convergence
    if new_centroids == centroids or iteration >= max_iterations:
        print("Convergence reached.")
        return jsonify({'status': 'converged', 'centroids': centroids, 'clusters': clusters})

    # Update centroids and increment
    centroids = new_centroids
    iteration += 1

    return jsonify({'status': 'stepping', 'centroids': centroids, 'clusters': clusters, 'iteration': iteration})


@app.route('/reset', methods=['POST'])
def reset():
    """ Reset algorithm but keep dataset """
    global centroids, clusters, iteration, dataset

    if len(dataset) == 0:
        return jsonify({'status': 'error', 'message': 'No dataset found to reset.'}), 400
    
    # Clear centroids and clusters
    centroids = []
    clusters = []
    iteration = 0 
    
    print("State reset: Centroids, clusters, and iteration cleared. Dataset remains the same.")
    
    return jsonify({'status': 'reset', 'dataset': dataset})



if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=True)
