# Created automatically by Cursor AI (2024-12-19)

import pytest
import sys
import os
from pathlib import Path


def run_unit_tests():
    """Run all unit tests with proper configuration"""
    
    # Add the app directory to Python path
    app_dir = Path(__file__).parent.parent / "app"
    sys.path.insert(0, str(app_dir))
    
    # Test directory
    test_dir = Path(__file__).parent / "unit"
    
    # Configure pytest arguments
    pytest_args = [
        str(test_dir),
        "-v",  # Verbose output
        "--tb=short",  # Short traceback format
        "--strict-markers",  # Strict marker checking
        "--disable-warnings",  # Disable warnings
        "--color=yes",  # Colored output
        "--durations=10",  # Show 10 slowest tests
        "--cov=app",  # Coverage for app module
        "--cov-report=term-missing",  # Show missing lines in coverage
        "--cov-report=html:htmlcov",  # Generate HTML coverage report
        "--cov-report=xml:coverage.xml",  # Generate XML coverage report
        "--junit-xml=test-results.xml",  # Generate JUnit XML report
    ]
    
    # Run tests
    exit_code = pytest.main(pytest_args)
    
    return exit_code


if __name__ == "__main__":
    exit_code = run_unit_tests()
    sys.exit(exit_code)
