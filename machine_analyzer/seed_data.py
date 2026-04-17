"""
Script to populate the database with 50 machines based on
Cameroonian market prices (FCFA) from sites like jumia.cm, cdiscount.cm, etc.
Run once: python seed_data.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from database import init_db, bulk_insert

machines = [
    # ===== HP =====
    {"name": "HP ProBook 450 G9", "brand": "HP", "cpu": "Intel Core i5", "cpu_gen": "12ème gén", "cpu_speed": 2.5, "ram": 8, "storage": 512, "gpu_memory": 0, "price": 350000},
    {"name": "HP EliteBook 840 G9", "brand": "HP", "cpu": "Intel Core i7", "cpu_gen": "12ème gén", "cpu_speed": 2.8, "ram": 16, "storage": 512, "gpu_memory": 0, "price": 620000},
    {"name": "HP Pavilion 15", "brand": "HP", "cpu": "Intel Core i5", "cpu_gen": "11ème gén", "cpu_speed": 2.4, "ram": 8, "storage": 256, "gpu_memory": 2, "price": 290000},
    {"name": "HP 250 G8", "brand": "HP", "cpu": "Intel Core i3", "cpu_gen": "11ème gén", "cpu_speed": 2.0, "ram": 4, "storage": 256, "gpu_memory": 0, "price": 195000},
    {"name": "HP Spectre x360", "brand": "HP", "cpu": "Intel Core i7", "cpu_gen": "12ème gén", "cpu_speed": 3.2, "ram": 16, "storage": 1024, "gpu_memory": 0, "price": 750000},
    {"name": "HP ProBook 440 G10", "brand": "HP", "cpu": "Intel Core i5", "cpu_gen": "13ème gén", "cpu_speed": 2.6, "ram": 16, "storage": 512, "gpu_memory": 0, "price": 420000},
    {"name": "HP EliteBook 650 G9", "brand": "HP", "cpu": "Intel Core i5", "cpu_gen": "12ème gén", "cpu_speed": 2.5, "ram": 8, "storage": 256, "gpu_memory": 0, "price": 380000},

    # ===== DELL =====
    {"name": "Dell Inspiron 15 3520", "brand": "Dell", "cpu": "Intel Core i5", "cpu_gen": "12ème gén", "cpu_speed": 2.5, "ram": 8, "storage": 512, "gpu_memory": 0, "price": 320000},
    {"name": "Dell XPS 13 9315", "brand": "Dell", "cpu": "Intel Core i7", "cpu_gen": "12ème gén", "cpu_speed": 3.5, "ram": 16, "storage": 512, "gpu_memory": 0, "price": 780000},
    {"name": "Dell Latitude 5430", "brand": "Dell", "cpu": "Intel Core i5", "cpu_gen": "12ème gén", "cpu_speed": 2.4, "ram": 8, "storage": 256, "gpu_memory": 0, "price": 410000},
    {"name": "Dell Vostro 3510", "brand": "Dell", "cpu": "Intel Core i3", "cpu_gen": "11ème gén", "cpu_speed": 1.8, "ram": 4, "storage": 256, "gpu_memory": 0, "price": 210000},
    {"name": "Dell Precision 3560", "brand": "Dell", "cpu": "Intel Core i7", "cpu_gen": "11ème gén", "cpu_speed": 2.8, "ram": 16, "storage": 512, "gpu_memory": 4, "price": 650000},
    {"name": "Dell G15 Gaming", "brand": "Dell", "cpu": "Intel Core i5", "cpu_gen": "12ème gén", "cpu_speed": 2.5, "ram": 8, "storage": 512, "gpu_memory": 4, "price": 480000},
    {"name": "Dell Inspiron 14 5420", "brand": "Dell", "cpu": "Intel Core i5", "cpu_gen": "12ème gén", "cpu_speed": 2.5, "ram": 8, "storage": 512, "gpu_memory": 2, "price": 355000},

    # ===== LENOVO =====
    {"name": "Lenovo ThinkPad E15 G4", "brand": "Lenovo", "cpu": "Intel Core i5", "cpu_gen": "12ème gén", "cpu_speed": 2.5, "ram": 8, "storage": 512, "gpu_memory": 0, "price": 400000},
    {"name": "Lenovo IdeaPad 3 15", "brand": "Lenovo", "cpu": "Intel Core i3", "cpu_gen": "10ème gén", "cpu_speed": 1.6, "ram": 4, "storage": 256, "gpu_memory": 0, "price": 180000},
    {"name": "Lenovo ThinkPad X1 Carbon", "brand": "Lenovo", "cpu": "Intel Core i7", "cpu_gen": "12ème gén", "cpu_speed": 3.0, "ram": 16, "storage": 1024, "gpu_memory": 0, "price": 820000},
    {"name": "Lenovo Legion 5i", "brand": "Lenovo", "cpu": "Intel Core i7", "cpu_gen": "12ème gén", "cpu_speed": 3.5, "ram": 16, "storage": 512, "gpu_memory": 6, "price": 680000},
    {"name": "Lenovo IdeaPad 5 15", "brand": "Lenovo", "cpu": "Intel Core i5", "cpu_gen": "11ème gén", "cpu_speed": 2.4, "ram": 8, "storage": 512, "gpu_memory": 0, "price": 310000},
    {"name": "Lenovo ThinkBook 14 G4", "brand": "Lenovo", "cpu": "Intel Core i5", "cpu_gen": "12ème gén", "cpu_speed": 2.5, "ram": 8, "storage": 256, "gpu_memory": 0, "price": 370000},
    {"name": "Lenovo IdeaPad Gaming 3", "brand": "Lenovo", "cpu": "AMD Ryzen 5", "cpu_gen": "6ème gén", "cpu_speed": 3.3, "ram": 8, "storage": 512, "gpu_memory": 4, "price": 430000},

    # ===== ASUS =====
    {"name": "Asus VivoBook 15 X1502", "brand": "Asus", "cpu": "Intel Core i5", "cpu_gen": "12ème gén", "cpu_speed": 2.5, "ram": 8, "storage": 512, "gpu_memory": 0, "price": 295000},
    {"name": "Asus ZenBook 14 UX425", "brand": "Asus", "cpu": "Intel Core i7", "cpu_gen": "11ème gén", "cpu_speed": 2.9, "ram": 16, "storage": 512, "gpu_memory": 0, "price": 560000},
    {"name": "Asus ROG Strix G15", "brand": "Asus", "cpu": "AMD Ryzen 7", "cpu_gen": "6ème gén", "cpu_speed": 3.6, "ram": 16, "storage": 512, "gpu_memory": 8, "price": 750000},
    {"name": "Asus ExpertBook B1400", "brand": "Asus", "cpu": "Intel Core i5", "cpu_gen": "11ème gén", "cpu_speed": 2.4, "ram": 8, "storage": 256, "gpu_memory": 0, "price": 300000},
    {"name": "Asus TUF Gaming F15", "brand": "Asus", "cpu": "Intel Core i5", "cpu_gen": "11ème gén", "cpu_speed": 2.5, "ram": 8, "storage": 512, "gpu_memory": 4, "price": 450000},
    {"name": "Asus VivoBook 14 M413", "brand": "Asus", "cpu": "AMD Ryzen 5", "cpu_gen": "5ème gén", "cpu_speed": 2.7, "ram": 8, "storage": 256, "gpu_memory": 0, "price": 255000},

    # ===== ACER =====
    {"name": "Acer Aspire 5 A515-57", "brand": "Acer", "cpu": "Intel Core i5", "cpu_gen": "12ème gén", "cpu_speed": 2.5, "ram": 8, "storage": 512, "gpu_memory": 0, "price": 285000},
    {"name": "Acer Nitro 5 AN515-58", "brand": "Acer", "cpu": "Intel Core i5", "cpu_gen": "12ème gén", "cpu_speed": 2.5, "ram": 8, "storage": 512, "gpu_memory": 4, "price": 460000},
    {"name": "Acer Swift 3 SF314", "brand": "Acer", "cpu": "Intel Core i5", "cpu_gen": "12ème gén", "cpu_speed": 2.5, "ram": 8, "storage": 512, "gpu_memory": 0, "price": 340000},
    {"name": "Acer Predator Helios 300", "brand": "Acer", "cpu": "Intel Core i7", "cpu_gen": "12ème gén", "cpu_speed": 3.5, "ram": 16, "storage": 512, "gpu_memory": 6, "price": 720000},
    {"name": "Acer TravelMate P214", "brand": "Acer", "cpu": "Intel Core i3", "cpu_gen": "11ème gén", "cpu_speed": 2.0, "ram": 8, "storage": 256, "gpu_memory": 0, "price": 240000},
    {"name": "Acer Aspire 3 A315-59", "brand": "Acer", "cpu": "Intel Core i3", "cpu_gen": "12ème gén", "cpu_speed": 1.8, "ram": 4, "storage": 256, "gpu_memory": 0, "price": 175000},

    # ===== APPLE =====
    {"name": "MacBook Air M1", "brand": "Apple", "cpu": "Apple M1", "cpu_gen": "1ère gén Apple", "cpu_speed": 3.2, "ram": 8, "storage": 256, "gpu_memory": 0, "price": 650000},
    {"name": "MacBook Pro 14 M2", "brand": "Apple", "cpu": "Apple M2 Pro", "cpu_gen": "2ème gén Apple", "cpu_speed": 3.5, "ram": 16, "storage": 512, "gpu_memory": 0, "price": 1200000},
    {"name": "MacBook Air M2", "brand": "Apple", "cpu": "Apple M2", "cpu_gen": "2ème gén Apple", "cpu_speed": 3.5, "ram": 8, "storage": 256, "gpu_memory": 0, "price": 850000},
    {"name": "MacBook Pro 16 M2 Max", "brand": "Apple", "cpu": "Apple M2 Max", "cpu_gen": "2ème gén Apple", "cpu_speed": 3.7, "ram": 32, "storage": 1024, "gpu_memory": 0, "price": 1800000},

    # ===== MSI =====
    {"name": "MSI Modern 14 C12MO", "brand": "MSI", "cpu": "Intel Core i5", "cpu_gen": "12ème gén", "cpu_speed": 2.5, "ram": 8, "storage": 512, "gpu_memory": 0, "price": 330000},
    {"name": "MSI GF65 Thin", "brand": "MSI", "cpu": "Intel Core i5", "cpu_gen": "10ème gén", "cpu_speed": 2.5, "ram": 8, "storage": 512, "gpu_memory": 6, "price": 520000},
    {"name": "MSI Katana GF66", "brand": "MSI", "cpu": "Intel Core i7", "cpu_gen": "12ème gén", "cpu_speed": 3.6, "ram": 16, "storage": 512, "gpu_memory": 6, "price": 680000},
    {"name": "MSI Prestige 14 Evo", "brand": "MSI", "cpu": "Intel Core i7", "cpu_gen": "12ème gén", "cpu_speed": 2.9, "ram": 16, "storage": 512, "gpu_memory": 0, "price": 590000},

    # ===== SAMSUNG =====
    {"name": "Samsung Galaxy Book2 Pro", "brand": "Samsung", "cpu": "Intel Core i5", "cpu_gen": "12ème gén", "cpu_speed": 2.5, "ram": 8, "storage": 256, "gpu_memory": 0, "price": 520000},
    {"name": "Samsung Galaxy Book2 360", "brand": "Samsung", "cpu": "Intel Core i5", "cpu_gen": "12ème gén", "cpu_speed": 2.5, "ram": 8, "storage": 256, "gpu_memory": 0, "price": 480000},
    {"name": "Samsung Galaxy Book3 Ultra", "brand": "Samsung", "cpu": "Intel Core i9", "cpu_gen": "13ème gén", "cpu_speed": 4.0, "ram": 32, "storage": 1024, "gpu_memory": 8, "price": 1500000},

    # ===== MICROSOFT =====
    {"name": "Microsoft Surface Laptop 4", "brand": "Microsoft", "cpu": "AMD Ryzen 5", "cpu_gen": "5ème gén", "cpu_speed": 2.8, "ram": 8, "storage": 256, "gpu_memory": 0, "price": 590000},
    {"name": "Microsoft Surface Pro 9", "brand": "Microsoft", "cpu": "Intel Core i5", "cpu_gen": "12ème gén", "cpu_speed": 2.5, "ram": 8, "storage": 256, "gpu_memory": 0, "price": 710000},
    {"name": "Microsoft Surface Laptop 5", "brand": "Microsoft", "cpu": "Intel Core i7", "cpu_gen": "12ème gén", "cpu_speed": 2.8, "ram": 16, "storage": 512, "gpu_memory": 0, "price": 870000},

    # ===== TOSHIBA / DYNABOOK =====
    {"name": "Dynabook Satellite Pro C50", "brand": "Dynabook", "cpu": "Intel Core i5", "cpu_gen": "11ème gén", "cpu_speed": 2.4, "ram": 8, "storage": 256, "gpu_memory": 0, "price": 270000},
    {"name": "Dynabook Tecra A50-J", "brand": "Dynabook", "cpu": "Intel Core i7", "cpu_gen": "11ème gén", "cpu_speed": 2.8, "ram": 16, "storage": 512, "gpu_memory": 0, "price": 480000},
]

if __name__ == "__main__":
    init_db()
    bulk_insert(machines)
    print(f"OK: {len(machines)} machines inserees avec succes !")
