# Created automatically by Cursor AI (2025-01-27)

import asyncio
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import logging

from app.core.config import settings
from app.services.database import DatabaseService
from app.services.storage import StorageService


class RetentionService:
    """Service for handling data retention and purging"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.db_service = DatabaseService()
        self.storage_service = StorageService()
        
        # Retention periods in days (can be configured per plan)
        self.retention_periods = {
            'free': 30,
            'starter': 90,
            'professional': 365,
            'enterprise': -1,  # No retention (unlimited)
        }
    
    async def run_retention_sweep(self, organization_id: Optional[str] = None) -> Dict[str, Any]:
        """Run a retention sweep to purge expired data"""
        start_time = time.time()
        results = {
            'documents_purged': 0,
            'chunks_purged': 0,
            'files_purged': 0,
            'errors': [],
            'duration': 0,
        }
        
        try:
            self.logger.info("Starting retention sweep")
            
            # Get organizations to process
            if organization_id:
                organizations = [{'id': organization_id}]
            else:
                organizations = await self._get_all_organizations()
            
            for org in organizations:
                try:
                    org_results = await self._process_organization_retention(org['id'])
                    results['documents_purged'] += org_results['documents_purged']
                    results['chunks_purged'] += org_results['chunks_purged']
                    results['files_purged'] += org_results['files_purged']
                except Exception as e:
                    error_msg = f"Error processing organization {org['id']}: {str(e)}"
                    self.logger.error(error_msg)
                    results['errors'].append(error_msg)
            
            results['duration'] = time.time() - start_time
            self.logger.info(f"Retention sweep completed: {results}")
            
        except Exception as e:
            error_msg = f"Error in retention sweep: {str(e)}"
            self.logger.error(error_msg)
            results['errors'].append(error_msg)
        
        return results
    
    async def _process_organization_retention(self, organization_id: str) -> Dict[str, int]:
        """Process retention for a specific organization"""
        results = {
            'documents_purged': 0,
            'chunks_purged': 0,
            'files_purged': 0,
        }
        
        # Get organization plan
        plan_id = await self._get_organization_plan(organization_id)
        retention_days = self.retention_periods.get(plan_id, 30)
        
        if retention_days == -1:
            self.logger.info(f"Organization {organization_id} has unlimited retention (plan: {plan_id})")
            return results
        
        # Calculate cutoff date
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        # Get expired documents
        expired_documents = await self._get_expired_documents(organization_id, cutoff_date)
        
        for document in expired_documents:
            try:
                await self._purge_document(document['id'], organization_id)
                results['documents_purged'] += 1
                results['chunks_purged'] += document.get('chunk_count', 0)
                results['files_purged'] += 1
            except Exception as e:
                self.logger.error(f"Error purging document {document['id']}: {str(e)}")
        
        return results
    
    async def _get_all_organizations(self) -> List[Dict[str, Any]]:
        """Get all organizations from database"""
        query = """
            SELECT id, name, plan_id, created_at
            FROM organizations
            WHERE deleted_at IS NULL
        """
        
        async with self.db_service.get_connection() as conn:
            result = await conn.fetch(query)
            return [dict(row) for row in result]
    
    async def _get_organization_plan(self, organization_id: str) -> str:
        """Get the plan ID for an organization"""
        query = """
            SELECT plan_id
            FROM organizations
            WHERE id = $1 AND deleted_at IS NULL
        """
        
        async with self.db_service.get_connection() as conn:
            result = await conn.fetchval(query, organization_id)
            return result or 'free'
    
    async def _get_expired_documents(self, organization_id: str, cutoff_date: datetime) -> List[Dict[str, Any]]:
        """Get documents that have expired based on retention policy"""
        query = """
            SELECT 
                d.id,
                d.name,
                d.file_path,
                d.created_at,
                COUNT(c.id) as chunk_count
            FROM documents d
            LEFT JOIN chunks c ON d.id = c.document_id
            WHERE d.organization_id = $1 
                AND d.created_at < $2
                AND d.deleted_at IS NULL
            GROUP BY d.id, d.name, d.file_path, d.created_at
            ORDER BY d.created_at ASC
        """
        
        async with self.db_service.get_connection() as conn:
            result = await conn.fetch(query, organization_id, cutoff_date)
            return [dict(row) for row in result]
    
    async def _purge_document(self, document_id: str, organization_id: str) -> None:
        """Purge a document and all its associated data"""
        self.logger.info(f"Purging document {document_id}")
        
        async with self.db_service.get_connection() as conn:
            async with conn.transaction():
                # Get document info before deletion
                doc_query = """
                    SELECT file_path, name
                    FROM documents
                    WHERE id = $1 AND organization_id = $2
                """
                document = await conn.fetchrow(doc_query, document_id, organization_id)
                
                if not document:
                    self.logger.warning(f"Document {document_id} not found or already deleted")
                    return
                
                # Delete chunks first (foreign key constraint)
                await conn.execute(
                    "DELETE FROM chunks WHERE document_id = $1",
                    document_id
                )
                
                # Delete document citations
                await conn.execute(
                    "DELETE FROM citations WHERE document_id = $1",
                    document_id
                )
                
                # Delete document
                await conn.execute(
                    "DELETE FROM documents WHERE id = $1 AND organization_id = $2",
                    document_id, organization_id
                )
                
                # Delete file from storage
                try:
                    await self.storage_service.delete_file(document['file_path'])
                except Exception as e:
                    self.logger.error(f"Error deleting file {document['file_path']}: {str(e)}")
    
    async def get_retention_stats(self, organization_id: Optional[str] = None) -> Dict[str, Any]:
        """Get retention statistics"""
        stats = {
            'total_documents': 0,
            'expired_documents': 0,
            'documents_by_plan': {},
            'storage_usage': 0,
        }
        
        try:
            if organization_id:
                # Get stats for specific organization
                org_stats = await self._get_organization_retention_stats(organization_id)
                stats.update(org_stats)
            else:
                # Get stats for all organizations
                all_stats = await self._get_all_organizations_retention_stats()
                stats.update(all_stats)
                
        except Exception as e:
            self.logger.error(f"Error getting retention stats: {str(e)}")
        
        return stats
    
    async def _get_organization_retention_stats(self, organization_id: str) -> Dict[str, Any]:
        """Get retention stats for a specific organization"""
        plan_id = await self._get_organization_plan(organization_id)
        retention_days = self.retention_periods.get(plan_id, 30)
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days) if retention_days > 0 else None
        
        query = """
            SELECT 
                COUNT(*) as total_documents,
                COUNT(CASE WHEN created_at < $2 THEN 1 END) as expired_documents,
                SUM(file_size) as total_size
            FROM documents
            WHERE organization_id = $1 AND deleted_at IS NULL
        """
        
        async with self.db_service.get_connection() as conn:
            result = await conn.fetchrow(query, organization_id, cutoff_date)
            
            return {
                'total_documents': result['total_documents'] or 0,
                'expired_documents': result['expired_documents'] or 0,
                'storage_usage': result['total_size'] or 0,
                'retention_days': retention_days,
                'plan_id': plan_id,
            }
    
    async def _get_all_organizations_retention_stats(self) -> Dict[str, Any]:
        """Get retention stats for all organizations"""
        query = """
            SELECT 
                o.plan_id,
                COUNT(d.id) as total_documents,
                SUM(d.file_size) as total_size
            FROM organizations o
            LEFT JOIN documents d ON o.id = d.organization_id AND d.deleted_at IS NULL
            WHERE o.deleted_at IS NULL
            GROUP BY o.plan_id
        """
        
        async with self.db_service.get_connection() as conn:
            result = await conn.fetch(query)
            
            documents_by_plan = {}
            total_documents = 0
            total_storage = 0
            
            for row in result:
                plan_id = row['plan_id'] or 'free'
                count = row['total_documents'] or 0
                size = row['total_size'] or 0
                
                documents_by_plan[plan_id] = {
                    'documents': count,
                    'storage': size,
                    'retention_days': self.retention_periods.get(plan_id, 30),
                }
                
                total_documents += count
                total_storage += size
            
            return {
                'total_documents': total_documents,
                'storage_usage': total_storage,
                'documents_by_plan': documents_by_plan,
            }
    
    async def schedule_retention_sweep(self, organization_id: Optional[str] = None) -> str:
        """Schedule a retention sweep job"""
        # This would typically publish a job to NATS or a job queue
        # For now, we'll just run it immediately
        job_id = f"retention_sweep_{int(time.time())}"
        
        # Run the sweep asynchronously
        asyncio.create_task(self._run_scheduled_sweep(job_id, organization_id))
        
        return job_id
    
    async def _run_scheduled_sweep(self, job_id: str, organization_id: Optional[str] = None) -> None:
        """Run a scheduled retention sweep"""
        try:
            self.logger.info(f"Running scheduled retention sweep {job_id}")
            results = await self.run_retention_sweep(organization_id)
            
            # Log results
            self.logger.info(f"Retention sweep {job_id} completed: {results}")
            
            # Could also store results in database or send notifications
            
        except Exception as e:
            self.logger.error(f"Error in scheduled retention sweep {job_id}: {str(e)}")
    
    async def get_document_retention_info(self, document_id: str) -> Dict[str, Any]:
        """Get retention information for a specific document"""
        query = """
            SELECT 
                d.id,
                d.name,
                d.created_at,
                d.file_size,
                o.plan_id,
                o.name as organization_name
            FROM documents d
            JOIN organizations o ON d.organization_id = o.id
            WHERE d.id = $1 AND d.deleted_at IS NULL
        """
        
        async with self.db_service.get_connection() as conn:
            result = await conn.fetchrow(query, document_id)
            
            if not result:
                return {}
            
            plan_id = result['plan_id'] or 'free'
            retention_days = self.retention_periods.get(plan_id, 30)
            created_at = result['created_at']
            
            if retention_days == -1:
                expires_at = None
                days_until_expiry = None
            else:
                expires_at = created_at + timedelta(days=retention_days)
                days_until_expiry = (expires_at - datetime.utcnow()).days
            
            return {
                'document_id': result['id'],
                'document_name': result['name'],
                'organization_name': result['organization_name'],
                'plan_id': plan_id,
                'created_at': created_at.isoformat(),
                'file_size': result['file_size'],
                'retention_days': retention_days,
                'expires_at': expires_at.isoformat() if expires_at else None,
                'days_until_expiry': days_until_expiry,
                'will_expire': retention_days != -1,
            }
    
    async def extend_document_retention(self, document_id: str, additional_days: int) -> bool:
        """Extend retention for a specific document (enterprise feature)"""
        # This would be an enterprise feature to extend retention for specific documents
        # For now, we'll just log the request
        
        self.logger.info(f"Retention extension requested for document {document_id}: +{additional_days} days")
        
        # In a real implementation, you might:
        # 1. Check if the organization has the right plan
        # 2. Update a custom retention date for the document
        # 3. Charge additional fees if applicable
        
        return True
    
    async def cleanup_orphaned_files(self) -> Dict[str, int]:
        """Clean up orphaned files in storage that don't have database records"""
        results = {
            'files_checked': 0,
            'orphaned_files_deleted': 0,
            'errors': [],
        }
        
        try:
            # Get all file paths from database
            query = "SELECT file_path FROM documents WHERE deleted_at IS NULL"
            
            async with self.db_service.get_connection() as conn:
                db_files = await conn.fetch(query)
                db_file_paths = {row['file_path'] for row in db_files}
            
            # List all files in storage
            storage_files = await self.storage_service.list_all_files()
            
            # Find orphaned files
            orphaned_files = storage_files - db_file_paths
            
            # Delete orphaned files
            for file_path in orphaned_files:
                try:
                    await self.storage_service.delete_file(file_path)
                    results['orphaned_files_deleted'] += 1
                except Exception as e:
                    error_msg = f"Error deleting orphaned file {file_path}: {str(e)}"
                    self.logger.error(error_msg)
                    results['errors'].append(error_msg)
            
            results['files_checked'] = len(storage_files)
            
        except Exception as e:
            error_msg = f"Error in orphaned file cleanup: {str(e)}"
            self.logger.error(error_msg)
            results['errors'].append(error_msg)
        
        return results
