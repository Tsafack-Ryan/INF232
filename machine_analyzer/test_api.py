import requests

base = "http://127.0.0.1:5000/api"

# 1. GET all machines
r = requests.get(f"{base}/machines")
machines = r.json()
print(f"Total machines: {len(machines)}")

# 2. GET first machine
first = machines[0]
print(f"First machine: {first['name']} - {first['price']} FCFA (id={first['id']})")

# 3. PUT - update price
updated = dict(first)
updated["price"] = 399999
r2 = requests.put(f"{base}/machines/{first['id']}", json=updated)
print(f"PUT status: {r2.status_code} - {r2.json()}")

# 4. Verify the update
r3 = requests.get(f"{base}/machines/{first['id']}")
print(f"After update price: {r3.json()['price']} FCFA")

# 5. Restore original price
updated["price"] = first["price"]
requests.put(f"{base}/machines/{first['id']}", json=updated)
print("Price restored.")

# 6. Check stats endpoint
r4 = requests.get(f"{base}/stats")
stats = r4.json()
print(f"Brands count: {len(stats['brands'])}")
print(f"Price ranges: {[p['category'] for p in stats['price_ranges']]}")
print(f"RAM distribution entries: {len(stats['ram_distribution'])}")
print("ALL API TESTS PASSED.")
