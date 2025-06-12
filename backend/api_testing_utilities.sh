#!/bin/bash

# Workflow Management System - API Testing Utilities and Scripts

# Configuration
BASE_URL="${BASE_URL:-http://localhost:5000/api}"
USERNAME="${USERNAME:-admin@example.com}"
PASSWORD="${PASSWORD:-admin123!}"
TOKEN_FILE=".auth_token"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Utility Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Authentication Functions
login() {
    log_info "Logging in as $USERNAME..."
    
    response=$(curl -s -X POST "$BASE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"username\": \"$USERNAME\",
            \"password\": \"$PASSWORD\"
        }")
    
    token=$(echo $response | jq -r '.access_token // empty')
    
    if [ -n "$token" ] && [ "$token" != "null" ]; then
        echo $token > $TOKEN_FILE
        log_success "Login successful. Token saved."
        return 0
    else
        log_error "Login failed: $(echo $response | jq -r '.error // .message // "Unknown error"')"
        return 1
    fi
}

get_token() {
    if [ -f $TOKEN_FILE ]; then
        cat $TOKEN_FILE
    else
        log_warning "No token found. Please login first."
        return 1
    fi
}

auth_header() {
    token=$(get_token)
    if [ $? -eq 0 ]; then
        echo "Authorization: Bearer $token"
    else
        return 1
    fi
}

# API Testing Functions
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    log_info "Testing: $description"
    
    if [ -n "$data" ]; then
        response=$(curl -s -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -H "$(auth_header)" \
            -d "$data")
    else
        response=$(curl -s -X $method "$BASE_URL$endpoint" \
            -H "$(auth_header)")
    fi
    
    status_code=$(curl -s -o /dev/null -w "%{http_code}" -X $method "$BASE_URL$endpoint" \
        -H "Content-Type: application/json" \
        -H "$(auth_header)" \
        -d "$data")
    
    if [ $status_code -ge 200 ] && [ $status_code -lt 300 ]; then
        log_success "$description - Status: $status_code"
        echo "Response: $(echo $response | jq -C . 2>/dev/null || echo $response)"
    else
        log_error "$description - Status: $status_code"
        echo "Error Response: $(echo $response | jq -C . 2>/dev/null || echo $response)"
    fi
    
    echo "----------------------------------------"
}

# Comprehensive Testing Suite
run_basic_tests() {
    log_info "Running basic API tests..."
    
    # Health check
    test_endpoint "GET" "/health" "" "Health Check"
    
    # Get user profile
    test_endpoint "GET" "/auth/profile" "" "Get User Profile"
    
    # Get workflows
    test_endpoint "GET" "/workflows?page=1&limit=5" "" "Get Workflows"
    
    # Get tasks
    test_endpoint "GET" "/tasks?page=1&limit=5" "" "Get Tasks"
    
    # Get dashboard stats
    test_endpoint "GET" "/reports/dashboard-stats" "" "Dashboard Statistics"
}

run_workflow_tests() {
    log_info "Running workflow management tests..."
    
    # Create a test workflow
    workflow_data='{
        "name": "Test Workflow - API Test",
        "description": "Automated test workflow",
        "category": "Testing",
        "tags": ["test", "api"],
        "definition": {
            "steps": [
                {
                    "id": "start_task",
                    "name": "Start Task",
                    "type": "task",
                    "isStart": true,
                    "position": { "x": 100, "y": 100 },
                    "properties": {
                        "assignee": "admin",
                        "dueHours": 24
                    }
                }
            ],
            "transitions": []
        }
    }'
    
    test_endpoint "POST" "/workflows" "$workflow_data" "Create Test Workflow"
    
    # Get the created workflow (assuming it was created successfully)
    test_endpoint "GET" "/workflows?search=Test%20Workflow%20-%20API%20Test" "" "Search for Created Workflow"
}

run_stress_tests() {
    log_info "Running stress tests..."
    
    local concurrent_requests=10
    local pids=()
    
    log_info "Starting $concurrent_requests concurrent requests..."
    
    for i in $(seq 1 $concurrent_requests); do
        (
            response=$(curl -s -X GET "$BASE_URL/workflows" \
                -H "$(auth_header)")
            echo "Request $i completed"
        ) &
        pids+=($!)
    done
    
    # Wait for all background jobs to complete
    for pid in "${pids[@]}"; do
        wait $pid
    done
    
    log_success "Stress test completed"
}

# Data Setup Functions
setup_test_data() {
    log_info "Setting up test data..."
    
    # Create test users
    create_test_users
    
    # Create test workflows
    create_test_workflows
    
    # Create test forms
    create_test_forms
    
    log_success "Test data setup completed"
}

create_test_users() {
    log_info "Creating test users..."
    
    local users=(
        '{"username": "test.manager", "email": "test.manager@example.com", "password": "TestPass123!", "first_name": "Test", "last_name": "Manager", "roles": ["Admin"]}'
        '{"username": "test.user1", "email": "test.user1@example.com", "password": "TestPass123!", "first_name": "Test", "last_name": "User1", "roles": ["User"]}'
        '{"username": "test.user2", "email": "test.user2@example.com", "password": "TestPass123!", "first_name": "Test", "last_name": "User2", "roles": ["User"]}'
    )
    
    for user_data in "${users[@]}"; do
        response=$(curl -s -X POST "$BASE_URL/admin/users" \
            -H "Content-Type: application/json" \
            -H "$(auth_header)" \
            -d "$user_data")
        
        username=$(echo $user_data | jq -r '.username')
        if echo $response | jq -e '.user_id' > /dev/null; then
            log_success "Created user: $username"
        else
            log_warning "Failed to create user $username: $(echo $response | jq -r '.error // .message')"
        fi
    done
}

create_test_workflows() {
    log_info "Creating test workflows..."
    
    # Simple approval workflow
    local simple_workflow='{
        "name": "Simple Approval Test",
        "description": "Basic approval workflow for testing",
        "category": "Testing",
        "tags": ["test", "approval"],
        "definition": {
            "steps": [
                {
                    "id": "submit",
                    "name": "Submit Request",
                    "type": "task",
                    "isStart": true,
                    "position": { "x": 100, "y": 100 }
                },
                {
                    "id": "approve",
                    "name": "Approve Request",
                    "type": "approval",
                    "position": { "x": 300, "y": 100 }
                }
            ],
            "transitions": [
                {
                    "id": "submit_to_approve",
                    "from": "submit",
                    "to": "approve"
                }
            ]
        }
    }'
    
    test_endpoint "POST" "/workflows" "$simple_workflow" "Create Simple Approval Workflow"
    
    # Complex multi-step workflow
    local complex_workflow='{
        "name": "Complex Process Test",
        "description": "Multi-step workflow for testing",
        "category": "Testing",
        "tags": ["test", "complex", "multi-step"],
        "definition": {
            "steps": [
                {
                    "id": "initiate",
                    "name": "Initiate Process",
                    "type": "task",
                    "isStart": true,
                    "position": { "x": 100, "y": 100 }
                },
                {
                    "id": "review1",
                    "name": "First Review",
                    "type": "approval",
                    "position": { "x": 300, "y": 100 }
                },
                {
                    "id": "review2",
                    "name": "Second Review",
                    "type": "approval",
                    "position": { "x": 500, "y": 100 }
                },
                {
                    "id": "finalize",
                    "name": "Finalize",
                    "type": "task",
                    "position": { "x": 700, "y": 100 }
                }
            ],
            "transitions": [
                {
                    "id": "init_to_review1",
                    "from": "initiate",
                    "to": "review1"
                },
                {
                    "id": "review1_to_review2",
                    "from": "review1",
                    "to": "review2"
                },
                {
                    "id": "review2_to_finalize",
                    "from": "review2",
                    "to": "finalize"
                }
            ]
        }
    }'
    
    test_endpoint "POST" "/workflows" "$complex_workflow" "Create Complex Multi-Step Workflow"
}

create_test_forms() {
    log_info "Creating test forms..."
    
    local test_form='{
        "name": "Test Request Form",
        "description": "Form for testing purposes",
        "schema": {
            "title": "Test Request",
            "fields": [
                {
                    "name": "request_type",
                    "type": "select",
                    "label": "Request Type",
                    "required": true,
                    "options": [
                        {"value": "type1", "label": "Type 1"},
                        {"value": "type2", "label": "Type 2"}
                    ]
                },
                {
                    "name": "description",
                    "type": "textarea",
                    "label": "Description",
                    "required": true
                },
                {
                    "name": "priority",
                    "type": "radio",
                    "label": "Priority",
                    "required": true,
                    "options": [
                        {"value": "low", "label": "Low"},
                        {"value": "medium", "label": "Medium"},
                        {"value": "high", "label": "High"}
                    ]
                }
            ]
        }
    }'
    
    test_endpoint "POST" "/forms" "$test_form" "Create Test Form"
}

# Cleanup Functions
cleanup_test_data() {
    log_info "Cleaning up test data..."
    
    # Get and delete test workflows
    workflows=$(curl -s -X GET "$BASE_URL/workflows?search=Test" \
        -H "$(auth_header)" | jq -r '.workflows[]?.id // empty')
    
    for workflow_id in $workflows; do
        if [ -n "$workflow_id" ] && [ "$workflow_id" != "null" ]; then
            response=$(curl -s -X DELETE "$BASE_URL/workflows/$workflow_id" \
                -H "$(auth_header)")
            log_info "Deleted workflow: $workflow_id"
        fi
    done
    
    # Clean up test forms
    forms=$(curl -s -X GET "$BASE_URL/forms?search=Test" \
        -H "$(auth_header)" | jq -r '.forms[]?.id // empty')
    
    for form_id in $forms; do
        if [ -n "$form_id" ] && [ "$form_id" != "null" ]; then
            response=$(curl -s -X DELETE "$BASE_URL/forms/$form_id" \
                -H "$(auth_header)")
            log_info "Deleted form: $form_id"
        fi
    done
    
    log_success "Cleanup completed"
}

# Performance Testing
benchmark_api() {
    log_info "Running API benchmarks..."
    
    local endpoints=(
        "GET /workflows"
        "GET /tasks"
        "GET /reports/dashboard-stats"
        "GET /auth/profile"
    )
    
    for endpoint in "${endpoints[@]}"; do
        method=$(echo $endpoint | cut -d' ' -f1)
        path=$(echo $endpoint | cut -d' ' -f2)
        
        log_info "Benchmarking: $endpoint"
        
        # Run 10 requests and measure time
        start_time=$(date +%s%N)
        for i in {1..10}; do
            curl -s -X $method "$BASE_URL$path" \
                -H "$(auth_header)" > /dev/null
        done
        end_time=$(date +%s%N)
        
        duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
        avg_time=$(( duration / 10 ))
        
        log_success "$endpoint - Average time: ${avg_time}ms"
    done
}

# Main Menu
show_menu() {
    echo "========================================"
    echo "  Workflow Management API Test Suite"
    echo "========================================"
    echo "1. Login"
    echo "2. Run Basic Tests"
    echo "3. Run Workflow Tests"
    echo "4. Run Stress Tests"
    echo "5. Setup Test Data"
    echo "6. Cleanup Test Data"
    echo "7. Benchmark API"
    echo "8. Custom Test"
    echo "9. Exit"
    echo "========================================"
}

custom_test() {
    echo "Enter custom API endpoint (e.g., /workflows):"
    read endpoint
    
    echo "Enter HTTP method (GET/POST/PUT/DELETE):"
    read method
    
    echo "Enter JSON data (or press Enter for none):"
    read data
    
    echo "Enter test description:"
    read description
    
    test_endpoint "$method" "$endpoint" "$data" "$description"
}

# Main execution
case "${1:-menu}" in
    "login")
        login
        ;;
    "basic")
        login && run_basic_tests
        ;;
    "workflow")
        login && run_workflow_tests
        ;;
    "stress")
        login && run_stress_tests
        ;;
    "setup")
        login && setup_test_data
        ;;
    "cleanup")
        login && cleanup_test_data
        ;;
    "benchmark")
        login && benchmark_api
        ;;
    "all")
        login && run_basic_tests && run_workflow_tests && setup_test_data
        ;;
    "menu"|*)
        while true; do
            show_menu
            read -p "Select an option (1-9): " choice
            
            case $choice in
                1)
                    login
                    ;;
                2)
                    login && run_basic_tests
                    ;;
                3)
                    login && run_workflow_tests
                    ;;
                4)
                    login && run_stress_tests
                    ;;
                5)
                    login && setup_test_data
                    ;;
                6)
                    login && cleanup_test_data
                    ;;
                7)
                    login && benchmark_api
                    ;;
                8)
                    login && custom_test
                    ;;
                9)
                    log_info "Goodbye!"
                    exit 0
                    ;;
                *)
                    log_error "Invalid option. Please try again."
                    ;;
            esac
            
            echo ""
            read -p "Press Enter to continue..."
        done
        ;;
esac