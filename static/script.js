let dataset = [];
let centroids = [];
let clusters = [];
let initMethod = 'random';
let k = 3; // Default number of clusters
let manualCentroidSelection = false; // Track if manual centroid selection is active

document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM fully loaded and parsed');

    // Attach event listeners
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

    document.getElementById('init-method').addEventListener('change', function() {
        initMethod = document.getElementById('init-method').value;
        console.log('Initialization method changed to:', initMethod);

        if (initMethod === 'manual') {
            manualCentroidSelection = true;
            enableManualCentroidSelection();  // Enable manual centroid selection when manual is chosen
        } else {
            manualCentroidSelection = false;
            console.log('Manual centroid selection disabled.');
        }
    });

    generateDataset(); // Always generate a new dataset on load
});

// Generate a new dataset (always 100 points)
function generateDataset() {
    k = document.getElementById('k-value').value;  // Get the number of clusters (k) from the input box

    fetch('/generate_dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num_points: 100 })  // Always generate 100 points
    })
    .then(response => response.json())
    .then(data => {
        console.log('Dataset generated:', data.dataset);
        dataset = data.dataset;  // Store the dataset globally
        drawPlot(dataset);  // Plot the dataset only, do not run KMeans
        enableManualCentroidSelection();  // Ensure the listener is attached every time after plot re-rendering
    })
    .catch(error => console.error('Error generating dataset:', error));
}

// Enable manual centroid selection by clicking on the plot
function enableManualCentroidSelection() {
    centroids = [];  // Clear any previous centroids
    manualCentroidSelection = true;  // Enable manual centroid selection
    console.log('Manual centroid selection enabled.');

    let plotDiv = document.getElementById('plot');  // Get the plot div

    // // Remove previous listeners before adding a new one
    plotDiv.removeAllListeners('plotly_click');

    console.log("Attaching plotly_click listener");
    attachClickListener(plotDiv);

    // Plotly.purge(plotDiv);  // Clear the plot before re-rendering
    drawPlot(dataset);  // Re-draw the plot with the dataset

}

function attachClickListener(plotDiv) {
    // const epsilon = 0.1;  // Tolerance for centroid selection
    plotDiv.on('plotly_click', function(data) {
        // Get the clicked coordinates
        let x = data.points[0].x;
        let y = data.points[0].y;

        // Add the selected point as a centroid if it's not already selected
        if (centroids.length < k) {
            centroids.push([x, y]);
            console.log(`Centroid selected at: (${x}, ${y}). Total centroids: ${centroids.length}`);

            // Update the plot with selected centroids
            drawPlot(dataset, centroids);

            // Notify user once all centroids are selected
            if (centroids.length === k) {
                alert('You have selected all centroids. You can now run KMeans.');
            }
        } else {
            alert('Centroid selection limit reached.');
        }
        });
}


function runKMeans() {
    let k = parseInt(document.getElementById('k-value').value);
    let initMethod = document.getElementById('init-method').value;

    console.log('Initialization method:', initMethod);
    console.log('Number of clusters (k):', k);
    console.log('Manual centroids (if applicable):', centroids);

    // Ensure all centroids are selected for manual method
    if (initMethod === 'manual' && centroids.length !== k) {
        alert('Please select all centroids manually before running KMeans.');
        return;
    }

    // Function to call the backend and run KMeans until convergence
    function runUntilConvergence() {
        fetch('/step_kmeans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                k: k,
                init_method: initMethod
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'converged') {
                console.log('KMeans has converged!');
                alert('KMeans has converged!');
                drawPlot(dataset, data.centroids, data.clusters);  // Final plot after convergence
            } else if (data.status === 'stepping') {
                centroids = data.centroids;
                clusters = data.clusters;
                console.log('Iteration:', data.iteration);
                drawPlot(dataset, centroids, clusters);  // Update plot after each iteration
                
                // Call the function recursively to continue until convergence
                setTimeout(runUntilConvergence, 500);  // Delay each step by 500ms
            }
        })
        .catch(error => console.error('Error during Run KMeans:', error));
    }

    // Start the iteration loop
    runUntilConvergence();
}

// Step through KMeans one iteration at a time
function stepThroughKMeans() {
    fetch('/step_kmeans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            k: k,
            init_method: initMethod
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
            drawPlot(dataset, centroids, clusters);  // Update the plot with new clusters and centroids
        }
    })
    .catch(error => console.error('Error during step through KMeans:', error));
}


function drawPlot(dataset = [], centroids = [], clusters = []) {
    let traces = [];
    const colors = ['blue', 'green', 'orange', 'purple', 'pink', 'yellow', 'cyan', 'magenta']; // Add more colors if needed

    // Plot the clustered dataset points
    if (clusters.length > 0) {
        for (let i = 0; i < clusters.length; i++) {
            const clusterPoints = clusters[i];  // Get points for each cluster
            let clusterTrace = {
                x: clusterPoints.map(point => point[0]),  // X-coordinates of points
                y: clusterPoints.map(point => point[1]),  // Y-coordinates of points
                mode: 'markers',
                type: 'scatter',
                marker: { size: 8, color: colors[i % colors.length] },  // Cycle through color array
                name: `Cluster ${i + 1}`
            };
            traces.push(clusterTrace);
        }
    } else if (dataset.length > 0) {
        // Plot unclustered dataset points (if clusters are not available)
        let dataTrace = {
            x: dataset.map(point => point[0]),  // Extract x-coordinates
            y: dataset.map(point => point[1]),  // Extract y-coordinates
            mode: 'markers',
            type: 'scatter',
            marker: { size: 8, color: 'blue' },  // Data points are blue by default
            name: 'Data Points'
        };
        traces.push(dataTrace);
    }

    // Plot the centroids if they exist
    if (centroids.length > 0) {
        let centroidTrace = {
            x: centroids.map(point => point[0]),  // X-coordinates of centroids
            y: centroids.map(point => point[1]),  // Y-coordinates of centroids
            mode: 'markers',
            type: 'scatter',
            marker: { size: 12, color: 'red', symbol: 'x' },  // Centroids are red Xs
            name: 'Centroids'
        };
        traces.push(centroidTrace);
    }

    let layout = {
        title: `KMeans Clustering (k = ${k} Clusters)`,
        xaxis: { title: 'X Axis' },
        yaxis: { title: 'Y Axis' }
    };

    // Update the plot without recreating it
    Plotly.react('plot', traces, layout);
}


function clearPlot() {
    Plotly.purge('plot');  // Clear the plot
    console.log('Plot cleared');
}

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
            
            // Clear frontend state (centroids, clusters)
            centroids = [];
            clusters = [];

            // Log the dataset returned by the backend
            console.log('Dataset after reset:', data.dataset);  // Debugging log to ensure dataset is received
            
            // Check if dataset is properly defined before using it
            if (data.dataset && data.dataset.length > 0) {
                dataset = data.dataset;  // Assign the dataset from the backend to the global variable
                drawPlot(dataset);  // Re-plot the dataset (without centroids or clusters)
            } else {
                console.error('No dataset returned from the server after reset.');
            }
        }
    })
    .catch(error => console.error('Error during reset:', error));
}



