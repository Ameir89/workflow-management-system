# Mock API Server for Testing the Automation Script
# Run this separately to test your automation script

from flask import Flask, request, jsonify
import random
import time

app = Flask(__name__)

@app.route('/validate', methods=['POST'])
def validate_request():
    """Mock validation endpoint that simulates business logic"""
    
    try:
        data = request.get_json()
        
        # Extract request details
        request_data = data.get('request_data', {})
        amount = float(request_data.get('amount', 0))
        department = request_data.get('department', '')
        category = request_data.get('category', '')
        
        print(f"Received validation request:")
        print(f"  - Amount: ${amount}")
        print(f"  - Department: {department}")
        print(f"  - Category: {category}")
        
        # Simulate processing delay
        time.sleep(0.5)
        
        # Business logic simulation
        confidence = random.uniform(0.7, 0.99)
        
        # Auto-approve small amounts
        if amount < 100:
            decision = 'approve'
            reason = f'Amount ${amount} is below auto-approval threshold'
            confidence = 0.95
            
        # Auto-reject very large amounts
        elif amount > 10000:
            decision = 'reject'
            reason = f'Amount ${amount} exceeds automatic approval limit'
            confidence = 0.90
            
        # Department-specific rules
        elif department == 'IT' and category == 'software_license':
            if amount < 5000:
                decision = 'approve'
                reason = 'IT software license approved under department limit'
            else:
                decision = 'pending'
                reason = 'IT software license requires manager approval'
                
        # Finance department gets higher limits
        elif department == 'Finance':
            if amount < 2000:
                decision = 'approve'
                reason = 'Finance department request approved'
            else:
                decision = 'pending'
                reason = 'Finance request requires additional review'
                
        # Random decisions for demonstration
        else:
            decision_roll = random.random()
            if decision_roll < 0.6:
                decision = 'approve'
                reason = 'Request meets standard approval criteria'
            elif decision_roll < 0.8:
                decision = 'reject'
                reason = 'Request does not meet policy requirements'
            else:
                decision = 'pending'
                reason = 'Request requires manual review for policy compliance'
        
        # Build response
        response = {
            'decision': decision,
            'reason': reason,
            'confidence': confidence,
            'additional_data': {
                'policy_version': '2024.1',
                'processor': 'automated_validation_v2',
                'risk_score': random.uniform(0.1, 0.9),
                'compliance_flags': [],
                'suggested_approvers': []
            },
            'metadata': {
                'processing_time_ms': random.randint(100, 500),
                'api_version': '1.0',
                'timestamp': time.time()
            }
        }
        
        # Add department-specific data
        if department == 'IT':
            response['additional_data']['it_budget_remaining'] = random.randint(5000, 50000)
            
        if decision == 'pending':
            response['additional_data']['suggested_approvers'] = [
                'department_manager',
                'finance_controller'
            ]
            
        print(f"Returning decision: {decision} (confidence: {confidence:.2f})")
        
        return jsonify(response), 200
        
    except Exception as e:
        print(f"Error processing request: {str(e)}")
        return jsonify({
            'decision': 'error',
            'reason': f'Server error: {str(e)}',
            'confidence': 0.0,
            'error_code': 'PROCESSING_ERROR'
        }), 500

@app.route('/validate-expense', methods=['POST'])
def validate_expense():
    """Specific endpoint for expense validation"""
    
    try:
        data = request.get_json()
        request_data = data.get('request_data', {})
        
        amount = float(request_data.get('amount', 0))
        category = request_data.get('category', '')
        
        # Expense-specific validation logic
        if category == 'travel':
            if amount < 1000:
                decision = 'approve'
                reason = 'Travel expense approved under policy limit'
            else:
                decision = 'pending'
                reason = 'Travel expense requires manager pre-approval'
                
        elif category == 'meals':
            daily_limit = 75
            if amount <= daily_limit:
                decision = 'approve'
                reason = f'Meal expense within daily limit of ${daily_limit}'
            else:
                decision = 'reject'
                reason = f'Meal expense exceeds daily limit of ${daily_limit}'
                
        elif category == 'software_license':
            if amount < 500:
                decision = 'approve'
                reason = 'Software license approved'
            else:
                decision = 'pending'
                reason = 'Software license requires IT approval'
                
        else:
            # Default validation
            if amount < 200:
                decision = 'approve'
                reason = 'Standard expense approved'
            elif amount > 5000:
                decision = 'reject'
                reason = 'Expense exceeds standard approval limit'
            else:
                decision = 'pending'
                reason = 'Expense requires manager review'
        
        confidence = random.uniform(0.8, 0.98)
        
        response = {
            'decision': decision,
            'reason': reason,
            'confidence': confidence,
            'expense_category': category,
            'policy_compliance': decision != 'reject',
            'additional_data': {
                'category_limit': 5000,
                'spent_this_month': random.randint(100, 2000),
                'remaining_budget': random.randint(1000, 8000)
            }
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        return jsonify({
            'decision': 'error',
            'reason': f'Validation error: {str(e)}',
            'confidence': 0.0
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'validation-api',
        'version': '1.0.0'
    }), 200

@app.route('/test-scenarios', methods=['GET'])
def test_scenarios():
    """Get test scenarios for different decision outcomes"""
    return jsonify({
        'scenarios': [
            {
                'name': 'Auto Approve',
                'description': 'Small amount that should be auto-approved',
                'test_data': {
                    'amount': 50,
                    'department': 'IT',
                    'category': 'office_supplies'
                },
                'expected_decision': 'approve'
            },
            {
                'name': 'Auto Reject',
                'description': 'Large amount that should be auto-rejected',
                'test_data': {
                    'amount': 15000,
                    'department': 'Marketing',
                    'category': 'equipment'
                },
                'expected_decision': 'reject'
            },
            {
                'name': 'Manual Review',
                'description': 'Mid-range amount requiring manual review',
                'test_data': {
                    'amount': 2500,
                    'department': 'Sales',
                    'category': 'training'
                },
                'expected_decision': 'pending'
            }
        ]
    }), 200

if __name__ == '__main__':
    print("🚀 Starting Mock Validation API Server...")
    print("📋 Available endpoints:")
    print("   POST /validate - General validation")
    print("   POST /validate-expense - Expense-specific validation") 
    print("   GET /health - Health check")
    print("   GET /test-scenarios - Get test scenarios")
    print("\n💡 Test with: curl -X POST http://localhost:5001/validate -H 'Content-Type: application/json' -d '{\"request_data\": {\"amount\": 150, \"department\": \"IT\", \"category\": \"software\"}}'\n")
    
    app.run(host='0.0.0.0', port=5001, debug=True)