import docker
import asyncio
import tempfile
import os
import shutil
import time
from typing import Dict, Any, Optional, Tuple
from docker.errors import ContainerError, ImageNotFound, APIError
from src.models.execution import Language, ResourceLimits, ExecutionStatus
from src.config.settings import settings
import logging

logger = logging.getLogger(__name__)


class DockerExecutionManager:
    """Manages Docker containers for secure code execution."""
    
    def __init__(self):
        try:
            self.client = docker.from_env()
            # Test connection
            self.client.ping()
            logger.info("Docker client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Docker client: {e}")
            raise
    
    async def execute_code(
        self,
        code: str,
        language: Language,
        input_data: str,
        limits: ResourceLimits
    ) -> Tuple[str, str, float, int, ExecutionStatus]:
        """
        Executes code in a secure Docker container.
        Returns: (stdout, stderr, execution_time, memory_used, status)
        """
        temp_dir = None
        container = None
        
        try:
            # Create temporary directory for code files
            temp_dir = tempfile.mkdtemp()
            
            # Prepare code file
            config = settings.language_configs[language.value]
            code_file = await self._prepare_code_file(code, language, temp_dir)
            
            # Create and run container
            container = await self._create_container(
                language, temp_dir, limits, input_data
            )
            
            start_time = time.time()
            
            # Start container and wait for completion
            container.start()
            
            # Wait for container with timeout
            try:
                result = container.wait(timeout=limits.time_limit + 5)
                execution_time = time.time() - start_time
                
                # Get container stats for memory usage
                stats = container.stats(stream=False)
                memory_used = self._extract_memory_usage(stats)
                
                # Get output
                stdout = container.logs(stdout=True, stderr=False).decode('utf-8')
                stderr = container.logs(stdout=False, stderr=True).decode('utf-8')
                
                # Determine execution status
                exit_code = result['StatusCode']
                if exit_code == 0:
                    status = ExecutionStatus.SUCCESS
                elif exit_code == 124:  # timeout exit code
                    status = ExecutionStatus.TIME_LIMIT_EXCEEDED
                elif exit_code == 137:  # killed by OOM killer
                    status = ExecutionStatus.MEMORY_LIMIT_EXCEEDED
                else:
                    status = ExecutionStatus.RUNTIME_ERROR
                
                return stdout, stderr, execution_time, memory_used, status
                
            except docker.errors.APIError as e: # type: ignore
                if "timeout" in str(e).lower():
                    return "", "Time limit exceeded", limits.time_limit, 0, ExecutionStatus.TIME_LIMIT_EXCEEDED
                raise
                
        except ImageNotFound:
            logger.error(f"Docker image not found for language: {language}")
            return "", "Execution environment not available", 0, 0, ExecutionStatus.INTERNAL_ERROR
            
        except Exception as e:
            logger.error(f"Execution error: {e}")
            return "", f"Internal execution error: {str(e)}", 0, 0, ExecutionStatus.INTERNAL_ERROR
            
        finally:
            # Cleanup
            if container:
                try:
                    container.remove(force=True)
                except Exception as e:
                    logger.warning(f"Failed to remove container: {e}")
            
            if temp_dir and os.path.exists(temp_dir):
                try:
                    shutil.rmtree(temp_dir)
                except Exception as e:
                    logger.warning(f"Failed to remove temp directory: {e}")
    
    async def _prepare_code_file(self, code: str, language: Language, temp_dir: str) -> str:
        """Prepares code file in temporary directory."""
        config = settings.language_configs[language.value]
        
        if language == Language.JAVA:
            filename = f"Solution{config['file_extension']}"
        else:
            filename = f"solution{config['file_extension']}"
        
        file_path = os.path.join(temp_dir, filename)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(code)
        
        return file_path
    
    async def _create_container(
        self,
        language: Language,
        temp_dir: str,
        limits: ResourceLimits,
        input_data: str
    ) -> Any:
        """Creates a Docker container with security constraints."""
        config = settings.language_configs[language.value]
        
        # Prepare volumes
        volumes = {
            temp_dir: {'bind': '/app', 'mode': 'ro'}
        }
        
        # Create input file if needed
        if input_data:
            input_file = os.path.join(temp_dir, 'input.txt')
            with open(input_file, 'w', encoding='utf-8') as f:
                f.write(input_data)
        
        # Prepare command
        commands = []
        if config.get('compile_command'):
            commands.append(config['compile_command'])
        
        run_command = config['run_command']
        if input_data:
            run_command = f"{run_command} < /app/input.txt"
        commands.append(run_command)
        
        # Join commands with &&
        full_command = " && ".join(commands)
        
        # Security settings
        security_opt = ['no-new-privileges:true']
        cap_drop = ['ALL']
        
        # Create container
        container = self.client.containers.create(
            image=config['image'],
            command=['sh', '-c', full_command],
            volumes=volumes,
            mem_limit=limits.memory_limit,
            cpu_quota=int(float(limits.cpu_limit) * 100000),
            cpu_period=100000,
            network_disabled=limits.network_disabled,
            read_only=limits.read_only_filesystem,
            security_opt=security_opt,
            cap_drop=cap_drop,
            user='nobody',
            working_dir='/app',
            detach=True,
            # remove=False,  # We'll remove manually for cleanup control
            ulimits=[
                docker.types.Ulimit(name='nproc', soft=32, hard=32), # type: ignore
                docker.types.Ulimit(name='fsize', soft=limits.max_file_size, hard=limits.max_file_size) # type: ignore
            ]
        )
        
        return container
    
    def _extract_memory_usage(self, stats: Dict[str, Any]) -> int:
        """Extracts memory usage from container stats."""
        try:
            memory_stats = stats.get('memory_stats', {})
            usage = memory_stats.get('usage', 0)
            return usage // (1024 * 1024)  # Convert to MB
        except Exception:
            return 0
    
    async def pull_images(self):
        """Pulls all required Docker images."""
        for language_config in settings.language_configs.values():
            image = language_config['image']
            try:
                logger.info(f"Pulling Docker image: {image}")
                self.client.images.pull(image)
                logger.info(f"Successfully pulled image: {image}")
            except Exception as e:
                logger.error(f"Failed to pull image {image}: {e}")
    
    def cleanup_old_containers(self):
        """Removes old containers to prevent resource leaks."""
        try:
            # Remove containers older than 1 hour
            containers = self.client.containers.list(
                all=True,
                filters={'status': 'exited'}
            )
            
            current_time = time.time()
            for container in containers:
                created_time = container.attrs['Created']
                # Parse ISO format timestamp
                import datetime
                created_dt = datetime.datetime.fromisoformat(created_time.replace('Z', '+00:00'))
                created_timestamp = created_dt.timestamp()
                
                if current_time - created_timestamp > 3600:  # 1 hour
                    container.remove()
                    logger.info(f"Removed old container: {container.id}")
                    
        except Exception as e:
            logger.warning(f"Failed to cleanup old containers: {e}")