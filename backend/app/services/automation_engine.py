# app/services/automation_engine.py
"""
Enhanced Automation Engine for Workflow System
Supports dynamic execution of external APIs, scripts, notifications, and custom automations
"""
import json
import requests
import subprocess
import tempfile
import os
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from enum import Enum
import logging
import hashlib
import time
import asyncio
from concurrent.futures import ThreadPoolExecutor, TimeoutError

from app.database import Database
from app.services.notification_service import NotificationService
from app.utils.security import sanitize_input
import threading

logger = logging.getLogger(__name__)


class AutomationType(Enum):
    """Supported automation types"""
    API_CALL = "api_call"
    SCRIPT_EXECUTION = "script_execution"
    EMAIL_NOTIFICATION = "email_notification"
    SMS_NOTIFICATION = "sms_notification"
    DATABASE_OPERATION = "database_operation"
    FILE_OPERATION = "file_operation"
    WEBHOOK_TRIGGER = "webhook_trigger"
    CUSTOM_FUNCTION = "custom_function"
    DATA_TRANSFORMATION = "data_transformation"


class AutomationStatus(Enum):
    """Automation execution status"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"
    RETRYING = "retrying"


class AutomationEngine:
    """Enhanced automation execution engine"""

    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=10)
        self._automation_handlers = self._register_handlers()
        self._script_cache = {}

    def _register_handlers(self) -> Dict[AutomationType, callable]:
        """Register automation type handlers"""
        return {
            AutomationType.API_CALL: self._execute_api_call,
            AutomationType.SCRIPT_EXECUTION: self._execute_script,
            AutomationType.EMAIL_NOTIFICATION: self._execute_email_notification,
            AutomationType.SMS_NOTIFICATION: self._execute_sms_notification,
            AutomationType.DATABASE_OPERATION: self._execute_database_operation,
            AutomationType.FILE_OPERATION: self._execute_file_operation,
            AutomationType.WEBHOOK_TRIGGER: self._execute_webhook_trigger,
            AutomationType.CUSTOM_FUNCTION: self._execute_custom_function,
            AutomationType.DATA_TRANSFORMATION: self._execute_data_transformation
        }

    def execute_automation(self, automation_config: Dict[str, Any],
                           context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main automation execution method with comprehensive error handling
        """
        execution_id = self._generate_execution_id()

        try:
            # Log automation start
            self._log_automation_start(execution_id, automation_config, context)

            # Validate and prepare automation
            automation_type, config = self._validate_and_prepare_automation(automation_config)

            # Apply context variables to configuration
            resolved_config = self._resolve_context_variables(config, context)

            # Execute with retry logic
            result = self._execute_with_retry(
                automation_type, resolved_config, context, execution_id
            )

            # Log successful completion
            self._log_automation_completion(execution_id, result)

            return {
                'success': True,
                'execution_id': execution_id,
                'result': result,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Automation execution failed: {e}", exc_info=True)
            self._log_automation_error(execution_id, str(e))

            return {
                'success': False,
                'execution_id': execution_id,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }

    def _validate_and_prepare_automation(self, config: Dict[str, Any]) -> Tuple[AutomationType, Dict[str, Any]]:
        """Validate automation configuration and prepare for execution"""
        automation_type_str = config.get('type')
        if not automation_type_str:
            raise ValueError("Automation type is required")

        try:
            automation_type = AutomationType(automation_type_str)
        except ValueError:
            raise ValueError(f"Unsupported automation type: {automation_type_str}")

        # Load template if specified
        if 'template_id' in config:
            template = self._load_automation_template(config['template_id'])
            if template:
                # Merge template with config (config overrides template)
                merged_config = {**template, **config}
                config = merged_config

        return automation_type, config

    def _resolve_context_variables(self, config: Dict[str, Any],
                                   context: Dict[str, Any]) -> Dict[str, Any]:
        """Resolve template variables in configuration using context"""
        import re

        def replace_variables(obj):
            if isinstance(obj, str):
                # Replace {{variable}} patterns
                def replace_var(match):
                    var_path = match.group(1)
                    # Support nested variables like {{workflow_data.user.email}}
                    try:
                        value = context
                        for key in var_path.split('.'):
                            value = value[key]
                        return str(value)
                    except (KeyError, TypeError):
                        logger.warning(f"Variable not found: {var_path}")
                        return match.group(0)  # Return original if not found

                return re.sub(r'\{\{([^}]+)\}\}', replace_var, obj)
            elif isinstance(obj, dict):
                return {k: replace_variables(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [replace_variables(item) for item in obj]
            else:
                return obj

        return replace_variables(config)

    def _execute_with_retry(self, automation_type: AutomationType,
                            config: Dict[str, Any], context: Dict[str, Any],
                            execution_id: str) -> Dict[str, Any]:
        """Execute automation with retry logic"""
        max_retries = config.get('max_retries', 0)
        retry_delay = config.get('retry_delay', 60)  # seconds
        timeout = config.get('timeout', 300)  # 5 minutes default

        handler = self._automation_handlers.get(automation_type)
        if not handler:
            raise ValueError(f"No handler for automation type: {automation_type}")

        for attempt in range(max_retries + 1):
            try:
                # Execute with timeout
                future = self.executor.submit(handler, config, context)
                result = future.result(timeout=timeout)

                return result

            except TimeoutError:
                error_msg = f"Automation timed out after {timeout} seconds"
                logger.error(f"{error_msg} (attempt {attempt + 1})")

                if attempt < max_retries:
                    logger.info(f"Retrying automation after {retry_delay} seconds")
                    time.sleep(retry_delay)
                else:
                    raise Exception(error_msg)

            except Exception as e:
                logger.error(f"Automation failed (attempt {attempt + 1}): {e}")

                if attempt < max_retries:
                    if config.get('retry_on_error', True):
                        logger.info(f"Retrying automation after {retry_delay} seconds")
                        time.sleep(retry_delay)
                    else:
                        raise
                else:
                    raise

    # ===== AUTOMATION TYPE HANDLERS =====

    def _execute_api_call(self, config: Dict[str, Any],
                          context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute external API call"""
        url = config.get('url')
        method = config.get('method', 'POST').upper()
        headers = config.get('headers', {})
        data = config.get('data', {})
        params = config.get('params', {})
        auth = config.get('auth')
        verify_ssl = config.get('verify_ssl', True)

        if not url:
            raise ValueError("API URL is required")

        # Prepare authentication
        auth_obj = None
        if auth:
            auth_type = auth.get('type', 'basic')
            if auth_type == 'basic':
                auth_obj = (auth['username'], auth['password'])
            elif auth_type == 'bearer':
                headers['Authorization'] = f"Bearer {auth['token']}"
            elif auth_type == 'api_key':
                if auth.get('location') == 'header':
                    headers[auth['key']] = auth['value']
                else:
                    params[auth['key']] = auth['value']

        # Set default headers
        if 'Content-Type' not in headers:
            headers['Content-Type'] = 'application/json'

        try:
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                json=data if headers.get('Content-Type') == 'application/json' else None,
                data=data if headers.get('Content-Type') != 'application/json' else None,
                params=params,
                auth=auth_obj,
                verify=verify_ssl,
                timeout=config.get('request_timeout', 30)
            )

            # Log the request
            logger.info(f"API call: {method} {url} -> {response.status_code}")

            # Handle response
            result = {
                'status_code': response.status_code,
                'headers': dict(response.headers),
                'success': 200 <= response.status_code < 300
            }

            # Parse response body
            try:
                if response.content:
                    result['response'] = response.json()
                else:
                    result['response'] = None
            except json.JSONDecodeError:
                result['response'] = response.text

            # Check for expected status codes
            expected_status = config.get('expected_status_codes', [200, 201, 202])
            if response.status_code not in expected_status:
                raise Exception(f"Unexpected status code: {response.status_code}")

            return result

        except requests.exceptions.RequestException as e:
            raise Exception(f"API call failed: {str(e)}")

    def _execute_script(self, config: Dict[str, Any],
                        context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute custom script with sandboxing"""
        script_type = config.get('script_type', 'python')
        script_content = config.get('script')
        script_id = config.get('script_id')

        # Load script from database if script_id is provided
        if script_id and not script_content:
            script_content = self._load_script_from_db(script_id)

        if not script_content:
            raise ValueError("Script content or script_id is required")

        if script_type == 'python':
            return self._execute_python_script(script_content, context, config)
        elif script_type == 'javascript':
            return self._execute_javascript_script(script_content, context, config)
        elif script_type == 'shell':
            return self._execute_shell_script(script_content, context, config)
        else:
            raise ValueError(f"Unsupported script type: {script_type}")

    def _execute_python_script(self, script: str, context: Dict[str, Any],
                               config: Dict[str, Any]) -> Dict[str, Any]:
        """Execute Python script in sandboxed environment"""
        # Create safe namespace
        safe_globals = {
            '__builtins__': {
                'len': len, 'str': str, 'int': int, 'float': float, 'bool': bool,
                'list': list, 'dict': dict, 'tuple': tuple, 'set': set,
                'min': min, 'max': max, 'sum': sum, 'abs': abs,
                'round': round, 'sorted': sorted, 'range': range,
                'enumerate': enumerate, 'zip': zip, 'any': any, 'all': all,
                'print': print
            },
            'json': json,
            'datetime': datetime,
            'context': context,
            'requests': requests if config.get('allow_network', False) else None
        }

        # Prepare result container
        result_container = {'result': None, 'output': []}

        def capture_print(*args, **kwargs):
            output = ' '.join(str(arg) for arg in args)
            result_container['output'].append(output)
            print(output)  # Also print normally for logging

        safe_globals['__builtins__']['print'] = capture_print

        try:
            # Execute script
            exec(script, safe_globals)

            # Get result if script sets it
            result = safe_globals.get('result', result_container['result'])

            return {
                'result': result,
                'output': result_container['output'],
                'script_type': 'python'
            }

        except Exception as e:
            raise Exception(f"Python script execution failed: {str(e)}")

    def _execute_javascript_script(self, script: str, context: Dict[str, Any],
                                   config: Dict[str, Any]) -> Dict[str, Any]:
        """Execute JavaScript using Node.js"""
        try:
            # Create temporary script file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
                # Wrap script with context injection
                wrapped_script = f"""
                const context = {json.dumps(context)};
                let result = null;

                {script}

                if (typeof result !== 'undefined') {{
                    console.log(JSON.stringify({{result: result}}));
                }}
                """
                f.write(wrapped_script)
                script_file = f.name

            try:
                # Execute with Node.js
                process = subprocess.run(
                    ['node', script_file],
                    capture_output=True,
                    text=True,
                    timeout=config.get('script_timeout', 60)
                )

                if process.returncode != 0:
                    raise Exception(f"Script failed: {process.stderr}")

                # Parse output
                output_lines = process.stdout.strip().split('\n')
                script_result = None

                for line in output_lines:
                    try:
                        parsed = json.loads(line)
                        if 'result' in parsed:
                            script_result = parsed['result']
                    except json.JSONDecodeError:
                        continue

                return {
                    'result': script_result,
                    'output': output_lines,
                    'script_type': 'javascript'
                }

            finally:
                os.unlink(script_file)

        except subprocess.TimeoutExpired:
            raise Exception("JavaScript script execution timed out")
        except FileNotFoundError:
            raise Exception("Node.js not found - JavaScript execution not available")

    def _execute_shell_script(self, script: str, context: Dict[str, Any],
                              config: Dict[str, Any]) -> Dict[str, Any]:
        """Execute shell script (with restrictions)"""
        if not config.get('allow_shell', False):
            raise Exception("Shell script execution is disabled")

        # Security check - block dangerous commands
        dangerous_commands = ['rm', 'del', 'format', 'mkfs', 'dd', 'sudo', 'su']
        for cmd in dangerous_commands:
            if cmd in script.lower():
                raise Exception(f"Dangerous command '{cmd}' not allowed")

        try:
            # Create temporary script file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.sh', delete=False) as f:
                f.write("#!/bin/bash\n")
                f.write(script)
                script_file = f.name

            os.chmod(script_file, 0o755)

            try:
                process = subprocess.run(
                    ['/bin/bash', script_file],
                    capture_output=True,
                    text=True,
                    timeout=config.get('script_timeout', 60),
                    env={'PATH': '/usr/bin:/bin'}  # Restricted PATH
                )

                return {
                    'result': process.stdout,
                    'exit_code': process.returncode,
                    'stderr': process.stderr,
                    'script_type': 'shell'
                }

            finally:
                os.unlink(script_file)

        except subprocess.TimeoutExpired:
            raise Exception("Shell script execution timed out")

    def _execute_email_notification(self, config: Dict[str, Any],
                                    context: Dict[str, Any]) -> Dict[str, Any]:
        """Send email notification"""
        recipients = config.get('recipients', [])
        subject = config.get('subject', 'Workflow Notification')
        body = config.get('body', '')
        template_id = config.get('template_id')
        attachments = config.get('attachments', [])

        if not recipients:
            raise ValueError("Email recipients are required")

        # Load email template if specified
        if template_id:
            template = self._load_email_template(template_id)
            if template:
                subject = template.get('subject', subject)
                body = template.get('body', body)

        sent_count = 0
        failed_recipients = []

        for recipient in recipients:
            try:
                # Use your email service here
                self._send_email(recipient, subject, body, attachments)
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send email to {recipient}: {e}")
                failed_recipients.append(recipient)

        return {
            'sent_count': sent_count,
            'total_recipients': len(recipients),
            'failed_recipients': failed_recipients,
            'success': len(failed_recipients) == 0
        }

    def _execute_sms_notification(self, config: Dict[str, Any],
                                  context: Dict[str, Any]) -> Dict[str, Any]:
        """Send SMS notification"""
        phone_numbers = config.get('phone_numbers', [])
        message = config.get('message', '')
        template_id = config.get('template_id')

        if not phone_numbers:
            raise ValueError("Phone numbers are required")

        if not message and not template_id:
            raise ValueError("Message or template_id is required")

        # Load SMS template if specified
        if template_id:
            template = self._load_sms_template(template_id)
            if template:
                message = template.get('message', message)

        sent_count = 0
        failed_numbers = []

        for phone_number in phone_numbers:
            try:
                # Use your SMS service here (Twilio, AWS SNS, etc.)
                self._send_sms(phone_number, message)
                sent_count += 1
            except Exception as e:
                logger.error(f"Failed to send SMS to {phone_number}: {e}")
                failed_numbers.append(phone_number)

        return {
            'sent_count': sent_count,
            'total_numbers': len(phone_numbers),
            'failed_numbers': failed_numbers,
            'success': len(failed_numbers) == 0
        }

    def _execute_database_operation(self, config: Dict[str, Any],
                                    context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute database operations"""
        operation = config.get('operation')  # insert, update, delete, select
        table = config.get('table')
        data = config.get('data', {})
        conditions = config.get('conditions', {})

        if not operation or not table:
            raise ValueError("Database operation and table are required")

        try:
            if operation == 'insert':
                result_id = Database.execute_insert(
                    f"INSERT INTO {table} ({', '.join(data.keys())}) VALUES ({', '.join(['%s'] * len(data))})",
                    list(data.values())
                )
                return {'operation': 'insert', 'inserted_id': result_id}

            elif operation == 'update':
                set_clause = ', '.join([f"{k} = %s" for k in data.keys()])
                where_clause = ' AND '.join([f"{k} = %s" for k in conditions.keys()])

                Database.execute_query(
                    f"UPDATE {table} SET {set_clause} WHERE {where_clause}",
                    list(data.values()) + list(conditions.values())
                )
                return {'operation': 'update', 'success': True}

            elif operation == 'delete':
                where_clause = ' AND '.join([f"{k} = %s" for k in conditions.keys()])

                Database.execute_query(
                    f"DELETE FROM {table} WHERE {where_clause}",
                    list(conditions.values())
                )
                return {'operation': 'delete', 'success': True}

            elif operation == 'select':
                where_clause = ' AND '.join([f"{k} = %s" for k in conditions.keys()])

                if conditions:
                    results = Database.execute_query(
                        f"SELECT * FROM {table} WHERE {where_clause}",
                        list(conditions.values())
                    )
                else:
                    results = Database.execute_query(f"SELECT * FROM {table}")

                return {
                    'operation': 'select',
                    'results': [dict(row) for row in results] if results else []
                }
            else:
                raise ValueError(f"Unsupported database operation: {operation}")

        except Exception as e:
            raise Exception(f"Database operation failed: {str(e)}")

    def _execute_file_operation(self, config: Dict[str, Any],
                                context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute file operations"""
        operation = config.get('operation')  # read, write, append, delete, copy, move
        file_path = config.get('file_path')
        content = config.get('content', '')

        if not operation or not file_path:
            raise ValueError("File operation and file_path are required")

        try:
            if operation == 'read':
                with open(file_path, 'r', encoding=config.get('encoding', 'utf-8')) as f:
                    content = f.read()
                return {'operation': 'read', 'content': content}

            elif operation == 'write':
                with open(file_path, 'w', encoding=config.get('encoding', 'utf-8')) as f:
                    f.write(content)
                return {'operation': 'write', 'success': True}

            elif operation == 'append':
                with open(file_path, 'a', encoding=config.get('encoding', 'utf-8')) as f:
                    f.write(content)
                return {'operation': 'append', 'success': True}

            elif operation == 'delete':
                os.remove(file_path)
                return {'operation': 'delete', 'success': True}

            else:
                raise ValueError(f"Unsupported file operation: {operation}")

        except Exception as e:
            raise Exception(f"File operation failed: {str(e)}")

    def _execute_webhook_trigger(self, config: Dict[str, Any],
                                 context: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger external webhook"""
        # This is similar to API call but specifically for webhooks
        webhook_config = {
            'url': config.get('webhook_url'),
            'method': config.get('method', 'POST'),
            'headers': config.get('headers', {}),
            'data': {
                'event': config.get('event_type', 'workflow_automation'),
                'timestamp': datetime.now().isoformat(),
                'context': context,
                'payload': config.get('payload', {})
            }
        }

        return self._execute_api_call(webhook_config, context)

    def _execute_custom_function(self, config: Dict[str, Any],
                                 context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute custom registered function"""
        function_name = config.get('function_name')
        parameters = config.get('parameters', {})

        if not function_name:
            raise ValueError("Function name is required")

        # Load custom function from registry
        custom_function = self._load_custom_function(function_name)
        if not custom_function:
            raise ValueError(f"Custom function '{function_name}' not found")

        try:
            result = custom_function(parameters, context)
            return {'function': function_name, 'result': result}
        except Exception as e:
            raise Exception(f"Custom function execution failed: {str(e)}")

    def _execute_data_transformation(self, config: Dict[str, Any],
                                     context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute data transformation"""
        transformation_type = config.get('transformation_type')
        source_data = config.get('source_data', context.get('workflow_data', {}))

        if transformation_type == 'map_fields':
            field_mapping = config.get('field_mapping', {})
            result = {}
            for target_field, source_field in field_mapping.items():
                if source_field in source_data:
                    result[target_field] = source_data[source_field]
            return {'transformed_data': result}

        elif transformation_type == 'filter_data':
            filter_conditions = config.get('filter_conditions', {})
            # Implement data filtering logic
            return {'filtered_data': source_data}  # Placeholder

        elif transformation_type == 'aggregate_data':
            # Implement data aggregation
            return {'aggregated_data': {}}  # Placeholder

        else:
            raise ValueError(f"Unsupported transformation type: {transformation_type}")

    # ===== HELPER METHODS =====

    def _generate_execution_id(self) -> str:
        """Generate unique execution ID"""
        import uuid
        return str(uuid.uuid4())

    def _load_automation_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Load automation template from database"""
        try:
            template = Database.execute_one("""
                SELECT template_data FROM automation_templates 
                WHERE id = %s AND is_active = true
            """, (template_id,))

            if template:
                return json.loads(template['template_data'])
            return None
        except Exception as e:
            logger.error(f"Failed to load automation template {template_id}: {e}")
            return None

    def _load_script_from_db(self, script_id: str) -> Optional[str]:
        """Load script content from database"""
        try:
            script = Database.execute_one("""
                SELECT script_content FROM automation_scripts 
                WHERE id = %s AND is_active = true
            """, (script_id,))

            return script['script_content'] if script else None
        except Exception as e:
            logger.error(f"Failed to load script {script_id}: {e}")
            return None

    def _load_email_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Load email template from database"""
        try:
            template = Database.execute_one("""
                SELECT subject, body FROM email_templates 
                WHERE id = %s AND is_active = true
            """, (template_id,))

            return dict(template) if template else None
        except Exception as e:
            logger.error(f"Failed to load email template {template_id}: {e}")
            return None

    def _load_sms_template(self, template_id: str) -> Optional[Dict[str, Any]]:
        """Load SMS template from database"""
        try:
            template = Database.execute_one("""
                SELECT message FROM sms_templates 
                WHERE id = %s AND is_active = true
            """, (template_id,))

            return dict(template) if template else None
        except Exception as e:
            logger.error(f"Failed to load SMS template {template_id}: {e}")
            return None

    def _load_custom_function(self, function_name: str) -> Optional[callable]:
        """Load custom function from registry"""
        # This would load from a function registry
        # For now, return None - implement based on your needs
        return None

    def _send_email(self, recipient: str, subject: str, body: str, attachments: List[str] = None):
        """Send email using configured email service"""
        # Implement using your email service (SMTP, SendGrid, etc.)
        logger.info(f"Sending email to {recipient}: {subject}")
        # Placeholder implementation
        pass

    def _send_sms(self, phone_number: str, message: str):
        """Send SMS using configured SMS service"""
        # Implement using your SMS service (Twilio, AWS SNS, etc.)
        logger.info(f"Sending SMS to {phone_number}: {message}")
        # Placeholder implementation
        pass

    def _log_automation_start(self, execution_id: str, config: Dict[str, Any], context: Dict[str, Any]):
        """Log automation execution start"""
        try:
            Database.execute_insert("""
                INSERT INTO automation_executions 
                (execution_id, automation_type, config, context, status, started_at)
                VALUES (%s, %s, %s, %s, %s, NOW())
            """, (
                execution_id, config.get('type'), json.dumps(config),
                json.dumps(context), AutomationStatus.RUNNING.value
            ))
        except Exception as e:
            logger.error(f"Failed to log automation start: {e}")

    def _log_automation_completion(self, execution_id: str, result: Dict[str, Any]):
        """Log automation execution completion"""
        try:
            Database.execute_query("""
                UPDATE automation_executions 
                SET status = %s, result = %s, completed_at = NOW()
                WHERE execution_id = %s
            """, (AutomationStatus.COMPLETED.value, json.dumps(result), execution_id))
        except Exception as e:
            logger.error(f"Failed to log automation completion: {e}")

    def _log_automation_error(self, execution_id: str, error: str):
        """Log automation execution error"""
        try:
            Database.execute_query("""
                UPDATE automation_executions 
                SET status = %s, error_message = %s, completed_at = NOW()
                WHERE execution_id = %s
            """, (AutomationStatus.FAILED.value, error, execution_id))
        except Exception as e:
            logger.error(f"Failed to log automation error: {e}")




