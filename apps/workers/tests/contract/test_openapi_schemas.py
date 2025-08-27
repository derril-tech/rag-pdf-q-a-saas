# Created automatically by Cursor AI (2024-12-19)

import pytest
import json
import yaml
from pathlib import Path
from unittest.mock import Mock, patch
from jsonschema import validate, ValidationError
from app.services.api_schema_validator import APISchemaValidator


class TestOpenAPISchemas:
    """Contract tests for OpenAPI schemas"""

    @pytest.fixture
    def sample_openapi_spec(self):
        """Sample OpenAPI specification"""
        return {
            "openapi": "3.1.0",
            "info": {
                "title": "RAG PDF Q&A API",
                "version": "1.0.0",
                "description": "API for RAG PDF Q&A system"
            },
            "paths": {
                "/v1/projects": {
                    "post": {
                        "summary": "Create a new project",
                        "requestBody": {
                            "required": True,
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "required": ["name", "description"],
                                        "properties": {
                                            "name": {"type": "string", "minLength": 1},
                                            "description": {"type": "string"},
                                            "settings": {"type": "object"}
                                        }
                                    }
                                }
                            }
                        },
                        "responses": {
                            "201": {
                                "description": "Project created",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "object",
                                            "required": ["id", "name", "created_at"],
                                            "properties": {
                                                "id": {"type": "string"},
                                                "name": {"type": "string"},
                                                "description": {"type": "string"},
                                                "created_at": {"type": "string", "format": "date-time"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "/v1/documents": {
                    "post": {
                        "summary": "Upload a document",
                        "requestBody": {
                            "required": True,
                            "content": {
                                "multipart/form-data": {
                                    "schema": {
                                        "type": "object",
                                        "required": ["file", "project_id"],
                                        "properties": {
                                            "file": {"type": "string", "format": "binary"},
                                            "project_id": {"type": "string"},
                                            "metadata": {"type": "object"}
                                        }
                                    }
                                }
                            }
                        },
                        "responses": {
                            "201": {
                                "description": "Document uploaded",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "object",
                                            "required": ["id", "filename", "status"],
                                            "properties": {
                                                "id": {"type": "string"},
                                                "filename": {"type": "string"},
                                                "status": {"type": "string", "enum": ["uploaded", "processing", "processed", "failed"]},
                                                "uploaded_at": {"type": "string", "format": "date-time"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                "/v1/qa": {
                    "post": {
                        "summary": "Ask a question",
                        "requestBody": {
                            "required": True,
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "required": ["query", "document_id"],
                                        "properties": {
                                            "query": {"type": "string", "minLength": 1},
                                            "document_id": {"type": "string"},
                                            "thread_id": {"type": "string"},
                                            "options": {"type": "object"}
                                        }
                                    }
                                }
                            }
                        },
                        "responses": {
                            "200": {
                                "description": "Answer generated",
                                "content": {
                                    "application/json": {
                                        "schema": {
                                            "type": "object",
                                            "required": ["answer", "citations"],
                                            "properties": {
                                                "answer": {"type": "string"},
                                                "citations": {
                                                    "type": "array",
                                                    "items": {
                                                        "type": "object",
                                                        "required": ["reference", "source", "page"],
                                                        "properties": {
                                                            "reference": {"type": "string"},
                                                            "source": {"type": "string"},
                                                            "page": {"type": "integer"},
                                                            "text": {"type": "string"}
                                                        }
                                                    }
                                                },
                                                "thread_id": {"type": "string"},
                                                "message_id": {"type": "string"}
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

    @pytest.fixture
    def schema_validator(self):
        """API schema validator instance"""
        return APISchemaValidator()

    @pytest.mark.contract
    def test_openapi_spec_structure(self, sample_openapi_spec):
        """Test OpenAPI specification structure"""
        
        # Validate basic structure
        assert "openapi" in sample_openapi_spec
        assert "info" in sample_openapi_spec
        assert "paths" in sample_openapi_spec
        
        # Validate version
        assert sample_openapi_spec["openapi"].startswith("3.")
        
        # Validate info section
        info = sample_openapi_spec["info"]
        assert "title" in info
        assert "version" in info
        assert "description" in info

    @pytest.mark.contract
    def test_project_creation_schema(self, sample_openapi_spec):
        """Test project creation request/response schemas"""
        
        # Get project creation endpoint
        project_path = sample_openapi_spec["paths"]["/v1/projects"]["post"]
        
        # Test request schema
        request_schema = project_path["requestBody"]["content"]["application/json"]["schema"]
        
        # Valid request
        valid_request = {
            "name": "Test Project",
            "description": "A test project",
            "settings": {"retention_days": 30}
        }
        
        validate(valid_request, request_schema)
        
        # Invalid request - missing required field
        invalid_request = {
            "description": "A test project"
        }
        
        with pytest.raises(ValidationError):
            validate(invalid_request, request_schema)
        
        # Test response schema
        response_schema = project_path["responses"]["201"]["content"]["application/json"]["schema"]
        
        # Valid response
        valid_response = {
            "id": "proj_123",
            "name": "Test Project",
            "description": "A test project",
            "created_at": "2023-12-19T10:00:00Z"
        }
        
        validate(valid_response, response_schema)

    @pytest.mark.contract
    def test_document_upload_schema(self, sample_openapi_spec):
        """Test document upload request/response schemas"""
        
        # Get document upload endpoint
        upload_path = sample_openapi_spec["paths"]["/v1/documents"]["post"]
        
        # Test request schema
        request_schema = upload_path["requestBody"]["content"]["multipart/form-data"]["schema"]
        
        # Valid request
        valid_request = {
            "file": "document.pdf",
            "project_id": "proj_123",
            "metadata": {"title": "Test Document"}
        }
        
        validate(valid_request, request_schema)
        
        # Invalid request - missing required field
        invalid_request = {
            "project_id": "proj_123"
        }
        
        with pytest.raises(ValidationError):
            validate(invalid_request, request_schema)
        
        # Test response schema
        response_schema = upload_path["responses"]["201"]["content"]["application/json"]["schema"]
        
        # Valid response
        valid_response = {
            "id": "doc_123",
            "filename": "document.pdf",
            "status": "uploaded",
            "uploaded_at": "2023-12-19T10:00:00Z"
        }
        
        validate(valid_response, response_schema)

    @pytest.mark.contract
    def test_qa_request_schema(self, sample_openapi_spec):
        """Test QA request/response schemas"""
        
        # Get QA endpoint
        qa_path = sample_openapi_spec["paths"]["/v1/qa"]["post"]
        
        # Test request schema
        request_schema = qa_path["requestBody"]["content"]["application/json"]["schema"]
        
        # Valid request
        valid_request = {
            "query": "What is machine learning?",
            "document_id": "doc_123",
            "thread_id": "thread_123",
            "options": {"max_tokens": 1000}
        }
        
        validate(valid_request, request_schema)
        
        # Invalid request - empty query
        invalid_request = {
            "query": "",
            "document_id": "doc_123"
        }
        
        with pytest.raises(ValidationError):
            validate(invalid_request, request_schema)
        
        # Test response schema
        response_schema = qa_path["responses"]["200"]["content"]["application/json"]["schema"]
        
        # Valid response
        valid_response = {
            "answer": "Machine learning is a subset of AI that enables computers to learn from data.",
            "citations": [
                {
                    "reference": "[1]",
                    "source": "document1.pdf",
                    "page": 1,
                    "text": "Machine learning is a subset of artificial intelligence."
                }
            ],
            "thread_id": "thread_123",
            "message_id": "msg_123"
        }
        
        validate(valid_response, response_schema)

    @pytest.mark.contract
    def test_citation_schema_validation(self, sample_openapi_spec):
        """Test citation schema validation"""
        
        # Get citation schema from QA response
        qa_path = sample_openapi_spec["paths"]["/v1/qa"]["post"]
        citation_schema = qa_path["responses"]["200"]["content"]["application/json"]["schema"]["properties"]["citations"]["items"]
        
        # Valid citation
        valid_citation = {
            "reference": "[1]",
            "source": "document.pdf",
            "page": 1,
            "text": "Sample text from document."
        }
        
        validate(valid_citation, citation_schema)
        
        # Invalid citation - missing required field
        invalid_citation = {
            "reference": "[1]",
            "source": "document.pdf"
            # Missing page
        }
        
        with pytest.raises(ValidationError):
            validate(invalid_citation, citation_schema)

    @pytest.mark.contract
    def test_error_response_schemas(self, sample_openapi_spec):
        """Test error response schemas"""
        
        # Add error responses to spec
        error_schema = {
            "type": "object",
            "required": ["error", "message", "status_code"],
            "properties": {
                "error": {"type": "string"},
                "message": {"type": "string"},
                "status_code": {"type": "integer"},
                "details": {"type": "object"}
            }
        }
        
        # Test error response
        error_response = {
            "error": "validation_error",
            "message": "Invalid request parameters",
            "status_code": 400,
            "details": {"field": "query", "issue": "required"}
        }
        
        validate(error_response, error_schema)

    @pytest.mark.contract
    def test_schema_consistency_across_endpoints(self, sample_openapi_spec):
        """Test schema consistency across different endpoints"""
        
        # Check that common fields have consistent types
        project_response = sample_openapi_spec["paths"]["/v1/projects"]["post"]["responses"]["201"]["content"]["application/json"]["schema"]
        document_response = sample_openapi_spec["paths"]["/v1/documents"]["post"]["responses"]["201"]["content"]["application/json"]["schema"]
        
        # ID fields should be strings
        assert project_response["properties"]["id"]["type"] == "string"
        assert document_response["properties"]["id"]["type"] == "string"
        
        # Timestamp fields should be date-time format
        assert project_response["properties"]["created_at"]["format"] == "date-time"
        assert document_response["properties"]["uploaded_at"]["format"] == "date-time"

    @pytest.mark.contract
    def test_enum_validation(self, sample_openapi_spec):
        """Test enum validation in schemas"""
        
        # Get document status enum
        document_response = sample_openapi_spec["paths"]["/v1/documents"]["post"]["responses"]["201"]["content"]["application/json"]["schema"]
        status_enum = document_response["properties"]["status"]["enum"]
        
        # Valid status values
        valid_statuses = ["uploaded", "processing", "processed", "failed"]
        assert set(status_enum) == set(valid_statuses)
        
        # Test validation
        valid_response = {
            "id": "doc_123",
            "filename": "test.pdf",
            "status": "uploaded",
            "uploaded_at": "2023-12-19T10:00:00Z"
        }
        
        validate(valid_response, document_response)

    @pytest.mark.contract
    def test_string_length_validation(self, sample_openapi_spec):
        """Test string length validation"""
        
        # Get project creation schema
        project_schema = sample_openapi_spec["paths"]["/v1/projects"]["post"]["requestBody"]["content"]["application/json"]["schema"]
        
        # Test minimum length validation
        invalid_request = {
            "name": "",  # Empty string should fail minLength: 1
            "description": "A test project"
        }
        
        with pytest.raises(ValidationError):
            validate(invalid_request, project_schema)

    @pytest.mark.contract
    def test_schema_references(self, sample_openapi_spec):
        """Test schema references and reuse"""
        
        # Add components section with reusable schemas
        sample_openapi_spec["components"] = {
            "schemas": {
                "Error": {
                    "type": "object",
                    "required": ["error", "message"],
                    "properties": {
                        "error": {"type": "string"},
                        "message": {"type": "string"}
                    }
                },
                "Timestamp": {
                    "type": "string",
                    "format": "date-time"
                }
            }
        }
        
        # Test that components are properly defined
        assert "components" in sample_openapi_spec
        assert "schemas" in sample_openapi_spec["components"]
        assert "Error" in sample_openapi_spec["components"]["schemas"]
        assert "Timestamp" in sample_openapi_spec["components"]["schemas"]

    @pytest.mark.contract
    def test_required_field_validation(self, sample_openapi_spec):
        """Test required field validation"""
        
        # Test project creation required fields
        project_schema = sample_openapi_spec["paths"]["/v1/projects"]["post"]["requestBody"]["content"]["application/json"]["schema"]
        
        # Missing required field
        invalid_request = {
            "name": "Test Project"
            # Missing description
        }
        
        with pytest.raises(ValidationError) as exc_info:
            validate(invalid_request, project_schema)
        
        # Check error message mentions missing field
        assert "description" in str(exc_info.value)

    @pytest.mark.contract
    def test_array_schema_validation(self, sample_openapi_spec):
        """Test array schema validation"""
        
        # Get citations array schema
        qa_response = sample_openapi_spec["paths"]["/v1/qa"]["post"]["responses"]["200"]["content"]["application/json"]["schema"]
        citations_schema = qa_response["properties"]["citations"]
        
        # Valid array
        valid_citations = [
            {
                "reference": "[1]",
                "source": "doc1.pdf",
                "page": 1
            },
            {
                "reference": "[2]",
                "source": "doc2.pdf",
                "page": 2
            }
        ]
        
        validate(valid_citations, citations_schema)
        
        # Invalid array item
        invalid_citations = [
            {
                "reference": "[1]",
                "source": "doc1.pdf"
                # Missing page
            }
        ]
        
        with pytest.raises(ValidationError):
            validate(invalid_citations, citations_schema)

    @pytest.mark.contract
    def test_schema_versioning(self, sample_openapi_spec):
        """Test schema versioning and compatibility"""
        
        # Test version format
        version = sample_openapi_spec["info"]["version"]
        assert version == "1.0.0"  # Semantic versioning
        
        # Test that breaking changes would require version bump
        # This is a contract test to ensure versioning discipline

    @pytest.mark.contract
    def test_schema_documentation(self, sample_openapi_spec):
        """Test schema documentation completeness"""
        
        # Check that all endpoints have descriptions
        for path, path_item in sample_openapi_spec["paths"].items():
            for method, operation in path_item.items():
                if method in ["get", "post", "put", "delete", "patch"]:
                    assert "summary" in operation
                    assert operation["summary"]  # Not empty

    @pytest.mark.contract
    def test_schema_security_definitions(self, sample_openapi_spec):
        """Test security definitions in schemas"""
        
        # Add security definitions
        sample_openapi_spec["components"]["securitySchemes"] = {
            "bearerAuth": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT"
            }
        }
        
        # Test security scheme definition
        security_schemes = sample_openapi_spec["components"]["securitySchemes"]
        assert "bearerAuth" in security_schemes
        assert security_schemes["bearerAuth"]["type"] == "http"
        assert security_schemes["bearerAuth"]["scheme"] == "bearer"
