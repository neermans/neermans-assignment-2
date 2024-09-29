let dataset = [];
let centroids = [];
let clusters = [];
let initMethod = 'random';
let k = 3; 
let manualCentroidSelection = false;

document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM fully loaded and parsed');


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
            enableManualCentroidSelection(); 
        } else {
            manualCentroidSelection = false;
            console.log('Manual centroid selection disabled.');
        }
    });

    generateDataset();
});


function generateDataset() {
    k = document.getElementById('k-value').value;  

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
    centroids = [];  
    manualCentroidSelection = true;  
    console.log('Manual centroid selection enabled.');

    let plotDiv = document.getElementById('plot');  


    plotDiv.removeAllListeners('plotly_click');

    console.log("Attaching plotly_click listener");
    attachClickListener(plotDiv);

    drawPlot(dataset);  


function attachClickListener(plotDiv) {
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
    let k = parseInt(document.getElementById('k-value').value);
    let initMethod = document.getElementById('init-method').value;

    console.log('Initialization method:', initMethod);
    console.log('Number of clusters (k):', k);
    console.log('Manual centroids (if applicable):', centroids);


    if (initMethod === 'manual' && centroids.length !== k) {
        alert('Please select all centroids manually before running KMeans.');
        return;
    }


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
                drawPlot(dataset, data.centroids, data.clusters); 
            } else if (data.status === 'stepping') {
                centroids = data.centroids;
                clusters = data.clusters;
                console.log('Iteration:', data.iteration);
                drawPlot(dataset, centroids, clusters); 
                
               
                setTimeout(runUntilConvergence, 500); 
            }
        })
        .catch(error => console.error('Error during Run KMeans:', error));
    }


    runUntilConvergence();
}


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
            drawPlot(dataset, centroids, clusters); 
        }
    })
    .catch(error => console.error('Error during step through KMeans:', error));
}

function drawPlot(dataset = [], centroids = [], clusters = []) {
    let traces = [];
    const colors = ['blue', 'green', 'orange', 'purple', 'pink', 'yellow', 'cyan', 'magenta']; 

    if (clusters.length > 0) {
        for (let i = 0; i < clusters.length; i++) {
            const clusterPoints = clusters[i]; 
            let clusterTrace = {
                x: clusterPoints.map(point => point[0]), 
                y: clusterPoints.map(point => point[1]), 
                mode: 'markers',
                type: 'scatter',
                marker: { size: 8, color: colors[i % colors.length] },  
                name: `Cluster ${i + 1}`
            };
            traces.push(clusterTrace);
        }
    } else if (dataset.length > 0) {

        let dataTrace = {
            x: dataset.map(point => point[0]), 
            y: dataset.map(point => point[1]), 
            mode: 'markers',
            type: 'scatter',
            marker: { size: 8, color: 'blue' },  
            name: 'Data Points'
        };
        traces.push(dataTrace);
    }


    if (centroids.length > 0) {
        let centroidTrace = {
            x: centroids.map(point => point[0]), 
            y: centroids.map(point => point[1]), 
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