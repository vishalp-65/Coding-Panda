import docker
import tempfile
import os
import shutil
import time
import asyncio
from typing import Tuple, List
from docker.errors import ImageNotFound, APIError
from src.models.execution import Language, ResourceLimits, ExecutionStatus
from src.config.settings import settings
import logging

logger = logging.getLogger(__name__)


class DockerExecutionManager:
    """Manages Docker containers for secure code execution with performance optimizations."""
    
    def __init__(self):
        try:
            self.client = docker.from_env()
            self.client.ping()
            logger.info("Docker client initialized successfully")
            # Pre-pull images on startup
            asyncio.create_task(self._ensure_images_available())
        except Exception as e:
            logger.error(f"Failed to initialize Docker client: {e}")
            raise RuntimeError(f"Docker initialization failed: {e}")
    
    async def _ensure_images_available(self):
        """Ensure all required images are pulled and cached."""
        for lang, config in settings.language_configs.items():
            image = config['image']
            try:
                self.client.images.get(image)
                logger.info(f"Image already available: {image}")
            except ImageNotFound:
                logger.info(f"Pulling image: {image}")
                await asyncio.to_thread(self.client.images.pull, image)
    
    async def execute_code_batch(
        self,
        code: str,
        language: Language,
        test_inputs: List[str],
        limits: ResourceLimits
    ) -> List[Tuple[str, str, float, int, ExecutionStatus]]:
        """
        Execute code with multiple test cases in parallel using a single compiled binary.
        Returns list of: (stdout, stderr, execution_time, memory_used, status) for each test.
        """
        temp_dir = None
        
        try:
            # Create temporary directory
            temp_dir = tempfile.mkdtemp()
            
            # Prepare code file
            config = settings.language_configs[language.value]
            await self._prepare_code_file(code, language, temp_dir)
            
            # Compile once if needed (not per test case!)
            if config.get('compile_command'):
                compile_success = await self._compile_in_container(
                    language, temp_dir, limits
                )
                if not compile_success:
                    error_result = ("", "Compilation failed", 0, 0, ExecutionStatus.COMPILE_ERROR)
                    return [error_result] * len(test_inputs)
            
            # Execute all test cases in parallel
            tasks = []
            for test_input in test_inputs:
                task = self._execute_single_test(
                    language, temp_dir, limits, test_input, config
                )
                tasks.append(task)
            
            # Run tests concurrently (limit concurrency to avoid overwhelming system)
            results = []
            batch_size = 3  # Run 3 tests at a time
            for i in range(0, len(tasks), batch_size):
                batch = tasks[i:i + batch_size]
                batch_results = await asyncio.gather(*batch, return_exceptions=True)
                
                # Handle exceptions
                for result in batch_results:
                    if isinstance(result, Exception):
                        logger.error(f"Test execution failed: {result}")
                        results.append(("", str(result), 0, 0, ExecutionStatus.INTERNAL_ERROR))
                    else:
                        results.append(result)
            
            return results
            
        except Exception as e:
            logger.error(f"Batch execution error: {e}", exc_info=True)
            error_result = ("", f"Internal execution error: {str(e)}", 0, 0, ExecutionStatus.INTERNAL_ERROR)
            return [error_result] * len(test_inputs)
            
        finally:
            if temp_dir and os.path.exists(temp_dir):
                try:
                    shutil.rmtree(temp_dir)
                except Exception as e:
                    logger.warning(f"Failed to remove temp directory: {e}")
    
    async def _compile_in_container(
        self,
        language: Language,
        temp_dir: str,
        limits: ResourceLimits
    ) -> bool:
        """Compile code in a container. Returns True if successful."""
        config = settings.language_configs[language.value]
        compile_command = config.get('compile_command')
        
        if not compile_command:
            return True
        
        container = None
        try:
            # Create container for compilation
            container = await asyncio.to_thread(
                self.client.containers.create,
                image=config['image'],
                command=['sh', '-c', compile_command],
                volumes={temp_dir: {'bind': '/app', 'mode': 'rw'}},
                mem_limit=limits.memory_limit,
                network_disabled=True,
                security_opt=['no-new-privileges:true'],
                cap_drop=['ALL'],
                user='root',  # Need root for compilation
                working_dir='/app',
                detach=True
            )
            
            await asyncio.to_thread(container.start)
            result = await asyncio.to_thread(container.wait, timeout=30)
            
            exit_code = result.get('StatusCode', 1)
            
            if exit_code != 0:
                stderr = container.logs(stdout=False, stderr=True).decode('utf-8')
                logger.error(f"Compilation failed: {stderr}")
                return False
            
            return True
            
        finally:
            if container:
                try:
                    await asyncio.to_thread(container.remove, force=True)
                except Exception as e:
                    logger.warning(f"Failed to remove compile container: {e}")
    
    async def _execute_single_test(
        self,
        language: Language,
        temp_dir: str,
        limits: ResourceLimits,
        input_data: str,
        config: dict
    ) -> Tuple[str, str, float, int, ExecutionStatus]:
        """Execute a single test case."""
        container = None
        
        try:
            # Write input file
            input_file = os.path.join(temp_dir, f'input_{id(input_data)}.txt')
            await asyncio.to_thread(self._write_input_file, input_file, input_data)
            
            # Build run command
            run_command = config['run_command']
            if input_data:
                run_command = f"{run_command} < {input_file}"
            
            # Create container
            container = await asyncio.to_thread(
                self.client.containers.create,
                image=config['image'],
                command=['sh', '-c', run_command],
                volumes={temp_dir: {'bind': '/app', 'mode': 'ro'}},  # Read-only for execution
                mem_limit=limits.memory_limit,
                cpu_quota=int(float(limits.cpu_limit) * 100000),
                cpu_period=100000,
                network_disabled=limits.network_disabled,
                security_opt=['no-new-privileges:true'],
                cap_drop=['ALL'],
                user='nobody',
                working_dir='/app',
                detach=True,
                ulimits=[
                    docker.types.Ulimit(name='nproc', soft=32, hard=32),
                    docker.types.Ulimit(
                        name='fsize',
                        soft=limits.max_file_size,
                        hard=limits.max_file_size
                    )
                ]
            )
            
            # Execute with timing
            start_time = time.time()
            await asyncio.to_thread(container.start)
            
            try:
                result = await asyncio.to_thread(
                    container.wait,
                    timeout=limits.time_limit + 2
                )
                execution_time = time.time() - start_time
                
                # Get output
                stdout = await asyncio.to_thread(
                    lambda: container.logs(stdout=True, stderr=False).decode('utf-8')
                )
                stderr = await asyncio.to_thread(
                    lambda: container.logs(stdout=False, stderr=True).decode('utf-8')
                )
                
                # Get memory usage
                try:
                    stats = await asyncio.to_thread(container.stats, stream=False)
                    memory_used = self._extract_memory_usage(stats)
                except Exception:
                    memory_used = 0
                
                exit_code = result.get('StatusCode', 1)
                status = self._determine_status(exit_code)
                
                return stdout, stderr, execution_time, memory_used, status
                
            except Exception as e:
                if "timeout" in str(e).lower():
                    return "", "Time limit exceeded", limits.time_limit, 0, \
                           ExecutionStatus.TIME_LIMIT_EXCEEDED
                raise
                
        finally:
            if container:
                try:
                    await asyncio.to_thread(container.remove, force=True)
                except Exception as e:
                    logger.warning(f"Failed to remove test container: {e}")
            
            # Cleanup input file
            if input_data:
                try:
                    os.remove(input_file)
                except Exception:
                    pass
    
    def _write_input_file(self, filepath: str, content: str):
        """Write input file (sync operation for thread execution)."""
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
    
    async def _prepare_code_file(
        self, 
        code: str, 
        language: Language, 
        temp_dir: str
    ) -> str:
        """Prepares code file in temporary directory."""
        config = settings.language_configs[language.value]
        
        if language == Language.JAVA:
            filename = f"Solution{config['file_extension']}"
        else:
            filename = f"solution{config['file_extension']}"
        
        file_path = os.path.join(temp_dir, filename)
        
        await asyncio.to_thread(self._write_code_file, file_path, code)
        
        return file_path
    
    def _write_code_file(self, filepath: str, code: str):
        """Write code file (sync operation for thread execution)."""
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(code)
    
    def _determine_status(self, exit_code: int) -> ExecutionStatus:
        """Determines execution status from exit code."""
        if exit_code == 0:
            return ExecutionStatus.SUCCESS
        elif exit_code == 124:
            return ExecutionStatus.TIME_LIMIT_EXCEEDED
        elif exit_code == 137:
            return ExecutionStatus.MEMORY_LIMIT_EXCEEDED
        else:
            return ExecutionStatus.RUNTIME_ERROR
    
    def _extract_memory_usage(self, stats: dict) -> int:
        """Extracts memory usage from container stats in MB."""
        try:
            memory_stats = stats.get('memory_stats', {})
            usage = memory_stats.get('usage', 0)
            return usage // (1024 * 1024)
        except Exception:
            return 0
    
    async def pull_images(self):
        """Pulls all required Docker images."""
        for lang, config in settings.language_configs.items():
            image = config['image']
            try:
                logger.info(f"Pulling Docker image: {image}")
                await asyncio.to_thread(self.client.images.pull, image)
                logger.info(f"Successfully pulled image: {image}")
            except Exception as e:
                logger.error(f"Failed to pull image {image}: {e}")
    
    def cleanup_old_containers(self):
        """Removes old stopped containers."""
        try:
            containers = self.client.containers.list(
                all=True,
                filters={'status': 'exited'}
            )
            
            current_time = time.time()
            for container in containers:
                try:
                    created = container.attrs.get('Created', '')
                    import datetime
                    created_dt = datetime.datetime.fromisoformat(
                        created.replace('Z', '+00:00')
                    )
                    
                    if current_time - created_dt.timestamp() > 3600:
                        container.remove()
                        logger.info(f"Removed old container: {container.id}")
                except Exception as e:
                    logger.warning(f"Failed to process container: {e}")
                    
        except Exception as e:
            logger.warning(f"Failed to cleanup old containers: {e}")