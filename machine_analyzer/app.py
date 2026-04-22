import io
import csv
from flask import Flask, render_template, request, jsonify, send_file, make_response
from flask_cors import CORS
from database import (
    init_db, add_machine, get_all_machines, get_stats,
    delete_machine, update_machine, get_machine_by_id
)

app = Flask(__name__)
CORS(app)

init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/machines', methods=['GET'])
def list_machines():
    return jsonify(get_all_machines())

@app.route('/api/machines', methods=['POST'])
def create_machine():
    data = request.json
    try:
        add_machine(
            data['name'], data['brand'],
            data.get('cpu', ''), data.get('cpu_gen', ''),
            float(data.get('cpu_speed', 0) or 0),
            int(data.get('ram', 0) or 0),
            int(data.get('storage', 0) or 0),
            int(data.get('gpu_memory', 0) or 0),
            float(data['price']),
            data.get('status', 'En stock'),
            data.get('serial_number', ''),
            data.get('location', ''),
            data.get('notes', '')
        )
        return jsonify({"message": "Machine ajoutee avec succes"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/machines/<int:machine_id>', methods=['GET'])
def get_machine(machine_id):
    machine = get_machine_by_id(machine_id)
    if machine:
        return jsonify(machine)
    return jsonify({"error": "Machine non trouvee"}), 404

@app.route('/api/machines/<int:machine_id>', methods=['PUT'])
def modify_machine(machine_id):
    data = request.json
    machine = get_machine_by_id(machine_id)
    if not machine:
        return jsonify({"error": "Machine non trouvee"}), 404
    try:
        update_machine(
            machine_id,
            data['name'], data['brand'],
            data.get('cpu', ''), data.get('cpu_gen', ''),
            float(data.get('cpu_speed', 0) or 0),
            int(data.get('ram', 0) or 0),
            int(data.get('storage', 0) or 0),
            int(data.get('gpu_memory', 0) or 0),
            float(data['price']),
            data.get('status', 'En stock'),
            data.get('serial_number', ''),
            data.get('location', ''),
            data.get('notes', '')
        )
        return jsonify({"message": "Machine mise a jour avec succes"})
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/api/machines/<int:machine_id>', methods=['DELETE'])
def remove_machine(machine_id):
    machine = get_machine_by_id(machine_id)
    if not machine:
        return jsonify({"error": "Machine non trouvee"}), 404
    delete_machine(machine_id)
    return jsonify({"message": "Machine supprimee avec succes"})

@app.route('/api/stats', methods=['GET'])
def stats():
    return jsonify(get_stats())

@app.route('/api/export', methods=['GET'])
def export_csv():
    machines = get_all_machines()
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "id", "name", "brand", "cpu", "cpu_gen", "cpu_speed", 
        "ram", "storage", "gpu_memory", "price", "status", 
        "serial_number", "location", "notes", "created_at"
    ])
    writer.writeheader()
    for m in machines:
        writer.writerow(m)
    
    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = "attachment; filename=inventaire_machines.csv"
    response.headers["Content-type"] = "text/csv"
    return response

if __name__ == '__main__':
    app.run(debug=True, port=5000)
