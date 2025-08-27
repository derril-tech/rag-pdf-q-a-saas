# Created automatically by Cursor AI (2024-12-19)

import pytest
import sys
import os
import asyncio
from pathlib import Path
import subprocess


def install_playwright_browsers():
    """Install Playwright browsers if not already installed"""
    try:
        # Check if browsers are installed
        result = subprocess.run(
            ["playwright", "install", "--dry-run"],
            capture_output=True,
            text=True
        )
        
        if "No browsers to install" not in result.stdout:
            print("Installing Playwright browsers...")
            subprocess.run(["playwright", "install"], check=True)
            print("Playwright browsers installed successfully!")
        else:
            print("Playwright browsers already installed.")
            
    except subprocess.CalledProcessError as e:
        print(f"Error installing Playwright browsers: {e}")
        return False
    except FileNotFoundError:
        print("Playwright not found. Please install it first:")
        print("pip install playwright")
        return False
    
    return True


def run_e2e_tests():
    """Run all E2E tests with proper configuration"""

    # Add the app directory to Python path
    app_dir = Path(__file__).parent.parent / "app"
    sys.path.insert(0, str(app_dir))

    # Test directory
    test_dir = Path(__file__).parent / "e2e"

    # Install Playwright browsers
    if not install_playwright_browsers():
        return 1

    # Configure pytest arguments for E2E tests
    pytest_args = [
        str(test_dir),
        "-v",  # Verbose output
        "--tb=short",  # Short traceback format
        "--strict-markers",  # Strict marker checking
        "--disable-warnings",  # Disable warnings
        "--color=yes",  # Colored output
        "--durations=10",  # Show 10 slowest tests
        "-m", "e2e",  # Only run E2E tests
        "--asyncio-mode=auto",  # Enable asyncio support
        "--timeout=300",  # 5 minute timeout per test
        "--junit-xml=e2e-test-results.xml",  # Generate JUnit XML report
        "--html=e2e-report.html",  # Generate HTML report
        "--self-contained-html",  # Self-contained HTML report
    ]

    # Set environment variables for E2E tests
    env = os.environ.copy()
    env.update({
        "PLAYWRIGHT_HEADLESS": "true",
        "PLAYWRIGHT_TIMEOUT": "300000",  # 5 minutes
        "PLAYWRIGHT_BROWSER": "chromium",
    })

    # Run tests
    try:
        exit_code = pytest.main(pytest_args)
        return exit_code
    except Exception as e:
        print(f"Error running E2E tests: {e}")
        return 1


def run_specific_e2e_test(test_name: str):
    """Run a specific E2E test"""
    app_dir = Path(__file__).parent.parent / "app"
    sys.path.insert(0, str(app_dir))

    test_dir = Path(__file__).parent / "e2e"

    pytest_args = [
        str(test_dir),
        "-v",
        "--tb=short",
        "--color=yes",
        "-m", "e2e",
        "--asyncio-mode=auto",
        "--timeout=300",
        "-k", test_name,  # Run specific test
    ]

    env = os.environ.copy()
    env.update({
        "PLAYWRIGHT_HEADLESS": "true",
        "PLAYWRIGHT_TIMEOUT": "300000",
        "PLAYWRIGHT_BROWSER": "chromium",
    })

    return pytest.main(pytest_args)


def run_e2e_tests_with_coverage():
    """Run E2E tests with coverage reporting"""
    app_dir = Path(__file__).parent.parent / "app"
    sys.path.insert(0, str(app_dir))

    test_dir = Path(__file__).parent / "e2e"

    pytest_args = [
        str(test_dir),
        "-v",
        "--tb=short",
        "--color=yes",
        "-m", "e2e",
        "--asyncio-mode=auto",
        "--timeout=300",
        "--cov=app",
        "--cov-report=term-missing",
        "--cov-report=html:e2e-htmlcov",
        "--cov-report=xml:e2e-coverage.xml",
        "--junit-xml=e2e-test-results.xml",
    ]

    env = os.environ.copy()
    env.update({
        "PLAYWRIGHT_HEADLESS": "true",
        "PLAYWRIGHT_TIMEOUT": "300000",
        "PLAYWRIGHT_BROWSER": "chromium",
    })

    return pytest.main(pytest_args)


def run_e2e_tests_parallel(workers: int = 2):
    """Run E2E tests in parallel"""
    app_dir = Path(__file__).parent.parent / "app"
    sys.path.insert(0, str(app_dir))

    test_dir = Path(__file__).parent / "e2e"

    pytest_args = [
        str(test_dir),
        "-v",
        "--tb=short",
        "--color=yes",
        "-m", "e2e",
        "--asyncio-mode=auto",
        "--timeout=300",
        "-n", str(workers),  # Number of parallel workers
        "--dist=loadfile",  # Distribute tests by file
        "--junit-xml=e2e-test-results.xml",
    ]

    env = os.environ.copy()
    env.update({
        "PLAYWRIGHT_HEADLESS": "true",
        "PLAYWRIGHT_TIMEOUT": "300000",
        "PLAYWRIGHT_BROWSER": "chromium",
    })

    return pytest.main(pytest_args)


def main():
    """Main function to run E2E tests"""
    import argparse

    parser = argparse.ArgumentParser(description="Run E2E tests with Playwright")
    parser.add_argument(
        "--test", 
        type=str, 
        help="Run a specific test by name"
    )
    parser.add_argument(
        "--coverage", 
        action="store_true", 
        help="Run tests with coverage reporting"
    )
    parser.add_argument(
        "--parallel", 
        type=int, 
        default=0,
        help="Run tests in parallel with specified number of workers"
    )

    args = parser.parse_args()

    if args.test:
        print(f"Running specific E2E test: {args.test}")
        exit_code = run_specific_e2e_test(args.test)
    elif args.coverage:
        print("Running E2E tests with coverage...")
        exit_code = run_e2e_tests_with_coverage()
    elif args.parallel > 0:
        print(f"Running E2E tests in parallel with {args.parallel} workers...")
        exit_code = run_e2e_tests_parallel(args.parallel)
    else:
        print("Running all E2E tests...")
        exit_code = run_e2e_tests()

    if exit_code == 0:
        print("\n" + "="*50)
        print("E2E TESTS COMPLETED SUCCESSFULLY")
        print("="*50)
        print("Reports generated:")
        print("- JUnit XML: e2e-test-results.xml")
        if args.coverage:
            print("- Coverage HTML: e2e-htmlcov/index.html")
            print("- Coverage XML: e2e-coverage.xml")
        else:
            print("- HTML Report: e2e-report.html")
    else:
        print("\n" + "="*50)
        print("E2E TESTS FAILED")
        print("="*50)

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
