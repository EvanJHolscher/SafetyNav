
document.addEventListener("DOMContentLoaded", function() {
    fetch('./mapboxToken.txt')
    .then(response => response.text())
    .then(token => {
        // Set the Mapbox access token
        mapboxgl.accessToken = token.trim();
        console.log(mapboxgl.accessToken);
    let currentStep = "start";
    let startCoords, endCoords;
    // Create the map instance
    const map = new mapboxgl.Map({
        container: "map",
        style: "mapbox://styles/mapbox/navigation-night-v1",
        center: [-118.25209, 34.04782],
        zoom: 12
    })

    let directions = new MapboxDirections({
        accessToken: mapboxgl.accessToken,
        alternatives: true,
        geometries: 'geojson',
        overview: 'full',
        interactive: false,
    });
    map.on("load", () => {
        const style = map.getStyle();
        /*
        const layers = style.layers;
        layers.forEach(layer=>{
            console.log(layer.id);
        }) */
        map.addControl(directions,'top-left');
        addCircleLayers();
        addHeatMap();
    });

 // Listen for route events in Mapbox Directions
    directions.on('route', (event) => {
        
        const safetyScoresContainer = document.getElementById('safety-scores');
        const aiScoresContainer = document.getElementById('ai-scores');
        // Clear previous scores before populating with new scores
        while (safetyScoresContainer.firstChild) {
            safetyScoresContainer.removeChild(safetyScoresContainer.firstChild);
        }
        while (aiScoresContainer.firstChild) {
            aiScoresContainer.removeChild(aiScoresContainer.firstChild);
        }
        const titleElement = document.createElement('h3');
        titleElement.textContent = 'AI Scores:';
        aiScoresContainer.appendChild(titleElement);
        const scoresList = []
        const aiScoresList = []
        event.route.forEach((route, index) => {
            const encodedPolyline = route.geometry;
            // Decode the route polyline using the 'polyline' library
            const decodedRouteCoordinates = polyline.decode(encodedPolyline);
        
            // Create a string of coordinates
            const coordinatesString = decodedRouteCoordinates.map(coord => `${coord[0]},${coord[1]}`).join(';');
            //console.log(`Coordinates String for Route ${index + 1}:`, coordinatesString);
        
            // Convert the decoded coordinates to GeoJSON LineString
            const geoJSONLineString = polyline.toGeoJSON(encodedPolyline);
            //console.log(`GeoJSON LineString for Route ${index + 1}:`, geoJSONLineString);
            
            fetch('./LACrime-2020.geojson')
            .then(response => response.json())
            .then(crimeData => {
                const safetyScore = calculateSafetyScore(geoJSONLineString, crimeData);
                console.log(`Safety Score for Route ${index + 1}:`, safetyScore);
                //console.log("Crime Data ", crimeData);
                //console.log(`Route Line for Route ${index + 1}:`, coordinatesString);
        
                // Select the container for safety scores
                const safetyScoresContainer = document.getElementById('safety-scores');
                if (index == 0){
                    // Create an <h3> element for the title
                    const titleElement = document.createElement('h3');
                    titleElement.textContent = 'Safety Scores:';
                    safetyScoresContainer.appendChild(titleElement);
                }

                // Update the safety score display for each route
                const safetyScoreElement = document.createElement('span');
                safetyScoreElement.style.marginLeft = '10px';
                safetyScoreElement.textContent = `Route ${index + 1}: ${safetyScore}`;
                safetyScoreElement.style.marginRight = '10px';
                safetyScoresContainer.appendChild(safetyScoreElement);
                scoresList.push(safetyScore);

                if (scoresList.length === event.route.length) {
                    calculateMinimum(scoresList, '#safety-scores span');
                }
            })
            .catch(error => console.error(error));

            fetch('./ai_clusters.geojson')
            .then(response => response.json())
            .then(data => {
              // Group points by cluster label
              const clusterPoints = {};
              data.features.forEach(feature => {
                const clusterLabel = feature.properties.cluster_label;
                if (!clusterPoints[clusterLabel]) {
                  clusterPoints[clusterLabel] = [];
                }
                clusterPoints[clusterLabel].push(feature.geometry.coordinates);
              });
              const aiScore = calculateAiScore(geoJSONLineString, clusterPoints);
              console.log(`AI Score for Route ${index + 1}:`, aiScore);
              
              // Select the container for safety scores
              const safetyScoresContainer = document.getElementById('ai-scores');

              // Update the safety score display for each route
              const safetyScoreElement = document.createElement('span');
              safetyScoreElement.style.marginLeft = '10px';
              safetyScoreElement.textContent = `Route ${index + 1}: ${aiScore}`;
              safetyScoreElement.style.marginRight = '10px';
              safetyScoresContainer.appendChild(safetyScoreElement);
              aiScoresList.push(aiScore);

              if (aiScoresList.length === event.route.length) {
                  calculateMinimum(aiScoresList, '#ai-scores span');
              }
            })
            .catch(error => console.error('Error fetching AI clusters:', error));
        });
    });

    function calculateMinimum(scoresList, aspect) {
        const minValue = Math.min(...scoresList.filter(score => !isNaN(score)));
        const minIndex = scoresList.indexOf(minValue);
        const safetyScoreElements = document.querySelectorAll(aspect);
    
        safetyScoreElements.forEach((element, index) => {
            if (index === minIndex) {
                element.style.color = 'yellow';
            }
        });
    }

    function calculateAiScore(routeLine, clusterPoints){
        let score = 0;

        // Iterate through the clusters
        Object.values(clusterPoints).forEach(cluster => {
            // Calculate density of the cluster (number of points)
            const clusterDensity = cluster.length;
        
            cluster.forEach(coordinates => {
              const point = turf.point(coordinates);
              const distance = turf.pointToLineDistance(point, routeLine, { units: 'kilometers' });
        
              // Handle division by zero
              if (distance !== 0) {
                // Calculate score based on distance and cluster density
                const distanceScore = 1 / distance;
                const densityScore = clusterDensity;
        
                // Calculate the overall score for this point in the cluster
                const pointScore = distanceScore * densityScore;
                // Add the point's score to the total score
                score += pointScore;
              }
            });
          });

        return Math.trunc(score/100);
    }

    function calculateSafetyScore(routeLine, crimeFeatures) {
        //console.log("Crime Features: ", crimeFeatures);
        const proximityThreshold = 0.1;
        let score = 0;
        
        // Iterate through the crime features
        for (const feature of crimeFeatures.features) {
            const coordinates = feature.geometry.coordinates;
            // Access the coordinates from the feature's geometry
            // console.log("Coords_2:", coordinates);
            // Calculate the distance between the route line and the feature
            const pointOnRoute = turf.point(coordinates);
            const distance = turf.pointToLineDistance(pointOnRoute, routeLine, { units: 'kilometers' });

            // Assign scores based on proximity to clusters
            if (distance < proximityThreshold) {
                score += 10; // High score for close proximity
            } else if (distance < 1.6) {
                score += 5; // Medium score for moderate proximity
            } else if (distance < 5){
                score += 1; // Low score for distant clusters
            }
            else {
            score += 0;
            }
        }

        console.log(crimeFeatures.features.length)
        return score;
    }

function addHeatMap(){
    map.addSource('Crime', {
        'type': 'geojson',
        'data': './LACrime-2020.geojson'
    });
    map.addLayer(
        {
            'id': 'trees-heat',
            'type': 'heatmap',
            'source': 'Crime',
            'maxzoom': 15,
            'paint': {
            // Increase weight as diameter breast height increases
            'heatmap-weight': {
                'property': 'dbh',
                'type': 'exponential',
                'stops': [
                [1, 0],
                [62, 1]
                ]
            },
            // Increase intensity as zoom level increases
            'heatmap-intensity': {
                'stops': [
                [11, 1],
                [15, 3]
                ]
            },
            // Use sequential color palette to use exponentially as the weight increases
            'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0,
                'rgba(236,222,239,0)',
                0.2,
                'rgb(208,209,230)',
                0.4,
                'rgb(166,189,219)',
                0.6,
                'rgb(103,169,207)',
                0.8,
                'rgb(28,144,153)'
            ],
            // Increase radius as zoom increases
            'heatmap-radius': {
                'stops': [
                [11, 15],
                [15, 20]
                ]
            },
            // Decrease opacity to transition into the circle layer
            'heatmap-opacity': {
                'default': 1,
                'stops': [
                [14, 1],
                [15, 0]
                ]
            }
            }
        },
        'waterway-label'
        );

    map.addLayer(
    {
        'id': 'trees-point',
        'type': 'circle',
        'source': 'Crime',
        'minzoom': 14,
        'paint': {
        // Increase the radius of the circle as the zoom level and dbh value increases
        'circle-radius': {
            'property': 'dbh',
            'type': 'exponential',
            'stops': [
            [{ zoom: 15, value: 1 }, 5],
            [{ zoom: 15, value: 62 }, 10],
            [{ zoom: 22, value: 1 }, 20],
            [{ zoom: 22, value: 62 }, 50]
            ]
        },
        'circle-color': {
            'property': 'dbh',
            'type': 'exponential',
            'stops': [
            [0, 'rgba(236,222,239,0)'],
            [10, 'rgb(236,222,239)'],
            [20, 'rgb(208,209,230)'],
            [30, 'rgb(166,189,219)'],
            [40, 'rgb(103,169,207)'],
            [50, 'rgb(28,144,153)'],
            [60, 'rgb(1,108,89)']
            ]
        },
        'circle-stroke-color': 'white',
        'circle-stroke-width': 1,
        'circle-opacity': {
            'stops': [
            [14, 0],
            [15, 1]
            ]
        }
        }
    },
    'waterway-label'
    );


    map.on('contextmenu', 'trees-point', (e) => {
        const lngLat = e.lngLat;
        const features = map.queryRenderedFeatures(e.point, { layers: ['trees-point'] });
        
        if (features.length > 0) {
            showCrimeDetailsPopup(features[0], lngLat);
        }
    });

}

  function showCrimeDetailsPopup(feature, lngLat) {
      // Use the feature's properties from the Crime source
      const crimeProperties = feature.properties;  

      let popupContent = "<div class='crime-popup'><div class='title-section'><h2>Crime Details</h2></div>";
      popupContent += '<div class = "scrolling-content">';
      for (const property in crimeProperties) {
          if (crimeProperties.hasOwnProperty(property)) {
              const value = crimeProperties[property];
              popupContent += `<strong>${property}:</strong> ${value}<br>`;
          }
      }
      popupContent += '</div>';

      // Create a popup with the crime details
      new mapboxgl.Popup()
          .setLngLat(lngLat)
          .setHTML(popupContent)
          .addTo(map);
  }

  const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: {
          enableHighAccuracy: true
      },
      trackUserLocation: false 
  });

  map.addControl(geolocate);

  // Handle the geolocate event manually
  geolocate.on('geolocate', (event) => {
      const userLocation = event.coords;
      console.log('User Location: ', userLocation.latitude);

      // Update the Mapbox Directions control's origin and fly to the user's location
      directions.setOrigin([userLocation.longitude, userLocation.latitude]);
      map.flyTo({
          center: [userLocation.longitude, userLocation.latitude],
          zoom: 15,
          speed: 1
      });
      
  });
  function success(position){
      const crd = position.coords;
      getDirections([position.coords.longitude, position.coords.latitude]);
  }

  function error(err){
      console.warn(`ERROR(${err.code}): ${err.message}`);
  }



  function addCircleLayers() {

      map.addSource("start", {
      type: "geojson",
      data: {
          type: "FeatureCollection",
          features: []
      }
      });
      map.addSource("end", {
      type: "geojson",
      data: {
          type: "FeatureCollection",
          features: []
      }
      });

      map.addLayer({
      id: "start-circle",
      type: "circle",
      source: "start",
      paint: {
          "circle-radius": 6,
          "circle-color": "white",
          "circle-stroke-color": "black",
          "circle-stroke-width": 2
      }
      });

      map.addLayer({
      id: "end-circle",
      type: "circle",
      source: "end",
      paint: {
          "circle-radius": 7,
          "circle-color": "black"
      }
      });

  }

  map.on("click", (e) => {
      const coordinates = e.lngLat.toArray();
      const point = {
          type: "Point",
          coordinates
      };
      console.log(directions)
      if (currentStep == "start") {
          startCoords = coordinates;
          const empty = {
              type: "FeatureCollection",
              features: []
          };
          directions.setOrigin(startCoords)
          endCoords = null;
          currentStep = "end";

      } else {

          endCoords = coordinates;
          currentStep = "start";
          
      }

      if (startCoords && endCoords) {
          updateRoute(startCoords, endCoords);
      }

  });

  function updateRoute(startCoords, endCoords){
      directions.setOrigin(startCoords);
      directions.setDestination(endCoords);
  }
})
.catch(error => console.error('Error fetching Mapbox token:', error));
});