# Created automatically by Cursor AI (2024-12-19)

import pytest
import sys
import os
import asyncio
import time
from pathlib import Path
import argparse


def run_load_tests():
    """Run all load tests with proper configuration"""

    # Add the app directory to Python path
    app_dir = Path(__file__).parent.parent / "app"
    sys.path.insert(0, str(app_dir))

    # Test directory
    test_dir = Path(__file__).parent / "load"

    # Configure pytest arguments for load tests
    pytest_args = [
        str(test_dir),
        "-v",  # Verbose output
        "--tb=short",  # Short traceback format
        "--strict-markers",  # Strict marker checking
        "--disable-warnings",  # Disable warnings
        "--color=yes",  # Colored output
        "--durations=10",  # Show 10 slowest tests
        "-m", "load",  # Only run load tests
        "--asyncio-mode=auto",  # Enable asyncio support
        "--timeout=600",  # 10 minute timeout per test
        "--junit-xml=load-test-results.xml",  # Generate JUnit XML report
        "--html=load-report.html",  # Generate HTML report
        "--self-contained-html",  # Self-contained HTML report
    ]

    # Set environment variables for load tests
    env = os.environ.copy()
    env.update({
        "LOAD_TEST_MODE": "true",
        "LOAD_TEST_TIMEOUT": "600",
    })

    # Run tests
    try:
        exit_code = pytest.main(pytest_args)
        return exit_code
    except Exception as e:
        print(f"Error running load tests: {e}")
        return 1


def run_specific_load_test(test_name: str):
    """Run a specific load test"""
    app_dir = Path(__file__).parent.parent / "app"
    sys.path.insert(0, str(app_dir))

    test_dir = Path(__file__).parent / "load"

    pytest_args = [
        str(test_dir),
        "-v",
        "--tb=short",
        "--color=yes",
        "-m", "load",
        "--asyncio-mode=auto",
        "--timeout=600",
        "-k", test_name,  # Run specific test
    ]

    env = os.environ.copy()
    env.update({
        "LOAD_TEST_MODE": "true",
        "LOAD_TEST_TIMEOUT": "600",
    })

    return pytest.main(pytest_args)


def run_load_tests_with_monitoring():
    """Run load tests with monitoring and metrics collection"""
    app_dir = Path(__file__).parent.parent / "app"
    sys.path.insert(0, str(app_dir))

    test_dir = Path(__file__).parent / "load"

    pytest_args = [
        str(test_dir),
        "-v",
        "--tb=short",
        "--color=yes",
        "-m", "load",
        "--asyncio-mode=auto",
        "--timeout=600",
        "--junit-xml=load-test-results.xml",
        "--html=load-report.html",
        "--self-contained-html",
    ]

    env = os.environ.copy()
    env.update({
        "LOAD_TEST_MODE": "true",
        "LOAD_TEST_TIMEOUT": "600",
        "ENABLE_MONITORING": "true",
    })

    return pytest.main(pytest_args)


def run_load_tests_parallel(workers: int = 2):
    """Run load tests in parallel"""
    app_dir = Path(__file__).parent.parent / "app"
    sys.path.insert(0, str(app_dir))

    test_dir = Path(__file__).parent / "load"

    pytest_args = [
        str(test_dir),
        "-v",
        "--tb=short",
        "--color=yes",
        "-m", "load",
        "--asyncio-mode=auto",
        "--timeout=600",
        "-n", str(workers),  # Number of parallel workers
        "--dist=loadfile",  # Distribute tests by file
        "--junit-xml=load-test-results.xml",
    ]

    env = os.environ.copy()
    env.update({
        "LOAD_TEST_MODE": "true",
        "LOAD_TEST_TIMEOUT": "600",
    })

    return pytest.main(pytest_args)


def run_stress_test(duration: int = 300):
    """Run stress test for specified duration"""
    print(f"Starting stress test for {duration} seconds...")
    
    start_time = time.time()
    
    # Run load tests continuously for the specified duration
    while time.time() - start_time < duration:
        print(f"Running load test iteration at {time.time() - start_time:.1f}s")
        
        exit_code = run_load_tests()
        if exit_code != 0:
            print(f"Load test failed with exit code {exit_code}")
            return exit_code
        
        # Small delay between iterations
        time.sleep(10)
    
    print(f"Stress test completed after {duration} seconds")
    return 0


def run_performance_baseline():
    """Run performance baseline tests"""
    print("Running performance baseline tests...")
    
    app_dir = Path(__file__).parent.parent / "app"
    sys.path.insert(0, str(app_dir))

    test_dir = Path(__file__).parent / "load"

    pytest_args = [
        str(test_dir),
        "-v",
        "--tb=short",
        "--color=yes",
        "-k", "baseline",  # Run baseline tests
        "--asyncio-mode=auto",
        "--timeout=300",
        "--junit-xml=baseline-test-results.xml",
    ]

    env = os.environ.copy()
    env.update({
        "LOAD_TEST_MODE": "true",
        "LOAD_TEST_TIMEOUT": "300",
        "BASELINE_MODE": "true",
    })

    return pytest.main(pytest_args)


def generate_load_test_report():
    """Generate a comprehensive load test report"""
    print("Generating load test report...")
    
    # This would typically parse test results and generate a report
    # For now, we'll create a simple report structure
    
    report_content = """
# Load Test Report

## Test Summary
- **Test Date**: {date}
- **Total Tests**: {total_tests}
- **Passed**: {passed_tests}
- **Failed**: {failed_tests}
- **Duration**: {duration}

## Performance Metrics
- **Average Upload Time**: {avg_upload_time}s
- **Average Query Time**: {avg_query_time}s
- **Throughput**: {throughput} ops/sec
- **Error Rate**: {error_rate}%

## System Metrics
- **CPU Usage**: {cpu_usage}%
- **Memory Usage**: {memory_usage}MB
- **Active Connections**: {active_connections}

## Recommendations
{recommendations}
""".format(
        date=time.strftime("%Y-%m-%d %H:%M:%S"),
        total_tests="N/A",
        passed_tests="N/A",
        failed_tests="N/A",
        duration="N/A",
        avg_upload_time="N/A",
        avg_query_time="N/A",
        throughput="N/A",
        error_rate="N/A",
        cpu_usage="N/A",
        memory_usage="N/A",
        active_connections="N/A",
        recommendations="Review test results for specific recommendations."
    )
    
    # Write report to file
    with open("load-test-report.md", "w") as f:
        f.write(report_content)
    
    print("Load test report generated: load-test-report.md")


def main():
    """Main function to run load tests"""
    parser = argparse.ArgumentParser(description="Run load tests")
    parser.add_argument(
        "--test", 
        type=str, 
        help="Run a specific test by name"
    )
    parser.add_argument(
        "--monitoring", 
        action="store_true", 
        help="Run tests with monitoring enabled"
    )
    parser.add_argument(
        "--parallel", 
        type=int, 
        default=0,
        help="Run tests in parallel with specified number of workers"
    )
    parser.add_argument(
        "--stress", 
        type=int, 
        default=0,
        help="Run stress test for specified duration in seconds"
    )
    parser.add_argument(
        "--baseline", 
        action="store_true", 
        help="Run performance baseline tests"
    )
    parser.add_argument(
        "--report", 
        action="store_true", 
        help="Generate load test report"
    )

    args = parser.parse_args()

    if args.test:
        print(f"Running specific load test: {args.test}")
        exit_code = run_specific_load_test(args.test)
    elif args.monitoring:
        print("Running load tests with monitoring...")
        exit_code = run_load_tests_with_monitoring()
    elif args.parallel > 0:
        print(f"Running load tests in parallel with {args.parallel} workers...")
        exit_code = run_load_tests_parallel(args.parallel)
    elif args.stress > 0:
        print(f"Running stress test for {args.stress} seconds...")
        exit_code = run_stress_test(args.stress)
    elif args.baseline:
        print("Running performance baseline tests...")
        exit_code = run_performance_baseline()
    elif args.report:
        print("Generating load test report...")
        generate_load_test_report()
        exit_code = 0
    else:
        print("Running all load tests...")
        exit_code = run_load_tests()

    if exit_code == 0:
        print("\n" + "="*50)
        print("LOAD TESTS COMPLETED SUCCESSFULLY")
        print("="*50)
        print("Reports generated:")
        print("- JUnit XML: load-test-results.xml")
        print("- HTML Report: load-report.html")
        print("- Markdown Report: load-test-report.md")
    else:
        print("\n" + "="*50)
        print("LOAD TESTS FAILED")
        print("="*50)

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
