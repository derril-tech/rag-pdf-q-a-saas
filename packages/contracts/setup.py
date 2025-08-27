# Created automatically by Cursor AI (2025-01-27)

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

with open("requirements.txt", "r", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

setup(
    name="rag-pdf-qa-contracts",
    version="0.1.0",
    author="RAG PDF Q&A Team",
    description="Shared contracts and schemas for RAG PDF Q&A SaaS",
    long_description=long_description,
    long_description_content_type="text/markdown",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.11",
    install_requires=requirements,
    extras_require={
        "dev": [
            "black>=23.0.0",
            "isort>=5.12.0",
            "mypy>=1.7.0",
            "ruff>=0.1.0",
            "pytest>=7.4.0",
        ]
    },
    keywords="rag pdf qa contracts schemas python",
    project_urls={
        "Bug Reports": "https://github.com/your-org/rag-pdf-qa/issues",
        "Source": "https://github.com/your-org/rag-pdf-qa",
    },
)
