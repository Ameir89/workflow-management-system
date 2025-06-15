# app/services/lookup_service.py
"""
Lookup service layer for business logic and reusable operations
"""
import json
from typing import Dict, List, Any, Optional, Tuple
from app.database import Database
from app.utils.security import validate_uuid
import logging

logger = logging.getLogger(__name__)


class LookupService:
    """Service class for lookup table operations"""

    @staticmethod
    def get_table_by_name(tenant_id: str, table_name: str) -> Optional[Dict[str, Any]]:
        """Get lookup table by name"""
        try:
            table = Database.execute_one("""
                SELECT id, name, display_name, value_field, display_field, 
                       additional_fields, settings, is_active
                FROM lookup_tables 
                WHERE tenant_id = %s AND name = %s AND is_active = true
            """, (tenant_id, table_name))

            if table:
                table_dict = dict(table)
                # Parse JSON fields
                if table_dict.get('additional_fields'):
                    try:
                        table_dict['additional_fields'] = json.loads(table_dict['additional_fields']) if isinstance(table_dict['additional_fields'], str) else table_dict['additional_fields']
                    except (json.JSONDecodeError, TypeError):
                        table_dict['additional_fields'] = []

                if table_dict.get('settings'):
                    try:
                        table_dict['settings'] = json.loads(table_dict['settings']) if isinstance(table_dict['settings'], str) else table_dict['settings']
                    except (json.JSONDecodeError, TypeError):
                        table_dict['settings'] = {}

                return table_dict

            return None

        except Exception as e:
            logger.error(f"Error getting table by name {table_name}: {e}")
            return None

    @staticmethod
    def get_lookup_value(tenant_id: str, table_name: str, value_key: str) -> Optional[Dict[str, Any]]:
        """Get a specific lookup value by key"""
        try:
            table = LookupService.get_table_by_name(tenant_id, table_name)
            if not table:
                return None

            record = Database.execute_one("""
                SELECT data
                FROM lookup_data ld
                JOIN lookup_tables lt ON ld.lookup_table_id = lt.id
                WHERE lt.tenant_id = %s AND lt.name = %s 
                AND ld.data->%s = %s AND ld.is_active = true
            """, (tenant_id, table_name, table['value_field'], json.dumps(value_key)))

            if record:
                return json.loads(record['data']) if isinstance(record['data'], str) else record['data']

            return None

        except Exception as e:
            logger.error(f"Error getting lookup value {value_key} from {table_name}: {e}")
            return None

    @staticmethod
    def get_display_value(tenant_id: str, table_name: str, value_key: str) -> Optional[str]:
        """Get display value for a lookup key"""
        try:
            record = LookupService.get_lookup_value(tenant_id, table_name, value_key)
            if record:
                table = LookupService.get_table_by_name(tenant_id, table_name)
                if table:
                    return record.get(table['display_field'])

            return None

        except Exception as e:
            logger.error(f"Error getting display value for {value_key} from {table_name}: {e}")
            return None

    @staticmethod
    def get_options_for_form(tenant_id: str, table_name: str,
                             include_fields: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Get formatted options for form controls"""
        try:
            table = LookupService.get_table_by_name(tenant_id, table_name)
            if not table:
                return []

            data = Database.execute_query("""
                SELECT data
                FROM lookup_data ld
                JOIN lookup_tables lt ON ld.lookup_table_id = lt.id
                WHERE lt.tenant_id = %s AND lt.name = %s AND ld.is_active = true
                ORDER BY ld.sort_order ASC, ld.created_at ASC
            """, (tenant_id, table_name))

            options = []
            for record in data:
                record_data = json.loads(record['data']) if isinstance(record['data'], str) else record['data']

                option = {
                    'value': record_data.get(table['value_field']),
                    'label': record_data.get(table['display_field'])
                }

                # Include additional fields if specified
                if include_fields:
                    for field in include_fields:
                        if field in record_data:
                            option[field] = record_data[field]

                options.append(option)

            return options

        except Exception as e:
            logger.error(f"Error getting form options for {table_name}: {e}")
            return []

    @staticmethod
    def validate_lookup_value(tenant_id: str, table_name: str, value: str) -> bool:
        """Validate if a value exists in a lookup table"""
        try:
            record = LookupService.get_lookup_value(tenant_id, table_name, value)
            return record is not None

        except Exception as e:
            logger.error(f"Error validating lookup value {value} in {table_name}: {e}")
            return False

    @staticmethod
    def bulk_validate_values(tenant_id: str, table_name: str, values: List[str]) -> Dict[str, bool]:
        """Validate multiple lookup values at once"""
        try:
            table = LookupService.get_table_by_name(tenant_id, table_name)
            if not table:
                return {value: False for value in values}

            # Get all matching records
            value_params = [json.dumps(value) for value in values]
            placeholders = ','.join(['%s'] * len(values))

            query = f"""
                SELECT data->%s as value
                FROM lookup_data ld
                JOIN lookup_tables lt ON ld.lookup_table_id = lt.id
                WHERE lt.tenant_id = %s AND lt.name = %s 
                AND ld.data->%s IN ({placeholders}) AND ld.is_active = true
            """

            results = Database.execute_query(
                query,
                [table['value_field'], tenant_id, table_name, table['value_field']] + value_params
            )

            valid_values = {json.loads(r['value']) if isinstance(r['value'], str) else r['value'] for r in results}

            return {value: value in valid_values for value in values}

        except Exception as e:
            logger.error(f"Error bulk validating values in {table_name}: {e}")
            return {value: False for value in values}

    @staticmethod
    def search_lookup_data(tenant_id: str, table_name: str, search_term: str,
                           limit: int = 50) -> List[Dict[str, Any]]:
        """Search lookup data with ranking"""
        try:
            table = LookupService.get_table_by_name(tenant_id, table_name)
            if not table:
                return []

            # Search with relevance ranking
            data = Database.execute_query("""
                SELECT data,
                       CASE 
                           WHEN data->>%s ILIKE %s THEN 1
                           WHEN data->>%s ILIKE %s THEN 2
                           WHEN data::text ILIKE %s THEN 3
                           ELSE 4
                       END as relevance
                FROM lookup_data ld
                JOIN lookup_tables lt ON ld.lookup_table_id = lt.id
                WHERE lt.tenant_id = %s AND lt.name = %s 
                AND ld.is_active = true
                AND data::text ILIKE %s
                ORDER BY relevance ASC, ld.sort_order ASC
                LIMIT %s
            """, (
                table['display_field'], f"{search_term}%",
                table['display_field'], f"%{search_term}%",
                f"%{search_term}%",
                tenant_id, table_name,
                f"%{search_term}%",
                limit
            ))

            results = []
            for record in data:
                record_data = json.loads(record['data']) if isinstance(record['data'], str) else record['data']
                results.append(record_data)

            return results

        except Exception as e:
            logger.error(f"Error searching lookup data in {table_name}: {e}")
            return []

    @staticmethod
    def get_hierarchical_options(tenant_id: str, table_name: str,
                                 parent_field: str = 'parent_id') -> List[Dict[str, Any]]:
        """Get hierarchical lookup options (for tree-like structures)"""
        try:
            table = LookupService.get_table_by_name(tenant_id, table_name)
            if not table:
                return []

            # Get all data first
            data = Database.execute_query("""
                SELECT data
                FROM lookup_data ld
                JOIN lookup_tables lt ON ld.lookup_table_id = lt.id
                WHERE lt.tenant_id = %s AND lt.name = %s AND ld.is_active = true
                ORDER BY ld.sort_order ASC, ld.created_at ASC
            """, (tenant_id, table_name))

            # Convert to hierarchical structure
            all_items = {}
            root_items = []

            for record in data:
                record_data = json.loads(record['data']) if isinstance(record['data'], str) else record['data']
                item_id = record_data.get(table['value_field'])
                parent_id = record_data.get(parent_field)

                item = {
                    'value': item_id,
                    'label': record_data.get(table['display_field']),
                    'parent_id': parent_id,
                    'children': [],
                    'data': record_data
                }

                all_items[item_id] = item

                if not parent_id:
                    root_items.append(item)

            # Build hierarchy
            for item in all_items.values():
                parent_id = item['parent_id']
                if parent_id and parent_id in all_items:
                    all_items[parent_id]['children'].append(item)

            return root_items

        except Exception as e:
            logger.error(f"Error getting hierarchical options for {table_name}: {e}")
            return []

    @staticmethod
    def get_filtered_options(tenant_id: str, table_name: str,
                             filters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get lookup options with custom filters"""
        try:
            table = LookupService.get_table_by_name(tenant_id, table_name)
            if not table:
                return []

            # Build dynamic filter conditions
            where_conditions = ["lt.tenant_id = %s", "lt.name = %s", "ld.is_active = true"]
            params = [tenant_id, table_name]

            for field, value in filters.items():
                if isinstance(value, list):
                    # Handle IN conditions
                    placeholders = ','.join(['%s'] * len(value))
                    where_conditions.append(f"ld.data->>%s IN ({placeholders})")
                    params.append(field)
                    params.extend(value)
                else:
                    # Handle equality conditions
                    where_conditions.append("ld.data->>%s = %s")
                    params.extend([field, value])

            where_clause = "WHERE " + " AND ".join(where_conditions)

            data = Database.execute_query(f"""
                SELECT data
                FROM lookup_data ld
                JOIN lookup_tables lt ON ld.lookup_table_id = lt.id
                {where_clause}
                ORDER BY ld.sort_order ASC, ld.created_at ASC
            """, params)

            options = []
            for record in data:
                record_data = json.loads(record['data']) if isinstance(record['data'], str) else record['data']

                option = {
                    'value': record_data.get(table['value_field']),
                    'label': record_data.get(table['display_field']),
                    'data': record_data
                }

                options.append(option)

            return options

        except Exception as e:
            logger.error(f"Error getting filtered options for {table_name}: {e}")
            return []

    @staticmethod
    def create_lookup_record(tenant_id: str, table_name: str, data: Dict[str, Any],
                             created_by: str) -> Optional[str]:
        """Create a new lookup record"""
        try:
            table = LookupService.get_table_by_name(tenant_id, table_name)
            if not table:
                raise ValueError(f"Lookup table {table_name} not found")

            # Validate required fields
            if table['value_field'] not in data:
                raise ValueError(f"Missing required field: {table['value_field']}")

            if table['display_field'] not in data:
                raise ValueError(f"Missing required field: {table['display_field']}")

            # Check for duplicates
            existing = Database.execute_one("""
                SELECT id FROM lookup_data ld
                JOIN lookup_tables lt ON ld.lookup_table_id = lt.id
                WHERE lt.tenant_id = %s AND lt.name = %s 
                AND ld.data->%s = %s
            """, (tenant_id, table_name, table['value_field'], json.dumps(data[table['value_field']])))

            if existing:
                raise ValueError(f"Record with {table['value_field']} = {data[table['value_field']]} already exists")

            # Insert record
            record_id = Database.execute_insert("""
                INSERT INTO lookup_data 
                (lookup_table_id, data, created_by)
                VALUES (%s, %s, %s)
            """, (table['id'], json.dumps(data), created_by))

            return record_id

        except Exception as e:
            logger.error(f"Error creating lookup record in {table_name}: {e}")
            raise

    @staticmethod
    def update_lookup_record(tenant_id: str, table_name: str, record_id: str,
                             data: Dict[str, Any]) -> bool:
        """Update a lookup record"""
        try:
            table = LookupService.get_table_by_name(tenant_id, table_name)
            if not table:
                raise ValueError(f"Lookup table {table_name} not found")

            # Validate required fields
            if table['value_field'] not in data:
                raise ValueError(f"Missing required field: {table['value_field']}")

            if table['display_field'] not in data:
                raise ValueError(f"Missing required field: {table['display_field']}")

            # Update record
            Database.execute_query("""
                UPDATE lookup_data 
                SET data = %s, updated_at = NOW()
                WHERE id = %s AND lookup_table_id = %s
            """, (json.dumps(data), record_id, table['id']))

            return True

        except Exception as e:
            logger.error(f"Error updating lookup record {record_id}: {e}")
            raise

    @staticmethod
    def get_lookup_statistics(tenant_id: str) -> Dict[str, Any]:
        """Get overall lookup statistics for tenant"""
        try:
            stats = Database.execute_one("""
                SELECT 
                    COUNT(DISTINCT lt.id) as total_tables,
                    COUNT(DISTINCT CASE WHEN lt.is_system = true THEN lt.id END) as system_tables,
                    COUNT(DISTINCT CASE WHEN lt.is_system = false THEN lt.id END) as custom_tables,
                    COUNT(ld.id) as total_records,
                    COUNT(CASE WHEN ld.is_active = true THEN ld.id END) as active_records
                FROM lookup_tables lt
                LEFT JOIN lookup_data ld ON lt.id = ld.lookup_table_id
                WHERE lt.tenant_id = %s AND lt.is_active = true
            """, (tenant_id,))

            return dict(stats) if stats else {}

        except Exception as e:
            logger.error(f"Error getting lookup statistics: {e}")
            return {}

    @staticmethod
    def resolve_lookup_values(tenant_id: str, data: Dict[str, Any],
                              lookup_mappings: Dict[str, str]) -> Dict[str, Any]:
        """Resolve lookup values to display values in bulk"""
        try:
            resolved_data = data.copy()

            for field_name, table_name in lookup_mappings.items():
                if field_name in data and data[field_name]:
                    display_value = LookupService.get_display_value(
                        tenant_id, table_name, data[field_name]
                    )
                    if display_value:
                        resolved_data[f"{field_name}_display"] = display_value

            return resolved_data

        except Exception as e:
            logger.error(f"Error resolving lookup values: {e}")
            return data

    @staticmethod
    def get_dependent_options(tenant_id: str, table_name: str, parent_field: str,
                              parent_value: str) -> List[Dict[str, Any]]:
        """Get lookup options that depend on another field value"""
        try:
            filters = {parent_field: parent_value}
            return LookupService.get_filtered_options(tenant_id, table_name, filters)

        except Exception as e:
            logger.error(f"Error getting dependent options: {e}")
            return []

    @staticmethod
    def validate_lookup_dependencies(tenant_id: str, validations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate multiple lookup dependencies"""
        try:
            results = {
                'valid': True,
                'errors': [],
                'warnings': []
            }

            for validation in validations:
                table_name = validation.get('table')
                value = validation.get('value')
                field_name = validation.get('field', 'value')
                required = validation.get('required', False)

                if not value:
                    if required:
                        results['errors'].append(f"{field_name} is required")
                        results['valid'] = False
                    continue

                if not LookupService.validate_lookup_value(tenant_id, table_name, value):
                    results['errors'].append(f"Invalid {field_name}: {value}")
                    results['valid'] = False

            return results

        except Exception as e:
            logger.error(f"Error validating lookup dependencies: {e}")
            return {'valid': False, 'errors': ['Validation error'], 'warnings': []}

    @staticmethod
    def export_lookup_table(tenant_id: str, table_name: str, format_type: str = 'json') -> Any:
        """Export lookup table data in various formats"""
        try:
            table = LookupService.get_table_by_name(tenant_id, table_name)
            if not table:
                raise ValueError(f"Lookup table {table_name} not found")

            data = Database.execute_query("""
                SELECT data, sort_order, is_active, created_at
                FROM lookup_data ld
                JOIN lookup_tables lt ON ld.lookup_table_id = lt.id
                WHERE lt.tenant_id = %s AND lt.name = %s
                ORDER BY ld.sort_order ASC, ld.created_at ASC
            """, (tenant_id, table_name))

            export_data = []
            for record in data:
                record_data = json.loads(record['data']) if isinstance(record['data'], str) else record['data']
                export_record = {
                    **record_data,
                    '_sort_order': record['sort_order'],
                    '_is_active': record['is_active'],
                    '_created_at': record['created_at'].isoformat() if record['created_at'] else None
                }
                export_data.append(export_record)

            if format_type == 'csv':
                import csv
                import io

                if not export_data:
                    return ""

                output = io.StringIO()
                fieldnames = list(export_data[0].keys())
                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()

                for record in export_data:
                    writer.writerow(record)

                return output.getvalue()

            elif format_type == 'json':
                return {
                    'table_info': table,
                    'data': export_data,
                    'exported_at': Database.execute_one("SELECT NOW() as timestamp")['timestamp'].isoformat()
                }

            else:
                raise ValueError(f"Unsupported export format: {format_type}")

        except Exception as e:
            logger.error(f"Error exporting lookup table {table_name}: {e}")
            raise

    @staticmethod
    def import_lookup_data(tenant_id: str, table_name: str, import_data: List[Dict[str, Any]],
                           created_by: str, update_existing: bool = False) -> Dict[str, Any]:
        """Import lookup data with validation and conflict resolution"""
        try:
            table = LookupService.get_table_by_name(tenant_id, table_name)
            if not table:
                raise ValueError(f"Lookup table {table_name} not found")

            results = {
                'imported': 0,
                'updated': 0,
                'skipped': 0,
                'errors': []
            }

            for index, record_data in enumerate(import_data):
                try:
                    # Validate required fields
                    if table['value_field'] not in record_data:
                        results['errors'].append(f"Row {index + 1}: Missing {table['value_field']}")
                        results['skipped'] += 1
                        continue

                    if table['display_field'] not in record_data:
                        results['errors'].append(f"Row {index + 1}: Missing {table['display_field']}")
                        results['skipped'] += 1
                        continue

                    value = record_data[table['value_field']]

                    # Check if record exists
                    existing = Database.execute_one("""
                        SELECT ld.id
                        FROM lookup_data ld
                        JOIN lookup_tables lt ON ld.lookup_table_id = lt.id
                        WHERE lt.tenant_id = %s AND lt.name = %s 
                        AND ld.data->%s = %s
                    """, (tenant_id, table_name, table['value_field'], json.dumps(value)))

                    if existing:
                        if update_existing:
                            # Update existing record
                            Database.execute_query("""
                                UPDATE lookup_data 
                                SET data = %s, updated_at = NOW()
                                WHERE id = %s
                            """, (json.dumps(record_data), existing['id']))
                            results['updated'] += 1
                        else:
                            results['errors'].append(f"Row {index + 1}: Duplicate value {value}")
                            results['skipped'] += 1
                    else:
                        # Create new record
                        Database.execute_insert("""
                            INSERT INTO lookup_data 
                            (lookup_table_id, data, sort_order, created_by)
                            VALUES (%s, %s, %s, %s)
                        """, (table['id'], json.dumps(record_data), index, created_by))
                        results['imported'] += 1

                except Exception as record_error:
                    results['errors'].append(f"Row {index + 1}: {str(record_error)}")
                    results['skipped'] += 1

            return results

        except Exception as e:
            logger.error(f"Error importing lookup data: {e}")
            raise