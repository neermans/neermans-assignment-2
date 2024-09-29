let dataset = [];
let centroids = [];
let clusters = [];
let initMethod = 'random';
let k = 3; // Default number of clusters
let manualCentroidSelection = false; // Tracks if manual centroid selection is active

document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM fully loaded and parsed');

    // Attach event listeners for UI buttons
    document.getElementById('generate-dataset').addEventListener('click', function() {
        console.log('Generate Dataset clicked');
        generateDataset();
    });

    document.getElementById('run-kmeans').addEventListener('click', function() {
        console.log('Run KMeans clicked');
        runKMeans();
    });

    document.getElementById('step-through').addEventListener('click', function() {
        console.log('Step Through KMeans clicked');
        stepThroughKMeans();
    });

    document.getElementById('reset').addEventListener('click', function() {
        console.log('Reset clicked');
        resetAlgorithm();
    });

    // Change initialization method for KMeans (e.g., random, manual)
    document.getElementById('init-method').addEventListener('change', function() {
        initMethod = document.getElementById('init-method').value;
        console.log('Initialization method changed to:', initMethod);

        // Enable or disable manual centroid selection
        if (initMethod === 'manual') {
            manualCentroidSelection = true;
            enableManualCentroidSelection();
        } else {
            manualCentroidSelection = false;
            console.log('Manual centroid selection disabled.');
        }
    });

    generateDataset(); // Automatically generate a dataset on page load
});

// Function to generate a new dataset (100 points by default)
function generateDataset() {
    k = document.getElementById('k-value').value; // Get the number of clusters (k) from user input

    fetch('/generate_dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num_points: 100 }) // Send a request to generate 100 random points
    })
    .then(response => response.json())
    .then(data => {
        console.log('Dataset generated:', data.dataset);
        dataset = data.dataset; // Store the dataset globally
        drawPlot(dataset); // Plot the dataset points
        enableManualCentroidSelection(); // Attach listener for manual selection of centroids (if applicable)
    })
    .catch(error => console.error('Error generating dataset:', error));
}

// Function to enable manual centroid selection by clicking on the plot
function enableManualCentroidSelection() {
    centroids = []; // Reset previous centroids
    manualCentroidSelection = true; // Activate manual selection mode
    console.log('Manual centroid selection enabled.');

    let plotDiv = document.getElementById('plot'); // Get the plot div for centroid selection

    // Remove existing listeners to avoid multiple handlers
    plotDiv.removeAllListeners('plotly_click');

    console.log("Attaching plotly_click listener");
    attachClickListener(plotDiv); // Attach the listener to the plot for centroid selection

    drawPlot(dataset); // Re-draw the plot with the dataset
}

// Attach the click listener for selecting centroids manually
function attachClickListener(plotDiv) {
    plotDiv.on('plotly_click', function(data) {
        // Get coordinates of the clicked point
        let x = data.points[0].x;
        let y = data.points[0].y;

        // Add the selected point as a centroid if less than k are selected
        if (centroids.length < k) {
            centroids.push([x, y]);
            console.log(`Centroid selected at: (${x}, ${y}). Total centroids: ${centroids.length}`);

            drawPlot(dataset, centroids); // Update plot with selected centroids

            // Notify user once all centroids are selected
            if (centroids.length === k) {
                alert('You have selected all centroids. You can now run KMeans.');
            }
        } else {
            alert('Centroid selection limit reached.');
        }
    });
}

// Function to run KMeans clustering (or start it with manual centroids)
function runKMeans() {
    let k = parseInt(document.getElementById('k-value').value); // Get number of clusters from user input
    let initMethod = document.getElementById('init-method').value;

    console.log('Initialization method:', initMethod);
    console.log('Manual centroids (if applicable):', centroids);
    console.log('Number of clusters (k):', k);

    // Ensure all manual centroids are selected before running KMeans
    if (initMethod === 'manual' && centroids.length !== k) {
        alert(`Please select exactly ${k} centroids manually before running KMeans.`);
        return;
    }

    // Initialize KMeans and start clustering
    fetch('/start_kmeans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            k: k,
            init_method: initMethod,
            manual_centroids: centroids // Include manual centroids if selected
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'error') {
            alert(data.message);
            console.log('Error:', data.message);
        } else {
            centroids = data.centroids;
            clusters = data.clusters;
            console.log(`KMeans started with centroids:`, centroids);
            drawPlot(dataset, centroids, clusters); // Update plot with initial centroids and clusters

            runUntilConvergence(); // Automatically run KMeans until convergence
        }
    })
    .catch(error => console.error('Error during Run KMeans:', error));
}

// Function to step through KMeans iterations until convergence
function runUntilConvergence() {
    let k = parseInt(document.getElementById('k-value').value); // Get number of clusters
    let initMethod = document.getElementById('init-method').value;

    fetch('/step_kmeans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            k: k,
            init_method: initMethod,
            manual_centroids: initMethod === 'manual' ? centroids : [] // Include manual centroids if applicable
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'converged') {
            console.log('KMeans has converged!');
            alert('KMeans has converged!');
            drawPlot(dataset, data.centroids, data.clusters); // Final plot after convergence
        } else if (data.status === 'stepping') {
            centroids = data.centroids;
            clusters = data.clusters;
            console.log('Iteration:', data.iteration);
            drawPlot(dataset, centroids, clusters); // Update plot after each step

            setTimeout(runUntilConvergence, 500); // Continue to the next iteration after 500ms delay
        }
    })
    .catch(error => console.error('Error during Run Until Convergence:', error));
}

// Function to step through KMeans one iteration at a time
function stepThroughKMeans() {
    let k = parseInt(document.getElementById('k-value').value); // Get number of clusters
    let initMethod = document.getElementById('init-method').value;

    fetch('/step_kmeans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            k: k,
            init_method: initMethod,
            manual_centroids: initMethod === 'manual' ? centroids : [] // Include manual centroids if applicable
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'converged') {
            console.log('KMeans has converged!');
            alert('KMeans has converged!');
        } else if (data.status === 'stepping') {
            centroids = data.centroids;
            clusters = data.clusters;
            console.log('Iteration:', data.iteration);
            drawPlot(dataset, centroids, clusters); // Update plot after each iteration
        }
    })
    .catch(error => console.error('Error during Step Through KMeans:', error));
}

// Function to plot the dataset, centroids, and clusters using Plotly
function drawPlot(dataset = [], centroids = [], clusters = []) {
    let traces = [];
    const colors = ['blue', 'green', 'orange', 'purple', 'pink', 'yellow', 'cyan', 'magenta']; // Define color palette for clusters

    // Plot the clustered dataset points
    if (clusters.length > 0) {
        for (let i = 0; i < clusters.length; i++) {
            const clusterPoints = clusters[i]; // Points for each cluster
            let clusterTrace = {
                x: clusterPoints.map(point => point[0]), // X-coordinates of points
                y: clusterPoints.map(point => point[1]), // Y-coordinates of points
                mode: 'markers',
                type: 'scatter',
                marker: { size: 8, color: colors[i % colors.length] }, // Assign a color to each cluster
                name: `Cluster ${i + 1}`
            };
            traces.push(clusterTrace);
        }
    } else if (dataset.length > 0) {
        // Plot unclustered dataset points
        let dataTrace = {
            x: dataset.map(point => point[0]), // X-coordinates
            y: dataset.map(point => point[1]), // Y-coordinates
            mode: 'markers',
            type: 'scatter',
            marker: { size: 8, color: 'blue' }, // Default color for unclustered points
            name: 'Data Points'
        };
        traces.push(dataTrace);
    }

    // Plot the centroids if they exist
    if (centroids.length > 0) {
        let centroidTrace = {
            x: centroids.map(point => point[0]), // X-coordinates of centroids
            y: centroids.map(point => point[1]), // Y-coordinates of centroids
            mode: 'markers',
            type: 'scatter',
            marker: { size: 12, color: 'red', symbol: 'x' }, // Centroids are represented as red 'x'
            name: 'Centroids'
        };
        traces.push(centroidTrace);
    }

    let layout = {
        title: `KMeans Clustering (k = ${k} Clusters)`,
        xaxis: { title: 'X Axis' },
        yaxis: { title: 'Y Axis' }
    };

    // Update the plot
    Plotly.react('plot', traces, layout);
}

// Function to clear the current plot
function clearPlot() {
    Plotly.purge('plot'); // Clear the plot
    console.log('Plot cleared');
}

// Function to reset the algorithm's state and reload the dataset
function resetAlgorithm() {
    console.log('Reset clicked');

    fetch('/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'reset') {
            console.log('State has been reset');

            // Clear frontend state (centroids and clusters)
            centroids = [];
            clusters = [];

            // Re-plot the dataset (without centroids or clusters)
            if (data.dataset && data.dataset.length > 0) {
                dataset = data.dataset; // Load the dataset
                drawPlot(dataset);
            } else {
                console.error('No dataset returned from the server after reset.');
            }
        }
    })
    .catch(error => console.error('Error during reset:', error));
}
