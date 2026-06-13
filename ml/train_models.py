import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.tree import DecisionTreeClassifier
from sklearn.cluster import KMeans
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os

# Create models directory if it doesn't exist
os.makedirs('models', exist_ok=True)

# Define Mappings
request_types = [
    'Income Certificate', 'Caste Certificate', 'Residence Certificate',
    'Complaint Registration', 'Business License', 'Land Approval',
    'Scholarship Request', 'Pension Request', 'General Service Request'
]
request_type_map = {val: i for i, val in enumerate(request_types)}

departments = ['Revenue', 'Complaints', 'Commercial', 'Land', 'Social Welfare']
department_map = {val: i for i, val in enumerate(departments)}

priorities = ['Low', 'Medium', 'High', 'Critical']
priority_map = {val: i for i, val in enumerate(priorities)}

citizen_categories = ['General', 'OBC', 'SC', 'ST', 'Senior Citizen', 'Differently Abled']
citizen_category_map = {val: i for i, val in enumerate(citizen_categories)}

def preprocess_df(df):
    processed = df.copy()
    processed['request_type_idx'] = processed['request_type'].map(request_type_map).fillna(-1)
    processed['department_idx'] = processed['department'].map(department_map).fillna(-1)
    processed['priority_idx'] = processed['priority'].map(priority_map).fillna(-1)
    processed['citizen_category_idx'] = processed['citizen_category'].map(citizen_category_map).fillna(-1)
    return processed

def train():
    # 1. Load Data
    csv_path = 'data/historical_requests.csv'
    if not os.path.exists(csv_path):
        print("Historical CSV not found. Generating synthetic data first...")
        from generate_synthetic_data import generate_data
        generate_data()
        
    df = pd.read_csv(csv_path)
    df_processed = preprocess_df(df)
    
    # 2. Train Delay Prediction Model (Random Forest)
    print("\n--- Training Delay Prediction Model ---")
    features_delay = [
        'request_type_idx', 'department_idx', 'officer_workload', 
        'queue_size', 'priority_idx', 'escalation_count'
    ]
    X_delay = df_processed[features_delay]
    y_delay = df_processed['delayed']
    
    X_train, X_test, y_train, y_test = train_test_split(X_delay, y_delay, test_size=0.2, random_state=42)
    
    rf_delay = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    rf_delay.fit(X_train, y_train)
    
    y_pred = rf_delay.predict(X_test)
    print(f"Delay Model Accuracy: {accuracy_score(y_test, y_pred):.4f}")
    print(classification_report(y_test, y_pred))
    
    # Save Delay Model
    joblib.dump(rf_delay, 'models/delay_model.joblib')
    
    # 3. Train SLA Breach Prediction Model (Random Forest)
    print("\n--- Training SLA Breach Model ---")
    y_sla = df_processed['sla_breached']
    X_train_s, X_test_s, y_train_s, y_test_s = train_test_split(X_delay, y_sla, test_size=0.2, random_state=42)
    
    rf_sla = RandomForestClassifier(n_estimators=100, max_depth=10, random_state=42)
    rf_sla.fit(X_train_s, y_train_s)
    
    y_pred_s = rf_sla.predict(X_test_s)
    print(f"SLA Breach Model Accuracy: {accuracy_score(y_test_s, y_pred_s):.4f}")
    
    # Save SLA Model
    joblib.dump(rf_sla, 'models/sla_model.joblib')
    
    # 4. Train Smart Prioritization Engine (Decision Tree)
    # Target is priority level
    print("\n--- Training Smart Prioritization Model ---")
    # Features used to recommend priority: urgency parameters, category, delayed risk
    # We will generate features and fit a Decision Tree to mimic prioritization policy
    features_priority = [
        'medical_urgency', 'legal_urgency', 'citizen_category_idx', 'delayed'
    ]
    X_prio = df_processed[features_priority]
    y_prio = df_processed['priority_idx']
    
    dt_priority = DecisionTreeClassifier(max_depth=5, random_state=42)
    dt_priority.fit(X_prio, y_prio)
    
    print("Prioritization Decision Tree trained successfully.")
    joblib.dump(dt_priority, 'models/priority_model.joblib')
    
    # 5. Train Corruption / Anomaly Detection Model (Isolation Forest)
    print("\n--- Training Anomaly (Corruption Risk) Model ---")
    # Features for anomaly detection: processing_days relative to base_days, escalation_count, priority_idx
    # Unusually low processing days for slow departments, or excessive delay.
    df_anomaly = df_processed.copy()
    # Normalize processing days against base benchmark
    df_anomaly['processing_ratio'] = df_anomaly['processing_days'] / df_anomaly['base_days']
    
    features_anomaly = ['processing_ratio', 'officer_workload', 'escalation_count', 'priority_idx']
    X_anomaly = df_anomaly[features_anomaly]
    
    iso_forest = IsolationForest(n_estimators=100, contamination=0.03, random_state=42)
    iso_forest.fit(X_anomaly)
    
    print("Anomaly Detection Isolation Forest trained successfully.")
    joblib.dump(iso_forest, 'models/anomaly_model.joblib')
    
    # 6. Train Bottleneck Clustering (K-Means)
    print("\n--- Training Bottleneck Clustering ---")
    # Group departments/officers by processing times and workloads
    # Aggregated metrics by officer
    officer_stats = df_processed.groupby('officer_id').agg({
        'processing_days': 'mean',
        'officer_workload': 'mean',
        'escalation_count': 'mean',
        'delayed': 'mean'
    }).reset_index()
    
    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    officer_stats['cluster'] = kmeans.fit_predict(officer_stats[['processing_days', 'officer_workload', 'delayed']])
    
    print("K-Means clustering completed. Clusters representing bottleneck severity (0=Low, 1=Medium, 2=High Delay Risk)")
    joblib.dump(kmeans, 'models/bottleneck_kmeans.joblib')
    
    # Save maps as metadata
    metadata = {
        'request_type_map': request_type_map,
        'department_map': department_map,
        'priority_map': priority_map,
        'citizen_category_map': citizen_category_map,
        'request_types': request_types,
        'departments': departments,
        'priorities': priorities,
        'citizen_categories': citizen_categories
    }
    joblib.dump(metadata, 'models/metadata.joblib')
    print("Saved metadata.joblib mapping catalogs.")

if __name__ == '__main__':
    train()
