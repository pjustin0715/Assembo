# Assembo - PC Component Builder

A web application for building PC configurations with real-time compatibility checking and budget management.

## Features

- Select from 8 component categories (CPU, GPU, Motherboard, RAM, PSU, Case, Storage, CPU Cooler)
- Validates socket match, RAM type, slot limits, and power requirements
- Set your budget and track spending with real-time updates
- View your complete build with export functionality
- Saved builds stored as JSON files

## Tech Stack

- Flask 
- React*
- MongoDB*
- Kubernetes

## Local Setup
- Python 3.11+
- pip

```bash
cd assembo
pip install -r requirements.txt
```

```bash
python app.py
```

The app will be available at http://localhost:5000

## Compatibility Rules

1. Socket Match: CPU socket must match Motherboard socket
2. RAM Type: Motherboard must support selected RAM type
3. RAM Slots: Total RAM sticks must not exceed motherboard RAM slots
4. Storage Slots: Total storage drives must not exceed motherboard storage slots
5. Power Check: PSU wattage must be >= (CPU TDP + GPU TDP + 100W overhead)

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