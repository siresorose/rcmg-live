import requests
import sys
import json
from datetime import datetime

class RCMGLiveAPITester:
    def __init__(self, base_url="https://go-rcmg.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.user_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_user = None
        self.regular_user = None

    def run_test(self, name, test_func):
        """Run a single test"""
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            success, message = test_func()
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - {message}")
            else:
                print(f"❌ Failed - {message}")
            return success
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def api_request(self, method, endpoint, data=None, token=None):
        """Make API request"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            
            return response.status_code, response.json() if response.content else {}
        except Exception as e:
            return None, str(e)

    def test_health_check(self):
        """Test API health check"""
        status, data = self.api_request('GET', '')
        if status == 200 and data.get('message') == 'RCMG Live API':
            return True, f"API is running - {data.get('status', 'online')}"
        return False, f"Health check failed - Status: {status}"

    def test_admin_registration(self):
        """Test admin registration with walker.elamen@gmail.com"""
        test_data = {
            "email": "walker.elamen@gmail.com",
            "password": "Admin123!",
            "username": "AdminUser"
        }
        
        status, data = self.api_request('POST', 'auth/register', test_data)
        
        if status == 200:
            self.admin_token = data.get('token')
            self.admin_user = data.get('user')
            if (self.admin_user.get('is_admin') and 
                self.admin_user.get('diamond_balance') >= 1000000000):
                return True, f"Admin registered with {self.admin_user.get('diamond_balance'):,} diamonds"
            else:
                return False, "Admin registration successful but incorrect privileges/balance"
        elif status == 400 and "already registered" in str(data.get('detail', '')):
            # Admin already exists, try login
            return self.test_admin_login()
        else:
            return False, f"Registration failed - Status: {status}, Data: {data}"

    def test_admin_login(self):
        """Test admin login"""
        login_data = {
            "email": "walker.elamen@gmail.com", 
            "password": "Admin123!"
        }
        
        status, data = self.api_request('POST', 'auth/login', login_data)
        
        if status == 200:
            self.admin_token = data.get('token')
            self.admin_user = data.get('user')
            if self.admin_user.get('is_admin'):
                return True, f"Admin logged in successfully with {self.admin_user.get('diamond_balance'):,} diamonds"
            else:
                return False, "Login successful but user is not admin"
        else:
            return False, f"Admin login failed - Status: {status}, Data: {data}"

    def test_regular_user_registration(self):
        """Test regular user registration"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        test_data = {
            "email": f"testuser2_{timestamp}@example.com",
            "password": "Test123!",
            "username": f"TestUser2_{timestamp}"
        }
        
        status, data = self.api_request('POST', 'auth/register', test_data)
        
        if status == 200:
            self.user_token = data.get('token')
            self.regular_user = data.get('user')
            if (not self.regular_user.get('is_admin') and 
                self.regular_user.get('diamond_balance') == 100):
                return True, f"User registered with {self.regular_user.get('diamond_balance')} diamonds"
            else:
                return False, f"User registration successful but incorrect balance: {self.regular_user.get('diamond_balance')}"
        else:
            return False, f"Registration failed - Status: {status}, Data: {data}"

    def test_user_login(self):
        """Test user login with existing credentials"""
        login_data = {
            "email": "testuser2@example.com",
            "password": "Test123!"
        }
        
        status, data = self.api_request('POST', 'auth/login', login_data)
        
        if status == 200:
            self.user_token = data.get('token')
            self.regular_user = data.get('user')
            return True, f"User logged in successfully"
        else:
            return False, f"User login failed - Status: {status}, Data: {data}"

    def test_auth_me(self):
        """Test /api/auth/me endpoint"""
        if not self.user_token:
            return False, "No user token available"
            
        status, data = self.api_request('GET', 'auth/me', token=self.user_token)
        
        if status == 200 and data.get('id'):
            return True, f"Auth/me returned user: {data.get('username')}"
        else:
            return False, f"Auth/me failed - Status: {status}, Data: {data}"

    def test_gifts_api(self):
        """Test /api/gifts endpoint"""
        status, data = self.api_request('GET', 'gifts')
        
        if status == 200 and isinstance(data, list):
            gift_count = len(data)
            if gift_count >= 8:  # Should have 8 default gifts
                gift_names = [g.get('name') for g in data]
                return True, f"Found {gift_count} gifts: {', '.join(gift_names[:3])}..."
            else:
                return False, f"Expected 8 gifts, found {gift_count}"
        else:
            return False, f"Gifts API failed - Status: {status}, Data: {data}"

    def test_subscription_plans(self):
        """Test /api/subscription/plans endpoint"""
        status, data = self.api_request('GET', 'subscription/plans')
        
        if status == 200 and data.get('plans'):
            plans = data.get('plans')
            monthly = next((p for p in plans if p.get('id') == 'monthly'), None)
            yearly = next((p for p in plans if p.get('id') == 'yearly'), None)
            
            if (monthly and monthly.get('price') == 9.99 and 
                yearly and yearly.get('price') == 74.99):
                return True, "Monthly ($9.99) and Yearly ($74.99) plans available"
            else:
                return False, f"Incorrect plan prices - Monthly: {monthly.get('price') if monthly else 'None'}, Yearly: {yearly.get('price') if yearly else 'None'}"
        else:
            return False, f"Subscription plans failed - Status: {status}, Data: {data}"

    def test_wallet_balance(self):
        """Test wallet balance endpoint"""
        if not self.user_token:
            return False, "No user token available"
            
        status, data = self.api_request('GET', 'wallet/balance', token=self.user_token)
        
        if status == 200 and 'balance' in data:
            return True, f"Wallet balance: {data.get('balance')} diamonds"
        else:
            return False, f"Wallet balance failed - Status: {status}, Data: {data}"

    def test_wallet_transactions(self):
        """Test wallet transactions endpoint"""
        if not self.user_token:
            return False, "No user token available"
            
        status, data = self.api_request('GET', 'wallet/transactions', token=self.user_token)
        
        if status == 200 and isinstance(data, list):
            return True, f"Retrieved {len(data)} transactions"
        else:
            return False, f"Wallet transactions failed - Status: {status}, Data: {data}"

    def test_streams_list(self):
        """Test streams list endpoint"""
        status, data = self.api_request('GET', 'streams')
        
        if status == 200 and isinstance(data, list):
            return True, f"Retrieved {len(data)} live streams"
        else:
            return False, f"Streams list failed - Status: {status}, Data: {data}"

    def test_leaderboards(self):
        """Test leaderboard endpoints"""
        status1, data1 = self.api_request('GET', 'leaderboard/gifters')
        status2, data2 = self.api_request('GET', 'leaderboard/streamers')
        
        if (status1 == 200 and isinstance(data1, list) and 
            status2 == 200 and isinstance(data2, list)):
            return True, f"Leaderboards: {len(data1)} gifters, {len(data2)} streamers"
        else:
            return False, f"Leaderboards failed - Gifters: {status1}, Streamers: {status2}"

    def test_admin_stats(self):
        """Test admin stats endpoint"""
        if not self.admin_token:
            return False, "No admin token available"
            
        status, data = self.api_request('GET', 'admin/stats', token=self.admin_token)
        
        if status == 200 and 'total_users' in data:
            stats = {k: v for k, v in data.items() if 'total' in k or 'live' in k or 'pending' in k}
            return True, f"Admin stats: {stats}"
        else:
            return False, f"Admin stats failed - Status: {status}, Data: {data}"

    def test_admin_users(self):
        """Test admin users endpoint"""
        if not self.admin_token:
            return False, "No admin token available"
            
        status, data = self.api_request('GET', 'admin/users', token=self.admin_token)
        
        if status == 200 and isinstance(data, list):
            return True, f"Admin retrieved {len(data)} users"
        else:
            return False, f"Admin users failed - Status: {status}, Data: {data}"

    def test_admin_diamond_grant(self):
        """Test admin diamond granting"""
        if not self.admin_token or not self.regular_user:
            return False, "Admin token or regular user not available"
            
        grant_data = {
            "user_id": self.regular_user.get('id'),
            "amount": 500,
            "reason": "API Test Grant"
        }
        
        status, data = self.api_request('POST', 'admin/diamonds/grant', grant_data, token=self.admin_token)
        
        if status == 200 and data.get('success'):
            return True, f"Granted 500 diamonds, new balance: {data.get('new_balance')}"
        else:
            return False, f"Diamond grant failed - Status: {status}, Data: {data}"

def main():
    """Main test runner"""
    tester = RCMGLiveAPITester()
    
    print("=" * 60)
    print("RCMG LIVE API TESTING")
    print("=" * 60)
    
    # Run all tests
    tests = [
        ("API Health Check", tester.test_health_check),
        ("Admin Registration/Login", tester.test_admin_registration),
        ("Regular User Registration", tester.test_regular_user_registration),
        ("User Login Test", tester.test_user_login),
        ("Auth Me Endpoint", tester.test_auth_me),
        ("Gifts API", tester.test_gifts_api),
        ("Subscription Plans", tester.test_subscription_plans),
        ("Wallet Balance", tester.test_wallet_balance),
        ("Wallet Transactions", tester.test_wallet_transactions),
        ("Streams List", tester.test_streams_list),
        ("Leaderboards", tester.test_leaderboards),
        ("Admin Stats", tester.test_admin_stats),
        ("Admin Users", tester.test_admin_users),
        ("Admin Diamond Grant", tester.test_admin_diamond_grant),
    ]
    
    for name, test_func in tests:
        tester.run_test(name, test_func)
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS: {tester.tests_passed}/{tester.tests_run} tests passed")
    print("=" * 60)
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        failed = tester.tests_run - tester.tests_passed
        print(f"⚠️  {failed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())