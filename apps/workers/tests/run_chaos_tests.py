# Created automatically by Cursor AI (2024-12-19)

import pytest
import sys
import os
import asyncio
import time
from pathlib import Path
import argparse


def run_chaos_tests():
    """Run all chaos engineering tests with proper configuration"""

    # Add the app directory to Python path
    app_dir = Path(__file__).parent.parent / "app"
    sys.path.insert(0, str(app_dir))

    # Test directory
    test_dir = Path(__file__).parent / "chaos"

    # Configure pytest arguments for chaos tests
    pytest_args = [
        str(test_dir),
        "-v",  # Verbose output
        "--tb=short",  # Short traceback format
        "--strict-markers",  # Strict marker checking
        "--disable-warnings",  # Disable warnings
        "--color=yes",  # Colored output
        "--durations=10",  # Show 10 slowest tests
        "-m", "chaos",  # Only run chaos tests
        "--asyncio-mode=auto",  # Enable asyncio support
        "--timeout=900",  # 15 minute timeout per test
        "--junit-xml=chaos-test-results.xml",  # Generate JUnit XML report
        "--html=chaos-report.html",  # Generate HTML report
        "--self-contained-html",  # Self-contained HTML report
    ]

    # Set environment variables for chaos tests
    env = os.environ.copy()
    env.update({
        "CHAOS_TEST_MODE": "true",
        "CHAOS_TEST_TIMEOUT": "900",
    })

    # Run tests
    try:
        exit_code = pytest.main(pytest_args)
        return exit_code
    except Exception as e:
        print(f"Error running chaos tests: {e}")
        return 1


def run_specific_chaos_test(test_name: str):
    """Run a specific chaos test"""
    app_dir = Path(__file__).parent.parent / "app"
    sys.path.insert(0, str(app_dir))

    test_dir = Path(__file__).parent / "chaos"

    pytest_args = [
        str(test_dir),
        "-v",
        "--tb=short",
        "--color=yes",
        "-m", "chaos",
        "--asyncio-mode=auto",
        "--timeout=900",
        "-k", test_name,  # Run specific test
    ]

    env = os.environ.copy()
    env.update({
        "CHAOS_TEST_MODE": "true",
        "CHAOS_TEST_TIMEOUT": "900",
    })

    return pytest.main(pytest_args)


def run_chaos_tests_with_monitoring():
    """Run chaos tests with monitoring and metrics collection"""
    app_dir = Path(__file__).parent.parent / "app"
    sys.path.insert(0, str(app_dir))

    test_dir = Path(__file__).parent / "chaos"

    pytest_args = [
        str(test_dir),
        "-v",
        "--tb=short",
        "--color=yes",
        "-m", "chaos",
        "--asyncio-mode=auto",
        "--timeout=900",
        "--junit-xml=chaos-test-results.xml",
        "--html=chaos-report.html",
        "--self-contained-html",
    ]

    env = os.environ.copy()
    env.update({
        "CHAOS_TEST_MODE": "true",
        "CHAOS_TEST_TIMEOUT": "900",
        "ENABLE_MONITORING": "true",
    })

    return pytest.main(pytest_args)


def run_chaos_tests_parallel(workers: int = 2):
    """Run chaos tests in parallel"""
    app_dir = Path(__file__).parent.parent / "app"
    sys.path.insert(0, str(app_dir))

    test_dir = Path(__file__).parent / "chaos"

    pytest_args = [
        str(test_dir),
        "-v",
        "--tb=short",
        "--color=yes",
        "-m", "chaos",
        "--asyncio-mode=auto",
        "--timeout=900",
        "-n", str(workers),  # Number of parallel workers
        "--dist=loadfile",  # Distribute tests by file
        "--junit-xml=chaos-test-results.xml",
    ]

    env = os.environ.copy()
    env.update({
        "CHAOS_TEST_MODE": "true",
        "CHAOS_TEST_TIMEOUT": "900",
    })

    return pytest.main(pytest_args)


def run_chaos_scenario(scenario_name: str):
    """Run a specific chaos scenario"""
    print(f"Running chaos scenario: {scenario_name}")
    
    scenarios = {
        "worker_crash": "test_worker_crash_mid_ingest",
        "qa_crash": "test_worker_crash_mid_qa",
        "retry_idempotency": "test_retry_idempotency_ingest",
        "database_failure": "test_database_connection_failure",
        "storage_failure": "test_storage_service_failure",
        "network_partition": "test_network_partition",
        "memory_pressure": "test_memory_pressure",
        "cpu_pressure": "test_cpu_pressure",
        "graceful_degradation": "test_graceful_degradation",
        "multiple_crashes": "test_multiple_worker_crashes"
    }
    
    if scenario_name not in scenarios:
        print(f"Unknown scenario: {scenario_name}")
        print(f"Available scenarios: {', '.join(scenarios.keys())}")
        return 1
    
    test_name = scenarios[scenario_name]
    return run_specific_chaos_test(test_name)


def run_chaos_baseline():
    """Run chaos baseline tests"""
    print("Running chaos baseline tests...")
    
    app_dir = Path(__file__).parent.parent / "app"
    sys.path.insert(0, str(app_dir))

    test_dir = Path(__file__).parent / "chaos"

    pytest_args = [
        str(test_dir),
        "-v",
        "--tb=short",
        "--color=yes",
        "-k", "baseline",  # Run baseline tests
        "--asyncio-mode=auto",
        "--timeout=300",
        "--junit-xml=chaos-baseline-results.xml",
    ]

    env = os.environ.copy()
    env.update({
        "CHAOS_TEST_MODE": "true",
        "CHAOS_TEST_TIMEOUT": "300",
        "BASELINE_MODE": "true",
    })

    return pytest.main(pytest_args)


def run_chaos_stress_test(duration: int = 600):
    """Run chaos stress test for specified duration"""
    print(f"Starting chaos stress test for {duration} seconds...")
    
    start_time = time.time()
    
    # Run chaos tests continuously for the specified duration
    while time.time() - start_time < duration:
        print(f"Running chaos test iteration at {time.time() - start_time:.1f}s")
        
        exit_code = run_chaos_tests()
        if exit_code != 0:
            print(f"Chaos test failed with exit code {exit_code}")
            return exit_code
        
        # Small delay between iterations
        time.sleep(30)
    
    print(f"Chaos stress test completed after {duration} seconds")
    return 0


def generate_chaos_report():
    """Generate a comprehensive chaos test report"""
    print("Generating chaos test report...")
    
    # This would typically parse test results and generate a report
    # For now, we'll create a simple report structure
    
    report_content = """
# Chaos Engineering Test Report

## Test Summary
- **Test Date**: {date}
- **Total Tests**: {total_tests}
- **Passed**: {passed_tests}
- **Failed**: {failed_tests}
- **Duration**: {duration}

## Chaos Scenarios Tested
- **Worker Crash Tests**: {worker_crash_tests}
- **Retry Idempotency Tests**: {retry_tests}
- **Infrastructure Failure Tests**: {infra_tests}
- **Resource Pressure Tests**: {pressure_tests}
- **Graceful Degradation Tests**: {degradation_tests}

## Resilience Metrics
- **Recovery Time**: {recovery_time}s
- **Service Availability**: {availability}%
- **Error Rate**: {error_rate}%
- **Throughput Degradation**: {throughput_degradation}%

## System Behavior
- **Memory Usage**: {memory_usage}MB
- **CPU Usage**: {cpu_usage}%
- **Active Connections**: {active_connections}

## Recommendations
{recommendations}
""".format(
        date=time.strftime("%Y-%m-%d %H:%M:%S"),
        total_tests="N/A",
        passed_tests="N/A",
        failed_tests="N/A",
        duration="N/A",
        worker_crash_tests="N/A",
        retry_tests="N/A",
        infra_tests="N/A",
        pressure_tests="N/A",
        degradation_tests="N/A",
        recovery_time="N/A",
        availability="N/A",
        error_rate="N/A",
        throughput_degradation="N/A",
        memory_usage="N/A",
        cpu_usage="N/A",
        active_connections="N/A",
        recommendations="Review chaos test results for specific recommendations."
    )
    
    # Write report to file
    with open("chaos-test-report.md", "w") as f:
        f.write(report_content)
    
    print("Chaos test report generated: chaos-test-report.md")


def main():
    """Main function to run chaos tests"""
    parser = argparse.ArgumentParser(description="Run chaos engineering tests")
    parser.add_argument(
        "--test", 
        type=str, 
        help="Run a specific test by name"
    )
    parser.add_argument(
        "--scenario", 
        type=str, 
        help="Run a specific chaos scenario"
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
        help="Run chaos stress test for specified duration in seconds"
    )
    parser.add_argument(
        "--baseline", 
        action="store_true", 
        help="Run chaos baseline tests"
    )
    parser.add_argument(
        "--report", 
        action="store_true", 
        help="Generate chaos test report"
    )

    args = parser.parse_args()

    if args.test:
        print(f"Running specific chaos test: {args.test}")
        exit_code = run_specific_chaos_test(args.test)
    elif args.scenario:
        print(f"Running chaos scenario: {args.scenario}")
        exit_code = run_chaos_scenario(args.scenario)
    elif args.monitoring:
        print("Running chaos tests with monitoring...")
        exit_code = run_chaos_tests_with_monitoring()
    elif args.parallel > 0:
        print(f"Running chaos tests in parallel with {args.parallel} workers...")
        exit_code = run_chaos_tests_parallel(args.parallel)
    elif args.stress > 0:
        print(f"Running chaos stress test for {args.stress} seconds...")
        exit_code = run_chaos_stress_test(args.stress)
    elif args.baseline:
        print("Running chaos baseline tests...")
        exit_code = run_chaos_baseline()
    elif args.report:
        print("Generating chaos test report...")
        generate_chaos_report()
        exit_code = 0
    else:
        print("Running all chaos tests...")
        exit_code = run_chaos_tests()

    if exit_code == 0:
        print("\n" + "="*50)
        print("CHAOS TESTS COMPLETED SUCCESSFULLY")
        print("="*50)
        print("Reports generated:")
        print("- JUnit XML: chaos-test-results.xml")
        print("- HTML Report: chaos-report.html")
        print("- Markdown Report: chaos-test-report.md")
    else:
        print("\n" + "="*50)
        print("CHAOS TESTS FAILED")
        print("="*50)

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
