import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'machines.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS machines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            brand TEXT NOT NULL,
            cpu TEXT,
            cpu_gen TEXT,
            cpu_speed REAL,
            ram INTEGER,
            storage INTEGER,
            gpu_memory INTEGER,
            price REAL NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # Migrate: add new columns if they don't exist yet (for existing DBs)
    for col, coltype in [('cpu_gen', 'TEXT'), ('cpu_speed', 'REAL'), ('gpu_memory', 'INTEGER')]:
        try:
            conn.execute(f'ALTER TABLE machines ADD COLUMN {col} {coltype}')
        except Exception:
            pass  # Column already exists
    conn.commit()
    conn.close()

def add_machine(name, brand, cpu, cpu_gen, cpu_speed, ram, storage, gpu_memory, price):
    conn = get_db_connection()
    conn.execute('''
        INSERT INTO machines (name, brand, cpu, cpu_gen, cpu_speed, ram, storage, gpu_memory, price)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (name, brand, cpu, cpu_gen, cpu_speed, ram, storage, gpu_memory, price))
    conn.commit()
    conn.close()

def get_all_machines():
    conn = get_db_connection()
    machines = conn.execute('SELECT * FROM machines ORDER BY created_at DESC').fetchall()
    conn.close()
    return [dict(row) for row in machines]

def get_machine_by_id(machine_id):
    conn = get_db_connection()
    machine = conn.execute('SELECT * FROM machines WHERE id = ?', (machine_id,)).fetchone()
    conn.close()
    return dict(machine) if machine else None

def delete_machine(machine_id):
    conn = get_db_connection()
    conn.execute('DELETE FROM machines WHERE id = ?', (machine_id,))
    conn.commit()
    conn.close()

def update_machine(machine_id, name, brand, cpu, cpu_gen, cpu_speed, ram, storage, gpu_memory, price):
    conn = get_db_connection()
    conn.execute('''
        UPDATE machines
        SET name=?, brand=?, cpu=?, cpu_gen=?, cpu_speed=?, ram=?, storage=?, gpu_memory=?, price=?
        WHERE id=?
    ''', (name, brand, cpu, cpu_gen, cpu_speed, ram, storage, gpu_memory, price, machine_id))
    conn.commit()
    conn.close()

def get_stats():
    conn = get_db_connection()
    # stats by brand
    brand_stats = conn.execute('''
        SELECT brand, COUNT(*) as count, AVG(price) as avg_price 
        FROM machines 
        GROUP BY brand
        ORDER BY count DESC
    ''').fetchall()

    # stats by price range (in FCFA)
    price_stats = conn.execute('''
        SELECT 
            CASE 
                WHEN price < 200000 THEN 'Budget (<200k FCFA)'
                WHEN price BETWEEN 200000 AND 500000 THEN 'Milieu de gamme (200k-500k)'
                ELSE 'Premium (>500k FCFA)'
            END as category,
            COUNT(*) as count
        FROM machines
        GROUP BY category
    ''').fetchall()

    # stats by RAM
    ram_stats = conn.execute('''
        SELECT ram, COUNT(*) as count
        FROM machines
        WHERE ram IS NOT NULL
        GROUP BY ram
        ORDER BY ram
    ''').fetchall()

    conn.close()
    return {
        "brands": [dict(row) for row in brand_stats],
        "price_ranges": [dict(row) for row in price_stats],
        "ram_distribution": [dict(row) for row in ram_stats]
    }

def bulk_insert(machines_list):
    """Insert a list of machine dicts into the database."""
    conn = get_db_connection()
    conn.executemany('''
        INSERT INTO machines (name, brand, cpu, cpu_gen, cpu_speed, ram, storage, gpu_memory, price)
        VALUES (:name, :brand, :cpu, :cpu_gen, :cpu_speed, :ram, :storage, :gpu_memory, :price)
    ''', machines_list)
    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized.")
