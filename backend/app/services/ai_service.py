import json
import os

class AIService:
    def __init__(self):
        self.rules_path = os.path.join(os.path.dirname(__file__), '..', '..', 'ai_rules', 'symptom_rules.json')
        with open(self.rules_path, 'r') as f:
            self.rules = json.load(f)['rules']

    def check_symptoms(self, symptoms):
        # Basic matching logic for the rule-based system
        matches = []
        for rule in self.rules:
            # Check if all symptoms in the rule are present in the input
            if all(s in symptoms for s in rule['symptoms']):
                matches.append(rule)
        
        if not matches:
            return {
                "condition": "Unknown",
                "severity": "low",
                "action": "Symptoms do not match offline rules. Please consult a doctor online for better prediction.",
                "emergency": False
            }
        
        # Return the one with highest severity if multiple match
        severity_map = {"high": 3, "medium": 2, "low": 1}
        return max(matches, key=lambda x: severity_map.get(x['severity'], 0))
