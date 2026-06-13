from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import os

app = Flask(__name__)
CORS(app)

# Load models and metadata
models_dir = 'models'
delay_model = None
sla_model = None
priority_model = None
anomaly_model = None
kmeans_model = None
metadata = {}

def load_all_models():
    global delay_model, sla_model, priority_model, anomaly_model, kmeans_model, metadata
    try:
        delay_model = joblib.load(os.path.join(models_dir, 'delay_model.joblib'))
        sla_model = joblib.load(os.path.join(models_dir, 'sla_model.joblib'))
        priority_model = joblib.load(os.path.join(models_dir, 'priority_model.joblib'))
        anomaly_model = joblib.load(os.path.join(models_dir, 'anomaly_model.joblib'))
        kmeans_model = joblib.load(os.path.join(models_dir, 'bottleneck_kmeans.joblib'))
        metadata = joblib.load(os.path.join(models_dir, 'metadata.joblib'))
        print("All models loaded successfully.")
    except Exception as e:
        print(f"Error loading models: {e}. Make sure to run train_models.py first.")

load_all_models()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "models_loaded": delay_model is not None})

@app.route('/predict/delay', methods=['POST'])
def predict_delay():
    if not delay_model:
        return jsonify({"error": "Models not loaded. Train models first."}), 500
        
    data = request.json
    try:
        req_type = data.get('request_type')
        dept = data.get('department')
        workload = int(data.get('officer_workload', 10))
        queue_size = int(data.get('queue_size', 50))
        priority = data.get('priority', 'Medium')
        escalations = int(data.get('escalation_count', 0))
        created_at_str = data.get('created_at', datetime.now().isoformat())
        
        # Mappings
        req_idx = metadata['request_type_map'].get(req_type, 0)
        dept_idx = metadata['department_map'].get(dept, 0)
        prio_idx = metadata['priority_map'].get(priority, 1)
        
        # Features: ['request_type_idx', 'department_idx', 'officer_workload', 'queue_size', 'priority_idx', 'escalation_count']
        features = np.array([[req_idx, dept_idx, workload, queue_size, prio_idx, escalations]])
        
        # Delay Probability
        prob = delay_model.predict_proba(features)[0][1]
        
        # SLA Limit in days
        sla_limits = {
            'Income Certificate': 7, 'Caste Certificate': 10, 'Residence Certificate': 7,
            'Complaint Registration': 20, 'Business License': 25, 'Land Approval': 45,
            'Scholarship Request': 15, 'Pension Request': 21, 'General Service Request': 10
        }
        limit_days = sla_limits.get(req_type, 14)
        
        # Base processing days
        base_days_dict = {
            'Income Certificate': 5.0, 'Caste Certificate': 7.0, 'Residence Certificate': 4.0,
            'Complaint Registration': 15.0, 'Business License': 20.0, 'Land Approval': 30.0,
            'Scholarship Request': 12.0, 'Pension Request': 18.0, 'General Service Request': 6.0
        }
        base_days = base_days_dict.get(req_type, 10.0)
        
        # Estimate completion date based on probability & workload
        workload_factor = 1.0 + (workload / 25.0) + (queue_size / 120.0)
        prio_factor = {'Low': 1.3, 'Medium': 1.0, 'High': 0.7, 'Critical': 0.4}.get(priority, 1.0)
        estimated_days = base_days * workload_factor * prio_factor * (1.0 + prob * 0.5)
        
        created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
        est_completion = created_at + timedelta(days=estimated_days)
        
        risk_level = 'Low'
        if prob > 0.8:
            risk_level = 'Critical'
        elif prob > 0.5:
            risk_level = 'High'
        elif prob > 0.25:
            risk_level = 'Medium'
            
        return jsonify({
            "delay_probability": round(float(prob), 4),
            "expected_completion_date": est_completion.isoformat(),
            "risk_level": risk_level,
            "estimated_processing_days": round(float(estimated_days), 1),
            "sla_limit_days": limit_days
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/predict/priority', methods=['POST'])
def predict_priority():
    if not priority_model:
        return jsonify({"error": "Priority model not loaded."}), 500
    
    data = request.json
    try:
        med_urg = int(data.get('medical_urgency', 0))
        leg_urg = int(data.get('legal_urgency', 0))
        cat = data.get('citizen_category', 'General')
        delayed = int(data.get('delayed_risk', 0))
        
        cat_idx = metadata['citizen_category_map'].get(cat, 0)
        
        # Features: ['medical_urgency', 'legal_urgency', 'citizen_category_idx', 'delayed']
        features = np.array([[med_urg, leg_urg, cat_idx, delayed]])
        pred_idx = priority_model.predict(features)[0]
        
        recommended_priority = metadata['priorities'][pred_idx]
        
        return jsonify({
            "recommended_priority": recommended_priority,
            "confidence": 0.95 if (med_urg or leg_urg) else 0.85
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/predict/sla', methods=['POST'])
def predict_sla():
    if not sla_model:
        return jsonify({"error": "SLA model not loaded."}), 500
        
    data = request.json
    try:
        req_type = data.get('request_type')
        dept = data.get('department')
        workload = int(data.get('officer_workload', 10))
        queue_size = int(data.get('queue_size', 50))
        priority = data.get('priority', 'Medium')
        escalations = int(data.get('escalation_count', 0))
        
        req_idx = metadata['request_type_map'].get(req_type, 0)
        dept_idx = metadata['department_map'].get(dept, 0)
        prio_idx = metadata['priority_map'].get(priority, 1)
        
        features = np.array([[req_idx, dept_idx, workload, queue_size, prio_idx, escalations]])
        prob = sla_model.predict_proba(features)[0][1]
        
        # Intervention strategy
        intervention = "None required. On track."
        if prob > 0.8:
            intervention = "CRITICAL: Reassign to an officer with lower workload (< 5 active requests) and flag as High Priority."
        elif prob > 0.5:
            intervention = "WARNING: Auto-escalate processing queue and notify supervisor to speed up document verification."
        elif prob > 0.25:
            intervention = "MONITOR: Send intermediate nudge notification to current processing clerk."
            
        return jsonify({
            "sla_violation_probability": round(float(prob), 4),
            "suggested_intervention": intervention
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/detect/anomalies', methods=['POST'])
def detect_anomalies():
    if not anomaly_model:
        return jsonify({"error": "Anomaly model not loaded."}), 500
        
    data = request.json
    try:
        processing_days = float(data.get('processing_days', 5.0))
        req_type = data.get('request_type', 'Income Certificate')
        workload = int(data.get('officer_workload', 10))
        escalations = int(data.get('escalation_count', 0))
        priority = data.get('priority', 'Medium')
        
        base_days_dict = {
            'Income Certificate': 5.0, 'Caste Certificate': 7.0, 'Residence Certificate': 4.0,
            'Complaint Registration': 15.0, 'Business License': 20.0, 'Land Approval': 30.0,
            'Scholarship Request': 12.0, 'Pension Request': 18.0, 'General Service Request': 6.0
        }
        base_days = base_days_dict.get(req_type, 10.0)
        
        processing_ratio = processing_days / base_days
        prio_idx = metadata['priority_map'].get(priority, 1)
        
        # Features: ['processing_ratio', 'officer_workload', 'escalation_count', 'priority_idx']
        features = np.array([[processing_ratio, workload, escalations, prio_idx]])
        
        # Isolation Forest outputs -1 for anomaly, 1 for normal
        pred = anomaly_model.predict(features)[0]
        anomaly_score = float(-anomaly_model.score_samples(features)[0]) # Higher score = more anomalous
        
        is_anomaly = int(pred == -1)
        
        # Highlight bribe risk / corruption indicators
        reasons = []
        risk_score = 0.0
        
        # Unusual speed
        if processing_ratio < 0.15 and workload > 15:
            reasons.append("Extremely fast approval despite high officer workload (possible bribery/corruption risk)")
            risk_score += 0.8
        # Excessive delay with escalations
        if processing_ratio > 3.5 and escalations > 1:
            reasons.append("Excessive processing delay and high escalation rate (possible deliberate blockage)")
            risk_score += 0.6
        # High workload but sudden quick resolution
        if processing_days < 1.0 and priority == 'Low':
            reasons.append("Low priority request resolved in less than 24 hours without urgency flags")
            risk_score += 0.5
            
        if is_anomaly and not reasons:
            reasons.append("Outlier processing metrics detected compared to department benchmarks.")
            risk_score += 0.4
            
        risk_score = min(1.0, risk_score + (anomaly_score * 0.5))
        if not is_anomaly:
            risk_score = risk_score * 0.3 # Dampen if Isolation Forest says normal
            
        return jsonify({
            "is_anomaly": is_anomaly,
            "anomaly_score": round(anomaly_score, 4),
            "corruption_risk_score": round(float(risk_score), 2),
            "reasons": reasons if is_anomaly or risk_score > 0.3 else ["Normal processing behavior"]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/ai/assistant', methods=['POST'])
def ai_assistant():
    data = request.json
    try:
        req_id = data.get('id', 'N/A')
        title = data.get('title', 'N/A')
        desc = data.get('description', '')
        req_type = data.get('type', 'Income Certificate')
        citizen = data.get('citizen_name', 'Citizen')
        category = data.get('citizen_category', 'General')
        documents = data.get('documents', [])
        
        # 1. Document verification
        required_docs = {
            'Income Certificate': ['Salary Slip', 'Tax Return', 'ID Proof'],
            'Caste Certificate': ['Community Proof', 'Father Caste Certificate', 'Identity Card'],
            'Residence Certificate': ['Aadhar Card', 'Electricity Bill', 'Rent Agreement'],
            'Complaint Registration': ['Evidence Photo/Document', 'Incident Report'],
            'Business License': ['Company Registration', 'PAN Card', 'NOC Certificate'],
            'Land Approval': ['Land Deed', 'Survey Map', 'Tax Receipt', 'NOC Certificate'],
            'Scholarship Request': ['Income Certificate', 'Marksheet', 'College ID'],
            'Pension Request': ['Age Proof', 'Income Proof', 'Bank Details'],
            'General Service Request': ['Application Form', 'ID Proof']
        }.get(req_type, ['ID Proof'])
        
        uploaded_names = [doc.get('name', '') for doc in documents]
        missing_docs = []
        for req_doc in required_docs:
            found = False
            for uploaded in uploaded_names:
                if req_doc.lower() in uploaded.lower() or uploaded.lower() in req_doc.lower():
                    found = True
                    break
            if not found:
                missing_docs.append(req_doc)
                
        # 2. Delay Forecast Context (mock call or model predict)
        # Check if they sent pre-evaluated metrics
        delay_prob = float(data.get('delay_probability', 0.15))
        priority = data.get('priority', 'Medium')
        
        # 3. Decision recommendation logic
        confidence = 0.95
        if missing_docs:
            recommendation = "Return for Correction"
            explanation = f"The application is missing critical documents: {', '.join(missing_docs)}. It is advised to return this file to the citizen for compliance."
            confidence = 0.90
        elif delay_prob > 0.75 and priority != 'Critical':
            recommendation = "Escalate / Approve"
            explanation = "Document verification succeeded. However, there is a high delay risk predicted. Action should be taken immediately to prevent SLA breach."
            confidence = 0.85
        else:
            recommendation = "Approve"
            explanation = "All required documents have been uploaded and verified successfully. Processing times are within normal parameters. Recommend immediate approval."
            confidence = 0.92
            
        # Optional: Generate a summary
        summary = f"Application from {citizen} ({category} category) requesting an {req_type}. The applicant states: '{desc[:100]}...'"
        
        # If Gemini API Key exists in backend environment, the Node backend will make the LLM call or we could make it here.
        # To maintain a lightweight Flask ML server, we serve this structural analysis which Node will merge or use directly.
        
        return jsonify({
            "summary": summary,
            "checklist": [
                {"document": doc, "status": "Uploaded" if doc not in missing_docs else "Missing"}
                for doc in required_docs
            ],
            "missing_documents": missing_docs,
            "recommended_action": recommendation,
            "explanation": explanation,
            "confidence_score": round(confidence, 2)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

@app.route('/detect/bottlenecks', methods=['POST'])
def detect_bottlenecks():
    if not kmeans_model:
        return jsonify({"error": "Bottleneck model not loaded."}), 500
    
    data = request.json
    try:
        # Expecting a list of officers/departments with: avg_processing_days, workload, delay_rate
        records = data.get('records', [])
        if not records:
            # Return template response
            return jsonify({
                "clusters": [],
                "message": "Send department records to cluster."
            })
            
        df_records = pd.DataFrame(records)
        # Scale/Preprocess if needed, or predict directly
        # For simplicity, cluster based on avg_processing_days and workload
        X = df_records[['processing_days', 'workload', 'delay_rate']]
        clusters = kmeans_model.predict(X)
        
        df_records['cluster'] = clusters
        
        # Assign descriptions: Cluster with highest processing_days and workload = Critical Bottleneck
        # Cluster with lowest = Fast/Normal
        cluster_means = df_records.groupby('cluster')['processing_days'].mean().to_dict()
        sorted_clusters = sorted(cluster_means.items(), key=lambda x: x[1])
        
        cluster_map = {
            sorted_clusters[0][0]: "Low Delay (Efficient)",
            sorted_clusters[1][0] if len(sorted_clusters) > 1 else 0: "Medium Delay (Monitor)",
            sorted_clusters[-1][0] if len(sorted_clusters) > 2 else 0: "High Delay (Bottleneck)"
        }
        
        df_records['cluster_label'] = df_records['cluster'].map(cluster_map)
        
        return jsonify({
            "results": df_records.to_dict(orient='records')
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
