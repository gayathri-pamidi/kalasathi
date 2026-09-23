from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
response = client.get('/health')
print(f'Status Code: {response.status_code}')
print(f'Response Body: {response.json()}')
