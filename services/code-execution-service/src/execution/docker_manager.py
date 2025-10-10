import docker
import tempfile
import os
import shutil
import time
import asyncio
from typing import Tuple, List, Optional
from docker.errors import ImageNotFound, APIError
from src.models.execution import Language, ResourceLimits, ExecutionStatus
from src.config.settings import settings
import logging
from docker.types import Ulimit, Mount
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)


class DockerExecutionManager:
    """Optimized Docker manager with connection pooling and caching."""
    
    def __init__(self):
        try:
            self.client = docker.from_env()
            self.client.ping()
            logger.info("Docker client initialized successfully")
            
            # Container pool for reuse (warm containers)
            self._container_pool: dict = {}
            self._pool_lock = asyncio.Lock()
            
            # Image cache status
            self._images_ready = False
            
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
        
        self._images_ready = True
        logger.info("All Docker images ready")
    
    async def execute_code_batch(
        self,
        code: str,
        language: Language,
        test_inputs: List[str],
        limits: ResourceLimits
    ) -> List[Tuple[str, str, float, int, ExecutionStatus]]:
        """
        Optimized batch execution with single compilation and parallel test runs.
        """
        temp_dir = None
        
        try:
            # Create temporary directory with secure permissions in /tmp
            temp_dir = await asyncio.to_thread(
                tempfile.mkdtemp, prefix="code_exec_", dir="/tmp"
            )
            os.chmod(temp_dir, 0o777)  # Allow container access for all users
            
            config = settings.language_configs[language.value]
            
            # Prepare code file
            file_path = await self._prepare_code_file(code, language, temp_dir)
            logger.info(f"Created code file: {file_path}, exists: {os.path.exists(file_path)}")
            logger.info(f"Temp dir contents: {os.listdir(temp_dir)}")
            
            # Single compilation step for compiled languages
            if config.get('compile_command'):
                # Extract class name for Java
                class_name = None
                if language == Language.JAVA:
                    class_name = self._extract_java_class_name(code)
                
                compile_success = await self._compile_in_container(
                    language, temp_dir, limits, class_name
                )
                if not compile_success:
                    error_result = (
                        "", "Compilation failed", 0, 0, 
                        ExecutionStatus.COMPILE_ERROR
                    )
                    return [error_result] * len(test_inputs)
            
            # Execute tests in parallel with controlled concurrency
            max_concurrent = min(5, len(test_inputs))  # Limit concurrent executions
            semaphore = asyncio.Semaphore(max_concurrent)
            
            logger.info(f"About to execute {len(test_inputs)} test inputs: {test_inputs}")
            
            async def execute_with_semaphore(test_input: str):
                async with semaphore:
                    logger.info(f"Starting execution with input: '{test_input}'")
                    # Extract class name for Java
                    class_name = None
                    if language == Language.JAVA:
                        class_name = self._extract_java_class_name(code)
                    
                    return await self._execute_single_test(
                        language, temp_dir, limits, test_input, config, class_name
                    )
            
            tasks = [execute_with_semaphore(inp) for inp in test_inputs]
            logger.info(f"Created {len(tasks)} tasks")
            results = await asyncio.gather(*tasks, return_exceptions=True)
            logger.info(f"Got {len(results)} results")
            
            # Process results and handle exceptions
            processed_results = []
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Test execution failed: {result}")
                    processed_results.append((
                        "", str(result), 0, 0, ExecutionStatus.INTERNAL_ERROR
                    ))
                else:
                    processed_results.append(result)
            
            return processed_results
            
        except Exception as e:
            logger.error(f"Batch execution error: {e}", exc_info=True)
            error_result = (
                "", f"Internal execution error: {str(e)}", 0, 0, 
                ExecutionStatus.INTERNAL_ERROR
            )
            return [error_result] * len(test_inputs)
            
        finally:
            if temp_dir and os.path.exists(temp_dir):
                await asyncio.to_thread(self._safe_rmtree, temp_dir)
    
    def _safe_rmtree(self, path: str):
        """Safely remove directory tree."""
        try:
            shutil.rmtree(path)
        except Exception as e:
            logger.warning(f"Failed to remove temp directory {path}: {e}")
    
    async def _compile_in_container(
        self,
        language: Language,
        temp_dir: str,
        limits: ResourceLimits,
        class_name: str = None
    ) -> bool:
        """Optimized compilation with separate builder images and timeout."""
        config = settings.language_configs[language.value]
        compile_command = config.get('compile_command')
        
        if not compile_command:
            return True
        
        # For Java, customize the compile command with the actual class name
        if language == Language.JAVA and class_name:
            compile_command = f"javac -d /app /app/{class_name}.java"
        
        # Use dedicated builder image for compilation if available
        builder_image = config.get('builder_image', config['image'])
        
        container = None
        try:
            # Use tmpfs for faster compilation
            tmpfs = {'/tmp': 'size=100m,mode=1777'}
            
            container = await asyncio.to_thread(
                self.client.containers.create,
                image=builder_image,
                command=self._get_compile_command(language, compile_command),
                volumes={temp_dir: {'bind': '/app', 'mode': 'rw'}},
                mem_limit='256m',  # More memory for compilation
                memswap_limit='256m',  # Prevent swap usage
                network_disabled=True,
                security_opt=['no-new-privileges:true'],
                cap_drop=['ALL'],
                user=self._get_container_user(language),  # Use correct coderunner user
                working_dir='/app',
                detach=True,
                tmpfs=tmpfs,
                pids_limit=50,  # Limit processes
            )
            
            await asyncio.to_thread(container.start)
            
            # Wait with timeout (longer for compilation)
            result = await asyncio.to_thread(
                container.wait, timeout=60
            )
            
            exit_code = result.get('StatusCode', 1)
            
            if exit_code != 0:
                stderr = await asyncio.to_thread(
                    lambda: container.logs(stdout=False, stderr=True).decode('utf-8', errors='ignore')
                )
                logger.error(f"Compilation failed: {stderr[:500]}")
                return False
            
            # Set execute permissions on compiled binaries
            await self._set_binary_permissions(language, temp_dir)
            
            return True
            
        except asyncio.TimeoutError:
            logger.error("Compilation timeout")
            return False
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
        config: dict,
        class_name: str = None
    ) -> Tuple[str, str, float, int, ExecutionStatus]:
        """Execute single test with optimized I/O handling."""
        logger.info(f"_execute_single_test called with input: '{input_data}', language: {language}")
        container = None
        
        try:
            logger.info(f"Input data received: '{input_data}', length: {len(input_data)}")
            
            # Prepare input file if input data is provided
            if input_data.strip():
                # Create unique input file for this test case to avoid conflicts
                import uuid
                unique_id = str(uuid.uuid4())[:8]
                input_file = await self._prepare_input_file(input_data, temp_dir, unique_id)
                logger.info(f"Created input file: {input_file}, exists: {os.path.exists(input_file)}")
                logger.info(f"Temp dir contents after input: {os.listdir(temp_dir)}")
                has_input = True
                input_filename = f"input_{unique_id}.txt"
            else:
                logger.info("No input data provided or empty input")
                has_input = False
                input_filename = None
            
            run_command = config['run_command']
            
            # Create container with optimized settings
            container = await asyncio.to_thread(
                self.client.containers.create,
                image=config['image'],
                command=self._get_run_command(language, run_command, has_input, input_filename, class_name),
                volumes={temp_dir: {'bind': '/app', 'mode': 'rw'}},  # Read-write mount for execution
                mem_limit=limits.memory_limit,
                memswap_limit=limits.memory_limit,
                cpu_quota=int(float(limits.cpu_limit) * 100000),
                cpu_period=100000,
                network_disabled=True,
                security_opt=['no-new-privileges:true'],
                cap_drop=['ALL'],
                user=self._get_container_user(language),  # Use correct coderunner user
                working_dir='/app',
                detach=True,
                stdin_open=False,  # No need for stdin with file redirection
                tty=False,
                tmpfs={'/tmp': 'size=50m,mode=1777'},
                pids_limit=self._get_pids_limit(language),
                ulimits=self._get_ulimits(language),
                # Disable OOM killer to get proper memory exceeded status
                oom_kill_disable=False,
            )
            
            start_time = time.time()
            await asyncio.to_thread(container.start)
            
            # Wait for execution with timeout
            try:
                result = await asyncio.wait_for(
                    asyncio.to_thread(container.wait),
                    timeout=limits.time_limit + 2
                )
                execution_time = time.time() - start_time
                
                # Get output efficiently
                logs = await asyncio.to_thread(container.logs, 
                    stdout=True, stderr=True)
                logs_str = logs.decode('utf-8', errors='ignore')
                
                # Split stdout and stderr (simplified approach)
                stdout = logs_str
                stderr = ""
                
                # Get memory usage
                try:
                    stats = await asyncio.to_thread(
                        container.stats, stream=False
                    )
                    memory_used = self._extract_memory_usage(stats)
                except Exception:
                    memory_used = 0
                
                exit_code = result.get('StatusCode', 1)
                status = self._determine_status(exit_code)
                
                # Truncate output if too large
                max_output = 10000
                if len(stdout) > max_output:
                    stdout = stdout[:max_output] + "\n... (output truncated)"
                
                return stdout, stderr, execution_time, memory_used, status
                
            except asyncio.TimeoutError:
                return "", "Time limit exceeded", limits.time_limit, 0, \
                       ExecutionStatus.TIME_LIMIT_EXCEEDED
            

                
        except Exception as e:
            logger.error(f"Test execution error: {e}", exc_info=True)
            return "", f"Execution error: {str(e)}", 0, 0, \
                   ExecutionStatus.INTERNAL_ERROR
            
        finally:
            if container:
                try:
                    await asyncio.to_thread(container.remove, force=True)
                except Exception as e:
                    logger.warning(f"Failed to remove container: {e}")
    
    async def _prepare_code_file(
        self, 
        code: str, 
        language: Language, 
        temp_dir: str
    ) -> str:
        """Prepare code file with proper naming."""
        config = settings.language_configs[language.value]
        
        if language == Language.JAVA:
            # Extract public class name from Java code
            class_name = self._extract_java_class_name(code)
            filename = f"{class_name}{config['file_extension']}"
        else:
            filename = f"solution{config['file_extension']}"
        
        file_path = os.path.join(temp_dir, filename)
        
        await asyncio.to_thread(self._write_file, file_path, code)
        
        # Set permissions for container access
        os.chmod(file_path, 0o666)  # Read/write for all users
        
        return file_path
    
    async def _prepare_input_file(
        self,
        input_data: str,
        temp_dir: str,
        unique_id: str = None
    ) -> str:
        """Prepare input file for stdin redirection."""
        filename = f"input_{unique_id}.txt" if unique_id else "input.txt"
        input_file = os.path.join(temp_dir, filename)
        
        # Add newline if not present
        input_with_newline = input_data if input_data.endswith('\n') else input_data + '\n'
        
        await asyncio.to_thread(self._write_file, input_file, input_with_newline)
        
        # Set permissions for container access
        os.chmod(input_file, 0o666)
        
        return input_file
    
    def _write_file(self, filepath: str, content: str):
        """Write file synchronously."""
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
    
    def _determine_status(self, exit_code: int) -> ExecutionStatus:
        """Determine execution status from exit code."""
        if exit_code == 0:
            return ExecutionStatus.SUCCESS
        elif exit_code == 124:
            return ExecutionStatus.TIME_LIMIT_EXCEEDED
        elif exit_code == 137:  # SIGKILL
            return ExecutionStatus.MEMORY_LIMIT_EXCEEDED
        elif exit_code == 139:  # SIGSEGV
            return ExecutionStatus.RUNTIME_ERROR
        else:
            return ExecutionStatus.RUNTIME_ERROR
    
    def _extract_memory_usage(self, stats: dict) -> int:
        """Extract memory usage in MB from container stats."""
        try:
            memory_stats = stats.get('memory_stats', {})
            usage = memory_stats.get('usage', 0)
            return usage // (1024 * 1024)
        except Exception:
            return 0
    
    def _get_container_user(self, language: Language) -> str:
        """Get the correct user ID for the container based on language."""
        # User IDs based on the Dockerfiles
        if language == Language.PYTHON or language == Language.JAVASCRIPT:
            return '1001:1001'  # coderunner UID 1001
        elif language == Language.JAVA or language == Language.CPP or language == Language.RUST or language == Language.GO:
            return '1000:1000'  # coderunner UID 1000
        else:
            return '1001:1001'  # Default fallback
    
    def _get_compile_command(self, language: Language, compile_command: str) -> list:
        """Get the correct compile command for the container."""
        # All images now have shell available
        return ['sh', '-c', compile_command]
    
    def _get_run_command(self, language: Language, run_command: str, has_input: bool = False, input_filename: str = None, class_name: str = None) -> list:
        """Get the correct run command for the container."""
        input_file = f'/app/{input_filename}' if input_filename else '/app/input.txt'
        
        # For Java, customize the run command with the actual class name
        if language == Language.JAVA and class_name:
            run_command = f"java -Xmx96m -Xms32m -XX:+UseSerialGC -XX:MaxRAMPercentage=75 -XX:+UseContainerSupport -XX:TieredStopAtLevel=1 -cp /app {class_name}"
        
        # For compiled languages, copy binary to home directory and execute from there
        if language in [Language.CPP, Language.GO, Language.RUST]:
            if has_input:
                return ['sh', '-c', f'cp /app/solution ~/solution && chmod +x ~/solution && ~/solution < {input_file}']
            else:
                return ['sh', '-c', f'cp /app/solution ~/solution && chmod +x ~/solution && ~/solution']
        else:
            # All other images have shell available
            if has_input:
                return ['sh', '-c', f'{run_command} < {input_file}']
            else:
                return ['sh', '-c', run_command]
    
    def _get_pids_limit(self, language: Language) -> int:
        """Get appropriate process limit based on language."""
        if language in [Language.JAVA, Language.CPP, Language.GO, Language.RUST]:
            return 128  # Compiled languages need more processes
        else:
            return 64   # Interpreted languages need fewer processes
    
    def _get_ulimits(self, language: Language) -> list:
        """Get appropriate ulimits based on language."""
        if language in [Language.JAVA, Language.CPP, Language.GO, Language.RUST]:
            return [
                Ulimit(name='nproc', soft=128, hard=128),  # More processes for compiled languages
                Ulimit(name='fsize', soft=10485760, hard=10485760),  # 10MB
                Ulimit(name='nofile', soft=128, hard=128),  # More file descriptors
            ]
        else:
            return [
                Ulimit(name='nproc', soft=64, hard=64),  # Moderate limits for interpreted languages
                Ulimit(name='fsize', soft=10485760, hard=10485760),  # 10MB
                Ulimit(name='nofile', soft=64, hard=64),
            ]
    
    async def _set_binary_permissions(self, language: Language, temp_dir: str):
        """Set execute permissions on compiled binaries."""
        if language in [Language.CPP, Language.GO, Language.RUST]:
            binary_path = os.path.join(temp_dir, "solution")
            logger.info(f"Checking binary at {binary_path}, exists: {os.path.exists(binary_path)}")
            if os.path.exists(binary_path):
                os.chmod(binary_path, 0o777)  # Full permissions for all users
                logger.info(f"Set execute permissions on {binary_path}")
            else:
                logger.warning(f"Binary not found at {binary_path}")
        # Java .class files don't need execute permissions
    
    def _extract_java_class_name(self, code: str) -> str:
        """Extract the public class name from Java code."""
        import re
        
        # Look for public class declaration
        public_class_match = re.search(r'public\s+class\s+(\w+)', code)
        if public_class_match:
            return public_class_match.group(1)
        
        # If no public class, look for any class declaration
        class_match = re.search(r'class\s+(\w+)', code)
        if class_match:
            return class_match.group(1)
        
        # Default fallback
        return "Solution"
    
    async def pull_images(self):
        """Pull all required Docker images."""
        await self._ensure_images_available()
    
    async def cleanup_old_containers(self):
        """Remove old stopped containers asynchronously."""
        try:
            containers = await asyncio.to_thread(
                self.client.containers.list,
                all=True,
                filters={'status': 'exited'}
            )
            
            current_time = time.time()
            cleanup_tasks = []
            
            for container in containers:
                try:
                    created = container.attrs.get('Created', '')
                    if created:
                        import datetime
                        created_dt = datetime.datetime.fromisoformat(
                            created.replace('Z', '+00:00')
                        )
                        
                        # Remove containers older than 1 hour
                        if current_time - created_dt.timestamp() > 3600:
                            cleanup_tasks.append(
                                asyncio.to_thread(container.remove)
                            )
                except Exception as e:
                    logger.warning(f"Failed to process container: {e}")
            
            if cleanup_tasks:
                await asyncio.gather(*cleanup_tasks, return_exceptions=True)
                logger.info(f"Cleaned up {len(cleanup_tasks)} old containers")
                    
        except Exception as e:
            logger.warning(f"Failed to cleanup old containers: {e}")
    
    async def warmup(self):
        """Warm up the execution environment."""
        logger.info("Warming up Docker execution environment")
        
        # Ensure images are available
        await self._ensure_images_available()
        
        # Run a simple test for each language to warm up
        warmup_codes = {
            Language.PYTHON: "print('warmup')",
            Language.JAVASCRIPT: "console.log('warmup');",
            Language.JAVA: "public class Solution { public static void main(String[] args) { System.out.println(\"warmup\"); } }",
        }
        
        limits = ResourceLimits(
            memory_limit="64m",
            time_limit=5,
            cpu_limit="0.5"
        )
        
        for lang, code in warmup_codes.items():
            try:
                await self.execute_code_batch(code, lang, [""], limits)
                logger.info(f"Warmed up {lang.value}")
            except Exception as e:
                logger.warning(f"Warmup failed for {lang.value}: {e}")