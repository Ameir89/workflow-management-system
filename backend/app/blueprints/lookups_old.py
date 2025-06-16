# app/blueprints/lookups.py
"""
Lookup Tables blueprint - handles lookup table management
"""
from flask import Blueprint, request, jsonify, g
from app.middleware import require_auth, require_permissions, audit_log
from app.database import Database
from app.utils.security import sanitize_input, validate_uuid
from app.utils.validators import validate_required_fields, validate_pagination_params
import json
import logging

logger = logging.getLogger(__name__)

lookups_bp = Blueprint('lookups', __name__)


@lookups_bp.route('/tables', methods=['GET'])
@require_auth
def get_lookup_tables():
    """Get all lookup tables for the current tenant"""
    try:
        tenant_id = g.current_user['tenant_id']
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        offset = (page - 1) * limit
        search = request.args.get('search', '')
        include_system = request.args.get('include_system', 'true').lower() == 'true'

        # Build query conditions
        where_conditions = ["lt.tenant_id = %s"]
        params = [tenant_id]

        if not include_system:
            where_conditions.append("lt.is_system = false")

        if search:
            where_conditions.append("""
                (lt.name ILIKE %s OR lt.display_name ILIKE %s OR lt.description ILIKE %s)
            """)
            search_pattern = f"%{search}%"
            params.extend([search_pattern] * 3)

        where_clause = "WHERE " + " AND ".join(where_conditions)

        tables = Database.execute_query(f"""
            SELECT lt.id, lt.name, lt.display_name, lt.description,
                   lt.value_field, lt.display_field, lt.additional_fields,
                   lt.settings, lt.is_active, lt.is_system,
                   lt.created_at, lt.updated_at,
                   u.first_name || ' ' || u.last_name as created_by_name,
                   COUNT(ld.id) as record_count
            FROM lookup_tables lt
            LEFT JOIN users u ON lt.created_by = u.id
            LEFT JOIN lookup_data ld ON lt.id = ld.lookup_table_id AND ld.is_active = true
            {where_clause}
            GROUP BY lt.id, u.first_name, u.last_name
            ORDER BY lt.is_system DESC, lt.display_name ASC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])

        # Parse JSON fields
        for table in tables:
            if table.get('additional_fields'):
                try:
                    table['additional_fields'] = json.loads(table['additional_fields']) if isinstance(table['additional_fields'], str) else table['additional_fields']
                except (json.JSONDecodeError, TypeError):
                    table['additional_fields'] = []

            if table.get('settings'):
                try:
                    table['settings'] = json.loads(table['settings']) if isinstance(table['settings'], str) else table['settings']
                except (json.JSONDecodeError, TypeError):
                    table['settings'] = {}

        # Get total count
        total = Database.execute_one(f"""
            SELECT COUNT(*) as count 
            FROM lookup_tables lt
            {where_clause}
        """, params)

        return jsonify({
            'tables': [dict(t) for t in tables],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total['count'],
                'pages': (total['count'] + limit - 1) // limit
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting lookup tables: {e}")
        return jsonify({'error': 'Failed to retrieve lookup tables'}), 500


@lookups_bp.route('/tables/<table_id>', methods=['GET'])
@require_auth
def get_lookup_table(table_id):
    """Get specific lookup table with its structure"""
    try:
        if not validate_uuid(table_id):
            return jsonify({'error': 'Invalid table ID'}), 400

        tenant_id = g.current_user['tenant_id']

        table = Database.execute_one("""
            SELECT lt.*, u.first_name || ' ' || u.last_name as created_by_name,
                   COUNT(ld.id) as record_count
            FROM lookup_tables lt
            LEFT JOIN users u ON lt.created_by = u.id
            LEFT JOIN lookup_data ld ON lt.id = ld.lookup_table_id AND ld.is_active = true
            WHERE lt.id = %s AND lt.tenant_id = %s
            GROUP BY lt.id, u.first_name, u.last_name
        """, (table_id, tenant_id))

        if not table:
            return jsonify({'error': 'Lookup table not found'}), 404

        # Parse CSV file
        import csv
        import io

        stream = io.StringIO(file.stream.read().decode("UTF8"), newline=None)
        csv_input = csv.DictReader(stream)

        imported_count = 0
        errors = []

        try:
            # Parse additional fields
            additional_fields = []
            if table.get('additional_fields'):
                additional_fields = json.loads(table['additional_fields']) if isinstance(table['additional_fields'], str) else table['additional_fields']
        except (json.JSONDecodeError, TypeError):
            additional_fields = []

        for row_num, row in enumerate(csv_input, start=2):  # Start at 2 because row 1 is header
            try:
                # Validate required fields
                if table['value_field'] not in row or not row[table['value_field']]:
                    errors.append(f"Row {row_num}: Missing {table['value_field']}")
                    continue

                if table['display_field'] not in row or not row[table['display_field']]:
                    errors.append(f"Row {row_num}: Missing {table['display_field']}")
                    continue

                # Build record data
                record_data = {
                    table['value_field']: row[table['value_field']],
                    table['display_field']: row[table['display_field']]
                }

                # Add additional fields if present
                for field in additional_fields:
                    if field in row and row[field]:
                        record_data[field] = row[field]

                # Check for duplicates
                existing = Database.execute_one("""
                    SELECT id FROM lookup_data 
                    WHERE lookup_table_id = %s AND data->%s = %s
                """, (table_id, table['value_field'], json.dumps(record_data[table['value_field']])))

                if existing:
                    errors.append(f"Row {row_num}: Duplicate value {record_data[table['value_field']]}")
                    continue

                # Insert record
                Database.execute_insert("""
                    INSERT INTO lookup_data 
                    (lookup_table_id, data, sort_order, created_by)
                    VALUES (%s, %s, %s, %s)
                """, (table_id, json.dumps(record_data), imported_count + 1, user_id))

                imported_count += 1

            except Exception as row_error:
                errors.append(f"Row {row_num}: {str(row_error)}")

        return jsonify({
            'message': f'Import completed. {imported_count} records imported.',
            'imported_count': imported_count,
            'errors': errors[:10]  # Limit errors to first 10
        }), 200

    except Exception as e:
        logger.error(f"Error importing data: {e}")
        return jsonify({'error': 'Failed to import data'}), 500


@lookups_bp.route('/tables/<table_id>/export', methods=['GET'])
@require_auth
def export_table_data(table_id):
    """Export lookup table data as CSV"""
    try:
        if not validate_uuid(table_id):
            return jsonify({'error': 'Invalid table ID'}), 400

        tenant_id = g.current_user['tenant_id']
        format_type = request.args.get('format', 'csv').lower()

        # Verify table exists
        table = Database.execute_one("""
            SELECT id, name, display_name, value_field, display_field, additional_fields
            FROM lookup_tables 
            WHERE id = %s AND tenant_id = %s
        """, (table_id, tenant_id))

        if not table:
            return jsonify({'error': 'Lookup table not found'}), 404

        # Get all data
        data = Database.execute_query("""
            SELECT data, sort_order, is_active
            FROM lookup_data 
            WHERE lookup_table_id = %s AND is_active = true
            ORDER BY sort_order ASC, created_at ASC
        """, (table_id,))

        if format_type == 'csv':
            import csv
            import io
            from flask import Response

            output = io.StringIO()

            if data:
                # Parse first record to get field names
                first_record = json.loads(data[0]['data']) if isinstance(data[0]['data'], str) else data[0]['data']
                fieldnames = list(first_record.keys())

                writer = csv.DictWriter(output, fieldnames=fieldnames)
                writer.writeheader()

                for record in data:
                    record_data = json.loads(record['data']) if isinstance(record['data'], str) else record['data']
                    writer.writerow(record_data)

            output.seek(0)

            return Response(
                output.getvalue(),
                mimetype='text/csv',
                headers={'Content-Disposition': f'attachment; filename={table["name"]}.csv'}
            )

        else:
            # JSON export
            export_data = []
            for record in data:
                record_data = json.loads(record['data']) if isinstance(record['data'], str) else record['data']
                export_data.append(record_data)

            return jsonify({
                'table_info': dict(table),
                'data': export_data
            }), 200

    except Exception as e:
        logger.error(f"Error exporting data: {e}")
        return jsonify({'error': 'Failed to export data'}), 500


# Form Integration Endpoints
@lookups_bp.route('/tables/<table_id>/options', methods=['GET'])
@require_auth
def get_lookup_options(table_id):
    """Get lookup options formatted for form controls"""
    try:
        if not validate_uuid(table_id):
            return jsonify({'error': 'Invalid table ID'}), 400

        tenant_id = g.current_user['tenant_id']

        # Optional parameters
        value_field = request.args.get('valueField')
        display_field = request.args.get('displayField')
        additional_fields = request.args.getlist('additionalFields')
        active_only = request.args.get('active_only', 'true').lower() == 'true'

        # Verify table exists
        table = Database.execute_one("""
            SELECT id, value_field, display_field, additional_fields
            FROM lookup_tables 
            WHERE id = %s AND tenant_id = %s AND is_active = true
        """, (table_id, tenant_id))

        if not table:
            return jsonify({'error': 'Lookup table not found'}), 404

        # Use provided field names or defaults from table
        value_field = value_field or table['value_field']
        display_field = display_field or table['display_field']

        # Build query conditions
        where_conditions = ["lookup_table_id = %s"]
        params = [table_id]

        if active_only:
            where_conditions.append("is_active = true")

        where_clause = "WHERE " + " AND ".join(where_conditions)

        # Get data
        data = Database.execute_query(f"""
            SELECT data
            FROM lookup_data 
            {where_clause}
            ORDER BY sort_order ASC, created_at ASC
        """, params)

        options = []
        for record in data:
            record_data = json.loads(record['data']) if isinstance(record['data'], str) else record['data']

            option = {
                'value': record_data.get(value_field),
                'label': record_data.get(display_field)
            }

            # Add additional fields if requested
            for field in additional_fields:
                if field in record_data:
                    option[field] = record_data[field]

            options.append(option)

        return jsonify({
            'data': options,
            'meta': {
                'table_name': table.get('name'),
                'value_field': value_field,
                'display_field': display_field,
                'total_count': len(options)
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting lookup options: {e}")
        return jsonify({'error': 'Failed to retrieve lookup options'}), 500


@lookups_bp.route('/tables/<table_id>/search', methods=['GET'])
@require_auth
def search_lookup_options(table_id):
    """Search lookup options with typeahead support"""
    try:
        if not validate_uuid(table_id):
            return jsonify({'error': 'Invalid table ID'}), 400

        tenant_id = g.current_user['tenant_id']
        search_term = request.args.get('q', '')
        limit = min(int(request.args.get('limit', 50)), 100)

        # Optional parameters
        value_field = request.args.get('valueField')
        display_field = request.args.get('displayField')
        additional_fields = request.args.getlist('additionalFields')

        # Verify table exists
        table = Database.execute_one("""
            SELECT id, value_field, display_field, additional_fields
            FROM lookup_tables 
            WHERE id = %s AND tenant_id = %s AND is_active = true
        """, (table_id, tenant_id))

        if not table:
            return jsonify({'error': 'Lookup table not found'}), 404

        # Use provided field names or defaults from table
        value_field = value_field or table['value_field']
        display_field = display_field or table['display_field']

        # Build search query
        where_conditions = ["lookup_table_id = %s", "is_active = true"]
        params = [table_id]

        if search_term:
            # Search in the data JSONB field
            where_conditions.append("data::text ILIKE %s")
            params.append(f"%{search_term}%")

        where_clause = "WHERE " + " AND ".join(where_conditions)

        # Get matching data
        data = Database.execute_query(f"""
            SELECT data
            FROM lookup_data 
            {where_clause}
            ORDER BY 
                CASE 
                    WHEN data->>%s ILIKE %s THEN 1
                    WHEN data->>%s ILIKE %s THEN 2
                    ELSE 3
                END,
                sort_order ASC
            LIMIT %s
        """, params + [display_field, f"{search_term}%", display_field, f"%{search_term}%", limit])

        options = []
        for record in data:
            record_data = json.loads(record['data']) if isinstance(record['data'], str) else record['data']

            option = {
                'value': record_data.get(value_field),
                'label': record_data.get(display_field)
            }

            # Add additional fields if requested
            for field in additional_fields:
                if field in record_data:
                    option[field] = record_data[field]

            options.append(option)

        return jsonify({
            'data': options,
            'meta': {
                'search_term': search_term,
                'table_name': table.get('name'),
                'results_count': len(options),
                'limit': limit
            }
        }), 200

    except Exception as e:
        logger.error(f"Error searching lookup options: {e}")
        return jsonify({'error': 'Failed to search lookup options'}), 500


# Statistics and Analytics
@lookups_bp.route('/tables/<table_id>/stats', methods=['GET'])
@require_auth
def get_table_stats(table_id):
    """Get statistics for a lookup table"""
    try:
        if not validate_uuid(table_id):
            return jsonify({'error': 'Invalid table ID'}), 400

        tenant_id = g.current_user['tenant_id']

        # Verify table exists
        table = Database.execute_one("""
            SELECT id, name, display_name
            FROM lookup_tables 
            WHERE id = %s AND tenant_id = %s
        """, (table_id, tenant_id))

        if not table:
            return jsonify({'error': 'Lookup table not found'}), 404

        # Get basic statistics
        stats = Database.execute_one("""
            SELECT 
                COUNT(*) as total_records,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_records,
                COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_records,
                MIN(created_at) as first_record_date,
                MAX(created_at) as last_record_date
            FROM lookup_data 
            WHERE lookup_table_id = %s
        """, (table_id,))

        # Get usage statistics (if usage tracking is enabled)
        usage_stats = Database.execute_one("""
            SELECT 
                COUNT(*) as total_usage,
                COUNT(DISTINCT used_by_table) as tables_using,
                MAX(used_at) as last_used
            FROM lookup_usage_log 
            WHERE lookup_table_id = %s
        """, (table_id,))

        return jsonify({
            'table': dict(table),
            'statistics': dict(stats) if stats else {},
            'usage': dict(usage_stats) if usage_stats else {}
        }), 200

    except Exception as e:
        logger.error(f"Error getting table stats: {e}")
        return jsonify({'error': 'Failed to retrieve table statistics'}), 500


# Utility function to log lookup usage
def log_lookup_usage(table_id, record_id, used_by_table, used_by_id):
    """Log lookup table usage for analytics"""
    try:
        Database.execute_insert("""
            INSERT INTO lookup_usage_log 
            (lookup_table_id, lookup_data_id, used_by_table, used_by_id)
            VALUES (%s, %s, %s, %s)
        """, (table_id, record_id, used_by_table, used_by_id))
    except Exception as e:
        logger.error(f"Error logging lookup usage: {e}")
        # Don't fail the main operation if usage logging fails not found'}), 404

        # Parse JSON fields
        table_dict = dict(table)
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

        return jsonify({'table': table_dict}), 200

    except Exception as e:
        logger.error(f"Error getting lookup table {table_id}: {e}")
        return jsonify({'error': 'Failed to retrieve lookup table'}), 500


@lookups_bp.route('/tables', methods=['POST'])
@require_auth
@require_permissions(['manage_lookups'])
@audit_log('create', 'lookup_table')
def create_lookup_table():
    """Create new lookup table"""
    try:
        data = sanitize_input(request.get_json())

        required_fields = ['name', 'display_name', 'value_field', 'display_field']
        if not validate_required_fields(data, required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']

        # Check if table already exists
        existing = Database.execute_one("""
            SELECT id FROM lookup_tables 
            WHERE name = %s AND tenant_id = %s
        """, (data['name'], tenant_id))

        if existing:
            return jsonify({'error': 'Lookup table with this name already exists'}), 409

        # Validate additional_fields format
        additional_fields = data.get('additional_fields', [])
        if not isinstance(additional_fields, list):
            return jsonify({'error': 'additional_fields must be an array'}), 400

        table_id = Database.execute_insert("""
            INSERT INTO lookup_tables 
            (tenant_id, name, display_name, description, value_field, 
             display_field, additional_fields, settings, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            tenant_id, data['name'], data['display_name'],
            data.get('description', ''), data['value_field'],
            data['display_field'], json.dumps(additional_fields),
            json.dumps(data.get('settings', {})), user_id
        ))

        return jsonify({
            'message': 'Lookup table created successfully',
            'table_id': table_id
        }), 201

    except Exception as e:
        logger.error(f"Error creating lookup table: {e}")
        return jsonify({'error': 'Failed to create lookup table'}), 500


@lookups_bp.route('/tables/<table_id>', methods=['PUT'])
@require_auth
@require_permissions(['manage_lookups'])
@audit_log('update', 'lookup_table')
def update_lookup_table(table_id):
    """Update lookup table"""
    try:
        if not validate_uuid(table_id):
            return jsonify({'error': 'Invalid table ID'}), 400

        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']

        # Check if table exists and is not system table
        existing = Database.execute_one("""
            SELECT id, is_system FROM lookup_tables 
            WHERE id = %s AND tenant_id = %s
        """, (table_id, tenant_id))

        if not existing:
            return jsonify({'error': 'Lookup table not found'}), 404

        if existing['is_system']:
            return jsonify({'error': 'Cannot modify system lookup tables'}), 403

        # Update table
        update_fields = []
        params = []

        allowed_fields = ['display_name', 'description', 'value_field',
                          'display_field', 'additional_fields', 'settings', 'is_active']

        for field in allowed_fields:
            if field in data:
                if field in ['additional_fields', 'settings']:
                    update_fields.append(f'{field} = %s')
                    params.append(json.dumps(data[field]))
                else:
                    update_fields.append(f'{field} = %s')
                    params.append(data[field])

        if update_fields:
            update_fields.append('updated_at = NOW()')
            params.append(table_id)

            query = f"""
                UPDATE lookup_tables 
                SET {', '.join(update_fields)}
                WHERE id = %s
            """
            Database.execute_query(query, params)

        return jsonify({'message': 'Lookup table updated successfully'}), 200

    except Exception as e:
        logger.error(f"Error updating lookup table {table_id}: {e}")
        return jsonify({'error': 'Failed to update lookup table'}), 500


@lookups_bp.route('/tables/<table_id>', methods=['DELETE'])
@require_auth
@require_permissions(['manage_lookups'])
@audit_log('delete', 'lookup_table')
def delete_lookup_table(table_id):
    """Delete lookup table (soft delete for system tables)"""
    try:
        if not validate_uuid(table_id):
            return jsonify({'error': 'Invalid table ID'}), 400

        tenant_id = g.current_user['tenant_id']

        # Check if table exists
        table = Database.execute_one("""
            SELECT id, is_system, name FROM lookup_tables 
            WHERE id = %s AND tenant_id = %s
        """, (table_id, tenant_id))

        if not table:
            return jsonify({'error': 'Lookup table not found'}), 404

        if table['is_system']:
            # Soft delete system tables
            Database.execute_query("""
                UPDATE lookup_tables 
                SET is_active = false, updated_at = NOW()
                WHERE id = %s
            """, (table_id,))
        else:
            # Hard delete custom tables
            Database.execute_query("""
                DELETE FROM lookup_data WHERE lookup_table_id = %s
            """, (table_id,))

            Database.execute_query("""
                DELETE FROM lookup_tables WHERE id = %s
            """, (table_id,))

        return jsonify({'message': 'Lookup table deleted successfully'}), 200

    except Exception as e:
        logger.error(f"Error deleting lookup table {table_id}: {e}")
        return jsonify({'error': 'Failed to delete lookup table'}), 500


# Lookup Data Management
@lookups_bp.route('/tables/<table_id>/data', methods=['GET'])
@require_auth
def get_lookup_data(table_id):
    """Get data for a lookup table"""
    try:
        if not validate_uuid(table_id):
            return jsonify({'error': 'Invalid table ID'}), 400

        tenant_id = g.current_user['tenant_id']
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 100)), 1000)
        offset = (page - 1) * limit
        search = request.args.get('search', '')
        active_only = request.args.get('active_only', 'true').lower() == 'true'

        # Verify table exists and user has access
        table = Database.execute_one("""
            SELECT id, display_name, value_field, display_field, additional_fields
            FROM lookup_tables 
            WHERE id = %s AND tenant_id = %s
        """, (table_id, tenant_id))

        if not table:
            return jsonify({'error': 'Lookup table not found'}), 404

        # Build query conditions
        where_conditions = ["ld.lookup_table_id = %s"]
        params = [table_id]

        if active_only:
            where_conditions.append("ld.is_active = true")

        if search:
            # Search in the data JSONB field
            where_conditions.append("ld.data::text ILIKE %s")
            params.append(f"%{search}%")

        where_clause = "WHERE " + " AND ".join(where_conditions)

        data = Database.execute_query(f"""
            SELECT ld.id, ld.data, ld.sort_order, ld.is_active,
                   ld.created_at, ld.updated_at,
                   u.first_name || ' ' || u.last_name as created_by_name
            FROM lookup_data ld
            LEFT JOIN users u ON ld.created_by = u.id
            {where_clause}
            ORDER BY ld.sort_order ASC, ld.created_at ASC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])

        # Parse JSON data
        for record in data:
            if record.get('data'):
                try:
                    record['data'] = json.loads(record['data']) if isinstance(record['data'], str) else record['data']
                except (json.JSONDecodeError, TypeError):
                    record['data'] = {}

        # Get total count
        total = Database.execute_one(f"""
            SELECT COUNT(*) as count 
            FROM lookup_data ld
            {where_clause}
        """, params)

        return jsonify({
            'table': dict(table),
            'data': [dict(d) for d in data],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total['count'],
                'pages': (total['count'] + limit - 1) // limit
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting lookup data: {e}")
        return jsonify({'error': 'Failed to retrieve lookup data'}), 500


@lookups_bp.route('/tables/<table_id>/data', methods=['POST'])
@require_auth
@require_permissions(['manage_lookups'])
@audit_log('create', 'lookup_data')
def create_lookup_record(table_id):
    """Create new lookup record"""
    try:
        if not validate_uuid(table_id):
            return jsonify({'error': 'Invalid table ID'}), 400

        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']

        # Verify table exists
        table = Database.execute_one("""
            SELECT id, value_field, display_field, additional_fields, is_system
            FROM lookup_tables 
            WHERE id = %s AND tenant_id = %s
        """, (table_id, tenant_id))

        if not table:
            return jsonify({'error': 'Lookup table not found'}), 404

        # Validate required fields
        if not validate_required_fields(data, ['data']):
            return jsonify({'error': 'Missing required fields'}), 400

        record_data = data['data']

        # Validate value and display fields exist
        if table['value_field'] not in record_data:
            return jsonify({'error': f'Missing required field: {table["value_field"]}'}), 400

        if table['display_field'] not in record_data:
            return jsonify({'error': f'Missing required field: {table["display_field"]}'}), 400

        # Check for duplicate values
        existing = Database.execute_one("""
            SELECT id FROM lookup_data 
            WHERE lookup_table_id = %s AND data->%s = %s
        """, (table_id, table['value_field'], json.dumps(record_data[table['value_field']])))

        if existing:
            return jsonify({'error': f'Record with {table["value_field"]} = {record_data[table["value_field"]]} already exists'}), 409

        record_id = Database.execute_insert("""
            INSERT INTO lookup_data 
            (lookup_table_id, data, sort_order, created_by)
            VALUES (%s, %s, %s, %s)
        """, (
            table_id, json.dumps(record_data),
            data.get('sort_order', 0), user_id
        ))

        return jsonify({
            'message': 'Lookup record created successfully',
            'record_id': record_id
        }), 201

    except Exception as e:
        logger.error(f"Error creating lookup record: {e}")
        return jsonify({'error': 'Failed to create lookup record'}), 500


@lookups_bp.route('/tables/<table_id>/data/<record_id>', methods=['PUT'])
@require_auth
@require_permissions(['manage_lookups'])
@audit_log('update', 'lookup_data')
def update_lookup_record(table_id, record_id):
    """Update lookup record"""
    try:
        if not validate_uuid(table_id) or not validate_uuid(record_id):
            return jsonify({'error': 'Invalid ID format'}), 400

        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']

        # Verify table and record exist
        record = Database.execute_one("""
            SELECT ld.id, lt.value_field, lt.display_field, lt.is_system
            FROM lookup_data ld
            JOIN lookup_tables lt ON ld.lookup_table_id = lt.id
            WHERE ld.id = %s AND ld.lookup_table_id = %s AND lt.tenant_id = %s
        """, (record_id, table_id, tenant_id))

        if not record:
            return jsonify({'error': 'Lookup record not found'}), 404

        # Update record
        update_fields = []
        params = []

        if 'data' in data:
            record_data = data['data']

            # Validate required fields still exist
            if record['value_field'] not in record_data:
                return jsonify({'error': f'Missing required field: {record["value_field"]}'}), 400

            if record['display_field'] not in record_data:
                return jsonify({'error': f'Missing required field: {record["display_field"]}'}), 400

            update_fields.append('data = %s')
            params.append(json.dumps(record_data))

        if 'sort_order' in data:
            update_fields.append('sort_order = %s')
            params.append(data['sort_order'])

        if 'is_active' in data:
            update_fields.append('is_active = %s')
            params.append(data['is_active'])

        if update_fields:
            update_fields.append('updated_at = NOW()')
            params.append(record_id)

            query = f"""
                UPDATE lookup_data 
                SET {', '.join(update_fields)}
                WHERE id = %s
            """
            Database.execute_query(query, params)

        return jsonify({'message': 'Lookup record updated successfully'}), 200

    except Exception as e:
        logger.error(f"Error updating lookup record {record_id}: {e}")
        return jsonify({'error': 'Failed to update lookup record'}), 500


@lookups_bp.route('/tables/<table_id>/data/<record_id>', methods=['DELETE'])
@require_auth
@require_permissions(['manage_lookups'])
@audit_log('delete', 'lookup_data')
def delete_lookup_record(table_id, record_id):
    """Delete lookup record"""
    try:
        if not validate_uuid(table_id) or not validate_uuid(record_id):
            return jsonify({'error': 'Invalid ID format'}), 400

        tenant_id = g.current_user['tenant_id']

        # Verify record exists
        record = Database.execute_one("""
            SELECT ld.id
            FROM lookup_data ld
            JOIN lookup_tables lt ON ld.lookup_table_id = lt.id
            WHERE ld.id = %s AND ld.lookup_table_id = %s AND lt.tenant_id = %s
        """, (record_id, table_id, tenant_id))

        if not record:
            return jsonify({'error': 'Lookup record not found'}), 404

        Database.execute_query("""
            DELETE FROM lookup_data WHERE id = %s
        """, (record_id,))

        return jsonify({'message': 'Lookup record deleted successfully'}), 200

    except Exception as e:
        logger.error(f"Error deleting lookup record {record_id}: {e}")
        return jsonify({'error': 'Failed to delete lookup record'}), 500


# Bulk Operations
@lookups_bp.route('/tables/<table_id>/import', methods=['POST'])
@require_auth
@require_permissions(['manage_lookups'])
@audit_log('import', 'lookup_data')
def bulk_import_data(table_id):
    """Bulk import lookup data from CSV"""
    try:
        if not validate_uuid(table_id):
            return jsonify({'error': 'Invalid table ID'}), 400

        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']

        # Verify table exists
        table = Database.execute_one("""
            SELECT id, value_field, display_field, additional_fields
            FROM lookup_tables 
            WHERE id = %s AND tenant_id = %s
        """, (table_id, tenant_id))

        if not table:
            return jsonify({'error': 'Lookup table  not found'}), 404
       