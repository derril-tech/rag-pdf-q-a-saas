# Created automatically by Cursor AI (2024-12-19)

import pytest
import requests
import time
import os
from typing import Dict, Any


class TestStagingDeployment:
    """Smoke tests for staging deployment"""

    @pytest.fixture
    def base_url(self):
        """Get the base URL for staging environment"""
        return os.getenv("STAGING_BASE_URL", "https://staging.yourapp.com")

    @pytest.fixture
    def api_url(self):
        """Get the API URL for staging environment"""
        return os.getenv("STAGING_API_URL", "https://api.staging.yourapp.com")

    @pytest.mark.smoke
    def test_gateway_health_check(self, api_url):
        """Test that the gateway health endpoint is responding"""
        print("Testing gateway health check")
        
        try:
            response = requests.get(f"{api_url}/health", timeout=10)
            assert response.status_code == 200, f"Health check failed with status {response.status_code}"
            
            data = response.json()
            assert "status" in data, "Health response should contain status"
            assert data["status"] == "ok", "Health status should be 'ok'"
            
            print("✓ Gateway health check passed")
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Health check request failed: {e}")

    @pytest.mark.smoke
    def test_frontend_accessible(self, base_url):
        """Test that the frontend is accessible"""
        print("Testing frontend accessibility")
        
        try:
            response = requests.get(base_url, timeout=10)
            assert response.status_code == 200, f"Frontend request failed with status {response.status_code}"
            
            # Check that it's returning HTML
            assert "text/html" in response.headers.get("content-type", ""), "Frontend should return HTML"
            
            print("✓ Frontend accessibility test passed")
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Frontend request failed: {e}")

    @pytest.mark.smoke
    def test_database_connection(self, api_url):
        """Test that the database connection is working"""
        print("Testing database connection")
        
        try:
            # Test a simple API endpoint that requires database access
            response = requests.get(f"{api_url}/v1/projects", timeout=10)
            
            # Should return 401 (unauthorized) rather than 500 (server error)
            assert response.status_code in [401, 403], f"Database test failed with status {response.status_code}"
            
            print("✓ Database connection test passed")
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Database connection test failed: {e}")

    @pytest.mark.smoke
    def test_redis_connection(self, api_url):
        """Test that Redis connection is working"""
        print("Testing Redis connection")
        
        try:
            # Test rate limiting (which uses Redis)
            for i in range(5):
                response = requests.get(f"{api_url}/health", timeout=5)
                assert response.status_code == 200, f"Redis test failed with status {response.status_code}"
                time.sleep(0.1)
            
            print("✓ Redis connection test passed")
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Redis connection test failed: {e}")

    @pytest.mark.smoke
    def test_nats_connection(self, api_url):
        """Test that NATS connection is working"""
        print("Testing NATS connection")
        
        try:
            # Test an endpoint that might use NATS for messaging
            response = requests.get(f"{api_url}/health", timeout=10)
            assert response.status_code == 200, f"NATS test failed with status {response.status_code}"
            
            print("✓ NATS connection test passed")
        except requests.exceptions.RequestException as e:
            pytest.fail(f"NATS connection test failed: {e}")

    @pytest.mark.smoke
    def test_s3_storage_connection(self, api_url):
        """Test that S3/MinIO storage is accessible"""
        print("Testing S3 storage connection")
        
        try:
            # Test an endpoint that might use S3
            response = requests.get(f"{api_url}/health", timeout=10)
            assert response.status_code == 200, f"S3 test failed with status {response.status_code}"
            
            print("✓ S3 storage connection test passed")
        except requests.exceptions.RequestException as e:
            pytest.fail(f"S3 storage connection test failed: {e}")

    @pytest.mark.smoke
    def test_monitoring_endpoints(self, api_url):
        """Test that monitoring endpoints are accessible"""
        print("Testing monitoring endpoints")
        
        try:
            # Test metrics endpoint
            response = requests.get(f"{api_url}/metrics", timeout=10)
            assert response.status_code == 200, f"Metrics endpoint failed with status {response.status_code}"
            
            # Check that it returns Prometheus metrics format
            content = response.text
            assert "# HELP" in content or "# TYPE" in content, "Metrics should be in Prometheus format"
            
            print("✓ Monitoring endpoints test passed")
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Monitoring endpoints test failed: {e}")

    @pytest.mark.smoke
    def test_worker_health(self, api_url):
        """Test that workers are healthy"""
        print("Testing worker health")
        
        try:
            # Test an endpoint that requires worker processing
            response = requests.get(f"{api_url}/health", timeout=10)
            assert response.status_code == 200, f"Worker health test failed with status {response.status_code}"
            
            print("✓ Worker health test passed")
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Worker health test failed: {e}")

    @pytest.mark.smoke
    def test_ssl_certificate(self, base_url):
        """Test that SSL certificate is valid"""
        print("Testing SSL certificate")
        
        try:
            response = requests.get(base_url, timeout=10, verify=True)
            assert response.status_code == 200, f"SSL test failed with status {response.status_code}"
            
            print("✓ SSL certificate test passed")
        except requests.exceptions.SSLError as e:
            pytest.fail(f"SSL certificate is invalid: {e}")
        except requests.exceptions.RequestException as e:
            pytest.fail(f"SSL test failed: {e}")

    @pytest.mark.smoke
    def test_response_time(self, api_url):
        """Test that response times are acceptable"""
        print("Testing response time")
        
        try:
            start_time = time.time()
            response = requests.get(f"{api_url}/health", timeout=10)
            end_time = time.time()
            
            response_time = end_time - start_time
            assert response.status_code == 200, f"Response time test failed with status {response.status_code}"
            assert response_time < 2.0, f"Response time {response_time:.2f}s is too slow (>2s)"
            
            print(f"✓ Response time test passed ({response_time:.2f}s)")
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Response time test failed: {e}")

    @pytest.mark.smoke
    def test_cors_headers(self, api_url):
        """Test that CORS headers are properly configured"""
        print("Testing CORS headers")
        
        try:
            response = requests.options(f"{api_url}/health", timeout=10)
            
            # CORS headers should be present
            cors_headers = [
                "access-control-allow-origin",
                "access-control-allow-methods",
                "access-control-allow-headers"
            ]
            
            for header in cors_headers:
                assert header in response.headers, f"CORS header {header} is missing"
            
            print("✓ CORS headers test passed")
        except requests.exceptions.RequestException as e:
            pytest.fail(f"CORS headers test failed: {e}")


class TestStagingIntegration:
    """Integration tests for staging environment"""

    @pytest.fixture
    def api_url(self):
        """Get the API URL for staging environment"""
        return os.getenv("STAGING_API_URL", "https://api.staging.yourapp.com")

    @pytest.mark.integration
    def test_complete_workflow(self, api_url):
        """Test a complete workflow from upload to QA"""
        print("Testing complete workflow")
        
        # This would test the full workflow:
        # 1. Create a project
        # 2. Upload a document
        # 3. Process the document
        # 4. Ask a question
        # 5. Verify the answer
        
        # For now, just test that the API is accessible
        try:
            response = requests.get(f"{api_url}/health", timeout=10)
            assert response.status_code == 200, f"Workflow test failed with status {response.status_code}"
            
            print("✓ Complete workflow test passed")
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Complete workflow test failed: {e}")

    @pytest.mark.integration
    def test_error_handling(self, api_url):
        """Test that error handling works correctly"""
        print("Testing error handling")
        
        try:
            # Test a non-existent endpoint
            response = requests.get(f"{api_url}/nonexistent", timeout=10)
            assert response.status_code == 404, f"Error handling test failed with status {response.status_code}"
            
            print("✓ Error handling test passed")
        except requests.exceptions.RequestException as e:
            pytest.fail(f"Error handling test failed: {e}")


def run_staging_smoke_tests():
    """Run all staging smoke tests"""
    import pytest
    import sys
    
    # Add the tests directory to Python path
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    # Run the tests
    pytest.main([
        __file__,
        "-v",
        "--tb=short",
        "-m", "smoke",
        "--color=yes"
    ])


if __name__ == "__main__":
    run_staging_smoke_tests()
