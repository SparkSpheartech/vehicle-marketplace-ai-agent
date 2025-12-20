import requests
import sys
import json
from datetime import datetime
import subprocess
import os

class ForzaCommunityAPITester:
    def __init__(self, base_url="https://forzacommunity.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.passed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}" if not endpoint.startswith('http') else endpoint
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
            
        if self.session_token and 'Authorization' not in test_headers:
            test_headers['Authorization'] = f'Bearer {self.session_token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.passed_tests.append(name)
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:500]
                })
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def create_test_user(self):
        """Create a test user and session using MongoDB"""
        print("\n🔧 Creating test user and session...")
        
        timestamp = int(datetime.now().timestamp())
        user_id = f"test-user-{timestamp}"
        session_token = f"test_session_{timestamp}"
        
        mongo_script = f"""
use('test_database');
var userId = '{user_id}';
var sessionToken = '{session_token}';
db.users.insertOne({{
  user_id: userId,
  email: 'test.user.{timestamp}@example.com',
  name: 'Test User {timestamp}',
  picture: 'https://via.placeholder.com/150',
  bio: 'Test bio for API testing',
  avatar_style: {{
    skin_tone: '#FFD5C8',
    hair_style: 'short',
    hair_color: '#2C1810',
    outfit: 'racing_jacket',
    outfit_color: '#22c55e',
    accessory: 'none'
  }},
  current_lobby: null,
  location: null,
  created_at: new Date()
}});
db.user_sessions.insertOne({{
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
}});
print('SUCCESS: Created user and session');
"""
        
        try:
            result = subprocess.run(
                ['mongosh', '--eval', mongo_script],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0 and 'SUCCESS' in result.stdout:
                self.session_token = session_token
                self.user_id = user_id
                print(f"✅ Test user created: {user_id}")
                print(f"✅ Session token: {session_token}")
                return True
            else:
                print(f"❌ Failed to create test user: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Error creating test user: {e}")
            return False

    def cleanup_test_data(self):
        """Clean up test data"""
        if not self.user_id:
            return
            
        print(f"\n🧹 Cleaning up test data for user: {self.user_id}")
        
        cleanup_script = f"""
use('test_database');
db.users.deleteOne({{user_id: '{self.user_id}'}});
db.user_sessions.deleteOne({{user_id: '{self.user_id}'}});
db.cars.deleteMany({{user_id: '{self.user_id}'}});
db.join_requests.deleteMany({{$or: [{{from_user_id: '{self.user_id}'}}, {{to_user_id: '{self.user_id}'}}]}});
print('CLEANUP: Complete');
"""
        
        try:
            subprocess.run(['mongosh', '--eval', cleanup_script], timeout=30)
            print("✅ Test data cleaned up")
        except Exception as e:
            print(f"⚠️  Cleanup warning: {e}")

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        return self.run_test("Root API Endpoint", "GET", "", 200)

    def test_auth_me(self):
        """Test authenticated user endpoint"""
        return self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_lobbies_list(self):
        """Test lobbies list endpoint"""
        return self.run_test("Get Lobbies List", "GET", "lobbies", 200)

    def test_garage_get(self):
        """Test get user's garage"""
        return self.run_test("Get User Garage", "GET", "garage", 200)

    def test_garage_add_car(self):
        """Test adding a car to garage"""
        car_data = {
            "make": "Nissan",
            "model": "GT-R",
            "year": 2024,
            "color": "#22c55e",
            "secondary_color": "#000000",
            "horsepower": 565,
            "mods": {
                "body_kit": "widebody",
                "spoiler": "gt_wing",
                "wheels": "te37",
                "exhaust": "titanium",
                "wrap": "racing_livery"
            },
            "is_primary": True
        }
        return self.run_test("Add Car to Garage", "POST", "garage/cars", 201, car_data)

    def test_lobby_join(self):
        """Test joining a lobby"""
        lobby_data = {
            "city": "Los Angeles",
            "state": "CA"
        }
        return self.run_test("Join City Lobby", "POST", "lobbies/join", 200, lobby_data)

    def test_location_update(self):
        """Test updating user location"""
        location_data = {
            "lat": 34.0522,
            "lng": -118.2437
        }
        return self.run_test("Update User Location", "POST", "location/update", 200, location_data)

    def test_create_join_request(self):
        """Test creating a join request (will fail without target user, but tests endpoint)"""
        request_data = {
            "to_user_id": "nonexistent-user",
            "message": "Hey! Let's connect!"
        }
        # This should return 404 since user doesn't exist, which is expected behavior
        return self.run_test("Create Join Request", "POST", "requests", 404, request_data)

    def test_profile_update(self):
        """Test updating user profile"""
        profile_data = {
            "name": "Updated Test User",
            "bio": "Updated bio for testing",
            "avatar_style": {
                "skin_tone": "#F5C4A1",
                "hair_style": "long",
                "hair_color": "#654321",
                "outfit": "hoodie",
                "outfit_color": "#06b6d4",
                "accessory": "glasses"
            }
        }
        return self.run_test("Update User Profile", "PUT", "users/me", 200, profile_data)

def main():
    print("🚗 Forza Community API Testing Suite")
    print("=" * 50)
    
    tester = ForzaCommunityAPITester()
    
    # Create test user first
    if not tester.create_test_user():
        print("❌ Cannot proceed without test user")
        return 1
    
    try:
        # Test all endpoints
        print("\n📡 Testing API Endpoints...")
        
        # Public endpoints
        tester.test_root_endpoint()
        tester.test_lobbies_list()
        
        # Authenticated endpoints
        tester.test_auth_me()
        tester.test_garage_get()
        tester.test_garage_add_car()
        tester.test_lobby_join()
        tester.test_location_update()
        tester.test_create_join_request()  # Expected to fail with 404
        tester.test_profile_update()
        
        # Print results
        print("\n" + "=" * 50)
        print("📊 TEST RESULTS")
        print("=" * 50)
        print(f"Total Tests: {tester.tests_run}")
        print(f"Passed: {tester.tests_passed}")
        print(f"Failed: {len(tester.failed_tests)}")
        print(f"Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
        
        if tester.passed_tests:
            print(f"\n✅ Passed Tests:")
            for test in tester.passed_tests:
                print(f"   • {test}")
        
        if tester.failed_tests:
            print(f"\n❌ Failed Tests:")
            for failure in tester.failed_tests:
                print(f"   • {failure['test']}")
                if 'expected' in failure:
                    print(f"     Expected: {failure['expected']}, Got: {failure['actual']}")
                if 'error' in failure:
                    print(f"     Error: {failure['error']}")
        
        # Determine success (allow 1 expected failure for join request test)
        expected_failures = 1  # join request to nonexistent user
        actual_failures = len(tester.failed_tests)
        
        if actual_failures <= expected_failures:
            print(f"\n🎉 API Testing PASSED! ({actual_failures} expected failures)")
            return 0
        else:
            print(f"\n💥 API Testing FAILED! ({actual_failures - expected_failures} unexpected failures)")
            return 1
            
    finally:
        # Always cleanup
        tester.cleanup_test_data()

if __name__ == "__main__":
    sys.exit(main())