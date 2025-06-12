# Windows-Compatible API Testing Script for Workflow Management System
# Save as: api_tester.ps1

param(
    [string]$BaseUrl = "http://localhost:5000/api",
    [string]$Username = "admin@example.com",
    [string]$Password = "admin123!",
    [switch]$BasicTests,
    [switch]$WorkflowTests,
    [switch]$AllTests,
    [switch]$Interactive
)

# Global variables
$script:Token = $null
$script:Headers = @{}

# Color functions
function Write-Success { param($Message) Write-Host $Message -ForegroundColor Green }
function Write-Info { param($Message) Write-Host $Message -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host $Message -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host $Message -ForegroundColor Red }

# API helper function
function Invoke-ApiCall {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body = $null,
        [string]$Description = ""
    )

    Write-Info "Testing: $Description"

    $uri = "$BaseUrl$Endpoint"
    $requestParams = @{
        Uri = $uri
        Method = $Method
        Headers = $script:Headers
    }

    if ($Body) {
        $requestParams.Body = ($Body | ConvertTo-Json -Depth 10)
        $requestParams.ContentType = "application/json"
    }

    try {
        $response = Invoke-RestMethod @requestParams
        Write-Success "[SUCCESS] $Description - Success"

        if ($response) {
            $response | ConvertTo-Json -Depth 3 | Write-Host
        }

        return $response
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorMsg = $_.Exception.Message
        Write-Error "[ERROR] $Description - Failed (Status: $statusCode) - $errorMsg"
        return $null
    }
    finally {
        # This will execute whether successful or not
        Write-Host ("-" * 80) -ForegroundColor Gray
    }
}

# Authentication functions
function Login {
    Write-Info "Authenticating with $Username..."

    $loginBody = @{
        username = $Username
        password = $Password
    }

    $response = Invoke-ApiCall -Method "POST" -Endpoint "/auth/login" -Body $loginBody -Description "User Login"

    if ($response -and $response.access_token) {
        $script:Token = $response.access_token
        $script:Headers = @{
            "Authorization" = "Bearer $($script:Token)"
        }
        Write-Success "Authentication successful!"
        return $true
    } else {
        Write-Error "Authentication failed!"
        return $false
    }
}

# Test suites
function Test-BasicEndpoints {
    Write-Info "Running Basic API Tests..."

    # Health check
    Invoke-ApiCall -Method "GET" -Endpoint "/../health" -Description "Health Check"

    # User profile
    Invoke-ApiCall -Method "GET" -Endpoint "/auth/profile" -Description "Get User Profile"

    # Workflows list
    Invoke-ApiCall -Method "GET" -Endpoint "/workflows?page=1&limit=5" -Description "Get Workflows"

    # Tasks list
    Invoke-ApiCall -Method "GET" -Endpoint "/tasks?page=1&limit=5" -Description "Get Tasks"

    # Dashboard stats
    Invoke-ApiCall -Method "GET" -Endpoint "/reports/dashboard-stats" -Description "Dashboard Statistics"
}

function Test-WorkflowManagement {
    Write-Info "Running Workflow Management Tests..."

    # Create test workflow
    $workflowData = @{
        name = "PowerShell Test Workflow"
        description = "Test workflow created from PowerShell script"
        category = "Testing"
        tags = @("test", "powershell")
        definition = @{
            steps = @(
                @{
                    id = "start_step"
                    name = "Start Step"
                    type = "task"
                    isStart = $true
                    position = @{ x = 100; y = 100 }
                    properties = @{
                        assignee = "admin"
                        dueHours = 24
                    }
                }
            )
            transitions = @()
        }
    }

    $workflow = Invoke-ApiCall -Method "POST" -Endpoint "/workflows" -Body $workflowData -Description "Create Test Workflow"

    if ($workflow -and $workflow.workflow_id) {
        $workflowId = $workflow.workflow_id
        Write-Success "Created workflow with ID: $workflowId"

        # Get the created workflow
        Invoke-ApiCall -Method "GET" -Endpoint "/workflows/$workflowId" -Description "Get Created Workflow"

        # Execute the workflow
        $executionData = @{
            data = @{
                test_param = "PowerShell test execution"
                timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
            }
        }

        $instance = Invoke-ApiCall -Method "POST" -Endpoint "/workflows/$workflowId/execute" -Body $executionData -Description "Execute Workflow"

        if ($instance -and $instance.instance_id) {
            Write-Success "Workflow executed with instance ID: $($instance.instance_id)"
        }
    }
}

function Test-FormManagement {
    Write-Info "Running Form Management Tests..."

    # Create test form
    $formData = @{
        name = "PowerShell Test Form"
        description = "Test form created from PowerShell"
        schema = @{
            title = "Test Form"
            fields = @(
                @{
                    name = "test_field"
                    type = "text"
                    label = "Test Field"
                    required = $true
                },
                @{
                    name = "priority"
                    type = "select"
                    label = "Priority"
                    required = $true
                    options = @(
                        @{ value = "low"; label = "Low" },
                        @{ value = "medium"; label = "Medium" },
                        @{ value = "high"; label = "High" }
                    )
                }
            )
        }
    }

    Invoke-ApiCall -Method "POST" -Endpoint "/forms" -Body $formData -Description "Create Test Form"

    # Get forms list
    Invoke-ApiCall -Method "GET" -Endpoint "/forms" -Description "Get Forms List"
}

function Test-AdminFunctions {
    Write-Info "Running Admin Function Tests..."

    # Get system health
    Invoke-ApiCall -Method "GET" -Endpoint "/admin/health" -Description "System Health Check"

    # Get users
    Invoke-ApiCall -Method "GET" -Endpoint "/admin/users?page=1&limit=5" -Description "Get Users List"

    # Get roles
    Invoke-ApiCall -Method "GET" -Endpoint "/admin/roles" -Description "Get Roles List"
}

function Show-Menu {
    Clear-Host
    Write-Host "=========================================================" -ForegroundColor Cyan
    Write-Host "    Workflow Management System - API Testing Tool" -ForegroundColor White
    Write-Host "=========================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Login" -ForegroundColor Yellow
    Write-Host "2. Run Basic Tests" -ForegroundColor Yellow
    Write-Host "3. Run Workflow Tests" -ForegroundColor Yellow
    Write-Host "4. Run Form Tests" -ForegroundColor Yellow
    Write-Host "5. Run Admin Tests" -ForegroundColor Yellow
    Write-Host "6. Run All Tests" -ForegroundColor Yellow
    Write-Host "7. Custom API Call" -ForegroundColor Yellow
    Write-Host "8. Show Current Settings" -ForegroundColor Yellow
    Write-Host "9. Exit" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
}

function Invoke-CustomApiCall {
    Write-Host ""
    $endpoint = Read-Host "Enter API endpoint (e.g., /workflows)"
    $method = Read-Host "Enter HTTP method (GET/POST/PUT/DELETE)"
    $description = Read-Host "Enter description"

    $body = $null
    if ($method -eq "POST" -or $method -eq "PUT") {
        Write-Host "Enter JSON body (or press Enter for none):"
        $bodyInput = Read-Host
        if ($bodyInput) {
            try {
                $body = $bodyInput | ConvertFrom-Json
            }
            catch {
                Write-Error "Invalid JSON format"
                return
            }
        }
    }

    Invoke-ApiCall -Method $method -Endpoint $endpoint -Body $body -Description $description
}

function Show-Settings {
    Write-Host ""
    Write-Host "Current Settings:" -ForegroundColor Cyan
    Write-Host "  Base URL: $BaseUrl" -ForegroundColor White
    Write-Host "  Username: $Username" -ForegroundColor White
    Write-Host "  Authenticated: $(if ($script:Token) { 'Yes' } else { 'No' })" -ForegroundColor White
    Write-Host ""
}

# Main execution logic
function Main {
    if ($BasicTests) {
        if (Login) { Test-BasicEndpoints }
        return
    }

    if ($WorkflowTests) {
        if (Login) { Test-WorkflowManagement }
        return
    }

    if ($AllTests) {
        if (Login) {
            Test-BasicEndpoints
            Test-WorkflowManagement
            Test-FormManagement
            Test-AdminFunctions
        }
        return
    }

    if ($Interactive -or (-not $BasicTests -and -not $WorkflowTests -and -not $AllTests)) {
        while ($true) {
            Show-Menu
            $choice = Read-Host "Select an option (1-9)"

            switch ($choice) {
                "1" {
                    Login
                    Read-Host "Press Enter to continue..."
                }
                "2" {
                    if (-not $script:Token) {
                        Write-Warning "Please login first"
                        Read-Host "Press Enter to continue..."
                        continue
                    }
                    Test-BasicEndpoints
                    Read-Host "Press Enter to continue..."
                }
                "3" {
                    if (-not $script:Token) {
                        Write-Warning "Please login first"
                        Read-Host "Press Enter to continue..."
                        continue
                    }
                    Test-WorkflowManagement
                    Read-Host "Press Enter to continue..."
                }
                "4" {
                    if (-not $script:Token) {
                        Write-Warning "Please login first"
                        Read-Host "Press Enter to continue..."
                        continue
                    }
                    Test-FormManagement
                    Read-Host "Press Enter to continue..."
                }
                "5" {
                    if (-not $script:Token) {
                        Write-Warning "Please login first"
                        Read-Host "Press Enter to continue..."
                        continue
                    }
                    Test-AdminFunctions
                    Read-Host "Press Enter to continue..."
                }
                "6" {
                    if (-not $script:Token) {
                        if (-not (Login)) {
                            Read-Host "Press Enter to continue..."
                            continue
                        }
                    }
                    Test-BasicEndpoints
                    Test-WorkflowManagement
                    Test-FormManagement
                    Test-AdminFunctions
                    Read-Host "Press Enter to continue..."
                }
                "7" {
                    if (-not $script:Token) {
                        Write-Warning "Please login first"
                        Read-Host "Press Enter to continue..."
                        continue
                    }
                    Invoke-CustomApiCall
                    Read-Host "Press Enter to continue..."
                }
                "8" {
                    Show-Settings
                    Read-Host "Press Enter to continue..."
                }
                "9" {
                    Write-Success "Goodbye!"
                    exit 0
                }
                default {
                    Write-Warning "Invalid choice. Please try again."
                    Start-Sleep -Seconds 1
                }
            }
        }
    }
}

# Run the main function
Main