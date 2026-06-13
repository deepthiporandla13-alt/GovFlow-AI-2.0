import pandas as pd
import numpy as np
import os

# Set random seed for reproducibility
np.random.seed(42)

def generate_data(num_records=5000):
    request_types = [
        'Income Certificate', 'Caste Certificate', 'Residence Certificate',
        'Complaint Registration', 'Business License', 'Land Approval',
        'Scholarship Request', 'Pension Request', 'General Service Request'
    ]
    
    departments = {
        'Income Certificate': 'Revenue',
        'Caste Certificate': 'Revenue',
        'Residence Certificate': 'Revenue',
        'Complaint Registration': 'Complaints',
        'Business License': 'Commercial',
        'Land Approval': 'Land',
        'Scholarship Request': 'Social Welfare',
        'Pension Request': 'Social Welfare',
        'General Service Request': 'Revenue'
    }
    
    priorities = ['Low', 'Medium', 'High', 'Critical']
    citizen_categories = ['General', 'OBC', 'SC', 'ST', 'Senior Citizen', 'Differently Abled']
    
    data = []
    
    for i in range(num_records):
        req_type = np.random.choice(request_types)
        dept = departments[req_type]
        
        # Officer workload (active assignments for the officer)
        officer_workload = int(np.random.poisson(15) + np.random.choice([0, 5, 15, 25], p=[0.5, 0.3, 0.15, 0.05]))
        officer_workload = max(1, officer_workload)
        
        # Department queue size
        queue_size = int(officer_workload * np.random.uniform(3, 8) + np.random.randint(10, 50))
        
        # Urgency indicators
        medical_urgency = int(np.random.choice([0, 1], p=[0.95, 0.05]))
        legal_urgency = int(np.random.choice([0, 1], p=[0.93, 0.07]))
        
        # Priority mapping (urgency dictates higher priorities)
        if medical_urgency or legal_urgency:
            priority = np.random.choice(['High', 'Critical'], p=[0.3, 0.7])
        else:
            priority = np.random.choice(priorities, p=[0.3, 0.5, 0.15, 0.05])
            
        citizen_cat = np.random.choice(citizen_categories, p=[0.5, 0.2, 0.1, 0.1, 0.07, 0.03])
        
        # Base historical time for the request type in days
        base_days = {
            'Income Certificate': 5.0,
            'Caste Certificate': 7.0,
            'Residence Certificate': 4.0,
            'Complaint Registration': 15.0,
            'Business License': 20.0,
            'Land Approval': 30.0,
            'Scholarship Request': 12.0,
            'Pension Request': 18.0,
            'General Service Request': 6.0
        }[req_type]
        
        # Escalation count
        escalation_count = int(np.random.choice([0, 1, 2, 3], p=[0.8, 0.12, 0.06, 0.02]))
        
        # Calculate expected processing time (target variable)
        # Workload and queue size increase delays
        workload_factor = 1.0 + (officer_workload / 20.0) + (queue_size / 100.0)
        escalation_factor = 1.0 + (escalation_count * 0.4)
        
        # Priority factor: critical/high get processed faster
        priority_factor = {
            'Low': 1.3,
            'Medium': 1.0,
            'High': 0.7,
            'Critical': 0.4
        }[priority]
        
        noise = np.random.normal(0, base_days * 0.15)
        
        processing_days = (base_days * workload_factor * escalation_factor * priority_factor) + noise
        processing_days = max(1.0, processing_days)
        
        # SLA Limit
        sla_limit_days = {
            'Income Certificate': 7.0,
            'Caste Certificate': 10.0,
            'Residence Certificate': 7.0,
            'Complaint Registration': 20.0,
            'Business License': 25.0,
            'Land Approval': 45.0,
            'Scholarship Request': 15.0,
            'Pension Request': 21.0,
            'General Service Request': 10.0
        }[req_type]
        
        # Delayed if it exceeded 1.2x of the base time (or standard benchmark)
        delayed = 1 if processing_days > (base_days * 1.25) else 0
        
        # SLA Breached if it exceeded the hard limit
        sla_breached = 1 if processing_days > sla_limit_days else 0
        
        # Generate some anomalies (for corruption detection training)
        # Type 1 Anomaly: Unusually fast approval (e.g. Land Approval in 1 day by workload of 40) - bribe case
        # Type 2 Anomaly: Extremely high delay for low priority, or high rejection rate
        is_anomaly = 0
        anomaly_type = 'None'
        
        # Introduce 2% anomalies
        if np.random.rand() < 0.025:
            is_anomaly = 1
            choice = np.random.choice(['fast_approval', 'excessive_delay', 'high_rejections'])
            if choice == 'fast_approval':
                processing_days = max(0.5, np.random.uniform(0.1, 0.8))
                delayed = 0
                sla_breached = 0
                anomaly_type = 'fast_approval'
            elif choice == 'excessive_delay':
                processing_days = base_days * np.random.uniform(4.0, 7.0)
                delayed = 1
                sla_breached = 1
                anomaly_type = 'excessive_delay'
            else:
                anomaly_type = 'high_rejections'
                
        # Officer IDs
        officer_id = np.random.randint(101, 115) # Simulated Officer IDs
        
        data.append({
            'request_type': req_type,
            'department': dept,
            'officer_workload': officer_workload,
            'queue_size': queue_size,
            'priority': priority,
            'medical_urgency': medical_urgency,
            'legal_urgency': legal_urgency,
            'citizen_category': citizen_cat,
            'escalation_count': escalation_count,
            'base_days': base_days,
            'sla_limit_days': sla_limit_days,
            'processing_days': round(processing_days, 2),
            'delayed': delayed,
            'sla_breached': sla_breached,
            'officer_id': officer_id,
            'is_anomaly': is_anomaly,
            'anomaly_type': anomaly_type
        })
        
    df = pd.DataFrame(data)
    os.makedirs('data', exist_ok=True)
    df.to_csv('data/historical_requests.csv', index=False)
    print(f"Generated {num_records} synthetic records in data/historical_requests.csv")

if __name__ == '__main__':
    generate_data()
