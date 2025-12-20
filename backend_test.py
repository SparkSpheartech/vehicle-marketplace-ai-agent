#!/usr/bin/env python3
"""
Forza Community Backend API Test Suite
Tests all backend endpoints for functionality and integration
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Tuple

class ForzaCommunityAPITester:
    def __init__(self, base_url="https://forzacommunity.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.session_token = "test_session_1766193900361"  # From created test user
        self.user_id = "test-user-1766193900361"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.passed_tests = []
        
        # Test data storage
        self.test_car_id = None
        self.test_lobby_id = None
        self.test_squad_id = None

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Dict[Any, Any] = None, params: Dict[str, str] = None) -> Tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        headers = {'Content-Type': 'application/json'}
        
        if self.session_token:
            headers['Authorization'] = f'Bearer {self.session_token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, params=params)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, params=params)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, params=params)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                self.passed_tests.append(name)
                try:
                    return success, response.json() if response.text else {}
                except:
                    return success, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:500]
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            return False, {}

    def test_root_endpoint(self):
        """Test /api/ root endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "/",
            200
        )
        if success:
            print(f"   API Version: {response.get('version', 'N/A')}")
            print(f"   Message: {response.get('message', 'N/A')}")
        return success

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n=== AUTHENTICATION TESTS ===")
        
        # Test /auth/me
        success, user_data = self.run_test(
            "Get Current User (/auth/me)",
            "GET",
            "/auth/me",
            200
        )
        
        if success and user_data:
            print(f"   User ID: {user_data.get('user_id')}")
            print(f"   Email: {user_data.get('email')}")
            print(f"   Name: {user_data.get('name')}")
        
        return success

    def test_car_endpoints(self):
        """Test car-related endpoints"""
        print("\n=== CAR ENDPOINTS TESTS ===")
        
        # Test car makes
        success1, makes_data = self.run_test(
            "Get Car Makes (/cars/makes)",
            "GET",
            "/cars/makes",
            200
        )
        
        if success1:
            makes_count = len(makes_data) if isinstance(makes_data, list) else 0
            print(f"   Car makes found: {makes_count}")
            if makes_count >= 30:
                print(f"✅ Requirement met: 30+ car makes ({makes_count} found)")
            else:
                print(f"❌ Requirement not met: Expected 30+ makes, found {makes_count}")
            
            # Test car models for first make
            if makes_data and isinstance(makes_data, list) and len(makes_data) > 0:
                first_make = makes_data[0]
                success2, models_data = self.run_test(
                    f"Get Car Models for {first_make} (/cars/models/{first_make})",
                    "GET",
                    f"/cars/models/{first_make}",
                    200
                )
                if success2:
                    models_count = len(models_data) if isinstance(models_data, list) else 0
                    print(f"   Models for {first_make}: {models_count}")
        
        return success1

    def test_garage_endpoints(self):
        """Test garage endpoints"""
        print("\n=== GARAGE ENDPOINTS TESTS ===")
        
        # Test get garage
        success1, garage_data = self.run_test(
            "Get User Garage (/garage)",
            "GET",
            "/garage",
            200
        )
        
        if success1:
            car_count = len(garage_data) if isinstance(garage_data, list) else 0
            print(f"   Cars in garage: {car_count}")
        
        # Test add car with extended fields
        car_data = {
            "make": "Nissan",
            "model": "GT-R R35",
            "year": 2024,
            "color": "#22c55e",
            "secondary_color": "#000000",
            "horsepower": 565,
            "torque": 467,
            "weight": 3829,
            "drivetrain": "AWD",
            "mods": {
                "body_kit": "widebody",
                "spoiler": "gt_wing",
                "wheels": "te37",
                "exhaust": "titanium",
                "wrap": "racing_livery",
                "neon": "green",
                "tint": "dark"
            },
            "is_primary": True
        }
        
        success2, car_response = self.run_test(
            "Add Car with Extended Fields (/garage/cars)",
            "POST",
            "/garage/cars",
            200,
            data=car_data
        )
        
        if success2 and car_response:
            self.test_car_id = car_response.get('car_id')
            print(f"   Created car ID: {self.test_car_id}")
            print(f"   Horsepower: {car_response.get('horsepower')}")
            print(f"   Torque: {car_response.get('torque')}")
            print(f"   Weight: {car_response.get('weight')}")
            print(f"   Drivetrain: {car_response.get('drivetrain')}")
            
            # Verify extended fields are present
            required_fields = ['horsepower', 'torque', 'weight', 'drivetrain', 'mods']
            missing_fields = [field for field in required_fields if field not in car_response]
            if not missing_fields:
                print("✅ All extended fields present in response")
            else:
                print(f"❌ Missing extended fields: {missing_fields}")
        
        return success1 and success2

    def test_location_endpoints(self):
        """Test location and speedometer endpoints"""
        print("\n=== LOCATION & SPEEDOMETER TESTS ===")
        
        # Test location update with trip stats
        location_data = {
            "lat": 34.0522,
            "lng": -118.2437,
            "speed": 65.5,
            "heading": 90
        }
        
        success1, location_response = self.run_test(
            "Update Location with Speed (/location/update)",
            "POST",
            "/location/update",
            200,
            data=location_data
        )
        
        if success1 and location_response:
            trip_stats = location_response.get('trip_stats', {})
            print(f"   Trip stats returned: {bool(trip_stats)}")
            if trip_stats:
                print(f"   Top speed: {trip_stats.get('top_speed', 0)} mph")
                print(f"   Total distance: {trip_stats.get('total_distance', 0)} miles")
                print(f"   Avg speed: {trip_stats.get('avg_speed', 0)} mph")
                
                # Check required trip_stats fields
                required_stats = ['top_speed', 'total_distance', 'avg_speed']
                missing_stats = [stat for stat in required_stats if stat not in trip_stats]
                if not missing_stats:
                    print("✅ All trip_stats fields present")
                else:
                    print(f"❌ Missing trip_stats fields: {missing_stats}")
        
        # Test trip reset
        success2, reset_response = self.run_test(
            "Reset Trip Stats (/location/reset-trip)",
            "POST",
            "/location/reset-trip",
            200
        )
        
        return success1 and success2

    def test_music_endpoints(self):
        """Test music endpoints"""
        print("\n=== MUSIC ENDPOINTS TESTS ===")
        
        # Test music update
        song_data = {
            "name": "Blinding Lights",
            "artist": "The Weeknd",
            "album_art": "https://via.placeholder.com/300x300/22c55e/000000?text=BL"
        }
        
        success1, music_response = self.run_test(
            "Update Current Song (/music/update)",
            "POST",
            "/music/update",
            200,
            data=song_data
        )
        
        if success1 and music_response:
            current_song = music_response.get('current_song', {})
            print(f"   Song updated: {current_song.get('name', 'N/A')}")
            print(f"   Artist: {current_song.get('artist', 'N/A')}")
        
        # Test clear music
        success2, clear_response = self.run_test(
            "Clear Current Song (/music/clear)",
            "DELETE",
            "/music/clear",
            200
        )
        
        return success1 and success2

    def test_lobby_endpoints(self):
        """Test lobby endpoints"""
        print("\n=== LOBBY ENDPOINTS TESTS ===")
        
        # Test get lobbies
        success1, lobbies_data = self.run_test(
            "Get Lobbies (/lobbies)",
            "GET",
            "/lobbies",
            200
        )
        
        if success1:
            lobby_count = len(lobbies_data) if isinstance(lobbies_data, list) else 0
            print(f"   Lobbies found: {lobby_count}")
        
        # Test join lobby
        lobby_data = {
            "city": "Los Angeles",
            "state": "CA"
        }
        
        success2, join_response = self.run_test(
            "Join Lobby (/lobbies/join)",
            "POST",
            "/lobbies/join",
            200,
            data=lobby_data
        )
        
        if success2 and join_response:
            lobby = join_response.get('lobby', {})
            self.test_lobby_id = lobby.get('lobby_id')
            print(f"   Joined lobby: {lobby.get('city')}, {lobby.get('state')}")
            print(f"   Lobby ID: {self.test_lobby_id}")
        
        return success1 and success2

    def test_squad_endpoints(self):
        """Test squad endpoints"""
        print("\n=== SQUAD ENDPOINTS TESTS ===")
        
        # Test get user squad (should be null initially)
        success1, squad_data = self.run_test(
            "Get User Squad (/squads)",
            "GET",
            "/squads",
            200
        )
        
        if success1:
            print(f"   Current squad: {squad_data if squad_data else 'None'}")
        
        # Test get squad invites
        success2, invites_data = self.run_test(
            "Get Squad Invites (/squads/invites)",
            "GET",
            "/squads/invites",
            200
        )
        
        if success2:
            invite_count = len(invites_data) if isinstance(invites_data, list) else 0
            print(f"   Squad invites: {invite_count}")
        
        # Note: Squad creation requires PayPal payment, so we'll skip that in testing
        print("   Note: Squad creation requires PayPal payment - skipping in tests")
        
        return success1 and success2

    def test_discovery_endpoints(self):
        """Test user discovery endpoints"""
        print("\n=== DISCOVERY ENDPOINTS TESTS ===")
        
        # Test discover users
        success1, users_data = self.run_test(
            "Discover Users (/discover)",
            "GET",
            "/discover",
            200
        )
        
        if success1:
            user_count = len(users_data) if isinstance(users_data, list) else 0
            print(f"   Nearby users: {user_count}")
        
        return success1

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Forza Community Backend API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print(f"🔑 Session Token: {self.session_token[:20]}...")
        
        # Run all test suites
        test_results = []
        
        test_results.append(self.test_root_endpoint())
        test_results.append(self.test_auth_endpoints())
        test_results.append(self.test_car_endpoints())
        test_results.append(self.test_garage_endpoints())
        test_results.append(self.test_location_endpoints())
        test_results.append(self.test_music_endpoints())
        test_results.append(self.test_lobby_endpoints())
        test_results.append(self.test_squad_endpoints())
        test_results.append(self.test_discovery_endpoints())
        
        # Print summary
        print(f"\n📊 TEST SUMMARY")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Tests failed: {len(self.failed_tests)}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ FAILED TESTS:")
            for failure in self.failed_tests:
                print(f"   - {failure.get('test', 'Unknown')}")
                if 'error' in failure:
                    print(f"     Error: {failure['error']}")
                elif 'expected' in failure:
                    print(f"     Expected: {failure['expected']}, Got: {failure['actual']}")
        
        if self.passed_tests:
            print(f"\n✅ PASSED TESTS:")
            for test in self.passed_tests:
                print(f"   - {test}")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = ForzaCommunityAPITester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except Exception as e:
        print(f"💥 Test suite failed with error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())