"""
STARTECH — database.py
Modèle SQLite : machines + utilisateurs
"""

import sqlite3
import os
from werkzeug.security import generate_password_hash

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'machines.db')


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()

    # Table machines
    conn.execute('''
        CREATE TABLE IF NOT EXISTS machines (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            name          TEXT    NOT NULL,
            brand         TEXT    NOT NULL,
            cpu           TEXT,
            cpu_gen       TEXT,
            cpu_speed     REAL,
            ram           INTEGER,
            storage       INTEGER,
            gpu_memory    INTEGER,
            price         REAL    NOT NULL,
            status        TEXT    DEFAULT "En stock",
            serial_number TEXT,
            location      TEXT,
            notes         TEXT,
            image_path    TEXT,
            quantity      INTEGER   DEFAULT 1,
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Table utilisateurs
    conn.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT    NOT NULL UNIQUE,
            password_hash TEXT    NOT NULL,
            role          TEXT    NOT NULL DEFAULT "client",
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Migration douce — nouvelles colonnes
    migrations = [
        ('cpu_gen',       'TEXT'),
        ('cpu_speed',     'REAL'),
        ('gpu_memory',    'INTEGER'),
        ('status',        'TEXT DEFAULT "En stock"'),
        ('serial_number', 'TEXT'),
        ('location',      'TEXT'),
        ('notes',         'TEXT'),
        ('image_path',    'TEXT'),
        ('quantity',      'INTEGER DEFAULT 1'),
    ]
    for col, coltype in migrations:
        try:
            conn.execute(f'ALTER TABLE machines ADD COLUMN {col} {coltype}')
        except Exception:
            pass  # colonne déjà présente

    conn.commit()
    conn.close()


def init_default_users():
    """Crée admin et client par défaut s'ils n'existent pas."""
    conn = get_db_connection()
    defaults = [
        ('admin',  'admin123',  'admin'),
        ('client', 'client123', 'client'),
    ]
    for username, password, role in defaults:
        exists = conn.execute(
            'SELECT id FROM users WHERE username = ?', (username,)
        ).fetchone()
        if not exists:
            conn.execute(
                'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
                (username, generate_password_hash(password), role)
            )
    conn.commit()
    conn.close()


# ── Auth ──────────────────────────────────────────────────────────────────────

def get_user_by_username(username: str):
    conn = get_db_connection()
    row  = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    conn.close()
    return dict(row) if row else None


# ── Machines ──────────────────────────────────────────────────────────────────

def add_machine(name, brand, cpu, cpu_gen, cpu_speed, ram, storage,
                gpu_memory, price, status='En stock',
                serial_number='', location='', notes='', quantity=1):
    conn = get_db_connection()
    conn.execute('''
        INSERT INTO machines
            (name, brand, cpu, cpu_gen, cpu_speed, ram, storage,
             gpu_memory, price, status, serial_number, location, notes, quantity)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (name, brand, cpu, cpu_gen, cpu_speed, ram, storage,
          gpu_memory, price, status, serial_number, location, notes, max(1, int(quantity))))
    conn.commit()
    conn.close()


def get_all_machines():
    conn = get_db_connection()
    rows = conn.execute('SELECT * FROM machines ORDER BY created_at DESC').fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_machine_by_id(machine_id: int):
    conn = get_db_connection()
    row  = conn.execute('SELECT * FROM machines WHERE id = ?', (machine_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def delete_machine(machine_id: int):
    conn = get_db_connection()
    conn.execute('DELETE FROM machines WHERE id = ?', (machine_id,))
    conn.commit()
    conn.close()


def update_machine(machine_id, name, brand, cpu, cpu_gen, cpu_speed,
                   ram, storage, gpu_memory, price, status,
                   serial_number, location, notes, quantity=1):
    conn = get_db_connection()
    conn.execute('''
        UPDATE machines
        SET name=?, brand=?, cpu=?, cpu_gen=?, cpu_speed=?,
            ram=?, storage=?, gpu_memory=?, price=?, status=?,
            serial_number=?, location=?, notes=?, quantity=?
        WHERE id=?
    ''', (name, brand, cpu, cpu_gen, cpu_speed, ram, storage,
          gpu_memory, price, status, serial_number, location, notes,
          max(1, int(quantity)), machine_id))
    conn.commit()
    conn.close()


def update_machine_image(machine_id: int, image_path):
    conn = get_db_connection()
    conn.execute('UPDATE machines SET image_path = ? WHERE id = ?',
                 (image_path, machine_id))
    conn.commit()
    conn.close()


def get_stats():
    conn = get_db_connection()

    brand_stats = conn.execute('''
        SELECT brand, COUNT(*) as count, AVG(price) as avg_price
        FROM machines GROUP BY brand ORDER BY count DESC
    ''').fetchall()

    price_stats = conn.execute('''
        SELECT
            CASE
                WHEN price < 200000
                    THEN "Budget (<200k FCFA)"
                WHEN price BETWEEN 200000 AND 500000
                    THEN "Milieu de gamme (200k-500k)"
                ELSE "Premium (>500k FCFA)"
            END as category,
            COUNT(*) as count
        FROM machines GROUP BY category
    ''').fetchall()

    ram_stats = conn.execute('''
        SELECT ram, COUNT(*) as count
        FROM machines WHERE ram IS NOT NULL
        GROUP BY ram ORDER BY ram
    ''').fetchall()

    status_stats = conn.execute('''
        SELECT status, COUNT(*) as count
        FROM machines GROUP BY status
    ''').fetchall()

    conn.close()
    return {
        'brands':              [dict(r) for r in brand_stats],
        'price_ranges':        [dict(r) for r in price_stats],
        'ram_distribution':    [dict(r) for r in ram_stats],
        'status_distribution': [dict(r) for r in status_stats],
    }


def bulk_insert(machines_list: list):
    conn = get_db_connection()
    conn.executemany('''
        INSERT INTO machines
            (name, brand, cpu, cpu_gen, cpu_speed, ram, storage, gpu_memory, price)
        VALUES (:name, :brand, :cpu, :cpu_gen, :cpu_speed,
                :ram, :storage, :gpu_memory, :price)
    ''', machines_list)
    conn.commit()
    conn.close()


if __name__ == '__main__':
    init_db()
    init_default_users()
    print('✅ Base de données initialisée.')
    print('   admin  / admin123  (gestionnaire)')
    print('   client / client123 (client)')
