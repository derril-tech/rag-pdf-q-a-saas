# Created automatically by Cursor AI (2025-01-27)

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    postgresql = {
      source  = "cyrilgdn/postgresql"
      version = "~> 1.0"
    }
  }
  
  backend "s3" {
    bucket = "rag-pdf-qa-terraform-state"
    key    = "main/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "rag-pdf-qa"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# VPC and Networking
module "vpc" {
  source = "./modules/vpc"
  
  environment = var.environment
  vpc_cidr    = var.vpc_cidr
}

# Database
module "database" {
  source = "./modules/database"
  
  environment     = var.environment
  vpc_id          = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnets
  db_password     = var.db_password
}

# Redis
module "redis" {
  source = "./modules/redis"
  
  environment     = var.environment
  vpc_id          = module.vpc.vpc_id
  private_subnets = module.vpc.private_subnets
}

# S3 Storage
module "storage" {
  source = "./modules/storage"
  
  environment = var.environment
  bucket_name = "rag-pdf-qa-documents-${var.environment}"
}

# CDN
module "cdn" {
  source = "./modules/cdn"
  
  environment = var.environment
  bucket_id   = module.storage.bucket_id
  domain_name = var.domain_name
}

# Secrets
module "secrets" {
  source = "./modules/secrets"
  
  environment = var.environment
}

# Outputs
output "database_endpoint" {
  value = module.database.endpoint
}

output "redis_endpoint" {
  value = module.redis.endpoint
}

output "s3_bucket" {
  value = module.storage.bucket_name
}

output "cdn_domain" {
  value = module.cdn.domain_name
}
