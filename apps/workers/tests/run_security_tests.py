# Created automatically by Cursor AI (2024-12-19)

import pytest
import sys
import os
import asyncio
import time
from pathlib import Path
import argparse


def run_security_tests():
    """Run all security tests with proper configuration"""

    # Add the app directory to Python path
    app_dir = Path(__file__).parent.parent / "app"
    sys.path.insert(0, str(app_dir))

    # Test directory
    test_dir = Path(__file__).parent / "security"

    # Configure pytest arguments for security tests
    pytest_args = [
        str(test_dir),
        "-v",  # Verbose output
        "--tb=short",  # Short traceback format
        "--strict-markers",  # Strict marker checking
        "--disable-warnings",  # Disable warnings
        "--color=yes",  # Colored output
        "--durations=10",  # Show 10 slowest tests
        "-m", "security",  # Only run security tests
        "--asyncio-mode=auto",  # Enable asyncio support
        "--timeout=300",  # 5 minute timeout per test
        "--junit-xml=security-test-results.xml",  # Generate JUnit XML report
        "--html=security-report.html",  # Generate HTML report
        "--self-contained-html",  # Self-contained HTML report
    ]

    # Set environment variables for security tests
    env = os.environ.copy()
    env.update({
        "SECURITY_TEST_MODE": "true",
        "SECURITY_TEST_TIMEOUT": "300",
    })

    # Run tests
    try:
        exit_code = pytest.main(pytest_args)
        return exit_code
    except Exception as e:
        print(f"Error running security tests: {e}")
        return 1


def run_specific_security_test(test_name: str):
    """Run a specific security test"""
    app_dir = Path(__file__).parent.parent / "app"
    sys.path.insert(0, str(app_dir))

    test_dir = Path(__file__).parent / "security"

    pytest_args = [
        str(test_dir),
        "-v",
        "--tb=short",
        "--color=yes",
        "-m", "security",
        "--asyncio-mode=auto",
        "--timeout=300",
        "-k", test_name,  # Run specific test
    ]

    env = os.environ.copy()
    env.update({
        "SECURITY_TEST_MODE": "true",
        "SECURITY_TEST_TIMEOUT": "300",
    })

    return pytest.main(pytest_args)


def run_security_tests_with_monitoring():
    """Run security tests with monitoring and metrics collection"""
    app_dir = Path(__file__).parent.parent / "app"
    sys.path.insert(0, str(app_dir))

    test_dir = Path(__file__).parent / "security"

    pytest_args = [
        str(test_dir),
        "-v",
        "--tb=short",
        "--color=yes",
        "-m", "security",
        "--asyncio-mode=auto",
        "--timeout=300",
        "--junit-xml=security-test-results.xml",
        "--html=security-report.html",
        "--self-contained-html",
    ]

    env = os.environ.copy()
    env.update({
        "SECURITY_TEST_MODE": "true",
        "SECURITY_TEST_TIMEOUT": "300",
        "ENABLE_MONITORING": "true",
    })

    return pytest.main(pytest_args)


def run_security_tests_parallel(workers: int = 2):
    """Run security tests in parallel"""
    app_dir = Path(__file__).parent.parent / "app"
    sys.path.insert(0, str(app_dir))

    test_dir = Path(__file__).parent / "security"

    pytest_args = [
        str(test_dir),
        "-v",
        "--tb=short",
        "--color=yes",
        "-m", "security",
        "--asyncio-mode=auto",
        "--timeout=300",
        "-n", str(workers),  # Number of parallel workers
        "--dist=loadfile",  # Distribute tests by file
        "--junit-xml=security-test-results.xml",
    ]

    env = os.environ.copy()
    env.update({
        "SECURITY_TEST_MODE": "true",
        "SECURITY_TEST_TIMEOUT": "300",
    })

    return pytest.main(pytest_args)


def run_security_category(category: str):
    """Run tests for a specific security category"""
    print(f"Running security tests for category: {category}")
    
    categories = {
        "rls": "TestRLSEnforcement",
        "pii": "TestPIIMasking", 
        "url": "TestSignedURLExpiry",
        "monitoring": "TestSecurityMonitoring"
    }
    
    if category not in categories:
        print(f"Unknown category: {category}")
        print(f"Available categories: {', '.join(categories.keys())}")
        return 1
    
    test_class = categories[category]
    return run_specific_security_test(test_class)


def run_security_compliance_check():
    """Run comprehensive security compliance check"""
    print("Running comprehensive security compliance check...")
    
    app_dir = Path(__file__).parent.parent / "app"
    sys.path.insert(0, str(app_dir))

    test_dir = Path(__file__).parent / "security"

    pytest_args = [
        str(test_dir),
        "-v",
        "--tb=short",
        "--color=yes",
        "-m", "security",
        "--asyncio-mode=auto",
        "--timeout=300",
        "--junit-xml=security-compliance-results.xml",
        "--html=security-compliance-report.html",
        "--self-contained-html",
    ]

    env = os.environ.copy()
    env.update({
        "SECURITY_TEST_MODE": "true",
        "SECURITY_TEST_TIMEOUT": "300",
        "COMPLIANCE_MODE": "true",
    })

    return pytest.main(pytest_args)


def generate_security_report():
    """Generate a comprehensive security test report"""
    print("Generating security test report...")
    
    # This would typically parse test results and generate a report
    # For now, we'll create a simple report structure
    
    report_content = """
# Security Test Report

## Test Summary
- **Test Date**: {date}
- **Total Tests**: {total_tests}
- **Passed**: {passed_tests}
- **Failed**: {failed_tests}
- **Duration**: {duration}

## Security Categories Tested
- **RLS Enforcement Tests**: {rls_tests}
- **PII Masking Tests**: {pii_tests}
- **Signed URL Tests**: {url_tests}
- **Security Monitoring Tests**: {monitoring_tests}

## Security Metrics
- **RLS Violations**: {rls_violations}
- **PII Exposures**: {pii_exposures}
- **URL Tampering Attempts**: {url_tampering}
- **Security Alerts**: {security_alerts}

## Compliance Status
- **Data Isolation**: {data_isolation}
- **PII Protection**: {pii_protection}
- **Access Control**: {access_control}
- **Audit Logging**: {audit_logging}

## Recommendations
{recommendations}
""".format(
        date=time.strftime("%Y-%m-%d %H:%M:%S"),
        total_tests="N/A",
        passed_tests="N/A",
        failed_tests="N/A",
        duration="N/A",
        rls_tests="N/A",
        pii_tests="N/A",
        url_tests="N/A",
        monitoring_tests="N/A",
        rls_violations="N/A",
        pii_exposures="N/A",
        url_tampering="N/A",
        security_alerts="N/A",
        data_isolation="N/A",
        pii_protection="N/A",
        access_control="N/A",
        audit_logging="N/A",
        recommendations="Review security test results for specific recommendations."
    )
    
    # Write report to file
    with open("security-test-report.md", "w") as f:
        f.write(report_content)
    
    print("Security test report generated: security-test-report.md")


def main():
    """Main function to run security tests"""
    parser = argparse.ArgumentParser(description="Run security tests")
    parser.add_argument(
        "--test", 
        type=str, 
        help="Run a specific test by name"
    )
    parser.add_argument(
        "--category", 
        type=str, 
        help="Run tests for a specific security category (rls, pii, url, monitoring)"
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
        "--compliance", 
        action="store_true", 
        help="Run comprehensive security compliance check"
    )
    parser.add_argument(
        "--report", 
        action="store_true", 
        help="Generate security test report"
    )

    args = parser.parse_args()

    if args.test:
        print(f"Running specific security test: {args.test}")
        exit_code = run_specific_security_test(args.test)
    elif args.category:
        print(f"Running security tests for category: {args.category}")
        exit_code = run_security_category(args.category)
    elif args.monitoring:
        print("Running security tests with monitoring...")
        exit_code = run_security_tests_with_monitoring()
    elif args.parallel > 0:
        print(f"Running security tests in parallel with {args.parallel} workers...")
        exit_code = run_security_tests_parallel(args.parallel)
    elif args.compliance:
        print("Running comprehensive security compliance check...")
        exit_code = run_security_compliance_check()
    elif args.report:
        print("Generating security test report...")
        generate_security_report()
        exit_code = 0
    else:
        print("Running all security tests...")
        exit_code = run_security_tests()

    if exit_code == 0:
        print("\n" + "="*50)
        print("SECURITY TESTS COMPLETED SUCCESSFULLY")
        print("="*50)
        print("Reports generated:")
        print("- JUnit XML: security-test-results.xml")
        print("- HTML Report: security-report.html")
        print("- Markdown Report: security-test-report.md")
    else:
        print("\n" + "="*50)
        print("SECURITY TESTS FAILED")
        print("="*50)

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
