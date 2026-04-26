import json
import bson
import os
from dotenv import load_dotenv
import pymongo
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_from_directory, current_app, g

app = Flask(__name__)

load_dotenv()

cluster = pymongo.MongoClient(os.getenv("MONGODB_URI"))
db = cluster["assembo"]


DATA_DIR = os.environ.get('DATA_DIR', os.path.join(os.path.dirname(__file__), 'data'))
COMPONENTS_FILE = os.path.join(DATA_DIR, 'components.json')
BUILDS_DIR = os.path.join(DATA_DIR, 'builds')

def load_components():
    return {
        "motherboard" : list(db.motherboards.find({}, {"_id":0,"componentType":0})), 
        "cpu" : list(db.cpus.find({}, {"_id":0,"componentType":0})), 
        "gpu" : list(db.gpus.find({}, {"_id":0,"componentType":0})), 
        "ram" : list(db.rams.find({}, {"_id":0,"componentType":0})), 
        "psu" : list(db.psus.find({}, {"_id":0,"componentType":0})), 
        "case" : list(db.cases.find({}, {"_id":0,"componentType":0})), 
        "storage" : list(db.storages.find({}, {"_id":0,"componentType":0})), 
        "cooler" : list(db.coolers.find({}, {"_id":0,"componentType":0})) 
    }

def load_build(name):
    build = db.builds.find({"name":name},{"_id":0,"migratedAt":0})
    for result in build:
        return result
    
def check_name(name):
    buildnames = []
    all_builds = list(db.builds.find({},{"_id":0,"migratedAt":0}))
    for build in all_builds:
        buildnames.append(
            build.get('name','')
        )
    if name in buildnames:
        return True
    return False

def save_build(name, data):
    if check_name(name):
        db.builds.delete_one({"name":name})
        db.builds.insert_one(data)
    else:
        db.builds.insert_one(data)

def get_builds_list():
    builds = []
    all_builds = list(db.builds.find({},{"_id":0,"migratedAt":0}))
    for build in all_builds:
        builds.append({
            'name': build.get('name',''),
            'created': build.get('created', ''),
            'totalPrice': build.get('totalPrice', 0),
            'budget': build.get('budget', 0)
        })
    return builds

def check_compatibility(parts, components):
    issues = []
    
    cpu = parts.get('cpu')
    gpu = parts.get('gpu')
    motherboard = parts.get('motherboard')
    ram = parts.get('ram', [])
    storage = parts.get('storage', [])
    psu = parts.get('psu')
    
    ram_count = len(ram) if isinstance(ram, list) else (1 if ram else 0)
    storage_count = len(storage) if isinstance(storage, list) else (1 if storage else 0)
    
    if cpu and motherboard:
        cpu_data = next((c for c in components.get('cpu', []) if c['id'] == cpu['id']), None)
        mobo_data = next((m for m in components.get('motherboard', []) if m['id'] == motherboard['id']), None)
        
        if cpu_data and mobo_data:
            if cpu_data.get('socket') != mobo_data.get('socket'):
                issues.append({
                    'type': 'error',
                    'message': f"CPU socket ({cpu_data.get('socket')}) does not match motherboard socket ({mobo_data.get('socket')})"
                })
            
            if cpu_data.get('tdp', 0) > mobo_data.get('tdp', 125):
                issues.append({
                    'type': 'warning',
                    'message': f"CPU TDP ({cpu_data.get('tdp')}W) exceeds motherboard power delivery ({mobo_data.get('tdp')}W)"
                })
    
    if motherboard and ram:
        mobo_data = next((m for m in components.get('motherboard', []) if m['id'] == motherboard['id']), None)
        
        if mobo_data:
            if ram_count > mobo_data.get('ramSlots', 4):
                issues.append({
                    'type': 'error',
                    'message': f"RAM sticks ({ram_count}) exceeds motherboard slots ({mobo_data.get('ramSlots', 4)})"
                })
            
            for ram_item in (ram if isinstance(ram, list) else [ram]):
                ram_data = next((r for r in components.get('ram', []) if r['id'] == ram_item['id']), None)
                if ram_data and ram_data.get('ramType') != mobo_data.get('ramType'):
                    issues.append({
                        'type': 'error',
                        'message': f"RAM type ({ram_data.get('ramType')}) does not match motherboard ({mobo_data.get('ramType')})"
                    })
                    break
    
    if motherboard and storage:
        mobo_data = next((m for m in components.get('motherboard', []) if m['id'] == motherboard['id']), None)
        
        if mobo_data:
            if storage_count > mobo_data.get('storageSlots', 4):
                issues.append({
                    'type': 'error',
                    'message': f"Storage drives ({storage_count}) exceeds motherboard slots ({mobo_data.get('storageSlots', 4)})"
                })
    
    if cpu and gpu and psu:
        cpu_data = next((c for c in components.get('cpu', []) if c['id'] == cpu['id']), None)
        gpu_data = next((g for g in components.get('gpu', []) if g['id'] == gpu['id']), None)
        psu_data = next((p for p in components.get('psu', []) if p['id'] == psu['id']), None)
        
        if cpu_data and gpu_data and psu_data:
            total_tdp = cpu_data.get('tdp', 0) + gpu_data.get('tdp', 0) + 100
            if psu_data.get('wattage', 0) < total_tdp:
                issues.append({
                    'type': 'error',
                    'message': f"PSU wattage ({psu_data.get('wattage')}W) insufficient. Required: ~{total_tdp}W"
                })
    
    return issues

@app.route('/')
def home():
    builds = get_builds_list()
    return render_template('home.html', builds=builds)

@app.route('/builder')
def builder():
    name = request.args.get('name', '')
    build = load_build(name) if name else None
    return render_template('builder.html', build_name=name, build=build)

@app.route('/summary/<name>')
def summary(name):
    build = load_build(name)
    if not build:
        return "Build not found", 404
    return render_template('summary.html', build=build, build_name=name)

@app.route('/api/components', methods=['GET'])
def get_all_components():
    return jsonify(load_components())

@app.route('/api/components/<component_type>', methods=['GET'])
def get_components_by_type(component_type):
    components = load_components()
    return jsonify(components.get(component_type, []))

@app.route('/api/motherboard/<component_id>', methods=['GET'])
def get_motherboard(component_id):
    components = load_components()
    for mobo in components.get('motherboard', []):
        if mobo['id'] == component_id:
            return jsonify(mobo)
    return jsonify({'error': 'Not found'}), 404

@app.route('/api/compatibility', methods=['POST'])
def check_compatibility_api():
    data = request.json
    parts = data.get('parts', {})
    components = load_components()
    issues = check_compatibility(parts, components)
    
    return jsonify({
        'compatible': len([i for i in issues if i['type'] == 'error']) == 0,
        'issues': issues
    })

@app.route('/api/builds', methods=['GET'])
def list_builds():
    return jsonify(get_builds_list())

@app.route('/api/builds/<name>', methods=['GET'])
def get_build(name):
    build = load_build(name)
    if build:
        return jsonify(build)
    return jsonify({'error': 'Build not found'}), 404

@app.route('/api/builds', methods=['POST'])
def create_build():
    data = request.json
    name = data.get('name', '').lower().replace(' ', '-')
    
    if not name:
        return jsonify({'error': 'Build name required'}), 400
    
    parts = data.get('parts', {})
    budget = data.get('budget', 0)
    
    total_price = 0
    for part_list in parts.values():
        if isinstance(part_list, list):
            for part in part_list:
                total_price += part.get('price', 0)
        elif part_list:
            total_price += part_list.get('price', 0)
    
    components = load_components()
    issues = check_compatibility(parts, components)
    errors = [i for i in issues if i['type'] == 'error']
    
    if errors:
        return jsonify({'error': 'Build has compatibility issues', 'issues': issues}), 400
    
    if total_price > budget:
        return jsonify({'error': 'Build exceeds budget'}), 400
    
    motherboard = parts.get('motherboard', {})
    mobo_data = next((m for m in components.get('motherboard', []) if m['id'] == motherboard.get('id', '')), None)
    
    ram = parts.get('ram', [])
    storage = parts.get('storage', [])
    
    build_data = {
        'name': name,
        'created': datetime.now().isoformat(),
        'budget': budget,
        'totalPrice': total_price,
        'parts': parts,
        'compatibility': {
            'status': 'compatible'
        },
        'slotUsage': {
            'ramCount': len(ram) if isinstance(ram, list) else 0,
            'ramTotal': mobo_data.get('ramSlots', 4) if mobo_data else 4,
            'storageCount': len(storage) if isinstance(storage, list) else 0,
            'storageTotal': mobo_data.get('storageSlots', 4) if mobo_data else 4
        }
    }
    
    save_build(name, build_data)
    return jsonify({'success': True, 'name': name})

@app.route('/api/builds/<name>', methods=['PUT'])
def update_build(name):
    data = request.json
    
    parts = data.get('parts', {})
    budget = data.get('budget', 0)
    
    total_price = 0
    for part_list in parts.values():
        if isinstance(part_list, list):
            for part in part_list:
                total_price += part.get('price', 0)
        elif part_list:
            total_price += part_list.get('price', 0)
    
    components = load_components()
    issues = check_compatibility(parts, components)
    errors = [i for i in issues if i['type'] == 'error']
    
    if errors:
        return jsonify({'error': 'Build has compatibility issues', 'issues': issues}), 400
    
    if total_price > budget:
        return jsonify({'error': 'Build exceeds budget'}), 400
    
    motherboard = parts.get('motherboard', {})
    mobo_data = next((m for m in components.get('motherboard', []) if m['id'] == motherboard.get('id', '')), None)
    
    ram = parts.get('ram', [])
    storage = parts.get('storage', [])
    
    build_data = {
        'name': name,
        'created': datetime.now().isoformat(),
        'budget': budget,
        'totalPrice': total_price,
        'parts': parts,
        'compatibility': {
            'status': 'compatible'
        },
        'slotUsage': {
            'ramCount': len(ram) if isinstance(ram, list) else 0,
            'ramTotal': mobo_data.get('ramSlots', 4) if mobo_data else 4,
            'storageCount': len(storage) if isinstance(storage, list) else 0,
            'storageTotal': mobo_data.get('storageSlots', 4) if mobo_data else 4
        }
    }
    

    
    save_build(name, build_data)
    return jsonify({'success': True, 'name': name})

@app.route('/api/builds/<name>', methods=['DELETE'])
def delete_build(name):
    if check_name(name):
        db.builds.delete_one({"name":name})
        return jsonify({'success': True})
    return jsonify({'error': 'Build not found'}), 404

if __name__ == '__main__':
    os.makedirs(BUILDS_DIR, exist_ok=True)
    app.run(debug=True, host='0.0.0.0', port=5000)
