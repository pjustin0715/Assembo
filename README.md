# Assembo - PC Component Builder

A web application for building PC configurations with real-time compatibility checking and budget management.

## Features

- **Part Picker**: Select from 8 component categories (CPU, GPU, Motherboard, RAM, PSU, Case, Storage, CPU Cooler)
- **Real-time Compatibility Checking**: Validates socket match, RAM type, slot limits, and power requirements
- **Budget Calculator**: Set your budget and track spending with real-time updates
- **Build Summary**: View your complete build with export functionality
- **JSON-based Storage**: Saved builds stored as JSON files

## Tech Stack

- **Backend**: Flask (Python)
- **Frontend**: HTML/CSS/JavaScript (vanilla)
- **Data**: JSON files
- **Deployment**: Kubernetes

## Local Setup

### Prerequisites

- Python 3.11+
- pip

### Installation

```bash
cd assembo
pip install -r requirements.txt
```

### Running Locally

```bash
python app.py
```

The app will be available at http://localhost:5000

## Adding Your Own Components

Edit `data/components.json` to add your scraped component data. The file contains templates for:

- **Motherboard**: id, brand, model, price, socket, ramType, ramSlots, storageSlots, formFactor, tdp
- **CPU**: id, brand, model, price, socket, tdp, cores, threads, baseClock, boostClock
- **GPU**: id, brand, model, price, vram, tdp, length, pcieVersion
- **RAM**: id, brand, model, price, ramType, capacity, speed, latency
- **PSU**: id, brand, model, price, wattage, efficiency, modular
- **Case**: id, brand, model, price, formFactor, maxGpuLength, maxCoolerHeight
- **Storage**: id, brand, model, price, storageType, capacity, readSpeed, writeSpeed
- **Cooler**: id, brand, model, price, socketCompat, tdpRating, height

## Compatibility Rules

1. **Socket Match**: CPU socket must match Motherboard socket
2. **RAM Type**: Motherboard must support selected RAM type
3. **RAM Slots**: Total RAM sticks must not exceed motherboard RAM slots
4. **Storage Slots**: Total storage drives must not exceed motherboard storage slots
5. **Power Check**: PSU wattage must be >= (CPU TDP + GPU TDP + 100W overhead)

## Kubernetes Deployment

### Build and Push Image

```bash
docker build -t assembo:latest .
docker push your-registry/assembo:latest
```

### Deploy

```bash
kubectl apply -f deployment.yaml
```

## Project Structure

```
assembo/
├── app.py                    # Flask application
├── requirements.txt          # Python dependencies
├── Dockerfile                # Docker container
├── deployment.yaml           # Kubernetes manifest
├── data/
│   ├── components.json       # Component data
│   └── builds/               # Saved builds (*.json)
├── templates/
│   ├── home.html            # Home page
│   ├── builder.html         # Part picker
│   └── summary.html         # Build summary
├── static/
│   ├── style.css            # Styles
│   └── app.js               # Client-side JavaScript
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Home page |
| GET | `/builder?name=<name>` | Part picker page |
| GET | `/summary/<name>` | Build summary |
| GET | `/api/components` | Get all components |
| GET | `/api/components/<type>` | Get components by type |
| POST | `/api/compatibility` | Check build compatibility |
| GET | `/api/builds` | List saved builds |
| GET | `/api/builds/<name>` | Get specific build |
| POST | `/api/builds` | Save new build |
| PUT | `/api/builds/<name>` | Update build |
| DELETE | `/api/builds/<name>` | Delete build |
