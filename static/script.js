let dataset = [];
let centroids = [];
let clusters = [];
let initMethod = 'random';
let k = 3; //default
let manualCentroidSelection = false; // true if manual selected

document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM fully loaded and parsed');

    // event listeners
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
            enableManualCentroidSelection();  // Enable manual
        } else {
            manualCentroidSelection = false;
            console.log('Manual centroid selection disabled.');
        }
    });

    generateDataset(); 
});

// New dataset (always 100 points)
function generateDataset() {
    k = document.getElementById('k-value').value;  // Get the number of clusters 

    fetch('/generate_dataset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ num_points: 100 })  
    })
    .then(response => response.json())
    .then(data => {
        console.log('Dataset generated:', data.dataset);
        dataset = data.dataset; 
        drawPlot(dataset); 
        enableManualCentroidSelection(); 
    })
    .catch(error => console.error('Error generating dataset:', error));
}


function enableManualCentroidSelection() {
    centroids = [];  // Clear any previous centroids
    manualCentroidSelection = true;  // allow manual centroid selection
    console.log('Manual centroid selection enabled.');

    let plotDiv = document.getElementById('plot');  // Get the plot div

    // // Remove previous listeners before adding a new one
    plotDiv.removeAllListeners('plotly_click');

    console.log("Attaching plotly_click listener");
    attachClickListener(plotDiv);


    drawPlot(dataset); 



function attachClickListener(plotDiv) {
    // const epsilon = 0.1;  // Tolerance for centroid selection
    plotDiv.on('plotly_click', function(data) {
        let x = data.points[0].x;
        let y = data.points[0].y;


        if (centroids.length < k) {
            centroids.push([x, y]);
            console.log(`Centroid selected at: (${x}, ${y}). Total centroids: ${centroids.length}`);


            drawPlot(dataset, centroids);


            if (centroids.length === k) {
                alert('You have selected all centroids. You can now run KMeans.');
            }
        } else {
            alert('Centroid selection limit reached.');
        }
        });
}


function runKMeans() {
    let k = parseInt(document.getElementById('k-value').value);  // Get the number of clusters (k)
    let initMethod = document.getElementById('init-method').value;

    console.log('Initialization method:', initMethod);
    console.log('Manual centroids (if applicable):', centroids);
    console.log('Number of clusters (k):', k);

    // Ensure all centroids are selected for manual method
    if (initMethod === 'manual' && centroids.length !== k) {
        alert(`Please select exactly ${k} centroids manually before running KMeans.`);
        return;  //stop if not correctly chosen
    }

    fetch('/start_kmeans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            k: k,
            init_method: initMethod,
            manual_centroids: centroids  // Passing manual centroids 
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
            drawPlot(dataset, centroids, clusters);  // Updating the plot after initialization

            runUntilConvergence();  // Automatically step through until convergence
        }
    })
    .catch(error => console.error('Error during Run KMeans:', error));
}

function runUntilConvergence() {
    let k = parseInt(document.getElementById('k-value').value);  // Get the number of clusters (k)
    let initMethod = document.getElementById('init-method').value;

    fetch('/step_kmeans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            k: k,
            init_method: initMethod,
            manual_centroids: initMethod === 'manual' ? centroids : []  // Pass manual centroids if necessary
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
            drawPlot(dataset, centroids, clusters);  // Update the plot after each step
            
            setTimeout(runUntilConvergence, 500); 
        }
    })
    .catch(error => console.error('Error during Run Until Convergence:', error));
}


// Step through KMeans one iteration at a time
function stepThroughKMeans() {
    let k = parseInt(document.getElementById('k-value').value);  // Get the number of clusters (k)
    let initMethod = document.getElementById('init-method').value;

    fetch('/step_kmeans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            k: k,
            init_method: initMethod,
            manual_centroids: initMethod === 'manual' ? centroids : []  // Passing manual centroids 
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
    const colors = ['blue', 'green', 'orange', 'purple', 'pink', 'yellow', 'cyan', 'magenta']; 

    // Plotting the clustered dataset points
    if (clusters.length > 0) {
        for (let i = 0; i < clusters.length; i++) {
            const clusterPoints = clusters[i]; 
            let clusterTrace = {
                x: clusterPoints.map(point => point[0]),  // X-coordinates of points
                y: clusterPoints.map(point => point[1]),  // Y-coordinates of points
                mode: 'markers',
                type: 'scatter',
                marker: { size: 8, color: colors[i % colors.length] }, 
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
            marker: { size: 8, color: 'blue' }, 
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
            marker: { size: 12, color: 'red', symbol: 'x' }, 
            name: 'Centroids'
        };
        traces.push(centroidTrace);
    }

    let layout = {
        title: `KMeans Clustering (k = ${k} Clusters)`,
        xaxis: { title: 'X Axis' },
        yaxis: { title: 'Y Axis' }
    };

    Plotly.react('plot', traces, layout);
}


function clearPlot() {
    Plotly.purge('plot');  
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
           
            centroids = [];
            clusters = [];

           
            console.log('Dataset after reset:', data.dataset);  
            
            
            if (data.dataset && data.dataset.length > 0) {
                dataset = data.dataset; 
                drawPlot(dataset); 
            } else {
                console.error('No dataset returned from the server after reset.');
            }
        }
    })
    .catch(error => console.error('Error during reset:', error));
}
}