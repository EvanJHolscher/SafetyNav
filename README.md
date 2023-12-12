# SafetyNav
A web-application that provides safety scores for real-world navigation.
# Installation and Setup Guide

## Dependencies:
- **node.js v18.12.1 or later**
- **Mapbox Directions API key**
- **Working web browser**
- **Working network connection**

## Installation Steps:
1. Navigate to [Node.js download page](https://nodejs.org/en/download) to download the latest version of node.js.
2. Add the path to `node.exe` to the working directory.
3. Create an account and generate an access token at [Mapbox access tokens](https://account.mapbox.com/access-tokens/).
4. Download the code files from the [GitHub repository](https://github.com/EvanJHolscher/SafetyNav/tree/node-server).
5. Navigate to the downloaded folder containing code from the `node-server` branch. Inside the `public` folder, open `mapboxToken.txt`. Copy and paste the access token, then save the file.
6. Open the root directory of the `node-server` folder in the terminal and start the application with the command `node nav.js`.

# Usage

## Features:
- **Right-click on datapoint:** See details about the crime at that location.
- **Left-click:** Set the origin and destination points.
- **Type Start or End points:** Into the navigation fields on the top left.
- **Click on the top right symbol:** Navigate to your current location on the map.
- **Use the Scroll wheel:** To zoom in/out.
- **Left-click and drag:** To pan the camera around the map.

## Information Displays:
- **Safety Score (bottom left):** Shows the crime score calculated by the Distance-Point algorithm for each coordinate along the route. A lower number represents a smaller chance of crime occurring.
- **AI Score (bottom right):** Shows the crime score calculated by the DBScan clustering algorithm for the dataset. A higher number represents a prediction of a stronger chance for a crime along the route.
