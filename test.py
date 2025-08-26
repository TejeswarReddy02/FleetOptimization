import requests

url = "http://127.0.0.1:5000/solve-tsp"
data = {"cities": ["Tadepalligudem","Vijayawada", "Bhimavaram"]}

response = requests.post(url, json=data)

print("Status:", response.status_code)
print("Response:", response.json())
